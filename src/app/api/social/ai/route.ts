export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveOpenAIKey, chargeForChatUsage } from '@/lib/ai-credits'

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.8
        })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'OpenAI error')
    return {
        content: (data.choices[0].message.content as string).trim(),
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
    }
}

export async function POST(req: Request) {
    try {
        const user = await getAuthUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { action, content, networks, topic, language = 'es' } = await req.json()

        // Modelo preferido del usuario (si tiene OpenAIConfig); default gpt-4o
        const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } })
        const model = oaiConfig?.model || 'gpt-4o'

        // Resolver key (NO cobra todavía — cobro por tokens reales después)
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
        const apiKey = resolved.key

        const networkList = (networks || []).join(', ') || 'redes sociales'
        const reason = `social.ai.${action ?? 'generate'}`

        let result: { content: string; promptTokens: number; completionTokens: number }

        if (action === 'generate') {
            result = await callOpenAI(apiKey, model,
                `Eres un experto en marketing de contenido para ${networkList}. Escribes en ${language === 'es' ? 'español' : language}. Genera posts atractivos, con emojis relevantes, hashtags efectivos y llamados a la acción claros. Para negrita usa caracteres Unicode bold (𝗻𝗲𝗴𝗿𝗶𝘁𝗮) que funcionan en todas las redes.`,
                `Crea un post de marketing para: "${topic}". Redes destino: ${networkList}. El post debe ser convincente, incluir emojis y 3-5 hashtags al final.`
            )
        } else if (action === 'improve') {
            result = await callOpenAI(apiKey, model,
                `Eres un experto en copywriting para redes sociales. Mejoras textos haciéndolos más persuasivos, con mejor estructura, emojis y llamados a la acción. Redes destino: ${networkList}.`,
                `Mejora este texto para publicar en ${networkList}:\n\n${content}`
            )
        } else if (action === 'script') {
            result = await callOpenAI(apiKey, model,
                `Eres un experto en creación de guiones para videos de redes sociales (TikTok, Instagram Reels, YouTube Shorts). Creas guiones detallados con estructura: gancho inicial, desarrollo, llamado a la acción.`,
                `Crea un guión de video para: "${topic}". \nFormato: \n- Duración objetivo: 30-60 segundos\n- Incluye: [GANCHO], [DESARROLLO], [CTA]\n- Incluye indicaciones de tono y gestos donde sea relevante`
            )
        } else if (action === 'analyze') {
            result = await callOpenAI(apiKey, model,
                `Eres un analista de contenido digital experto. Analizas métricas y das recomendaciones específicas y accionables para mejorar el rendimiento del contenido.`,
                `Analiza estas métricas de redes sociales y da 5 recomendaciones concretas para mejorar el contenido:\n\n${content}`
            )
        } else {
            return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
        }

        // Cobrar tokens reales solo si admin key
        if (resolved.source === 'admin') {
            chargeForChatUsage(user.id, model, result.promptTokens, result.completionTokens, reason)
                .catch(e => console.error('[SocialAI] charge error:', e))
        }

        return NextResponse.json({ result: result.content })
    } catch (err: any) {
        console.error('[SocialAI]', err)
        return NextResponse.json({ error: err.message || 'Error de IA' }, { status: 500 })
    }
}
