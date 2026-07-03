export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveChallenge } from '@/lib/reto90d/challengeService'
import { listMembers } from '@/lib/reto90d/memberService'
import {
  generateDailyUserReport,
  generateAdminDailyReport,
  generateGroupReport,
} from '@/lib/reto90d/reportService'
import { sendToPhone, sendToAdmin, sendToGroup } from '@/lib/whatsapp/reto90dSender'

// Reporte final del día del Reto 90D (por defecto 23:50 America/La_Paz).
// Disparado por CRON externo (CRON_SECRET). Idempotente vía reto90d_reports:
// - 1 fila por miembro (sentToUser) para el reporte individual
// - 1 fila centinela (phone '__system__') para admin + grupo
// Se puede forzar con ?force=1 (ignora la ventana horaria).

const WINDOW_MIN = 7
const SENTINEL = '__system__'

function laPazParts(tz: string): { date: string; hhmm: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hhmm: `${parts.hour}:${parts.minute}` }
}
function minutesOf(hhmm: string): number {
  const [h, m] = String(hhmm).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const config = await prisma.whatsAppConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    })
    if (!config) return NextResponse.json({ skipped: 'sin config activa' })

    const tz = config.timezone || 'America/La_Paz'
    const { date, hhmm } = laPazParts(tz)

    const url = new URL(req.url)
    const force = url.searchParams.get('force') === '1'
    const diff = minutesOf(hhmm) - minutesOf(config.finalReportTime)
    const inWindow = diff >= 0 && diff <= WINDOW_MIN
    if (!force && !inWindow) return NextResponse.json({ skipped: 'fuera de ventana', hhmm })

    const challenge = await getActiveChallenge(tz)
    if (!challenge) return NextResponse.json({ skipped: 'sin reto activo' })

    // Fecha normalizada (mediodía UTC del día La Paz) para la clave única del reporte.
    const reportDate = new Date(`${date}T12:00:00.000Z`)
    const day = new Date()

    // ── 1) Reporte individual por miembro (idempotente por sentToUser) ──
    const members = await listMembers(challenge.id, { status: 'ACTIVE' })
    let usersSent = 0
    for (const m of members) {
      try {
        const existing = await prisma.dailyReport.findUnique({
          where: { challengeId_phone_reportDate: { challengeId: challenge.id, phone: m.phone, reportDate } },
        })
        if (existing?.sentToUser) continue

        const { text, stats } = await generateDailyUserReport(challenge.id, m.phone, day)
        const ok = await sendToPhone(m.phone, text)
        if (ok) usersSent++

        await prisma.dailyReport.upsert({
          where: { challengeId_phone_reportDate: { challengeId: challenge.id, phone: m.phone, reportDate } },
          create: {
            challengeId: challenge.id,
            userId: m.userId ?? null,
            fullName: m.fullName,
            phone: m.phone,
            reportDate,
            totalTasks: stats.total,
            completed: stats.completed,
            pending: stats.pending,
            rejected: 0,
            review: 0,
            points: stats.points,
            summary: text,
            sentToUser: ok,
          },
          update: {
            totalTasks: stats.total,
            completed: stats.completed,
            pending: stats.pending,
            points: stats.points,
            summary: text,
            sentToUser: ok || existing?.sentToUser || false,
          },
        })
      } catch (e) {
        console.error('[cron/reto90d/final-report] miembro falló', m.phone, e)
      }
    }

    // ── 2) Reporte admin + grupo (idempotente vía fila centinela) ──
    let adminSent = false
    let groupSent = false
    try {
      const sentinel = await prisma.dailyReport.findUnique({
        where: { challengeId_phone_reportDate: { challengeId: challenge.id, phone: SENTINEL, reportDate } },
      })
      const adminReport = await generateAdminDailyReport(challenge.id, day)

      if (!sentinel?.sentToAdmin) adminSent = await sendToAdmin(adminReport)
      if (config.sendGroupReports && !sentinel?.sentToGroup) {
        const groupReport = await generateGroupReport(challenge.id, day)
        groupSent = await sendToGroup(groupReport)
      }

      await prisma.dailyReport.upsert({
        where: { challengeId_phone_reportDate: { challengeId: challenge.id, phone: SENTINEL, reportDate } },
        create: {
          challengeId: challenge.id,
          phone: SENTINEL,
          reportDate,
          totalTasks: 0, completed: 0, pending: 0, rejected: 0, review: 0, points: 0,
          summary: adminReport,
          sentToAdmin: adminSent,
          sentToGroup: groupSent,
        },
        update: {
          summary: adminReport,
          sentToAdmin: adminSent || sentinel?.sentToAdmin || false,
          sentToGroup: groupSent || sentinel?.sentToGroup || false,
        },
      })
    } catch (e) {
      console.error('[cron/reto90d/final-report] reporte admin/grupo falló', e)
    }

    return NextResponse.json({ ok: true, date, usersSent, adminSent, groupSent })
  } catch (err: any) {
    console.error('[cron/reto90d/final-report]', err)
    return NextResponse.json({ error: err?.message ?? 'error' }, { status: 500 })
  }
}
