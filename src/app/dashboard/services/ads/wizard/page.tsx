'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    ArrowLeft, ArrowRight, Building2, Sparkles, Loader2,
    CheckCircle2, AlertCircle, Plus, Target, Globe,
    MessageCircle, Eye, ShoppingCart, DollarSign,
    Brain, RefreshCw, Pencil, X, Save, Bookmark, Trash2,
    Smartphone, Heart, BookMarked, Image as ImageIcon, Video
} from 'lucide-react'
import Link from 'next/link'
import AIKeySelector from '@/components/AIKeySelector'

interface Brief { id: string; name: string; industry: string; description: string }
interface Strategy {
    id: string; name: string; description: string; reason?: string; platform: string
    objective: string; destination: string; mediaType: string; mediaCount: number
    minBudgetUSD: number; advantageType: string; savedByUser?: boolean
}

const PLATFORM_LABELS: Record<string, { label: string; letter: string; color: string; bg: string }> = {
    META: { label: 'Meta Ads', letter: 'f', color: 'text-[#7DD3FC]', bg: 'bg-[#233B8F]/15 border-[#233B8F]/25' },
    TIKTOK: { label: 'TikTok Ads', letter: 'T', color: 'text-pink-400', bg: 'bg-pink-500/15 border-pink-500/25' },
    GOOGLE_ADS: { label: 'Google Ads', letter: 'G', color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/25' },
}

const OBJECTIVE_ICONS: Record<string, React.ReactNode> = {
    conversions: <ShoppingCart size={11} />,
    leads: <MessageCircle size={11} />,
    traffic: <Globe size={11} />,
    awareness: <Eye size={11} />,
    engagement: <Heart size={11} />,
    app_promotion: <Smartphone size={11} />,
}

const OBJECTIVE_LABELS: Record<string, string> = {
    conversions: 'Ventas',
    leads: 'Clientes potenciales',
    traffic: 'Tráfico',
    awareness: 'Reconocimiento',
    engagement: 'Interacción',
    app_promotion: 'Promoción de app',
}

const OBJECTIVE_COLORS: Record<string, string> = {
    conversions: 'text-green-400',
    leads: 'text-[#7DD3FC]',
    traffic: 'text-[#B735B8]',
    awareness: 'text-[#C9A7FF]',
    engagement: 'text-pink-400',
    app_promotion: 'text-orange-400',
}

const DESTINATION_LABELS: Record<string, string> = {
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    website: 'Sitio web',
    messenger: 'Messenger',
    tiktok: 'TikTok',
}

function WizardContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialBriefId = searchParams.get('briefId')
    // Si entran desde un dashboard de plataforma específica (Meta/TikTok/Google),
    // saltamos el picker de plataforma. Sólo se respeta META por ahora (TikTok/Google
    // están en construcción y el wizard quedaría sin estrategias).
    const platformFromUrl = searchParams.get('platform')
    const forcedPlatform = platformFromUrl === 'META' ? 'META' : null

    // Hoy sólo Meta está activo → no mostramos el selector de plataforma:
    // entramos directo como si el usuario ya hubiera elegido Meta.
    // Cuando sumes TikTok/Google, poné esto en true y el selector vuelve solo.
    const MULTI_PLATFORM = false

    const [step, setStep] = useState<1 | 2>(initialBriefId ? 2 : 1)
    const [briefs, setBriefs] = useState<Brief[]>([])
    const [aiStrategies, setAiStrategies] = useState<Strategy[]>([])
    const [savedStrategies, setSavedStrategies] = useState<Strategy[]>([])
    const [activeTab, setActiveTab] = useState<'ai' | 'saved'>('ai')
    const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null)
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
    const [showPlatformPicker, setShowPlatformPicker] = useState(false)
    const [showAdTypePicker, setShowAdTypePicker] = useState(false)
    const [selectedObjective, setSelectedObjective] = useState<string | null>(null)
    const [selectedDestination, setSelectedDestination] = useState<string | null>(null)
    const [selectedMediaPref, setSelectedMediaPref] = useState<string | null>(null)
    const [loadingBriefs, setLoadingBriefs] = useState(true)
    const [loadingAI, setLoadingAI] = useState(false)
    const [loadingSaved, setLoadingSaved] = useState(false)
    const [creating, setCreating] = useState(false)
    const [creatingAndromeda, setCreatingAndromeda] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [aiError, setAiError] = useState<string | null>(null)

    // Strategy editing
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<Partial<Strategy>>({})
    const [saving, setSaving] = useState(false)
    const [savingStrategyId, setSavingStrategyId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const strategies = activeTab === 'ai' ? aiStrategies : savedStrategies

    useEffect(() => {
        fetch('/api/ads/brief').then(r => r.json()).then(data => {
            const allBriefs: Brief[] = data.briefs || []
            setBriefs(allBriefs)
            if (initialBriefId) {
                const found = allBriefs.find(b => b.id === initialBriefId)
                if (found) { setSelectedBrief(found); enterPlatformPicker() }
            }
            setLoadingBriefs(false)
        }).catch(() => setLoadingBriefs(false))
    }, [initialBriefId])

    function enterPlatformPicker() {
        setStep(2)
        // Con una sola plataforma activa (Meta) saltamos el selector y vamos
        // directo al tipo de anuncio, como si Meta ya estuviera seleccionado.
        // Sólo mostramos el selector si hay varias plataformas disponibles.
        if (forcedPlatform || !MULTI_PLATFORM) {
            setShowPlatformPicker(false)
            setShowAdTypePicker(true)
            setSelectedPlatform(forcedPlatform || 'META')
        } else {
            setShowPlatformPicker(true)
            setShowAdTypePicker(false)
            setSelectedPlatform(null)
        }
        setAiStrategies([])
        setSavedStrategies([])
        setSelectedStrategy(null)
        setSelectedObjective(null)
        setSelectedDestination(null)
        setSelectedMediaPref(null)
        setAiError(null)
        setEditingId(null)
    }

    function pickPlatform(platform: string) {
        setSelectedPlatform(platform)
        setShowPlatformPicker(false)
        setShowAdTypePicker(true)
        setSelectedObjective(null)
        setSelectedDestination(null)
        setSelectedMediaPref(null)
        setSelectedStrategy(null)
        setAiStrategies([])
        setSavedStrategies([])
        setAiError(null)
    }

    async function confirmAdType() {
        if (!selectedPlatform) return
        setShowAdTypePicker(false)
        setSelectedStrategy(null)
        setAiStrategies([])
        setSavedStrategies([])
        setAiError(null)

        // Load saved strategies (free). AI triggered on demand.
        setLoadingSaved(true)
        const params = new URLSearchParams({ savedOnly: 'true', platform: selectedPlatform })
        if (selectedObjective) params.set('objective', selectedObjective)
        if (selectedDestination) params.set('destination', selectedDestination)
        fetch(`/api/ads/strategies?${params}`)
            .then(r => r.json())
            .then(data => {
                const saved = (data.strategies || []).map((s: any) => ({
                    ...s,
                    description: s.description?.includes('||REASON:') ? s.description.split('||REASON:')[0] : s.description,
                    reason: s.description?.includes('||REASON:') ? s.description.split('||REASON:')[1] : undefined,
                    savedByUser: true,
                }))
                setSavedStrategies(saved)
                setActiveTab(saved.length > 0 ? 'saved' : 'ai')
            })
            .catch(() => { setSavedStrategies([]); setActiveTab('ai') })
            .finally(() => setLoadingSaved(false))
    }

    async function retryAI() {
        if (!selectedBrief || !selectedPlatform) return
        setLoadingAI(true)
        setAiError(null)
        setAiStrategies([])
        try {
            const res = await fetch('/api/ads/strategies/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    briefId: selectedBrief.id,
                    platform: selectedPlatform,
                    objective: selectedObjective || undefined,
                    destination: selectedDestination || undefined,
                    mediaType: selectedMediaPref || undefined,
                })
            })
            let data: any = {}
            try { data = await res.json() } catch { }
            if (!res.ok) setAiError(data.error || 'Error al generar estrategias')
            else setAiStrategies(data.strategies || [])
        } catch (e: any) {
            setAiError(e?.message || 'Error de conexión')
        } finally {
            setLoadingAI(false)
        }
    }

    function startEdit(strategy: Strategy) {
        setEditingId(strategy.id)
        setEditForm({
            name: strategy.name,
            description: strategy.description,
            platform: strategy.platform,
            objective: strategy.objective,
            destination: strategy.destination,
            mediaType: strategy.mediaType,
            mediaCount: strategy.mediaCount,
            minBudgetUSD: strategy.minBudgetUSD,
        })
    }

    async function saveEdit(strategyId: string) {
        setSaving(true)
        try {
            const res = await fetch(`/api/ads/strategies/${strategyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al guardar'); return }
            const update = (list: Strategy[]) => list.map(s => s.id === strategyId ? { ...s, ...editForm } : s)
            setAiStrategies(update)
            setSavedStrategies(update)
            if (selectedStrategy?.id === strategyId) setSelectedStrategy(prev => prev ? { ...prev, ...editForm } : prev)
            setEditingId(null)
        } catch { setError('Error de conexión') }
        finally { setSaving(false) }
    }

    async function toggleSaveStrategy(strategy: Strategy) {
        setSavingStrategyId(strategy.id)
        const newSaved = !strategy.savedByUser
        try {
            const res = await fetch(`/api/ads/strategies/${strategy.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ savedByUser: newSaved })
            })
            if (res.ok) {
                const update = (list: Strategy[]) => list.map(s => s.id === strategy.id ? { ...s, savedByUser: newSaved } : s)
                setAiStrategies(update)
                setSavedStrategies(update)
            }
        } catch { }
        finally { setSavingStrategyId(null) }
    }

    async function deleteStrategy(strategyId: string) {
        setDeletingId(strategyId)
        try {
            const res = await fetch(`/api/ads/strategies/${strategyId}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al eliminar'); return }
            const remove = (list: Strategy[]) => list.filter(s => s.id !== strategyId)
            setAiStrategies(remove)
            setSavedStrategies(remove)
            if (selectedStrategy?.id === strategyId) setSelectedStrategy(null)
        } catch { setError('Error de conexión') }
        finally { setDeletingId(null) }
    }

    async function createCampaign() {
        if (!selectedBrief || !selectedStrategy) return
        setCreating(true); setError(null)
        try {
            const name = `${selectedBrief.name} · ${selectedStrategy.name}`
            const res = await fetch('/api/ads/campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    briefId: selectedBrief.id,
                    strategyId: selectedStrategy.id,
                    name,
                    dailyBudgetUSD: selectedStrategy.minBudgetUSD || 5,
                })
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al crear campaña'); setCreating(false); return }
            router.push(`/dashboard/services/ads/campaign/${selectedStrategy.id}?edit=${data.campaign.id}`)
        } catch {
            setError('Error de conexión'); setCreating(false)
        }
    }

    // ── Método Andromeda (un toque): crea la estrategia y la campaña, y va al editor ──
    async function useAndromeda() {
        if (!selectedBrief) return
        setCreatingAndromeda(true); setError(null)
        try {
            const r1 = await fetch('/api/ads/strategies/from-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    briefId: selectedBrief.id,
                    method: 'andromeda',
                    platform: selectedPlatform || 'META',
                    objective: selectedObjective || undefined,
                    destination: selectedDestination || undefined,
                    mediaType: selectedMediaPref || undefined,
                }),
            })
            const d1 = await r1.json()
            if (!r1.ok) { setError(d1.error || 'No se pudo preparar la estrategia'); setCreatingAndromeda(false); return }
            const strat = d1.strategy
            const r2 = await fetch('/api/ads/campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    briefId: selectedBrief.id,
                    strategyId: strat.id,
                    name: `${selectedBrief.name} · ${strat.name}`,
                    dailyBudgetUSD: strat.minBudgetUSD || 8,
                }),
            })
            const d2 = await r2.json()
            if (!r2.ok) { setError(d2.error || 'Error al crear campaña'); setCreatingAndromeda(false); return }
            router.push(`/dashboard/services/ads/campaign/${strat.id}?edit=${d2.campaign.id}`)
        } catch {
            setError('Error de conexión'); setCreatingAndromeda(false)
        }
    }

    const isLoadingStrategies = activeTab === 'ai' ? loadingAI : loadingSaved
    const plat = selectedPlatform ? PLATFORM_LABELS[selectedPlatform] : null

    return (
        <div className="px-4 md:px-6 xl:px-8 pt-6 max-w-3xl xl:max-w-4xl mx-auto pb-24 text-white">

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/services/ads" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                    <ArrowLeft size={16} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-black uppercase tracking-tighter">Nueva Campaña</h1>
                    <p className="text-xs text-white/30">2 pasos para lanzar tu anuncio</p>
                </div>
                <AIKeySelector compact />
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-8">
                {([1, 2] as const).map((s, i) => (
                    <div key={s} className="flex items-center gap-2 flex-1">
                        <div className={`flex items-center gap-2 ${step === s ? 'flex-1' : ''}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${step > s ? 'bg-green-500 text-white' : step === s ? 'bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white shadow-[0_0_15px_rgba(183,53,184,0.5)]' : 'bg-white/5 border border-white/10 text-white/30'}`}>
                                {step > s ? <CheckCircle2 size={14} /> : s}
                            </div>
                            {step === s && (
                                <span className="text-xs font-bold text-white/70 whitespace-nowrap hidden sm:block">
                                    {s === 1 ? 'Negocio' : 'Estrategia'}
                                </span>
                            )}
                        </div>
                        {i < 1 && <div className={`flex-1 h-px transition-all ${step > s ? 'bg-green-500/40' : 'bg-white/8'}`} />}
                    </div>
                ))}
            </div>

            {error && (
                <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 text-red-400 text-sm">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="font-bold text-xs">✕</button>
                </div>
            )}

            {/* ── Step 1: Select Brief ── */}
            {step === 1 && (
                <div>
                    <div className="mb-6">
                        <h2 className="text-lg font-black">¿Para qué negocio?</h2>
                        <p className="text-xs text-white/30 mt-1">La IA analizará tu negocio y sugerirá las mejores estrategias</p>
                    </div>

                    {loadingBriefs ? (
                        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-[#C9A7FF]" size={24} /></div>
                    ) : briefs.length === 0 ? (
                        <div className="text-center py-16 bg-white/[0.015] border border-dashed border-white/10 rounded-3xl">
                            <Building2 size={28} className="text-white/20 mx-auto mb-3" />
                            <p className="text-white/40 font-bold mb-1">Sin negocios</p>
                            <p className="text-white/20 text-xs mb-5">Crea primero el perfil de tu negocio</p>
                            <Link href="/dashboard/services/ads/brief" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white text-sm font-bold rounded-xl hover:opacity-90 transition-all">
                                <Plus size={14} /> Crear negocio
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {briefs.map(brief => (
                                <button key={brief.id} onClick={() => { setSelectedBrief(brief); enterPlatformPicker() }}
                                    className="w-full text-left bg-white/3 border border-white/8 rounded-2xl p-4 hover:border-[#B735B8]/40 hover:bg-[#B735B8]/5 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-[#B735B8]/15 border border-[#B735B8]/20 flex items-center justify-center shrink-0">
                                            <Building2 size={18} className="text-[#C9A7FF]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm">{brief.name}</p>
                                            <p className="text-xs text-white/40">{brief.industry}</p>
                                        </div>
                                        <ArrowRight size={16} className="text-white/20 group-hover:text-[#C9A7FF] transition-all" />
                                    </div>
                                </button>
                            ))}
                            <Link href="/dashboard/services/ads/brief"
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-white/10 text-white/30 hover:border-white/25 hover:text-white/50 text-sm font-bold transition-all">
                                <Plus size={15} /> Agregar otro negocio
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* ── Step 2: Platform + Strategy ── */}
            {step === 2 && (
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => setStep(1)} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                            <ArrowLeft size={14} />
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-lg font-black">
                                    {showPlatformPicker ? 'Elige la plataforma' : showAdTypePicker ? 'Tipo de anuncio' : 'Estrategias recomendadas'}
                                </h2>
                                {plat && !showPlatformPicker && (
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${plat.bg} ${plat.color}`}>
                                        {plat.label}
                                    </span>
                                )}
                            </div>
                            {selectedBrief && <p className="text-xs text-white/30 mt-0.5">Para: <span className="text-[#C9A7FF]">{selectedBrief.name}</span></p>}
                        </div>
                        {MULTI_PLATFORM && !showPlatformPicker && !showAdTypePicker && !forcedPlatform && (
                            <button onClick={() => { setShowPlatformPicker(true); setSelectedStrategy(null) }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/40 hover:text-white/70 hover:bg-white/10 transition-all">
                                <RefreshCw size={12} /> Cambiar
                            </button>
                        )}
                    </div>

                    {/* ── Platform picker ── */}
                    {showPlatformPicker && (
                        <div>
                            <p className="text-xs text-white/30 mb-5 text-center">Selecciona la plataforma</p>
                            {/* Solo Meta es seleccionable hoy: una sola acción clara, sin botones falsos */}
                            <div className="grid grid-cols-1 gap-3">
                                <button onClick={() => pickPlatform('META')}
                                    className="w-full flex items-center gap-4 p-5 rounded-2xl border text-left transition-all active:scale-[0.98] group border-[#233B8F]/25 hover:border-[#233B8F]/50 bg-[#233B8F]/5 hover:bg-[#233B8F]/10">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border bg-[#233B8F]/15 border-[#233B8F]/25">
                                        <span className="font-black text-xl text-[#7DD3FC]">f</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <p className="font-black text-sm text-white">Meta Ads</p>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#7DD3FC]">Facebook & Instagram</span>
                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                                                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
                                                DISPONIBLE
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/35 leading-relaxed">Ideal para ventas directas por WhatsApp, leads, branding y audiencias amplias.</p>
                                    </div>
                                    <ArrowRight size={16} className="text-[#7DD3FC] opacity-40 group-hover:opacity-100 shrink-0 transition-all" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Ad Type Picker ── */}
                    {showAdTypePicker && (
                        <div className="space-y-6">
                            <p className="text-xs text-white/30 text-center">Selecciona el tipo de anuncio que quieres crear. La IA generará estrategias enfocadas en lo que elijas.</p>

                            {/* Objective */}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">¿Cuál es tu objetivo?</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {[
                                        { id: 'conversions', label: 'Ventas', desc: 'Compras directas', icon: ShoppingCart, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/25' },
                                        { id: 'leads', label: 'Clientes potenciales', desc: 'Captación de contactos', icon: MessageCircle, color: 'text-[#7DD3FC]', bg: 'bg-[#233B8F]/10 border-[#233B8F]/25' },
                                        { id: 'traffic', label: 'Tráfico', desc: 'Visitas a tu sitio', icon: Globe, color: 'text-[#B735B8]', bg: 'bg-[#B735B8]/10 border-[#B735B8]/25' },
                                        { id: 'awareness', label: 'Reconocimiento', desc: 'Dar a conocer tu marca', icon: Eye, color: 'text-[#C9A7FF]', bg: 'bg-[#B735B8]/10 border-[#B735B8]/25' },
                                        { id: 'engagement', label: 'Interacción', desc: 'Likes, mensajes, chat', icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/25' },
                                    ].map(obj => (
                                        <button key={obj.id} onClick={() => setSelectedObjective(selectedObjective === obj.id ? null : obj.id)}
                                            className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all ${selectedObjective === obj.id ? `${obj.bg} border-opacity-60` : 'bg-white/3 border-white/8 hover:border-white/20'}`}>
                                            <obj.icon size={14} className={selectedObjective === obj.id ? obj.color : 'text-white/30'} />
                                            <span className={`text-xs font-bold leading-tight ${selectedObjective === obj.id ? 'text-white' : 'text-white/50'}`}>{obj.label}</span>
                                            <span className="text-[9px] text-white/25 leading-tight">{obj.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Destination — only for META */}
                            {selectedPlatform === 'META' && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">¿A dónde llevas al cliente?</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {[
                                            { id: 'whatsapp', label: 'WhatsApp', icon: '💬', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/25', hidden: selectedObjective === 'traffic' || selectedObjective === 'awareness' },
                                            { id: 'website', label: 'Sitio Web', icon: '🌐', color: 'text-[#7DD3FC]', bg: 'bg-[#233B8F]/10 border-[#233B8F]/25', hidden: selectedObjective === 'engagement' },
                                            { id: 'instagram', label: 'Instagram', icon: '📷', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/25', hidden: false },
                                            { id: 'messenger', label: 'Messenger', icon: '💬', color: 'text-[#C9A7FF]', bg: 'bg-[#B735B8]/10 border-[#B735B8]/25', hidden: selectedObjective === 'traffic' || selectedObjective === 'awareness' },
                                        ].filter(d => !d.hidden).map(dest => (
                                            <button key={dest.id} onClick={() => setSelectedDestination(selectedDestination === dest.id ? null : dest.id)}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${selectedDestination === dest.id ? `${dest.bg}` : 'bg-white/3 border-white/8 hover:border-white/20'}`}>
                                                <span className="text-base leading-none">{dest.icon}</span>
                                                <span className={`text-xs font-bold ${selectedDestination === dest.id ? 'text-white' : 'text-white/50'}`}>{dest.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Media type */}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">¿Tipo de creativo?</p>
                                <div className="flex gap-2">
                                    {[
                                        { id: 'image', label: 'Imagen', icon: ImageIcon },
                                        { id: 'video', label: 'Video', icon: Video },
                                    ].map(m => (
                                        <button key={m.id} onClick={() => setSelectedMediaPref(selectedMediaPref === m.id ? null : m.id)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${selectedMediaPref === m.id ? 'bg-[#B735B8]/15 border-[#B735B8]/40 text-[#C9A7FF]' : 'bg-white/3 border-white/8 text-white/40 hover:border-white/20'}`}>
                                            <m.icon size={14} /> {m.label}
                                        </button>
                                    ))}
                                    <button onClick={() => setSelectedMediaPref(null)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${!selectedMediaPref ? 'bg-white/10 border-white/25 text-white/70' : 'bg-white/3 border-white/8 text-white/30 hover:border-white/20'}`}>
                                        Ambos
                                    </button>
                                </div>
                            </div>

                            {/* Selected summary */}
                            {(selectedObjective || selectedDestination || selectedMediaPref) && (
                                <div className="flex flex-wrap gap-2 p-3 bg-[#B735B8]/5 border border-[#B735B8]/15 rounded-xl">
                                    <span className="text-[10px] text-[#C9A7FF]/60 font-bold uppercase tracking-widest w-full mb-0.5">La IA generará estrategias para:</span>
                                    {selectedObjective && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#B735B8]/15 border border-[#B735B8]/25 text-[#C9A7FF]">{OBJECTIVE_LABELS[selectedObjective]}</span>}
                                    {selectedDestination && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/8 border border-white/15 text-white/60">{selectedDestination}</span>}
                                    {selectedMediaPref && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/8 border border-white/15 text-white/60">{selectedMediaPref === 'image' ? 'Imagen' : 'Video'}</span>}
                                </div>
                            )}

                            <button onClick={confirmAdType}
                                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all"
                                style={{ background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', boxShadow: '0 0 24px rgba(255,255,255,0.15)' }}>
                                <Brain size={16} /> Generar estrategias con IA
                            </button>
                            <p className="text-center text-[10px] text-white/20">Las selecciones son opcionales — puedes continuar sin elegir nada y la IA sugerirá lo mejor para tu negocio</p>
                        </div>
                    )}

                    {/* ── Strategies view ── */}
                    {!showPlatformPicker && !showAdTypePicker && (
                        <>
                            {/* ⭐ Método Andromeda — recomendado (un toque) */}
                            {selectedBrief && (
                                <div className="mb-5 rounded-2xl p-4 sm:p-5 relative overflow-hidden"
                                    style={{ background: 'linear-gradient(135deg, rgba(35,59,143,0.16), rgba(183,53,184,0.14))', border: '1px solid rgba(35,59,143,0.35)' }}>
                                    <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-2.5"
                                        style={{ background: 'rgba(250,204,21,0.15)', color: '#facc15', border: '1px solid rgba(250,204,21,0.3)' }}>
                                        ⭐ Recomendado · Lo más fácil
                                    </span>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>🚀</div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-sm sm:text-base">Método Andromeda</h3>
                                            <p className="text-xs text-white/55 mt-1 leading-relaxed">
                                                La IA crea tus anuncios y Meta encuentra solo a tus compradores
                                                {selectedDestination === 'website' ? ' en tu página web' : selectedDestination === 'instagram' ? ' en Instagram' : ' por WhatsApp'}. Tú solo eliges cuánto invertir.
                                            </p>
                                            <p className="text-[11px] text-white/35 mt-1.5">✓ La IA hace casi todo · Desde $8/día · Listo en 2 min</p>
                                        </div>
                                    </div>
                                    <button onClick={useAndromeda} disabled={creatingAndromeda}
                                        className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60"
                                        style={{ background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)' }}>
                                        {creatingAndromeda
                                            ? <><Loader2 size={16} className="animate-spin" /> Preparando tu campaña…</>
                                            : <><Sparkles size={16} /> Usar este método →</>}
                                    </button>
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="flex gap-1 p-1 bg-white/4 border border-white/8 rounded-xl mb-5">
                                <button
                                    onClick={() => { setActiveTab('ai'); if (aiStrategies.length === 0 && !loadingAI && !aiError) retryAI() }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'ai' ? 'bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white shadow-[0_0_12px_rgba(183,53,184,0.3)]' : 'text-white/40 hover:text-white/60'}`}
                                >
                                    {loadingAI
                                        ? <Loader2 size={12} className="animate-spin" />
                                        : <Brain size={12} />
                                    }
                                    IA {!loadingAI && aiStrategies.length > 0 && <span className="opacity-60">({aiStrategies.length})</span>}
                                </button>
                                <button
                                    onClick={() => setActiveTab('saved')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'saved' ? 'bg-green-600 text-white shadow-[0_0_12px_rgba(34,197,94,0.3)]' : 'text-white/40 hover:text-white/60'}`}
                                >
                                    {loadingSaved
                                        ? <Loader2 size={12} className="animate-spin" />
                                        : <BookMarked size={12} />
                                    }
                                    Guardadas {!loadingSaved && savedStrategies.length > 0 && <span className="opacity-60">({savedStrategies.length})</span>}
                                </button>
                            </div>

                            {/* Loading */}
                            {isLoadingStrategies && (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="relative">
                                        <div className={`w-14 h-14 border-2 rounded-full animate-spin ${activeTab === 'ai' ? 'border-[#B735B8]/20 border-t-[#B735B8]' : 'border-green-500/20 border-t-green-500'}`} />
                                        {activeTab === 'ai'
                                            ? <Brain size={20} className="text-[#C9A7FF] absolute inset-0 m-auto" />
                                            : <BookMarked size={20} className="text-green-400 absolute inset-0 m-auto" />
                                        }
                                    </div>
                                    <p className="text-white/60 font-bold text-sm">
                                        {activeTab === 'ai' ? 'La IA está analizando tu negocio...' : 'Cargando estrategias guardadas...'}
                                    </p>
                                </div>
                            )}

                            {/* AI Error */}
                            {!isLoadingStrategies && activeTab === 'ai' && aiError && (
                                <div className="py-12 text-center">
                                    <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
                                    <p className="text-red-400 font-bold text-sm mb-1">Error al generar estrategias</p>
                                    <p className="text-xs text-white/30 mb-5">{aiError}</p>
                                    <button onClick={retryAI}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all">
                                        <RefreshCw size={14} /> Reintentar
                                    </button>
                                </div>
                            )}

                            {/* Saved empty */}
                            {!isLoadingStrategies && activeTab === 'saved' && savedStrategies.length === 0 && (
                                <div className="py-12 text-center">
                                    <BookMarked size={28} className="text-white/15 mx-auto mb-3" />
                                    <p className="text-white/40 font-bold text-sm mb-1">Sin estrategias guardadas</p>
                                    <p className="text-xs text-white/25 mb-4">Guarda una estrategia de IA para reutilizarla aquí</p>
                                    <button onClick={() => { setActiveTab('ai'); if (aiStrategies.length === 0 && !loadingAI && !aiError) retryAI() }}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all">
                                        <Brain size={14} /> Generar con IA
                                    </button>
                                </div>
                            )}

                            {/* Strategy cards */}
                            {!isLoadingStrategies && strategies.length > 0 && (
                                <>
                                    <div className="space-y-3 mb-6">
                                        {strategies.map(strategy => {
                                            const isSelected = selectedStrategy?.id === strategy.id
                                            const isEditing = editingId === strategy.id
                                            const stratPlat = PLATFORM_LABELS[strategy.platform]
                                            return (
                                                <div key={strategy.id}
                                                    className={`rounded-2xl border transition-all ${isSelected ? 'border-[#B735B8]/60 bg-[#B735B8]/10 shadow-[0_0_20px_rgba(183,53,184,0.15)]' : 'border-white/8 bg-white/3 hover:border-white/20'}`}>

                                                    <div className="p-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${stratPlat?.bg || 'bg-white/5 border-white/10'}`}>
                                                                <span className={`font-black text-base ${stratPlat?.color}`}>{stratPlat?.letter}</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start gap-2">
                                                                    <p className="font-bold text-sm flex-1 leading-snug">{strategy.name}</p>
                                                                    {isSelected && !isEditing && <CheckCircle2 size={16} className="text-[#C9A7FF] shrink-0 mt-0.5" />}
                                                                </div>
                                                                {!isEditing && (
                                                                    <>
                                                                        <p className="text-xs text-white/40 mt-1 leading-relaxed">{strategy.description}</p>
                                                                        {strategy.reason && (
                                                                            <div className="mt-2 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg"
                                                                                style={{ background: 'rgba(183,53,184,0.08)', border: '1px solid rgba(183,53,184,0.15)' }}>
                                                                                <Sparkles size={10} className="text-[#C9A7FF] shrink-0 mt-0.5" />
                                                                                <p className="text-[10px] text-[#C9A7FF]/80 leading-relaxed">{strategy.reason}</p>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5">
                                                                            <span className={`flex items-center gap-1 text-[10px] font-bold ${OBJECTIVE_COLORS[strategy.objective] || 'text-white/35'}`}>
                                                                                {OBJECTIVE_ICONS[strategy.objective] || <Target size={10} />}
                                                                                {OBJECTIVE_LABELS[strategy.objective] || strategy.objective}
                                                                            </span>
                                                                            <span className="text-[10px] text-white/25">{DESTINATION_LABELS[strategy.destination] || strategy.destination}</span>
                                                                            <span className="text-[10px] text-white/25">{strategy.mediaCount} {strategy.mediaType === 'video' ? 'videos' : 'imágenes'}</span>
                                                                            <span className="flex items-center gap-0.5 text-[10px] text-white/25">
                                                                                <DollarSign size={9} /> desde ${strategy.minBudgetUSD}/día
                                                                            </span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={e => { e.stopPropagation(); isEditing ? setEditingId(null) : startEdit(strategy) }}
                                                                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/15 transition-all"
                                                                title={isEditing ? 'Cancelar edición' : 'Editar estrategia'}
                                                            >
                                                                {isEditing ? <X size={12} className="text-white/50" /> : <Pencil size={12} className="text-white/40" />}
                                                            </button>
                                                        </div>

                                                        {/* Inline edit form */}
                                                        {isEditing && (
                                                            <div className="mt-4 space-y-3 border-t border-white/8 pt-4">
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Nombre</label>
                                                                    <input
                                                                        value={editForm.name || ''}
                                                                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                                                        className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B735B8]/50"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Descripción</label>
                                                                    <textarea
                                                                        value={editForm.description || ''}
                                                                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                                                        rows={2}
                                                                        className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B735B8]/50 resize-none"
                                                                    />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Objetivo</label>
                                                                        <select value={editForm.objective || ''} onChange={e => setEditForm(f => ({ ...f, objective: e.target.value }))}
                                                                            className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B735B8]/50 [&>option]:bg-[#081624]">
                                                                            <option value="conversions">Ventas</option>
                                                                            <option value="leads">Clientes potenciales</option>
                                                                            <option value="traffic">Tráfico</option>
                                                                            <option value="awareness">Reconocimiento</option>
                                                                            <option value="engagement">Interacción</option>
                                                                            <option value="app_promotion">Promoción de app</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Destino</label>
                                                                        <select value={editForm.destination || ''} onChange={e => setEditForm(f => ({ ...f, destination: e.target.value }))}
                                                                            className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B735B8]/50 [&>option]:bg-[#081624]">
                                                                            <option value="whatsapp">WhatsApp</option>
                                                                            <option value="instagram">Instagram</option>
                                                                            <option value="website">Sitio web</option>
                                                                            <option value="messenger">Messenger</option>
                                                                            <option value="tiktok">TikTok</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Tipo media</label>
                                                                        <select value={editForm.mediaType || ''} onChange={e => setEditForm(f => ({ ...f, mediaType: e.target.value }))}
                                                                            className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B735B8]/50 [&>option]:bg-[#081624]">
                                                                            <option value="image">Imagen</option>
                                                                            <option value="video">Video</option>
                                                                            <option value="carousel">Carrusel</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Cantidad creativos</label>
                                                                        <input type="number" min={1} max={20}
                                                                            value={editForm.mediaCount || 5}
                                                                            onChange={e => setEditForm(f => ({ ...f, mediaCount: parseInt(e.target.value) || 5 }))}
                                                                            className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B735B8]/50"
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-2">
                                                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Presupuesto mín (USD/día)</label>
                                                                        <input type="number" min={1}
                                                                            value={editForm.minBudgetUSD || 5}
                                                                            onChange={e => setEditForm(f => ({ ...f, minBudgetUSD: parseFloat(e.target.value) || 5 }))}
                                                                            className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B735B8]/50"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => saveEdit(strategy.id)} disabled={saving}
                                                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] hover:opacity-90 disabled:opacity-50 text-white text-sm font-bold transition-all">
                                                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                                    Guardar cambios
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Select + Save/Delete — only when not editing */}
                                                        {!isEditing && (
                                                            <div className="mt-3 space-y-2">
                                                                <button
                                                                    onClick={() => setSelectedStrategy(isSelected ? null : strategy)}
                                                                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${isSelected
                                                                        ? 'bg-[#B735B8]/20 border border-[#B735B8]/40 text-[#C9A7FF]'
                                                                        : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                                                                    }`}
                                                                >
                                                                    {isSelected
                                                                        ? <span className="flex items-center justify-center gap-1.5"><CheckCircle2 size={12} /> Seleccionada</span>
                                                                        : 'Seleccionar esta estrategia'
                                                                    }
                                                                </button>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); toggleSaveStrategy(strategy) }}
                                                                        disabled={savingStrategyId === strategy.id}
                                                                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${strategy.savedByUser
                                                                            ? 'bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-red-500/10 hover:border-red-500/25 hover:text-red-400'
                                                                            : 'bg-white/4 border border-white/10 text-white/35 hover:bg-green-500/10 hover:border-green-500/25 hover:text-green-400'
                                                                        } disabled:opacity-40`}
                                                                    >
                                                                        {savingStrategyId === strategy.id
                                                                            ? <Loader2 size={11} className="animate-spin" />
                                                                            : strategy.savedByUser
                                                                                ? <><Bookmark size={11} className="fill-current" /> Guardada</>
                                                                                : <><Bookmark size={11} /> Guardar</>
                                                                        }
                                                                    </button>
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); deleteStrategy(strategy.id) }}
                                                                        disabled={deletingId === strategy.id}
                                                                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-red-500/8 border border-red-500/20 text-red-400/60 hover:bg-red-500/15 hover:text-red-400 transition-all disabled:opacity-40"
                                                                    >
                                                                        {deletingId === strategy.id
                                                                            ? <Loader2 size={11} className="animate-spin" />
                                                                            : <Trash2 size={11} />
                                                                        }
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Create button */}
                                    <button onClick={createCampaign} disabled={!selectedStrategy || creating}
                                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_30px_rgba(183,53,184,0.2)]">
                                        {creating
                                            ? <><Loader2 size={18} className="animate-spin" /> Creando campaña...</>
                                            : <><Sparkles size={18} /> {selectedStrategy ? 'Crear campaña y continuar' : 'Selecciona una estrategia'}</>
                                        }
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default function WizardPage() {
    return (
    <div className="dm-page font-ui">
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-[#C9A7FF]" size={28} />
            </div>
        }>
            <WizardContent />
        </Suspense>
    </div>
    )
}
