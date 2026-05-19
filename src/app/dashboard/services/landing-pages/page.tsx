'use client'

import { useState, useEffect } from 'react'
import { Layout, Plus, ExternalLink, Edit3, Trash2, Users, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { usePlanGuard } from '@/hooks/usePlanGuard'

interface LandingPage {
    id: string
    name: string
    slug: string
    templateId: string
    active: boolean
    updatedAt: string
    _count: {
        leads: number
    }
}

// Paleta cinematográfica — degradados oscuros suaves estilo Framer/Apple/Stripe
// (a → b → c son tonos oscuros profundos; "accent" es el highlight suave para CTA/glow)
const PREVIEW_PALETTES: Array<{ a: string; b: string; c: string; accent: string }> = [
    { a: '#0B1730', b: '#15264A', c: '#1F3A6E', accent: '#6FA8E0' }, // Deep Ocean
    { a: '#15102F', b: '#241B4E', c: '#3A2D72', accent: '#9B8DD8' }, // Royal Twilight
    { a: '#091C28', b: '#0F2E40', c: '#1A4862', accent: '#74C8D8' }, // Petroleum Glow
    { a: '#0A0D1F', b: '#15183A', c: '#2A2D5E', accent: '#8E9AD8' }, // Cosmic Navy
    { a: '#0E1230', b: '#1B1F50', c: '#2E3478', accent: '#A5ADD8' }, // Aurora Indigo
    { a: '#100C24', b: '#1F1A3E', c: '#3A2F62', accent: '#B5A0D8' }, // Smoked Violet
]
function paletteFor(id: string) {
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
    return PREVIEW_PALETTES[h % PREVIEW_PALETTES.length]
}
function variantFor(id: string): 0 | 1 | 2 | 3 {
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) >>> 0
    return (h % 4) as 0 | 1 | 2 | 3
}

// Mini "screenshot" interno — diferentes composiciones tipo Framer/Webflow/Apple
function MiniLanding({ variant, accent }: { variant: 0 | 1 | 2 | 3; accent: string }) {
    const bar = (w: string, op = 0.7, h = 6) =>
        <div style={{ width: w, height: h, borderRadius: 3, background: `rgba(255,255,255,${op})` }} />
    const subBar = (w: string, h = 4) => bar(w, 0.35, h)

    // Variant 0 — Hero clásico + 3 cards
    if (variant === 0) return (
        <div className="absolute inset-0 flex flex-col px-4 pt-7 pb-3 gap-2 pointer-events-none">
            <div className="flex-1 flex flex-col items-start justify-center gap-1.5">
                {bar('60%', 0.85, 7)}
                {subBar('42%', 4)}
                <div className="mt-1.5 flex gap-1.5">
                    <div style={{ width: 30, height: 9, borderRadius: 4, background: accent, opacity: 0.95 }} />
                    <div style={{ width: 24, height: 9, borderRadius: 4, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)' }} />
                </div>
            </div>
            <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                    <div key={i} className="flex-1 h-6 rounded-md" style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)' }} />
                ))}
            </div>
        </div>
    )

    // Variant 1 — Side hero (texto izquierda + imagen derecha)
    if (variant === 1) return (
        <div className="absolute inset-0 flex items-center px-4 pt-7 pb-3 gap-2.5 pointer-events-none">
            <div className="flex-1 flex flex-col gap-1.5">
                {bar('80%', 0.85, 6)}
                {bar('55%', 0.85, 6)}
                {subBar('70%', 4)}
                {subBar('50%', 4)}
                <div className="mt-1 flex gap-1.5">
                    <div style={{ width: 28, height: 8, borderRadius: 4, background: accent }} />
                </div>
            </div>
            <div className="w-[42%] h-[72%] rounded-lg relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${accent}80, rgba(255,255,255,0.18))`, border: '1px solid rgba(255,255,255,0.16)' }}>
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent 60%)' }} />
            </div>
        </div>
    )

    // Variant 2 — Centered hero (Apple-style)
    if (variant === 2) return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 pt-7 pb-3 gap-1.5 pointer-events-none">
            <div style={{ width: 28, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.15)', border: `1px solid ${accent}55` }} />
            {bar('64%', 0.9, 7)}
            {bar('48%', 0.9, 7)}
            <div className="h-1" />
            {subBar('56%', 4)}
            {subBar('40%', 4)}
        </div>
    )

    // Variant 3 — Editorial (texto + galería abajo)
    return (
        <div className="absolute inset-0 flex flex-col px-4 pt-7 pb-3 gap-2 pointer-events-none">
            <div className="flex-1 flex flex-col justify-center gap-1.5">
                <div style={{ width: 22, height: 2, borderRadius: 2, background: accent }} />
                {bar('72%', 0.9, 7)}
                <div className="flex gap-2 mt-1">
                    <div className="flex-1 flex flex-col gap-1">
                        {subBar('100%', 3)}
                        {subBar('90%', 3)}
                        {subBar('80%', 3)}
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                        {subBar('100%', 3)}
                        {subBar('85%', 3)}
                        {subBar('70%', 3)}
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className="flex-1 h-3 rounded" style={{ background: 'rgba(255,255,255,0.10)' }} />
                ))}
            </div>
        </div>
    )
}

export default function LandingPagesPage() {
    usePlanGuard()
    const [pages, setPages] = useState<LandingPage[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPages()
    }, [])

    const fetchPages = async () => {
        try {
            const res = await fetch('/api/landing-pages')
            const data = await res.json()
            if (data.pages) setPages(data.pages)
        } catch (error) {
            console.error('Error fetching pages:', error)
        } finally {
            setLoading(false)
        }
    }

    const deletePage = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta página?')) return
        try {
            await fetch(`/api/landing-pages/${id}`, { method: 'DELETE' })
            setPages(pages.filter(p => p.id !== id))
        } catch (error) {
            console.error('Error deleting page:', error)
        }
    }

    return (
        <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto pb-20 font-inter">
            {/* Page Header — premium compacto */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(123,91,255,0.14)', border: '1px solid rgba(123,91,255,0.32)', boxShadow: '0 0 18px -4px rgba(123,91,255,0.45)' }}>
                        <Layout className="w-5 h-5" style={{ color: '#A78BFA' }} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-white leading-tight" style={{ letterSpacing: '-0.02em' }}>
                            Mis Landing Pages
                        </h1>
                        <p className="text-[11px] text-dark-400 mt-0.5">Galería de páginas de aterrizaje IA · {pages.length} {pages.length === 1 ? 'proyecto' : 'proyectos'}</p>
                    </div>
                </div>

                <Link href="/dashboard/services/landing-pages/create"
                    className="rounded-xl px-4 py-2.5 font-bold flex items-center gap-2 text-sm transition-all active:scale-[0.98]"
                    style={{
                        background: 'linear-gradient(135deg, #7B5BFF, #22B7FF)',
                        color: '#fff',
                        boxShadow: '0 10px 26px -10px rgba(123,91,255,0.6), inset 0 1px 0 rgba(255,255,255,0.18)',
                    }}>
                    <Plus className="w-4 h-4" />
                    Nueva Landing
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {loading ? (
                    <div className="col-span-full flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#A78BFA' }} />
                    </div>
                ) : pages.length === 0 ? (
                    <div className="col-span-full rounded-3xl p-16 text-center"
                        style={{
                            background: 'radial-gradient(120% 75% at 50% -10%, rgba(123,91,255,0.12), rgba(255,255,255,0) 60%), linear-gradient(180deg, rgba(17,19,40,0.82), rgba(11,12,26,0.8))',
                            border: '1px solid rgba(255,255,255,0.07)',
                            boxShadow: '0 22px 50px -22px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
                        }}>
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                            style={{ background: 'rgba(123,91,255,0.12)', border: '1px solid rgba(123,91,255,0.3)', boxShadow: '0 0 28px -6px rgba(123,91,255,0.55)' }}>
                            <Layout className="w-8 h-8" style={{ color: '#A78BFA' }} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>Aún no tienes Landing Pages</h2>
                        <p className="text-dark-400 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                            Crea tu primera página de aterrizaje profesional para capturar nuevos clientes con IA.
                        </p>
                        <Link href="/dashboard/services/landing-pages/create"
                            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold text-sm transition-all active:scale-[0.98]"
                            style={{
                                background: 'linear-gradient(135deg, #7B5BFF, #22B7FF)',
                                color: '#fff',
                                boxShadow: '0 10px 26px -10px rgba(123,91,255,0.6)',
                            }}>
                            <Sparkles className="w-4 h-4" />
                            Crear mi primera landing
                        </Link>
                    </div>
                ) : (
                    pages.map((page) => {
                        const p = paletteFor(page.id)
                        return (
                            <div key={page.id}
                                className="relative rounded-2xl overflow-hidden group transition-all duration-300 hover:-translate-y-1"
                                style={{
                                    background: `radial-gradient(120% 80% at 50% -10%, ${p.accent}1c, rgba(255,255,255,0) 58%), linear-gradient(180deg, rgba(16,18,38,0.92) 0%, rgba(10,11,26,0.88) 100%)`,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    boxShadow: '0 20px 44px -22px rgba(0,0,0,0.82), inset 0 1px 0 rgba(255,255,255,0.045)',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.boxShadow = `0 28px 56px -22px rgba(0,0,0,0.88), 0 0 26px -8px ${p.accent}40, inset 0 1px 0 rgba(255,255,255,0.07)`
                                    e.currentTarget.style.borderColor = `${p.accent}4d`
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.boxShadow = '0 20px 44px -22px rgba(0,0,0,0.82), inset 0 1px 0 rgba(255,255,255,0.045)'
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                                }}>

                                {/* preview cinematográfico — mini landing real con variantes */}
                                <a href={`/lp/${page.slug}`} target="_blank" rel="noopener noreferrer"
                                    className="block relative aspect-[16/10] overflow-hidden"
                                    style={{
                                        background: `linear-gradient(160deg, ${p.a} 0%, ${p.b} 55%, ${p.c} 100%)`,
                                    }}>
                                    {/* viñeta oscura sutil */}
                                    <div className="absolute inset-0 pointer-events-none" style={{
                                        background: 'linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.35) 100%)',
                                    }} />
                                    {/* mini browser chrome */}
                                    <div className="absolute top-0 left-0 right-0 px-3 py-2 flex items-center gap-1.5 pointer-events-none z-10"
                                        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.38), rgba(0,0,0,0))' }}>
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.45)' }} />
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.32)' }} />
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.22)' }} />
                                        <span className="ml-2 text-[9px] font-mono px-2 py-0.5 rounded-md truncate max-w-[58%]"
                                            style={{ color: 'rgba(255,255,255,0.78)', background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(255,255,255,0.10)' }}>
                                            /lp/{page.slug}
                                        </span>
                                    </div>
                                    {/* mini landing real (variante por id) */}
                                    <MiniLanding variant={variantFor(page.id)} accent={p.accent} />
                                    {/* badge ACTIVA */}
                                    <div className="absolute top-2.5 right-2.5 z-10">
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full backdrop-blur-md"
                                            style={page.active
                                                ? { background: 'rgba(34,197,94,0.20)', color: '#86EFAC', border: '1px solid rgba(34,197,94,0.45)' }
                                                : { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                            {page.active && (
                                                <span className="relative flex h-1 w-1">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                    <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-400" />
                                                </span>
                                            )}
                                            {page.active ? 'Activa' : 'Pausada'}
                                        </span>
                                    </div>
                                    {/* icono "abrir" hover */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
                                            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.28)' }}>
                                            <ExternalLink className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                </a>

                                {/* contenido inferior */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h2 className="text-base font-bold text-white truncate" style={{ letterSpacing: '-0.02em' }}>
                                            {page.name}
                                        </h2>
                                        <span className="text-[9px] font-medium uppercase tracking-[0.12em] mt-1 shrink-0 px-2 py-0.5 rounded-full"
                                            style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            {page.templateId}
                                        </span>
                                    </div>
                                    <p className="text-[10.5px] font-mono truncate mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>/lp/{page.slug}</p>

                                    {/* métricas compactas */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                            <Users className="w-3.5 h-3.5" style={{ color: p.accent }} />
                                            <span className="font-bold text-white">{page._count.leads}</span>
                                            <span style={{ color: 'rgba(255,255,255,0.35)' }}>leads</span>
                                        </div>
                                    </div>

                                    {/* acciones */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <Link href={`/dashboard/services/landing-pages/${page.id}/edit`}
                                            className="rounded-lg flex items-center justify-center gap-2 py-2 text-xs font-bold transition-all active:scale-[0.98]"
                                            style={{
                                                background: `linear-gradient(135deg, ${p.accent}26, ${p.accent}10)`,
                                                border: `1px solid ${p.accent}40`,
                                                color: '#fff',
                                                boxShadow: `0 6px 18px -8px ${p.accent}55, inset 0 1px 0 rgba(255,255,255,0.08)`,
                                            }}>
                                            <Edit3 className="w-3.5 h-3.5" />
                                            Editor
                                        </Link>
                                        <a href={`/lp/${page.slug}`} target="_blank" rel="noopener noreferrer"
                                            className="rounded-lg flex items-center justify-center gap-2 py-2 text-xs font-bold transition-all active:scale-[0.98]"
                                            style={{
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                color: 'rgba(255,255,255,0.85)',
                                            }}>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Ver
                                        </a>
                                    </div>
                                    <button onClick={() => deletePage(page.id)}
                                        className="w-full text-[10px] font-medium py-2 mt-1 flex items-center justify-center gap-1.5 transition-colors hover:text-red-400"
                                        style={{ color: 'rgba(255,255,255,0.28)' }}>
                                        <Trash2 className="w-3 h-3" />
                                        Eliminar permanentemente
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
