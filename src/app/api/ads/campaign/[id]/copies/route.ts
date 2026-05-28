export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateAdCopies } from '@/lib/ads/openai-ads'
import { resolveOpenAIKey, chargeForChatUsage } from '@/lib/ai-credits'

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } })
    const model = oaiConfig?.model || 'gpt-4o'

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id },
        include: {
            brief: true,
            strategy: true
        }
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    // Resolver key (NO cobra todavía — cobro por tokens reales después)
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
        const copies = await generateAdCopies({
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
            strategyName: campaign.strategy.name,
            platform: campaign.strategy.platform,
            objective: campaign.strategy.objective,
            destination: campaign.strategy.destination,
            mediaType: campaign.strategy.mediaType,
            count: campaign.strategy.mediaCount,
            apiKey: resolved.key,
            model: oaiConfig?.model || model,
            onUsage: (u) => { usage = u },
        })
        if (resolved.source === 'admin' && usage) {
            const u = usage as { promptTokens: number; completionTokens: number }
            chargeForChatUsage(user.id, model, u.promptTokens, u.completionTokens, 'ads.copies', { campaignId: params.id })
                .catch(e => console.error('[GenerateCopies] charge error:', e))
        }

        // Upsert by slotIndex: update existing records (preserving uploaded mediaUrl/mediaType)
        // or create new ones if slot doesn't exist yet. This avoids duplicate records.
        const existing = await (prisma as any).adCreative.findMany({
            where: { campaignId: params.id },
            orderBy: { slotIndex: 'asc' }
        })
        const existingBySlot = new Map<number, any>(existing.map((c: any) => [c.slotIndex, c]))

        await Promise.all(copies.map(async (c: any) => {
            // Auto-append hashtags at the end of primaryText so they appear inline
            const hashtags = (c.hashtags || '').trim()
            const baseText = (c.primaryText || '').trim()
            const primaryText = baseText && hashtags
                ? `${baseText}\n\n${hashtags}`
                : baseText || hashtags || ''

            const existingCreative = existingBySlot.get(c.slotIndex)
            if (existingCreative) {
                return (prisma as any).adCreative.update({
                    where: { id: existingCreative.id },
                    data: {
                        primaryText,
                        headline: c.headline || '',
                        description: c.description || '',
                        hook: c.hook || '',
                        hashtags: null,
                        aiGenerated: true,
                        updatedAt: new Date()
                        // mediaUrl and mediaType are NOT touched — uploaded images preserved
                    }
                })
            } else {
                return (prisma as any).adCreative.create({
                    data: {
                        campaignId: params.id,
                        slotIndex: c.slotIndex,
                        primaryText,
                        headline: c.headline || '',
                        description: c.description || '',
                        hook: c.hook || '',
                        hashtags: null,
                        aiGenerated: true,
                        isApproved: false
                    }
                })
            }
        }))

        // Remove stale creatives at slotIndices no longer in the new copies list
        const newSlotIndices = new Set(copies.map((c: any) => c.slotIndex))
        const staleIds = existing
            .filter((c: any) => !newSlotIndices.has(c.slotIndex))
            .map((c: any) => c.id)
        if (staleIds.length > 0) {
            await (prisma as any).adCreative.deleteMany({ where: { id: { in: staleIds } } })
        }

        // Fetch final state
        const saved = await (prisma as any).adCreative.findMany({
            where: { campaignId: params.id },
            orderBy: { slotIndex: 'asc' }
        })

        // Update campaign status to READY if it was DRAFT
        if (campaign.status === 'DRAFT') {
            await (prisma as any).adCampaignV2.update({
                where: { id: params.id },
                data: { status: 'READY' }
            })
        }

        return NextResponse.json({ creatives: saved, count: saved.length })
    } catch (err: any) {
        // Sin pre-cobro, no hay refund que hacer.
        console.error('[GenerateCopies]', err)
        return NextResponse.json({ error: err.message || 'Error al generar copies' }, { status: 500 })
    }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id }
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const creatives = await (prisma as any).adCreative.findMany({
        where: { campaignId: params.id },
        orderBy: { slotIndex: 'asc' }
    })

    return NextResponse.json({ creatives })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { creatives } = await req.json()
    if (!Array.isArray(creatives)) return NextResponse.json({ error: 'creatives array required' }, { status: 400 })

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id }
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    // Update each creative
    const updates = await Promise.all(
        creatives.map((c: any) =>
            (prisma as any).adCreative.update({
                where: { id: c.id },
                data: {
                    primaryText: c.primaryText,
                    headline: c.headline,
                    description: c.description,
                    hook: c.hook,
                    hashtags: c.hashtags ?? null,
                    mediaUrl: c.mediaUrl,
                    mediaType: c.mediaType,
                    isApproved: c.isApproved ?? false,
                    updatedAt: new Date()
                }
            })
        )
    )

    return NextResponse.json({ creatives: updates })
}
