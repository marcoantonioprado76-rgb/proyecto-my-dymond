export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import {
  approveSubmission,
  rejectSubmission,
  markSubmissionForReview,
} from '@/lib/reto90d/submissionService'

const patchSchema = z.object({
  action: z.enum(['approve', 'reject', 'review']),
  reason: z.string().optional(),
})

// PATCH /api/admin/reto-90d/submissions/[id]
// Revisión manual de una entrega: aprobar, rechazar o marcar para revisión.
// El revisor queda registrado como admin.username (o admin.id si no hay).
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

  const { action, reason } = parsed.data
  const reviewedBy = admin.username ?? admin.id
  const opts = { reviewedBy, reason }

  const submission =
    action === 'approve'
      ? await approveSubmission(params.id, opts)
      : action === 'reject'
        ? await rejectSubmission(params.id, opts)
        : await markSubmissionForReview(params.id, opts)

  return NextResponse.json({ submission })
}
