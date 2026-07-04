import { prisma } from '@/lib/prisma'

// ═══════════════════════════════════════════════════════════════════════════
// Reto 90D — Servicio de retos (Challenge). ADMIN-ONLY, sin UI.
// Lógica de servidor pura sobre el modelo `reto90d_challenges`.
// ═══════════════════════════════════════════════════════════════════════════

/** Zona horaria por defecto del módulo (para calcular "hoy"). */
export const DEFAULT_TIMEZONE = 'America/La_Paz'

export interface CreateChallengeInput {
  name: string
  description?: string | null
  startDate: Date
  endDate: Date
  isActive?: boolean
}

export type UpdateChallengeInput = Partial<CreateChallengeInput>

/**
 * Devuelve la fecha actual (medianoche del día en curso) en la zona horaria
 * indicada, como instante UTC. Usa Intl para resolver el día local sin
 * depender de la zona horaria del servidor.
 */
export function currentDateInTimeZone(timeZone: string = DEFAULT_TIMEZONE): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()) // "YYYY-MM-DD" en la zona horaria pedida
  return new Date(`${ymd}T00:00:00.000Z`)
}

/** Crea un nuevo reto. */
export async function createChallenge(data: CreateChallengeInput) {
  try {
    return await prisma.challenge.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive ?? undefined,
      },
    })
  } catch (err) {
    console.error('[reto90d/challengeService] createChallenge failed:', err)
    throw new Error('No se pudo crear el reto')
  }
}

/** Actualiza campos de un reto existente. */
export async function updateChallenge(id: string, data: UpdateChallengeInput) {
  try {
    return await prisma.challenge.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive,
      },
    })
  } catch (err) {
    console.error(`[reto90d/challengeService] updateChallenge failed (id=${id}):`, err)
    throw new Error('No se pudo actualizar el reto')
  }
}

/**
 * Reto activo: `isActive = true` cuya fecha actual (en la zona horaria por
 * defecto) esté entre startDate y endDate. Devuelve el más reciente o null.
 */
export async function getActiveChallenge(_timeZone: string = DEFAULT_TIMEZONE) {
  try {
    // Usamos el instante actual (now) — no la medianoche de la zona — para evitar
    // el desfase horario: un reto que empieza "hoy" queda activo apenas se crea,
    // sin importar si en La Paz aún es el día anterior respecto a UTC.
    const now = new Date()
    return await prisma.challenge.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    })
  } catch (err) {
    console.error('[reto90d/challengeService] getActiveChallenge failed:', err)
    throw new Error('No se pudo obtener el reto activo')
  }
}

/** Obtiene un reto por id (o null si no existe). */
export async function getChallenge(id: string) {
  try {
    return await prisma.challenge.findUnique({ where: { id } })
  } catch (err) {
    console.error(`[reto90d/challengeService] getChallenge failed (id=${id}):`, err)
    throw new Error('No se pudo obtener el reto')
  }
}

/** Lista todos los retos, del más reciente al más antiguo. */
export async function listChallenges() {
  try {
    return await prisma.challenge.findMany({
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    })
  } catch (err) {
    console.error('[reto90d/challengeService] listChallenges failed:', err)
    throw new Error('No se pudieron listar los retos')
  }
}

/** Activa o desactiva un reto. */
/** Elimina un reto y TODO lo suyo (tareas, miembros, evidencias, reportes) vía cascada. */
export async function deleteChallenge(id: string) {
  try {
    await prisma.challenge.delete({ where: { id } })
    return true
  } catch (err) {
    console.error(`[reto90d/challengeService] deleteChallenge failed (id=${id}):`, err)
    throw new Error('No se pudo eliminar el reto')
  }
}

export async function setChallengeActive(id: string, isActive: boolean) {
  try {
    return await prisma.challenge.update({
      where: { id },
      data: { isActive },
    })
  } catch (err) {
    console.error(`[reto90d/challengeService] setChallengeActive failed (id=${id}):`, err)
    throw new Error('No se pudo cambiar el estado del reto')
  }
}
