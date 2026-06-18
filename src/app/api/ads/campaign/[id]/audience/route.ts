export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateAudienceProfile } from '@/lib/ads/openai-ads'
import { resolveOpenAIKey, chargeForChatUsage } from '@/lib/ai-credits'

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } })
    const model = oaiConfig?.model || 'gpt-4o'

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id },
        include: { brief: true },
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    if (!campaign.brief) return NextResponse.json({ error: 'Crea tu Business Brief primero' }, { status: 400 })

    const resolved = await resolveOpenAIKey(user.id)
    if (!resolved.ok) {
        if (resolved.error === 'NO_CREDITS') {
            return NextResponse.json({
                error: 'Sin saldo de IA. Comprá saldo o configurá tu propia API Key.',
                code: 'NO_CREDITS', balanceUsd: resolved.balanceUsd,
            }, { status: 402 })
        }
        return NextResponse.json({ error: 'No hay API Key disponible.', code: resolved.error }, { status: 400 })
    }

    try {
        let usage: { promptTokens: number; completionTokens: number } | null = null
        const b = campaign.brief
        const audience = await generateAudienceProfile({
            brief: {
                name: b.name, industry: b.industry, description: b.description,
                valueProposition: b.valueProposition, painPoints: b.painPoints, interests: b.interests,
                brandVoice: b.brandVoice, brandColors: b.brandColors, visualStyle: b.visualStyle,
                primaryObjective: b.primaryObjective, mainCTA: b.mainCTA, targetLocations: b.targetLocations,
                keyMessages: b.keyMessages, personalityTraits: b.personalityTraits, contentThemes: b.contentThemes,
                engagementLevel: b.engagementLevel || 'medio',
            },
            apiKey: resolved.key,
            model,
            onUsage: (u) => { usage = u },
        })

        if (resolved.source === 'admin' && usage) {
            const u = usage as { promptTokens: number; completionTokens: number }
            chargeForChatUsage(user.id, model, u.promptTokens, u.completionTokens, 'ads.audience', { campaignId: params.id })
                .catch(e => console.error('[Audience] charge error:', e))
        }

        return NextResponse.json({ audience })
    } catch (e: any) {
        console.error('[POST /api/ads/campaign/[id]/audience]', e)
        return NextResponse.json({ error: e?.message || 'No se pudo generar la audiencia' }, { status: 500 })
    }
}
