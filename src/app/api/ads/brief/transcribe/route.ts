export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { transcribeAudio } from '@/lib/ads/openai-ads'
import { chargeUserForAI, refundUserForAI } from '@/lib/ai-credits'

export async function POST(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Parse multipart form (validamos audio antes de cobrar saldo)
    const formData = await req.formData()
    const file = formData.get('audio') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió audio' }, { status: 400 })

    // Resolver key: prioriza la propia del usuario; si no tiene, usa la del admin
    // y descuenta del saldo USD. chargeUserForAI() lee de OpenAIConfig, AppSetting
    // y AdminConfig en orden de prioridad.
    const charge = await chargeUserForAI(user.id, 'whisper-1', 'ads.brief.transcribe')
    if (!charge.ok) {
        if (charge.error === 'NO_CREDITS') {
            return NextResponse.json({
                error: 'Sin saldo de IA. Comprá saldo o configurá tu propia API Key.',
                code: 'NO_CREDITS',
                balanceUsd: charge.balanceUsd,
                requiredUsd: charge.requiredUsd,
            }, { status: 402 })
        }
        return NextResponse.json({
            error: 'No hay API Key disponible. Configurá la tuya en Configuración → IA o pedile al admin que active la global.',
            code: charge.error,
        }, { status: 400 })
    }
    const apiKey = charge.key

    try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const text = await transcribeAudio(buffer, file.name || 'audio.webm', apiKey)

        if (!text || text.trim().length < 10) {
            // Audio inaudible: devolver saldo si lo cobramos
            if (charge.source === 'admin' && charge.chargedUsd) {
                await refundUserForAI(user.id, charge.chargedUsd, 'ads.brief.transcribe.empty')
            }
            return NextResponse.json({ error: 'No se pudo transcribir el audio. Asegúrate de hablar claramente.' }, { status: 422 })
        }

        return NextResponse.json({ text: text.trim() })
    } catch (err: any) {
        // Cualquier error de OpenAI: refund
        if (charge.source === 'admin' && charge.chargedUsd) {
            await refundUserForAI(user.id, charge.chargedUsd, 'ads.brief.transcribe.failed')
        }
        console.error('[Transcribe]', err)
        return NextResponse.json({ error: err.message || 'Error al transcribir el audio' }, { status: 500 })
    }
}
