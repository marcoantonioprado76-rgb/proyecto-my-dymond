export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Endpoints de COMPRA de créditos AI (saldo USD).
 *
 * Estos endpoints están DESCOPLADOS de los toggles STORE_PAYMENT_* del checkout de planes.
 * La compra de créditos siempre está disponible mediante el método MANUAL (transferencia
 * con comprobante), sin importar si el admin desactivó otros métodos para los planes.
 */

const MIN_AMOUNT = 1     // mínimo $1
const MAX_AMOUNT = 1000  // máximo $1000 por compra
const MAX_PENDING_PER_USER = 5  // tope anti-spam de solicitudes pendientes simultáneas

// POST — crear solicitud de compra de créditos
export async function POST(req: NextRequest) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

    const amountUsdRaw = Number(body?.amountUsd)
    const paymentProofUrl = typeof body?.paymentProofUrl === 'string' ? body.paymentProofUrl.trim() : null
    const notes = typeof body?.notes === 'string' ? body.notes.slice(0, 500) : null

    if (!Number.isFinite(amountUsdRaw) || amountUsdRaw < MIN_AMOUNT || amountUsdRaw > MAX_AMOUNT) {
        return NextResponse.json(
            { error: `El monto debe estar entre $${MIN_AMOUNT} y $${MAX_AMOUNT} USD.` },
            { status: 400 }
        )
    }

    // Anti-spam: limitar solicitudes PENDING simultáneas por usuario
    const pendingCount = await (prisma as any).creditPurchaseRequest.count({
        where: { userId: user.id, status: 'PENDING' },
    })
    if (pendingCount >= MAX_PENDING_PER_USER) {
        return NextResponse.json(
            { error: `Ya tenés ${pendingCount} solicitudes pendientes de aprobación. Esperá a que el admin las procese antes de enviar otra.` },
            { status: 429 }
        )
    }

    // Redondeo a 2 decimales
    const amountUsd = Math.round(amountUsdRaw * 100) / 100

    // Por ahora aceptamos sólo MANUAL para compras de créditos
    const created = await (prisma as any).creditPurchaseRequest.create({
        data: {
            userId: user.id,
            amountUsd,
            paymentMethod: 'MANUAL',
            paymentProofUrl,
            notes,
            status: 'PENDING',
        },
        select: {
            id: true,
            amountUsd: true,
            paymentMethod: true,
            paymentProofUrl: true,
            status: true,
            createdAt: true,
        },
    })

    return NextResponse.json({
        success: true,
        purchase: { ...created, amountUsd: Number(created.amountUsd) },
    }, { status: 201 })
}

// GET — listar mis solicitudes de compra de créditos
export async function GET() {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const purchases = await (prisma as any).creditPurchaseRequest.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
            id: true,
            amountUsd: true,
            paymentMethod: true,
            paymentProofUrl: true,
            status: true,
            notes: true,
            createdAt: true,
            reviewedAt: true,
        },
    })

    // Normalizar Decimal → number antes de serializar a JSON
    return NextResponse.json({
        purchases: purchases.map((p: any) => ({ ...p, amountUsd: Number(p.amountUsd) })),
    })
}
