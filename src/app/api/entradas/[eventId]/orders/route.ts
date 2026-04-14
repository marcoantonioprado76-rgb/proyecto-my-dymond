export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyBscTransaction } from '@/lib/blockchain'
import { sendTicketEmail } from '@/lib/email'

function generateTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `TKT-${seg()}-${seg()}`
}

/** POST /api/entradas/[eventId]/orders — public ticket purchase (no login required) */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.eventId, active: true },
    })
    if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

    const body = await req.json()
    const { customerName, customerEmail, customerPhone, quantity, paymentMethod, proofUrl, txHash } = body

    if (!customerName?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    if (!customerEmail?.trim() || !customerEmail.includes('@')) return NextResponse.json({ error: 'Email válido requerido' }, { status: 400 })
    if (!customerPhone?.trim()) return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 })

    const qty = Math.max(1, parseInt(quantity) || 1)
    const pm: 'CRYPTO' | 'MANUAL' = paymentMethod === 'CRYPTO' ? 'CRYPTO' : 'MANUAL'

    if (pm === 'CRYPTO' && !txHash?.trim()) return NextResponse.json({ error: 'Hash de transacción requerido' }, { status: 400 })
    if (pm === 'MANUAL' && !proofUrl?.trim()) return NextResponse.json({ error: 'Comprobante de pago requerido' }, { status: 400 })

    // Verify txHash not already used (before expensive on-chain call)
    if (pm === 'CRYPTO') {
      const used = await prisma.ticketOrder.findFirst({ where: { txHash: txHash.trim() } })
      if (used) return NextResponse.json({ error: 'Esta transacción ya fue usada' }, { status: 409 })
    }

    const totalPrice = Number(event.price) * qty

    // On-chain verification for CRYPTO
    let finalStatus: 'PENDING' | 'APPROVED' = 'PENDING'
    let blockNumber: bigint | null = null

    if (pm === 'CRYPTO') {
      const verification = await verifyBscTransaction(txHash.trim(), totalPrice)
      if (verification.success) {
        finalStatus = 'APPROVED'
        blockNumber = verification.blockNumber ? BigInt(verification.blockNumber) : null
      }
    }

    // Generate unique ticket code
    let ticketCode = generateTicketCode()
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.ticketOrder.findUnique({ where: { ticketCode } })
      if (!exists) break
      ticketCode = generateTicketCode()
    }

    // Create order inside transaction — re-check capacity atomically to prevent race conditions
    const order = await prisma.$transaction(async (tx) => {
      if (event.capacity != null) {
        const sold = await tx.ticketOrder.count({
          where: { eventId: event.id, status: { not: 'REJECTED' } },
        })
        if (sold + qty > event.capacity) {
          throw new Error('CAPACITY_EXCEEDED')
        }
      }

      return tx.ticketOrder.create({
        data: {
          eventId: event.id,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          customerPhone: customerPhone.trim(),
          ticketCode,
          quantity: qty,
          totalPrice,
          paymentMethod: pm,
          proofUrl: pm === 'MANUAL' ? proofUrl.trim() : null,
          txHash: pm === 'CRYPTO' ? txHash.trim() : null,
          blockNumber,
          status: finalStatus as any,
        },
      })
    }).catch((err: any) => {
      if (err.message === 'CAPACITY_EXCEEDED') return null
      throw err
    })

    if (!order) {
      return NextResponse.json({ error: 'No hay suficientes entradas disponibles' }, { status: 409 })
    }

    // Send ticket email immediately if APPROVED (crypto verified)
    if (finalStatus === 'APPROVED') {
      sendTicketEmail(order.customerEmail, order.customerName, {
        ticketCode: order.ticketCode,
        eventTitle: event.title,
        eventDate: event.date,
        eventLocation: event.location,
        eventImage: event.image,
        quantity: order.quantity,
        totalPrice: Number(order.totalPrice),
        paymentMethod: pm,
      }).catch(e => console.error('[email] ticket auto:', e))
    }

    return NextResponse.json({
      order: {
        id: order.id,
        ticketCode: order.ticketCode,
        status: finalStatus,
        totalPrice: Number(order.totalPrice),
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/entradas/[eventId]/orders]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
