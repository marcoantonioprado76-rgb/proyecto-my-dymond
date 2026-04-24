export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdPlatform } from '@prisma/client'
import { getPlanLimits, PLAN_NAMES, type UserPlan } from '@/lib/plan-limits'

export async function POST(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
        briefId, strategyId, name,
        providerAccountId, providerAccountName,
        dailyBudgetUSD, locations,
        pageId, whatsappNumber, welcomeMessage, pixelId, destinationUrl
    } = body

    if (!briefId || !strategyId || !name) {
        return NextResponse.json({ error: 'briefId, strategyId y name son requeridos' }, { status: 400 })
    }

    // Plan limit check
    const userRecord = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true } })
    const plan = (userRecord?.plan ?? 'NONE') as UserPlan
    const limits = getPlanLimits(plan)

    if (!limits.ads) {
        return NextResponse.json({
            error: `La creación de anuncios no está incluida en tu ${PLAN_NAMES[plan]}. Actualiza al Pack Pro para acceder.`,
            limitReached: true,
            plan,
        }, { status: 403 })
    }

    // Límite mensual de anuncios por plan
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const adsThisMonth = await (prisma as any).adCampaignV2.count({
        where: { userId: user.id, createdAt: { gte: startOfMonth } }
    })
    if (adsThisMonth >= limits.adsPerMonth) {
        return NextResponse.json({
            error: `Alcanzaste el límite de ${limits.adsPerMonth} anuncios por mes de tu ${PLAN_NAMES[plan]}. Actualiza tu plan para crear más.`,
            limitReached: true,
            plan,
            adsThisMonth,
            adsPerMonth: limits.adsPerMonth,
        }, { status: 403 })
    }

    // Validate brief belongs to user
    const brief = await (prisma as any).businessBrief.findFirst({
        where: { id: briefId, userId: user.id }
    })
    if (!brief) return NextResponse.json({ error: 'Brief no encontrado' }, { status: 404 })

    // Get strategy
    const strategy = await (prisma as any).adStrategy.findUnique({ where: { id: strategyId } })
    if (!strategy) return NextResponse.json({ error: 'Estrategia no encontrada' }, { status: 404 })

    // Auto-upsert AdConnectedAccount from live providerAccountId
    let connectedAccountId: string | null = null
    if (providerAccountId) {
        const integration = await prisma.adIntegration.findUnique({
            where: { userId_platform: { userId: user.id, platform: strategy.platform as AdPlatform } }
        })
        if (integration) {
            const connectedAccount = await prisma.adConnectedAccount.upsert({
                where: { integrationId: integration.id },
                create: {
                    integrationId: integration.id,
                    providerAccountId: String(providerAccountId),
                    displayName: providerAccountName || String(providerAccountId)
                },
                update: {
                    providerAccountId: String(providerAccountId),
                    displayName: providerAccountName || String(providerAccountId)
                }
            })
            connectedAccountId = connectedAccount.id
        }
    }

    // Create campaign
    const campaign = await (prisma as any).adCampaignV2.create({
        data: {
            userId: user.id,
            briefId,
            strategyId,
            platform: strategy.platform as AdPlatform,
            name: name.trim(),
            status: 'DRAFT',
            dailyBudgetUSD: Math.max(0, parseFloat(dailyBudgetUSD) || 0),
            locations: locations || [],
            connectedAccountId,
            pageId: pageId || null,
            whatsappNumber: whatsappNumber || null,
            welcomeMessage: welcomeMessage || null,
            pixelId: pixelId || null,
            destinationUrl: destinationUrl || null
        },
        include: {
            brief: true,
            strategy: true
        }
    })

    return NextResponse.json({ campaign }, { status: 201 })
}

export async function GET() {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const campaigns = await (prisma as any).adCampaignV2.findMany({
        where: { userId: user.id },
        include: {
            brief: { select: { name: true, industry: true } },
            strategy: { select: { name: true, platform: true, destination: true, mediaType: true, mediaCount: true } },
            creatives: { select: { id: true, slotIndex: true, mediaUrl: true, isApproved: true } }
        },
        orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ campaigns })
}
