'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, MessageCircle, Layout, ArrowRight, CheckCircle2, Megaphone, Play, BookOpen, Lock, AlertTriangle, Sparkles, Send } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type UserPlan = 'NONE' | 'BASIC' | 'PRO' | 'ELITE'

const PLAN_RANK: Record<UserPlan, number> = { NONE: 0, BASIC: 1, PRO: 2, ELITE: 3 }
const PLAN_NAMES: Record<UserPlan, string> = { NONE: 'Sin Plan', BASIC: 'Pack Básico', PRO: 'Pack Pro', ELITE: 'Pack Elite' }

const services = [
  {
    id: 1,
    title: 'Tienda Virtual',
    description: 'Tu propia tienda online lista para vender. Muestra tus productos con estilo y recibe pedidos por WhatsApp sin comisiones.',
    icon: ShoppingCart,
    from: '#D203DD', to: '#0066FF',
    features: ['Catálogo profesional personalizado', 'Pedidos directos por WhatsApp', 'Sin comisiones por venta'],
    link: '/dashboard/services/virtual-store',
    requiredPlan: 'BASIC' as UserPlan,
    tag: 'Básico+',
  },
  {
    id: 2,
    title: 'Agentes AI de Ventas',
    description: 'Vende, responde y fideliza clientes las 24 horas sin levantar un dedo. Tu agente AI trabaja mientras tú duermes.',
    icon: MessageCircle,
    from: '#00FF88', to: '#00C2FF',
    features: ['Agente AI disponible 24/7', 'Respuestas inteligentes automáticas', 'Seguimientos y cierres de venta'],
    link: '/dashboard/services/whatsapp',
    requiredPlan: 'BASIC' as UserPlan,
    tag: 'Básico+',
  },
  {
    id: 3,
    title: 'Landing Pages con IA',
    description: 'Páginas de venta diseñadas para convertir. Genera una landing profesional en segundos con inteligencia artificial.',
    icon: Layout,
    from: '#9B00FF', to: '#FF2DF7',
    features: ['Generación instantánea con IA', 'Editor de código HTML integrado', 'Publicación con un clic'],
    link: '/dashboard/services/landing-pages',
    requiredPlan: 'BASIC' as UserPlan,
    tag: 'Básico+',
  },
  {
    id: 4,
    title: 'Anuncios con IA',
    description: 'Campañas publicitarias que convierten en Meta, Google y TikTok. Copy, estrategia y creativos generados por IA.',
    icon: Megaphone,
    from: '#FF8800', to: '#FFCC00',
    features: ['Campañas en Meta, Google & TikTok', 'Copy e imágenes generados con IA', 'Métricas y optimización en tiempo real'],
    link: '/dashboard/services/ads',
    requiredPlan: 'BASIC' as UserPlan,
    tag: 'Básico+',
  },
  {
    id: 5,
    title: 'Clipping — Gana por Vistas',
    description: 'Monetiza tu tiempo libre subiendo clips a YouTube y TikTok. Cada mil vistas genera ingresos reales.',
    icon: Play,
    from: '#FF2D55', to: '#FF6B00',
    features: ['Ingresos por cada 1,000 vistas (CPM)', 'Compatible con YouTube & TikTok', 'Retiros directos a tu wallet'],
    link: '/dashboard/services/clipping',
    requiredPlan: null,
    tag: 'Gratis',
  },
  {
    id: 7,
    title: 'Publicador Social',
    description: 'Publica en Facebook, Instagram, TikTok y YouTube desde un solo lugar. Genera texto con IA, programa publicaciones y mira tus métricas.',
    icon: Send,
    from: '#FF2DF7', to: '#FF8800',
    features: ['Facebook, Instagram, TikTok y YouTube', 'Básico: 15 posts/mes · Pro: 30 · Elite: 50', 'Generación de texto y guiones con IA'],
    link: '/dashboard/services/social',
    requiredPlan: 'BASIC' as UserPlan,
    tag: 'Básico+',
  },
]

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-6 animate-pulse" style={{ background: 'rgba(13,30,121,0.3)', border: '1px solid rgba(210,3,221,0.12)' }}>
      <div className="flex items-start justify-between mb-5">
        <div className="w-11 h-11 rounded-xl bg-white/5" />
        <div className="w-16 h-6 rounded-full bg-white/5" />
      </div>
      <div className="w-3/4 h-4 rounded bg-white/5 mb-3" />
      <div className="w-full h-3 rounded bg-white/5 mb-2" />
      <div className="w-5/6 h-3 rounded bg-white/5 mb-6" />
      <div className="space-y-2 mb-5">
        {[1, 2, 3].map(i => <div key={i} className="w-full h-3 rounded bg-white/5" />)}
      </div>
      <div className="w-full h-10 rounded-xl bg-white/5" />
    </div>
  )
}

export default function ServicesPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<UserPlan>('NONE')
  const [expired, setExpired] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/plan-status')
      .then(r => r.json())
      .then(d => {
        setPlan((d.plan ?? 'NONE') as UserPlan)
        setExpired(!!d.expired)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function isUnlocked(requiredPlan: UserPlan | null) {
    if (requiredPlan === null) return true
    if (expired) return false
    return PLAN_RANK[plan] >= PLAN_RANK[requiredPlan]
  }

  return (
    <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto pb-20">

      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(210,3,221,0.08)', border: '1px solid rgba(210,3,221,0.2)' }}>
          <Sparkles className="w-5 h-5" style={{ color: '#D203DD' }} />
        </div>
        <div>
          <h1 className="text-xl font-medium text-white uppercase tracking-widest">Servicios</h1>
          <p className="text-xs font-light tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Herramientas para potenciar tu negocio digital
          </p>
        </div>
      </div>

      {/* Línea decorativa */}
      <div className="h-px w-full my-5" style={{ background: 'linear-gradient(90deg, rgba(210,3,221,0.3), rgba(255,45,247,0.2), transparent)' }} />

      {/* Banners de estado */}
      {!loading && expired && (
        <div className="mb-6 flex items-start gap-3 px-4 py-4 rounded-2xl"
          style={{ background: 'rgba(255,100,0,0.08)', border: '1px solid rgba(255,100,0,0.25)' }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#FF6400' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: '#FF6400' }}>Tu plan ha vencido</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,100,0,0.7)' }}>
              Tus servicios están desactivados. Renueva tu plan para seguir usando todas las herramientas.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/planes')}
            className="shrink-0 text-xs font-black px-3 py-1.5 rounded-xl transition-all"
            style={{ background: 'rgba(255,100,0,0.15)', border: '1px solid rgba(255,100,0,0.3)', color: '#FF6400' }}>
            Renovar
          </button>
        </div>
      )}

      {!loading && !expired && plan === 'NONE' && (
        <div className="mb-6 flex items-start gap-3 px-4 py-4 rounded-2xl"
          style={{ background: 'rgba(155,0,255,0.07)', border: '1px solid rgba(155,0,255,0.2)' }}>
          <Lock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#9B00FF' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>Activa tu plan para desbloquear los servicios</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Con el Pack Básico desde $49 USD tienes acceso a agentes AI, tienda, landing pages y más.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/planes')}
            className="shrink-0 text-xs font-black px-3 py-1.5 rounded-xl transition-all"
            style={{ background: 'rgba(155,0,255,0.15)', border: '1px solid rgba(155,0,255,0.3)', color: '#CC44FF' }}>
            Ver Planes
          </button>
        </div>
      )}

      {!loading && !expired && plan !== 'NONE' && (
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-bold" style={{ color: '#00FF88' }}>
            {PLAN_NAMES[plan]} activo — servicios desbloqueados
          </span>
        </div>
      )}

      {/* Grid de servicios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : services.map((service) => {
              const unlocked = isUnlocked(service.requiredPlan)
              const isFree = service.requiredPlan === null

              return (
                <div key={service.id}
                  className={`relative rounded-2xl p-6 overflow-hidden transition-all duration-300 group ${unlocked ? 'hover:-translate-y-1' : ''}`}
                  style={{
                    background: unlocked
                      ? `linear-gradient(135deg, ${service.from}08, ${service.to}04)`
                      : 'rgba(13,30,121,0.25)',
                    border: unlocked
                      ? `1px solid ${service.from}20`
                      : '1px solid rgba(255,255,255,0.07)',
                    boxShadow: unlocked ? `0 0 24px ${service.from}08` : 'none',
                    opacity: unlocked ? 1 : 0.72,
                  }}
                  onMouseEnter={e => {
                    if (!unlocked) return
                    e.currentTarget.style.borderColor = `${service.from}35`
                    e.currentTarget.style.boxShadow = `0 0 40px ${service.from}15`
                  }}
                  onMouseLeave={e => {
                    if (!unlocked) return
                    e.currentTarget.style.borderColor = `${service.from}20`
                    e.currentTarget.style.boxShadow = `0 0 24px ${service.from}08`
                  }}>

                  {/* Barra neon superior */}
                  {unlocked && (
                    <div className="absolute top-0 left-0 right-0 h-px"
                      style={{ background: `linear-gradient(90deg, transparent, ${service.from}70, ${service.to}50, transparent)` }} />
                  )}

                  {/* Orbe esquina (hover) */}
                  {unlocked && (
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-25 transition-opacity duration-500"
                      style={{ background: service.from }} />
                  )}

                  {/* 🔒 Badge de lock — solo en esquina superior derecha, NO overlay */}
                  {!unlocked && (
                    <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2 py-1 rounded-lg"
                      style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(4px)' }}>
                      <Lock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {expired ? 'Vencido' : service.tag}
                      </span>
                    </div>
                  )}

                  {/* Header */}
                  <div className="relative z-10 flex items-start justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{
                        background: unlocked ? `${service.from}12` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${unlocked ? service.from + '28' : 'rgba(255,255,255,0.08)'}`,
                      }}>
                      <service.icon className="w-5 h-5" style={{ color: unlocked ? service.from : 'rgba(255,255,255,0.25)' }} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                      style={
                        isFree
                          ? { background: 'rgba(210,3,221,0.1)', color: '#D203DD', border: '1px solid rgba(210,3,221,0.25)' }
                          : unlocked
                            ? { background: 'rgba(0,255,136,0.1)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.25)' }
                            : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.07)' }
                      }>
                      {isFree ? 'Gratis' : unlocked ? 'Activo' : expired ? 'Vencido' : service.tag}
                    </span>
                  </div>

                  {/* Contenido */}
                  <div className="relative z-10">
                    <h3 className="text-base font-semibold mb-2 tracking-wide"
                      style={{ color: unlocked ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.45)' }}>
                      {service.title}
                    </h3>
                    <p className="text-xs font-light leading-relaxed mb-5"
                      style={{ color: unlocked ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.22)' }}>
                      {service.description}
                    </p>

                    <ul className="space-y-2 mb-5">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-[11px] font-light"
                          style={{ color: unlocked ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)' }}>
                          <CheckCircle2 className="w-3 h-3 shrink-0"
                            style={{ color: unlocked ? service.from : 'rgba(255,255,255,0.15)' }} />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {unlocked ? (
                      <Link href={service.link}
                        className="flex items-center justify-between w-full p-3 rounded-xl transition-all duration-300 group/btn"
                        style={{ background: `${service.from}0D`, border: `1px solid ${service.from}22`, color: 'rgba(255,255,255,0.75)' }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = `${service.from}18`
                          ;(e.currentTarget as HTMLElement).style.color = '#fff'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = `${service.from}0D`
                          ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'
                        }}>
                        <span className="text-xs font-semibold">Abrir Servicio</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => router.push('/dashboard/planes')}
                        className="flex items-center justify-between w-full p-3 rounded-xl transition-all"
                        style={{ background: 'rgba(155,0,255,0.06)', border: '1px solid rgba(155,0,255,0.15)', color: 'rgba(200,150,255,0.6)' }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(155,0,255,0.12)'
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(155,0,255,0.3)'
                          ;(e.currentTarget as HTMLElement).style.color = '#CC44FF'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(155,0,255,0.06)'
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(155,0,255,0.15)'
                          ;(e.currentTarget as HTMLElement).style.color = 'rgba(200,150,255,0.6)'
                        }}>
                        <span className="text-xs font-semibold">{expired ? 'Renovar Plan' : 'Ver Planes'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
      </div>
    </div>
  )
}
