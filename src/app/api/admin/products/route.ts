export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = 20
  const skip = (page - 1) * limit

  const where: any = {}
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } },
      { user: { fullName: { contains: q, mode: 'insensitive' } } },
      { user: { username: { contains: q, mode: 'insensitive' } } },
    ]
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, fullName: true } },
        bots: { include: { bot: { select: { id: true, name: true } } } },
      },
    }),
    prisma.product.count({ where }),
  ])

  return NextResponse.json({
    products: products.map(p => ({
      ...p,
      priceUnit: p.priceUnit ? Number(p.priceUnit) : null,
      pricePromo2: p.pricePromo2 ? Number(p.pricePromo2) : null,
      priceSuper6: p.priceSuper6 ? Number(p.priceSuper6) : null,
    })),
    total,
    totalPages: Math.ceil(total / limit),
    page,
  })
}
