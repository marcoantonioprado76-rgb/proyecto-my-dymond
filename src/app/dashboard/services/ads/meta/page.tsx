'use client'

import { useState, useEffect, Suspense } from 'react'
import {
    Plus, ArrowRight, CheckCircle2,
    Sparkles, FileText, Zap, BarChart3, Settings2,
    AlertCircle, Loader2, Brain, Rocket, TrendingUp,
    Play, Pause, Clock, XCircle, RefreshCw, Target, ChevronRight,
    Flame, Activity, Facebook
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AIKeySelector from '@/components/AIKeySelector'
import { usePlanGuard } from '@/hooks/usePlanGuard'

// ── PLATAFORMA: solo Meta ─────────────────────────────────────────────────
const PLATFORM_ID = 'META'
const PLATFORM = {
    id: 'META',
    label: 'Meta Ads',
    sub: 'Facebook & Instagram',
    color: '#0081FB',
    accent: '#0081FB',
    accentSoft: 'rgba(0,129,251,0.15)',
    accentSoftBorder: 'rgba(0,129,251,0.30)',
    glow: 'rgba(0,129,251,0.18)',
    letter: 'f',
    textColor: 'text-blue-400',
}

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string; bg: string }> = {
    DRAFT:      { label: 'Borrador',   color: 'text-[#6B7280]',   dot: 'bg-white/25',                 bg: 'bg-[#F4F6FA] border-[#E4E9F0]' },
    READY:      { label: 'Listo',      color: 'text-blue-400',   dot: 'bg-blue-400',                 bg: 'bg-blue-500/10 border-blue-500/20' },
    PUBLISHING: { label: 'Publicando', color: 'text-[#B735B8]', dot: 'bg-[#B735B8] animate-pulse', bg: 'bg-[#B735B8]/10 border-yellow-500/20' },
    PUBLISHED:  { label: 'Publicado',  color: 'text-emerald-400',dot: 'bg-emerald-400',              bg: 'bg-emerald-500/10 border-emerald-500/20' },
    FAILED:     { label: 'Fallido',    color: 'text-red-400',    dot: 'bg-red-400',                  bg: 'bg-red-500/10 border-red-500/20' },
    PAUSED:     { label: 'Pausado',    color: 'text-orange-400', dot: 'bg-orange-400',               bg: 'bg-orange-500/10 border-orange-500/20' },
}

export default function MetaAdsDashboard() {
    usePlanGuard()
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            </div>
        }>
            <MetaAdsDashboardInner />
        </Suspense>
    )
}

function MetaAdsDashboardInner() {
    const [integrations, setIntegrations] = useState<any[]>([])
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [brief, setBrief] = useState<any>(null)
    const [allBriefs, setAllBriefs] = useState<any[]>([])
    const [openaiConfig, setOpenaiConfig] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const searchParams = useSearchParams()

    useEffect(() => {
        const err = searchParams.get('error')
        if (err) setError(decodeURIComponent(err))
        fetchAll()
    }, [searchParams])

    async function fetchAll() {
        setLoading(true)
        // Promise.allSettled + parseo aislado por request: si una falla (rate-limit,
        // 500, network blip, deploy en curso), las demás siguen poblando su state.
        // ANTES: cualquier .json() roto rechazaba todo y se "perdían" los 4 states.
        const [intRes, campaignRes, briefRes, oaiRes] = await Promise.allSettled([
            fetch('/api/ads/integrations/status'),
            fetch('/api/ads/campaign'),
            fetch('/api/ads/brief'),
            fetch('/api/ads/config/openai')
        ])
        if (intRes.status === 'fulfilled' && intRes.value.ok) {
            try { const d = await intRes.value.json(); setIntegrations(d.integrations || []) } catch { /* keep prev */ }
        }
        if (campaignRes.status === 'fulfilled' && campaignRes.value.ok) {
            try { const d = await campaignRes.value.json(); setCampaigns(d.campaigns || []) } catch { /* keep prev */ }
        }
        if (briefRes.status === 'fulfilled' && briefRes.value.ok) {
            try {
                const d = await briefRes.value.json()
                setBrief(d.brief || null)
                setAllBriefs(d.briefs || [])
            } catch { /* keep prev */ }
        }
        if (oaiRes.status === 'fulfilled' && oaiRes.value.ok) {
            try { const d = await oaiRes.value.json(); setOpenaiConfig(d.config || null) } catch { /* keep prev */ }
        }
        setLoading(false)
    }

    const handleConnect = async () => {
        try {
            const res = await fetch(`/api/ads/integrations/${PLATFORM_ID.toLowerCase()}/connect/start`, { method: 'POST' })
            const { authUrl } = await res.json()
            if (authUrl) window.location.href = authUrl
        } catch { alert('Error al conectar Meta') }
    }

    const handlePause = async (campaignId: string) => {
        setActionLoading(campaignId + '-pause')
        try {
            const res = await fetch(`/api/ads/campaign/${campaignId}/pause`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al pausar'); return }
            setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: 'PAUSED' } : c))
        } catch { setError('Error al pausar campaña') }
        finally { setActionLoading(null) }
    }

    const handleResume = async (campaignId: string) => {
        setActionLoading(campaignId + '-resume')
        try {
            const res = await fetch(`/api/ads/campaign/${campaignId}/resume`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al reanudar'); return }
            setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: 'PUBLISHED' } : c))
        } catch { setError('Error al reanudar campaña') }
        finally { setActionLoading(null) }
    }

    // Filtros — sólo Meta
    const metaIntegration = integrations.find(i => i.platform === PLATFORM_ID)
    const isConnected = metaIntegration?.status === 'CONNECTED'
    const metaCampaigns = campaigns.filter((c: any) => c.platform === PLATFORM_ID)

    const hasOpenAI = openaiConfig?.isValid
    const hasBrief = !!brief
    const hasIntegration = isConnected
    const allReady = hasOpenAI && hasBrief && hasIntegration
    const stepsCompleted = [hasOpenAI, hasBrief, hasIntegration].filter(Boolean).length

    const published = metaCampaigns.filter((c: any) => c.status === 'PUBLISHED').length
    const drafts = metaCampaigns.filter((c: any) => ['DRAFT', 'READY'].includes(c.status)).length
    const failed = metaCampaigns.filter((c: any) => c.status === 'FAILED').length

    return (
        <div className="font-ui" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F5F7FA 45%, #EEF2F7 100%)', minHeight: '100vh', color: '#111827' }}>
        <div className="px-4 md:px-6 xl:px-10 pt-6 pb-28 max-w-screen-2xl mx-auto text-[#111827]">

            {/* ── HEADER ─────────────────────────────── */}
            <div className="relative rounded-3xl overflow-hidden mb-7 p-6 md:p-8"
                style={{ background: `linear-gradient(135deg, ${PLATFORM.glow} 0%, rgba(59,130,246,0.06) 50%, rgba(0,0,0,0) 100%)`, border: `1px solid ${PLATFORM.accentSoftBorder}` }}>

                {/* glow orbs */}
                <div className="pointer-events-none absolute -top-10 -left-10 w-56 h-56 rounded-full blur-[80px]" style={{ background: 'rgba(0,129,251,0.22)' }} />
                <div className="pointer-events-none absolute -bottom-10 right-20 w-40 h-40 rounded-full blur-[70px]" style={{ background: 'rgba(59,130,246,0.14)' }} />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <div className="rounded-2xl flex items-center justify-center shrink-0"
                            style={{ background: `linear-gradient(135deg, ${PLATFORM.accent}40, rgba(59,130,246,0.2))`, border: `1px solid ${PLATFORM.accentSoftBorder}`, width: 52, height: 52 }}>
                            <Facebook className="text-blue-300" size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-none">
                                    Meta Ads
                                </h1>
                                <span className="text-2xl md:text-3xl font-black tracking-tight leading-none text-transparent bg-clip-text"
                                    style={{ backgroundImage: 'linear-gradient(90deg, #60a5fa, #38bdf8)' }}>
                                    AI
                                </span>
                            </div>
                            <p className="text-xs text-[#6B7280] font-medium">Facebook &amp; Instagram · Impulsado por IA</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <AIKeySelector compact />
                        <Link href={`/dashboard/services/ads/wizard?platform=${PLATFORM_ID}`}
                            className="flex items-center gap-2 text-[#111827] text-sm font-bold px-5 py-2.5 rounded-xl transition-all active:scale-[0.97] shadow-[0_0_30px_rgba(0,129,251,0.35)]"
                            style={{ background: `linear-gradient(135deg, ${PLATFORM.accent}, #3b82f6)` }}>
                            <Plus size={15} />
                            Nueva Campaña
                        </Link>
                        <Link href="/dashboard/services/ads/analytics"
                            className="flex items-center gap-2 text-[#6B7280] text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-[#EEF2F7] transition-all"
                            style={{ background: '#F0F3F7', border: '1px solid #E4E9F0' }}>
                            <Activity size={14} />
                            <span className="hidden sm:inline">Analytics</span>
                        </Link>
                        <Link href="/dashboard/services/ads/history"
                            className="flex items-center gap-2 text-[#6B7280] text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-[#EEF2F7] transition-all"
                            style={{ background: '#F0F3F7', border: '1px solid #E4E9F0' }}>
                            <BarChart3 size={14} />
                            <span className="hidden sm:inline">Historial</span>
                        </Link>
                        <button onClick={fetchAll}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#6B7280] hover:text-[#111827] transition-all"
                            style={{ background: '#F0F3F7', border: '1px solid #E4E9F0' }}>
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* error */}
            {error && (
                <div className="mb-5 p-4 rounded-2xl flex items-start gap-3 text-red-400 text-sm"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="flex-1 text-xs"><b>Error:</b> {error}</p>
                    <button onClick={() => setError(null)} className="text-xs hover:underline shrink-0">✕</button>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-36 gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-400 animate-spin" />
                        <div className="absolute inset-0 rounded-full blur-md" style={{ background: 'rgba(0,129,251,0.14)' }} />
                    </div>
                    <p className="text-[#9CA3AF] text-xs font-medium tracking-widest uppercase">Cargando</p>
                </div>
            ) : (
                <div className="space-y-6">

                    {/* ── SETUP ───────────────────────────── */}
                    {!allReady && (
                        <div className="rounded-3xl p-5 md:p-6" style={{ background: `#FFFFFF`, border: '1px solid #E4E9F0' }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <Rocket size={15} className="text-blue-400" />
                                    <span className="font-bold text-sm">Configura Meta Ads</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        {[0,1,2].map(i => (
                                            <div key={i} className={`h-1 w-8 rounded-full transition-all duration-500 ${i < stepsCompleted ? 'bg-blue-400' : 'bg-white/8'}`} />
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-[#6B7280] font-bold tabular-nums">{stepsCompleted}/3</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {[
                                    { label: 'API Key de OpenAI', done: hasOpenAI, href: '/dashboard/services/ads/setup', icon: Brain, desc: 'Genera copies con IA' },
                                    { label: 'Perfil de Negocio', done: hasBrief, href: '/dashboard/services/ads/brief', icon: FileText, desc: 'Info de tu negocio' },
                                    { label: 'Conectar Meta', done: hasIntegration, href: '/dashboard/services/ads/setup', icon: Zap, desc: 'Cuenta de Meta Ads' },
                                ].map((step, idx) => {
                                    const Icon = step.icon
                                    return (
                                        <Link key={idx} href={step.href}
                                            className={`group flex items-center gap-3 p-3.5 rounded-2xl border transition-all active:scale-[0.98] ${step.done
                                                ? 'bg-emerald-500/5 border-emerald-500/15'
                                                : 'bg-white/2 border-white/6 hover:border-blue-500/30 hover:bg-blue-500/5'}`}>
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${step.done ? 'bg-emerald-500/15' : 'bg-white/4 group-hover:bg-blue-500/12'}`}>
                                                {step.done
                                                    ? <CheckCircle2 size={15} className="text-emerald-400" />
                                                    : <Icon size={15} className="text-[#6B7280] group-hover:text-blue-400 transition-colors" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{step.label}</p>
                                                <p className="text-[10px] text-[#9CA3AF] truncate">{step.done ? '✓ Completado' : step.desc}</p>
                                            </div>
                                            {!step.done && <ChevronRight size={12} className="text-[#111827]/15 group-hover:text-blue-400 shrink-0 transition-colors" />}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── STATS ───────────────────────────── */}
                    {metaCampaigns.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: 'Total', value: metaCampaigns.length, icon: Target, color: 'text-[#111827]', accent: 'rgba(0,129,251,0.12)', border: 'rgba(0,129,251,0.22)', iconColor: 'text-blue-400' },
                                { label: 'Publicadas', value: published, icon: Flame, color: 'text-emerald-400', accent: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.18)', iconColor: 'text-emerald-400' },
                                { label: 'Borradores', value: drafts, icon: Clock, color: 'text-blue-400', accent: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.18)', iconColor: 'text-blue-400' },
                                { label: 'Fallidas', value: failed, icon: XCircle, color: 'text-red-400', accent: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.18)', iconColor: 'text-red-400' },
                            ].map(stat => {
                                const Icon = stat.icon
                                return (
                                    <div key={stat.label} className="relative overflow-hidden rounded-2xl p-4 flex items-center gap-3"
                                        style={{ background: stat.accent, border: `1px solid ${stat.border}` }}>
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                                            <Icon size={17} className={stat.iconColor} />
                                        </div>
                                        <div>
                                            <p className={`text-2xl font-black leading-none tabular-nums ${stat.color}`}>{stat.value}</p>
                                            <p className="text-[10px] text-[#6B7280] font-medium mt-0.5">{stat.label}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* ── CONEXIÓN + NEGOCIOS + CAMPAÑAS ──────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5">

                        {/* Conexión Meta */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Conexión</span>
                                <Link href="/dashboard/services/ads/setup" className="flex items-center gap-1 text-[10px] text-blue-400 hover:underline">
                                    <Settings2 size={10} /> Configurar
                                </Link>
                            </div>
                            <div className="relative overflow-hidden rounded-2xl flex items-center gap-3 p-3.5"
                                style={{
                                    background: isConnected
                                        ? `#FFFFFF`
                                        : `#F8FAFC`,
                                    border: isConnected ? '1px solid #E4E9F0' : '1px dashed #E4E9F0',
                                }}>
                                <div className="pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full blur-[40px]"
                                    style={{ background: isConnected ? PLATFORM.glow : 'transparent' }} />

                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #E4E9F0' }}>
                                    <span className={`font-black text-sm ${PLATFORM.textColor}`}>{PLATFORM.letter}</span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-xs leading-tight">{PLATFORM.label}</p>
                                    {isConnected && metaIntegration?.connectedAccount
                                        ? <p className="text-[10px] text-[#6B7280] truncate">↳ {metaIntegration.connectedAccount.displayName}</p>
                                        : <p className="text-[10px] text-[#9CA3AF] truncate">{PLATFORM.sub}</p>
                                    }
                                </div>

                                {isConnected && (
                                    <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full shrink-0"
                                        style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                        ACTIVA
                                    </span>
                                )}

                                <button onClick={handleConnect}
                                    className="text-[10px] font-bold py-1.5 px-3 rounded-xl shrink-0 transition-all active:scale-[0.97]"
                                    style={{
                                        background: isConnected ? '#F0F3F7' : 'rgba(0,129,251,0.18)',
                                        border: isConnected ? '1px solid #E4E9F0' : '1px solid rgba(0,129,251,0.32)',
                                        color: isConnected ? '#6B7280' : '#93c5fd'
                                    }}>
                                    {isConnected ? 'Reconf.' : '+ Conectar'}
                                </button>
                            </div>
                        </div>

                        {/* Mis Negocios */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Mis Negocios</span>
                                <Link href="/dashboard/services/ads/brief" className="flex items-center gap-1 text-[10px] text-blue-400 hover:underline">
                                    Gestionar <ArrowRight size={10} />
                                </Link>
                            </div>

                            {allBriefs.length === 0 ? (
                                <Link href="/dashboard/services/ads/brief"
                                    className="flex flex-col items-center justify-center rounded-2xl py-10 gap-3 group transition-all"
                                    style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.07)' }}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: 'rgba(0,129,251,0.10)', border: '1px solid rgba(0,129,251,0.20)' }}>
                                        <FileText size={16} className="text-blue-400" />
                                    </div>
                                    <p className="text-xs text-[#6B7280] font-medium">Crear perfil de negocio</p>
                                </Link>
                            ) : (
                                <div className="space-y-2">
                                    {allBriefs.slice(0, 3).map((b: any) => (
                                        <div key={b.id}
                                            className="flex items-center gap-3 rounded-2xl px-3.5 py-3 group"
                                            style={{ background: `#FFFFFF`, border: '1px solid #E4E9F0' }}>
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: 'rgba(0,129,251,0.12)', border: '1px solid rgba(0,129,251,0.20)' }}>
                                                <FileText size={13} className="text-blue-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{b.name}</p>
                                                <p className="text-[10px] text-[#9CA3AF] truncate">{b.industry}</p>
                                            </div>
                                            <Link href={`/dashboard/services/ads/wizard?briefId=${b.id}&platform=${PLATFORM_ID}`}
                                                className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl shrink-0 transition-all active:scale-[0.97]"
                                                style={{ background: 'rgba(0,129,251,0.7)', color: '#dbeafe', border: '1px solid rgba(0,129,251,0.45)' }}>
                                                Campaña <ArrowRight size={9} />
                                            </Link>
                                        </div>
                                    ))}
                                    {allBriefs.length > 3 && (
                                        <Link href="/dashboard/services/ads/brief"
                                            className="flex items-center justify-center py-2 text-[10px] text-[#9CA3AF] hover:text-[#6B7280] transition-all font-medium">
                                            +{allBriefs.length - 3} más
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Campañas recientes (sólo Meta) */}
                        <div className="lg:col-span-2 2xl:col-span-1">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={12} className="text-[#6B7280]" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Campañas Meta</span>
                                </div>
                                {metaCampaigns.length > 0 && (
                                    <Link href="/dashboard/services/ads/history" className="text-[10px] text-blue-400 hover:underline">Ver todas →</Link>
                                )}
                            </div>

                            {metaCampaigns.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-3xl text-center px-4"
                                    style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.07)' }}>
                                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                                        style={{ background: 'rgba(0,129,251,0.10)', border: '1px solid rgba(0,129,251,0.20)' }}>
                                        <Sparkles className="text-blue-400" size={22} />
                                    </div>
                                    <div>
                                        <p className="text-[#6B7280] text-sm font-bold mb-1">Sin campañas todavía</p>
                                        <p className="text-[#9CA3AF] text-xs">Crea tu primera campaña Meta impulsada por IA</p>
                                    </div>
                                    <Link href={`/dashboard/services/ads/wizard?platform=${PLATFORM_ID}`}
                                        className="flex items-center gap-2 text-[#111827] text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
                                        style={{ background: `linear-gradient(135deg, ${PLATFORM.accent}, #3b82f6)` }}>
                                        <Plus size={14} /> Crear campaña
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {metaCampaigns.slice(0, 5).map((campaign: any) => {
                                        const status = STATUS_LABELS[campaign.status] || STATUS_LABELS['DRAFT']
                                        return (
                                            <div key={campaign.id}
                                                className="group rounded-2xl p-4 flex items-center gap-3 transition-all"
                                                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
                                                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                                                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>

                                                {/* platform icon */}
                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                                    style={{ background: '#F0F3F7', border: '1px solid #E4E9F0' }}>
                                                    <span className={`font-black text-sm ${PLATFORM.textColor}`}>{PLATFORM.letter}</span>
                                                </div>

                                                {/* info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm leading-tight truncate">{campaign.name}</p>
                                                    <p className="text-[10px] text-[#9CA3AF] truncate mt-0.5">{campaign.strategy?.name || campaign.brief?.name}</p>
                                                </div>

                                                {/* status + action */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-full border ${status.bg} ${status.color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                                        {status.label}
                                                    </span>
                                                    {campaign.status === 'READY' && (
                                                        <Link href={`/dashboard/services/ads/preview/${campaign.id}`}
                                                            className="text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all"
                                                            style={{ background: 'rgba(0,129,251,0.7)', color: '#dbeafe', border: '1px solid rgba(0,129,251,0.45)' }}>
                                                            Publicar →
                                                        </Link>
                                                    )}
                                                    {campaign.status === 'DRAFT' && (
                                                        <Link href={`/dashboard/services/ads/campaign/${campaign.strategyId}?edit=${campaign.id}`}
                                                            className="text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all"
                                                            style={{ background: 'rgba(255,255,255,0.06)', color: '#6B7280', border: '1px solid #E4E9F0' }}>
                                                            Continuar
                                                        </Link>
                                                    )}
                                                    {campaign.status === 'FAILED' && (
                                                        <Link href={`/dashboard/services/ads/preview/${campaign.id}`}
                                                            className="text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all"
                                                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                                                            Reintentar
                                                        </Link>
                                                    )}
                                                    {campaign.status === 'PUBLISHED' && (
                                                        <button
                                                            onClick={() => handlePause(campaign.id)}
                                                            disabled={actionLoading === campaign.id + '-pause'}
                                                            className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-40"
                                                            style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>
                                                            {actionLoading === campaign.id + '-pause' ? <Loader2 size={10} className="animate-spin" /> : <Pause size={10} />}
                                                            Pausar
                                                        </button>
                                                    )}
                                                    {campaign.status === 'PAUSED' && (
                                                        <button
                                                            onClick={() => handleResume(campaign.id)}
                                                            disabled={actionLoading === campaign.id + '-resume'}
                                                            className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-40"
                                                            style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
                                                            {actionLoading === campaign.id + '-resume' ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                                                            Reanudar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}

                                    <Link href="/dashboard/services/ads/history"
                                        className="flex items-center justify-center gap-2 py-3 rounded-2xl text-xs text-[#6B7280] font-bold hover:text-[#6B7280] transition-all"
                                        style={{ background: `#FFFFFF`, border: '1px solid #E4E9F0' }}>
                                        Ver todas las campañas <ArrowRight size={11} />
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    )
}
