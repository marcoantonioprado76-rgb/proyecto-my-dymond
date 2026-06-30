export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'
import { prisma } from '@/lib/prisma'

async function owns(id: string, organizationId: string): Promise<boolean> {
  const t = await (prisma as any).template.findUnique({ where: { id }, select: { organizationId: true } })
  return !!t && t.organizationId === organizationId
}

// PATCH → activar/desactivar o renombrar (no toca organizationId)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()
    if (!(await owns(params.id, auth.organizationId))) return unauthorizedOrg()
    const body = await req.json().catch(() => ({}))
    const data: Record<string, unknown> = {}
    if (typeof body.nombre === 'string' && body.nombre.trim()) data.nombre = body.nombre.trim()
    if (typeof body.categoria === 'string' && body.categoria.trim()) data.categoria = body.categoria.trim()
    if (typeof body.activo === 'boolean') data.activo = body.activo
    const flyer = await (prisma as any).template.update({ where: { id: params.id }, data })
    return NextResponse.json({ flyer })
  } catch (e) {
    console.error('[PATCH /api/empresa/content/flyers/[id]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE → borrar flyer de SU empresa
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()
    if (!(await owns(params.id, auth.organizationId))) return unauthorizedOrg()
    await (prisma as any).template.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[DELETE /api/empresa/content/flyers/[id]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
