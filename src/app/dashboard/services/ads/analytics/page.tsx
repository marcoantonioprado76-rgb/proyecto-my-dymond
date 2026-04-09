'use client'

import { useState, useEffect, useRef } from 'react'
import {
    ArrowLeft, Loader2, TrendingUp, Eye, MousePointerClick,
    DollarSign, RefreshCw, BarChart3, Target, Zap
} from 'lucide-react'
import Link from 'next/link'

interface DayRow {
    date: string
    campaignId: string
    campaignName: string
    spend: number
    impressions: number
    clicks: number
    conversions: number
    ctr: string
    cpc: string
    cpa: string
}

interface CampaignTotal {
    campaignId: string
    campaignName: string
    spend: string
    impressions: number
    clicks: number
    conversions: number
    ctr: string
    cpc: string
    cpa: string
}

interface DailyAgg {
    date: string
    spend: number
    impressions: number
    clicks: number
    conversions: number
}

const PERIODS = [
    { key: '7', label: '7 días' },
    { key: '14', label: '14 días' },
    { key: '30', label: '30 días' },
]

const METRICS = [
    { key: 'spend',       label: 'Gasto',       color: '#10B981' },
    { key: 'clicks',      label: 'Clics',        color: '#8B5CF6' },
    { key: 'impressions', label: 'Impresiones',  color: '#0D1E79' },
    { key: 'conversions', label: 'Conversiones', color: '#F59E0B' },
]

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtShort(iso: string) {
    const d = new Date(iso + 'T00:00:00')
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
}

function smoothCurve(pts: { x: number; y: number }[]): string {
    if (pts.length === 0) return ''
    if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
    const t = 0.25
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[Math.min(pts.length - 1, i + 2)]
        const cp1x = p1.x + (p2.x - p0.x) * t
        const cp1y = p1.y + (p2.y - p0.y) * t
        const cp2x = p2.x - (p3.x - p1.x) * t
        const cp2y = p2.y - (p3.y - p1.y) * t
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
    return d
}

function MultiLineChart({ days, activeMetrics }: { days: DailyAgg[]; activeMetrics: Set<string> }) {
    const svgRef = useRef<SVGSVGElement>(null)
    const [hoverIdx, setHoverIdx] = useState<number | null>(null)
    const W = 620, H = 220, padL = 8, padR = 8, padT = 20, padB = 32
    const xOf = (i: number) => padL + (days.length > 1 ? i / (days.length - 1) : 0.5) * (W - padL - padR)
    const yOf = (v: number, max: number) => padT + (1 - (max > 0 ? v / max : 0)) * (H - padT - padB)
    const activeList = METRICS.filter(m => activeMetrics.has(m.key))
    const lines = activeList.map(m => {
        const vals = days.map(d => (d as any)[m.key] as number)
        const max = Math.max(...vals, 1)
        const pts = days.map((_, i) => ({ x: xOf(i), y: yOf(vals[i], max), val: vals[i] }))
        const path = smoothCurve(pts)
        const area = path ? `${path} L ${pts[pts.length - 1].x.toFixed(1)} ${(H - padB).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(H - padB).toFixed(1)} Z` : ''
        return { ...m, pts, path, area }
    })
    const step = Math.max(1, Math.floor(days.length / 6))
    const xIdx = days.map((_, i) => i).filter(i => i % step === 0 || i === days.length - 1)
    function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
        if (!svgRef.current || days.length < 2) return
        const rect = svgRef.current.getBoundingClientRect()
        const mx = ((e.clientX - rect.left) / rect.width) * W
        const frac = Math.max(0, Math.min(1, (mx - padL) / (W - padL - padR)))
        setHoverIdx(Math.round(frac * (days.length - 1)))
    }
    const hoverX = hoverIdx !== null ? xOf(hoverIdx) : null
    return (
        <div style={{ position: 'relative' }}>
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
                style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', cursor: 'crosshair' }}
                onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
                <defs>
                    {activeList.map(m => (
                        <linearGradient key={m.key} id={`g-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={m.color} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={m.color} stopOpacity="0" />
                        </linearGradient>
                    ))}
                    {activeList.map(m => (
                        <filter key={m.key} id={`gf-${m.key}`} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="b" />
                            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    ))}
                </defs>
                {[0, 0.5, 1].map((f, i) => {
                    const y = padT + f * (H - padT - padB)
                    return <line key={i} x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray={i === 0 ? 'none' : '4 6'} />
                })}
                <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                {lines.map(l => (
                    <g key={l.key}>
                        {days.length === 1 ? (
                            <>
                                <line x1={padL} y1={l.pts[0].y} x2={W - padR} y2={l.pts[0].y} stroke={l.color} strokeWidth="1.5" strokeDasharray="4 4" opacity={0.5} />
                                <circle cx={l.pts[0].x} cy={l.pts[0].y} r="5" fill={l.color} stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" filter={`url(#gf-${l.key})`} />
                            </>
                        ) : (
                            <>
                                {l.area && <path d={l.area} fill={`url(#g-${l.key})`} />}
                                {l.path && <path d={l.path} fill="none" stroke={l.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" filter={`url(#gf-${l.key})`} />}
                            </>
                        )}
                    </g>
                ))}
                {hoverIdx !== null && hoverX !== null && (
                    <>
                        <line x1={hoverX} y1={padT} x2={hoverX} y2={H - padB} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 3" />
                        {lines.map(l => <circle key={l.key} cx={l.pts[hoverIdx]?.x} cy={l.pts[hoverIdx]?.y} r="4" fill={l.color} stroke="rgba(0,0,0,0.6)" strokeWidth="1.5" />)}
                    </>
                )}
                {xIdx.map(i => (
                    <text key={i} x={xOf(i)} y={H - 8} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.25)" fontFamily="system-ui">
                        {fmtShort(days[i].date)}
                    </text>
                ))}
            </svg>
            {hoverIdx !== null && (
                <div style={{
                    position: 'absolute', top: 0,
                    left: `clamp(8px, calc(${(hoverIdx / Math.max(days.length - 1, 1)) * 100}% - 80px), calc(100% - 168px))`,
                    background: '#0D0F1E', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', padding: '8px 12px', pointerEvents: 'none', zIndex: 10, minWidth: '160px',
                }}>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: 700, marginBottom: '6px' }}>
                        {fmtShort(days[hoverIdx].date)}
                    </p>
                    {lines.map(l => (
                        <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{l.label}:</span>
                            <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>
                                {l.key === 'spend' ? `$${Number(l.pts[hoverIdx]?.val ?? 0).toFixed(2)}` : fmt(l.pts[hoverIdx]?.val ?? 0)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function AnalyticsPage() {
    const [rows, setRows] = useState<DayRow[]>([])
    const [totals, setTotals] = useState<CampaignTotal[]>([])
    const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([])
    const [period, setPeriod] = useState('7')
    const [selectedCampaign, setSelectedCampaign] = useState('ALL')
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [activeMetrics, setActiveMetrics] = useState<Set<string>>(new Set(['spend', 'clicks', 'impressions']))

    useEffect(() => { fetchData(false) }, [period, selectedCampaign])

    async function fetchData(manual: boolean) {
        if (manual) setRefreshing(true)
        else setLoading(true)
        setFetchError(null)
        try {
            const params = new URLSearchParams({ days: period })
            if (selectedCampaign !== 'ALL') params.set('campaignId', selectedCampaign)
            const res = await fetch(`/api/ads/metrics?${params}`)
            const data = await res.json()
            if (!res.ok) {
                setFetchError(data.error || 'Error al cargar métricas')
                return
            }
            setRows(data.rows || [])
            setTotals(data.totals || [])
            setCampaigns(data.campaigns || [])
        } catch (e: any) {
            setFetchError('Error de conexión al cargar métricas')
        }
        finally { setLoading(false); setRefreshing(false) }
    }

    // Aggregate rows by date for the chart
    const dailyMap = new Map<string, DailyAgg>()
    for (const row of rows) {
        const existing = dailyMap.get(row.date)
        if (!existing) {
            dailyMap.set(row.date, { date: row.date, spend: row.spend, impressions: row.impressions, clicks: row.clicks, conversions: row.conversions })
        } else {
            existing.spend += row.spend
            existing.impressions += row.impressions
            existing.clicks += row.clicks
            existing.conversions += row.conversions
        }
    }
    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date > b.date ? 1 : -1)

    // Grand totals
    const grand = totals.reduce((acc, t) => ({
        spend: acc.spend + parseFloat(t.spend),
        impressions: acc.impressions + t.impressions,
        clicks: acc.clicks + t.clicks,
        conversions: acc.conversions + t.conversions,
    }), { spend: 0, impressions: 0, clicks: 0, conversions: 0 })

    const ctr = grand.impressions > 0 ? ((grand.clicks / grand.impressions) * 100).toFixed(2) : '0.00'
    const cpc = grand.clicks > 0 ? (grand.spend / grand.clicks).toFixed(2) : '0.00'
    const cpa = grand.conversions > 0 ? (grand.spend / grand.conversions).toFixed(2) : null

    function toggleMetric(key: string) {
        setActiveMetrics(prev => {
            const next = new Set(prev)
            if (next.has(key)) { if (next.size === 1) return prev; next.delete(key) } else { next.add(key) }
            return next
        })
    }

    const summaryCards = [
        { label: 'Gasto', value: `$${grand.spend.toFixed(2)}`, color: '#10B981', icon: DollarSign },
        { label: 'Clics', value: fmt(grand.clicks), color: '#8B5CF6', icon: MousePointerClick },
        { label: 'Impresiones', value: fmt(grand.impressions), color: '#0D1E79', icon: Eye },
        { label: 'Conversiones', value: fmt(grand.conversions), color: '#F59E0B', icon: Target },
        { label: 'CTR', value: `${ctr}%`, color: '#2DD4BF', icon: TrendingUp },
        { label: 'CPC', value: `$${cpc}`, color: '#A78BFA', icon: Zap },
        ...(grand.conversions > 0 ? [{ label: 'CPA', value: `$${cpa}`, color: '#F472B6', icon: DollarSign }] : [])
    ]

    return (
        <div className="px-4 md:px-6 pt-6 max-w-5xl mx-auto pb-24 text-white">

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link href="/dashboard/services/ads"
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all shrink-0">
                    <ArrowLeft size={15} />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg md:text-xl font-black uppercase tracking-tighter">Analytics de Campañas</h1>
                    <p className="text-[11px] text-white/30">Métricas de tus campañas publicadas en Meta Ads</p>
                </div>
                <button onClick={() => fetchData(true)}
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                    <RefreshCw size={14} className={refreshing ? 'animate-spin text-purple-400' : ''} />
                </button>
            </div>

            {/* Error banner */}
            {fetchError && (
                <div className="mb-5 flex items-center gap-3 p-3.5 rounded-2xl text-red-400 text-xs"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span className="flex-1">{fetchError}</span>
                    <button onClick={() => setFetchError(null)} className="text-red-400/50 hover:text-red-400">✕</button>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
                <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                    {PERIODS.map(p => (
                        <button key={p.key} onClick={() => setPeriod(p.key)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${period === p.key ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white/70'}`}>
                            {p.label}
                        </button>
                    ))}
                </div>
                {campaigns.length > 1 && (
                    <select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}
                        className="bg-[#1c1d2e] border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 [&>option]:bg-[#1c1d2e]">
                        <option value="ALL">Todas las campañas</option>
                        {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                )}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-3">
                    <Loader2 size={28} className="animate-spin text-purple-400" />
                    <p className="text-white/30 text-sm">Cargando métricas desde Meta Ads...</p>
                </div>
            ) : daily.length === 0 ? (
                <div className="text-center py-24 bg-white/[0.015] border border-dashed border-white/8 rounded-3xl">
                    <BarChart3 size={32} className="text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 font-bold text-sm">Sin datos para este período</p>
                    <p className="text-white/20 text-xs mt-1">Las campañas publicadas aparecerán aquí</p>
                    <Link href="/dashboard/services/ads" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:underline">
                        ← Volver a Campañas
                    </Link>
                </div>
            ) : (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
                        {summaryCards.map(({ label, value, color, icon: Icon }) => (
                            <div key={label} className="bg-white/3 border border-white/8 rounded-2xl p-3.5">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color }}>
                                    <Icon size={10} /> {label}
                                </div>
                                <p className="text-lg font-black tabular-nums">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Chart */}
                    <div className="bg-white/3 border border-white/8 rounded-2xl p-4 md:p-5 mb-4">
                        <div className="flex flex-wrap gap-2 mb-5">
                            {METRICS.map(m => {
                                const on = activeMetrics.has(m.key)
                                return (
                                    <button key={m.key} onClick={() => toggleMetric(m.key)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
                                        style={on
                                            ? { background: m.color + '20', borderColor: m.color + '50', color: m.color }
                                            : { background: 'rgba(13,30,121,0.4)', borderColor: 'rgba(210,3,221,0.15)', color: 'rgba(255,255,255,0.3)' }}>
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: on ? m.color : 'rgba(255,255,255,0.2)', display: 'inline-block', flexShrink: 0 }} />
                                        {m.label}
                                    </button>
                                )
                            })}
                        </div>
                        <MultiLineChart days={daily} activeMetrics={activeMetrics} />
                    </div>

                    {/* Per-campaign totals */}
                    {totals.length > 1 && (
                        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden mb-4">
                            <div className="px-4 py-3 border-b border-white/6">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Por campaña</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            {['Campaña', 'Gasto', 'Clics', 'Impresiones', 'Conversiones', 'CTR', 'CPC'].map(h => (
                                                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-white/25">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {totals.map(t => (
                                            <tr key={t.campaignId} className="border-b border-white/4 hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 py-2.5 font-bold text-white/80 max-w-[180px] truncate">{t.campaignName}</td>
                                                <td className="px-4 py-2.5 font-bold" style={{ color: '#10B981' }}>${t.spend}</td>
                                                <td className="px-4 py-2.5 font-bold" style={{ color: '#8B5CF6' }}>{fmt(t.clicks)}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#0D1E79' }}>{fmt(t.impressions)}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#F59E0B' }}>{fmt(t.conversions)}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#2DD4BF' }}>{t.ctr}%</td>
                                                <td className="px-4 py-2.5" style={{ color: '#A78BFA' }}>${t.cpc}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Daily breakdown */}
                    <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/6">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Detalle diario</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        {['Fecha', 'Gasto', 'Clics', 'Impresiones', 'Conversiones', 'CTR', 'CPC'].map(h => (
                                            <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-white/25">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...daily].reverse().map(d => {
                                        const dayCtr = d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) : '0.00'
                                        const dayCpc = d.clicks > 0 ? (d.spend / d.clicks).toFixed(2) : '0.00'
                                        return (
                                            <tr key={d.date} className="border-b border-white/4 hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 py-2.5 text-white/60 font-medium">{fmtShort(d.date)}</td>
                                                <td className="px-4 py-2.5 font-bold" style={{ color: '#10B981' }}>${d.spend.toFixed(2)}</td>
                                                <td className="px-4 py-2.5 font-bold" style={{ color: '#8B5CF6' }}>{fmt(d.clicks)}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#0D1E79' }}>{fmt(d.impressions)}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#F59E0B' }}>{fmt(d.conversions)}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#2DD4BF' }}>{dayCtr}%</td>
                                                <td className="px-4 py-2.5" style={{ color: '#A78BFA' }}>${dayCpc}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
