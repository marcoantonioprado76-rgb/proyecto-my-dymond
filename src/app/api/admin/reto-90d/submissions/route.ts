export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { getDayRange } from '@/lib/reto90d/submissionService'

// GET /api/admin/reto-90d/submissions?challengeId=&status=&phone=&date=
// Lista entregas con filtros opcionales. El filtro `date` (YYYY-MM-DD) acota al
// día natural en America/La_Paz. Máximo 200 filas, de la más reciente a la más
// antigua.
export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(req.url)
  const challengeId = searchParams.get('challengeId')
  const status = searchParams.get('status')
  const phone = searchParams.get('phone')
  const date = searchParams.get('date')

  const where: Prisma.TaskSubmissionWhereInput = {}
  if (challengeId) where.challengeId = challengeId
  if (status) where.status = status
  if (phone) where.phone = phone
  if (date) {
    // Mediodía en La Paz (UTC-4) para caer siempre dentro del día pedido.
    const { start, end } = getDayRange(new Date(`${date}T12:00:00.000-04:00`))
    where.submittedAt = { gte: start, lt: end }
  }

  const submissions = await prisma.taskSubmission.findMany({
    where,
    include: { task: { select: { title: true } } },
    orderBy: { submittedAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ submissions })
}
