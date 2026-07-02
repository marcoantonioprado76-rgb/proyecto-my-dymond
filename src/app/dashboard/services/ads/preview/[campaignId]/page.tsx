'use client'

import { useState, useEffect } from 'react'
import {
    ArrowLeft, Loader2, Rocket, AlertCircle, CheckCircle2,
    Eye, Edit3, ChevronLeft, ChevronRight, Monitor, Smartphone,
    ExternalLink, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'

const STATUS_INFO: Record<string, { label: string; color: string; desc: string }> = {
    DRAFT: { label: 'Borrador', color: 'text-[#9CA3AF]', desc: 'Completa la configuración' },
    READY: { label: 'Listo para publicar', color: 'text-[#233B8F]', desc: 'Todo configurado correctamente' },
    PUBLISHING: { label: 'Publicando...', color: 'text-[#D97706]', desc: 'Enviando a Meta Ads Manager' },
    PUBLISHED: { label: 'Publicado', color: 'text-[#059669]', desc: 'Activo en Meta Ads (estado inicial: pausado)' },
    FAILED: { label: 'Error al publicar', color: 'text-[#DC2626]', desc: 'Revisa los detalles del error' },
    PAUSED: { label: 'Pausado', color: 'text-[#EA580C]', desc: 'Campaña pausada' }
}

export default function PreviewPage() {
    const router = useRouter()
    const { campaignId } = useParams() as { campaignId: string }
    const [campaign, setCampaign] = useState<any>(null)
    const [creatives, setCreatives] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [publishing, setPublishing] = useState(false)
    const [activeSlot, setActiveSlot] = useState(0)
    const [editingSlot, setEditingSlot] = useState<number | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    useEffect(() => { fetchData() }, [campaignId])

    async function fetchData() {
        setLoading(true)
        try {
            const [campRes, copyRes] = await Promise.all([
                fetch('/api/ads/campaign'),
                fetch(`/api/ads/campaign/${campaignId}/copies`)
            ])
            const [campData, copyData] = await Promise.all([campRes.json(), copyRes.json()])
            const camp = campData.campaigns?.find((c: any) => c.id === campaignId)
            if (!camp) { router.push('/dashboard/services/ads/meta'); return }
            setCampaign(camp)
            setCreatives(copyData.creatives || [])
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    async function saveCreative(i: number) {
        const creative = creatives[i]
        if (!creative?.id) return
        setSaving(true)
        try {
            await fetch(`/api/ads/campaign/${campaignId}/copies`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creatives: [creative] })
            })
            setEditingSlot(null)
            setSuccess('Anuncio actualizado')
        } catch { setError('Error al guardar') }
        finally { setSaving(false) }
    }

    async function publish() {
        if (!confirm('¿Publicar esta campaña en Meta Ads? Se creará en estado PAUSADO para que puedas activarla desde tu Ads Manager.')) return
        setPublishing(true)
        setError(null)
        try {
            const res = await fetch(`/api/ads/campaign/${campaignId}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            })
            const data = await res.json()
            if (!res.ok) return setError(data.error || 'Error al publicar')
            setSuccess('¡Campaña publicada exitosamente! Está disponible en tu Ads Manager en estado PAUSADO.')
            fetchData()
        } catch { setError('Error de conexión') }
        finally { setPublishing(false) }
    }

    if (loading) {
        return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin text-[#6A35D9]" size={32} /></div>
    }

    if (!campaign) return null

    const statusInfo = STATUS_INFO[campaign.status] || STATUS_INFO['DRAFT']
    const currentCreative = creatives[activeSlot]
    const isPublished = campaign.status === 'PUBLISHED'

    return (
        <div className="px-4 md:px-6 pt-6 max-w-screen-xl mx-auto pb-24 text-[#111827]">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/dashboard/services/ads/meta" className="w-9 h-9 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] flex items-center justify-center hover:bg-[#F0F3F7] transition-all">
                    <ArrowLeft size={16} />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-black uppercase tracking-tighter truncate">{campaign.name}</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
                        <span className="text-xs text-[#9CA3AF]">· {statusInfo.desc}</span>
                    </div>
                </div>
                {!isPublished && (
                    <button
                        onClick={publish}
                        disabled={publishing || campaign.status === 'PUBLISHING'}
                        className="flex items-center gap-2 bg-gradient-to-r from-[#6A35D9] to-[#233B8F] text-white font-bold px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all text-sm shadow-[0_0_30px_rgba(106,53,217,0.3)]"
                    >
                        {publishing ? <><Loader2 size={15} className="animate-spin" /> Publicando...</> : <><Rocket size={15} /> Publicar Campaña</>}
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-5 p-4 bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-2xl flex gap-3 text-[#DC2626] text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    <p>{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-xs font-bold">✕</button>
                </div>
            )}
            {success && (
                <div className="mb-5 p-4 bg-[#059669]/10 border border-[#059669]/20 rounded-2xl flex gap-3 text-[#059669] text-sm">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <p>{success}</p>
                </div>
            )}

            {isPublished && campaign.providerCampaignId && (
                <div className="mb-6 p-5 bg-[#059669]/5 border border-[#059669]/20 rounded-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-[#059669] mb-1">✓ Campaña publicada exitosamente</p>
                            <p className="text-xs text-[#9CA3AF]">ID de campaña: <span className="font-mono">{campaign.providerCampaignId}</span></p>
                            <p className="text-xs text-[#9CA3AF] mt-1">Estado inicial: PAUSADO. Actívala desde tu Ads Manager.</p>
                        </div>
                        <a
                            href="https://business.facebook.com/adsmanager"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-[#233B8F] text-white hover:bg-[#1B2E6C] transition-all"
                        >
                            Abrir Ads Manager <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
            )}

            {creatives.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-[#9CA3AF] text-sm mb-4">No hay anuncios generados todavía</p>
                    <Link
                        href={`/dashboard/services/ads/campaign/${campaign.strategy?.id || campaign.strategyId}`}
                        className="text-[#6A35D9] text-sm font-bold hover:underline"
                    >
                        Volver a generar copies →
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Ad preview mockup */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">Vista previa del anuncio</p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setActiveSlot(Math.max(0, activeSlot - 1))}
                                    disabled={activeSlot === 0}
                                    className="w-7 h-7 rounded-lg bg-[#F4F6FA] border border-[#E4E9F0] flex items-center justify-center disabled:opacity-30 hover:bg-[#F0F3F7]"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="text-xs text-[#9CA3AF] px-2">{activeSlot + 1}/{creatives.length}</span>
                                <button
                                    onClick={() => setActiveSlot(Math.min(creatives.length - 1, activeSlot + 1))}
                                    disabled={activeSlot === creatives.length - 1}
                                    className="w-7 h-7 rounded-lg bg-[#F4F6FA] border border-[#E4E9F0] flex items-center justify-center disabled:opacity-30 hover:bg-[#F0F3F7]"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Instagram/Facebook feed mockup */}
                        <div className="bg-white rounded-2xl overflow-hidden border border-[#E4E9F0]">
                            {/* Post header */}
                            <div className="flex items-center gap-3 p-3 border-b border-[#E4E9F0]">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6A35D9] to-[#233B8F] flex items-center justify-center text-xs font-black">
                                    {campaign.brief?.name?.[0] || 'N'}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-[#111827]">{campaign.brief?.name || 'Tu Negocio'}</p>
                                    <p className="text-[10px] text-[#9CA3AF]">Publicidad · Patrocinado</p>
                                </div>
                                <span className="text-[#9CA3AF]">···</span>
                            </div>

                            {/* Primary text preview */}
                            {currentCreative?.primaryText && (
                                <div className="px-3 pt-3 pb-2">
                                    <p className="text-xs text-[#6B7280] leading-relaxed line-clamp-3">
                                        {currentCreative.primaryText}
                                    </p>
                                </div>
                            )}

                            {/* Creative */}
                            <div className="w-full aspect-square bg-gradient-to-br from-dark-900 to-black/50 flex items-center justify-center relative overflow-hidden">
                                {currentCreative?.mediaUrl ? (
                                    currentCreative.mediaType === 'video'
                                        ? <video src={currentCreative.mediaUrl} className="w-full h-full object-cover" controls />
                                        : <img src={currentCreative.mediaUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-[#F4F6FA] flex items-center justify-center mx-auto mb-3">
                                            <Smartphone size={24} className="text-[#9CA3AF]" />
                                        </div>
                                        <p className="text-xs text-[#9CA3AF]">Creativo #{activeSlot + 1}</p>
                                        <p className="text-[10px] text-[#9CA3AF]">Sin imagen/video</p>
                                    </div>
                                )}
                            </div>

                            {/* Headline + CTA */}
                            <div className="p-3 border-t border-[#E4E9F0]">
                                <p className="text-xs font-bold text-[#111827]">{currentCreative?.headline || 'Titular del anuncio'}</p>
                                {currentCreative?.description && (
                                    <p className="text-[10px] text-[#9CA3AF] mt-0.5">{currentCreative.description}</p>
                                )}
                                <div className="mt-2">
                                    <div className="w-full py-2 rounded-lg bg-[#233B8F] text-center text-xs font-bold text-white">
                                        {campaign.brief?.mainCTA || 'Más información'}
                                    </div>
                                </div>
                            </div>

                            {/* Engagement row */}
                            <div className="px-3 pb-3 flex items-center gap-4 text-[10px] text-[#9CA3AF]">
                                <span>👍 Me gusta</span>
                                <span>💬 Comentar</span>
                                <span>↗ Compartir</span>
                            </div>
                        </div>

                        {/* Slot thumbnails */}
                        <div className="flex gap-2 mt-3 flex-wrap">
                            {creatives.map((c, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveSlot(i)}
                                    className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all ${i === activeSlot ? 'border-[#E4E9F0]' : 'border-[#E4E9F0] hover:border-[#E4E9F0]'}`}
                                >
                                    {c.mediaUrl
                                        ? <img src={c.mediaUrl} alt="" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full bg-[#F4F6FA] flex items-center justify-center text-[10px] text-[#9CA3AF] font-bold">{i + 1}</div>
                                    }
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Copy editor */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest mb-3">Editar copies ({creatives.length} anuncios)</p>
                        {creatives.map((creative, i) => (
                            <div
                                key={i}
                                onClick={() => setActiveSlot(i)}
                                className={`bg-dark-900/40 border rounded-2xl p-4 cursor-pointer transition-all ${i === activeSlot ? 'border-[#E4E9F0] bg-[#6A35D9]/5' : 'border-[#E4E9F0] hover:border-[#E4E9F0]'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase text-[#9CA3AF]">Anuncio #{i + 1}</span>
                                    <button
                                        onClick={e => { e.stopPropagation(); setEditingSlot(editingSlot === i ? null : i) }}
                                        className="text-[10px] font-bold text-[#6A35D9] hover:underline flex items-center gap-1"
                                    >
                                        <Edit3 size={10} /> Editar
                                    </button>
                                </div>

                                {editingSlot === i ? (
                                    <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                        <textarea
                                            value={creative.primaryText}
                                            onChange={e => setCreatives(prev => prev.map((c, j) => j === i ? { ...c, primaryText: e.target.value } : c))}
                                            rows={4}
                                            className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2 text-xs text-[#111827] resize-none focus:outline-none focus:border-[#E4E9F0] leading-relaxed"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                value={creative.headline}
                                                onChange={e => setCreatives(prev => prev.map((c, j) => j === i ? { ...c, headline: e.target.value } : c))}
                                                placeholder="Titular"
                                                className="bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#E4E9F0] placeholder:text-[#9CA3AF]"
                                            />
                                            <input
                                                value={creative.description || ''}
                                                onChange={e => setCreatives(prev => prev.map((c, j) => j === i ? { ...c, description: e.target.value } : c))}
                                                placeholder="Descripción"
                                                className="bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#E4E9F0] placeholder:text-[#9CA3AF]"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingSlot(null)} className="flex-1 py-2 rounded-xl bg-[#F4F6FA] text-xs font-bold hover:bg-[#F0F3F7]">Cancelar</button>
                                            <button
                                                onClick={() => saveCreative(i)}
                                                disabled={saving}
                                                className="flex-1 py-2 rounded-xl bg-[#6A35D9] text-white text-xs font-bold hover:bg-[#5A2BC0] disabled:opacity-50"
                                            >
                                                {saving ? 'Guardando...' : 'Guardar'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">{creative.primaryText || '(Sin copy)'}</p>
                                        {creative.headline && <p className="text-[10px] text-[#9CA3AF] font-bold mt-1 truncate">{creative.headline}</p>}
                                    </div>
                                )}
                            </div>
                        ))}

                        {!isPublished && (
                            <button
                                onClick={publish}
                                disabled={publishing || campaign.status === 'PUBLISHING'}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6A35D9] to-[#233B8F] text-white font-bold py-4 rounded-2xl hover:opacity-90 disabled:opacity-50 transition-all mt-4 shadow-[0_0_30px_rgba(106,53,217,0.3)]"
                            >
                                {publishing
                                    ? <><Loader2 size={18} className="animate-spin" /> Publicando en Meta Ads...</>
                                    : <><Rocket size={18} /> Lanzar Campaña Ahora</>
                                }
                            </button>
                        )}

                        <p className="text-[11px] text-[#9CA3AF] text-center">
                            La campaña se publicará en estado <b>PAUSADO</b>. Puedes activarla desde tu Ads Manager cuando estés listo.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
