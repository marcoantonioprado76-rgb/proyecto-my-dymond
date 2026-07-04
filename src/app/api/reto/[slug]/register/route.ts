export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { enrollMember } from '@/lib/reto90d/memberService'

// PÚBLICO: auto-registro de un participante en el reto (link compartible).
const schema = z.object({
  fullName: z.string().min(2, 'Nombre muy corto').max(120),
  phone: z.string().min(6, 'Celular inválido').max(30),
  email: z.string().email('Correo inválido').max(160).optional().or(z.literal('')),
  country: z.string().max(80).optional().or(z.literal('')),
  city: z.string().max(80).optional().or(z.literal('')),
})

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const ch = await prisma.challenge.findUnique({
    where: { publicSlug: params.slug },
    select: { id: true, registrationOpen: true, isActive: true },
  })
  if (!ch) return NextResponse.json({ error: 'Reto no encontrado.' }, { status: 404 })
  if (!ch.registrationOpen || !ch.isActive) {
    return NextResponse.json({ error: 'El registro está cerrado por ahora.' }, { status: 403 })
  }

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Revisa los datos (nombre y celular son obligatorios).'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  const d = parsed.data
  try {
    await enrollMember(ch.id, {
      fullName: d.fullName.trim(),
      phone: d.phone.trim(),
      email: d.email?.trim() || null,
      country: d.country?.trim() || null,
      city: d.city?.trim() || null,
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[reto/register]', err)
    return NextResponse.json({ error: err?.message ?? 'No se pudo completar el registro.' }, { status: 500 })
  }
}
