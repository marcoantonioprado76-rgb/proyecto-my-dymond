/**
 * Baileys Manager — Singleton que gestiona múltiples conexiones WhatsApp Web.
 * Una conexión por botId. Sesión guardada en ./baileys-sessions/[botId]/
 */

import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    WASocket,
    proto,
    downloadMediaMessage,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import fs from 'fs'
import { prisma } from '@/lib/prisma'
import { chatWithUsage } from '@/lib/openai'
import { decrypt } from '@/lib/crypto'
import { toDataURL } from 'qrcode'
import { processFollowUps } from './follow-up-worker'
import { buildSystemPrompt, detectIdentifiedProduct, enforceCharLimits, extractSentUrls } from './bot-engine'
import { createNotification } from './notifications'
import { sendBotSaleReportEmail } from './email'
import { notifyCreditsExhausted } from './notify-credits'

// ── Types ──────────────────────────────────────────────────────────────────────

export type BaileysStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected'

interface BaileysConnection {
    status: BaileysStatus
    qrBase64?: string
    phone?: string
    sock?: WASocket
    openaiKey: string
    reportPhone: string
    botId: string
    botName: string
}

// ── In-memory store (global para sobrevivir Next.js HMR) ──────────────────────
declare global {
    // eslint-disable-next-line no-var
    var __baileys_connections: Map<string, BaileysConnection> | undefined
    // eslint-disable-next-line no-var
    var __follow_up_worker_started: boolean | undefined
    // eslint-disable-next-line no-var
    var __follow_up_worker_running: boolean | undefined
    // eslint-disable-next-line no-var
    var __social_scheduler_started: boolean | undefined
}

const connections: Map<string, BaileysConnection> =
    global.__baileys_connections ?? (global.__baileys_connections = new Map())

const SESSIONS_DIR = process.env.BAILEYS_SESSIONS_DIR || path.join(process.cwd(), 'baileys-sessions')
const MAX_HISTORY = 10
const BUFFER_DELAY_MS = 15_000
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

// ── Combinar mensajes del buffer ───────────────────────────────────────────────

interface BufferedMsg {
    id: string
    type: string
    content: string
    createdAt: Date
}

function combineBufferedMessages(messages: BufferedMsg[]): string {
    const sorted = [...messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    return sorted
        .map(m => {
            switch (m.type) {
                case 'audio': return `🎙️ (audio transcrito): ${m.content}`
                case 'image': return `📷 (imagen recibida): ${m.content}`
                default: return `📝 (texto): ${m.content}`
            }
        })
        .join('\n')
}

// ── Message handler ────────────────────────────────────────────────────────────

async function handleMessage(
    conn: BaileysConnection,
    msg: proto.IWebMessageInfo,
) {
    const sock = conn.sock!
    if (!msg.key?.remoteJid) return
    const jid = msg.key.remoteJid

    // Ignorar mensajes propios, grupos y status
    if (
        msg.key.fromMe ||
        jid === 'status@broadcast' ||
        jid.endsWith('@g.us')
    ) return

    // Verificar que el bot siga ACTIVE en BD (puede haberse pausado mientras el socket sigue conectado)
    const botStatus = await prisma.bot.findUnique({
        where: { id: conn.botId },
        select: { status: true, userId: true, aiModel: true },
    })
    if (!botStatus || botStatus.status !== 'ACTIVE') {
        // Bot pausado o eliminado — NO leer ni procesar nada (invisible para el cliente)
        console.log(`[BAILEYS] Bot ${conn.botId} está ${botStatus?.status ?? 'eliminado'}, ignorando mensaje sin leer`)
        return
    }

    // Deduplicación por ID de mensaje
    if (msg.key.id) {
        const exists = await prisma.message.findUnique({ where: { messageId: msg.key.id } })
        if (exists) {
            console.log(`[BAILEYS] Mensaje duplicado ${msg.key.id}, omitiendo`)
            return
        }
    }

    // Leer credenciales frescas de BD en cada mensaje (nunca desde memoria)
    const freshSecret = await prisma.botSecret.findUnique({ where: { botId: conn.botId } })

    // Resolver openaiKey:
    //   1. Si el bot tiene key propia → usarla (sin cobrar saldo).
    //   2. Si no → usar la admin key SOLO si el dueño tiene saldo USD > 0.
    // El cobro se hace DESPUÉS de cada llamada exitosa por tokens / segundos / imágenes
    // reales (no flat por llamada).
    let openaiKey = ''
    let keySource: 'own' | 'admin' = 'own'
    if (freshSecret?.openaiApiKeyEnc) {
        try { openaiKey = decrypt(freshSecret.openaiApiKeyEnc) } catch { openaiKey = '' }
    }
    if (!openaiKey && botStatus.userId) {
        const { resolveOpenAIKey } = await import('./ai-credits')
        const resolved = await resolveOpenAIKey(botStatus.userId)
        if (resolved.ok) {
            openaiKey = resolved.key
            keySource = resolved.source
        } else {
            // Sin saldo o sin key admin → bot queda mudo (no procesa el mensaje).
            // Notificar UNA vez al dueño que se quedó sin saldo.
            if (resolved.error === 'NO_CREDITS') {
                notifyCreditsExhausted(botStatus.userId, conn.botName).catch(() => {})
            }
            console.warn(`[BAILEYS] Bot ${conn.botId} sin key propia (${resolved.error}). Mensaje ignorado.`)
            return
        }
    }
    if (!openaiKey) {
        console.warn(`[BAILEYS] Bot ${conn.botId} sin API key de OpenAI configurada`)
        return
    }

    const userPhone = jid.replace('@s.whatsapp.net', '')
    let userName = msg.pushName || ''

    // Si el nombre es puramente numérico, es un fallback del teléfono
    if (userName && /^\d+$/.test(userName.replace(/[+\s-]/g, ''))) {
        userName = ''
    }

    // Extraer contenido del mensaje
    let content = ''
    let msgType: 'text' | 'audio' | 'image' | 'location' = 'text'
    const msgContent = msg.message

    if (msgContent?.conversation) {
        content = msgContent.conversation
        msgType = 'text'
    } else if (msgContent?.extendedTextMessage?.text) {
        content = msgContent.extendedTextMessage.text
        msgType = 'text'
    } else if (msgContent?.audioMessage) {
        msgType = 'audio'
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const buffer = await downloadMediaMessage(msg as any, 'buffer', {})
            const { transcribeAudio } = await import('@/lib/openai')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const blob = new Blob([buffer as any], { type: 'audio/ogg' })
            content = await transcribeAudio(blob, openaiKey)
            // Cobrar whisper si usamos admin key. Duración de WhatsApp viene en `seconds`.
            if (keySource === 'admin' && botStatus.userId && content) {
                const audioSeconds = Number(msgContent.audioMessage.seconds) || 30
                const { chargeForWhisperSeconds } = await import('./ai-credits')
                chargeForWhisperSeconds(botStatus.userId, audioSeconds, 'baileys.audio', { botId: conn.botId })
                    .catch(e => console.error('[BAILEYS] chargeForWhisperSeconds error:', e))
            }
        } catch {
            content = '[Audio recibido - no se pudo transcribir]'
        }
    } else if (msgContent?.imageMessage) {
        msgType = 'image'
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const buffer = await downloadMediaMessage(msg as any, 'buffer', {})
            const { analyzeImageWithUsage } = await import('@/lib/openai')
            const b64 = (buffer as Buffer).toString('base64')
            const dataUrl = `data:image/jpeg;base64,${b64}`
            const { text: analysis, promptTokens, completionTokens } = await analyzeImageWithUsage(dataUrl, openaiKey)
            content = `[Imagen recibida] ${analysis} ${msgContent.imageMessage.caption ? `| Pie de foto: ${msgContent.imageMessage.caption}` : ''}`
            // Cobrar gpt-4o-mini (lo que usa analyzeImage) si usamos admin key
            if (keySource === 'admin' && botStatus.userId) {
                const { chargeForChatUsage } = await import('./ai-credits')
                chargeForChatUsage(botStatus.userId, 'gpt-4o-mini', promptTokens, completionTokens, 'baileys.image', { botId: conn.botId })
                    .catch(e => console.error('[BAILEYS] chargeForChatUsage(image) error:', e))
            }
        } catch {
            content = msgContent.imageMessage.caption || '[Imagen recibida - error al analizar]'
        }
    } else if (msgContent?.locationMessage || (msgContent as any)?.liveLocationMessage) {
        msgType = 'location'
        const loc = msgContent?.locationMessage || (msgContent as any)?.liveLocationMessage
        const lat = loc.degreesLatitude
        const lon = loc.degreesLongitude
        const name = loc.name || ''
        const address = loc.address || ''
        content = `📍 Ubicación recibida: ${name} ${address}`.trim()
        if (lat && lon) content += ` | https://maps.google.com/?q=${lat},${lon}`
    } else {
        return
    }

    if (!content.trim()) return

    // Verificar si ya compró o si el bot está desactivado para este chat
    const existingConv = await prisma.conversation.findUnique({
        where: { botId_userPhone: { botId: conn.botId, userPhone } },
        select: { sold: true, botDisabled: true },
    })
    if (existingConv?.sold) return
    if (existingConv?.botDisabled) return

    // Marcar como leído
    if (msg.key) {
        await sock.readMessages([msg.key]).catch(err =>
            console.error('[BAILEYS] Error al marcar como leído:', err)
        )
    }

    // --- BUFFER ---
    let conversation = await prisma.conversation.upsert({
        where: { botId_userPhone: { botId: conn.botId, userPhone } },
        update: {
            userName: userName || undefined,
            updatedAt: new Date(),
            followUp1At: null,
            followUp1Sent: false,
            followUp2At: null,
            followUp2Sent: false,
        },
        create: {
            botId: conn.botId,
            userPhone,
            userName,
            botState: { create: { welcomeSent: false } },
        },
        include: { botState: true },
    })

    const resolvedUserName = userName || conversation.userName || ''
    const conversationId = conversation.id
    const arrivedAt = conversation.updatedAt
    // welcomeSent: si el primer mensaje del producto ya se envió, NO repetirlo ni su foto.
    // Conversaciones viejas sin botState → false (se tratará como aún-no-enviado).
    const welcomeSent = conversation.botState?.welcomeSent ?? false

    await prisma.message.create({
        data: {
            conversationId,
            role: 'user',
            type: msgType,
            content,
            buffered: true,
            messageId: msg.key.id || undefined,
        },
    })

    await sleep(BUFFER_DELAY_MS)

    const freshConv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { updatedAt: true },
    })

    if (freshConv && freshConv.updatedAt > arrivedAt) return

    const bufferedMsgs = await prisma.message.findMany({
        where: { conversationId, role: 'user', buffered: true },
        orderBy: { createdAt: 'asc' },
    })

    if (bufferedMsgs.length === 0) return

    const combinedUserText = combineBufferedMessages(bufferedMsgs)

    await prisma.$transaction([
        prisma.message.deleteMany({
            where: { conversationId, role: 'user', buffered: true },
        }),
        prisma.message.create({
            data: {
                conversationId,
                role: 'user',
                type: 'text',
                content: combinedUserText,
                buffered: false,
            },
        }),
    ])

    const history = await prisma.message.findMany({
        where: { conversationId, buffered: false },
        orderBy: { createdAt: 'desc' },
        take: MAX_HISTORY,
    })
    const chatHistory = history.reverse().map(m => {
        if (m.role === 'assistant') {
            try {
                const parsed = JSON.parse(m.content)
                return { role: 'assistant' as const, content: [parsed.mensaje1, parsed.mensaje2, parsed.mensaje3].filter(Boolean).join('\n') }
            } catch {
                return { role: 'assistant' as const, content: m.content }
            }
        }
        return { role: m.role as 'user' | 'assistant', content: m.content }
    })

    const bot = await prisma.bot.findUnique({
        where: { id: conn.botId },
        include: { user: { select: { id: true, email: true, fullName: true } } },
    })
    if (!bot) return

    const botProducts = await prisma.product.findMany({
        where: { bots: { some: { botId: conn.botId } }, active: true },
    })

    // URLs ya enviadas — escanear TODOS los mensajes del asistente (no solo los últimos 10),
    // para que aunque una foto/video se haya mandado hace 20 mensajes, no se repita.
    const allAssistantMessages = await prisma.message.findMany({
        where: { conversationId, role: 'assistant', buffered: false },
        select: { content: true, role: true },
        orderBy: { createdAt: 'asc' },
    })
    const sentUrls = extractSentUrls(allAssistantMessages)

    const identifiedProductIds = detectIdentifiedProduct(chatHistory, botProducts as Array<Record<string, unknown>>)
    if (identifiedProductIds.length) {
        const names = identifiedProductIds.map(id => botProducts.find(p => p.id === id)?.name).join(', ')
        console.log(`[BAILEYS] Smart filter: productos="${names}" — otros en modo minimal`)
    }

    const systemPrompt = buildSystemPrompt(
        bot,
        botProducts as Array<Record<string, unknown>>,
        resolvedUserName,
        userPhone,
        identifiedProductIds,
        sentUrls,
        welcomeSent,
    )

    const aiModel = (bot as any).aiModel || 'gpt-4o'
    let response: Awaited<ReturnType<typeof chatWithUsage>>['response']
    try {
        const result = await chatWithUsage(systemPrompt, chatHistory, openaiKey, aiModel)
        response = result.response
        // Cobrar tokens reales SOLO si usamos admin key. Fire-and-forget: si falla el cobro,
        // se loguea pero NO bloquea la respuesta al cliente.
        if (keySource === 'admin' && botStatus.userId) {
            const { chargeForChatUsage } = await import('./ai-credits')
            chargeForChatUsage(botStatus.userId, aiModel, result.promptTokens, result.completionTokens, 'baileys.message', { botId: conn.botId })
                .catch(e => console.error('[BAILEYS] chargeForChatUsage error:', e))
        }
    } catch (aiErr: any) {
        const errMsg: string = aiErr?.message || ''
        console.error(`[BAILEYS] OpenAI error para ${userPhone}:`, errMsg)
        // Diferenciar saldo realmente agotado vs rate-limit transitorio.
        // Solo pausamos y notificamos cuando es saldo agotado (no se resuelve solo).
        const isQuotaExhausted =
            errMsg.includes('insufficient_quota') ||
            errMsg.includes('exceeded your current quota') ||
            errMsg.includes('billing_hard_limit_reached')
        if (isQuotaExhausted) {
            await prisma.bot.update({ where: { id: conn.botId }, data: { status: 'PAUSED' } }).catch(() => {})
            notifyCreditsExhausted(bot.user.id, bot.name).catch(() => {})
            console.warn(`[BAILEYS] Bot ${conn.botId} PAUSADO automáticamente por quota insuficiente en OpenAI`)
        } else {
            // Rate-limit u otro error transitorio → respaldo para no dejar al usuario en visto
            await sock.sendMessage(jid, { text: '¡Hola! Recibí tu mensaje, en un momento te atiendo 😊' }).catch(() => {})
        }
        return
    }

    // isFirstInteraction = el primer mensaje del producto aún no se envió → no truncar mensaje1.
    enforceCharLimits(response, bot, !welcomeSent)

    // Filtro de seguridad: quitar URLs ya enviadas aunque la IA las vuelva a incluir.
    if (sentUrls.length) {
        const sentSet = new Set(sentUrls)
        response.fotos_mensaje1 = (response.fotos_mensaje1 ?? []).filter((u: string) => !sentSet.has(u))
        response.videos_mensaje1 = (response.videos_mensaje1 ?? []).filter((u: string) => !sentSet.has(u))
    }

    const sendMsg = async (text: string) => {
        await sock.sendPresenceUpdate('composing', jid)
        await sleep(Math.floor(Math.random() * 1000) + 1000)
        await sock.sendMessage(jid, { text })
    }

    if (response.mensaje1) await sendMsg(response.mensaje1)
    for (const photoUrl of response.fotos_mensaje1) {
        if (photoUrl.startsWith('https://')) {
            await sock.sendPresenceUpdate('composing', jid)
            await sleep(500)
            await sock.sendMessage(jid, { image: { url: photoUrl } }).catch(() => { })
        }
    }
    const videosToSend: string[] = Array.isArray(response.videos_mensaje1)
        ? (response.videos_mensaje1 as unknown[]).filter((v): v is string => typeof v === 'string' && v.startsWith('https://'))
        : []
    for (const videoUrl of videosToSend) {
        await sock.sendPresenceUpdate('composing', jid)
        await sleep(800)
        await sock.sendMessage(jid, { video: { url: videoUrl } }).catch(() => { })
    }
    if (response.mensaje2) await sendMsg(response.mensaje2)
    if (response.mensaje3) await sendMsg(response.mensaje3)

    // reportPhone FRESCO de BD: si el dueño lo cambió en Credenciales, el socket vivo
    // sigue con el viejo en memoria. Preferimos el de BD y caemos al de memoria.
    const reportPhone = freshSecret?.reportPhone || conn.reportPhone
    if (response.reporte && reportPhone) {
        // Persistir SIEMPRE el reporte en BD aunque falle el envío por WhatsApp.
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { sold: true, soldAt: new Date(), orderReport: response.reporte }
        }).catch(() => { })

        const reportJid = `${reportPhone.replace(/^\+/, '')}@s.whatsapp.net`
        const sendOk = await sock.sendMessage(reportJid, { text: response.reporte })
            .then(() => true)
            .catch((e: any) => { console.error('[BAILEYS] sendReport ERROR:', e?.message); return false })

        // Notificación push al dueño del bot
        createNotification(
            bot.user.id,
            sendOk ? `🤖 Nueva venta — ${bot.name}` : `🤖 Nueva venta — ${bot.name} (reporte WhatsApp no entregado)`,
            response.reporte.slice(0, 120),
            '/dashboard/services/whatsapp',
        ).catch(() => {})

        // Email al dueño con el reporte completo
        sendBotSaleReportEmail(
            bot.user.email,
            bot.user.fullName,
            bot.name,
            response.reporte,
        ).catch(() => {})

        console.log(`[BAILEYS] Conversación ${conversationId} finalizada (Reporte ${sendOk ? 'enviado' : 'NO enviado'})`)

        // Etiquetar
        try {
            const labelJid = jid.endsWith('@lid') ? `${userPhone.replace(/\D/g, "")}@s.whatsapp.net` : jid
            await (sock as any).addChatLabel(labelJid, '4')
        } catch { }
    } else {
        const now = new Date()
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                followUp1At: new Date(now.getTime() + (bot.followUp1Delay || 15) * 60 * 1000),
                followUp1Sent: false,
                followUp2At: new Date(now.getTime() + (bot.followUp2Delay || 4320) * 60 * 1000),
                followUp2Sent: false,
            },
        }).catch(() => { })
    }

    await prisma.message.create({
        data: {
            conversationId,
            role: 'assistant',
            type: 'text',
            content: JSON.stringify(response),
            buffered: false,
        },
    })

    // Marcar welcomeSent=true SOLO cuando el producto ya está identificado y se envió
    // mensaje1: así el primer mensaje del producto + su foto principal no se repiten en
    // turnos siguientes. upsert para conversaciones viejas que no tienen fila botState.
    if (!welcomeSent && response.mensaje1 && identifiedProductIds.length > 0) {
        await prisma.botState.upsert({
            where: { conversationId },
            create: { conversationId, welcomeSent: true, welcomeSentAt: new Date() },
            update: { welcomeSent: true, welcomeSentAt: new Date() },
        }).catch(() => { })
    }
}

export const BaileysManager = {
    getStatus(botId: string) {
        const conn = connections.get(botId)
        if (!conn) return { status: 'disconnected' }
        return { status: conn.status, qrBase64: conn.qrBase64, phone: conn.phone }
    },

    async sendText(botId: string, toPhone: string, text: string): Promise<boolean> {
        const conn = connections.get(botId)
        if (!conn?.sock || conn.status !== 'connected') return false
        const jid = `${toPhone.replace(/^\+/, '').replace(/\s/g, '')}@s.whatsapp.net`
        try {
            await conn.sock.sendMessage(jid, { text })
            return true
        } catch (err) {
            console.error('[BAILEYS] sendText error:', err)
            return false
        }
    },

    async sendImage(botId: string, toPhone: string, imageUrl: string, caption?: string): Promise<boolean> {
        const conn = connections.get(botId)
        if (!conn?.sock || conn.status !== 'connected') return false
        const jid = `${toPhone.replace(/^\+/, '').replace(/[\s\-\(\)\.]/g, '')}@s.whatsapp.net`
        try {
            await conn.sock.sendMessage(jid, { image: { url: imageUrl }, ...(caption ? { caption } : {}) })
            return true
        } catch (err) {
            console.error('[BAILEYS] sendImage error:', err)
            return false
        }
    },

    async connect(botId: string, botName: string, openaiKey: string, reportPhone: string, opts: { forceFresh?: boolean } = {}) {
        const existing = connections.get(botId)
        // Si ya está realmente conectado, no tocar nunca.
        if (existing?.status === 'connected') return
        // Reconexión automática (sin forceFresh): no duplicar un intento en curso.
        if (!opts.forceFresh && (existing?.status === 'connecting' || existing?.status === 'qr_ready')) return

        const sessionDir = path.join(SESSIONS_DIR, botId)

        // forceFresh = el usuario pidió un QR nuevo desde el panel. Matamos cualquier
        // socket atascado y BORRAMOS la sesión vieja/corrupta del disco, porque Baileys
        // solo emite QR cuando NO hay credenciales guardadas. Sin esto, un bot con
        // sesión inválida reintenta con esas credenciales rotas y nunca muestra QR.
        if (opts.forceFresh) {
            if (existing?.sock) {
                try { (existing.sock as any).end?.(undefined) } catch { /* noop */ }
                try { (existing.sock as any).ws?.close?.() } catch { /* noop */ }
            }
            connections.delete(botId)
            try { if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true }) } catch { /* noop */ }
        }

        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })

        const conn: BaileysConnection = { status: 'connecting', openaiKey, reportPhone, botId, botName }
        connections.set(botId, conn)

        try {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
            let version: [number, number, number]
            try {
                const result = await fetchLatestBaileysVersion()
                version = result.version as [number, number, number]
            } catch {
                // Si falla la consulta de versión, usar una versión conocida como fallback
                version = [2, 3000, 1015901307]
            }
            const sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, require('pino')({ level: 'silent' })),
                },
                logger: (require('pino')({ level: 'silent' })),
                browser: ['Ubuntu', 'Chrome', '120.0.0'],
                syncFullHistory: false,
                markOnlineOnConnect: false,
                keepAliveIntervalMs: 30_000,
                connectTimeoutMs: 60_000,
                retryRequestDelayMs: 2_000,
            })

            conn.sock = sock
            sock.ev.on('creds.update', saveCreds)
            sock.ev.on('connection.update', async update => {
                const { connection, qr } = update
                if (qr) conn.qrBase64 = await toDataURL(qr), conn.status = 'qr_ready'
                if (connection === 'open') {
                    conn.status = 'connected'
                    const phone = sock.user?.id?.split(':')[0] ?? ''
                    conn.phone = phone
                    await prisma.bot.update({ where: { id: botId }, data: { baileysPhone: phone } }).catch(() => { })
                }
                if (connection === 'close') {
                    const statusCode = new Boom(update.lastDisconnect?.error)?.output?.statusCode
                    conn.status = 'disconnected'
                    connections.delete(botId)

                    const isLoggedOut =
                        statusCode === DisconnectReason.loggedOut ||
                        statusCode === DisconnectReason.connectionReplaced

                    if (isLoggedOut) {
                        // WhatsApp cerró la sesión definitivamente — limpiar y NO reconectar
                        const sessionDir = path.join(SESSIONS_DIR, botId)
                        if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true })
                        await prisma.bot.update({ where: { id: botId }, data: { baileysPhone: null } }).catch(() => { })
                        console.log(`[BAILEYS] Bot ${botId} logged out por WhatsApp — sesión borrada`)
                    } else {
                        // Desconexión temporal — reconectar en 5s con credenciales frescas de DB
                        setTimeout(async () => {
                            try {
                                const fresh = await prisma.botSecret.findUnique({ where: { botId } })
                                const freshKey = fresh?.openaiApiKeyEnc ? decrypt(fresh.openaiApiKeyEnc) : openaiKey
                                const freshPhone = fresh?.reportPhone ?? reportPhone
                                BaileysManager.connect(botId, botName, freshKey, freshPhone)
                            } catch {
                                BaileysManager.connect(botId, botName, openaiKey, reportPhone)
                            }
                        }, 5000)
                    }
                }
            })

            sock.ev.on('messages.upsert', async ({ messages, type }) => {
                if (type !== 'notify') return
                for (const msg of messages) {
                    handleMessage(conn, msg).catch(err =>
                        console.error(`[BAILEYS] Error procesando mensaje botId=${botId}:`, err)
                    )
                }
            })

        } catch (err) {
            console.error(`[BAILEYS] Error al iniciar conexión para bot ${botId}:`, err)
            connections.delete(botId)
            // Reintentar en 10s para no quedar desconectado permanentemente
            setTimeout(() => BaileysManager.connect(botId, botName, openaiKey, reportPhone), 10_000)
        }
    },

    disconnect(botId: string) {
        const conn = connections.get(botId)
        if (conn?.sock) conn.sock.logout().catch(() => { })
        connections.delete(botId)
        const sessionDir = path.join(SESSIONS_DIR, botId)
        if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true })
        prisma.bot.update({ where: { id: botId }, data: { baileysPhone: null } }).catch(() => { })
    },
}

if (!global.__follow_up_worker_started) {
    global.__follow_up_worker_started = true
    setInterval(async () => {
        // Guard de re-entrada: si el tick anterior AÚN corre (muchos seguimientos
        // pendientes + llamadas lentas a OpenAI), no arrancar otro en paralelo.
        // Sin esto los ticks se solapan y la misma conversación recibe varios
        // seguimientos seguidos.
        if (global.__follow_up_worker_running) return
        global.__follow_up_worker_running = true
        try {
            await processFollowUps()
        } catch { /* noop */ } finally {
            global.__follow_up_worker_running = false
        }
    }, 60 * 1000)
}

// Social scheduler — publica posts programados cada 60s
if (!global.__social_scheduler_started) {
    global.__social_scheduler_started = true
    setInterval(async () => {
        try {
            const { processScheduledSocialPosts } = await import('./social/scheduler-worker')
            const n = await processScheduledSocialPosts()
            if (n > 0) console.log(`[CRON] social-scheduler: ${n} post(s) publicado(s)`)
        } catch (err) {
            console.error('[CRON] social-scheduler error:', err)
        }
    }, 60 * 1000)
}
