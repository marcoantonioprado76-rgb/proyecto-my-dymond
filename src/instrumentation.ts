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
    }
}
