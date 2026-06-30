export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { reactivateUserAssetsAfterPlanRenewal } from '@/lib/plan-lifecycle'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const userId = params.id

  if ((admin as any).id === userId) {
    return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; is_admin: boolean }>>`
    SELECT id, is_admin FROM users WHERE id = ${userId}::uuid LIMIT 1
  `
  if (!rows[0]) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  if (rows[0].is_admin) return NextResponse.json({ error: 'No puedes eliminar a un administrador' }, { status: 400 })

  await prisma.$transaction(async (tx) => {
    // Nullify bot references in stores before deleting bots
    await tx.$executeRaw`UPDATE stores SET bot_id = NULL WHERE user_id = ${userId}::uuid`
    // Eliminar bots (cascada: BotSecret, Product, Conversation → Message, BotState)
    await tx.$executeRaw`DELETE FROM bots WHERE user_id = ${userId}::uuid`
    // Eliminar tokens de reset de contraseña
    await tx.$executeRaw`DELETE FROM password_reset_tokens WHERE user_id = ${userId}::uuid`
    // Eliminar solicitudes de compra y retiro
    await tx.$executeRaw`DELETE FROM pack_purchase_requests WHERE user_id = ${userId}::uuid`
    await tx.$executeRaw`DELETE FROM withdrawal_requests WHERE user_id = ${userId}::uuid`
    // Nullify relaciones opcionales
    await tx.$executeRaw`UPDATE ad_jobs SET user_id = NULL WHERE user_id = ${userId}::uuid`
    await tx.$executeRaw`UPDATE audit_logs SET user_id = NULL WHERE user_id = ${userId}::uuid`
    // Eliminar usuario (cascada: Store, LandingPage, AdIntegration, AdAsset, AdDraft, OpenAIConfig, BusinessBrief, AdCampaignV2)
    await tx.$executeRaw`DELETE FROM users WHERE id = ${userId}::uuid`
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await request.json()
  const { plan, isActive, isAdmin: makeAdmin, extraBots, extraStores, extraProducts, extraLandingPages, extraAdsPerMonth, accessExtras, addDays } = body

  // Use raw SQL to bypass stale Prisma client
  if (plan !== undefined) {
    if (plan === 'NONE') {
      // Quitar plan: desactivar y limpiar expiración
      await prisma.$executeRaw`
        UPDATE users
        SET plan = 'NONE'::"UserPlan",
            is_active = false,
            plan_expires_at = NULL
        WHERE id = ${params.id}::uuid
      `
    } else {
      // Asignar plan: activar + mínimo 30 días (respeta mayor fecha si ya tiene más)
      await prisma.$executeRaw`
        UPDATE users
        SET plan = ${plan}::"UserPlan",
            is_active = true,
            plan_expires_at = GREATEST(
              COALESCE(plan_expires_at, NOW()),
              NOW() + INTERVAL '30 days'
            )
        WHERE id = ${params.id}::uuid
      `
      // Reactivar stores/bots que el cron expirePlans haya pausado antes.
      await reactivateUserAssetsAfterPlanRenewal(params.id)
    }
  }
  if (isActive !== undefined) {
    await prisma.$executeRaw`
      UPDATE users SET is_active = ${isActive} WHERE id = ${params.id}::uuid
    `
  }
  if (makeAdmin !== undefined) {
    await prisma.$executeRaw`
      UPDATE users SET is_admin = ${makeAdmin} WHERE id = ${params.id}::uuid
    `
  }
  if (extraBots !== undefined) {
    const val = Math.max(0, parseInt(extraBots) || 0)
    await prisma.$executeRaw`
      UPDATE users SET extra_bots = ${val} WHERE id = ${params.id}::uuid
    `
  }
  if (extraStores !== undefined) {
    const val = Math.max(0, parseInt(extraStores) || 0)
    await prisma.$executeRaw`
      UPDATE users SET extra_stores = ${val} WHERE id = ${params.id}::uuid
    `
  }
  if (extraProducts !== undefined) {
    const val = Math.max(0, parseInt(extraProducts) || 0)
    await prisma.$executeRaw`
      UPDATE users SET extra_products = ${val} WHERE id = ${params.id}::uuid
    `
  }
  if (extraLandingPages !== undefined) {
    const val = Math.max(0, parseInt(extraLandingPages) || 0)
    await prisma.$executeRaw`
      UPDATE users SET extra_landing_pages = ${val} WHERE id = ${params.id}::uuid
    `
  }
  if (extraAdsPerMonth !== undefined) {
    const val = Math.max(0, parseInt(extraAdsPerMonth) || 0)
    await prisma.$executeRaw`
      UPDATE users SET extra_ads_per_month = ${val} WHERE id = ${params.id}::uuid
    `
  }
  // Acceso manual a Academy/Recursos/Shop (como Fase Global)
  if (accessExtras !== undefined) {
    await prisma.$executeRaw`
      UPDATE users SET access_extras = ${!!accessExtras} WHERE id = ${params.id}::uuid
    `
  }
  // Ampliar días de suscripción (suma sobre la fecha mayor entre la actual y NOW)
  if (addDays !== undefined) {
    const days = Math.max(1, Math.min(3650, parseInt(addDays) || 0))
    if (days > 0) {
      await prisma.$executeRaw`
        UPDATE users
        SET plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + make_interval(days => ${days}),
            is_active = true
        WHERE id = ${params.id}::uuid
      `
    }
  }

  // Return updated user via raw SQL
  const rows = await prisma.$queryRaw<Array<{
    id: string; username: string; full_name: string; plan: string; is_active: boolean; is_admin: boolean
    extra_bots: number; extra_stores: number; extra_products: number; extra_landing_pages: number; extra_ads_per_month: number
    access_extras: boolean; plan_expires_at: Date | null
  }>>`
    SELECT id, username, full_name, plan::text, is_active, is_admin,
           extra_bots, extra_stores, extra_products, extra_landing_pages, extra_ads_per_month,
           access_extras, plan_expires_at
    FROM users WHERE id = ${params.id}::uuid LIMIT 1
  `
  const row = rows[0]
  if (!row) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  return NextResponse.json({
    success: true,
    user: {
      id: row.id,
      username: row.username,
      fullName: row.full_name,
      plan: row.plan,
      isActive: row.is_active,
      isAdmin: row.is_admin,
      extraBots: row.extra_bots,
      extraStores: row.extra_stores,
      extraProducts: row.extra_products,
      extraLandingPages: row.extra_landing_pages,
      extraAdsPerMonth: row.extra_ads_per_month,
      accessExtras: row.access_extras,
      planExpiresAt: row.plan_expires_at,
    },
  })
}
