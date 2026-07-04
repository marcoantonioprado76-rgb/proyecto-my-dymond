// ─────────────────────────────────────────────────────────────────────────────
// Reto 90D — Handler de mensajes ENTRANTES por WhatsApp (Baileys)
//
// SOLO responde a los inscritos (miembros ACTIVE) — a nadie más.
// - IMAGEN  → clasifica la evidencia contra las tareas (con fotos de referencia).
// - TEXTO   → asistente conversacional que RECUERDA el hilo y responde
//             "¿qué tarea me falta?", "¿cómo voy?", saludos, etc.
// Marca SIEMPRE el mensaje como leído. Sólo se invoca para el bot dedicado del reto.
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
import { saveRetoMessage, getRecentMessages } from './conversationService'
import { classifyEvidenceWithAI } from '@/lib/ai/classifyTaskEvidence'
import { assistParticipant, type TaskStatusLite } from '@/lib/ai/retoAssistant'
import { sendToPhone, getRetoInstructions, getEffectiveOpenAIKey } from '@/lib/whatsapp/reto90dSender'

// Conexión Baileys mínima que necesitamos (estructuralmente compatible con BaileysConnection)
type RetoConn = { botId: string; sock?: any }
type RetoMember = { userId?: string | null; fullName: string }
type RetoChallenge = { id: string; name: string }

const DUPLICATE_MSG = '⚠️ Esta evidencia ya la enviaste hoy; no puede sumar puntos otra vez.'
const NO_TASKS_MSG = 'Por ahora no hay tareas configuradas para hoy. Intenta más tarde 🙌'

function firstName(full: string): string {
  return (full || '').trim().split(/\s+/)[0] || 'campeón/a'
}

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

/** Estado de hoy del participante: tareas con hecho/pendiente + puntos aprobados. */
async function computeStatus(
  challenge: RetoChallenge,
  phone: string,
): Promise<{ tasksStatus: TaskStatusLite[]; points: number }> {
  try {
    // Consultas en paralelo (rapidez).
    const [tasks, pending, subs] = await Promise.all([
      getActiveTasksForToday(challenge.id),
      getPendingTasksForUser(phone, challenge.id, new Date()),
      getDaySubmissions(phone, challenge.id, new Date()),
    ])
    const pendingIds = new Set(pending.map((t) => t.id))
    const points = subs
      .filter((s) => s.status === 'APPROVED')
      .reduce((a, s) => a + (s.pointsEarned || 0), 0)
    const tasksStatus: TaskStatusLite[] = tasks.map((t) => ({
      title: t.title,
      done: !pendingIds.has(t.id),
      points: t.points,
      evidenceType: t.evidenceType,
    }))
    return { tasksStatus, points }
  } catch (err) {
    console.error('[reto90d/inbound] computeStatus failed:', err)
    return { tasksStatus: [], points: 0 }
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

/**
 * Devuelve una función para responder al usuario: si el usuario mandó AUDIO,
 * responde con NOTA DE VOZ (TTS); si la voz falla o no está activa, cae a texto.
 */
function makeReplySender(
  conn: RetoConn,
  jid: string,
  phone: string,
  asVoice: boolean,
  voiceId?: string | null,
): (text: string) => Promise<void> {
  return async (text: string) => {
    if (asVoice && text) {
      try {
        const { synthesizeVoiceNote } = await import('@/lib/tts')
        const ogg = await synthesizeVoiceNote(text, voiceId)
        if (ogg) {
          try { await conn.sock?.sendPresenceUpdate('recording', jid) } catch (e) { /* no-op */ }
          await conn.sock?.sendMessage(jid, { audio: ogg, mimetype: 'audio/ogg; codecs=opus', ptt: true })
          return
        }
      } catch (e) {
        console.error('[reto90d/inbound] voz falló, cae a texto:', e)
      }
    }
    await sendToPhone(phone, text)
  }
}

/** Transcribe una nota de voz (Whisper) a texto. '' si no se pudo. */
async function transcribeVoice(msg: proto.IWebMessageInfo, openaiKey: string): Promise<string> {
  if (!openaiKey) return ''
  try {
    const buffer = (await downloadMediaMessage(msg as any, 'buffer', {})) as Buffer
    const { transcribeAudio } = await import('@/lib/openai')
    const blob = new Blob([buffer as any], { type: 'audio/ogg' })
    const t = await transcribeAudio(blob, openaiKey)
    const clean = (t || '').trim()
    return clean.startsWith('[') ? '' : clean // ignora placeholders tipo "[Audio...]"
  } catch (e) {
    console.error('[reto90d/inbound] transcripción falló:', e)
    return ''
  }
}

/** Crea la submission, clasifica la evidencia y responde (imagen o texto-evidencia). */
async function classifyAndReply(
  member: RetoMember,
  challenge: RetoChallenge,
  phone: string,
  opts: { msgId: string; text?: string; dataUrl?: string; mediaUrl?: string; mediaHash?: string },
  reply: (text: string) => Promise<void>,
): Promise<void> {
  const submission = await createSubmission({
    challengeId: challenge.id,
    userId: member.userId ?? undefined,
    fullName: member.fullName,
    phone,
    whatsappMsgId: opts.msgId,
    mediaUrl: opts.mediaUrl,
    mediaHash: opts.mediaHash,
    textContent: opts.text || undefined,
  })
  // Ya clasificada antes (reintento de Baileys) → no reprocesar ni re-responder
  if (submission.status !== 'PENDING') return

  // Contexto en paralelo (rapidez).
  const [tasks, dailyHistory, instructions, openaiKey] = await Promise.all([
    getActiveTasksForToday(challenge.id),
    buildDailyHistory(phone, challenge.id),
    getRetoInstructions(),
    getEffectiveOpenAIKey(),
  ])

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
    await reply(NO_TASKS_MSG)
    void saveRetoMessage(challenge.id, phone, 'bot', NO_TASKS_MSG)
    return
  }

  const ai = await classifyEvidenceWithAI({
    imageUrl: opts.dataUrl,
    text: opts.text || undefined,
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
    instructions: instructions ?? undefined,
    openaiKey: openaiKey ?? undefined,
  })

  await applyClassification(submission.id, ai)
  if (ai.userMessage) {
    await reply(ai.userMessage)
    void saveRetoMessage(challenge.id, phone, 'bot', ai.userMessage)
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
  let text = extractText(content)
  const hasImage = !!content.imageMessage
  const hasAudio = !!content.audioMessage
  if (!hasImage && !hasAudio && !text) return // stickers/reacciones/vacíos → ignorar

  // 1) ¿Hay un reto activo?
  const challenge = await getActiveChallenge()
  if (!challenge) return

  // 2) SOLO responde a inscritos: si no es miembro ACTIVE, silencio total.
  const member = await getMemberByPhone(phone, challenge.id)
  if (!member) return

  // Mostrar "escribiendo…" de inmediato (como los bots de venta) → se siente veloz.
  try { await conn.sock?.sendPresenceUpdate('composing', jid) } catch (e) { /* no-op */ }

  // Responder en el MISMO formato: si mandó AUDIO, contestamos con NOTA DE VOZ.
  const reply = makeReplySender(conn, jid, phone, hasAudio)

  // ── AUDIO → transcribir a texto (Whisper) y seguir el flujo normal de texto ──
  if (hasAudio) {
    const key = (await getEffectiveOpenAIKey()) ?? ''
    text = await transcribeVoice(msg, key)
    if (!text) {
      await reply('No pude escuchar bien tu audio 🙉 ¿Me lo repites o me escribes por texto?')
      return
    }
  }

  // ── IMAGEN → clasificar evidencia ──────────────────────────────────────────
  if (hasImage) {
    let mediaHash: string | undefined
    let dataUrl: string | undefined
    let mediaUrl: string | undefined
    try {
      const buffer = (await downloadMediaMessage(msg as any, 'buffer', {})) as Buffer
      mediaHash = crypto.createHash('md5').update(buffer).digest('hex')
      dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`
      mediaUrl = (await uploadEvidence(buffer, phone, msgId)) ?? undefined
    } catch (err) {
      console.error('[reto90d/inbound] downloadMediaMessage failed:', err)
    }

    // Anti-duplicado por hash dentro del día (antes de crear, para no auto-coincidir)
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
        await reply(DUPLICATE_MSG)
        void saveRetoMessage(challenge.id, phone, 'bot', DUPLICATE_MSG)
      }
      return
    }

    await saveRetoMessage(challenge.id, phone, 'user', text ? `[foto] ${text}` : '[foto de evidencia]')
    await classifyAndReply(member, challenge, phone, { msgId, text, dataUrl, mediaUrl, mediaHash }, reply)
    return
  }

  // ── TEXTO → asistente conversacional (recuerda el hilo + responde pendientes) ─
  // Todo el contexto en paralelo (rapidez). El guardado del mensaje no bloquea.
  void saveRetoMessage(challenge.id, phone, 'user', text)
  const [history, status, instructions, openaiKey] = await Promise.all([
    getRecentMessages(challenge.id, phone),
    computeStatus(challenge, phone),
    getRetoInstructions(),
    getEffectiveOpenAIKey(),
  ])

  const result = await assistParticipant({
    instructions: instructions ?? undefined,
    participantName: firstName(member.fullName),
    challengeName: challenge.name,
    tasksStatus: status.tasksStatus,
    points: status.points,
    history,
    userText: text,
    openaiKey: openaiKey ?? undefined,
  })

  if (result.intent === 'evidence') {
    // El participante entregó una tarea por texto/número/enlace → clasificar
    await classifyAndReply(member, challenge, phone, { msgId, text }, reply)
    return
  }

  await reply(result.reply)
  void saveRetoMessage(challenge.id, phone, 'bot', result.reply)
}
