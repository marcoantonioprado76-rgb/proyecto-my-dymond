export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { setMemberStatus, removeMember, updateMember, deleteMember } from '@/lib/reto90d/memberService'

const patchSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'REMOVED']).optional(),
  fullName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { status, ...profile } = parsed.data

  // Solo cambio de estado.
  if (status && Object.keys(profile).length === 0) {
    const member = status === 'REMOVED' ? await removeMember(params.id) : await setMemberStatus(params.id, status)
    return NextResponse.json({ member })
  }

  // Edición de datos (opcionalmente + estado).
  let member = await updateMember(params.id, profile)
  if (status) {
    member = status === 'REMOVED' ? await removeMember(params.id) : await setMemberStatus(params.id, status)
  }
  return NextResponse.json({ member })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  await deleteMember(params.id)
  return NextResponse.json({ ok: true })
}
