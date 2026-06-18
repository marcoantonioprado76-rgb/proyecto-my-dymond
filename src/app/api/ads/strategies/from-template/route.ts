export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AD_METHODS } from '@/lib/ads/andromeda-templates'

// Crea una AdStrategy del usuario a partir de un MÉTODO predeterminado (ej. Andromeda),
// combinando la estructura del método con el objetivo/destino que ya eligió el usuario.
// No siembra nada global ni toca el flujo de IA: es una fila por uso, igual que las de IA.

const OBJECTIVES = new Set(['conversions', 'leads', 'traffic', 'awareness', 'engagement'])
const DESTINATIONS = new Set(['whatsapp', 'website', 'instagram', 'messenger', 'feed'])
const MEDIA = new Set(['image', 'video'])

export async function POST(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    try {
        const body = await req.json()
        const briefId = body?.briefId
        const method = String(body?.method || 'andromeda')
        const platform = body?.platform === 'META' ? 'META' : 'META' // solo Meta por ahora
        let objective = body?.objective
        let destination = body?.destination
        let mediaType = body?.mediaType

        if (!briefId) return NextResponse.json({ error: 'briefId requerido' }, { status: 400 })

        const recipe = AD_METHODS[method]
        if (!recipe) return NextResponse.json({ error: 'Método no válido' }, { status: 400 })

        // El negocio debe ser del usuario
        const brief = await (prisma as any).businessBrief.findFirst({
            where: { id: briefId, userId: user.id },
            select: { id: true },
        })
        if (!brief) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

        // Defaults sensatos si no eligieron (Andromeda = ventas por WhatsApp por defecto)
        objective = OBJECTIVES.has(objective) ? objective : 'conversions'
        destination = DESTINATIONS.has(destination) ? destination : 'whatsapp'
        mediaType = MEDIA.has(mediaType) ? mediaType : 'image'

        const mediaCount = mediaType === 'video' ? recipe.videoCount : recipe.imageCount

        const strategy = await (prisma as any).adStrategy.create({
            data: {
                name: recipe.name,
                description: recipe.description,
                platform,
                objective,
                destination,
                mediaType,
                mediaCount,
                minBudgetUSD: recipe.minBudgetUSD,
                advantageType: recipe.advantageType,
                isGlobal: false,
                savedByUser: false,
                userId: user.id,
                sortOrder: 0,
                isActive: true,
            },
        })

        return NextResponse.json({ strategy }, { status: 201 })
    } catch (e: any) {
        console.error('[POST /api/ads/strategies/from-template]', e)
        return NextResponse.json({ error: 'No se pudo preparar la estrategia' }, { status: 500 })
    }
}
