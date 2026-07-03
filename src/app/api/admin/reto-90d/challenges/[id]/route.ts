export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import {
  getChallenge,
  updateChallenge,
  setChallengeActive,
} from '@/lib/reto90d/challengeService'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const challenge = await getChallenge(params.id)
  if (!challenge) {
    return NextResponse.json({ error: 'Reto no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ challenge })
}

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

  const data = parsed.data
  const keys = Object.keys(data)

  // Toggle simple de activación → usa el servicio dedicado.
  if (keys.length === 1 && keys[0] === 'isActive' && typeof data.isActive === 'boolean') {
    const challenge = await setChallengeActive(params.id, data.isActive)
    return NextResponse.json({ challenge })
  }

  const challenge = await updateChallenge(params.id, {
    name: data.name,
    description: data.description,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
    isActive: data.isActive,
  })

  return NextResponse.json({ challenge })
}
