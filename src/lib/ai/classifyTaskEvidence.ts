/**
 * Reto 90D — Clasificador IA de evidencias (ADMIN-ONLY, sin UI).
 *
 * Llama a OpenAI (gpt-4o, con visión si hay imagen) para determinar a qué
 * tarea diaria corresponde una evidencia recibida por WhatsApp. Por seguridad,
 * las reglas de confianza y de "no inventar tareas" se aplican SOBRE el
 * resultado del modelo: nunca se confía únicamente en el status devuelto.
 */

import { buildEvidencePrompt, type EvidencePromptTask } from './evidencePrompt'

export type ClassifyStatus =
  | 'APPROVED'
  | 'REJECTED'
  | 'REVIEW'
  | 'NEEDS_CLARIFICATION'
  | 'DUPLICATED'

export type ClassifyInput = {
  imageUrl?: string
  text?: string
  tasks: Array<{
    id: string
    title: string
    description: string
    evidenceType: string
    expectedKeywords: string[]
    points: number
  }>
  phone: string
  dailyHistory: string
  now: Date
}

export type ClassifyResult = {
  detectedTaskId: string | null
  detectedTaskTitle: string | null
  confidence: number
  status: ClassifyStatus
  points: number
  explanation: string
  needsManualReview: boolean
  userMessage: string
}

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

// ─── Mensajes al usuario según el estado final ───────────────────────────────

function approvedMessage(points: number, title: string): string {
  return `✅ Evidencia aprobada. Sumaste ${points} puntos en la tarea: ${title}.`
}

const REVIEW_MESSAGE =
  '⏳ Recibí tu evidencia. La enviaremos a revisión porque necesito confirmar mejor la tarea.'

const CLARIFICATION_MESSAGE =
  'Necesito que me indiques a qué tarea corresponde esta evidencia. Responde con el nombre de la tarea.'

// ─── OpenAI ──────────────────────────────────────────────────────────────────

type OpenAIMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >

async function callOpenAI(prompt: string, imageUrl?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('Falta la variable de entorno OPENAI_API_KEY para el clasificador de evidencias.')
  }

  const content: OpenAIMessageContent = imageUrl
    ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl } },
      ]
    : prompt

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content }],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 600,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenAI clasificador error ${res.status}: ${err}`)
    }

    const data = await res.json()
    return (data.choices?.[0]?.message?.content as string) || '{}'
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Clasificación ───────────────────────────────────────────────────────────

export async function classifyEvidenceWithAI(input: ClassifyInput): Promise<ClassifyResult> {
  const promptTasks: EvidencePromptTask[] = input.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    evidenceType: t.evidenceType,
    expectedKeywords: t.expectedKeywords,
    points: t.points,
  }))

  const evidence: { type: 'image' | 'text' | 'number' | 'link'; text?: string } = input.imageUrl
    ? { type: 'image', ...(input.text ? { text: input.text } : {}) }
    : { type: 'text', ...(input.text ? { text: input.text } : {}) }

  const prompt = buildEvidencePrompt({
    tasks: promptTasks,
    evidence,
    dailyHistory: input.dailyHistory,
  })

  try {
    const raw = await callOpenAI(prompt, input.imageUrl)

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>
    } catch {
      throw new Error('La respuesta del modelo no es un JSON válido.')
    }

    const rawDetectedId =
      typeof parsed.detectedTaskId === 'string' && parsed.detectedTaskId.trim().length > 0
        ? parsed.detectedTaskId
        : null

    const rawConfidence =
      typeof parsed.confidence === 'number' ? parsed.confidence : Number(parsed.confidence)
    const confidence = Number.isFinite(rawConfidence)
      ? Math.max(0, Math.min(1, rawConfidence))
      : 0

    const modelExplanation =
      typeof parsed.explanation === 'string' && parsed.explanation.trim().length > 0
        ? parsed.explanation
        : 'Sin explicación proporcionada por el modelo.'

    // NUNCA inventar tarea: la tarea detectada debe existir en la lista provista.
    const matchedTask = rawDetectedId
      ? input.tasks.find((t) => t.id === rawDetectedId) ?? null
      : null

    // ─── Normalización de reglas de confianza (fuente de verdad = servidor) ───
    if (matchedTask && confidence >= 0.85) {
      return {
        detectedTaskId: matchedTask.id,
        detectedTaskTitle: matchedTask.title,
        confidence,
        status: 'APPROVED',
        points: matchedTask.points,
        explanation: modelExplanation,
        needsManualReview: false,
        userMessage: approvedMessage(matchedTask.points, matchedTask.title),
      }
    }

    if (matchedTask && confidence >= 0.6) {
      return {
        detectedTaskId: matchedTask.id,
        detectedTaskTitle: matchedTask.title,
        confidence,
        status: 'REVIEW',
        points: 0,
        explanation: modelExplanation,
        needsManualReview: true,
        userMessage: REVIEW_MESSAGE,
      }
    }

    // confidence < 0.60 o no hay tarea válida detectada → NEEDS_CLARIFICATION
    return {
      detectedTaskId: matchedTask ? matchedTask.id : null,
      detectedTaskTitle: matchedTask ? matchedTask.title : null,
      confidence,
      status: 'NEEDS_CLARIFICATION',
      points: 0,
      explanation: modelExplanation,
      needsManualReview: false,
      userMessage: CLARIFICATION_MESSAGE,
    }
  } catch (error) {
    // OpenAI falló o devolvió JSON inválido → resultado controlado, no excepción.
    const message = error instanceof Error ? error.message : 'Error desconocido en la clasificación.'
    return {
      detectedTaskId: null,
      detectedTaskTitle: null,
      confidence: 0,
      status: 'NEEDS_CLARIFICATION',
      points: 0,
      explanation: `No se pudo clasificar automáticamente la evidencia: ${message}`,
      needsManualReview: true,
      userMessage: CLARIFICATION_MESSAGE,
    }
  }
}
