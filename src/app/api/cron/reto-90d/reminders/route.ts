export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveChallenge } from '@/lib/reto90d/challengeService'
import { listMembers } from '@/lib/reto90d/memberService'
import { getActiveTasksForToday } from '@/lib/reto90d/taskService'
import { getPendingTasksForUser } from '@/lib/reto90d/submissionService'
import { buildReminderMessage, type ReminderKind } from '@/lib/reto90d/reminderService'
import { sendToPhone } from '@/lib/whatsapp/reto90dSender'

// Recordatorios diarios del Reto 90D (mañana / mediodía / tarde / noche).
// Disparado por CRON externo (CRON_SECRET). Se puede llamar cada pocos minutos:
// auto-detecta qué recordatorio corresponde a la hora actual (ventana ±7 min) o
// se puede forzar con ?kind=morning|midday|afternoon|night.

// Guard en memoria del proceso: evita reenviar el mismo recordatorio en la ventana.
const sentGuard = new Set<string>()
const WINDOW_MIN = 7

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

    const times: Record<ReminderKind, string> = {
      morning: config.morningReminderTime,
      midday: config.middayReminderTime,
      afternoon: config.afternoonReminderTime,
      night: config.nightReminderTime,
    }

    const url = new URL(req.url)
    const explicit = url.searchParams.get('kind') as ReminderKind | null
    let kind: ReminderKind | null = explicit && times[explicit] ? explicit : null
    if (!kind) {
      const nowM = minutesOf(hhmm)
      for (const k of Object.keys(times) as ReminderKind[]) {
        const diff = nowM - minutesOf(times[k])
        if (diff >= 0 && diff <= WINDOW_MIN) { kind = k; break }
      }
    }
    if (!kind) return NextResponse.json({ skipped: 'fuera de ventana', hhmm })

    const challenge = await getActiveChallenge(tz)
    if (!challenge) return NextResponse.json({ skipped: 'sin reto activo' })

    const guardKey = `${challenge.id}:${kind}:${date}`
    if (sentGuard.has(guardKey)) return NextResponse.json({ skipped: 'ya enviado', kind })

    const members = await listMembers(challenge.id, { status: 'ACTIVE' })
    const totalTasks = (await getActiveTasksForToday(challenge.id)).length

    let sent = 0
    for (const m of members) {
      try {
        const pending = await getPendingTasksForUser(m.phone, challenge.id, new Date())
        const pendientes = pending.length
        const completadas = Math.max(0, totalTasks - pendientes)
        const text = buildReminderMessage(kind, {
          nombre: m.fullName,
          totalTareas: totalTasks,
          completadas,
          pendientes,
        })
        if (await sendToPhone(m.phone, text)) sent++
      } catch (e) {
        console.error('[cron/reto90d/reminders] miembro falló', m.phone, e)
      }
    }

    sentGuard.add(guardKey)
    if (sentGuard.size > 500) sentGuard.clear()

    return NextResponse.json({ ok: true, kind, date, members: members.length, sent })
  } catch (err: any) {
    console.error('[cron/reto90d/reminders]', err)
    return NextResponse.json({ error: err?.message ?? 'error' }, { status: 500 })
  }
}
