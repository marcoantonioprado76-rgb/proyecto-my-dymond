export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'

// ── Esquema de "zonas" (hueco de foto + cajas de texto editables) ──────────────
const photoZoneSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
})

const textZoneSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  text: z.string().default(''),
  fontSize: z.number().positive().default(48),
  fontFamily: z.string().default('Archivo'),
  fill: z.string().default('#ffffff'),
  align: z.enum(['left', 'center', 'right']).default('left'),
  fontWeight: z.union([z.string(), z.number()]).default('700'),
})

export const zonasSchema = z.object({
  photo: photoZoneSchema.nullable().optional(),
  texts: z.array(textZoneSchema).default([]),
})

const createSchema = z.object({
  nombre: z.string().min(1).max(120),
  categoria: z.string().min(1).max(60),
  ancho: z.number().int().positive().max(10000),
  alto: z.number().int().positive().max(10000),
  fondoUrl: z.string().url(),
  thumbUrl: z.string().url().optional(),
  zonas: zonasSchema,
})

// GET /api/recursos/templates           → plantillas ACTIVAS (cualquier usuario)
// GET /api/recursos/templates?todos=1    → TODAS (activas + inactivas), SOLO ADMIN
export async function GET(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const categoria = searchParams.get('categoria') || undefined
  const todos = searchParams.get('todos') === '1'

  // El listado "todos" (incluye inactivas) es solo para el panel admin.
  const verTodas = todos && (user as any).isAdmin === true

  const templates = await (prisma as any).template.findMany({
    where: { ...(verTodas ? {} : { activo: true }), ...(categoria ? { categoria } : {}) },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, nombre: true, categoria: true,
      ancho: true, alto: true, thumbUrl: true, fondoUrl: true,
      ...(verTodas ? { activo: true, createdAt: true } : {}),
    },
  })

  return NextResponse.json({ templates, isAdmin: (user as any).isAdmin === true })
}

// POST /api/recursos/templates  → crear plantilla (SOLO ADMIN)
export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', detalles: parsed.error.flatten() }, { status: 400 })
  }
  const d = parsed.data

  const template = await (prisma as any).template.create({
    data: {
      nombre: d.nombre,
      categoria: d.categoria,
      ancho: d.ancho,
      alto: d.alto,
      fondoUrl: d.fondoUrl,
      thumbUrl: d.thumbUrl ?? null,
      zonas: d.zonas,
      activo: true,
      creadoPor: admin.id,
    },
  })

  return NextResponse.json({ template }, { status: 201 })
}
