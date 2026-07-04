export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { enrollMember, normalizePhone } from '@/lib/reto90d/memberService'
import { sendWelcome } from '@/lib/reto90d/welcomeService'

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
    select: { id: true, name: true, registrationOpen: true, isActive: true },
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
  const fullName = d.fullName.trim()
  const phone = d.phone.trim()
  try {
    // ¿Ya existía? (para mandar bienvenida solo la primera vez)
    const existing = await prisma.challengeMember.findFirst({
      where: { challengeId: ch.id, phone: normalizePhone(phone) },
      select: { id: true },
    })

    await enrollMember(ch.id, {
      fullName,
      phone,
      email: d.email?.trim() || null,
      country: d.country?.trim() || null,
      city: d.city?.trim() || null,
    })

    // Bienvenida automática (best-effort, no bloquea la respuesta) solo si es nuevo.
    if (!existing) {
      void sendWelcome(ch.id, ch.name, phone, fullName).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[reto/register]', err)
    return NextResponse.json({ error: err?.message ?? 'No se pudo completar el registro.' }, { status: 500 })
  }
}
