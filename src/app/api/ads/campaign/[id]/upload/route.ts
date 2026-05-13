export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 min para uploads pesados (videos)
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'ad-creatives'
const MAX_IMAGE_SIZE = 10 * 1024 * 1024  // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100 MB

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const campaignId = params.id

        // Verify campaign belongs to user
        const campaign = await (prisma as any).adCampaignV2.findFirst({
            where: { id: campaignId, userId: user.id }
        })
        if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

        const formData = await req.formData()
        const file = formData.get('file') as File | null
        const slotIndex = parseInt(formData.get('slotIndex') as string || '0')
        const creativeId = formData.get('creativeId') as string | null

        if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

        // Validar tamaño antes de leer en memoria
        const isVideo = file.type.startsWith('video')
        const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
        if (file.size > maxSize) {
            const limitMB = Math.floor(maxSize / (1024 * 1024))
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
            return NextResponse.json({
                error: `El ${isVideo ? 'video' : 'archivo'} pesa ${sizeMB} MB y supera el límite de ${limitMB} MB. Comprímelo o usa un archivo más liviano.`
            }, { status: 413 })
        }

        // Validate Supabase config
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[Upload] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables')
            return NextResponse.json({
                error: 'Almacenamiento no configurado. Agrega SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY al archivo .env'
            }, { status: 500 })
        }

        // Ensure bucket exists
        const { data: buckets, error: listErr } = await supabaseAdmin.storage.listBuckets()
        if (listErr) {
            console.error('[Upload] listBuckets error:', listErr.message)
            return NextResponse.json({ error: `Error de almacenamiento: ${listErr.message}` }, { status: 500 })
        }
        const bucketExists = buckets?.some(b => b.name === BUCKET)
        if (!bucketExists) {
            const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true })
            if (createErr) {
                console.error('[Upload] createBucket error:', createErr.message)
                return NextResponse.json({ error: `No se pudo crear el bucket: ${createErr.message}` }, { status: 500 })
            }
        }

        // Upload to Supabase Storage
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `ads/${user.id}/${campaignId}/slot-${slotIndex}-${Date.now()}.${ext}`
        const buffer = Buffer.from(await file.arrayBuffer())

        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(path, buffer, {
                contentType: file.type,
                upsert: true
            })

        if (uploadError) {
            console.error('[Upload] upload error:', uploadError.message)
            return NextResponse.json({ error: `Error al subir: ${uploadError.message}` }, { status: 500 })
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
        const publicUrl = urlData.publicUrl

        const mType = file.type.startsWith('video') ? 'video' : 'image'

        if (creativeId) {
            await (prisma as any).adCreative.update({
                where: { id: creativeId },
                data: { mediaUrl: publicUrl, mediaType: mType }
            })
        } else {
            const existing = await (prisma as any).adCreative.findFirst({
                where: { campaignId, slotIndex }
            })
            if (existing) {
                await (prisma as any).adCreative.update({
                    where: { id: existing.id },
                    data: { mediaUrl: publicUrl, mediaType: mType }
                })
            } else {
                await (prisma as any).adCreative.create({
                    data: {
                        campaignId,
                        slotIndex,
                        primaryText: '',
                        headline: '',
                        mediaUrl: publicUrl,
                        mediaType: mType,
                        aiGenerated: false,
                        isApproved: false
                    }
                })
            }
        }

        return NextResponse.json({ mediaUrl: publicUrl })

    } catch (err: any) {
        console.error('[Upload] Unhandled error:', err)
        return NextResponse.json({ error: err.message || 'Error interno al subir archivo' }, { status: 500 })
    }
}
