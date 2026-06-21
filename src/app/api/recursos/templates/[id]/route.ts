export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { zonasSchema } from '../route'

// GET /api/recursos/templates/[id]  → una plantilla completa (con zonas) para el editor
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const template = await (prisma as any).template.findUnique({ where: { id: params.id } })
  if (!template || !template.activo) {
    return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  }
  return NextResponse.json({ template })
}

const updateSchema = z.object({
  nombre: z.string().min(1).max(120).optional(),
  categoria: z.string().min(1).max(60).optional(),
  activo: z.boolean().optional(),
  zonas: zonasSchema.optional(),
  thumbUrl: z.string().url().optional(),
})

// PATCH /api/recursos/templates/[id]  → editar / activar-desactivar (SOLO ADMIN)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', detalles: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const template = await (prisma as any).template.update({
      where: { id: params.id },
      data: parsed.data,
    })
    return NextResponse.json({ template })
  } catch {
    return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  }
}

// DELETE /api/recursos/templates/[id]  → borrar (SOLO ADMIN)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    await (prisma as any).template.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  }
}
