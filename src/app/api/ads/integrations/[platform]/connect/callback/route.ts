export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { AdPlatform } from '@prisma/client'
import { AdapterFactory } from '@/lib/ads/factory'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/ads/encryption'

const ENCRYPTION_KEY = process.env.ADS_ENCRYPTION_KEY || ''

export async function GET(
    req: Request,
    { params }: { params: { platform: string } }
) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const stateFromUrl = searchParams.get('state')

    if (!code) return NextResponse.json({ error: 'No code provided' }, { status: 400 })

    const cookieHeader = req.headers.get('cookie') || ''
    const stateFromCookie = cookieHeader.match(/ads_oauth_state=([^;]+)/)?.[1]
    // platform-aware redirect base (cada plataforma vuelve a SU dashboard)
    const platformSlug = params.platform.toLowerCase()
    const dashboardPath = `/dashboard/services/ads/${platformSlug}`

    if (stateFromUrl !== stateFromCookie) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${new URL(req.url).host}`
        return NextResponse.redirect(new URL(`${dashboardPath}?error=state_mismatch`, appUrl))
    }

    const platform = params.platform.toUpperCase() as AdPlatform
    try {
        const adapter = AdapterFactory.getAdapter(platform)
        const tokens = await adapter.exchangeCodeForToken(code)

        // Store Integration
        const integration = await prisma.adIntegration.upsert({
            where: { userId_platform: { userId: user.id, platform } },
            create: {
                userId: user.id,
                platform,
                status: 'CONNECTED',
                scopes: tokens.scopes || []
            },
            update: {
                status: 'CONNECTED',
                scopes: tokens.scopes || []
            }
        })

        // Store Tokens
        await prisma.adOAuthToken.upsert({
            where: { integrationId: integration.id },
            create: {
                integrationId: integration.id,
                accessTokenEncrypted: encrypt(tokens.accessToken, ENCRYPTION_KEY),
                refreshTokenEncrypted: tokens.refreshToken ? encrypt(tokens.refreshToken, ENCRYPTION_KEY) : null,
                expiresAt: tokens.expiresAt,
                tokenType: tokens.tokenType
            },
            update: {
                accessTokenEncrypted: encrypt(tokens.accessToken, ENCRYPTION_KEY),
                refreshTokenEncrypted: tokens.refreshToken ? encrypt(tokens.refreshToken, ENCRYPTION_KEY) : null,
                expiresAt: tokens.expiresAt,
                tokenType: tokens.tokenType
            }
        })

        // Redirect to platform-specific dashboard with success
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${new URL(req.url).host}`
        return NextResponse.redirect(new URL(`${dashboardPath}?connected=` + platform, appUrl))
    } catch (error: any) {
        console.error('[Ads] OAuth Callback Fatal Error:', error)
        const appUrlEarly = process.env.NEXT_PUBLIC_APP_URL || `https://${new URL(req.url).host}`
        const msg = String(error?.message || '')

        // El callback puede dispararse 2 veces (prefetch/recarga/retry del navegador).
        // El 2do canje del mismo `code` falla con "This authorization code has been used".
        // Si la integración YA quedó conectada (el 1er canje funcionó), es éxito, no error.
        if (/has been used|already been used|authorization code/i.test(msg)) {
            const existing = await prisma.adIntegration.findUnique({
                where: { userId_platform: { userId: user.id, platform } },
                select: { status: true },
            }).catch(() => null)
            if (existing?.status === 'CONNECTED') {
                return NextResponse.redirect(new URL(`${dashboardPath}?connected=` + platform, appUrlEarly))
            }
            // No alcanzó a conectar → pedir reintentar con un código nuevo
            return NextResponse.redirect(new URL(`${dashboardPath}?error=` + encodeURIComponent('La sesión de conexión expiró. Tocá "Conectar" de nuevo.'), appUrlEarly))
        }

        // If it's a Meta configuration issue, log specifically
        if (error.message.includes('configuration')) {
            console.error('[Ads] Meta Config Check:', {
                appId: !!process.env.META_APP_ID,
                appSecret: !!process.env.META_APP_SECRET,
                redirectUri: !!process.env.META_REDIRECT_URI,
                encryptionKey: !!process.env.ADS_ENCRYPTION_KEY
            })
        }
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${new URL(req.url).host}`
        return NextResponse.redirect(new URL(`${dashboardPath}?error=` + encodeURIComponent(error.message), appUrl))
    }
}
