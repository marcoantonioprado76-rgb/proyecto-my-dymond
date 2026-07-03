export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { updateDailyTask, deleteDailyTask } from '@/lib/reto90d/taskService'

const evidenceTypeSchema = z.enum(['IMAGE', 'TEXT', 'NUMBER', 'LINK', 'DOCUMENT'])

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  evidenceType: evidenceTypeSchema.optional(),
  expectedKeywords: z.array(z.string()).optional(),
  points: z.number().optional(),
  deadlineTime: z.string().min(1).optional(),
  autoApproveMin: z.number().optional(),
  requiresReview: z.boolean().optional(),
  validExamples: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
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

  const task = await updateDailyTask(params.id, parsed.data)
  return NextResponse.json({ task })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  await deleteDailyTask(params.id)
  return NextResponse.json({ ok: true })
}
