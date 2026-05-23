export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateBusinessBrief } from '@/lib/ads/openai-ads'
import { chargeUserForAI, refundUserForAI } from '@/lib/ai-credits'

export async function POST(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        // Validar input ANTES de tocar saldo
        const { text } = await req.json()
        if (!text || text.trim().length < 20) {
            return NextResponse.json({ error: 'Describe tu negocio con al menos 20 caracteres' }, { status: 400 })
        }

        // Modelo preferido del usuario (si tiene OpenAIConfig); default gpt-4o
        const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } })
        const model = oaiConfig?.model || 'gpt-4o'

        // Resolver key + cobrar saldo si aplica (admin key). chargeUserForAI() prioriza
        // la key propia del usuario si preferOwnKey=true.
        const charge = await chargeUserForAI(user.id, model, 'ads.brief.generate')
        if (!charge.ok) {
            if (charge.error === 'NO_CREDITS') {
                return NextResponse.json({
                    error: 'Sin saldo de IA. Comprá saldo o configurá tu propia API Key.',
                    code: 'NO_CREDITS',
                    balanceUsd: charge.balanceUsd,
                    requiredUsd: charge.requiredUsd,
                }, { status: 402 })
            }
            return NextResponse.json({
                error: 'No hay API Key disponible. Configurá la tuya en Configuración → IA o pedile al admin que active la global.',
                code: charge.error,
            }, { status: 400 })
        }
        const apiKey = charge.key

        try {
            const brief = await generateBusinessBrief(text.trim(), apiKey, model)
            return NextResponse.json({ brief })
        } catch (e) {
            // Refund si falló la llamada externa después de cobrar
            if (charge.source === 'admin' && charge.chargedUsd) {
                await refundUserForAI(user.id, charge.chargedUsd, 'ads.brief.generate.failed')
            }
            throw e
        }
    } catch (err: any) {
        console.error('[GenerateBrief]', err)
        return NextResponse.json({ error: err.message || 'Error al generar el brief' }, { status: 500 })
    }
}
