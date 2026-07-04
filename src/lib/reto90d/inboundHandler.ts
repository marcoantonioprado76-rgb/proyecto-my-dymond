// ─────────────────────────────────────────────────────────────────────────────
// Reto 90D — Handler de mensajes ENTRANTES por WhatsApp (Baileys)
// Flujo: chat individual → ¿miembro ACTIVE? → descarga media → anti-duplicado →
//        crea submission (idempotente) → clasifica con IA → responde al usuario.
// Sólo se invoca cuando el bot receptor es el bot dedicado del reto.
// ─────────────────────────────────────────────────────────────────────────────
import crypto from 'crypto'
import { proto, downloadMediaMessage } from '@whiskeysockets/baileys'
import { supabaseAdmin } from '@/lib/supabase'
import { getActiveChallenge } from './challengeService'
import { getMemberByPhone } from './memberService'
import { getActiveTasksForToday } from './taskService'
import {
  createSubmission,
  detectDuplicateSubmission,
  applyClassification,
  getDaySubmissions,
  getPendingTasksForUser,
  type AiResult,
} from './submissionService'
import { classifyEvidenceWithAI } from '@/lib/ai/classifyTaskEvidence'
import { sendToPhone, getRetoInstructions } from '@/lib/whatsapp/reto90dSender'

// Conexión Baileys mínima que necesitamos (estructuralmente compatible con BaileysConnection)
type RetoConn = { botId: string; sock?: any }

const NOT_MEMBER_MSG =
  'Hola 👋 No estás inscrito en el reto activo. Pídele al administrador que te agregue para registrar tus evidencias.'
const DUPLICATE_MSG =
  '⚠️ Esta evidencia ya la enviaste hoy; no puede sumar puntos otra vez.'
const NO_TASKS_MSG =
  'Por ahora no hay tareas configuradas para hoy. Intenta más tarde 🙌'

/** Sube la imagen a Supabase Storage (bucket uploads). Best-effort: devuelve null si falla. */
async function uploadEvidence(buffer: Buffer, phone: string, msgId: string): Promise<string | null> {
  try {
    const safePhone = phone.replace(/[^0-9]/g, '')
    const safeId = msgId.replace(/[^A-Za-z0-9_-]/g, '')
    const path = `reto90d/${safePhone}/${safeId}.jpg`
    const { error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })
    if (error) {
      console.error('[reto90d/inbound] upload evidence failed:', error.message)
      return null
    }
    const { data } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)
    return data.publicUrl ?? null
  } catch (err) {
    console.error('[reto90d/inbound] upload evidence threw:', err)
    return null
  }
}

/** Resumen de lo que el usuario ya envió hoy (para que la IA no cuente duplicados). */
async function buildDailyHistory(phone: string, challengeId: string): Promise<string> {
  try {
    const subs = await getDaySubmissions(phone, challengeId, new Date())
    if (!subs.length) return 'Sin evidencias registradas hoy.'
    return subs
      .map((s) => {
        const tarea = s.aiTaskDetected ?? 'tarea no identificada'
        const pts = s.pointsEarned ? ` (+${s.pointsEarned} pts)` : ''
        return `- ${tarea}: ${s.status}${pts}`
      })
      .join('\n')
  } catch (err) {
    console.error('[reto90d/inbound] buildDailyHistory failed:', err)
    return 'Sin historial disponible.'
  }
}

/** Extrae texto plano del mensaje (conversación / caption / texto extendido). */
function extractText(content: proto.IMessage): string {
  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.documentMessage?.caption ||
    ''
  ).trim()
}

// ── Bot conversacional: saludos / comandos → orientar en vez de clasificar ──
const GREETING_RE =
  /^(hola+|buenas|buenos? d[ií]as?|buenas tardes|buenas noches|hey|ola|q(ue)? tal|menu|men[uú]|info|informacion|información|ayuda|help|start|empezar|comenzar|inicio|mis tareas|tareas|pendientes|puntos|estado|reto|listo)\b/i

function firstName(full: string): string {
  return (full || '').trim().split(/\s+/)[0] || 'campeón/a'
}

/** true si el texto (sin imagen) es un saludo/comando corto y no una evidencia. */
function isCommandMessage(text: string): boolean {
  const t = text.trim().toLowerCase()
  if (!t) return true // mensaje casi vacío → mejor orientar
  if (t.length > 60) return false // texto largo → probablemente evidencia
  return GREETING_RE.test(t)
}

/** Menú/orientación personalizada: nombre, tareas de hoy con ✅/⬜, avance y puntos. */
async function buildOrientation(
  member: { fullName: string; phone: string },
  challenge: { id: string; name: string },
): Promise<string> {
  const header = `¡Hola ${firstName(member.fullName)}! 👋 Estás en *${challenge.name}*.`
  try {
    const tasks = await getActiveTasksForToday(challenge.id)
    if (tasks.length === 0) {
      return `${header}\nHoy todavía no hay tareas cargadas. Te aviso apenas estén 💪`
    }
    const pending = await getPendingTasksForUser(member.phone, challenge.id, new Date())
    const pendingIds = new Set(pending.map((t) => t.id))
    const subs = await getDaySubmissions(member.phone, challenge.id, new Date())
    const points = subs
      .filter((s) => s.status === 'APPROVED')
      .reduce((a, s) => a + (s.pointsEarned || 0), 0)
    const done = Math.max(0, tasks.length - pending.length)
    const lines = tasks.map((t) => `${pendingIds.has(t.id) ? '⬜' : '✅'} ${t.title} · ${t.points} pts`)
    return [
      header,
      `📅 Hoy: ${done}/${tasks.length} completadas · ⭐ ${points} pts`,
      '',
      ...lines,
      '',
      '📸 Envíame una *foto* (o un texto) como evidencia y la reviso al instante.',
    ].join('\n')
  } catch (err) {
    console.error('[reto90d/inbound] buildOrientation failed:', err)
    return `${header}\n📸 Envíame la evidencia de tus tareas (foto o texto) y la reviso al instante.`
  }
}

export async function handleReto90dInbound(conn: RetoConn, msg: proto.IWebMessageInfo): Promise<void> {
  const jid = msg.key?.remoteJid
  // Sólo chats individuales (los grupos se usan sólo para reportes salientes)
  if (!jid || !jid.endsWith('@s.whatsapp.net')) return
  const phone = jid.split('@')[0]
  const msgId = msg.key?.id
  if (!msgId) return

  // Marcar SIEMPRE el mensaje como leído (doble check azul) apenas llega.
  try { await conn.sock?.readMessages([msg.key]) } catch (e) { /* no-op */ }

  const content = msg.message
  if (!content) return
  const text = extractText(content)
  const hasImage = !!content.imageMessage

  // Sin evidencia útil (stickers, audio, reacciones, mensajes vacíos) → no gastamos IA
  if (!hasImage && !text) return

  // 1) ¿Hay un reto activo? Si no, el bot del reto guarda silencio.
  const challenge = await getActiveChallenge()
  if (!challenge) return

  // 2) ¿Es miembro ACTIVE del reto?
  const member = await getMemberByPhone(phone, challenge.id)
  if (!member) {
    await sendToPhone(phone, NOT_MEMBER_MSG)
    return
  }

  // 2.5) Mensaje conversacional (saludo / "tareas" / "puntos") → orientar, no clasificar
  if (!hasImage && isCommandMessage(text)) {
    await sendToPhone(phone, await buildOrientation(member, challenge))
    return
  }

  // 3) Descargar media (si hay imagen): hash anti-dup + dataURL para la IA + subida best-effort
  let mediaHash: string | undefined
  let dataUrl: string | undefined
  let mediaUrl: string | undefined
  if (hasImage) {
    try {
      const buffer = (await downloadMediaMessage(msg as any, 'buffer', {})) as Buffer
      mediaHash = crypto.createHash('md5').update(buffer).digest('hex')
      dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`
      mediaUrl = (await uploadEvidence(buffer, phone, msgId)) ?? undefined
    } catch (err) {
      console.error('[reto90d/inbound] downloadMediaMessage failed:', err)
    }

    // 4) Anti-duplicado por hash dentro del día (antes de crear, para no auto-coincidir)
    if (mediaHash && (await detectDuplicateSubmission(phone, { mediaHash, day: new Date() }))) {
      const dupSub = await createSubmission({
        challengeId: challenge.id,
        userId: member.userId ?? undefined,
        fullName: member.fullName,
        phone,
        whatsappMsgId: msgId,
        mediaUrl,
        mediaHash,
        textContent: text || undefined,
      })
      // Sólo procesar/responder si es nueva (evita reprocesar reintentos de Baileys)
      if (dupSub.status === 'PENDING') {
        const dupResult: AiResult = {
          detectedTaskId: null,
          detectedTaskTitle: null,
          confidence: 1,
          status: 'DUPLICATED',
          points: 0,
          explanation: 'Evidencia duplicada: el mismo archivo ya fue enviado hoy.',
          needsManualReview: false,
          userMessage: DUPLICATE_MSG,
        }
        await applyClassification(dupSub.id, dupResult)
        await sendToPhone(phone, DUPLICATE_MSG)
      }
      return
    }
  }

  // 5) Crear submission PENDING (idempotente por whatsappMsgId)
  const submission = await createSubmission({
    challengeId: challenge.id,
    userId: member.userId ?? undefined,
    fullName: member.fullName,
    phone,
    whatsappMsgId: msgId,
    mediaUrl,
    mediaHash,
    textContent: text || undefined,
  })
  // Ya clasificada antes (reintento de webhook) → no reprocesar ni re-responder
  if (submission.status !== 'PENDING') return

  // 6) Tareas activas de hoy
  const tasks = await getActiveTasksForToday(challenge.id)
  if (tasks.length === 0) {
    const noTasks: AiResult = {
      detectedTaskId: null,
      detectedTaskTitle: null,
      confidence: 0,
      status: 'NEEDS_CLARIFICATION',
      points: 0,
      explanation: 'No hay tareas activas configuradas para hoy.',
      needsManualReview: true,
      userMessage: NO_TASKS_MSG,
    }
    await applyClassification(submission.id, noTasks)
    await sendToPhone(phone, NO_TASKS_MSG)
    return
  }

  // 7) Clasificar con IA (imagen en base64 + texto + historial del día + referencias + instrucciones)
  const dailyHistory = await buildDailyHistory(phone, challenge.id)
  const instructions = (await getRetoInstructions()) ?? undefined
  const ai = await classifyEvidenceWithAI({
    imageUrl: dataUrl,
    text: text || undefined,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      evidenceType: t.evidenceType,
      expectedKeywords: t.expectedKeywords,
      points: t.points,
      referenceImages: t.validExamples, // fotos modelo subidas por el admin
    })),
    phone,
    dailyHistory,
    now: new Date(),
    instructions,
  })

  // 8) Persistir clasificación (transacción con log de revisión) + responder al usuario
  await applyClassification(submission.id, ai)
  if (ai.userMessage) await sendToPhone(phone, ai.userMessage)
}
