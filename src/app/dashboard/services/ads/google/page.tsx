'use client'

import { Suspense } from 'react'
import {
    Plus, BarChart3, Activity, Sparkles, FileText, Rocket,
    Brain, Zap, ChevronRight, Construction, Bell, Search
} from 'lucide-react'
import Link from 'next/link'
import AIKeySelector from '@/components/AIKeySelector'
import { usePlanGuard } from '@/hooks/usePlanGuard'

const PLATFORM = {
    id: 'GOOGLE_ADS',
    label: 'Google Ads',
    sub: 'Search · Display · YouTube',
    accent: '#4285F4',
    accentSecondary: '#FBBC04',
    glow: 'rgba(66,133,244,0.18)',
    glowSoft: 'rgba(251,188,4,0.12)',
    accentSoftBorder: 'rgba(66,133,244,0.30)',
    letter: 'G',
    textColor: 'text-yellow-400',
}

export default function GoogleAdsDashboard() {
    usePlanGuard()
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
            </div>
        }>
            <GoogleAdsDashboardInner />
        </Suspense>
    )
}

function GoogleAdsDashboardInner() {
    return (
        <div className="px-4 md:px-6 xl:px-10 pt-6 pb-28 max-w-screen-2xl mx-auto text-white">

            {/* ── HEADER ─────────────────────────────── */}
            <div className="relative rounded-3xl overflow-hidden mb-7 p-6 md:p-8"
                style={{ background: `linear-gradient(135deg, ${PLATFORM.glow} 0%, ${PLATFORM.glowSoft} 50%, rgba(0,0,0,0) 100%)`, border: `1px solid ${PLATFORM.accentSoftBorder}` }}>

                <div className="pointer-events-none absolute -top-10 -left-10 w-56 h-56 rounded-full blur-[80px]" style={{ background: 'rgba(66,133,244,0.22)' }} />
                <div className="pointer-events-none absolute -bottom-10 right-20 w-40 h-40 rounded-full blur-[70px]" style={{ background: 'rgba(251,188,4,0.14)' }} />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <div className="rounded-2xl flex items-center justify-center shrink-0"
                            style={{ background: `linear-gradient(135deg, ${PLATFORM.accent}40, ${PLATFORM.accentSecondary}30)`, border: `1px solid ${PLATFORM.accentSoftBorder}`, width: 52, height: 52 }}>
                            <Search className="text-blue-300" size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-none">
                                    Google Ads
                                </h1>
                                <span className="text-2xl md:text-3xl font-black tracking-tight leading-none text-transparent bg-clip-text"
                                    style={{ backgroundImage: `linear-gradient(90deg, ${PLATFORM.accent}, ${PLATFORM.accentSecondary})` }}>
                                    AI
                                </span>
                            </div>
                            <p className="text-xs text-white/35 font-medium">Search · Display · YouTube · Impulsado por IA</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <AIKeySelector compact />
                        <button disabled
                            className="flex items-center gap-2 text-white/40 text-sm font-bold px-5 py-2.5 rounded-xl cursor-not-allowed opacity-60"
                            style={{ background: `linear-gradient(135deg, ${PLATFORM.accent}55, ${PLATFORM.accentSecondary}40)`, border: '1px dashed rgba(255,255,255,0.18)' }}>
                            <Plus size={15} />
                            Nueva Campaña
                        </button>
                        <button disabled
                            className="flex items-center gap-2 text-white/30 text-sm font-bold px-4 py-2.5 rounded-xl cursor-not-allowed opacity-50"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Activity size={14} />
                            <span className="hidden sm:inline">Analytics</span>
                        </button>
                        <button disabled
                            className="flex items-center gap-2 text-white/30 text-sm font-bold px-4 py-2.5 rounded-xl cursor-not-allowed opacity-50"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <BarChart3 size={14} />
                            <span className="hidden sm:inline">Historial</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── BANNER PRÓXIMAMENTE ─────────────────────────────── */}
            <div className="relative rounded-3xl overflow-hidden mb-6 p-6 md:p-8"
                style={{
                    background: `radial-gradient(120% 80% at 50% -10%, ${PLATFORM.accent}1f, rgba(255,255,255,0) 60%), radial-gradient(80% 80% at 100% 100%, ${PLATFORM.accentSecondary}18, rgba(255,255,255,0) 62%), linear-gradient(180deg, rgba(20,24,48,0.94) 0%, rgba(14,16,34,0.94) 100%)`,
                    border: '1px solid rgba(255,255,255,0.10)',
                    boxShadow: `0 22px 44px -22px rgba(0,0,0,0.78), 0 0 30px -14px ${PLATFORM.accent}38`,
                }}>
                <div className="pointer-events-none absolute -top-8 -right-8 w-44 h-44 rounded-full blur-[60px]" style={{ background: `${PLATFORM.accent}25` }} />
                <div className="pointer-events-none absolute -bottom-10 -left-10 w-44 h-44 rounded-full blur-[60px]" style={{ background: `${PLATFORM.accentSecondary}22` }} />

                <div className="relative flex flex-col md:flex-row md:items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: `linear-gradient(135deg, ${PLATFORM.accent}38, ${PLATFORM.accentSecondary}28)`, border: `1px solid ${PLATFORM.accentSoftBorder}`, boxShadow: `0 0 28px -6px ${PLATFORM.accent}55` }}>
                        <Construction size={26} className="text-blue-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] px-2.5 py-1 rounded-full"
                                style={{ background: 'rgba(251,146,60,0.14)', border: '1px solid rgba(251,146,60,0.3)', color: '#fb923c' }}>
                                PRÓXIMAMENTE
                            </span>
                            <span className="text-[10px] text-white/30 font-medium">Adapter en desarrollo</span>
                        </div>
                        <h2 className="text-lg md:text-xl font-black text-white leading-tight mb-1.5" style={{ letterSpacing: '-0.02em' }}>
                            Google Ads estará disponible muy pronto
                        </h2>
                        <p className="text-sm text-white/55 leading-relaxed max-w-2xl">
                            Estamos integrando Google Ads con MY DIAMOND. Pronto vas a poder lanzar campañas de Search, Display y YouTube con copies generados por IA y métricas en tiempo real.
                        </p>
                    </div>
                    <div className="shrink-0">
                        <button disabled
                            className="flex items-center gap-2 text-sm font-bold px-5 py-3 rounded-xl cursor-not-allowed opacity-70"
                            style={{ background: `linear-gradient(135deg, ${PLATFORM.accent}66, ${PLATFORM.accentSecondary}55)`, color: '#fff', border: `1px solid ${PLATFORM.accentSoftBorder}`, boxShadow: `0 8px 22px -10px ${PLATFORM.accent}66` }}>
                            <Bell size={14} />
                            Te avisamos
                        </button>
                    </div>
                </div>
            </div>

            {/* ── PREVIEW UI (deshabilitada) ─────────────────────────────── */}
            <div className="relative">
                <div className="space-y-6 pointer-events-none opacity-50">

                    {/* Setup preview */}
                    <div className="rounded-3xl p-5 md:p-6" style={{ background: `linear-gradient(135deg, rgba(66,133,244,0.10) 0%, rgba(251,188,4,0.10) 50%, rgba(66,133,244,0.10) 100%)`, border: '1px solid rgba(255,255,255,0.10)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <Rocket size={15} className="text-blue-400" />
                                <span className="font-bold text-sm">Configura Google Ads</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    {[0,1,2].map(i => (
                                        <div key={i} className="h-1 w-8 rounded-full bg-white/8" />
                                    ))}
                                </div>
                                <span className="text-[10px] text-white/30 font-bold tabular-nums">0/3</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {[
                                { label: 'API Key de OpenAI', icon: Brain, desc: 'Genera copies con IA' },
                                { label: 'Perfil de Negocio', icon: FileText, desc: 'Info de tu negocio' },
                                { label: 'Conectar Google', icon: Zap, desc: 'Cuenta de Google Ads' },
                            ].map((step, idx) => {
                                const Icon = step.icon
                                return (
                                    <div key={idx}
                                        className="flex items-center gap-3 p-3.5 rounded-2xl border bg-white/2 border-white/6">
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-white/4">
                                            <Icon size={15} className="text-white/35" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate">{step.label}</p>
                                            <p className="text-[10px] text-white/25 truncate">{step.desc}</p>
                                        </div>
                                        <ChevronRight size={12} className="text-white/15 shrink-0" />
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Empty state preview */}
                    <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-3xl text-center px-4"
                        style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.07)' }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center"
                            style={{ background: `${PLATFORM.accent}15`, border: `1px solid ${PLATFORM.accent}30` }}>
                            <Sparkles className="text-blue-400" size={22} />
                        </div>
                        <div>
                            <p className="text-white/40 text-sm font-bold mb-1">Sin campañas todavía</p>
                            <p className="text-white/20 text-xs">Pronto vas a poder crear campañas de Google con IA</p>
                        </div>
                    </div>
                </div>

                {/* Pista visual abajo */}
                <div className="mt-2 flex items-center justify-center">
                    <Link href="/dashboard/services/ads/meta"
                        className="flex items-center gap-2 text-[11px] text-white/40 hover:text-white/70 transition-colors font-medium">
                        <span>Mientras tanto, podés usar</span>
                        <span className="font-bold text-blue-400">Meta Ads</span>
                        <ChevronRight size={11} />
                    </Link>
                </div>
            </div>
        </div>
    )
}
