'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Lock, Zap, Sparkles, Crown, X, Layers, MessageCircle, Store, Megaphone, FileText, Users, Video, CheckCircle2, Clock, Timer, RefreshCw, Phone, BookOpen, Play } from 'lucide-react'

const PACKS = [
  {
    id: 'basic',
    name: 'Pack Básico',
    tagline: 'Tu primer agente de ventas en WhatsApp',
    pitch: 'Automatiza tus ventas con un agente AI inteligente personalizado con tu marca, más landing page y anuncios para captar clientes.',
    price: 49,
    planId: 'BASIC',
    icon: Zap,
    accent: {
      text: 'text-[#FF096C]',
      bg: 'bg-[#FF096C]/10',
      border: 'border-[#FF096C]/25',
      btn: 'bg-[#FF096C] hover:bg-[#FF096C] active:scale-[0.98] text-black font-black',
      glow: '',
      featured: false,
    },
    highlight: null,
    locked: false,
    sections: [
      {
        icon: MessageCircle,
        title: 'Agente AI de Ventas',
        features: [
          '1 agente AI personalizado con tu marca',
          'Responde y vende por WhatsApp automáticamente',
          'Mensajes ilimitados con tus clientes',
          'IA con el tono y voz de tu negocio',
          'Catálogo con hasta 2 productos en total',
        ],
      },
      {
        icon: Store,
        title: 'Tienda Virtual',
        features: [
          '1 tienda virtual con tu branding',
          'Integración con tu número de WhatsApp',
          'QR de pago y catálogo online',
        ],
      },
      {
        icon: FileText,
        title: 'Landing Pages con IA',
        features: ['1 landing page generada con IA'],
      },
      {
        icon: Megaphone,
        title: 'Anuncios con IA',
        features: ['Hasta 5 anuncios al mes en Meta, TikTok y Google'],
      },
      {
        icon: Play,
        title: 'Clipping',
        features: ['Gana por cada 1,000 vistas de tus clips'],
      },
    ],
    notIncluded: [
      'Acceso a nuevos lanzamientos exclusivos',
    ],
  },
  {
    id: 'pro',
    name: 'Pack Pro',
    tagline: 'Vende, anuncia y escala sin límites',
    pitch: 'Todo lo del Básico más 2 agentes AI, más tiendas, más landings y capacitaciones en vivo por Zoom.',
    price: 99,
    planId: 'PRO',
    icon: Sparkles,
    accent: {
      text: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/40',
      btn: 'bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white font-black shadow-[0_0_20px_rgba(127,86,239,0.4)]',
      glow: 'shadow-[0_0_50px_rgba(127,86,239,0.18)]',
      featured: true,
    },
    highlight: '⭐ Más Popular',
    locked: false,
    sections: [
      {
        icon: MessageCircle,
        title: 'Agentes AI de Ventas',
        features: [
          '2 agentes AI personalizados con tu marca',
          'Responde y vende por WhatsApp automáticamente',
          'Mensajes ilimitados con tus clientes',
          'IA con el tono y voz de tu negocio',
          'Catálogo con hasta 20 productos en total',
        ],
      },
      {
        icon: Store,
        title: 'Tiendas Virtuales',
        features: [
          '2 tiendas virtuales con tu branding completo',
          'Integración con WhatsApp para cerrar ventas',
          'QR de pago y catálogo online',
        ],
      },
      {
        icon: Megaphone,
        title: 'Publicidad con IA',
        features: [
          'Hasta 15 anuncios al mes en Meta, TikTok y Google',
          'Copies e imágenes generados por IA',
          'Estrategias Advantage+ y Smart Segmentation',
        ],
      },
      {
        icon: FileText,
        title: 'Landing Pages con IA',
        features: [
          '3 landing pages generadas con IA',
          'Páginas de alta conversión con formularios',
          'Slugs personalizados con tu URL',
        ],
      },
      {
        icon: BookOpen,
        title: 'Clipping',
        features: [
          'Gana por cada 1,000 vistas de tus clips',
        ],
      },
      {
        icon: Video,
        title: 'Capacitaciones',
        features: [
          'Acceso a capacitaciones en vivo por Zoom',
          'Asesoramiento personalizado de 30 minutos',
        ],
      },
    ],
    notIncluded: ['Acceso a nuevos lanzamientos exclusivos'],
  },
  {
    id: 'elite',
    name: 'Pack Elite',
    tagline: 'El máximo poder para líderes de red',
    pitch: 'La experiencia completa: 5 agentes AI, 5 tiendas, 40 productos, 6 landings y acceso total a todos los lanzamientos exclusivos.',
    price: 199,
    planId: 'ELITE',
    icon: Crown,
    accent: {
      text: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/30',
      btn: 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 active:scale-[0.98] text-white font-black shadow-[0_0_20px_rgba(236,72,153,0.3)]',
      glow: 'shadow-[0_0_40px_rgba(236,72,153,0.12)]',
      featured: false,
    },
    highlight: '👑 Máximo Poder',
    locked: false,
    sections: [
      {
        icon: MessageCircle,
        title: 'Agentes AI de Ventas',
        features: [
          '5 agentes AI personalizados con tu marca',
          'Responde y vende por WhatsApp automáticamente',
          'Mensajes ilimitados con tus clientes',
          'Catálogo con hasta 40 productos en total',
        ],
      },
      {
        icon: Store,
        title: 'Tiendas Virtuales',
        features: [
          '5 tiendas virtuales con tu branding completo',
          'Integración con WhatsApp para cerrar ventas',
          'QR de pago y catálogo online',
        ],
      },
      {
        icon: FileText,
        title: 'Landing Pages con IA',
        features: [
          '6 landing pages generadas con IA',
          'Páginas de alta conversión personalizadas',
        ],
      },
      {
        icon: Megaphone,
        title: 'Publicidad con IA',
        features: [
          'Hasta 30 anuncios al mes en Meta, TikTok y Google',
          'Copies e imágenes generados por IA',
        ],
      },
      {
        icon: BookOpen,
        title: 'Clipping',
        features: [
          'Gana por cada 1,000 vistas de tus clips',
        ],
      },
      {
        icon: Users,
        title: 'Acceso Total',
        features: [
          'Acceso exclusivo a nuevos lanzamientos',
          'Asesoramiento personalizado de 1 hora',
          'Manager dedicado 1:1',
          'Onboarding personalizado con el equipo',
        ],
      },
    ],
    notIncluded: [],
  },
]

const PLAN_RANK: Record<string, number> = { NONE: 0, BASIC: 1, PRO: 2, ELITE: 3 }

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)
  useEffect(() => {
    if (!expiresAt) { setRemaining(null); return }
    const target = new Date(expiresAt).getTime()
    const update = () => {
      const diff = target - Date.now()
      if (diff <= 0) { setRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return }
      setRemaining({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  return remaining
}

export default function PlanesPage() {
  const router = useRouter()
  const [currentPlan, setCurrentPlan] = useState<string>('NONE')
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null)
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [isFaseGlobal, setIsFaseGlobal] = useState(false)
  const [enabledPlans, setEnabledPlans] = useState<Record<string, boolean> | null>(null)
  const countdown = useCountdown(planExpiresAt)

  useEffect(() => {
    fetch('/api/plan-status')
      .then(r => r.json())
      .then(d => {
        if (d.plan) setCurrentPlan(d.plan)
        if (d.planExpiresAt) setPlanExpiresAt(d.planExpiresAt)
        if (d.faseGlobal) setIsFaseGlobal(true)
      })
      .catch(() => {})
    fetch('/api/pack-requests')
      .then(r => r.json())
      .then(d => {
        const pending = (d.requests ?? []).find((r: { status: string; plan: string }) => r.status === 'PENDING')
        if (pending) setPendingPlan(pending.plan)
      })
      .catch(() => {})
    // Cargar disponibilidad de planes
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        const s = d.settings ?? {}
        const map = {
          BASIC: s['PLAN_BASIC_ENABLED'] !== 'false',
          PRO:   s['PLAN_PRO_ENABLED']   !== 'false',
          ELITE: s['PLAN_ELITE_ENABLED'] !== 'false',
        }
        // Si todos están desactivados → redirigir a checkout con Fase Global
        if (!map.BASIC && !map.PRO && !map.ELITE) {
          router.replace('/dashboard/store/checkout?plan=BASIC&faseGlobalOnly=true')
          return
        }
        setEnabledPlans(map)
      })
      .catch(() => setEnabledPlans({ BASIC: true, PRO: true, ELITE: true }))
  }, [router])

  return (
    <div className="font-ui" style={{ background: 'radial-gradient(circle at top right, rgba(255,9,108,0.08), transparent 28%), radial-gradient(circle at bottom left, rgba(35,59,143,0.08), transparent 30%), linear-gradient(135deg, #EEF2F7 0%, #F5F7FA 45%, #E9EEF5 100%)', minHeight: '100vh' }}>
    <div className="px-4 md:px-6 lg:px-8 pt-8 max-w-screen-xl mx-auto pb-24 text-[#111827]">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F0F3F7] border border-purple-500/25 text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-4">
          <Layers size={10} />
          MY DIAMOND · Planes oficiales
        </div>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-2">
          Elige tu Plan
        </h1>
        <p className="text-sm text-[#6B7280] max-w-sm mx-auto leading-relaxed">
          Bots de WhatsApp, tiendas y anuncios con IA — todo personalizado con tu marca.
        </p>
        {currentPlan !== 'NONE' && (
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/25 text-green-400 text-xs font-bold">
            <CheckCircle2 size={12} />
            Plan activo: {currentPlan === 'BASIC' ? 'Pack Básico' : currentPlan === 'PRO' ? 'Pack Pro' : currentPlan === 'ELITE' ? 'Pack Elite' : currentPlan}
          </div>
        )}
      </div>

      {/* Countdown if plan active */}
      {currentPlan !== 'NONE' && countdown && (
        <div className="mb-8 p-4 rounded-2xl border flex items-center gap-4"
          style={{
            background: isFaseGlobal
              ? 'linear-gradient(135deg, rgba(0,255,136,0.06), rgba(0,200,100,0.03))'
              : '#FFFFFF',
            borderColor: isFaseGlobal ? 'rgba(0,255,136,0.2)' : '#E4E9F0',
          }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: isFaseGlobal ? 'rgba(0,255,136,0.08)' : 'rgba(210,3,221,0.08)',
              border: isFaseGlobal ? '1px solid rgba(0,255,136,0.2)' : '1px solid #E4E9F0',
            }}>
            {isFaseGlobal ? <span className="text-lg">🌐</span> : <Timer size={18} style={{ color: '#D203DD' }} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: isFaseGlobal ? 'rgba(0,255,136,0.5)' : 'rgba(255,255,255,0.4)' }}>
              {isFaseGlobal ? 'Pack Básico · Fase Global · Vence en' : 'Tu plan vence en'}
            </p>
            <div className="flex items-center gap-3">
              {[
                { v: countdown.days, l: 'días' },
                { v: countdown.hours, l: 'horas' },
                { v: countdown.minutes, l: 'min' },
                { v: countdown.seconds, l: 'seg' },
              ].map(({ v, l }) => (
                <div key={l} className="text-center">
                  <span className="text-xl font-black tabular-nums" style={{ color: isFaseGlobal ? '#FF096C' : '#D203DD' }}>{String(v).padStart(2, '0')}</span>
                  <p className="text-[9px] text-[#6B7280] uppercase tracking-widest">{l}</p>
                </div>
              ))}
            </div>
            {isFaseGlobal && (
              <p className="text-[10px] text-green-400/50 mt-1">Al vencer, solicita de nuevo con tu próxima recompra de Fase Global.</p>
            )}
          </div>
        </div>
      )}

      {/* Cards */}
      {enabledPlans === null ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D203DD', borderTopColor: 'transparent' }} />
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {PACKS.filter(pack => enabledPlans[pack.planId]).map((pack) => {
          const Icon = pack.icon
          return (
            <div
              key={pack.id}
              className={`relative rounded-3xl border flex flex-col transition-all duration-300 ${pack.accent.border} ${pack.accent.glow} ${pack.accent.featured ? 'md:-mt-4' : ''} ${pack.locked ? 'opacity-60' : ''}`}
              style={{
                background: pack.locked
                  ? '#F8FAFC'
                  : '#FFFFFF',
                backdropFilter: 'blur(16px)',
              }}
            >
              {pack.locked && (
                <div className="absolute inset-0 rounded-3xl z-10 flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]">
                  <div className="w-12 h-12 rounded-2xl bg-[#F0F3F7] border border-purple-500/25 flex items-center justify-center">
                    <Lock size={20} className="text-[#9CA3AF]" />
                  </div>
                  <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Próximamente</p>
                </div>
              )}

              {pack.highlight && (
                <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                  <span className="px-4 py-1 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest">
                    {pack.highlight}
                  </span>
                </div>
              )}

              <div className={`p-5 md:p-6 flex flex-col flex-1 ${pack.accent.featured ? 'pt-8' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${pack.accent.bg} border ${pack.accent.border}`}>
                    <Icon size={18} className={pack.accent.text} />
                  </div>
                  <div>
                    <p className={`text-[11px] font-black uppercase tracking-widest ${pack.accent.text}`}>{pack.name}</p>
                    <p className="text-[10px] text-[#6B7280] leading-snug">{pack.tagline}</p>
                  </div>
                </div>

                <p className="text-[11px] text-[#6B7280] leading-relaxed mb-4">{pack.pitch}</p>

                <div className="mb-5">
                  <div className="flex items-end gap-1">
                    <span className="text-[40px] font-black leading-none">${pack.price}</span>
                    <span className="text-sm text-[#6B7280] mb-1">USD</span>
                  </div>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">30 días de acceso · renovable</p>
                </div>

                <div className={`h-px mb-5 ${pack.accent.featured ? 'bg-purple-500/20' : 'bg-[#F0F3F7]'}`} />

                <div className="flex-1 space-y-4 mb-6">
                  {pack.sections.map((section, si) => {
                    const SIcon = section.icon
                    return (
                      <div key={si}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <SIcon size={11} className={pack.locked ? 'text-[#9CA3AF]' : pack.accent.text} />
                          <p className={`text-[10px] font-black uppercase tracking-widest ${pack.locked ? 'text-[#9CA3AF]' : pack.accent.text}`}>
                            {section.title}
                          </p>
                        </div>
                        <ul className="space-y-1.5">
                          {section.features.map((feat, fi) => (
                            <li key={fi} className="flex items-start gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${pack.locked ? 'bg-[#F0F3F7]' : pack.accent.bg}`}>
                                <Check size={8} className={pack.locked ? 'text-[#9CA3AF]' : pack.accent.text} />
                              </div>
                              <span className={`text-[11px] leading-snug ${pack.locked ? 'text-[#9CA3AF]' : 'text-[#374151]'}`}>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}

                  {pack.notIncluded.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <X size={11} className="text-[#9CA3AF]" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">No incluido</p>
                      </div>
                      <ul className="space-y-1.5">
                        {pack.notIncluded.map((feat, fi) => (
                          <li key={fi} className="flex items-start gap-2">
                            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-white/3">
                              <X size={7} className="text-[#9CA3AF]" />
                            </div>
                            <span className="text-[11px] leading-snug text-[#9CA3AF] line-through">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* CTA */}
                {(() => {
                  if (pack.locked) {
                    return (
                      <button disabled className={`w-full py-3 rounded-2xl text-sm ${pack.accent.btn}`}>
                        Próximamente
                      </button>
                    )
                  }
                  const isActive = currentPlan === pack.planId
                  const isLower = PLAN_RANK[currentPlan] > PLAN_RANK[pack.planId]
                  const isPending = pendingPlan === pack.planId

                  if (isActive) {
                    // Plan activado vía Fase Global → no se puede renovar, solo re-solicitar cuando expire
                    if (isFaseGlobal) {
                      return (
                        <div className="w-full py-3 rounded-2xl text-sm font-black bg-green-500/8 border border-green-500/20 text-green-400 flex flex-col items-center justify-center gap-1">
                          <span className="flex items-center gap-1.5">🌐 Activo · Fase Global</span>
                          <span className="text-[10px] font-normal text-green-400/60">Al vencer podrás re-solicitar con tu recompra</span>
                        </div>
                      )
                    }
                    return (
                      <button
                        onClick={() => router.push(`/dashboard/store/checkout?plan=${pack.planId}&renewal=true`)}
                        disabled={!!pendingPlan}
                        className="w-full py-3 rounded-2xl text-sm font-black bg-green-500/10 border border-green-500/25 text-green-400 hover:bg-green-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw size={14} /> Renovar — $19
                      </button>
                    )
                  }
                  if (isLower) {
                    return (
                      <button disabled className="w-full py-3 rounded-2xl text-sm font-black bg-white/3 text-[#9CA3AF] border border-purple-500/20">
                        Plan inferior
                      </button>
                    )
                  }
                  if (isPending) {
                    return (
                      <button disabled className="w-full py-3 rounded-2xl text-sm font-black bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center gap-2">
                        <Clock size={14} /> Solicitud pendiente
                      </button>
                    )
                  }
                  return (
                    <button
                      onClick={() => router.push(`/dashboard/store/checkout?plan=${pack.planId}`)}
                      disabled={!!pendingPlan}
                      className={`w-full py-3 rounded-2xl text-sm transition-all ${pack.accent.btn} flex items-center justify-center gap-2`}
                    >
                      {currentPlan !== 'NONE' ? 'Renovar / Actualizar' : `Adquirir ${pack.name}`}
                    </button>
                  )
                })()}
              </div>
            </div>
          )
        })}
      </div>
      )}

      {/* Empresarial card */}
      <div className="mt-6 relative rounded-3xl border border-yellow-500/20 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.06), rgba(234,179,8,0.02))' }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(234,179,8,0.5), transparent)' }} />
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-[#B735B8]/10 border border-yellow-500/25">
              <Users size={22} className="text-[#B735B8]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-black uppercase tracking-widest text-[#B735B8]">Pack Empresarial</p>
                <span className="px-2 py-0.5 rounded-full bg-[#B735B8]/10 border border-yellow-500/20 text-[9px] font-black text-[#B735B8] uppercase tracking-widest">A medida</span>
              </div>
              <p className="text-xs text-[#6B7280] leading-relaxed max-w-lg">
                Solución personalizada para empresas y líderes de alto rendimiento. Agentes AI ilimitados, tiendas, landings y soporte dedicado adaptados a tu volumen de negocio. Contáctanos para armar tu plan.
              </p>
            </div>
          </div>
          <a
            href="https://wa.me/59167534487"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all bg-[#B735B8] hover:bg-[#B735B8] active:scale-[0.98] text-black"
          >
            <Phone size={15} />
            Contactar por WhatsApp
          </a>
        </div>
      </div>

      {/* Bottom note */}
      <div className="mt-6 p-4 bg-white/[0.02] border border-purple-500/15 rounded-2xl flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
        <div className="w-8 h-8 rounded-xl bg-[#F0F3F7] border border-purple-500/20 flex items-center justify-center shrink-0">
          <Layers size={14} className="text-[#6B7280]" />
        </div>
        <div>
          <p className="text-xs font-bold text-[#6B7280]">Proceso manual · 30 días de acceso</p>
          <p className="text-[11px] text-[#9CA3AF]">Envía tu solicitud. Nuestro equipo la aprobará y activará tu plan en menos de 24h.</p>
        </div>
      </div>
    </div>
    </div>
  )
}
