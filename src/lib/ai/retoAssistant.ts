// ─────────────────────────────────────────────────────────────────────────────
// Reto 90D — Asistente conversacional del bot.
// Responde a los participantes recordando el hilo: "¿qué tarea me falta?",
// "¿cómo voy?", saludos, etc. Sigue la personalidad del admin (system prompt).
// Devuelve intent: 'chat' (responder) o 'evidence' (es una entrega por texto).
// ─────────────────────────────────────────────────────────────────────────────
import type { RetoChatMessage } from '@/lib/reto90d/conversationService'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

export type TaskStatusLite = { title: string; done: boolean; points: number; evidenceType: string }
export type AssistInput = {
  instructions?: string
  participantName: string
  challengeName: string
  tasksStatus: TaskStatusLite[]
  points: number
  history: RetoChatMessage[]
  userText: string
  /** Key de OpenAI resuelta (panel o entorno). Si no se pasa, usa process.env. */
  openaiKey?: string
}
export type AssistResult = { intent: 'chat' | 'evidence'; reply: string }

function pendingList(tasks: TaskStatusLite[]): string {
  if (!tasks.length) return 'Aún no hay tareas cargadas hoy.'
  const pend = tasks.filter((t) => !t.done)
  if (!pend.length) return '¡Ya completaste todas las tareas de hoy! 🎉'
  return pend.map((t) => `⬜ ${t.title} (${t.points} pts)`).join('\n')
}

/** Respuesta determinista de respaldo (sin OpenAI o ante error). */
function fallbackReply(input: AssistInput): string {
  const done = input.tasksStatus.filter((t) => t.done).length
  const total = input.tasksStatus.length
  return [
    `¡Hola ${input.participantName}! 👋`,
    `📅 Hoy: ${done}/${total} completadas · ⭐ ${input.points} pts`,
    '',
    'Te falta:',
    pendingList(input.tasksStatus),
    '',
    '📸 Envíame una foto como evidencia y la reviso.',
  ].join('\n')
}

export async function assistParticipant(input: AssistInput): Promise<AssistResult> {
  const apiKey = input.openaiKey || process.env.OPENAI_API_KEY
  if (!apiKey) return { intent: 'chat', reply: fallbackReply(input) }

  const statusText = input.tasksStatus.length
    ? input.tasksStatus
        .map((t) => `${t.done ? '✅' : '⬜'} ${t.title} — ${t.points} pts (${t.evidenceType})`)
        .join('\n')
    : 'Sin tareas cargadas hoy.'

  const system = [
    input.instructions?.trim()
      ? input.instructions.trim()
      : 'Eres el coach del Reto 90 Días de My Diamond. Trata a los participantes con motivación y cercanía.',
    '',
    `Contexto: reto "${input.challengeName}". Participante: ${input.participantName}. Puntos de hoy: ${input.points}.`,
    'Estado de las tareas de HOY de este participante:',
    statusText,
    '',
    'Responde el mensaje del participante en tono cercano y BREVE (máx ~4 líneas), en español.',
    '- Si pregunta qué le falta / cómo va / sus puntos: dile EXACTAMENTE las tareas pendientes (las ⬜) y sus puntos.',
    '- Si saluda o charla: salúdalo y recuérdale amablemente qué le falta hoy.',
    '- Recuerda el hilo (te doy los últimos mensajes).',
    '- Nunca inventes tareas ni marques nada como aprobado; la evidencia se aprueba solo con fotos.',
    'Devuelve SOLO JSON: {"intent":"chat"|"evidence","reply":"..."}.',
    'Usa intent="evidence" SOLO si el participante está entregando claramente la prueba de una tarea por texto/número/enlace (no una foto). En cualquier otro caso usa "chat".',
  ].join('\n')

  const messages: Array<{ role: string; content: string }> = [{ role: 'system', content: system }]
  for (const m of input.history.slice(-10)) {
    messages.push({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content })
  }
  messages.push({ role: 'user', content: input.userText })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 400,
      }),
    })
    if (!res.ok) throw new Error(`OpenAI ${res.status}`)
    const data = await res.json()
    const raw = (data.choices?.[0]?.message?.content as string) ?? '{}'
    const parsed = JSON.parse(raw) as { intent?: string; reply?: string }
    const intent: 'chat' | 'evidence' = parsed.intent === 'evidence' ? 'evidence' : 'chat'
    const reply =
      typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim() : fallbackReply(input)
    return { intent, reply }
  } catch (err) {
    console.error('[reto90d/assistant] failed:', err)
    return { intent: 'chat', reply: fallbackReply(input) }
  } finally {
    clearTimeout(timeout)
  }
}
