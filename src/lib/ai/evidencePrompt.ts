/**
 * Reto 90D — Constructor del prompt para el clasificador de evidencias.
 *
 * Devuelve EXACTAMENTE el prompt del sistema, rellenando los marcadores
 * {{tasks}}, {{evidence}} y {{dailyHistory}} con JSON legible.
 */

export interface EvidencePromptTask {
  id: string
  title: string
  description: string
  evidenceType: string
  expectedKeywords: string[]
  points: number
}

export interface EvidencePromptInput {
  tasks: EvidencePromptTask[]
  evidence: { type: 'image' | 'text' | 'number' | 'link'; text?: string }
  dailyHistory: string
}

export function buildEvidencePrompt(input: EvidencePromptInput): string {
  const tasksJson = JSON.stringify(input.tasks, null, 2)
  const evidenceJson = JSON.stringify(input.evidence, null, 2)
  const dailyHistory = input.dailyHistory && input.dailyHistory.trim().length > 0
    ? input.dailyHistory
    : 'Sin entregas previas registradas hoy.'

  return `Eres un clasificador de evidencias para el sistema Reto 90D de My Diamond.
Tu trabajo es analizar una evidencia enviada por WhatsApp y determinar a qué tarea diaria corresponde.
Reglas:
1. No puedes inventar tareas.
2. Solo puedes elegir una tarea de la lista proporcionada.
3. Si no estás seguro, debes pedir revisión o aclaración.
4. No apruebes evidencias ambiguas.
5. No apruebes capturas duplicadas.
6. Evalúa únicamente la evidencia y las reglas de la tarea.
7. Responde siempre en JSON válido.
8. No agregues explicación fuera del JSON.
Lista de tareas activas: ${tasksJson}
Evidencia recibida: ${evidenceJson}
Historial del usuario en el día: ${dailyHistory}
Devuelve este formato:
{ "detectedTaskId": "string_or_null", "detectedTaskTitle": "string_or_null", "confidence": number, "status": "APPROVED | REJECTED | REVIEW | NEEDS_CLARIFICATION | DUPLICATED", "points": number, "explanation": "string", "needsManualReview": boolean, "userMessage": "string" }`
}
