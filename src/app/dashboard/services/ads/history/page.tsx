'use client'

import { useState, useEffect } from 'react'
import {
    ArrowLeft, Loader2, ExternalLink, RefreshCw, BarChart3,
    AlertCircle, TrendingUp, Eye, MousePointerClick, DollarSign,
    Users, ChevronDown, ChevronUp, Sparkles, Plus, Trash2
} from 'lucide-react'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
    DRAFT: { label: 'Borrador', color: 'text-[#9CA3AF] bg-[#F4F6FA] border-[#E4E9F0]', dot: 'bg-[#F0F3F7]' },
    READY: { label: 'Listo', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-400' },
    PUBLISHING: { label: 'Publicando', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', dot: 'bg-yellow-400 animate-pulse' },
    PUBLISHED: { label: 'Publicado', color: 'text-green-400 bg-green-500/10 border-green-500/20', dot: 'bg-green-400' },
    FAILED: { label: 'Error', color: 'text-red-400 bg-red-500/10 border-red-500/20', dot: 'bg-red-400' },
    PAUSED: { label: 'Pausado', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-400' },
}

const PLATFORM_MAP: Record<string, { letter: string; color: string }> = {
    META: { letter: 'f', color: 'text-blue-400' },
    TIKTOK: { letter: 'T', color: 'text-red-400' },
    GOOGLE_ADS: { letter: 'G', color: 'text-yellow-400' },
}

const FILTERS = ['ALL', 'DRAFT', 'READY', 'PUBLISHED', 'PAUSED', 'FAILED']
const FILTER_LABELS: Record<string, string> = {
    ALL: 'Todas', DRAFT: 'Borrador', READY: 'Listo',
    PUBLISHED: 'Publicadas', PAUSED: 'Pausadas', FAILED: 'Fallidas'
}

interface Metric {
    impressions: number; clicks: number; spend: number; reach: number
    ctr: number; cpm: number; error?: string
}

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
}

export default function HistoryPage() {
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('ALL')
    const [refreshing, setRefreshing] = useState(false)
    const [metrics, setMetrics] = useState<Record<string, Metric>>({})
    const [loadingMetrics, setLoadingMetrics] = useState(false)
    const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set())
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)

    useEffect(() => { fetchCampaigns() }, [])

    async function fetchCampaigns(showRefreshing = false) {
        if (showRefreshing) setRefreshing(true)
        else setLoading(true)
        try {
            const res = await fetch('/api/ads/campaign')
            const data = await res.json()
            const list = data.campaigns || []
            setCampaigns(list)
            // Auto-fetch metrics for published campaigns
            const publishedIds = list.filter((c: any) => c.status === 'PUBLISHED' && c.providerCampaignId).map((c: any) => c.id)
            if (publishedIds.length > 0) fetchMetrics(publishedIds)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    async function fetchMetrics(ids: string[]) {
        if (ids.length === 0) return
        setLoadingMetrics(true)
        try {
            const res = await fetch(`/api/ads/metrics?days=7`)
            if (!res.ok) return
            const data = await res.json()
            // API returns { totals: [{ campaignId, spend, impressions, clicks, conversions, ctr, cpc }] }
            const map: Record<string, Metric> = {}
            for (const t of (data.totals || [])) {
                if (!ids.includes(t.campaignId)) continue
                map[t.campaignId] = {
                    impressions: t.impressions || 0,
                    clicks: t.clicks || 0,
                    spend: parseFloat(t.spend) || 0,
                    reach: 0,
                    ctr: parseFloat(t.ctr) || 0,
                    cpm: t.impressions > 0 ? parseFloat(t.spend) / t.impressions * 1000 : 0,
                }
            }
            setMetrics(prev => ({ ...prev, ...map }))
        } catch { /* metrics are optional */ } finally {
            setLoadingMetrics(false)
        }
    }

    async function deleteCampaign(id: string) {
        setDeleting(id)
        try {
            await fetch(`/api/ads/campaign/${id}`, { method: 'DELETE' })
            setCampaigns(prev => prev.filter(c => c.id !== id))
            setConfirmDelete(null)
        } finally {
            setDeleting(null)
        }
    }

    const filtered = filter === 'ALL' ? campaigns : campaigns.filter(c => c.status === filter)

    // Aggregate metrics for published campaigns
    const totalPublished = campaigns.filter(c => c.status === 'PUBLISHED').length
    const metricValues = Object.values(metrics) as Metric[]
    const totalImpressions = metricValues.reduce((s, m) => s + (m.impressions || 0), 0)
    const totalClicks = metricValues.reduce((s, m) => s + (m.clicks || 0), 0)
    const totalSpend = metricValues.reduce((s, m) => s + (m.spend || 0), 0)
    const totalReach = metricValues.reduce((s, m) => s + (m.reach || 0), 0)

    return (
        <div className="px-4 md:px-6 pt-6 max-w-screen-2xl mx-auto pb-24 text-[#111827]">

            {/* Header */}
            <div className="flex items-center gap-3 mb-7">
                <Link href="/dashboard/services/ads/meta"
                    className="w-9 h-9 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] flex items-center justify-center hover:bg-[#F0F3F7] transition-all shrink-0">
                    <ArrowLeft size={15} />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg md:text-xl font-black uppercase tracking-tighter">Historial de Campañas</h1>
                    <p className="text-[11px] text-[#9CA3AF]">{campaigns.length} campañas · {totalPublished} activas</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/services/ads/wizard"
                        className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition-all">
                        <Plus size={13} /> Nueva
                    </Link>
                    <button onClick={() => fetchCampaigns(true)}
                        className="w-9 h-9 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] flex items-center justify-center hover:bg-[#F0F3F7] transition-all shrink-0">
                        <RefreshCw size={14} className={refreshing ? 'animate-spin text-purple-400' : ''} />
                    </button>
                </div>
            </div>

            {/* Global metrics summary — last 30 days */}
            {totalPublished > 0 && (
                <div className="mb-2">
                    <p className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-widest mb-2">Últimos 30 días</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {[
                        { icon: <Eye size={14} />, label: 'Impresiones', value: fmt(totalImpressions), color: 'text-blue-400' },
                        { icon: <MousePointerClick size={14} />, label: 'Clics', value: fmt(totalClicks), color: 'text-purple-400' },
                        { icon: <DollarSign size={14} />, label: 'Gasto', value: `$${totalSpend.toFixed(2)}`, color: 'text-green-400' },
                        { icon: <Users size={14} />, label: 'Alcance', value: fmt(totalReach), color: 'text-orange-400' },
                    ].map(({ icon, label, value, color }) => (
                        <div key={label} className="bg-white/3 border border-[#E4E9F0] rounded-2xl p-4">
                            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-2 ${color}`}>
                                {icon} {label}
                            </div>
                            <p className="text-lg font-black">
                                {loadingMetrics ? <span className="w-12 h-4 bg-[#F4F6FA] rounded animate-pulse inline-block" /> : value}
                            </p>
                        </div>
                    ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
                {FILTERS.map(s => {
                    const count = s === 'ALL' ? campaigns.length : campaigns.filter(c => c.status === s).length
                    return (
                        <button key={s} onClick={() => setFilter(s)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap shrink-0 ${filter === s
                                ? 'bg-white text-black border-white'
                                : 'bg-[#F4F6FA] border-[#E4E9F0] text-[#9CA3AF] hover:border-[#E4E9F0] hover:text-[#6B7280]'
                            }`}>
                            {FILTER_LABELS[s]}
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${filter === s ? 'bg-black/10' : 'bg-[#F0F3F7]'}`}>
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Loader2 className="animate-spin text-purple-400" size={28} />
                    <p className="text-[#9CA3AF] text-sm">Cargando campañas...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.015] border border-dashed border-[#E4E9F0] rounded-3xl">
                    <BarChart3 size={28} className="text-[#9CA3AF] mx-auto mb-3" />
                    <p className="text-[#9CA3AF] text-sm font-bold">Sin campañas</p>
                    <p className="text-[#9CA3AF] text-xs mt-1 mb-6">No hay campañas con este filtro</p>
                    <Link href="/dashboard/services/ads/wizard"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-500 transition-all">
                        <Sparkles size={14} /> Crear primera campaña
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((campaign: any) => {
                        const status = STATUS_LABELS[campaign.status] || STATUS_LABELS['DRAFT']
                        const plat = PLATFORM_MAP[campaign.platform]
                        const creativesWithMedia = campaign.creatives?.filter((c: any) => c.mediaUrl).length || 0
                        const campaignMetrics: Metric | undefined = metrics[campaign.id]
                        const hasMetrics = !!campaignMetrics && !campaignMetrics.error && campaignMetrics.impressions > 0
                        const metricsExpanded = expandedMetrics.has(campaign.id)

                        return (
                            <div key={campaign.id}
                                className="bg-white/3 border border-[#E4E9F0] rounded-2xl p-4 md:p-5 hover:border-[#E4E9F0] transition-all">

                                {/* Top row */}
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] flex items-center justify-center shrink-0">
                                        {plat && <span className={`font-black text-base ${plat.color}`}>{plat.letter}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start gap-2 justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm leading-tight line-clamp-1">{campaign.name}</h4>
                                                <p className="text-[11px] text-[#9CA3AF] truncate mt-0.5">
                                                    {campaign.strategy?.name}{campaign.brief?.name ? ` · ${campaign.brief.name}` : ''}
                                                </p>
                                            </div>
                                            <span className={`shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${status.color}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                                {status.label}
                                            </span>
                                        </div>

                                        {/* Meta info chips */}
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                            {campaign.dailyBudgetUSD > 0 && (
                                                <span className="text-[10px] text-[#9CA3AF] font-medium">${campaign.dailyBudgetUSD}/día</span>
                                            )}
                                            <span className="text-[10px] text-[#9CA3AF]">{campaign.creatives?.length || 0} anuncios · {creativesWithMedia} con creativo</span>
                                            {campaign.publishedAt && (
                                                <span className="text-[10px] text-[#9CA3AF]">
                                                    {new Date(campaign.publishedAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Inline metrics for published campaigns */}
                                {campaign.status === 'PUBLISHED' && (
                                    <>
                                        {loadingMetrics && !campaignMetrics ? (
                                            <div className="mt-3 grid grid-cols-4 gap-2">
                                                {[0, 1, 2, 3].map(i => (
                                                    <div key={i} className="h-12 bg-white/3 rounded-xl animate-pulse" />
                                                ))}
                                            </div>
                                        ) : hasMetrics ? (
                                            <div className="mt-3">
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[
                                                        { label: 'Impresiones', value: fmt(campaignMetrics!.impressions), color: 'text-blue-400' },
                                                        { label: 'Clics', value: fmt(campaignMetrics!.clicks), color: 'text-purple-400' },
                                                        { label: 'Gasto', value: `$${campaignMetrics!.spend.toFixed(2)}`, color: 'text-green-400' },
                                                        { label: 'Alcance', value: fmt(campaignMetrics!.reach), color: 'text-orange-400' },
                                                    ].map(({ label, value, color }) => (
                                                        <div key={label} className="bg-white/3 rounded-xl p-2.5 text-center">
                                                            <p className={`text-sm font-black ${color}`}>{value}</p>
                                                            <p className="text-[9px] text-[#9CA3AF] mt-0.5">{label}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* CTR / CPM row */}
                                                {metricsExpanded && (
                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                        <div className="bg-white/3 rounded-xl p-2.5 flex items-center gap-2">
                                                            <TrendingUp size={13} className="text-[#9CA3AF]" />
                                                            <div>
                                                                <p className="text-xs font-bold">{campaignMetrics!.ctr.toFixed(2)}%</p>
                                                                <p className="text-[9px] text-[#9CA3AF]">CTR</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white/3 rounded-xl p-2.5 flex items-center gap-2">
                                                            <DollarSign size={13} className="text-[#9CA3AF]" />
                                                            <div>
                                                                <p className="text-xs font-bold">${campaignMetrics!.cpm.toFixed(2)}</p>
                                                                <p className="text-[9px] text-[#9CA3AF]">CPM</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => setExpandedMetrics(prev => {
                                                        const next = new Set(prev)
                                                        next.has(campaign.id) ? next.delete(campaign.id) : next.add(campaign.id)
                                                        return next
                                                    })}
                                                    className="w-full flex items-center justify-center gap-1 text-[10px] text-[#9CA3AF] hover:text-[#9CA3AF] mt-1.5 transition-all">
                                                    {metricsExpanded ? <><ChevronUp size={11} /> Menos métricas</> : <><ChevronDown size={11} /> CTR y CPM</>}
                                                </button>
                                            </div>
                                        ) : campaignMetrics?.error ? (
                                            <div className="mt-3 p-2.5 bg-white/3 rounded-xl flex items-center gap-2">
                                                <AlertCircle size={12} className="text-[#9CA3AF] shrink-0" />
                                                <p className="text-[10px] text-[#9CA3AF]">{campaignMetrics.error}</p>
                                            </div>
                                        ) : null}
                                    </>
                                )}

                                {/* Failure reason */}
                                {campaign.status === 'FAILED' && campaign.failureReason && (
                                    <div className="mt-3 p-3 bg-red-500/5 border border-red-500/15 rounded-xl flex items-start gap-2">
                                        <AlertCircle size={13} className="text-red-400/70 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-red-400/70">{campaign.failureReason}</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E4E9F0]">
                                    {campaign.status === 'READY' && (
                                        <Link href={`/dashboard/services/ads/preview/${campaign.id}`}
                                            className="flex-1 sm:flex-none text-center text-xs font-bold px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition-all">
                                            Publicar →
                                        </Link>
                                    )}
                                    {campaign.status === 'DRAFT' && (
                                        <Link href={`/dashboard/services/ads/campaign/${campaign.strategyId || campaign.id}?edit=${campaign.id}`}
                                            className="flex-1 sm:flex-none text-center text-xs font-bold px-4 py-2 rounded-xl bg-[#F0F3F7] text-[#6B7280] hover:bg-[#F0F3F7] transition-all">
                                            Continuar editando →
                                        </Link>
                                    )}
                                    {campaign.status === 'FAILED' && (
                                        <Link href={`/dashboard/services/ads/preview/${campaign.id}`}
                                            className="flex-1 sm:flex-none text-center text-xs font-bold px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                                            Reintentar
                                        </Link>
                                    )}
                                    {campaign.status === 'PUBLISHED' && campaign.providerCampaignId && (
                                        <a href="https://business.facebook.com/adsmanager" target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all">
                                            <ExternalLink size={12} /> Ads Manager
                                        </a>
                                    )}

                                    <div className="ml-auto flex items-center gap-2">
                                        {campaign.status === 'PUBLISHED' && campaign.providerCampaignId && (
                                            <button onClick={() => fetchMetrics([campaign.id])} className="text-[#9CA3AF] hover:text-[#9CA3AF] transition-all">
                                                <RefreshCw size={12} className={loadingMetrics ? 'animate-spin' : ''} />
                                            </button>
                                        )}

                                        {/* Delete */}
                                        {confirmDelete === campaign.id ? (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] text-[#9CA3AF]">¿Eliminar?</span>
                                                <button
                                                    onClick={() => deleteCampaign(campaign.id)}
                                                    disabled={deleting === campaign.id}
                                                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/35 transition-all disabled:opacity-50"
                                                >
                                                    {deleting === campaign.id ? <Loader2 size={10} className="animate-spin" /> : 'Sí, eliminar'}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete(null)}
                                                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#F4F6FA] border border-[#E4E9F0] text-[#9CA3AF] hover:bg-[#F0F3F7] transition-all"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmDelete(campaign.id)}
                                                className="text-[#9CA3AF] hover:text-red-400 transition-all"
                                                title="Eliminar campaña"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
