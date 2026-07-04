// ─────────────────────────────────────────────────────────────────────────────
// Reto 90D — Bienvenida automática al registrarse.
// Envía por WhatsApp (bot del reto) un saludo personalizado con el nombre y el
// reto, usando una plantilla editable ({nombre}, {reto}). Best-effort: nunca
// lanza (no debe romper el registro si el bot no está conectado).
// ─────────────────────────────────────────────────────────────────────────────
import { sendToPhone, getWelcomeTemplate } from '@/lib/whatsapp/reto90dSender'
import { saveRetoMessage } from './conversationService'

const DEFAULT_WELCOME =
  '¡Felicidades {nombre}! 🎉 Te uniste al reto *{reto}*.\n' +
  'A partir de hoy te acompaño cada día: envíame tus evidencias (una *foto* o un texto) y te las reviso al instante.\n' +
  'Si me escribes *"¿qué me falta?"* te digo tus tareas pendientes y tus puntos. ¡Vamos con todo! 💪'

function firstName(full: string): string {
  return (full || '').trim().split(/\s+/)[0] || (full || '').trim()
}

export function buildWelcome(template: string | null | undefined, fullName: string, retoName: string): string {
  const base = template && template.trim() ? template.trim() : DEFAULT_WELCOME
  return base
    .replace(/\{nombre\}/gi, firstName(fullName))
    .replace(/\{reto\}/gi, retoName || 'el reto')
}

/**
 * Envía la bienvenida a un participante recién inscrito. Best-effort.
 * @returns true si el mensaje salió, false si no (bot desconectado, etc.).
 */
export async function sendWelcome(
  challengeId: string,
  challengeName: string,
  phone: string,
  fullName: string,
): Promise<boolean> {
  try {
    const template = await getWelcomeTemplate()
    const msg = buildWelcome(template, fullName, challengeName)
    const ok = await sendToPhone(phone, msg)
    if (ok) await saveRetoMessage(challengeId, phone, 'bot', msg)
    return ok
  } catch (err) {
    console.error('[reto90d/welcome] sendWelcome failed:', err)
    return false
  }
}
