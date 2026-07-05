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
import { getPendingTasksForUser, getDaySubmissions, getRangeStats } from './submissionService'
import { type ReminderKind } from './reminderService'
import {
  generateDailyUserReport,
  generateAdminDailyReport,
  generateGroupReport,
} from './reportService'
import { getOptedInPhones } from './conversationService'
import { generateReminder, generateProgressMessage, type TaskStatusLite } from '@/lib/ai/retoAssistant'
import {
  sendToPhone, sendToAdmin, sendToGroup, getRetoInstructions, getEffectiveOpenAIKey,
} from '@/lib/whatsapp/reto90dSender'

const WINDOW_MIN = 7
const SENTINEL = '__system__'

// Guard en memoria del proceso: evita reenviar el mismo recordatorio en la ventana.
const reminderGuard = new Set<string>()
const periodGuard = new Set<string>()

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

    const [allMembers, optedIn, tasks, instructions, openaiKey] = await Promise.all([
      listMembers(challenge.id, { status: 'ACTIVE' }),
      getOptedInPhones(challenge.id),
      getActiveTasksForToday(challenge.id),
      getRetoInstructions(),
      getEffectiveOpenAIKey(),
    ])
    // BAN-SAFE: solo a quienes ya le escribieron al bot.
    const members = allMembers.filter((m) => optedIn.has(m.phone))

    let sent = 0
    for (const m of members) {
      try {
        // Estado por tarea de ESTE miembro: qué entregó y qué le falta.
        const [pending, subs] = await Promise.all([
          getPendingTasksForUser(m.phone, challenge.id, new Date()),
          getDaySubmissions(m.phone, challenge.id, new Date()),
        ])
        const pendingIds = new Set(pending.map((t) => t.id))
        const points = subs.filter((s) => s.status === 'APPROVED').reduce((a, s) => a + (s.pointsEarned || 0), 0)
        const tasksStatus: TaskStatusLite[] = tasks.map((t) => ({
          title: t.title, done: !pendingIds.has(t.id), points: t.points, evidenceType: t.evidenceType,
        }))

        const text = await generateReminder({
          instructions: instructions ?? undefined,
          participantName: (m.fullName || '').trim().split(/\s+/)[0] || m.fullName,
          challengeName: challenge.name,
          kind,
          tasksStatus,
          points,
          openaiKey: openaiKey ?? undefined,
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

/** Acompañamiento SEMANAL (domingos) y MENSUAL (día 1) — resumen motivacional. */
export async function runPeriodicSummaries(): Promise<SchedulerResult> {
  try {
    const config = await prisma.whatsAppConfig.findFirst({ where: { isActive: true }, orderBy: { updatedAt: 'desc' } })
    if (!config) return { skipped: 'sin config activa' }
    const tz = config.timezone || 'America/La_Paz'
    const { date, hhmm } = laPazParts(tz)

    const diff = minutesOf(hhmm) - minutesOf(config.finalReportTime)
    if (!(diff >= 0 && diff <= WINDOW_MIN)) return { skipped: 'fuera de ventana' }

    const dow = new Date(`${date}T12:00:00Z`).getUTCDay() // 0 = domingo
    const dayOfMonth = parseInt(date.slice(8, 10), 10)

    let period: 'semana' | 'mes' | null = null
    let from: Date | null = null
    let periodDays = 7
    if (dayOfMonth === 1) { period = 'mes'; from = new Date(Date.now() - 30 * 86400000); periodDays = 30 }
    else if (dow === 0) { period = 'semana'; from = new Date(Date.now() - 7 * 86400000); periodDays = 7 }
    if (!period || !from) return { skipped: 'hoy no toca semana/mes' }

    const challenge = await getActiveChallenge(tz)
    if (!challenge) return { skipped: 'sin reto activo' }

    const guardKey = `${period}:${date}`
    if (periodGuard.has(guardKey)) return { skipped: 'ya enviado', period }

    const [allMembers, optedIn, instructions, openaiKey] = await Promise.all([
      listMembers(challenge.id, { status: 'ACTIVE' }),
      getOptedInPhones(challenge.id),
      getRetoInstructions(),
      getEffectiveOpenAIKey(),
    ])
    const members = allMembers.filter((m) => optedIn.has(m.phone)) // ban-safe
    const now = new Date()

    let sent = 0
    for (const m of members) {
      try {
        const stats = await getRangeStats(m.phone, challenge.id, from, now)
        const text = await generateProgressMessage({
          instructions: instructions ?? undefined,
          participantName: (m.fullName || '').trim().split(/\s+/)[0] || m.fullName,
          challengeName: challenge.name,
          period,
          approved: stats.approved,
          points: stats.points,
          activeDays: stats.activeDays,
          periodDays,
          openaiKey: openaiKey ?? undefined,
        })
        if (await sendToPhone(m.phone, text)) sent++
      } catch (e) {
        console.error('[reto90d/scheduler] resumen periódico falló', m.phone, e)
      }
    }

    periodGuard.add(guardKey)
    if (periodGuard.size > 200) periodGuard.clear()
    return { ok: true, period, date, members: members.length, sent }
  } catch (err) {
    console.error('[reto90d/scheduler] runPeriodicSummaries error:', err)
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
