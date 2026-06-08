async function expirePlans() {
    try {
        const { prisma } = await import('@/lib/prisma')
        const now = new Date()

        const expiredUsers = await prisma.$queryRaw<Array<{ id: string; plan: string }>>`
            SELECT id::text, plan::text FROM users
            WHERE plan != 'NONE'
              AND plan_expires_at IS NOT NULL
              AND plan_expires_at < ${now}
        `
        if (expiredUsers.length === 0) return

        const userIds = expiredUsers.map(u => u.id)
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`UPDATE users SET plan = 'NONE'::"UserPlan", plan_expires_at = NULL WHERE id = ANY(${userIds}::uuid[])`
            await tx.$executeRaw`UPDATE bots SET status = 'PAUSED'::"BotStatus" WHERE user_id = ANY(${userIds}::uuid[])`
            await tx.$executeRaw`UPDATE stores SET active = false WHERE user_id = ANY(${userIds}::uuid[])`
        })
        console.log(`[CRON] expire-plans: ${expiredUsers.length} planes vencidos desactivados`)
    } catch (err) {
        console.error('[CRON] expire-plans error:', err)
    }
}

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // ── Cron: expirar planes vencidos cada hora ──────────────────────────
        expirePlans() // ejecutar al iniciar también
        setInterval(expirePlans, 60 * 60 * 1000)

        // ── Limpieza de sesiones Baileys huérfanas (al arrancar) ─────────────
        //
        // Las sesiones se guardan en disco por botId. Al borrar un bot, su carpeta
        // queda huérfana acumulando miles de archivos (pre-keys) que llenan el disco
        // persistente de Render → ENOSPC (inodos) → no se crean sesiones nuevas (no
        // sale QR). Acá borramos SOLO carpetas cuyo botId ya NO existe en la BD.
        //
        // Guardas de seguridad (para NO borrar sesiones buenas):
        //   1. Solo carpetas cuyo nombre es un UUID válido (los botId).
        //   2. Solo borra si el botId no aparece en la BD.
        //   3. Si la consulta a la BD falla → el try/catch aborta sin borrar nada.
        //   4. Si la BD devuelve 0 bots pero hay carpetas (situación anómala) →
        //      abortamos por seguridad en vez de borrar todo.
        const cleanupOrphanBaileysSessions = async () => {
            try {
                const fs = await import('fs')
                const path = await import('path')
                const { prisma } = await import('@/lib/prisma')

                const dir = process.env.BAILEYS_SESSIONS_DIR || path.join(process.cwd(), 'baileys-sessions')
                if (!fs.existsSync(dir)) return

                const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                const entries = fs.readdirSync(dir, { withFileTypes: true })
                    .filter(e => e.isDirectory() && UUID_RE.test(e.name))
                if (entries.length === 0) return

                const dirIds = entries.map(e => e.name)
                const existing = await prisma.bot.findMany({
                    where: { id: { in: dirIds } },
                    select: { id: true },
                })
                const existingSet = new Set(existing.map(b => b.id))

                // Guarda #4: si NINGUNA carpeta matchea un bot, algo raro pasó
                // (BD vacía/incompleta). No borramos nada para no romper sesiones buenas.
                if (existingSet.size === 0) {
                    console.warn(`[CLEANUP] ${dirIds.length} carpeta(s) de sesión y 0 bots coincidentes en BD — aborto por seguridad, no borro nada`)
                    return
                }

                let removed = 0
                for (const e of entries) {
                    if (existingSet.has(e.name)) continue // bot existe → NO tocar
                    try {
                        fs.rmSync(path.join(dir, e.name), { recursive: true, force: true })
                        removed++
                    } catch (rmErr) {
                        console.error(`[CLEANUP] No se pudo borrar sesión huérfana ${e.name}:`, rmErr)
                    }
                }
                if (removed > 0) console.log(`[CLEANUP] ${removed} sesión(es) huérfana(s) de bots eliminados borradas (liberando inodos del disco)`)
                else console.log('[CLEANUP] Sin sesiones huérfanas que limpiar')
            } catch (err) {
                console.error('[CLEANUP] cleanupOrphanBaileysSessions error (no se borró nada):', err)
            }
        }
        // Corre 5s tras el boot — antes de la reconexión (10s), para liberar inodos primero.
        setTimeout(cleanupOrphanBaileysSessions, 5_000)

        // ── Reconectar bots Baileys en background ──────────────────────────
        //
        // Estrategia en 2 capas:
        //   A) Al arrancar (10s después del boot): reconecta todos los bots
        //      ACTIVE con baileysPhone guardado.
        //   B) Cada 5 minutos: health check que detecta bots cuya conexión en
        //      memoria está caída pero deberían estar conectados, y los revive.
        //
        // Esto cubre el caso típico: el process de Render rota workers o el
        // socket de WhatsApp se cae por timeout / red intermitente, y nadie
        // dispara una reconexión. Sin esto, el bot queda dormido hasta el
        // próximo deploy.

        const reconnectAllPendingBaileys = async (trigger: 'STARTUP' | 'HEALTHCHECK') => {
            try {
                const { prisma } = await import('@/lib/prisma')
                const { BaileysManager } = await import('@/lib/baileys-manager')
                const { decrypt } = await import('@/lib/crypto')

                const bots = await prisma.bot.findMany({
                    where: {
                        type: 'BAILEYS',
                        status: 'ACTIVE',
                        baileysPhone: { not: null },
                    },
                    include: { secret: true },
                })

                let revived = 0
                for (const bot of bots) {
                    // CADA bot se reconecta en su propio try/catch para que un bot roto
                    // no impida que los demás se reconecten.
                    try {
                        if (!bot.secret) continue

                        // Si es el health check, sólo reconectar los que están caídos
                        if (trigger === 'HEALTHCHECK') {
                            const current = BaileysManager.getStatus(bot.id)
                            if (current.status === 'connected' || current.status === 'connecting' || current.status === 'qr_ready') {
                                continue
                            }
                        }

                        // decrypt seguro: si la key está vacía o corrupta, pasamos '' y
                        // baileys-manager hace fallback dinámico al saldo USD admin
                        // (chargeUserForAI) en cada mensaje entrante.
                        let openaiKey = ''
                        if (bot.secret.openaiApiKeyEnc) {
                            try { openaiKey = decrypt(bot.secret.openaiApiKeyEnc) } catch { openaiKey = '' }
                        }

                        console.log(`[${trigger}] Reconectando bot Baileys: ${bot.name}${openaiKey ? '' : ' (sin key propia, usará admin key)'}`)
                        BaileysManager.connect(bot.id, bot.name, openaiKey, bot.secret.reportPhone ?? '')
                            .catch(err => console.error(`[${trigger}] Error reconectando bot ${bot.id}:`, err))
                        revived++
                    } catch (botErr) {
                        console.error(`[${trigger}] Error procesando bot ${bot.id} (${bot.name}):`, botErr)
                    }
                }
                if (trigger === 'HEALTHCHECK' && revived > 0) {
                    console.log(`[HEALTHCHECK] Reconectados ${revived} bot(s) Baileys que estaban caídos`)
                }
            } catch (err) {
                console.error(`[${trigger}] Error al reconectar bots Baileys:`, err)
            }
        }

        // (A) Reconectar al arrancar — 10s después del boot
        setTimeout(() => reconnectAllPendingBaileys('STARTUP'), 10_000)

        // (B) Health check cada 5 minutos
        setInterval(() => reconnectAllPendingBaileys('HEALTHCHECK'), 5 * 60 * 1000)

        // ── Broadcast CRM: arrancar el scheduler + reanudar campañas interrumpidas ──
        //
        // Antes el scheduler solo arrancaba al tocar /execute → tras un reinicio, una
        // campaña PROGRAMADA podía no ejecutarse nunca. Y una campaña RUNNING cortada
        // por un deploy quedaba colgada para siempre (corre en una tarea larga sin
        // resume). Acá arrancamos el scheduler en el boot y reanudamos las RUNNING
        // (executeBroadcast solo procesa contactos PENDING, así que es seguro).
        const startBroadcasts = async () => {
            try {
                const { startBroadcastScheduler, executeBroadcast } = await import('@/lib/broadcast-worker')
                const { prisma } = await import('@/lib/prisma')
                startBroadcastScheduler()
                const running = await (prisma as any).broadcastCampaign.findMany({
                    where: { status: 'RUNNING' },
                    select: { id: true },
                })
                for (const c of running) {
                    console.log(`[BROADCAST] Reanudando campaña interrumpida ${c.id}`)
                    executeBroadcast(c.id).catch((err: unknown) => console.error(`[BROADCAST] Error reanudando ${c.id}:`, err))
                }
            } catch (err) {
                console.error('[BROADCAST] startup error:', err)
            }
        }
        // 12s tras el boot — después del reconnect de Baileys (10s), para que el bot esté listo.
        setTimeout(startBroadcasts, 12_000)
    }
}
