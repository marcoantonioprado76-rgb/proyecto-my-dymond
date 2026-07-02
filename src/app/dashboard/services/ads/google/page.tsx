'use client'

import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle2, ExternalLink, Search, MonitorPlay, Youtube, BarChart3, Zap } from 'lucide-react'

const FEATURES = [
    { icon: Search, label: 'Search Ads', desc: 'Anuncios en resultados de búsqueda de Google con palabras clave optimizadas por IA' },
    { icon: MonitorPlay, label: 'Display Campaigns', desc: 'Banners y creativos visuales para la Red de Display de Google' },
    { icon: Youtube, label: 'YouTube Ads', desc: 'Campañas de video en YouTube con segmentación avanzada por audiencia' },
    { icon: BarChart3, label: 'Analytics integrado', desc: 'Reportes de impresiones, clics, conversiones y ROAS en tiempo real' },
    { icon: Zap, label: 'Smart Bidding con IA', desc: 'Estrategias automáticas de puja para maximizar conversiones' },
]

export default function GoogleAdsPage() {
    return (
        <div className="px-4 md:px-6 xl:px-10 pt-6 pb-28 max-w-screen-lg mx-auto text-[#111827]">

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/services/ads"
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[#F0F3F7] transition-all shrink-0"
                    style={{ background: 'rgba(15,23,42,0.08)', border: '1px solid rgba(15,23,42,0.08)' }}>
                    <ArrowLeft size={16} className="text-[#9CA3AF]" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, rgba(66,133,244,0.25), rgba(0,0,0,0.2))', border: '1px solid rgba(66,133,244,0.3)' }}>
                        <span className="font-black text-xl" style={{ color: '#4285F4' }}>G</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight leading-none">Google Ads <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #4285F4, #34A853, #FBBC05, #EA4335)' }}>AI</span></h1>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">Google Ads Platform · Impulsado por IA</p>
                    </div>
                </div>
            </div>

            {/* Coming soon banner */}
            <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 mb-8 text-center"
                style={{ background: 'linear-gradient(135deg, rgba(66,133,244,0.1) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(66,133,244,0.2)' }}>
                <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[80px]"
                    style={{ background: 'rgba(66,133,244,0.12)' }} />
                <div className="relative">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
                        style={{ background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.25)' }}>
                        <Clock size={12} style={{ color: '#4285F4' }} />
                        <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#4285F4' }}>En desarrollo</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black mb-3 leading-tight">
                        Google Ads estará disponible <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #4285F4, #34A853)' }}>muy pronto</span>
                    </h2>
                    <p className="text-[#9CA3AF] text-sm max-w-md mx-auto leading-relaxed">
                        Estamos integrando la Google Ads API para que puedas crear campañas de Search, Display y YouTube directamente desde MY DIAMOND.
                    </p>
                </div>
            </div>

            {/* Features preview */}
            <div className="mb-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-4">Lo que podrás hacer</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {FEATURES.map((f, i) => {
                        const Icon = f.icon
                        return (
                            <div key={i} className="flex items-start gap-3 p-4 rounded-2xl"
                                style={{ background: 'rgba(15,23,42,0.08)', border: '1px solid rgba(15,23,42,0.08)' }}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                                    style={{ background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.2)' }}>
                                    <Icon size={15} style={{ color: '#4285F4' }} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-[#6B7280]">{f.label}</p>
                                    <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Status */}
            <div className="rounded-2xl p-5"
                style={{ background: 'rgba(15,23,42,0.08)', border: '1px solid rgba(15,23,42,0.08)' }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-4">Estado de integración</p>
                <div className="space-y-3">
                    {[
                        { label: 'Proyecto en Google Cloud Console creado', done: true },
                        { label: 'OAuth 2.0 configurado', done: true },
                        { label: 'Google Ads API — acceso de desarrollador pendiente', done: false },
                        { label: 'Integración de campañas Search y Display', done: false },
                        { label: 'YouTube Ads y Smart Bidding', done: false },
                    ].map((step, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${step.done ? 'bg-green-500/15' : 'bg-[#F4F6FA]'}`}>
                                {step.done
                                    ? <CheckCircle2 size={12} className="text-green-400" />
                                    : <Clock size={10} className="text-[#9CA3AF]" />}
                            </div>
                            <p className={`text-xs ${step.done ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>{step.label}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-5 pt-4 border-t border-white/6">
                    <a href="https://ads.google.com/home/tools/manager-accounts/" target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold hover:underline" style={{ color: '#4285F4' }}>
                        <ExternalLink size={12} /> Ver Google Ads Manager
                    </a>
                </div>
            </div>
        </div>
    )
}
