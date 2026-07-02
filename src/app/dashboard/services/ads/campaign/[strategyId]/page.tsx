'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import {
    ArrowLeft, Loader2, Sparkles, Upload, CheckCircle2, AlertCircle,
    RefreshCw, MapPin, DollarSign, Settings2, Phone, Rocket,
    Image as ImageIcon, Video, Zap, Eye, X,
    ChevronLeft, ChevronRight, Globe, Wand2, Star, Gauge, Trophy,
    Target, TrendingUp, Bot, Layers, LayoutGrid, FileText, Coins,
    ChevronDown, ChevronUp, BarChart2, Cpu, Download
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import LocationSelector from '@/components/ads/LocationSelector'
import { AiThinking } from '@/components/ads/AiThinking'

// Overlay "IA pensando" mientras se genera una imagen: animación de texto + frases que rotan.
const AI_GEN_MESSAGES = [
    'Analizando tu producto…',
    'Eligiendo el ángulo ganador…',
    'Pintando la escena…',
    'Resaltando los beneficios…',
    'Puliendo los detalles…',
]
function AiGeneratingOverlay() {
    return <AiThinking variant="compact" messages={AI_GEN_MESSAGES} />
}

// Overlay de publicación: cohete + barra de progreso que sube y se frena en ~92%
// hasta que el server responde (no sabemos el % real, así que es progreso por etapas).
const PUBLISH_STAGES = [
    'Conectando con Meta…',
    'Creando la campaña…',
    'Configurando audiencias y presupuesto…',
    'Subiendo tus creativos…',
    'Creando los anuncios…',
    'Revisando todo…',
]
function PublishProgress({ active, failed }: { active: boolean; failed: boolean }) {
    const [pct, setPct] = useState(0)
    const [show, setShow] = useState(false)
    const shownRef = useRef(false)
    const setShown = (v: boolean) => { shownRef.current = v; setShow(v) }
    const failedRef = useRef(failed)
    failedRef.current = failed
    useEffect(() => {
        if (active) {
            setShown(true); setPct(0)
            let p = 0
            const id = setInterval(() => {
                p += (92 - p) * 0.045 + 0.4      // sube rápido al inicio, se frena cerca de 92
                if (p > 92) p = 92
                setPct(p)
            }, 220)
            return () => clearInterval(id)
        } else if (shownRef.current) {
            if (failedRef.current) { setShown(false); return }  // falló → ocultar sin "publicado"
            setPct(100)                          // terminó OK → completa la barra
            const t = setTimeout(() => setShown(false), 750)
            return () => clearTimeout(t)
        }
    }, [active])  // eslint-disable-line react-hooks/exhaustive-deps
    if (!show) return null
    const stage = Math.min(PUBLISH_STAGES.length - 1, Math.floor(pct / (100 / PUBLISH_STAGES.length)))
    return (
        <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-white/93 backdrop-blur-md px-6 gap-7">
            <div className="text-5xl" style={{ transform: `translateY(${(1 - pct / 100) * 14}px)`, transition: 'transform .3s ease' }}>🚀</div>
            <div className="w-full max-w-sm">
                <div className="flex items-end justify-between mb-2.5 gap-3">
                    <span className="ai-grad-text text-sm font-extrabold leading-tight" style={{ backgroundImage: 'linear-gradient(90deg,#B735B8,#9B70E7,#B735B8)' }}>
                        {pct >= 100 ? '¡Publicado!' : PUBLISH_STAGES[stage]}
                    </span>
                    <span className="text-base font-black text-[#111827] shrink-0">{Math.round(pct)}%</span>
                </div>
                <div className="relative h-3 rounded-full bg-[#F0F3F7] overflow-hidden border border-[#E4E9F0]">
                    <div className="h-full rounded-full" style={{
                        width: `${pct}%`, transition: 'width .3s ease-out',
                        background: 'linear-gradient(90deg,#6A35D9,#FF096C,#D97706,#233B8F,#6A35D9)',
                        backgroundSize: '300% 100%', animation: 'ai-liquid 3s ease infinite',
                    }} />
                </div>
                <p className="text-center text-[#9CA3AF] text-[11px] mt-3.5 font-semibold">Esto puede tardar un momento. No cierres esta ventana 🙏</p>
            </div>
        </div>
    )
}

function CampaignPageInner() {
    const router = useRouter()
    const { strategyId } = useParams() as { strategyId: string }
    const searchParams = useSearchParams()
    const editCampaignId = searchParams.get('edit')

    // Data
    const [strategy, setStrategy] = useState<any>(null)
    const [brief, setBrief] = useState<any>(null)
    const [accounts, setAccounts] = useState<any[]>([])
    const [pages, setPages] = useState<any[]>([])
    const [pixels, setPixels] = useState<any[]>([])
    const [waNumbers, setWaNumbers] = useState<any[]>([])
    const [campaign, setCampaign] = useState<any>(null)
    const [creatives, setCreatives] = useState<any[]>([])

    // UI state
    const [loading, setLoading] = useState(true)
    const [savingConfig, setSavingConfig] = useState(false)
    const [generatingCopies, setGeneratingCopies] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [configSaved, setConfigSaved] = useState(false)
    const [tab, setTab] = useState<'config' | 'creativos'>('config')
    const [copiesGenerated, setCopiesGenerated] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [previewIdx, setPreviewIdx] = useState(0)
    const [showAdvanced, setShowAdvanced] = useState(false)

    // AI image generation per slot
    const [generatingImages, setGeneratingImages] = useState<Record<number, boolean>>({})
    const [imageGenPanel, setImageGenPanel] = useState<number | null>(null)
    const [imageQuality, setImageQuality] = useState<'fast' | 'standard' | 'premium'>('fast')
    const [imageFormat, setImageFormat] = useState<'square' | 'vertical' | 'horizontal'>('square')
    const [imageCustomPrompts, setImageCustomPrompts] = useState<Record<number, string>>({})
    // Reference product photos for AI generation (separate from slot images)
    const [refImageUrls, setRefImageUrls] = useState<Record<number, string>>({})
    const [uploadingRefImage, setUploadingRefImage] = useState<Record<number, boolean>>({})

    // Bulk image generation
    const [showBulkPanel, setShowBulkPanel] = useState(false)
    const [bulkQuality, setBulkQuality] = useState<'fast' | 'standard' | 'premium'>('fast')
    const [bulkFormat, setBulkFormat] = useState<'square' | 'vertical' | 'horizontal'>('square')
    const [bulkStyle] = useState<'auto'>('auto')
    const [bulkGenerating, setBulkGenerating] = useState(false)
    const [bulkProgress, setBulkProgress] = useState(0)
    const [bulkRefImageUrl, setBulkRefImageUrl] = useState<string>('')
    const [uploadingBulkRef, setUploadingBulkRef] = useState(false)
    const bulkRefFileRef = useRef<HTMLInputElement | null>(null)

    // Per-field text suggestions
    const [suggestingField, setSuggestingField] = useState<string | null>(null)
    const [suggestions, setSuggestions] = useState<Record<string, string[]>>({})
    const [activeSuggestionKey, setActiveSuggestionKey] = useState<string | null>(null)
    const [fillingChat, setFillingChat] = useState<'whatsappGreeting' | 'quickReply' | null>(null)

    // Advanced options
    const [advantageAudience, setAdvantageAudience] = useState(true)
    const [advantageCreative, setAdvantageCreative] = useState(true)
    const [adFormat, setAdFormat] = useState<'single' | 'carousel'>('single')
    const [bidStrategy, setBidStrategy] = useState<'auto' | 'cost_cap' | 'min_roas'>('auto')
    const [bidCapAmount, setBidCapAmount] = useState('')
    const [minRoasTarget, setMinRoasTarget] = useState('')

    // Form
    const [form, setForm] = useState({
        name: '',
        providerAccountId: '',
        providerAccountName: '',
        pageId: '',
        whatsappNumber: '',
        welcomeMessage: '',
        whatsappQuestion: '',
        pixelId: '',
        destinationUrl: '',
        dailyBudgetUSD: '8',
        locations: [] as string[]
    })

    const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})
    const refImageFileRefs = useRef<Record<number, HTMLInputElement | null>>({})
    const creativesRef = useRef<HTMLDivElement>(null)

    function generateSmartPrompt(slotIndex: number, hasUploadedImage: boolean): string {
        const name = brief?.name || 'la marca'
        const industry = brief?.industry || 'negocio'
        const colors = Array.isArray(brief?.brandColors)
            ? brief.brandColors.slice(0, 3).join(', ')
            : (brief?.brandColors || 'colores neutros')
        const style = Array.isArray(brief?.visualStyle)
            ? brief.visualStyle.slice(0, 3).join(', ')
            : (brief?.visualStyle || 'moderno, profesional')
        const themes = Array.isArray(brief?.contentThemes)
            ? brief.contentThemes.slice(0, 2).join(' y ')
            : (brief?.contentThemes || 'producto destacado')
        const value = brief?.valueProposition?.substring(0, 120) || ''
        const keyMsg = Array.isArray(brief?.keyMessages)
            ? (brief.keyMessages[slotIndex] || brief.keyMessages[0] || '')
            : ''
        const msg = keyMsg || value

        if (hasUploadedImage) {
            return `Create a complete advertising creative for ${name} (${industry}). Keep the product visually faithful to the reference photo — same shape, design, and details. Design a full ad scene: integrate the product into an aspirational ${style} lifestyle setting using brand colors (${colors}). Show the product in context — people using it, a compelling environment around it, or a dramatic hero moment that sells the feeling. Visual message: "${msg}". Cinematic lighting, emotionally engaging composition. Commercial photography quality, no text overlays, no watermarks.`
        }

        const even = slotIndex % 2 === 0
        if (even) {
            return `Award-winning advertising visual for ${name}, premium ${industry} brand. Style: ${style}, emotionally compelling and visually arresting. Exact brand colors: ${colors}. Scene: ${themes} — aspirational lifestyle setting. Visual message: "${msg}". Perfect composition, cinematic studio lighting, shallow depth of field. High-end commercial photography, magazine quality, photorealistic, no text, no watermarks.`
        }
        return `Cinematic product advertisement for ${name} (${industry}). Aesthetic: ${style}. Color story: ${colors}. Visual concept: ${themes}. Brand promise shown visually: "${msg}". Stunning hero composition, award-winning photography direction, golden-hour light, perfect exposure. Ultra-realistic, commercial quality, no text overlays, no watermarks.`
    }

    function getBulkPrompt(slotIndex: number, _style: string): string {
        const name = brief?.name || 'la marca'
        const industry = brief?.industry || 'negocio'
        const colors = Array.isArray(brief?.brandColors) ? (brief.brandColors as string[]).slice(0, 2).join(' and ') : 'brand colors'
        const value = brief?.valueProposition?.substring(0, 100) || ''
        const keyMsg = (Array.isArray(brief?.keyMessages) ? ((brief.keyMessages as string[])[slotIndex] || (brief.keyMessages as string[])[0] || value) : value).substring(0, 100)
        const pains = Array.isArray(brief?.painPoints) ? (brief.painPoints as string[]).slice(0, 2).join(' and ') : ''
        const visualStyle = Array.isArray(brief?.visualStyle) ? (brief.visualStyle as string[]).slice(0, 2).join(', ') : 'modern'

        // Auto-assign concept per slot — 4 different angles, rotating
        const concepts = [
            `Premium product hero shot for ${name} (${industry}). The product is the undisputed protagonist in a dramatic, industry-appropriate setting. Brand colors: ${colors}. Visual style: ${visualStyle}. Add a bold text sticker overlay with "${keyMsg.substring(0, 40)}" in large readable font. Cinematic lighting, sharp focus, aspirational atmosphere. No watermarks.`,
            `Lifestyle advertising scene for ${name} (${industry}). Show a real person genuinely enjoying or benefiting from the product in an authentic, aspirational environment. Colors: ${colors}. Scene conveys: "${keyMsg}"${pains ? ` solving: ${pains}` : ''}. Include a "Antes / Después" badge or a customer testimonial quote sticker. Natural lighting, emotionally engaging. No watermarks.`,
            `Transformation or result scene for ${name} (${industry}). Show the aspirational outcome — confidence, beauty, strength, success. Brand colors: ${colors}. Visual style: ${visualStyle}. Add a price badge or promotional sticker with a bold call to action related to "${keyMsg.substring(0, 40)}". Emotionally powerful, inspiring, relatable. No watermarks.`,
            `High-impact advertising creative for ${name} (${industry}). Dramatic bold composition with the product as hero in an energetic eye-catching atmosphere. Colors: ${colors}. Include a bold headline text overlay and a star rating or trust badge. Conveys urgency and desire. Scroll-stopping visual impact, cinematic quality. No watermarks.`,
        ]
        return concepts[slotIndex % concepts.length]
    }

    const WA_PREFS_KEY = 'wa_page_prefs'
    function getWaPrefs(): Record<string, string> {
        try { return JSON.parse(localStorage.getItem(WA_PREFS_KEY) || '{}') } catch { return {} }
    }
    function saveWaPref(pageId: string, phone: string) {
        const prefs = getWaPrefs()
        prefs[pageId] = phone
        localStorage.setItem(WA_PREFS_KEY, JSON.stringify(prefs))
    }

    useEffect(() => { fetchAll() }, [strategyId])

    // Prompt LIBRE (como el generador admin): el usuario escribe el prompt y se manda
    // TAL CUAL a gpt-image-2. Opcional: botón "Generar con IA" que lo escribe solo
    // (gpt-5.1, en español) según el brief + la estrategia, y cae en la misma caja.
    const [bulkUserPrompt, setBulkUserPrompt] = useState('') // prompt libre del usuario (flujo masivo)
    const [showManualPrompt, setShowManualPrompt] = useState(false) // muestra el textarea del prompt manual
    const [aiPromptLoading, setAiPromptLoading] = useState(false)
    async function generateAiPrompt(slotIndex?: number) {
        if (!campaign?.id) return
        setAiPromptLoading(true); setError(null)
        try {
            const res = await fetch(`/api/ads/campaign/${campaign.id}/image-prompts`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
            })
            const data = await res.json()
            if (res.ok && typeof data.prompt === 'string' && data.prompt.trim()) {
                if (typeof slotIndex === 'number') setImageCustomPrompts(prev => ({ ...prev, [slotIndex]: data.prompt.trim() }))
                else setBulkUserPrompt(data.prompt.trim())
            } else {
                setError(data.error || 'No se pudo generar el prompt con IA')
            }
        } catch { setError('Error al generar el prompt con IA') }
        finally { setAiPromptLoading(false) }
    }

    // MOTOR DE DIVERSIDAD (Andromeda): genera un prompt DISTINTO por cada anuncio
    // (matriz P.D.A. + arquetipo) → cada imagen es un "Entity ID" distinto.
    async function generateDiversePrompts() {
        if (!campaign?.id || !creatives.length) return
        setAiPromptLoading(true); setError(null)
        try {
            const res = await fetch(`/api/ads/campaign/${campaign.id}/image-prompts`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ count: creatives.length }),
            })
            const data = await res.json()
            if (res.ok && Array.isArray(data.prompts) && data.prompts.length) {
                setImageCustomPrompts(prev => {
                    const next = { ...prev }
                    creatives.forEach((c: any, idx: number) => { next[c.slotIndex] = data.prompts[idx % data.prompts.length] })
                    return next
                })
            } else {
                setError(data.error || 'No se pudieron generar los prompts diversos')
            }
        } catch { setError('Error al generar la diversidad') }
        finally { setAiPromptLoading(false) }
    }

    // Descargar la imagen generada (para guardarla antes de publicar — al publicar se
    // borra del storage). Usa blob para forzar la descarga aunque sea cross-origin.
    async function downloadImage(url: string, name: string) {
        try {
            const res = await fetch(url)
            const blob = await res.blob()
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = name
            document.body.appendChild(a)
            a.click()
            a.remove()
            setTimeout(() => URL.revokeObjectURL(a.href), 5000)
        } catch {
            window.open(url, '_blank') // respaldo: abrir en pestaña nueva
        }
    }

    // Firma de los slots con video "procesando" — el polling solo se reinicia cuando
    // cambia ESTE conjunto, no en cada edición de texto.
    const processingSig = creatives
        .filter((c: any) => c.metaMediaStatus === 'processing')
        .map((c: any) => c.slotIndex)
        .join(',')

    // Polling: mientras algún video se esté procesando en Meta, consultar cada 6s
    // para mostrar "Preparando → Listo".
    useEffect(() => {
        if (!campaign?.id || !processingSig) return
        const iv = setInterval(async () => {
            try {
                const res = await fetch(`/api/ads/campaign/${campaign.id}/media-status`)
                if (!res.ok) return
                const data = await res.json()
                const map: Record<number, string | null> = {}
                for (const it of (data.items ?? [])) map[it.slotIndex] = it.metaMediaStatus
                setCreatives(prev => prev.map((c: any) =>
                    map[c.slotIndex] !== undefined ? { ...c, metaMediaStatus: map[c.slotIndex] } : c
                ))
            } catch { /* reintenta en el siguiente tick */ }
        }, 6000)
        return () => clearInterval(iv)
    }, [campaign?.id, processingSig])

    // Reset adFormat to 'single' when loaded strategy is a messaging destination
    useEffect(() => {
        if (strategy && ['whatsapp', 'messenger', 'instagram'].includes(strategy.destination)) {
            setAdFormat('single')
        }
    }, [strategy?.destination])

    async function fetchPixels(accountId: string) {
        if (!accountId) { setPixels([]); return }
        try {
            const res = await fetch(`/api/ads/integrations/meta/pixels?adAccountId=${accountId}`)
            if (res.ok) {
                const data = await res.json()
                setPixels(data.pixels || [])
            }
        } catch { /* silent */ }
    }

    async function fetchAll() {
        setLoading(true)
        try {
            const [strRes, briefRes] = await Promise.all([
                fetch('/api/ads/strategies'),
                fetch('/api/ads/brief')
            ])
            const [strData, briefData] = await Promise.all([strRes.json(), briefRes.json()])

            // Cargar primero la campaña existente (si estamos editando)
            let existingCampaign: any = null
            if (editCampaignId) {
                const campRes = await fetch(`/api/ads/campaign/${editCampaignId}`)
                if (campRes.ok) {
                    const campData = await campRes.json()
                    existingCampaign = campData.campaign
                }
            }

            // Estrategia: por strategyId, o RECONSTRUIDA desde la "foto" de la campaña
            // (la campaña es autónoma: funciona aunque la estrategia ya no exista).
            let strat = strData.strategies?.find((s: any) => s.id === strategyId)
            if (!strat && existingCampaign) {
                strat = {
                    id: existingCampaign.strategyId || existingCampaign.id,
                    name: existingCampaign.strategyName || existingCampaign.name,
                    platform: existingCampaign.platform,
                    objective: existingCampaign.objective,
                    destination: existingCampaign.destination,
                    mediaType: existingCampaign.mediaType,
                    mediaCount: existingCampaign.mediaCount ?? 1,
                    // mínimo bajo para no anclar el slider al presupuesto ya guardado
                    minBudgetUSD: 1,
                }
            }
            if (!strat) { router.push('/dashboard/services/ads/wizard'); return }
            setStrategy(strat)
            setBrief(briefData.brief)

            if (existingCampaign) {
                setCampaign(existingCampaign)
                if (existingCampaign.brief) setBrief(existingCampaign.brief)
                // Países por defecto: si la campaña no tiene, usar los del negocio (brief.targetLocations)
                const defaultLocations = (existingCampaign.locations?.length
                    ? existingCampaign.locations
                    : (existingCampaign.brief?.targetLocations || briefData.brief?.targetLocations || []))
                const greeting = existingCampaign.welcomeMessage?.split('||QA:')[0] || ''
                const quickReply = existingCampaign.welcomeMessage?.split('||QA:')[1] || ''
                setForm(f => ({
                    ...f,
                    name: existingCampaign.name || f.name,
                    dailyBudgetUSD: String(existingCampaign.dailyBudgetUSD ?? f.dailyBudgetUSD),
                    locations: defaultLocations,
                    pageId: existingCampaign.pageId || '',
                    whatsappNumber: existingCampaign.whatsappNumber || '',
                    welcomeMessage: greeting,
                    whatsappQuestion: quickReply,
                    pixelId: existingCampaign.pixelId || '',
                    destinationUrl: existingCampaign.destinationUrl || '',
                }))
                // Si el destino es WhatsApp y el chat está vacío → autollenar saludo + respuesta con IA
                const dest = existingCampaign.destination || strat.destination
                if (dest === 'whatsapp' && !greeting && !quickReply) {
                    autoFillWhatsAppChat(existingCampaign.id)
                }
                if (existingCampaign.creatives?.length > 0) {
                    setCreatives(existingCampaign.creatives)
                    const hasCopies = existingCampaign.creatives.some((c: any) => c.primaryText)
                    if (hasCopies) setCopiesGenerated(true)
                } else {
                    const slots = Array.from({ length: strat.mediaCount }, (_, i) => ({
                        id: null, slotIndex: i, primaryText: '', headline: '', description: '', hook: '',
                        mediaUrl: null, mediaType: strat.mediaType, aiGenerated: false, isApproved: false
                    }))
                    setCreatives(slots)
                }
                setConfigSaved(true)
            }

            if (!existingCampaign?.brief && briefData.brief) {
                setBrief(briefData.brief)
                setForm(f => ({ ...f, name: `${briefData.brief.name} — ${strat.name}` }))
            } else if (!existingCampaign && briefData.brief) {
                setForm(f => ({ ...f, name: `${briefData.brief.name} — ${strat.name}` }))
            }

            const platformId = strat.platform.toLowerCase()
            const accRes = await fetch(`/api/ads/integrations/${platformId}/accounts`)
            let firstAccountId = ''
            if (accRes.ok) {
                const accData = await accRes.json()
                const liveAccounts = accData.accounts || []
                setAccounts(liveAccounts)
                if (liveAccounts.length > 0) {
                    firstAccountId = existingCampaign?.connectedAccount?.providerAccountId || liveAccounts[0].providerAccountId
                    const sel = liveAccounts.find((a: any) => a.providerAccountId === firstAccountId) || liveAccounts[0]
                    setForm(f => ({ ...f, providerAccountId: sel.providerAccountId, providerAccountName: sel.displayName }))
                }
            }

            // Mostrar el editor YA (no esperar las llamadas lentas a Meta).
            // Las páginas/pixels/números de WhatsApp se cargan en segundo plano y
            // llenan los desplegables cuando estén listos.
            setLoading(false)

            if (strat.platform === 'META') {
                const [pagesRes, pixelsRes, waRes] = await Promise.all([
                    fetch('/api/ads/integrations/meta/pages'),
                    firstAccountId
                        ? fetch(`/api/ads/integrations/meta/pixels?adAccountId=${firstAccountId}`)
                        : Promise.resolve(new Response(JSON.stringify({ pixels: [] }))),
                    fetch('/api/ads/integrations/meta/whatsapp-numbers')
                ])
                const [pData, pxData, waData] = await Promise.all([pagesRes.json(), pixelsRes.json(), waRes.json()])
                setPages(pData.pages || [])
                setPixels(pxData.pixels || [])
                setWaNumbers(waData.phoneNumbers || [])
            }
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    async function saveConfig() {
        if (!form.name.trim() || !form.providerAccountId) {
            return setError('Nombre y cuenta publicitaria son requeridos')
        }
        if (!brief) return setError('Crea tu Business Brief primero')
        if (strategy?.destination === 'whatsapp' && !form.whatsappNumber) {
            return setError('Selecciona o ingresa un número de WhatsApp Business')
        }
        if (['whatsapp', 'messenger', 'instagram'].includes(strategy?.destination) && !form.pageId) {
            return setError('Selecciona una Página de Facebook')
        }
        if (strategy?.destination === 'website' && !form.destinationUrl) {
            return setError('Ingresa la URL de destino')
        }
        setSavingConfig(true)
        setError(null)
        try {
            const payload = {
                briefId: brief.id,
                strategyId,
                name: form.name.trim(),
                providerAccountId: form.providerAccountId,
                providerAccountName: form.providerAccountName,
                dailyBudgetUSD: parseFloat(form.dailyBudgetUSD || '8'),
                locations: form.locations,
                pageId: form.pageId || null,
                whatsappNumber: form.whatsappNumber || null,
                welcomeMessage: (() => {
                    const g = form.welcomeMessage.trim()
                    const q = form.whatsappQuestion.trim()
                    if (!g && !q) return null
                    return q ? `${g}||QA:${q}` : g
                })(),
                pixelId: form.pixelId || null,
                destinationUrl: form.destinationUrl || null
            }
            const res = campaign
                ? await fetch(`/api/ads/campaign/${campaign.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                : await fetch('/api/ads/campaign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
            const data = await res.json()
            if (!res.ok) return setError(data.error || 'Error al guardar')
            setCampaign(data.campaign)
            if (!campaign) {
                const slots = Array.from({ length: strategy.mediaCount }, (_, i) => ({
                    id: null, slotIndex: i, primaryText: '', headline: '', description: '', hook: '',
                    mediaUrl: null, mediaType: strategy.mediaType, aiGenerated: false, isApproved: false
                }))
                setCreatives(slots)
            }
            setConfigSaved(true)
            setTab('creativos') // avanzar al siguiente tab automáticamente
            setSuccess('✓ Configuración guardada')
            setTimeout(() => setSuccess(null), 3000)
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch { setError('Error de conexión') }
        finally { setSavingConfig(false) }
    }

    async function handleFileUpload(slotIndex: number, file: File) {
        if (!campaign) {
            setError('Guarda la configuración primero antes de subir archivos')
            return
        }
        // Warn on very large files before attempting upload
        const maxMB = file.type.startsWith('video') ? 50 : 20
        if (file.size > maxMB * 1024 * 1024) {
            setError(`El archivo es demasiado grande. Máximo ${maxMB}MB para ${file.type.startsWith('video') ? 'videos' : 'imágenes'}.`)
            return
        }
        const blobUrl = URL.createObjectURL(file)
        setCreatives(prev => prev.map(c =>
            c.slotIndex === slotIndex ? { ...c, mediaUrl: blobUrl, mediaType: file.type.startsWith('video') ? 'video' : 'image', uploading: true } : c
        ))
        try {
            const creative = creatives.find(c => c.slotIndex === slotIndex)
            const fd = new FormData()
            fd.append('file', file)
            fd.append('slotIndex', String(slotIndex))
            if (creative?.id) fd.append('creativeId', creative.id)
            const res = await fetch(`/api/ads/campaign/${campaign.id}/upload`, { method: 'POST', body: fd })
            const data = await res.json()
            if (res.ok && data.mediaUrl) {
                setCreatives(prev => prev.map(c =>
                    c.slotIndex === slotIndex
                        ? {
                            ...c,
                            id: c.id || data.creativeId || null,
                            mediaUrl: data.mediaUrl,
                            mediaType: file.type.startsWith('video') ? 'video' : 'image',
                            uploading: false,
                            // Estado de pre-subida a Meta (video): 'processing' mientras Meta transcodifica
                            metaMediaStatus: data.metaMediaStatus ?? null,
                        }
                        : c
                ))
                URL.revokeObjectURL(blobUrl)
            } else {
                setError(data.error || 'Error al subir archivo')
                setCreatives(prev => prev.map(c => c.slotIndex === slotIndex ? { ...c, mediaUrl: null, uploading: false } : c))
                URL.revokeObjectURL(blobUrl)
            }
        } catch (e: any) {
            setError('Error de conexión al subir archivo. Verifica tu conexión e intenta de nuevo.')
            setCreatives(prev => prev.map(c => c.slotIndex === slotIndex ? { ...c, mediaUrl: null, uploading: false } : c))
        }
    }

    async function handleBulkRefImageUpload(file: File) {
        if (!campaign) return
        setUploadingBulkRef(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            fd.append('slotIndex', '0')
            const res = await fetch(`/api/ads/campaign/${campaign.id}/upload`, { method: 'POST', body: fd })
            const data = await res.json()
            if (res.ok && data.mediaUrl) {
                setBulkRefImageUrl(data.mediaUrl)
                // Apply to ALL slots so bulk generation uses this product photo as reference
                const allSlots: Record<number, string> = {}
                creatives.forEach((c: any) => { allSlots[c.slotIndex] = data.mediaUrl })
                setRefImageUrls(allSlots)
            } else {
                setError(data.error || 'Error al subir foto de referencia')
            }
        } catch {
            setError('Error de conexión al subir foto de referencia')
        } finally {
            setUploadingBulkRef(false)
        }
    }

    async function handleRefImageUpload(slotIndex: number, file: File) {
        if (!campaign) return
        setUploadingRefImage(prev => ({ ...prev, [slotIndex]: true }))
        try {
            const fd = new FormData()
            fd.append('file', file)
            fd.append('slotIndex', String(slotIndex))
            const res = await fetch(`/api/ads/campaign/${campaign.id}/upload`, { method: 'POST', body: fd })
            const data = await res.json()
            if (res.ok && data.mediaUrl) {
                setRefImageUrls(prev => ({ ...prev, [slotIndex]: data.mediaUrl }))
                // tu prompt queda libre: no autocompletar al subir la foto
            } else {
                setError(data.error || 'Error al subir foto de referencia')
            }
        } catch {
            setError('Error de conexión al subir foto de referencia')
        } finally {
            setUploadingRefImage(prev => ({ ...prev, [slotIndex]: false }))
        }
    }

    async function generateCopies() {
        if (!campaign) return
        setGeneratingCopies(true)
        setError(null)
        try {
            const res = await fetch(`/api/ads/campaign/${campaign.id}/copies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            })
            const data = await res.json()
            if (!res.ok) return setError(data.error || 'Error al generar copies')
            // Merge: preserve mediaUrl/mediaType/aiGenerated from current state so generated images are NOT lost
            setCreatives(prev => (data.creatives as any[]).map((c: any) => {
                const existing = prev.find(p => p.slotIndex === c.slotIndex)
                return {
                    ...c,
                    mediaUrl: existing?.mediaUrl || c.mediaUrl || null,
                    mediaType: existing?.mediaType || c.mediaType || 'image',
                    aiGenerated: existing?.aiGenerated || c.aiGenerated || false,
                }
            }))
            setCopiesGenerated(true)
        } catch { setError('Error de conexión') }
        finally { setGeneratingCopies(false) }
    }

    async function generateImage(slotIndex: number) {
        if (!campaign) return
        const hasRef = !!(refImageUrls[slotIndex] || creatives.find(c => c.slotIndex === slotIndex)?.mediaUrl?.startsWith('http'))
        if (!hasRef) { setError('Subí la foto de tu producto para generar este anuncio.'); return }
        const sizeMap: Record<string, string> = {
            square: '1024x1024', vertical: '1024x1536', horizontal: '1536x1024',
        }
        setGeneratingImages(prev => ({ ...prev, [slotIndex]: true }))
        setImageGenPanel(null)
        setError(null)
        try {
            const creative = creatives.find(c => c.slotIndex === slotIndex)
            const res = await fetch(`/api/ads/campaign/${campaign.id}/images`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slotIndex,
                    creativeId: creative?.id || undefined,
                    quality: imageQuality,
                    size: '1024x1024', // fijo 1:1 (sin opción de elegir)
                    customPrompt: imageCustomPrompts[slotIndex]?.trim() || undefined,
                    referenceImageUrl: refImageUrls[slotIndex] || undefined,
                    freePrompt: true, // tu prompt libre → gpt-image-2 tal cual (como el admin)
                })
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al generar imagen'); return }
            setCreatives(prev => prev.map(c =>
                c.slotIndex === slotIndex
                    ? { ...c, mediaUrl: data.imageUrl, mediaType: 'image', aiGenerated: true }
                    : c
            ))
        } catch { setError('Error al generar imagen con IA') }
        finally { setGeneratingImages(prev => ({ ...prev, [slotIndex]: false })) }
    }

    async function generateAllImages() {
        if (!campaign) return
        if (!bulkRefImageUrl && Object.keys(refImageUrls).length === 0) {
            setError('Subí la foto de tu producto antes de generar las imágenes.'); return
        }
        setShowBulkPanel(false)
        setBulkGenerating(true)
        setBulkProgress(0)
        const sizeMap: Record<string, string> = {
            square: '1024x1024', vertical: '1024x1536', horizontal: '1536x1024',
        }
        const slots = creatives
        const generating: Record<number, boolean> = {}
        slots.forEach(c => { generating[c.slotIndex] = true })
        setGeneratingImages(generating)

        let done = 0
        const CONCURRENCY = 3 // generar de a 3 (no todas de golpe → evita timeouts de OpenAI)
        const genOne = async (creative: any) => {
            try {
                const res = await fetch(`/api/ads/campaign/${campaign.id}/images`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        slotIndex: creative.slotIndex,
                        creativeId: creative.id || undefined,
                        quality: bulkQuality,
                        size: '1024x1024', // fijo 1:1
                        // Tu prompt libre (el del slot, o el masivo) → tal cual a gpt-image-2.
                        customPrompt: (imageCustomPrompts[creative.slotIndex]?.trim() || bulkUserPrompt?.trim()) || undefined,
                        referenceImageUrl: refImageUrls[creative.slotIndex] || bulkRefImageUrl || undefined,
                        freePrompt: true,
                    })
                })
                const data = await res.json()
                if (res.ok && data.imageUrl) {
                    setCreatives(prev => prev.map(c =>
                        c.slotIndex === creative.slotIndex
                            ? { ...c, mediaUrl: data.imageUrl, mediaType: 'image', aiGenerated: true }
                            : c
                    ))
                }
            } catch { /* non-fatal, slot stays empty */ }
            finally {
                done++
                setBulkProgress(done)
                setGeneratingImages(prev => ({ ...prev, [creative.slotIndex]: false }))
            }
        }
        for (let i = 0; i < slots.length; i += CONCURRENCY) {
            await Promise.all(slots.slice(i, i + CONCURRENCY).map(genOne))
        }
        setBulkGenerating(false)
    }

    async function suggestField(slotIndex: number, field: 'primaryText' | 'headline' | 'description') {
        if (!campaign) return
        const key = `${slotIndex}-${field}`
        setSuggestingField(key)
        setActiveSuggestionKey(null)
        try {
            const creative = creatives.find(c => c.slotIndex === slotIndex)
            const res = await fetch(`/api/ads/campaign/${campaign.id}/suggest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field, slotIndex, currentContent: creative?.[field] || '' })
            })
            const data = await res.json()
            if (res.ok) {
                setSuggestions(prev => ({ ...prev, [key]: data.suggestions }))
                setActiveSuggestionKey(key)
            } else {
                setError(data.error || 'Error al generar sugerencias')
            }
        } catch { setError('Error al generar sugerencias') }
        finally { setSuggestingField(null) }
    }

    function applySuggestion(slotIndex: number, field: string, text: string) {
        setCreatives(prev => prev.map((c, j) => j === slotIndex ? { ...c, [field]: text } : c))
        setActiveSuggestionKey(null)
    }

    // Auto-llena saludo + respuesta rápida con IA (cuando el destino es WhatsApp).
    // Corre en segundo plano; no bloquea la carga del editor.
    async function autoFillWhatsAppChat(campaignId: string) {
        for (const field of ['whatsappGreeting', 'quickReply'] as const) {
            try {
                setFillingChat(field)
                const res = await fetch(`/api/ads/campaign/${campaignId}/suggest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ field, currentContent: '' }),
                })
                const data = await res.json()
                const text = String(data.suggestions?.[0] || '').trim()
                if (text) {
                    if (field === 'whatsappGreeting') setForm(f => f.welcomeMessage ? f : ({ ...f, welcomeMessage: text.slice(0, 180) }))
                    else setForm(f => f.whatsappQuestion ? f : ({ ...f, whatsappQuestion: text.slice(0, 160) }))
                }
            } catch { /* silencioso */ }
            finally { setFillingChat(null) }
        }
    }

    async function fillChatWithAI(field: 'whatsappGreeting' | 'quickReply') {
        if (!campaign || fillingChat) return
        setFillingChat(field)
        try {
            const current = field === 'whatsappGreeting' ? form.welcomeMessage : form.whatsappQuestion
            const res = await fetch(`/api/ads/campaign/${campaign.id}/suggest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field, currentContent: current })
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al generar con IA'); return }
            const text = String(data.suggestions?.[0] || '').trim()
            if (!text) { setError('La IA no devolvió texto'); return }
            if (field === 'whatsappGreeting') setForm(f => ({ ...f, welcomeMessage: text.slice(0, 180) }))
            else setForm(f => ({ ...f, whatsappQuestion: text.slice(0, 160) }))
        } catch { setError('Error al generar con IA') }
        finally { setFillingChat(null) }
    }

    async function saveCopies() {
        if (!campaign) return
        try {
            await fetch(`/api/ads/campaign/${campaign.id}/copies`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creatives: creatives.filter(c => c.id) })
            })
        } catch { /* silent */ }
    }

    async function publish() {
        if (!campaign) return
        await saveCopies()
        setPublishing(true)
        setError(null)
        try {
            const res = await fetch(`/api/ads/campaign/${campaign.id}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    advantageAudience,
                    advantageCreative,
                    adFormat,
                    bidStrategy,
                    ...(bidStrategy === 'cost_cap' && bidCapAmount ? { bidCapAmount: parseFloat(bidCapAmount) } : {}),
                    ...(bidStrategy === 'min_roas' && minRoasTarget ? { minRoasTarget: parseFloat(minRoasTarget) } : {}),
                })
            })
            const data = await res.json()
            if (!res.ok) return setError(data.error || 'Error al publicar')
            setSuccess('¡Campaña publicada exitosamente!')
            setTimeout(() => router.push('/dashboard/services/ads/meta'), 2500)
        } catch { setError('Error al publicar') }
        finally { setPublishing(false) }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-[#6A35D9]" size={32} />
            </div>
        )
    }

    if (!strategy) return null

    const needsPage = strategy.platform === 'META'
    const needsWhatsApp = strategy.destination === 'whatsapp'
    const needsPixel = strategy.destination === 'website'
    const needsUrl = strategy.destination === 'website'
    const creativesReady = creatives.filter(c => c.mediaUrl).length
    const canPublish = campaign && copiesGenerated && creatives.some(c => c.primaryText) && campaign.status !== 'PUBLISHED' && campaign.status !== 'PUBLISHING'

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="px-4 md:px-6 xl:px-10 pt-6 max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto pb-36 text-[#111827]">

            {/* Overlay de publicación: cohete + barra de progreso */}
            <PublishProgress active={publishing} failed={!!error} />

            {/* ── Header ── */}
            <div className="flex items-center gap-3 mb-6"
                style={{ background: 'linear-gradient(135deg,rgba(106,53,217,0.1) 0%,rgba(35,59,143,0.05) 100%)', border: '1px solid rgba(106,53,217,0.18)', borderRadius: '1.5rem', padding: '1rem 1.25rem' }}>
                <button
                    onClick={() => { if (typeof window !== 'undefined' && window.history.length > 1) router.back(); else router.push('/dashboard/services/ads/meta') }}
                    className="w-9 h-9 shrink-0 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] flex items-center justify-center hover:bg-[#F0F3F7] transition-all"
                    title="Volver atrás">
                    <ArrowLeft size={15} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-black uppercase tracking-tighter truncate">{strategy.name}</h1>
                    <p className="text-[11px] text-[#9CA3AF] truncate">{brief?.name || 'Business Brief requerido'}</p>
                </div>
            </div>

            {/* Tabs del editor — Config / Creativos & Textos (el preview es el botón Publicar abajo) */}
            <div className="flex items-center gap-1.5 mb-4 p-1 rounded-2xl bg-[#F4F6FA] border border-[#E4E9F0]">
                {[
                    { id: 'config' as const, label: 'Configuración', done: configSaved, icon: Settings2, locked: false },
                    { id: 'creativos' as const, label: 'Creativos & Textos', done: creativesReady > 0 && copiesGenerated, icon: LayoutGrid, locked: !configSaved },
                ].map((t) => {
                    const active = tab === t.id
                    return (
                        <button key={t.id}
                            onClick={() => { if (!t.locked) setTab(t.id) }}
                            disabled={t.locked}
                            className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-gradient-to-br from-[#6A35D9]/90 to-[#233B8F]/80 text-white shadow-[0_0_18px_rgba(106,53,217,0.3)]' : t.locked ? 'text-[#9CA3AF] cursor-not-allowed' : 'text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F4F6FA]'}`}>
                            {t.done ? <CheckCircle2 size={12} className={active ? 'text-[#111827]' : 'text-[#059669]'} /> : <t.icon size={12} />}
                            {t.label}
                            {t.locked && <span className="text-[9px] opacity-60">🔒</span>}
                        </button>
                    )
                })}
            </div>

            {/* Platform badges */}
            <div className="flex flex-wrap items-center gap-2 mb-5 px-3 py-2.5 bg-[#F4F6FA] border border-[#E4E9F0] border-l-2 border-l-[#233B8F]/40 rounded-2xl">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#233B8F]/10 border border-[#E4E9F0] text-[#233B8F]">{strategy.platform}</span>
                <span className="text-[11px] text-[#9CA3AF] flex items-center gap-1">
                    {strategy.mediaType === 'video' ? <Video size={10} /> : <ImageIcon size={10} />}
                    {strategy.mediaCount} {strategy.mediaType === 'video' ? 'videos' : 'imágenes'}
                </span>
                <span className="text-[#9CA3AF]">·</span>
                <span className="text-[11px] text-[#9CA3AF] capitalize">{strategy.destination}</span>
                <span className="text-[#9CA3AF]">·</span>
                <span className="text-[11px] text-[#9CA3AF]">desde ${strategy.minBudgetUSD}/día</span>
            </div>

            {/* Alerts */}
            {error && (
                <div className="mb-4 p-3.5 bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-2xl text-[#DC2626] text-sm">
                    <div className="flex gap-3">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <p className="flex-1 text-[13px]">{error}</p>
                        <button onClick={() => setError(null)} className="text-xs font-bold shrink-0">✕</button>
                    </div>
                    {/(cr[eé]dit|saldo|api\s*key|openai)/i.test(error) && (
                        <div className="flex flex-wrap gap-2 mt-2.5 pl-[27px]">
                            <Link href="/dashboard/services/ads/setup" className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#F0F3F7] hover:bg-[#F0F3F7] text-[#111827] transition-all">Configurar mi API Key</Link>
                            <Link href="/dashboard/ai-credits" className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#6A35D9]/25 hover:bg-[#5A2BC0]/35 text-purple-100 transition-all">Comprar créditos de IA</Link>
                        </div>
                    )}
                </div>
            )}
            {success && (
                <div className="mb-4 p-3.5 bg-[#059669]/10 border border-[#059669]/20 rounded-2xl flex gap-3 text-[#059669] text-sm">
                    <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                    <p className="flex-1 text-[13px]">{success}</p>
                </div>
            )}

            {/* ══════════════════════════════════════════════
                SECCIÓN 1 — CONFIGURACIÓN
            ══════════════════════════════════════════════ */}
            <div className={`mb-4 rounded-3xl border transition-all overflow-hidden ${tab !== 'config' ? 'hidden' : ''} ${configSaved ? 'border-[#059669]/20' : 'border-[#E4E9F0]'}`}
                style={{ background: configSaved ? 'rgba(5,150,105,0.02)' : 'rgba(15,23,42,0.08)' }}>

                {/* Section header */}
                <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#E4E9F0]">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-black"
                        style={{ background: configSaved ? 'rgba(5,150,105,0.15)' : 'rgba(106,53,217,0.15)', color: configSaved ? '#059669' : '#9B70E7' }}>1</div>
                    <div className="flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] flex items-center gap-1.5">
                            <Settings2 size={10} /> Configuración
                            {configSaved && <span className="text-[#059669] font-bold flex items-center gap-1"><CheckCircle2 size={9} /> Guardada</span>}
                        </p>
                    </div>
                </div>

                <div className="p-5 space-y-5">
                    {/* Campaign name */}
                    <div>
                        <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest block mb-1.5">Nombre de la campaña</label>
                        <input
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2.5 text-sm text-[#111827] focus:outline-none focus:border-[#E4E9F0] transition-colors"
                        />
                    </div>

                    {/* Account + Page */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {accounts.length > 0 ? (
                            <div>
                                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest block mb-1.5">Cuenta Publicitaria</label>
                                <select
                                    value={form.providerAccountId}
                                    onChange={e => {
                                        const sel = accounts.find((a: any) => a.providerAccountId === e.target.value)
                                        setForm(f => ({ ...f, providerAccountId: e.target.value, providerAccountName: sel?.displayName || '', pixelId: '' }))
                                        if (strategy?.platform === 'META') fetchPixels(e.target.value)
                                    }}
                                    className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2.5 text-sm text-[#111827] focus:outline-none focus:border-[#E4E9F0] [&>option]:bg-white"
                                >
                                    {accounts.map((a: any) => (
                                        <option key={a.providerAccountId} value={a.providerAccountId}>{a.displayName}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="p-3 bg-[#D97706]/10 border border-[#D97706]/20 rounded-xl text-xs text-[#D97706]">
                                Sin cuenta conectada. <Link href="/dashboard/services/ads/setup?tab=platforms" className="underline font-bold">Conectar</Link>
                            </div>
                        )}

                        {needsPage && pages.length > 0 && (
                            <div>
                                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest block mb-1.5">Página de Facebook</label>
                                <select
                                    value={form.pageId}
                                    onChange={e => {
                                        const pid = e.target.value
                                        const selectedPage = pages.find((p: any) => p.id === pid)
                                        const saved = pid ? getWaPrefs()[pid] : ''
                                        setForm(f => ({ ...f, pageId: pid, whatsappNumber: selectedPage?.whatsappNumber || saved || '' }))
                                    }}
                                    className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2.5 text-sm text-[#111827] focus:outline-none focus:border-[#E4E9F0] [&>option]:bg-white"
                                >
                                    <option value="">Seleccionar página...</option>
                                    {pages.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}{p.whatsappNumber ? ` | ${p.whatsappNumber}` : ''}</option>
                                    ))}
                                </select>
                                {form.pageId && pages.find((p: any) => p.id === form.pageId)?.instagramUsername && (
                                    <div className="mt-1.5 flex items-center gap-2 px-2.5 py-1.5 bg-[#FF096C]/5 border border-[#E4E9F0] rounded-xl">
                                        <span className="text-[10px] font-bold text-[#FF096C]">IG</span>
                                        <span className="text-xs text-[#9CA3AF]">@{pages.find((p: any) => p.id === form.pageId)?.instagramUsername}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* WhatsApp */}
                    {needsWhatsApp && (
                        <div>
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest flex items-center gap-1 mb-1.5">
                                <Phone size={9} /> WhatsApp Business
                            </label>
                            {form.whatsappNumber ? (
                                <div className="flex items-center justify-between px-3 py-2.5 bg-[#059669]/5 border border-[#059669]/20 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <Phone size={12} className="text-[#059669]" />
                                        <span className="text-sm text-[#059669] font-mono">{form.whatsappNumber}</span>
                                    </div>
                                    <button onClick={() => setForm(f => ({ ...f, whatsappNumber: '' }))} className="text-[11px] text-[#9CA3AF] hover:text-[#111827]">Cambiar</button>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {(() => {
                                        const selPage = pages.find((p: any) => p.id === form.pageId)
                                        const pageNums: string[] = selPage?.whatsappNumbers?.length ? selPage.whatsappNumbers : selPage?.whatsappNumber ? [selPage.whatsappNumber] : []
                                        const nums = pageNums.length > 0 ? pageNums.map((ph: string) => ({ displayPhone: ph, name: '', id: ph })) : waNumbers
                                        if (nums.length > 0) return nums.map((n: any) => (
                                            <button key={n.id || n.displayPhone} type="button"
                                                onClick={() => { setForm(f => ({ ...f, whatsappNumber: n.displayPhone })); if (form.pageId) saveWaPref(form.pageId, n.displayPhone) }}
                                                className="w-full flex items-center justify-between px-3 py-2.5 bg-[#F4F6FA] border border-[#E4E9F0] hover:border-[#059669]/40 hover:bg-[#047857]/5 rounded-xl transition-all text-left">
                                                <div className="flex items-center gap-2">
                                                    <Phone size={12} className="text-[#059669]/60" />
                                                    <span className="text-sm font-mono text-[#6B7280]">{n.displayPhone}</span>
                                                    {n.name && <span className="text-[11px] text-[#9CA3AF]">{n.name}</span>}
                                                </div>
                                                {n.status && <span className={`text-[10px] font-bold uppercase ${n.status === 'CONNECTED' ? 'text-[#059669]' : 'text-[#D97706]'}`}>{n.status}</span>}
                                            </button>
                                        ))
                                        return null
                                    })()}
                                    <input
                                        value={form.whatsappNumber}
                                        onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))}
                                        onBlur={e => { if (form.pageId && e.target.value) saveWaPref(form.pageId, e.target.value) }}
                                        placeholder="+573001234567"
                                        className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2.5 text-sm text-[#111827] focus:outline-none focus:border-[#059669]/50 placeholder:text-[#9CA3AF]"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* WhatsApp chat editor */}
                    {needsWhatsApp && (
                        <div className="rounded-2xl border border-[#059669]/15 bg-[#059669]/3 p-4 space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#059669] flex items-center gap-1.5">
                                <Phone size={10} /> Editor de chat WhatsApp
                            </p>
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Saludo</label>
                                    <button type="button" onClick={() => fillChatWithAI('whatsappGreeting')} disabled={!!fillingChat}
                                        className="flex items-center gap-1 text-[10px] font-bold text-[#6A35D9] hover:text-purple-200 disabled:opacity-50 transition-colors">
                                        {fillingChat === 'whatsappGreeting' ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                        Llenar con IA
                                    </button>
                                </div>
                                <textarea
                                    value={form.welcomeMessage}
                                    onChange={e => setForm(f => ({ ...f, welcomeMessage: e.target.value.slice(0, 180) }))}
                                    placeholder="Ej: ¡Hola! ¿Cómo podemos ayudarte? 👋"
                                    rows={2}
                                    maxLength={180}
                                    className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2.5 text-sm text-[#111827] focus:outline-none focus:border-[#059669]/50 placeholder:text-[#9CA3AF] resize-none"
                                />
                                <p className="text-[9px] text-[#9CA3AF] mt-1">{180 - form.welcomeMessage.length} caracteres restantes</p>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Botón de respuesta rápida</label>
                                    <button type="button" onClick={() => fillChatWithAI('quickReply')} disabled={!!fillingChat}
                                        className="flex items-center gap-1 text-[10px] font-bold text-[#6A35D9] hover:text-purple-200 disabled:opacity-50 transition-colors">
                                        {fillingChat === 'quickReply' ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                        Llenar con IA
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={form.whatsappQuestion}
                                    onChange={e => setForm(f => ({ ...f, whatsappQuestion: e.target.value.slice(0, 160) }))}
                                    placeholder="Ej: Quiero más información"
                                    maxLength={160}
                                    className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2.5 text-sm text-[#111827] focus:outline-none focus:border-[#059669]/50 placeholder:text-[#9CA3AF]"
                                />
                                <p className="text-[9px] text-[#9CA3AF] mt-1">{160 - form.whatsappQuestion.length} caracteres restantes</p>
                            </div>
                            {(form.welcomeMessage || form.whatsappQuestion) && (
                                <div className="rounded-xl bg-white border border-[#059669]/20 p-3 space-y-2">
                                    <p className="text-[9px] font-bold text-[#059669]/60 uppercase tracking-widest mb-1">Vista previa</p>
                                    {form.welcomeMessage && (
                                        <div className="inline-block bg-[#F0F3F7] rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                                            <p className="text-xs text-[#6B7280] leading-relaxed">{form.welcomeMessage}</p>
                                        </div>
                                    )}
                                    {form.whatsappQuestion && (
                                        <div className="flex">
                                            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full border border-[#059669]/40 text-[#059669] bg-[#059669]/10">
                                                {form.whatsappQuestion}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pixel + URL */}
                    {needsPixel && pixels.length > 0 && (
                        <div>
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest block mb-1.5">Pixel de seguimiento <span className="text-[#6A35D9]/50 normal-case font-normal">· señal de conversión</span></label>
                            <select value={form.pixelId} onChange={e => setForm(f => ({ ...f, pixelId: e.target.value }))}
                                className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2.5 text-sm text-[#111827] focus:outline-none focus:border-[#E4E9F0] [&>option]:bg-white">
                                <option value="">Sin pixel</option>
                                {pixels.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}
                    {/* Aviso de SEÑAL (Andromeda): ventas sin píxel → Meta optimiza por clics, no por compras */}
                    {(strategy?.objective === 'conversions' || form.objective === 'conversions') && !form.pixelId && (
                        <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.22)' }}>
                            <span className="text-[#D97706] shrink-0">⚠️</span>
                            <p className="text-[11px] text-amber-200/90 leading-relaxed">
                                Para optimizar por <b>VENTAS</b> conviene seleccionar tu <b>Píxel</b>: es la <b>señal</b> que Andromeda usa para encontrar compradores. Sin píxel, Meta optimiza por <b>clics</b> (no por compras). {pixels.length === 0 && 'No encontramos píxeles — creá uno en el Administrador de Eventos de Meta y reconectá.'}
                            </p>
                        </div>
                    )}
                    {needsUrl && (
                        <div>
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest block mb-1.5">URL de destino</label>
                            <input value={form.destinationUrl} onChange={e => setForm(f => ({ ...f, destinationUrl: e.target.value }))}
                                placeholder="https://tusitio.com"
                                className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2.5 text-sm text-[#111827] focus:outline-none focus:border-[#E4E9F0] placeholder:text-[#9CA3AF]" />
                        </div>
                    )}

                    {/* Budget + Locations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest flex items-center gap-1 mb-2">
                                <DollarSign size={9} /> Presupuesto diario
                            </label>
                            <div className="space-y-1.5">
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-lg font-black pointer-events-none">$</span>
                                    <input
                                        type="number"
                                        min={strategy.minBudgetUSD}
                                        step="0.5"
                                        inputMode="decimal"
                                        value={form.dailyBudgetUSD}
                                        onChange={e => setForm(f => ({ ...f, dailyBudgetUSD: e.target.value }))}
                                        className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl pl-7 pr-20 py-2.5 text-xl font-black text-[#111827] focus:outline-none focus:border-[#E4E9F0]"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF] pointer-events-none">USD/día</span>
                                </div>
                                <p className="text-[10px] text-[#9CA3AF]">Mínimo recomendado: ${strategy.minBudgetUSD}/día</p>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest flex items-center gap-1 mb-2">
                                <MapPin size={9} /> Ubicaciones <span className="font-normal text-[#9CA3AF] normal-case tracking-normal">(opcional)</span>
                            </label>
                            <LocationSelector
                                selected={form.locations}
                                onChange={locs => setForm(f => ({ ...f, locations: locs }))}
                                platform={strategy?.platform || 'META'}
                            />
                        </div>
                    </div>

                    {/* Advanced options toggle */}
                    <button
                        onClick={() => setShowAdvanced(v => !v)}
                        className="flex items-center gap-2 text-[11px] font-bold text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                    >
                        <Cpu size={11} />
                        Opciones avanzadas
                        {showAdvanced ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>

                    {showAdvanced && (
                        <div className="rounded-2xl border border-[#E4E9F0] bg-[#6A35D9]/3 p-4 space-y-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6A35D9] flex items-center gap-1.5">
                                <Bot size={10} /> Optimización IA
                            </p>

                            {/* Ad Format — carousel not supported for messaging destinations */}
                            {!['whatsapp', 'messenger', 'instagram'].includes(strategy?.destination) && (
                                <div>
                                    <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest block mb-2">Formato del anuncio</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {([
                                            { key: 'single', label: 'Imagen única', desc: 'Un anuncio por variación', icon: ImageIcon },
                                            { key: 'carousel', label: 'Carrusel', desc: 'Todas las variaciones en un carrusel', icon: Layers },
                                        ] as const).map(opt => (
                                            <button key={opt.key} onClick={() => setAdFormat(opt.key)}
                                                className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${adFormat === opt.key ? 'bg-[#6A35D9]/15 border-[#E4E9F0]' : 'bg-[#F4F6FA] border-[#E4E9F0] hover:border-[#E4E9F0]'}`}>
                                                <opt.icon size={12} className={adFormat === opt.key ? 'text-[#6A35D9]' : 'text-[#9CA3AF]'} />
                                                <span className={`text-[11px] font-bold ${adFormat === opt.key ? 'text-[#6A35D9]' : 'text-[#9CA3AF]'}`}>{opt.label}</span>
                                                <span className="text-[9px] text-[#9CA3AF] leading-tight">{opt.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Advantage+ Audience */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-[#6B7280]">Advantage+ Audience</p>
                                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">Meta usa IA para encontrar la mejor audiencia automáticamente, expandiendo más allá de los intereses definidos.</p>
                                </div>
                                <button
                                    onClick={() => setAdvantageAudience(v => !v)}
                                    className={`shrink-0 w-11 h-6 rounded-full border transition-all relative ${advantageAudience ? 'bg-[#6A35D9] border-[#E4E9F0]' : 'bg-[#F0F3F7] border-[#E4E9F0]'}`}
                                >
                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${advantageAudience ? 'left-5' : 'left-0.5'}`} />
                                </button>
                            </div>

                            {/* Advantage+ Creative */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-[#6B7280]">Advantage+ Creative</p>
                                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">Meta mejora automáticamente tus creativos con IA (recorte, plantillas, ajustes de imagen) para maximizar el rendimiento.</p>
                                </div>
                                <button
                                    onClick={() => setAdvantageCreative(v => !v)}
                                    className={`shrink-0 w-11 h-6 rounded-full border transition-all relative ${advantageCreative ? 'bg-[#233B8F] border-[#E4E9F0]' : 'bg-[#F0F3F7] border-[#E4E9F0]'}`}
                                >
                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${advantageCreative ? 'left-5' : 'left-0.5'}`} />
                                </button>
                            </div>

                            {/* Bid strategy */}
                            <div>
                                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest block mb-2">Estrategia de puja</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {([
                                        { key: 'auto', label: 'Automática', desc: 'Meta optimiza sola', icon: Zap },
                                        { key: 'cost_cap', label: 'Costo máx.', desc: 'Limita costo/resultado', icon: Coins },
                                        { key: 'min_roas', label: 'ROAS mín.', desc: 'Retorno garantizado', icon: TrendingUp },
                                    ] as const).map(opt => (
                                        <button key={opt.key} onClick={() => setBidStrategy(opt.key)}
                                            className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${bidStrategy === opt.key ? 'bg-[#6A35D9]/15 border-[#E4E9F0]' : 'bg-[#F4F6FA] border-[#E4E9F0] hover:border-[#E4E9F0]'}`}>
                                            <opt.icon size={12} className={bidStrategy === opt.key ? 'text-[#6A35D9]' : 'text-[#9CA3AF]'} />
                                            <span className={`text-[11px] font-bold ${bidStrategy === opt.key ? 'text-[#6A35D9]' : 'text-[#9CA3AF]'}`}>{opt.label}</span>
                                            <span className="text-[9px] text-[#9CA3AF] leading-tight">{opt.desc}</span>
                                        </button>
                                    ))}
                                </div>
                                {bidStrategy === 'cost_cap' && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-xs text-[#9CA3AF]">Costo máx. por resultado:</span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-[#9CA3AF]">$</span>
                                            <input type="number" value={bidCapAmount} onChange={e => setBidCapAmount(e.target.value)}
                                                placeholder="5.00" min="0.5" step="0.5"
                                                className="w-20 bg-[#F4F6FA] border border-[#E4E9F0] rounded-lg px-2 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#E4E9F0]" />
                                            <span className="text-xs text-[#9CA3AF]">USD</span>
                                        </div>
                                    </div>
                                )}
                                {bidStrategy === 'min_roas' && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-xs text-[#9CA3AF]">ROAS mínimo:</span>
                                        <div className="flex items-center gap-1">
                                            <input type="number" value={minRoasTarget} onChange={e => setMinRoasTarget(e.target.value)}
                                                placeholder="2.0" min="1" step="0.1"
                                                className="w-20 bg-[#F4F6FA] border border-[#E4E9F0] rounded-lg px-2 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#E4E9F0]" />
                                            <span className="text-xs text-[#9CA3AF]">x retorno</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Save button */}
                    <button onClick={saveConfig} disabled={savingConfig || !form.providerAccountId || !form.name.trim()}
                        className="w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        style={{ background: 'linear-gradient(135deg,#6A35D9,#233B8F)', boxShadow: '0 0 24px rgba(106,53,217,0.3)' }}>
                        {savingConfig
                            ? <><Loader2 size={15} className="animate-spin" /> Guardando...</>
                            : configSaved
                                ? <><CheckCircle2 size={15} /> Actualizar configuración</>
                                : <><Zap size={15} /> Guardar y continuar</>
                        }
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════
                SECCIÓN 2 — CREATIVOS & TEXTOS
            ══════════════════════════════════════════════ */}
            <div ref={creativesRef} className={`mb-4 rounded-3xl border transition-all overflow-hidden relative ${tab !== 'creativos' ? 'hidden' : ''} ${!configSaved ? 'border-[#E4E9F0]' : 'border-[#E4E9F0]'}`}
                style={{ background: 'rgba(15,23,42,0.08)' }}>

                {!configSaved && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl">
                        <div className="px-4 py-2.5 rounded-xl bg-[#081624]/70 border border-[#E4E9F0] backdrop-blur-sm flex items-center gap-2">
                            <Settings2 size={12} className="text-[#9CA3AF]" />
                            <span className="text-xs text-[#9CA3AF] font-bold">Guarda la configuración primero</span>
                        </div>
                    </div>
                )}

                <div className={!configSaved ? 'opacity-20 pointer-events-none select-none' : ''}>
                    {/* Section header */}
                    <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#E4E9F0]">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-black"
                            style={{ background: 'rgba(106,53,217,0.15)', color: '#9B70E7' }}>2</div>
                        <div className="flex-1">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] flex items-center gap-1.5">
                                <LayoutGrid size={10} /> Creativos & Textos
                                {configSaved && <span className="text-[#9CA3AF] font-normal">({creativesReady}/{strategy.mediaCount} imágenes · {copiesGenerated ? 'textos generados' : 'textos pendientes'})</span>}
                            </p>
                        </div>
                    </div>

                    <div className="p-5 space-y-5">
                        {/* ── Bulk AI Image Generation ── */}
                        {strategy.mediaType !== 'video' && configSaved && (
                            <div>
                                {!showBulkPanel ? (
                                    <button onClick={() => setShowBulkPanel(true)}
                                        className="btn-ai-glass w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-sm text-[#111827]">
                                        <Sparkles size={16} />
                                        ✨ Generar todas las imágenes con IA
                                        <span className="text-[11px] font-normal text-[#6B7280]">({strategy.mediaCount} imágenes)</span>
                                    </button>
                                ) : (
                                    <div className="rounded-2xl border border-[#E4E9F0] bg-[#6A35D9]/5 p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[11px] font-bold text-[#6A35D9] uppercase tracking-widest flex items-center gap-1.5">
                                                <Sparkles size={10} /> Generar {strategy.mediaCount} imágenes con IA
                                            </p>
                                            <button onClick={() => setShowBulkPanel(false)} className="text-[#9CA3AF] hover:text-[#111827]"><X size={13} /></button>
                                        </div>

                                        {/* Auto style info */}
                                        <div className="flex items-center gap-2 px-3 py-2 bg-[#6A35D9]/8 border border-[#E4E9F0] rounded-xl">
                                            <Sparkles size={10} className="text-[#6A35D9] shrink-0" />
                                            <p className="text-[9px] text-[#6A35D9]">La IA elige automáticamente el mejor estilo para cada imagen según la estrategia y el brief del negocio</p>
                                        </div>

                                        {/* Bulk product photo reference (OBLIGATORIA) */}
                                        <div>
                                            <p className="text-[9px] font-bold uppercase mb-2 flex items-center gap-1.5">
                                                <span className="text-[#9CA3AF]">Foto del producto</span>
                                                <span className="text-[#D97706]">· obligatoria</span>
                                            </p>
                                            <input ref={bulkRefFileRef} type="file" accept="image/*" className="hidden"
                                                onChange={e => { if (e.target.files?.[0]) handleBulkRefImageUpload(e.target.files[0]); e.currentTarget.value = '' }} />
                                            {bulkRefImageUrl ? (
                                                <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-[#059669]/25 bg-[#059669]/5">
                                                    <img src={bulkRefImageUrl} alt="ref" className="w-full max-h-40 rounded-lg object-contain bg-[#081624]/20 border border-[#E4E9F0]" />
                                                    <div className="flex items-center justify-between">
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] text-[#059669] font-bold">✓ Foto cargada para todos los slots</p>
                                                            <p className="text-[9px] text-[#9CA3AF]">La IA usará esta imagen como referencia del producto</p>
                                                        </div>
                                                        <button onClick={() => { setBulkRefImageUrl(''); setRefImageUrls({}) }} className="text-[#9CA3AF] hover:text-[#DC2626] text-xs shrink-0 ml-2">✕</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => bulkRefFileRef.current?.click()} disabled={uploadingBulkRef}
                                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[#E4E9F0] bg-[#F4F6FA] hover:bg-[#F4F6FA] hover:border-[#E4E9F0] transition-all text-[10px] font-bold text-[#9CA3AF] disabled:opacity-50">
                                                    {uploadingBulkRef ? <><Loader2 size={11} className="animate-spin" /> Subiendo...</> : <><Upload size={11} /> Subir foto del producto</>}
                                                </button>
                                            )}
                                        </div>

                                        {/* Calidad fija: Rápida (sin selector) */}

                                        {/* PASO 2: generar prompt (glass) + manual — lado a lado, también en teléfono.
                                            Se desbloquean solo cuando hay foto subida. */}
                                        <div>
                                            <div className="flex items-stretch gap-2">
                                                <button onClick={generateDiversePrompts} disabled={aiPromptLoading || !bulkRefImageUrl}
                                                    title="Generar prompt según mi estrategia con IA"
                                                    className="btn-ai-glass flex-1 min-w-0 flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[12.5px] font-black text-[#111827] leading-tight text-center disabled:opacity-40 disabled:cursor-not-allowed">
                                                    {aiPromptLoading ? <Loader2 size={15} className="shrink-0 animate-spin" /> : <Sparkles size={15} className="shrink-0" />}
                                                    <span>{aiPromptLoading ? 'Creando…' : 'Generar prompt según mi estrategia con AI'}</span>
                                                </button>
                                                <button onClick={() => setShowManualPrompt(v => !v)} disabled={!bulkRefImageUrl}
                                                    title="Escribir mi propio prompt (manual)"
                                                    className={`shrink-0 flex items-center gap-1.5 px-3.5 py-3 rounded-2xl text-[12px] font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${showManualPrompt ? 'bg-[#6A35D9]/25 border-[#E4E9F0] text-purple-100' : 'bg-[#6A35D9]/12 border-[#E4E9F0] text-purple-200 hover:bg-[#5A2BC0]/20'}`}>
                                                    <FileText size={14} /> <span>Manual</span>
                                                </button>
                                            </div>
                                            <p className="text-[9px] text-[#9CA3AF] mt-1.5 leading-snug">Cada anuncio con un <b className="text-[#6A35D9]/80">ángulo único</b> (problema · solución · producto · lifestyle) → más rendimiento en Meta <span className="text-[#9CA3AF]">(Andromeda)</span>.</p>

                                            {showManualPrompt && (
                                                <div className="mt-2.5">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-[8px] text-[#9CA3AF] uppercase tracking-widest">Tu prompt manual</p>
                                                        <button onClick={() => generateAiPrompt()} disabled={aiPromptLoading}
                                                            className="text-[8px] text-[#9CA3AF] hover:text-[#6B7280] flex items-center gap-1 disabled:opacity-40">
                                                            {aiPromptLoading ? <Loader2 size={8} className="animate-spin" /> : <Sparkles size={8} />} con IA
                                                        </button>
                                                    </div>
                                                    <textarea value={bulkUserPrompt} onChange={e => setBulkUserPrompt(e.target.value)}
                                                        rows={3} placeholder="Escribí qué imagen querés (se manda tal cual a gpt-image-2 con tu foto)."
                                                        className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2 text-[10px] text-[#6B7280] resize-none focus:outline-none focus:border-[#E4E9F0] leading-relaxed placeholder:text-[#9CA3AF]" />
                                                </div>
                                            )}
                                        </div>

                                        {bulkGenerating && (
                                            <div className="flex items-center gap-3 p-3 bg-[#6A35D9]/10 border border-[#E4E9F0] rounded-xl">
                                                <Loader2 size={14} className="animate-spin text-[#6A35D9] shrink-0" />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[11px] text-[#6A35D9] font-bold">Generando imágenes...</span>
                                                        <span className="text-[11px] text-[#6A35D9]">{bulkProgress}/{strategy.mediaCount}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-[#F0F3F7] rounded-full overflow-hidden">
                                                        <div className="h-full bg-[#6A35D9] rounded-full transition-all" style={{ width: `${(bulkProgress / strategy.mediaCount) * 100}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Ayudas según el paso del flujo */}
                                        {!bulkGenerating && !bulkRefImageUrl && (
                                            <p className="text-[10px] text-[#D97706]/80 text-center flex items-center justify-center gap-1.5">
                                                <Upload size={11} /> Paso 1: subí la foto de tu producto
                                            </p>
                                        )}
                                        {!bulkGenerating && bulkRefImageUrl && Object.keys(imageCustomPrompts).length === 0 && !bulkUserPrompt.trim() && (
                                            <p className="text-[10px] text-[#6A35D9]/80 text-center flex items-center justify-center gap-1.5">
                                                <Sparkles size={11} /> Paso 2: generá el prompt (con AI o manual) para continuar
                                            </p>
                                        )}
                                        {/* PASO 3: generar imágenes — se desbloquea con foto + prompt listo */}
                                        <button onClick={generateAllImages}
                                            disabled={bulkGenerating || !bulkRefImageUrl || (Object.keys(imageCustomPrompts).length === 0 && !bulkUserPrompt.trim())}
                                            className="btn-ai-glass w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-[#111827] disabled:opacity-40 disabled:cursor-not-allowed">
                                            {bulkGenerating
                                                ? <><Loader2 size={16} className="animate-spin" /> Creando tus creativos…</>
                                                : <><Sparkles size={16} /> Generar mis creativos publicitarios con AI</>
                                            }
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Creative cards grid (cuadros, como estrategias) ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                            {(configSaved ? creatives : Array.from({ length: strategy.mediaCount }, (_, i) => ({ slotIndex: i, mediaUrl: null, primaryText: '', headline: '', description: '', hook: '', hashtags: '' }))).map((creative: any, i: number) => (
                                <div key={i} className="rounded-2xl border border-[#E4E9F0] bg-[#F4F6FA] overflow-hidden">
                                    {/* Card header */}
                                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#E4E9F0]">
                                        <span className="text-[10px] font-black text-[#9CA3AF] uppercase">Anuncio #{i + 1}</span>
                                        {creative.aiGenerated && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#6A35D9]/10 border border-[#E4E9F0] text-[#6A35D9]">IA</span>}
                                        {creative.mediaUrl && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#059669]/10 border border-[#059669]/20 text-[#059669] flex items-center gap-1"><CheckCircle2 size={8} /> Imagen</span>}
                                        {creative.primaryText && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#233B8F]/10 border border-[#E4E9F0] text-[#233B8F] flex items-center gap-1"><FileText size={8} /> Texto</span>}
                                    </div>

                                    <div className="flex flex-col">
                                        {/* Image column */}
                                        <div className="p-3">
                                            <div className="aspect-square rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] overflow-hidden relative group">
                                                {generatingImages[i] ? (
                                                    <AiGeneratingOverlay />
                                                ) : creative.mediaUrl ? (
                                                    <>
                                                        {creative.mediaType === 'video'
                                                            ? <video key={creative.mediaUrl} src={creative.mediaUrl} className="w-full h-full object-cover" controls playsInline />
                                                            : <img src={creative.mediaUrl} alt="" className="w-full h-full object-cover" />
                                                        }
                                                        {creative.uploading && (
                                                            <div className="absolute inset-0 bg-[#081624]/60 flex items-center justify-center">
                                                                <Loader2 size={18} className="animate-spin text-[#6B7280]" />
                                                            </div>
                                                        )}
                                                        {/* Estado de pre-subida del VIDEO a Meta (para publicar rápido) */}
                                                        {!creative.uploading && creative.mediaType === 'video' && creative.metaMediaStatus && (
                                                            <div className="absolute top-1.5 left-1.5 z-10">
                                                                {creative.metaMediaStatus === 'processing' && (
                                                                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold bg-[#D97706]/85 text-black">
                                                                        <Loader2 size={9} className="animate-spin" /> Preparando video…
                                                                    </span>
                                                                )}
                                                                {creative.metaMediaStatus === 'ready' && (
                                                                    <span className="px-2 py-1 rounded-lg text-[9px] font-bold bg-[#059669]/90 text-black">✓ Listo para publicar</span>
                                                                )}
                                                                {creative.metaMediaStatus === 'error' && (
                                                                    <span className="px-2 py-1 rounded-lg text-[9px] font-bold bg-[#DC2626]/90 text-white">⚠ Error al preparar</span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {!creative.uploading && (
                                                            <div className="absolute inset-0 bg-[#081624]/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                                                                <button onClick={() => fileRefs.current[i]?.click()} className="p-2 rounded-xl bg-[#F0F3F7] hover:bg-white/40" title="Cambiar">
                                                                    <Upload size={12} />
                                                                </button>
                                                                {creative.mediaType !== 'video' && creative.mediaUrl?.startsWith('http') && (
                                                                    <button onClick={() => downloadImage(creative.mediaUrl, `anuncio-${i + 1}.png`)} className="p-2 rounded-xl bg-[#F0F3F7] hover:bg-white/40" title="Descargar imagen">
                                                                        <Download size={12} />
                                                                    </button>
                                                                )}
                                                                {strategy.mediaType !== 'video' && (
                                                                    <button onClick={() => {
                                                                        setImageGenPanel(imageGenPanel === i ? null : i)
                                                                        // tu prompt queda libre: no autocompletar
                                                                    }} className="p-2 rounded-xl bg-[#6A35D9]/40 hover:bg-[#5A2BC0]/60" title="Regenerar con IA">
                                                                        <Wand2 size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                                        <div className="flex flex-col gap-1.5">
                                                            <button onClick={() => fileRefs.current[i]?.click()}
                                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] hover:bg-[#F0F3F7] transition-all text-[10px] font-bold text-[#9CA3AF]">
                                                                <Upload size={11} /> Subir
                                                            </button>
                                                            {strategy.mediaType !== 'video' && configSaved && (
                                                                <button onClick={() => {
                                                                    setImageGenPanel(imageGenPanel === i ? null : i)
                                                                    // tu prompt queda libre: no autocompletar
                                                                }}
                                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#6A35D9]/10 border border-[#E4E9F0] hover:bg-[#5A2BC0]/20 transition-all text-[10px] font-bold text-[#6A35D9]">
                                                                    <Wand2 size={11} /> IA
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {configSaved && (
                                                    <input ref={el => { fileRefs.current[i] = el }} type="file"
                                                        accept={strategy.mediaType === 'video' ? 'video/*' : 'image/*,video/*'}
                                                        className="hidden"
                                                        onChange={e => { if (e.target.files?.[0]) handleFileUpload(i, e.target.files[0]) }} />
                                                )}
                                            </div>

                                            {/* Mobile action buttons */}
                                            {creative.mediaUrl && !creative.uploading && configSaved && (
                                                <div className="flex md:hidden gap-1.5 mt-2">
                                                    <button onClick={() => fileRefs.current[i]?.click()}
                                                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] text-[10px] font-bold text-[#9CA3AF]">
                                                        <Upload size={10} /> Cambiar
                                                    </button>
                                                    {creative.mediaType !== 'video' && creative.mediaUrl?.startsWith('http') && (
                                                        <button onClick={() => downloadImage(creative.mediaUrl, `anuncio-${i + 1}.png`)}
                                                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] text-[10px] font-bold text-[#9CA3AF]">
                                                            <Download size={10} /> Descargar
                                                        </button>
                                                    )}
                                                    {strategy.mediaType !== 'video' && (
                                                        <button onClick={() => {
                                                            setImageGenPanel(imageGenPanel === i ? null : i)
                                                            // tu prompt queda libre: no autocompletar
                                                        }}
                                                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-[#6A35D9]/10 border border-[#E4E9F0] text-[10px] font-bold text-[#6A35D9]">
                                                            <Wand2 size={10} /> IA
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Text fields column */}
                                        <div className="flex-1 p-3 space-y-3 min-w-0">
                                            {/* Hook badge */}
                                            {creative.hook && (
                                                <div className="px-3 py-2 bg-[#6A35D9]/5 border border-[#E4E9F0] rounded-xl">
                                                    <p className="text-[9px] text-[#6A35D9] font-bold uppercase mb-0.5">Hook</p>
                                                    <p className="text-xs text-[#9CA3AF] italic leading-relaxed">"{creative.hook}"</p>
                                                </div>
                                            )}

                                            {/* Primary text */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest">Texto Principal</label>
                                                    {configSaved && copiesGenerated && (
                                                        <button
                                                            onClick={() => suggestField(i, 'primaryText')}
                                                            disabled={suggestingField === `${i}-primaryText`}
                                                            className="flex items-center gap-1 text-[9px] font-bold text-[#6A35D9]/70 hover:text-[#6A35D9] disabled:opacity-40 transition-colors"
                                                        >
                                                            {suggestingField === `${i}-primaryText`
                                                                ? <Loader2 size={9} className="animate-spin" />
                                                                : <Sparkles size={9} />
                                                            }
                                                            {suggestingField === `${i}-primaryText` ? 'Generando...' : '✨ Sugerir'}
                                                        </button>
                                                    )}
                                                </div>
                                                <textarea
                                                    value={creative.primaryText || ''}
                                                    onChange={e => setCreatives(prev => prev.map((c, j) => j === i ? { ...c, primaryText: e.target.value } : c))}
                                                    rows={4}
                                                    placeholder={copiesGenerated ? '' : 'Genera los textos con IA o escribe manualmente...'}
                                                    className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2 text-xs text-[#111827] resize-none focus:outline-none focus:border-[#E4E9F0] leading-relaxed placeholder:text-[#9CA3AF]"
                                                />
                                                {/* Suggestions dropdown */}
                                                {activeSuggestionKey === `${i}-primaryText` && suggestions[`${i}-primaryText`] && (
                                                    <div className="mt-1.5 rounded-xl border border-[#E4E9F0] bg-white overflow-hidden">
                                                        <div className="flex items-center justify-between px-3 py-2 border-b border-[#E4E9F0]">
                                                            <p className="text-[9px] font-bold text-[#6A35D9] uppercase">3 opciones — elige una</p>
                                                            <button onClick={() => setActiveSuggestionKey(null)} className="text-[#9CA3AF] hover:text-[#111827]"><X size={10} /></button>
                                                        </div>
                                                        {suggestions[`${i}-primaryText`].map((s, si) => (
                                                            <button key={si} onClick={() => applySuggestion(i, 'primaryText', s)}
                                                                className="w-full text-left px-3 py-2.5 hover:bg-[#5A2BC0]/10 border-b border-[#E4E9F0] last:border-0 transition-colors">
                                                                <p className="text-[11px] text-[#6B7280] leading-relaxed line-clamp-3">{s}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Headline + Description */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest">Titular</label>
                                                        {configSaved && copiesGenerated && (
                                                            <button onClick={() => suggestField(i, 'headline')} disabled={suggestingField === `${i}-headline`}
                                                                className="flex items-center gap-1 text-[9px] font-bold text-[#6A35D9]/70 hover:text-[#6A35D9] disabled:opacity-40 transition-colors">
                                                                {suggestingField === `${i}-headline` ? <Loader2 size={9} className="animate-spin" /> : <Sparkles size={9} />}
                                                                ✨
                                                            </button>
                                                        )}
                                                    </div>
                                                    <input value={creative.headline || ''}
                                                        onChange={e => setCreatives(prev => prev.map((c, j) => j === i ? { ...c, headline: e.target.value } : c))}
                                                        className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#E4E9F0]" />
                                                    {activeSuggestionKey === `${i}-headline` && suggestions[`${i}-headline`] && (
                                                        <div className="mt-1 rounded-xl border border-[#E4E9F0] bg-white overflow-hidden">
                                                            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#E4E9F0]">
                                                                <p className="text-[9px] font-bold text-[#6A35D9] uppercase">Opciones</p>
                                                                <button onClick={() => setActiveSuggestionKey(null)} className="text-[#9CA3AF] hover:text-[#111827]"><X size={9} /></button>
                                                            </div>
                                                            {suggestions[`${i}-headline`].map((s, si) => (
                                                                <button key={si} onClick={() => applySuggestion(i, 'headline', s)}
                                                                    className="w-full text-left px-2.5 py-2 hover:bg-[#5A2BC0]/10 border-b border-[#E4E9F0] last:border-0 transition-colors">
                                                                    <p className="text-[11px] text-[#6B7280]">{s}</p>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest">Descripción</label>
                                                        {configSaved && copiesGenerated && (
                                                            <button onClick={() => suggestField(i, 'description')} disabled={suggestingField === `${i}-description`}
                                                                className="flex items-center gap-1 text-[9px] font-bold text-[#6A35D9]/70 hover:text-[#6A35D9] disabled:opacity-40 transition-colors">
                                                                {suggestingField === `${i}-description` ? <Loader2 size={9} className="animate-spin" /> : <Sparkles size={9} />}
                                                                ✨
                                                            </button>
                                                        )}
                                                    </div>
                                                    <input value={creative.description || ''}
                                                        onChange={e => setCreatives(prev => prev.map((c, j) => j === i ? { ...c, description: e.target.value } : c))}
                                                        className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#E4E9F0]" />
                                                    {activeSuggestionKey === `${i}-description` && suggestions[`${i}-description`] && (
                                                        <div className="mt-1 rounded-xl border border-[#E4E9F0] bg-white overflow-hidden">
                                                            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#E4E9F0]">
                                                                <p className="text-[9px] font-bold text-[#6A35D9] uppercase">Opciones</p>
                                                                <button onClick={() => setActiveSuggestionKey(null)} className="text-[#9CA3AF] hover:text-[#111827]"><X size={9} /></button>
                                                            </div>
                                                            {suggestions[`${i}-description`].map((s, si) => (
                                                                <button key={si} onClick={() => applySuggestion(i, 'description', s)}
                                                                    className="w-full text-left px-2.5 py-2 hover:bg-[#5A2BC0]/10 border-b border-[#E4E9F0] last:border-0 transition-colors">
                                                                    <p className="text-[11px] text-[#6B7280]">{s}</p>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                    </div>

                                    {/* Per-slot AI image panel */}
                                    {imageGenPanel === i && configSaved && strategy.mediaType !== 'video' && (
                                        <div className="border-t border-[#E4E9F0] bg-white p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#6A35D9] flex items-center gap-1.5">
                                                    <Wand2 size={10} /> {creatives.find(c => c.slotIndex === i)?.mediaUrl ? 'Editar imagen con IA' : 'Generar imagen con IA'}
                                                </p>
                                                <button onClick={() => setImageGenPanel(null)} className="text-[#9CA3AF] hover:text-[#111827]"><X size={12} /></button>
                                            </div>

                                            {/* Reference product photo upload */}
                                            <div className="space-y-1.5">
                                                <p className="text-[9px] uppercase font-bold tracking-widest"><span className="text-[#9CA3AF]">Foto del producto</span> <span className="text-[#D97706]">· obligatoria</span></p>
                                                {refImageUrls[i] ? (
                                                    <div className="flex flex-col gap-2 p-2.5 bg-[#059669]/8 border border-[#059669]/20 rounded-xl">
                                                        <img src={refImageUrls[i]} className="w-full max-h-40 rounded-lg object-contain bg-[#081624]/20 border border-[#E4E9F0]" />
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-[9px] text-[#059669] font-bold">Foto del producto cargada ✓</p>
                                                                <p className="text-[9px] text-[#059669]/60">La IA usará esta foto como referencia</p>
                                                            </div>
                                                            <button onClick={() => setRefImageUrls(prev => { const n = { ...prev }; delete n[i]; return n })}
                                                                className="text-[#9CA3AF] hover:text-[#DC2626] shrink-0"><X size={10} /></button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => refImageFileRefs.current[i]?.click()}
                                                        disabled={uploadingRefImage[i]}
                                                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-[#E4E9F0] bg-[#6A35D9]/5 hover:bg-[#5A2BC0]/10 hover:border-[#E4E9F0] transition-all text-[10px] font-bold text-[#6A35D9]/70 hover:text-[#6A35D9]">
                                                        {uploadingRefImage[i]
                                                            ? <><Loader2 size={10} className="animate-spin" /> Subiendo...</>
                                                            : <><Upload size={10} /> Subir foto del producto</>
                                                        }
                                                    </button>
                                                )}
                                                <input
                                                    ref={el => { refImageFileRefs.current[i] = el }}
                                                    type="file" accept="image/*" className="hidden"
                                                    onChange={e => { if (e.target.files?.[0]) handleRefImageUpload(i, e.target.files[0]) }}
                                                />
                                                <p className="text-[9px] text-[#9CA3AF] leading-relaxed">Sube la foto de tu producto y la IA creará un anuncio profesional basado en él</p>
                                            </div>

                                            {(refImageUrls[i] || creatives.find(c => c.slotIndex === i)?.mediaUrl?.startsWith('http')) && (
                                                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#059669]/8 border border-[#059669]/20 rounded-xl">
                                                    <CheckCircle2 size={9} className="text-[#059669] shrink-0" />
                                                    <p className="text-[9px] text-[#059669]"><span className="font-bold">gpt-image-2</span> usará tu imagen como base para crear el anuncio</p>
                                                </div>
                                            )}
                                            {/* Calidad fija: Rápida (sin selector) */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-[9px] text-[#9CA3AF] uppercase font-bold">Tu prompt (libre)</p>
                                                    <button onClick={() => generateAiPrompt(i)} disabled={aiPromptLoading}
                                                        className="text-[9px] font-bold text-[#6A35D9] hover:text-purple-200 flex items-center gap-1 disabled:opacity-40">
                                                        {aiPromptLoading ? <Loader2 size={8} className="animate-spin" /> : <Sparkles size={8} />}
                                                        {aiPromptLoading ? 'Escribiendo…' : 'Generar con IA'}
                                                    </button>
                                                </div>
                                                <textarea value={imageCustomPrompts[i] || ''} onChange={e => setImageCustomPrompts(prev => ({ ...prev, [i]: e.target.value }))}
                                                    rows={3} placeholder="Escribí qué imagen querés (como el admin) o tocá 'Generar con IA'. Se manda tal cual a gpt-image-2."
                                                    className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-2.5 py-2 text-[10px] text-[#111827] resize-none focus:outline-none focus:border-[#E4E9F0] leading-relaxed placeholder:text-[#9CA3AF]" />
                                            </div>
                                            <button onClick={() => generateImage(i)}
                                                disabled={!(refImageUrls[i] || creatives.find(c => c.slotIndex === i)?.mediaUrl?.startsWith('http'))}
                                                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                style={{ background: 'linear-gradient(135deg,#6A35D9,#233B8F)' }}>
                                                <Sparkles size={12} />
                                                {(refImageUrls[i] || creatives.find(c => c.slotIndex === i)?.mediaUrl?.startsWith('http')) ? 'Generar con tu producto (gpt-image-2)' : 'Subí la foto del producto primero'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Generate all copies button */}
                        {configSaved && (
                            <button onClick={generateCopies} disabled={generatingCopies}
                                className="w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                style={{ background: copiesGenerated ? 'rgba(106,53,217,0.12)' : 'linear-gradient(135deg,#6A35D9,#233B8F)', border: copiesGenerated ? '1px solid rgba(106,53,217,0.25)' : 'none', color: copiesGenerated ? '#6A35D9' : '#fff', boxShadow: copiesGenerated ? 'none' : '0 0 24px rgba(106,53,217,0.25)' }}>
                                {generatingCopies
                                    ? <><Loader2 size={15} className="animate-spin" /> Generando textos con IA...</>
                                    : copiesGenerated
                                        ? <><RefreshCw size={15} /> Regenerar todos los textos con IA</>
                                        : <><Sparkles size={15} /> Generar todos los textos con IA</>
                                }
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Floating publish bar ── */}
            {campaign && (
                <div className="fixed bottom-[65px] left-0 right-0 z-50 px-4 pb-3 pt-4 lg:bottom-0 lg:left-[240px]"
                    style={{ background: 'linear-gradient(to top,rgba(8,22,36,1) 60%,transparent)' }}>
                    <div className="max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto flex items-center gap-3 px-4 py-3 rounded-2xl"
                        style={{ background: 'rgba(8,22,36,0.92)', border: '1px solid rgba(106,53,217,0.15)', backdropFilter: 'blur(20px)', boxShadow: '0 -4px 30px rgba(0,0,0,0.5),0 0 20px rgba(106,53,217,0.06)' }}>
                        <div className="flex-1 min-w-0 hidden sm:block">
                            <p className="text-xs font-bold text-[#6B7280] truncate">{form.name}</p>
                            <p className="text-[11px] text-[#9CA3AF]">
                                {!copiesGenerated ? '⟶ Genera los textos para publicar' : canPublish ? '✓ Listo para publicar' : 'Completa los textos'}
                            </p>
                        </div>
                        <button onClick={() => { setPreviewIdx(0); setShowPreview(true) }}
                            disabled={!canPublish || publishing}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            style={{ background: canPublish ? 'linear-gradient(135deg,#059669,#059669)' : 'rgba(15,23,42,0.08)', color: canPublish ? '#fff' : 'rgba(17,24,39,0.55)', boxShadow: canPublish ? '0 0 25px rgba(5,150,105,0.35)' : 'none' }}>
                            {publishing
                                ? <><Loader2 size={15} className="animate-spin" /> Publicando...</>
                                : <><Eye size={15} /> <span className="hidden sm:inline">Vista previa y </span>Publicar</>
                            }
                        </button>
                    </div>
                </div>
            )}

            {/* ── Preview modal ── */}
            {showPreview && creatives.length > 0 && (() => {
                const c = creatives[previewIdx]
                const pageName = pages.find((p: any) => p.id === form.pageId)?.name || form.name
                return (
                    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#081624]/85 backdrop-blur-sm">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <div className="relative w-full max-w-sm py-10">
                                <button onClick={() => setShowPreview(false)} className="absolute top-0 right-0 text-[#9CA3AF] hover:text-[#111827] flex items-center gap-1.5 text-xs font-bold">
                                    <X size={14} /> Cerrar
                                </button>
                                <p className="text-center text-[11px] text-[#9CA3AF] mb-3 font-bold">Anuncio {previewIdx + 1} de {creatives.length}</p>
                                <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                                    <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[#111827] text-xs font-black shrink-0"
                                            style={{ background: 'linear-gradient(135deg,#233B8F,#6A35D9)' }}>
                                            {pageName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-bold text-gray-900 truncate">{pageName}</p>
                                            <p className="text-[11px] text-gray-400 flex items-center gap-1">Patrocinado · <Globe size={9} /></p>
                                        </div>
                                    </div>
                                    {c?.primaryText && (
                                        <div className="px-3 pb-2">
                                            <p className="text-[13px] text-gray-800 leading-snug line-clamp-3">{c.primaryText}</p>
                                        </div>
                                    )}
                                    <div className="h-52 bg-gray-100 w-full overflow-hidden">
                                        {c?.mediaUrl
                                            ? c.mediaType === 'video'
                                                ? <video key={c.mediaUrl} src={c.mediaUrl} className="w-full h-full object-cover" controls playsInline />
                                                : <img src={c.mediaUrl} alt="" className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300">
                                                <ImageIcon size={32} />
                                                <p className="text-xs">Sin imagen</p>
                                            </div>
                                        }
                                    </div>
                                    <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-t border-gray-100">
                                        <div className="flex-1 min-w-0 pr-3">
                                            {form.destinationUrl && (
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wide truncate">{form.destinationUrl.replace(/^https?:\/\//, '').split('/')[0]}</p>
                                            )}
                                            <p className="text-[13px] font-bold text-gray-900 truncate">{c?.headline || form.name}</p>
                                            {c?.description && <p className="text-[11px] text-gray-500 truncate">{c.description}</p>}
                                        </div>
                                        <span className="text-[12px] font-bold px-3 py-1.5 rounded-md bg-gray-200 text-gray-700 whitespace-nowrap shrink-0">
                                            {strategy?.destination === 'whatsapp' ? 'Enviar mensaje' : 'Más información'}
                                        </span>
                                    </div>
                                </div>

                                {/* Advantage+ summary */}
                                <div className="mt-3 flex flex-wrap items-center gap-2 justify-center">
                                    {advantageAudience && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#6A35D9]/15 border border-[#E4E9F0] text-[#6A35D9]">
                                            <Target size={9} /> Advantage+ Audience
                                        </span>
                                    )}
                                    {advantageCreative && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#233B8F]/15 border border-[#E4E9F0] text-[#233B8F]">
                                            <Sparkles size={9} /> Advantage+ Creative
                                        </span>
                                    )}
                                    {adFormat === 'carousel' && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#D97706]/15 border border-[#D97706]/25 text-[#D97706]">
                                            <Layers size={9} /> Carrusel
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F4F6FA] border border-[#E4E9F0] text-[#9CA3AF]">
                                        <BarChart2 size={9} /> {bidStrategy === 'auto' ? 'Puja automática' : bidStrategy === 'cost_cap' ? `Costo máx. $${bidCapAmount}` : `ROAS mín. ${minRoasTarget}x`}
                                    </span>
                                </div>

                                {creatives.length > 1 && (
                                    <div className="flex items-center justify-between mt-3 mb-1">
                                        <button onClick={() => setPreviewIdx(i => (i - 1 + creatives.length) % creatives.length)}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F0F3F7] hover:bg-[#F0F3F7] text-xs font-bold transition-all">
                                            <ChevronLeft size={14} /> Anterior
                                        </button>
                                        <button onClick={() => setPreviewIdx(i => (i + 1) % creatives.length)}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F0F3F7] hover:bg-[#F0F3F7] text-xs font-bold transition-all">
                                            Siguiente <ChevronRight size={14} />
                                        </button>
                                    </div>
                                )}
                                <button onClick={() => { setShowPreview(false); publish() }} disabled={publishing}
                                    className="mt-3 w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50 transition-all"
                                    style={{ background: 'linear-gradient(135deg,#059669,#059669)', boxShadow: '0 0 25px rgba(5,150,105,0.4)' }}>
                                    {publishing ? <><Loader2 size={15} className="animate-spin" /> Publicando...</> : <><Rocket size={15} /> Publicar Campaña</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}

export default function CampaignPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-[#6A35D9]" size={32} />
            </div>
        }>
            <CampaignPageInner />
        </Suspense>
    )
}
