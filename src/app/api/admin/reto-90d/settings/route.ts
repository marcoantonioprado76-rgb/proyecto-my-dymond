export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/reto-90d/settings
// Configuración de WhatsApp del reto + bots disponibles para asignar.
export async function GET(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const [config, bots] = await Promise.all([
    prisma.whatsAppConfig.findFirst(),
    prisma.bot.findMany({
      select: { id: true, name: true, baileysPhone: true, status: true, type: true },
    }),
  ])

  return NextResponse.json({ config, bots })
}

const patchSchema = z.object({
  challengeId: z.string().nullable().optional(),
  botId: z.string().nullable().optional(),
  adminPhone: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sendGroupReports: z.boolean().optional(),
  morningReminderTime: z.string().optional(),
  middayReminderTime: z.string().optional(),
  afternoonReminderTime: z.string().optional(),
  nightReminderTime: z.string().optional(),
  finalReportTime: z.string().optional(),
  timezone: z.string().optional(),
})

// PATCH /api/admin/reto-90d/settings
// Upsert de la configuración de WhatsApp: si ya existe una fila la actualiza,
// si no la crea. Solo hay una configuración global del reto.
export async function PATCH(req: NextRequest) {
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
  const existing = await prisma.whatsAppConfig.findFirst()

  const config = existing
    ? await prisma.whatsAppConfig.update({ where: { id: existing.id }, data })
    : await prisma.whatsAppConfig.create({ data })

  return NextResponse.json({ config })
}
