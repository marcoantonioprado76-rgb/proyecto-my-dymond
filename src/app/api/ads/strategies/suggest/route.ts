export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveOpenAIKey, chargeForChatUsage } from '@/lib/ai-credits'
import { generateStrategySuggestions } from '@/lib/ads/openai-ads'

export async function POST(req: NextRequest) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    try {
        const body = await req.json()
        const { briefId, platform, objective, destination, mediaType } = body
        if (!briefId) return NextResponse.json({ error: 'briefId requerido' }, { status: 400 })

        // Fetch brief
        const brief = await (prisma as any).businessBrief.findFirst({
            where: { id: briefId, userId: user.id }
        })
        if (!brief) return NextResponse.json({ error: 'Brief no encontrado' }, { status: 404 })

        // Modelo: si el usuario tiene una key propia configurada, respetamos su modelo elegido;
        // si no, usamos gpt-4o por defecto.
        const openaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } })
        const model = openaiConfig?.model || 'gpt-4o'

        // Resolver key (NO cobra todavía — el cobro va por tokens reales después)
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
                error: 'No hay API Key disponible para esta función. Configurá tu propia key o pedile al admin que active la global.',
                code: resolved.error,
            }, { status: 400 })
        }

        // Generate AI suggestions + capturar tokens consumidos
        let usage: { promptTokens: number; completionTokens: number } | null = null
        const suggestions = await generateStrategySuggestions(
            brief, resolved.key, model, platform, objective, destination, mediaType,
            (u) => { usage = u },
        )
        if (resolved.source === 'admin' && usage) {
            const u = usage as { promptTokens: number; completionTokens: number }
            chargeForChatUsage(user.id, model, u.promptTokens, u.completionTokens, 'ads.strategies.suggest', { briefId })
                .catch(e => console.error('[StrategySuggest] charge error:', e))
        }

        // Delete old AI suggestions that are NOT referenced by any campaign AND not saved by user
        const usedStrategyIds = (await (prisma as any).adCampaignV2.findMany({
            where: { userId: user.id },
            select: { strategyId: true }
        })).map((c: any) => c.strategyId).filter(Boolean)

        await (prisma as any).adStrategy.deleteMany({
            where: {
                userId: user.id,
                isGlobal: false,
                savedByUser: false,
                ...(usedStrategyIds.length > 0 ? { id: { notIn: usedStrategyIds } } : {})
            }
        })

        // Enforce platform + valid destinations — override any AI hallucination
        const validPlatforms = ['META', 'TIKTOK', 'GOOGLE_ADS']
        const validDestinations: Record<string, string[]> = {
            META: ['whatsapp', 'instagram', 'website', 'messenger'],
            TIKTOK: ['tiktok', 'website'],
            GOOGLE_ADS: ['website'],
        }
        // Valid objectives per platform
        const validObjectives: Record<string, string[]> = {
            META: ['conversions', 'leads', 'traffic', 'awareness', 'engagement'],
            TIKTOK: ['conversions', 'leads', 'traffic', 'awareness', 'engagement'],
            GOOGLE_ADS: ['conversions', 'leads', 'traffic', 'awareness'],
        }
        // For META: engagement is only valid with messaging destinations
        const filteredSuggestions = platform && validPlatforms.includes(platform)
            ? suggestions
                .filter(s => !validObjectives[platform] || validObjectives[platform].includes(s.objective))
                .map(s => {
                    const allowedDests = validDestinations[platform]
                    let destination = allowedDests.includes(s.destination) ? s.destination : allowedDests[0]
                    // META: engagement requires messaging destination
                    if (platform === 'META' && s.objective === 'engagement' && !['whatsapp', 'messenger', 'instagram'].includes(destination)) {
                        destination = 'whatsapp'
                    }
                    // META: non-engagement objectives with messaging destination stay (adapter handles it as OUTCOME_ENGAGEMENT)
                    return { ...s, platform: platform as 'META' | 'TIKTOK' | 'GOOGLE_ADS', destination }
                })
            : suggestions

        // Save each suggestion to DB (so they have IDs for the existing campaign flow)
        const saved = []
        for (let i = 0; i < filteredSuggestions.length; i++) {
            const s = filteredSuggestions[i]
            const created = await (prisma as any).adStrategy.create({
                data: {
                    name: s.name,
                    // Encode reason inside description with separator — parsed on frontend
                    description: `${s.description}||REASON:${s.reason}`,
                    platform: s.platform,
                    objective: s.objective,
                    destination: s.destination,
                    mediaType: s.mediaType,
                    mediaCount: s.mediaCount,
                    minBudgetUSD: s.minBudgetUSD,
                    advantageType: s.advantageType,
                    isGlobal: false,
                    userId: user.id,
                    sortOrder: i,
                    isActive: true,
                }
            })
            saved.push({ ...created, description: s.description, reason: s.reason })
        }

        return NextResponse.json({ strategies: saved })
    } catch (err: any) {
        console.error('[StrategySuggest]', err)
        const message = err?.message || 'Error al generar estrategias con IA'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
