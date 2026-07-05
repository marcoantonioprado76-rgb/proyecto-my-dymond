// ─────────────────────────────────────────────────────────────────────────────
// Reto 90D — Scheduler compartido (recordatorios + reporte final)
// Lo usan TANTO el worker in-process (instrumentation.ts, cada 60s) COMO los
// endpoints /api/cron/reto-90d/* (respaldo manual). Auto-detectan la ventana
// horaria y son idempotentes, así que se pueden llamar muchas veces sin duplicar.
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from '@/lib/prisma'
import { getActiveChallenge } from './challengeService'
import { listMembers } from './memberService'
import { getActiveTasksForToday } from './taskService'
import { getPendingTasksForUser } from './submissionService'
import { buildReminderMessage, type ReminderKind } from './reminderService'
import {
  generateDailyUserReport,
  generateAdminDailyReport,
  generateGroupReport,
} from './reportService'
import { getOptedInPhones } from './conversationService'
import { sendToPhone, sendToAdmin, sendToGroup } from '@/lib/whatsapp/reto90dSender'

const WINDOW_MIN = 7
const SENTINEL = '__system__'

// Guard en memoria del proceso: evita reenviar el mismo recordatorio en la ventana.
const reminderGuard = new Set<string>()

export function laPazParts(tz: string): { date: string; hhmm: string } {
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

type SchedulerResult = Record<string, unknown>

/** Envía el recordatorio correspondiente a la hora actual (o el forzado por `kind`). */
export async function runReminders(opts?: { kind?: ReminderKind }): Promise<SchedulerResult> {
  try {
    const config = await prisma.whatsAppConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    })
    if (!config) return { skipped: 'sin config activa' }

    const tz = config.timezone || 'America/La_Paz'
    const { date, hhmm } = laPazParts(tz)

    const times: Record<ReminderKind, string> = {
      morning: config.morningReminderTime,
      midday: config.middayReminderTime,
      afternoon: config.afternoonReminderTime,
      night: config.nightReminderTime,
    }

    let kind: ReminderKind | null = opts?.kind && times[opts.kind] ? opts.kind : null
    if (!kind) {
      const nowM = minutesOf(hhmm)
      for (const k of Object.keys(times) as ReminderKind[]) {
        const diff = nowM - minutesOf(times[k])
        if (diff >= 0 && diff <= WINDOW_MIN) { kind = k; break }
      }
    }
    if (!kind) return { skipped: 'fuera de ventana', hhmm }

    const challenge = await getActiveChallenge(tz)
    if (!challenge) return { skipped: 'sin reto activo' }

    const guardKey = `${challenge.id}:${kind}:${date}`
    if (reminderGuard.has(guardKey)) return { skipped: 'ya enviado', kind }

    const [allMembers, optedIn] = await Promise.all([
      listMembers(challenge.id, { status: 'ACTIVE' }),
      getOptedInPhones(challenge.id),
    ])
    // BAN-SAFE: solo a quienes ya le escribieron al bot.
    const members = allMembers.filter((m) => optedIn.has(m.phone))
    const totalTasks = (await getActiveTasksForToday(challenge.id)).length

    let sent = 0
    for (const m of members) {
      try {
        const pendientes = (await getPendingTasksForUser(m.phone, challenge.id, new Date())).length
        const completadas = Math.max(0, totalTasks - pendientes)
        const text = buildReminderMessage(kind, {
          nombre: m.fullName, totalTareas: totalTasks, completadas, pendientes,
        })
        if (await sendToPhone(m.phone, text)) sent++
      } catch (e) {
        console.error('[reto90d/scheduler] recordatorio miembro falló', m.phone, e)
      }
    }

    reminderGuard.add(guardKey)
    if (reminderGuard.size > 500) reminderGuard.clear()

    return { ok: true, kind, date, members: members.length, sent }
  } catch (err) {
    console.error('[reto90d/scheduler] runReminders error:', err)
    return { error: err instanceof Error ? err.message : 'error' }
  }
}

/** Reporte final del día: por usuario + admin + grupo. Idempotente vía reto90d_reports. */
export async function runFinalReport(opts?: { force?: boolean }): Promise<SchedulerResult> {
  try {
    const config = await prisma.whatsAppConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    })
    if (!config) return { skipped: 'sin config activa' }

    const tz = config.timezone || 'America/La_Paz'
    const { date, hhmm } = laPazParts(tz)

    const diff = minutesOf(hhmm) - minutesOf(config.finalReportTime)
    const inWindow = diff >= 0 && diff <= WINDOW_MIN
    if (!opts?.force && !inWindow) return { skipped: 'fuera de ventana', hhmm }

    const challenge = await getActiveChallenge(tz)
    if (!challenge) return { skipped: 'sin reto activo' }

    const reportDate = new Date(`${date}T12:00:00.000Z`)
    const day = new Date()

    // ── 1) Reporte individual por miembro (idempotente por sentToUser) ──
    // BAN-SAFE: solo a quienes ya le escribieron al bot.
    const [allMembers, optedIn] = await Promise.all([
      listMembers(challenge.id, { status: 'ACTIVE' }),
      getOptedInPhones(challenge.id),
    ])
    const members = allMembers.filter((m) => optedIn.has(m.phone))
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
            challengeId: challenge.id, userId: m.userId ?? null, fullName: m.fullName, phone: m.phone,
            reportDate, totalTasks: stats.total, completed: stats.completed, pending: stats.pending,
            rejected: 0, review: 0, points: stats.points, summary: text, sentToUser: ok,
          },
          update: {
            totalTasks: stats.total, completed: stats.completed, pending: stats.pending,
            points: stats.points, summary: text, sentToUser: ok || existing?.sentToUser || false,
          },
        })
      } catch (e) {
        console.error('[reto90d/scheduler] reporte miembro falló', m.phone, e)
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
          challengeId: challenge.id, phone: SENTINEL, reportDate,
          totalTasks: 0, completed: 0, pending: 0, rejected: 0, review: 0, points: 0,
          summary: adminReport, sentToAdmin: adminSent, sentToGroup: groupSent,
        },
        update: {
          summary: adminReport,
          sentToAdmin: adminSent || sentinel?.sentToAdmin || false,
          sentToGroup: groupSent || sentinel?.sentToGroup || false,
        },
      })
    } catch (e) {
      console.error('[reto90d/scheduler] reporte admin/grupo falló', e)
    }

    return { ok: true, date, usersSent, adminSent, groupSent }
  } catch (err) {
    console.error('[reto90d/scheduler] runFinalReport error:', err)
    return { error: err instanceof Error ? err.message : 'error' }
  }
}
