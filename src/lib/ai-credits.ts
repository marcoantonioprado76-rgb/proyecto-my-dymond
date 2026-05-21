/**
 * AI Credits — gestión del balance USD para el uso de OpenAI con la key del admin.
 *
 * Reglas:
 *  - Si el usuario tiene preferOwnKey=true y tiene una key propia válida, se usa su key
 *    y NO se descuenta nada del balance USD.
 *  - Si no, se usa la key global del admin (AppSetting 'openai_global_key') y se descuenta
 *    el costo del modelo del balance USD del usuario.
 *  - Si el balance es insuficiente, se bloquea la llamada y se devuelve NO_CREDITS.
 *
 * El descuento se hace en una transacción con FOR UPDATE para evitar race conditions
 * cuando hay múltiples llamadas concurrentes del mismo usuario.
 */

import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY || ''

/**
 * Costo por llamada/uso de cada modelo, en USD.
 * Valores con markup razonable sobre el costo real de OpenAI.
 * Se pueden mover a AppSetting si querés que el admin los edite en runtime.
 */
export const MODEL_COST_USD: Record<string, number> = {
    // Chat models
    'gpt-4o':         0.05,
    'gpt-4o-mini':    0.01,
    'gpt-4-turbo':    0.05,
    'gpt-3.5-turbo':  0.01,
    // Audio
    'whisper-1':      0.02,
    // Images
    'dall-e-3':       0.10,   // standard
    'dall-e-3-hd':    0.20,
    'gpt-image-1':    0.10,
    // Embeddings (futuro)
    'text-embedding-3-small': 0.001,
    'text-embedding-3-large': 0.005,
}

export function costForModel(model: string): number {
    // Si el modelo no está mapeado, asumir el costo de gpt-4o-mini como default seguro
    return MODEL_COST_USD[model] ?? MODEL_COST_USD['gpt-4o-mini']
}

export type AIChargeOk = {
    ok: true
    key: string
    /** 'own' = usa key del usuario (sin descuento); 'admin' = usa key admin (descontó balance) */
    source: 'own' | 'admin'
    /** Balance USD restante (solo cuando source = 'admin') */
    remainingUsd?: number
    /** Costo cobrado (solo cuando source = 'admin') */
    chargedUsd?: number
}

export type AIChargeError = {
    ok: false
    error: 'NO_CREDITS' | 'NO_KEY' | 'INTERNAL'
    /** Balance USD actual cuando error = NO_CREDITS */
    balanceUsd?: number
    /** Costo requerido cuando error = NO_CREDITS */
    requiredUsd?: number
}

/**
 * Obtiene la key correcta para usar y, si aplica, descuenta del balance USD del usuario.
 *
 * @param userId       UUID del usuario que dispara la llamada
 * @param model        Modelo de OpenAI a usar (para calcular costo)
 * @param reason       Identificador del uso (ej: "ads.copies", "whatsapp.chat") para auditoría
 * @param metadata     Metadata extra opcional para el log de uso
 */
export async function chargeUserForAI(
    userId: string,
    model: string,
    reason: string,
    metadata?: Record<string, any>,
): Promise<AIChargeOk | AIChargeError> {
    try {
        // 1) Leer config del usuario y key global SIN transacción (lectura barata)
        const [userRow, ownConfig, globalSetting] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { preferOwnKey: true },
            }),
            (prisma as any).openAIConfig.findUnique({
                where: { userId },
                select: { apiKeyEnc: true, isValid: true },
            }),
            (prisma as any).appSetting.findUnique({
                where: { key: 'openai_global_key' },
                select: { value: true },
            }),
        ])

        if (!userRow) return { ok: false, error: 'INTERNAL' }

        // 2) Si el usuario prefiere su propia key y la tiene válida, usar la suya sin descontar
        if (userRow.preferOwnKey && ownConfig?.isValid && ownConfig.apiKeyEnc) {
            try {
                const ownKey = decrypt(ownConfig.apiKeyEnc, ENC_KEY)
                if (ownKey) return { ok: true, key: ownKey, source: 'own' }
            } catch {
                // Si falla decrypt, caemos al flujo de admin key
            }
        }

        // 3) Resolver key global del admin
        if (!globalSetting?.value) return { ok: false, error: 'NO_KEY' }
        let adminKey: string
        try {
            adminKey = decrypt(globalSetting.value, ENC_KEY)
        } catch {
            return { ok: false, error: 'NO_KEY' }
        }
        if (!adminKey) return { ok: false, error: 'NO_KEY' }

        // 4) Cobrar al balance USD del usuario en transacción con FOR UPDATE
        const cost = costForModel(model)

        const result = await prisma.$transaction(async (tx) => {
            // Lock row del usuario para evitar race conditions
            const locked = await tx.$queryRaw<Array<{ ai_balance_usd: string }>>`
                SELECT ai_balance_usd::text
                FROM users
                WHERE id = ${userId}::uuid
                FOR UPDATE
            `
            const currentBalance = parseFloat(locked[0]?.ai_balance_usd ?? '0')

            if (currentBalance < cost) {
                return { type: 'NO_CREDITS' as const, balance: currentBalance, required: cost }
            }

            // Descontar
            await tx.$executeRaw`
                UPDATE users
                SET ai_balance_usd = ai_balance_usd - ${cost}::numeric
                WHERE id = ${userId}::uuid
            `

            // Log del uso
            await (tx as any).aIUsageLog.create({
                data: {
                    userId,
                    model,
                    reason,
                    costUsd: cost,
                    metadata: metadata ?? undefined,
                },
            })

            return { type: 'OK' as const, remaining: currentBalance - cost, charged: cost }
        })

        if (result.type === 'NO_CREDITS') {
            return {
                ok: false,
                error: 'NO_CREDITS',
                balanceUsd: result.balance,
                requiredUsd: result.required,
            }
        }

        return {
            ok: true,
            key: adminKey,
            source: 'admin',
            remainingUsd: result.remaining,
            chargedUsd: result.charged,
        }
    } catch (e: any) {
        console.error('[ai-credits] chargeUserForAI error:', e?.message ?? e)
        return { ok: false, error: 'INTERNAL' }
    }
}

/**
 * Refund: devuelve el costo al balance USD si la llamada a OpenAI falló después de cobrar.
 * Llamar SOLO si chargeUserForAI devolvió source='admin' y la llamada externa falló.
 */
export async function refundUserForAI(
    userId: string,
    amountUsd: number,
    reason: string,
): Promise<void> {
    if (amountUsd <= 0) return
    try {
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`
                UPDATE users
                SET ai_balance_usd = ai_balance_usd + ${amountUsd}::numeric
                WHERE id = ${userId}::uuid
            `
            await (tx as any).aIUsageLog.create({
                data: {
                    userId,
                    model: 'refund',
                    reason: `refund:${reason}`,
                    costUsd: -amountUsd,
                },
            })
        })
    } catch (e: any) {
        console.error('[ai-credits] refundUserForAI error:', e?.message ?? e)
    }
}

/**
 * Lectura simple del balance USD del usuario (no toca nada).
 */
export async function getUserAIBalanceUsd(userId: string): Promise<number> {
    const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { aiBalanceUsd: true },
    })
    return u?.aiBalanceUsd ? Number(u.aiBalanceUsd) : 0
}
