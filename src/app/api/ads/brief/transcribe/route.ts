export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { transcribeAudio } from '@/lib/ads/openai-ads'
import { resolveOpenAIKey, chargeForWhisperSeconds } from '@/lib/ai-credits'

// Estimación de duración a partir del tamaño del archivo si el navegador no la pasa.
// Audio webm/opus típico de chat ronda ~16 KB/s. Si no podemos estimar, usamos 30s.
function estimateAudioSeconds(file: File): number {
    if (file.size <= 0) return 30
    const sec = Math.round(file.size / 16_000)
    return Math.max(2, Math.min(600, sec)) // entre 2s y 10min
}

export async function POST(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Parse multipart form (validamos audio antes de resolver key)
    const formData = await req.formData()
    const file = formData.get('audio') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió audio' }, { status: 400 })

    // Resolver key (NO cobra todavía — el cobro va por segundos reales del audio después).
    const resolved = await resolveOpenAIKey(user.id)
    if (!resolved.ok) {
        if (resolved.error === 'NO_CREDITS') {
            return NextResponse.json({
                error: 'Sin saldo de IA. Comprá saldo o configurá tu propia API Key.',
                code: 'NO_CREDITS',
                balanceUsd: resolved.balanceUsd,
            }, { status: 402 })
        }
        return NextResponse.json({
            error: 'No hay API Key disponible. Configurá la tuya en Configuración → IA o pedile al admin que active la global.',
            code: resolved.error,
        }, { status: 400 })
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const text = await transcribeAudio(buffer, file.name || 'audio.webm', resolved.key)

        if (!text || text.trim().length < 10) {
            // Audio inaudible: no cobramos. Devolver error.
            return NextResponse.json({ error: 'No se pudo transcribir el audio. Asegúrate de hablar claramente.' }, { status: 422 })
        }

        // Cobrar whisper por segundos estimados (solo si admin key).
        if (resolved.source === 'admin') {
            const seconds = estimateAudioSeconds(file)
            chargeForWhisperSeconds(user.id, seconds, 'ads.brief.transcribe', { bytes: file.size })
                .catch(e => console.error('[Transcribe] charge error:', e))
        }

        return NextResponse.json({ text: text.trim() })
    } catch (err: any) {
        console.error('[Transcribe]', err)
        return NextResponse.json({ error: err.message || 'Error al transcribir el audio' }, { status: 500 })
    }
}
