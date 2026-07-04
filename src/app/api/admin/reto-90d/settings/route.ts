export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'
import { invalidateRetoConfigCache } from '@/lib/whatsapp/reto90dSender'

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

  // Nunca devolvemos la key (ni cifrada): solo si existe una configurada.
  const hasOpenaiKey = !!config?.openaiApiKeyEnc
  const safeConfig = config ? { ...config, openaiApiKeyEnc: undefined } : null
  return NextResponse.json({ config: safeConfig, bots, hasOpenaiKey })
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
  botInstructions: z.string().nullable().optional(),
  // Key de OpenAI en claro desde el form: '' o null = borrar; undefined = no tocar.
  openaiApiKey: z.string().nullable().optional(),
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

  const { openaiApiKey, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }

  // Manejo de la key: undefined = no tocar; '' o null = borrar; texto = cifrar y guardar.
  if (openaiApiKey !== undefined) {
    const trimmed = (openaiApiKey ?? '').trim()
    data.openaiApiKeyEnc = trimmed ? encrypt(trimmed) : null
  }

  const existing = await prisma.whatsAppConfig.findFirst()
  const saved = existing
    ? await prisma.whatsAppConfig.update({ where: { id: existing.id }, data })
    : await prisma.whatsAppConfig.create({ data })

  invalidateRetoConfigCache()

  const hasOpenaiKey = !!saved.openaiApiKeyEnc
  return NextResponse.json({ config: { ...saved, openaiApiKeyEnc: undefined }, hasOpenaiKey })
}
