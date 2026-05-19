'use client'

import { useState, useEffect } from 'react'
import { Layout, Plus, ExternalLink, Edit3, Trash2, Users, Loader2, Eye, Sparkles } from 'lucide-react'
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

// Paleta cinematográfica para los previews — derivada del id de la landing
const PREVIEW_PALETTES: Array<{ a: string; b: string; c: string }> = [
    { a: '#22B7FF', b: '#7B5BFF', c: '#A78BFA' },
    { a: '#7B5BFF', b: '#D203DD', c: '#FF6BD4' },
    { a: '#00C2FF', b: '#22B7FF', c: '#9B6BFF' },
    { a: '#D203DD', b: '#7B5BFF', c: '#22B7FF' },
    { a: '#22D3EE', b: '#22B7FF', c: '#7B5BFF' },
    { a: '#9B6BFF', b: '#A78BFA', c: '#22B7FF' },
]
function paletteFor(id: string) {
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
    return PREVIEW_PALETTES[h % PREVIEW_PALETTES.length]
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
                                    background: `radial-gradient(120% 80% at 50% -10%, ${p.a}1c, rgba(255,255,255,0) 58%), linear-gradient(180deg, rgba(16,18,38,0.92) 0%, rgba(10,11,26,0.88) 100%)`,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    boxShadow: '0 20px 44px -22px rgba(0,0,0,0.82), inset 0 1px 0 rgba(255,255,255,0.045)',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.boxShadow = `0 28px 56px -22px rgba(0,0,0,0.88), 0 0 26px -8px ${p.a}40, inset 0 1px 0 rgba(255,255,255,0.07)`
                                    e.currentTarget.style.borderColor = `${p.a}4d`
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.boxShadow = '0 20px 44px -22px rgba(0,0,0,0.82), inset 0 1px 0 rgba(255,255,255,0.045)'
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                                }}>

                                {/* preview cinematográfico — mini browser mock con gradiente único por landing */}
                                <a href={`/lp/${page.slug}`} target="_blank" rel="noopener noreferrer"
                                    className="block relative aspect-[16/10] overflow-hidden"
                                    style={{
                                        background: `linear-gradient(135deg, ${p.a} 0%, ${p.b} 55%, ${p.c} 100%)`,
                                    }}>
                                    {/* grid técnico */}
                                    <div className="absolute inset-0 pointer-events-none" style={{
                                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
                                        backgroundSize: '24px 24px',
                                        maskImage: 'radial-gradient(ellipse at 50% 40%, #000 50%, transparent 90%)',
                                        WebkitMaskImage: 'radial-gradient(ellipse at 50% 40%, #000 50%, transparent 90%)',
                                    }} />
                                    {/* viñeta oscura */}
                                    <div className="absolute inset-0 pointer-events-none" style={{
                                        background: 'radial-gradient(ellipse at 50% 30%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)',
                                    }} />
                                    {/* mini browser chrome */}
                                    <div className="absolute top-0 left-0 right-0 px-3 py-2 flex items-center gap-1.5 pointer-events-none"
                                        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.42), rgba(0,0,0,0))' }}>
                                        <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} />
                                        <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
                                        <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
                                        <span className="ml-2 text-[9px] font-mono px-2 py-0.5 rounded-md truncate max-w-[60%]"
                                            style={{ color: 'rgba(255,255,255,0.75)', background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.10)' }}>
                                            /lp/{page.slug}
                                        </span>
                                    </div>
                                    {/* hero wireframe */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 pointer-events-none">
                                        <div className="w-2/3 h-2 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.7)' }} />
                                        <div className="w-1/2 h-1.5 rounded-full mb-4" style={{ background: 'rgba(255,255,255,0.35)' }} />
                                        <div className="px-3.5 py-1.5 rounded-md text-[10px] font-bold"
                                            style={{ background: 'rgba(0,0,0,0.32)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
                                            CTA
                                        </div>
                                    </div>
                                    {/* badge ACTIVA */}
                                    <div className="absolute top-2.5 right-2.5">
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full backdrop-blur-md"
                                            style={page.active
                                                ? { background: 'rgba(34,197,94,0.18)', color: '#86EFAC', border: '1px solid rgba(34,197,94,0.45)' }
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
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                        <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md"
                                            style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.25)' }}>
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
                                            <Eye className="w-3.5 h-3.5" style={{ color: p.a }} />
                                            <span className="font-bold text-white">0</span>
                                            <span style={{ color: 'rgba(255,255,255,0.35)' }}>vistas</span>
                                        </div>
                                        <span className="w-px h-3" style={{ background: 'rgba(255,255,255,0.1)' }} />
                                        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                            <Users className="w-3.5 h-3.5" style={{ color: p.b }} />
                                            <span className="font-bold text-white">{page._count.leads}</span>
                                            <span style={{ color: 'rgba(255,255,255,0.35)' }}>leads</span>
                                        </div>
                                    </div>

                                    {/* acciones */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <Link href={`/dashboard/services/landing-pages/${page.id}/edit`}
                                            className="rounded-lg flex items-center justify-center gap-2 py-2 text-xs font-bold transition-all active:scale-[0.98]"
                                            style={{
                                                background: `linear-gradient(135deg, ${p.a}26, ${p.b}1c)`,
                                                border: `1px solid ${p.a}40`,
                                                color: '#fff',
                                                boxShadow: `0 6px 18px -8px ${p.a}55, inset 0 1px 0 rgba(255,255,255,0.08)`,
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
