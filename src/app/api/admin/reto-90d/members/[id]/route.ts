export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { setMemberStatus, removeMember } from '@/lib/reto90d/memberService'

const patchSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'REMOVED']),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { status } = parsed.data
  const member =
    status === 'REMOVED'
      ? await removeMember(params.id)
      : await setMemberStatus(params.id, status)

  return NextResponse.json({ member })
}
