export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (user.plan === 'NONE') return NextResponse.json({ error: 'Necesitas un plan activo' }, { status: 403 })

    const podcasts = await (prisma as any).podcast.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ podcasts })
  } catch (err) {
    console.error('[GET /api/podcasts]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
