import { prisma } from './prisma'
import { chatWithUsage, FOLLOWUP_MODEL } from './openai'
import { sendText } from './ycloud'
import { decrypt } from './crypto'
import { BaileysManager } from './baileys-manager'
import { notifyCreditsExhausted } from './notify-credits'
import {
    resolveOpenAIKey,
    chargeForChatUsage,
} from './ai-credits'

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

// Si el envío falla (bot Baileys desconectado, etc.), reprogramamos el followUp2
// al menos 1 hora más adelante en lugar de dejarlo `<= now` (lo que generaría
// loop de procesamiento cada 60s con cobros consecutivos).
const FAILED_SEND_RETRY_MIN = 60

/**
 * Procesa los seguimientos automáticos pendientes (15 min y 3 días).
 * Se puede llamar desde un cron job o un intervalo.
 */
export async function processFollowUps() {
    const now = new Date()

    // 1. Buscar seguimientos de 15 minutos pendientes
    const followUps1 = await prisma.conversation.findMany({
        where: {
            sold: false,
            botDisabled: false,
            followUp1At: { lte: now },
            followUp1Sent: false,
            bot: {
                status: 'ACTIVE',
                // Saltear conversaciones cuyo dueño tiene followups desactivados.
                // NULL en la columna = activado (default histórico).
                user: { OR: [{ followupsEnabled: null }, { followupsEnabled: true }] },
            },
        },
        include: {
            bot: { include: { secret: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 10 },
        }
    })

    // 2. Buscar seguimientos de 3 días pendientes
    const followUps2 = await prisma.conversation.findMany({
        where: {
            sold: false,
            botDisabled: false,
            followUp2At: { lte: now },
            followUp2Sent: false,
            bot: {
                status: 'ACTIVE',
                // Saltear conversaciones cuyo dueño tiene followups desactivados.
                // NULL en la columna = activado (default histórico).
                user: { OR: [{ followupsEnabled: null }, { followupsEnabled: true }] },
            },
        },
        include: {
            bot: { include: { secret: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 10 },
        }
    })

    console.log(`[WORKER] Iniciando proceso de seguimientos. Pendientes: 15m=${followUps1.length}, 3d=${followUps2.length}`)

    for (const conv of followUps1) await executeFollowUp(conv, 1)
    for (const conv of followUps2) await executeFollowUp(conv, 2)
}

/**
 * Reprograma `followUp2At` a `delayMinutes` minutos en el futuro y deja
 * `followUp2Sent = false` para que el worker lo vuelva a procesar después.
 * Se usa tanto cuando el envío fue exitoso (reprograma con delay normal) como
 * cuando falló (delay corto de 1h para reintentar sin loop).
 */
async function rescheduleFollowUp2(conversationId: string, delayMinutes: number) {
    const nextRun = new Date(Date.now() + delayMinutes * 60 * 1000)
    await prisma.conversation.update({
        where: { id: conversationId },
        data: { followUp2At: nextRun, followUp2Sent: false },
    })
    return nextRun
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeFollowUp(conv: any, type: 1 | 2) {
    const { bot, userPhone, userName, messages, id: conversationId } = conv

    console.log(`[WORKER] Ejecutando seguimiento ${type} para ${userPhone} (${userName})`)

    try {
        if (!bot.secret) {
            console.warn(`[WORKER] Bot ${bot.id} sin credenciales, omitiendo seguimiento`)
            // Si era followUp2, evitar que vuelva inmediatamente
            if (type === 2) await rescheduleFollowUp2(conversationId, FAILED_SEND_RETRY_MIN)
            return
        }

        // ── PRE-CHECK A: si el bot Baileys no está conectado, NO procesar.
        //    Esto evita el bug histórico de cobrar saldo + llamar OpenAI + intentar
        //    enviar y fallar, repitiéndose cada 60s (loop de cobros).
        if (bot.type === 'BAILEYS') {
            const status = BaileysManager.getStatus(bot.id)
            if (status.status !== 'connected') {
                console.warn(`[WORKER] Bot ${bot.id} no conectado (${status.status}), reprogramando seguimiento ${type}`)
                if (type === 2) await rescheduleFollowUp2(conversationId, FAILED_SEND_RETRY_MIN)
                // followUp1 NO se reprograma porque solo se intenta UNA vez por diseño:
                // se queda con followUp1Sent=false y el siguiente tick lo reintenta.
                // Para evitar loop también acá, marcarlo como "intentado" (lo perdimos).
                else {
                    await prisma.conversation.update({
                        where: { id: conversationId },
                        data: { followUp1At: new Date(Date.now() + FAILED_SEND_RETRY_MIN * 60 * 1000) },
                    })
                }
                return
            }
        }

        // ── PRE-CHECK B: resolver key. Si no hay key propia y no hay saldo, saltear
        //    sin cobrar nada. Notificar al dueño UNA vez por sesión.
        let openaiKey: string | null = null
        let keySource: 'own' | 'admin' = 'own'
        try {
            openaiKey = decrypt(bot.secret.openaiApiKeyEnc)
        } catch {
            openaiKey = null
        }
        if (!openaiKey && bot.userId) {
            const resolved = await resolveOpenAIKey(bot.userId)
            if (resolved.ok) {
                openaiKey = resolved.key
                keySource = resolved.source
            } else {
                if (resolved.error === 'NO_CREDITS') {
                    notifyCreditsExhausted(bot.userId, bot.name).catch(() => {})
                }
                console.warn(`[WORKER] Bot ${bot.id} sin key (${resolved.error}). Seguimiento ${type} pausado.`)
                if (type === 2) await rescheduleFollowUp2(conversationId, FAILED_SEND_RETRY_MIN * 6)  // 6h
                return
            }
        }

        // Decodificar JSON de mensajes del asistente
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const history = messages.reverse().map((m: any) => {
            if (m.role === 'assistant') {
                try {
                    const parsed = JSON.parse(m.content)
                    const text = [parsed.mensaje1, parsed.mensaje2, parsed.mensaje3].filter(Boolean).join('\n')
                    return { role: 'assistant' as const, content: text || m.content }
                } catch {
                    return { role: 'assistant' as const, content: m.content }
                }
            }
            return { role: m.role as 'user' | 'assistant', content: m.content }
        })

        const delayMinutes = type === 1 ? bot.followUp1Delay : bot.followUp2Delay
        const delayText = delayMinutes >= 1440 ? `${Math.floor(delayMinutes / 1440)} días` : `${delayMinutes} minutos`

        const systemPrompt = `Actúa como el asistente de ventas de "${bot.name}".
El cliente ${userName || 'interesado'} (${userPhone}) escribió hace ${delayText}, pero la conversación quedó inconclusa y no se concretó el pedido.

Historial reciente:
${history.map((h: any) => `${h.role}: ${h.content.slice(0, 100)}`).join('\n')}

Genera un mensaje breve, cercano, cálido y muy humano en español para retomar la conversación de manera natural.

OBJETIVO:
Reconectar de forma amable, generar confianza y abrir espacio para que el cliente responda.

REGLAS IMPORTANTES:
1. Usa un tono natural, como si escribieras a alguien conocido.
2. Evita lenguaje robótico, formal o corporativo.
3. No repitas saludos si ya fueron usados en el historial.
4. No menciones que es un seguimiento ni que eres una IA.
5. Máximo 2 frases.
6. El mensaje debe tener mínimo 40 y máximo 80 caracteres.
7. Debe sentirse genuino, cálido y amigable.

IMPORTANTE: Responde únicamente en formato JSON con este schema exacto:
{
  "mensaje1": "mensaje aquí"
}`

        const FALLBACKS_1 = [
            "¡Hola! ¿Sigues por ahí? Cualquier duda dime y te ayudo 😊",
            "Hola de nuevo, ¿pudiste revisar lo que te pasé? Quedo atento.",
            "¿Cómo vas? Me cuentas si seguimos con el pedido 🙌",
        ]
        const FALLBACKS_2 = [
            "¡Hola! Pasaba a saludar y ver si necesitas algo más 🙌",
            "Hola, ¿pudiste decidirte? Aún tengo el producto disponible.",
            "¿Qué tal? Cualquier consulta aquí estoy para ayudarte 😊",
        ]
        const fallbackPool = type === 1 ? FALLBACKS_1 : FALLBACKS_2
        const fallback = fallbackPool[Math.floor(Math.random() * fallbackPool.length)]

        let messageText: string = fallback
        if (openaiKey) {
            try {
                const result = await chatWithUsage(systemPrompt, [], openaiKey, FOLLOWUP_MODEL)
                messageText = result.response.mensaje1 || fallback
                // Cobrar tokens reales solo si usamos admin key
                if (keySource === 'admin' && bot.userId) {
                    chargeForChatUsage(bot.userId, FOLLOWUP_MODEL, result.promptTokens, result.completionTokens, 'bot.followup', { botId: bot.id, type })
                        .catch(e => console.error('[WORKER] chargeForChatUsage error:', e))
                }
            } catch (aiErr) {
                const errMsg = (aiErr as Error).message || ''
                console.warn(`[WORKER] OpenAI falló para seguimiento ${type} de ${userPhone}, usando fallback:`, errMsg.slice(0, 120))
                // Solo notificar si es saldo agotado de la cuenta OpenAI del bot
                const isQuotaExhausted =
                    errMsg.includes('insufficient_quota') ||
                    errMsg.includes('exceeded your current quota') ||
                    errMsg.includes('billing_hard_limit_reached')
                if (isQuotaExhausted && bot.userId) {
                    notifyCreditsExhausted(bot.userId, bot.name).catch(() => {})
                }
            }
        }

        // ── Enviar según el tipo de bot
        let sent = false
        if (bot.type === 'BAILEYS') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const conn = (global as any).__baileys_connections?.get(bot.id)
            if (conn?.sock) {
                const jid = userPhone.includes('@') ? userPhone : `${userPhone.replace(/\D/g, '')}@s.whatsapp.net`
                try {
                    await conn.sock.sendPresenceUpdate('composing', jid)
                    await sleep(Math.floor(Math.random() * 1000) + 1000) // 1-2s
                    await conn.sock.sendMessage(jid, { text: messageText })
                    sent = true
                } catch (sendErr) {
                    console.warn(`[WORKER] sendMessage Baileys falló para ${userPhone}:`, (sendErr as Error).message)
                }
            }
        } else {
            // YCloud
            try {
                const apiKey = decrypt(bot.secret.ycloudApiKeyEnc)
                const from = bot.secret.whatsappInstanceNumber
                const to = userPhone.replace(/\D/g, '')
                await sendText(from, to, messageText, apiKey)
                sent = true
            } catch (sendErr) {
                console.warn(`[WORKER] sendText YCloud falló para ${userPhone}:`, (sendErr as Error).message)
            }
        }

        if (sent) {
            if (type === 1) {
                // Primer seguimiento (15m) — UNA sola vez por diseño
                await prisma.conversation.update({
                    where: { id: conversationId },
                    data: { followUp1Sent: true },
                })
            } else {
                // Segundo seguimiento (3d) — RECURRENTE: reprograma con delay normal
                const nextRun = await rescheduleFollowUp2(conversationId, bot.followUp2Delay || 4320)
                console.log(`[WORKER] Seguimiento recurrente (3d) reprogramado para ${nextRun.toLocaleString()} para ${userPhone}`)
            }

            // Guardar el mensaje enviado en el historial
            await prisma.message.create({
                data: {
                    conversationId,
                    role: 'assistant',
                    type: 'text',
                    content: JSON.stringify({ mensaje1: messageText, mensaje2: '', mensaje3: '', fotos_mensaje1: [], reporte: '' }),
                },
            })

            console.log(`[WORKER] Seguimiento ${type} enviado con éxito a ${userPhone}`)
        } else {
            // ── FIX CRÍTICO: si NO se envió, igual reprogramamos hacia el futuro para
            //    evitar el loop de procesamiento cada 60s. Si es followUp1, marcarlo
            //    como "ya intentado" (followUp1Sent=true) para que no se reintente
            //    eternamente — el seguimiento de 15min es one-shot por diseño.
            console.warn(`[WORKER] No se pudo enviar seguimiento ${type} a ${userPhone} (bot desconectado o error). Reprogramando.`)
            if (type === 1) {
                await prisma.conversation.update({
                    where: { id: conversationId },
                    data: { followUp1Sent: true },  // perdimos esta ventana; no insistir
                })
            } else {
                await rescheduleFollowUp2(conversationId, FAILED_SEND_RETRY_MIN)
            }
        }

    } catch (err) {
        console.error(`[WORKER] Error en seguimiento ${type} para ${userPhone}:`, err)
        // Salvavidas: si algo crashea ANTES de reprogramar, igual reprogramamos
        // para que esta conversación no quede atrapada en el loop de procesamiento.
        if (type === 2) {
            await rescheduleFollowUp2(conversationId, FAILED_SEND_RETRY_MIN).catch(() => {})
        }
    }
}
