export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'
import { AdapterFactory } from '@/lib/ads/factory'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY
if (!ENC_KEY) throw new Error('ADS_ENCRYPTION_KEY env var is not set')

export async function GET(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const daysParam = searchParams.get('days') || '7'
    const days = Math.min(Math.max(parseInt(daysParam) || 7, 1), 90)

    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)

    const campaigns = await (prisma as any).adCampaignV2.findMany({
        where: {
            userId: user.id,
            status: { in: ['PUBLISHED', 'PAUSED'] },
            providerCampaignId: { not: null },
            ...(campaignId ? { id: campaignId } : {})
        },
        include: {
            connectedAccount: {
                include: { integration: { include: { token: true } } }
            }
        }
    })

    if (campaigns.length === 0) {
        return NextResponse.json({ rows: [], totals: [], campaigns: [] })
    }

    const byAccount = new Map<string, any[]>()
    for (const c of campaigns) {
        if (!c.connectedAccount?.integration?.token) continue
        const key = c.connectedAccount.providerAccountId
        if (!byAccount.has(key)) byAccount.set(key, [])
        byAccount.get(key)!.push(c)
    }

    const allRows: any[] = []

    for (const [adAccountId, group] of byAccount) {
        const rep = group[0]
        try {
            const accessToken = decrypt(rep.connectedAccount.integration.token.accessTokenEncrypted, ENC_KEY!)
            const adapter = AdapterFactory.getAdapter(rep.platform)
            const rows = await adapter.fetchDailyMetrics(accessToken, adAccountId, from, to)

            const campaignIdSet = new Set(group.map((c: any) => c.providerCampaignId))
            const campaignMap: Record<string, any> = Object.fromEntries(group.map((c: any) => [c.providerCampaignId, c]))

            for (const row of rows) {
                if (!campaignIdSet.has(row.providerCampaignId)) continue
                const camp = campaignMap[row.providerCampaignId]
                allRows.push({
                    ...row,
                    date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
                    campaignId: camp?.id,
                    campaignName: camp?.name,
                    ctr: row.impressions > 0 ? +((row.clicks / row.impressions) * 100).toFixed(2) : 0,
                    cpc: row.clicks > 0 ? +(row.spend / row.clicks).toFixed(2) : 0,
                    cpa: row.conversions > 0 ? +(row.spend / row.conversions).toFixed(2) : 0,
                })
            }
        } catch (err: any) {
            console.error('[Metrics] Error for account', adAccountId, err.message)
        }
    }

    const totalsMap = new Map<string, any>()
    for (const row of allRows) {
        const key = row.campaignId
        if (!totalsMap.has(key)) {
            totalsMap.set(key, { campaignId: row.campaignId, campaignName: row.campaignName, spend: 0, impressions: 0, clicks: 0, conversions: 0 })
        }
        const t = totalsMap.get(key)!
        t.spend += row.spend
        t.impressions += row.impressions
        t.clicks += row.clicks
        t.conversions += row.conversions
    }

    const totals = Array.from(totalsMap.values()).map(t => ({
        ...t,
        spend: +t.spend.toFixed(2),
        ctr: t.impressions > 0 ? +((t.clicks / t.impressions) * 100).toFixed(2) : 0,
        cpc: t.clicks > 0 ? +(t.spend / t.clicks).toFixed(2) : 0,
        cpa: t.conversions > 0 ? +(t.spend / t.conversions).toFixed(2) : 0,
    }))

    // Only surface campaigns that actually had a valid token (others have no data)
    const campaignsWithToken = campaigns.filter((c: any) => c.connectedAccount?.integration?.token)
    return NextResponse.json({
        rows: allRows.sort((a, b) => (a.date > b.date ? -1 : 1)),
        totals,
        campaigns: campaignsWithToken.map((c: any) => ({ id: c.id, name: c.name, status: c.status }))
    })
}
