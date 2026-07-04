// ─────────────────────────────────────────────────────────────────────────────
// Reto 90D — Bienvenida automática al registrarse.
// Envía por WhatsApp (bot del reto) un saludo personalizado con el nombre y el
// reto, usando una plantilla editable ({nombre}, {reto}). Best-effort: nunca
// lanza (no debe romper el registro si el bot no está conectado).
// ─────────────────────────────────────────────────────────────────────────────
import { sendToPhone, getWelcomeTemplate, getRetoWaNumber } from '@/lib/whatsapp/reto90dSender'
import { sendRetoWelcomeEmail } from '@/lib/email'
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
 * - Por CORREO (si se registró con email): incluye un botón wa.me para que ESCRIBA
 *   primero al número del reto (evita el baneo de WhatsApp por iniciar el bot).
 * - Por WhatsApp: solo si el bot ya tuvo conversación con ese número (best-effort).
 * @returns true si al menos un canal salió.
 */
export async function sendWelcome(
  challengeId: string,
  challengeName: string,
  phone: string,
  fullName: string,
  email?: string | null,
): Promise<boolean> {
  const template = await getWelcomeTemplate()
  const msg = buildWelcome(template, fullName, challengeName)
  let anyOk = false

  // 1) Correo con botón de WhatsApp (canal principal y confiable)
  if (email && email.trim()) {
    try {
      const waNumber = await getRetoWaNumber()
      const ok = await sendRetoWelcomeEmail(email.trim(), fullName, challengeName, msg, waNumber)
      anyOk = anyOk || ok
    } catch (err) {
      console.error('[reto90d/welcome] email failed:', err)
    }
  }

  // 2) WhatsApp (best-effort; puede fallar si el bot aún no habló con ese número)
  try {
    const ok = await sendToPhone(phone, msg)
    if (ok) await saveRetoMessage(challengeId, phone, 'bot', msg)
    anyOk = anyOk || ok
  } catch (err) {
    console.error('[reto90d/welcome] whatsapp failed:', err)
  }

  return anyOk
}
