export const dynamic = 'force-dynamic'
export const maxDuration = 120 // vision (20s) + creative direction (15s) + text overlay (12s) + gpt-image-1 (60s) = ~107s
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateAdImage, editAdImageWithReference, analyzeProductImageForAd, generateCreativeDirection, generateTextOverlay, type ImageQuality, type ImageSize } from '@/lib/ads/openai-ads'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveOpenAIKey, chargeForChatUsage, chargeForImage } from '@/lib/ai-credits'

const BUCKET = 'ad-creatives'

const VALID_SIZES: ImageSize[] = ['1024x1024', '1024x1792', '1792x1024']
const VALID_QUALITIES: ImageQuality[] = ['fast', 'standard', 'premium']

// Map DALL-E size → gpt-image-1 size (closest equivalent)
function toEditSize(size: string): '1024x1024' | '1024x1536' | '1536x1024' {
    if (size === '1024x1792') return '1024x1536'
    if (size === '1792x1024') return '1536x1024'
    return '1024x1024'
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id },
        include: { brief: true, strategy: true }
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    // Resolver key (NO cobra todavía — cobro por imagen + tokens reales después)
    const resolved = await resolveOpenAIKey(user.id)
    if (!resolved.ok) {
        if (resolved.error === 'NO_CREDITS') {
            return NextResponse.json({
                error: 'Sin saldo de IA. Generar una imagen requiere ~$0.04 USD. Comprá saldo o configurá tu propia API Key.',
                code: 'NO_CREDITS', balanceUsd: resolved.balanceUsd,
            }, { status: 402 })
        }
        return NextResponse.json({ error: 'No hay API Key disponible.', code: resolved.error }, { status: 400 })
    }
    const apiKey = resolved.key

    // Helper: cobra tokens si usamos admin key
    const chargeChat = (model: string, u: { promptTokens: number; completionTokens: number }, reason: string) => {
        if (resolved.source !== 'admin') return
        chargeForChatUsage(user.id, model, u.promptTokens, u.completionTokens, reason, { campaignId: params.id })
            .catch(e => console.error(`[GenerateImage] charge(${reason}) error:`, e))
    }

    const body = await req.json()
    const {
        slotIndex = 0,
        creativeId,
        customPrompt,
        quality = 'standard',
        size = '1024x1024',
        referenceImageUrl,
    } = body

    const brief = {
        name: campaign.brief.name,
        industry: campaign.brief.industry,
        description: campaign.brief.description,
        valueProposition: campaign.brief.valueProposition,
        painPoints: campaign.brief.painPoints,
        interests: campaign.brief.interests,
        brandVoice: campaign.brief.brandVoice,
        brandColors: campaign.brief.brandColors,
        visualStyle: campaign.brief.visualStyle,
        primaryObjective: campaign.brief.primaryObjective,
        mainCTA: campaign.brief.mainCTA,
        targetLocations: campaign.brief.targetLocations,
        keyMessages: campaign.brief.keyMessages,
        personalityTraits: campaign.brief.personalityTraits,
        contentThemes: campaign.brief.contentThemes,
        engagementLevel: campaign.brief.engagementLevel || 'medio'
    }

    try {
        let imageUrl: string

        if (referenceImageUrl && typeof referenceImageUrl === 'string' && referenceImageUrl.startsWith('http')) {
            // Step 1: Analyze the product with GPT-4o Vision to get an exact description.
            // This prevents gpt-image-1 from "inventing" a different product.
            let productDescription = ''
            try {
                let u: { promptTokens: number; completionTokens: number } | null = null
                productDescription = await analyzeProductImageForAd({ imageUrl: referenceImageUrl, apiKey, onUsage: (x) => { u = x } })
                if (u) chargeChat('gpt-4o', u, 'ads.images.analyze')
            } catch { /* non-fatal — continue with generic prompt */ }

            // Step 2: Use AI to generate a specific creative direction for this exact business
            const colors = ((brief.brandColors as string[]) || []).slice(0, 3).join(', ') || 'clean neutral tones'
            const style = ((brief.visualStyle as string[]) || []).slice(0, 3).join(', ') || 'modern, professional'
            const value = brief.valueProposition?.substring(0, 120) || ''
            const keyMessages = (brief.keyMessages as string[]) || []
            const keyMsg = keyMessages[slotIndex] || keyMessages[0] || ''

            const productRef = productDescription
                ? `IMPORTANT: The reference photo contains the EXACT product to feature. Keep the product 100% identical — same shape, label, packaging, colors, proportions. Do NOT redesign or alter the product itself. Only create a new background/scene around it.`
                : 'Feature the product from the reference photo as the absolute hero. Keep it visually identical — only change the background and scene around it.'

            // AI generates the creative direction tailored to this specific business/industry
            let creativeScene = ''
            try {
                let u: { promptTokens: number; completionTokens: number } | null = null
                creativeScene = await generateCreativeDirection({
                    brief,
                    productDescription,
                    slotIndex,
                    apiKey,
                    onUsage: (x) => { u = x },
                })
                if (u) chargeChat('gpt-4o-mini', u, 'ads.images.direction')
            } catch { /* non-fatal — fallback below */ }

            // Fallback if AI direction fails
            if (!creativeScene) {
                creativeScene = `The product placed as the hero in a professional, aspirational scene appropriate for the ${brief.industry} industry. Cinematic lighting, brand colors ${colors}, ${style} aesthetic.`
            }

            // AI generates a specific, attractive text overlay tailored to this exact business
            let textOverlay = ''
            try {
                let u: { promptTokens: number; completionTokens: number } | null = null
                textOverlay = await generateTextOverlay({
                    brief,
                    slotIndex,
                    objective: campaign.strategy.objective || 'conversions',
                    destination: campaign.strategy.destination || 'website',
                    apiKey,
                    onUsage: (x) => { u = x },
                })
                if (u) chargeChat('gpt-4o-mini', u, 'ads.images.overlay')
            } catch { /* non-fatal */ }
            if (!textOverlay) {
                textOverlay = `Add exactly ONE bold, short 3D text title: "${(keyMsg || value).substring(0, 20)}". Do NOT add any other text.`
            }

            // When a customPrompt is provided, prepend the product reference so gpt-image-1
            // still knows exactly which product to keep faithful from the reference photo.
            const posterStyle = "Hyper-realistic Digital Graphic Design Poster. Cinematic, high-contrast. Dramatic background with intense VFX (fire, glowing energy, sparks). Bold 3D typography."
            const basePrompt = customPrompt
                ? `${productRef} ${customPrompt} ${textOverlay}`
                : `${posterStyle} Brand: ${brief.name} (${brief.industry}). ${productRef} Scene: ${creativeScene} Colors: ${colors}. ${textOverlay} Masterpiece quality, advertising agency professional composition. No watermarks.`
            const rawPrompt = basePrompt

            // gpt-image-1 has a ~4000 char prompt limit — cap at 3000 to be safe
            const prompt = rawPrompt.length > 3000 ? rawPrompt.substring(0, 3000) : rawPrompt

            const imgBuffer = await editAdImageWithReference({
                imageUrl: referenceImageUrl,
                prompt,
                apiKey,
                size: toEditSize(VALID_SIZES.includes(size as ImageSize) ? size : '1024x1024'),
            })
            // Cobrar imagen (gpt-image-1, $0.04 standard)
            if (resolved.source === 'admin') {
                chargeForImage(user.id, 'gpt-image-1', 1, 'ads.images.edit', { campaignId: params.id, slotIndex })
                    .catch(e => console.error('[GenerateImage] chargeForImage(edit) error:', e))
            }

            // Upload the result to Supabase Storage
            const path = `ads/${user.id}/${params.id}/slot-${slotIndex}-edit-${Date.now()}.png`
            const { error: uploadErr } = await supabaseAdmin.storage
                .from(BUCKET)
                .upload(path, imgBuffer, { contentType: 'image/png', upsert: true })
            if (uploadErr) throw new Error(uploadErr.message)

            const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
            imageUrl = urlData.publicUrl
        } else {
            // No reference image → use DALL-E 3 to generate from scratch
            imageUrl = await generateAdImage({
                brief,
                mediaType: campaign.strategy.mediaType,
                slotIndex,
                apiKey,
                customPrompt: customPrompt || undefined,
                quality: VALID_QUALITIES.includes(quality) ? quality : 'standard',
                size: VALID_SIZES.includes(size) ? size : '1024x1024',
            })
            // Cobrar imagen DALL-E 3 (HD si quality='premium', wide si size 1792×1024)
            if (resolved.source === 'admin') {
                const imageModel =
                    (size === '1792x1024' || size === '1024x1792') && quality === 'premium' ? 'dall-e-3-wide-hd'
                    : (size === '1792x1024' || size === '1024x1792') ? 'dall-e-3-wide'
                    : quality === 'premium' ? 'dall-e-3-hd'
                    : 'dall-e-3'
                chargeForImage(user.id, imageModel, 1, 'ads.images.generate', { campaignId: params.id, slotIndex, quality, size })
                    .catch(e => console.error('[GenerateImage] chargeForImage error:', e))
            }
        }

        // Persist to DB if creativeId given
        if (creativeId) {
            await (prisma as any).adCreative.update({
                where: { id: creativeId },
                data: { mediaUrl: imageUrl, mediaType: 'image', aiGenerated: true }
            })
        }

        return NextResponse.json({ imageUrl })
    } catch (err: any) {
        // Sin pre-cobro de imagen flat: si la generación falló, no se cobró (los charge*
        // calls están adentro del try y solo corren tras éxito). Los cobros de chat
        // intermedios (analyze/direction/overlay) son fire-and-forget y son aceptables
        // como costo de intentar.
        console.error('[GenerateImage]', err)
        return NextResponse.json({ error: err.message || 'Error al generar la imagen' }, { status: 500 })
    }
}
