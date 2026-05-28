export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateFieldSuggestions } from '@/lib/ads/openai-ads'
import { resolveOpenAIKey, chargeForChatUsage } from '@/lib/ai-credits'

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } })
    const model = oaiConfig?.model || 'gpt-4o'

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id },
        include: { brief: true, strategy: true }
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const body = await req.json()
    const { field, slotIndex = 0, currentContent = '' } = body

    if (!['primaryText', 'headline', 'description'].includes(field)) {
        return NextResponse.json({ error: 'Campo inválido' }, { status: 400 })
    }

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
        const suggestions = await generateFieldSuggestions({
            brief: {
                name: campaign.brief.name,
                industry: campaign.brief.industry,
                description: campaign.brief.description,
                valueProposition: campaign.brief.valueProposition,
                painPoints: campaign.brief.painPoints,
                interests: campaign.brief.interests,
                brandVoice: campaign.brief.brandVoice,
                brandColors: campaign.brief.brandColors,
                visualStyle: campaign.brief.visualStyle,
                primaryObjective: campaign.brief.primaryObjective,
                mainCTA: campaign.brief.mainCTA,
                targetLocations: campaign.brief.targetLocations,
                keyMessages: campaign.brief.keyMessages,
                personalityTraits: campaign.brief.personalityTraits,
                contentThemes: campaign.brief.contentThemes,
                engagementLevel: campaign.brief.engagementLevel || 'medio'
            },
            field,
            slotIndex,
            platform: campaign.strategy.platform,
            destination: campaign.strategy.destination,
            currentContent,
            apiKey: resolved.key,
            model,
            onUsage: (u) => { usage = u },
        })
        if (resolved.source === 'admin' && usage) {
            const u = usage as { promptTokens: number; completionTokens: number }
            chargeForChatUsage(user.id, model, u.promptTokens, u.completionTokens, 'ads.field.suggest', { campaignId: params.id, field })
                .catch(e => console.error('[SuggestField] charge error:', e))
        }

        return NextResponse.json({ suggestions })
    } catch (err: any) {
        console.error('[SuggestField]', err)
        return NextResponse.json({ error: err.message || 'Error al generar sugerencias' }, { status: 500 })
    }
}
