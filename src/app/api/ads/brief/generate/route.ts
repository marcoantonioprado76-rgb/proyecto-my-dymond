export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateBusinessBrief } from '@/lib/ads/openai-ads'
import { resolveOpenAIKey, chargeForChatUsage } from '@/lib/ai-credits'

export async function POST(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { text } = await req.json()
        if (!text || text.trim().length < 20) {
            return NextResponse.json({ error: 'Describe tu negocio con al menos 20 caracteres' }, { status: 400 })
        }

        const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } })
        const model = oaiConfig?.model || 'gpt-4o'

        // Resolver key (NO cobra todavía — el cobro va por tokens reales después).
        const resolved = await resolveOpenAIKey(user.id)
        if (!resolved.ok) {
            if (resolved.error === 'NO_CREDITS') {
                return NextResponse.json({
                    error: 'Sin saldo de IA. Comprá saldo o configurá tu propia API Key.',
                    code: 'NO_CREDITS',
                    balanceUsd: resolved.balanceUsd,
                }, { status: 402 })
            }
            return NextResponse.json({
                error: 'No hay API Key disponible. Configurá la tuya en Configuración → IA o pedile al admin que active la global.',
                code: resolved.error,
            }, { status: 400 })
        }

        let usage: { promptTokens: number; completionTokens: number } | null = null
        const brief = await generateBusinessBrief(text.trim(), resolved.key, model, (u) => { usage = u })
        if (resolved.source === 'admin' && usage) {
            const u = usage as { promptTokens: number; completionTokens: number }
            chargeForChatUsage(user.id, model, u.promptTokens, u.completionTokens, 'ads.brief.generate')
                .catch(e => console.error('[BriefGenerate] charge error:', e))
        }
        return NextResponse.json({ brief })
    } catch (err: any) {
        console.error('[GenerateBrief]', err)
        return NextResponse.json({ error: err.message || 'Error al generar el brief' }, { status: 500 })
    }
}
