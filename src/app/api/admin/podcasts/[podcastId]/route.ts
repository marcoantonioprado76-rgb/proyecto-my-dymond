export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { podcastId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user?.isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await req.json()
    const data: any = {}
    if (body.title !== undefined)       data.title       = body.title.trim()
    if (body.description !== undefined) data.description = body.description?.trim() || null
    if (body.coverUrl !== undefined)    data.coverUrl    = body.coverUrl?.trim() || null
    if (body.embedUrl !== undefined)    data.embedUrl    = body.embedUrl.trim()
    if (body.order !== undefined)       data.order       = Number(body.order)
    if (body.active !== undefined)      data.active      = Boolean(body.active)

    const podcast = await (prisma as any).podcast.update({
      where: { id: params.podcastId },
      data,
    })
    return NextResponse.json({ podcast })
  } catch (err) {
    console.error('[PATCH /api/admin/podcasts/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { podcastId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user?.isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    await (prisma as any).podcast.delete({ where: { id: params.podcastId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/admin/podcasts/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
