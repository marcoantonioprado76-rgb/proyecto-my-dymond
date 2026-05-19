'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, MessageCircle, Layout, ArrowRight, Megaphone, Play, Lock, AlertTriangle, Send, Zap, Users } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type UserPlan = 'NONE' | 'BASIC' | 'PRO' | 'ELITE'

const PLAN_RANK: Record<UserPlan, number> = { NONE: 0, BASIC: 1, PRO: 2, ELITE: 3 }
const PLAN_NAMES: Record<UserPlan, string> = { NONE: 'Sin Plan', BASIC: 'Pack Básico', PRO: 'Pack Pro', ELITE: 'Pack Elite' }

const services = [
  {
    id: 1,
    title: 'Tienda Virtual',
    description: 'Tu propia tienda online lista para vender. Recibe pedidos por WhatsApp sin comisiones.',
    icon: ShoppingCart,
    from: '#D203DD', to: '#0066FF',
    features: ['Catálogo profesional', 'Pedidos por WhatsApp', 'Sin comisiones'],
    link: '/dashboard/services/virtual-store',
    requiredPlan: 'BASIC' as UserPlan,
  },
  {
    id: 2,
    title: 'Agentes AI de Ventas',
    description: 'Tu agente AI vende, responde y fideliza clientes las 24 horas sin levantar un dedo.',
    icon: MessageCircle,
    from: '#00FF88', to: '#00C2FF',
    features: ['Disponible 24/7', 'Respuestas automáticas', 'Cierre de ventas'],
    link: '/dashboard/services/whatsapp',
    requiredPlan: 'BASIC' as UserPlan,
  },
  {
    id: 3,
    title: 'Landing Pages IA',
    description: 'Genera páginas de venta profesionales en segundos con inteligencia artificial.',
    icon: Layout,
    from: '#9B00FF', to: '#FF2DF7',
    features: ['Generación con IA', 'Editor HTML', 'Publicación 1 clic'],
    link: '/dashboard/services/landing-pages',
    requiredPlan: 'BASIC' as UserPlan,
  },
  {
    id: 4,
    title: 'Anuncios con IA',
    description: 'Campañas en Meta, Google y TikTok. Copy, creativos y estrategia generados por IA.',
    icon: Megaphone,
    from: '#FF8800', to: '#FFCC00',
    features: ['Meta · Google · TikTok', 'Creativos con IA', 'Métricas en tiempo real'],
    link: '/dashboard/services/ads',
    requiredPlan: 'BASIC' as UserPlan,
  },
  // {
  //   id: 5,
  //   title: 'Clipping — Gana por Vistas',
  //   description: 'Sube clips a YouTube y TikTok y genera ingresos reales por cada mil vistas.',
  //   icon: Play,
  //   from: '#FF2D55', to: '#FF6B00',
  //   features: ['Ingresos por CPM', 'YouTube & TikTok', 'Retiros a wallet'],
  //   link: '/dashboard/services/clipping',
  //   requiredPlan: null,
  //   free: true,
  // }, // oculto temporalmente
  {
    id: 7,
    title: 'Publicador Social',
    description: 'Publica en todas tus redes desde un solo lugar. Programa, genera contenido con IA y analiza.',
    icon: Send,
    from: '#FF2DF7', to: '#FF8800',
    features: ['4 redes sociales', 'Contenido con IA', 'Programación'],
    link: '/dashboard/services/social',
    requiredPlan: 'BASIC' as UserPlan,
  },
  {
    id: 8,
    title: 'CRM Broadcast',
    description: 'Enviá mensajes masivos por WhatsApp con imágenes y texto generado por IA a tus contactos.',
    icon: Users,
    from: '#22C55E', to: '#16A34A',
    features: ['Mensajes con IA', 'Rotación de imágenes', 'Delay configurable'],
    link: '/dashboard/crm',
    requiredPlan: 'BASIC' as UserPlan,
  },
]

function SkeletonCard() {
  return (
    <div className="rounded-3xl p-6 animate-pulse" style={{ background: '#2B2644', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-start justify-between mb-6">
        <div className="w-14 h-14 rounded-2xl bg-white/5" />
        <div className="w-16 h-6 rounded-full bg-white/5" />
      </div>
      <div className="w-3/4 h-5 rounded-lg bg-white/5 mb-3" />
      <div className="w-full h-3 rounded bg-white/5 mb-2" />
      <div className="w-5/6 h-3 rounded bg-white/5 mb-6" />
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map(i => <div key={i} className="h-6 w-24 rounded-full bg-white/5" />)}
      </div>
      <div className="w-full h-12 rounded-2xl bg-white/5" />
    </div>
  )
}

export default function ServicesPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<UserPlan>('NONE')
  const [expired, setExpired] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () =>
      fetch('/api/plan-status')
        .then(r => {
          if (!r.ok) throw new Error(`status ${r.status}`)
          return r.json()
        })
        .then(d => {
          setPlan((d.plan ?? 'NONE') as UserPlan)
          setExpired(!!d.expired)
          setLoading(false)
        })
        .catch(() => setTimeout(load, 1500))

    load()
  }, [])

  function isUnlocked(requiredPlan: UserPlan | null) {
    if (requiredPlan === null) return true
    if (expired) return false
    return PLAN_RANK[plan] >= PLAN_RANK[requiredPlan]
  }

  return (
    <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto pb-20">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #D203DD, #0D1E79)', boxShadow: '0 0 16px rgba(210,3,221,0.35)' }}>
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-widest">Servicios</h1>
        </div>
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08), transparent)' }} />
        <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {!loading && plan !== 'NONE' && !expired
            ? `${PLAN_NAMES[plan]} activo · ${services.filter(s => isUnlocked(s.requiredPlan ?? null)).length} servicios desbloqueados`
            : 'Activa tu plan y desbloquea todas las herramientas'}
        </p>
      </div>

      {/* Banners de estado */}
      {!loading && expired && (
        <div className="mb-6 flex items-start gap-3 px-4 py-4 rounded-2xl"
          style={{ background: 'rgba(255,100,0,0.08)', border: '1px solid rgba(255,100,0,0.25)' }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#FF6400' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: '#FF6400' }}>Tu plan ha vencido</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,100,0,0.7)' }}>Renueva tu plan para seguir usando todas las herramientas.</p>
          </div>
          <button onClick={() => router.push('/dashboard/planes')}
            className="shrink-0 text-xs font-black px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,100,0,0.15)', border: '1px solid rgba(255,100,0,0.3)', color: '#FF6400' }}>
            Renovar
          </button>
        </div>
      )}

      {!loading && !expired && plan === 'NONE' && (
        <div className="mb-6 flex items-start gap-3 px-4 py-4 rounded-2xl"
          style={{ background: 'rgba(210,3,221,0.07)', border: '1px solid rgba(210,3,221,0.2)' }}>
          <Lock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#D203DD' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Activa tu plan para desbloquear los servicios</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Pack Básico desde $49 USD — agentes AI, tienda, landing pages y más.
            </p>
          </div>
          <button onClick={() => router.push('/dashboard/planes')}
            className="shrink-0 text-xs font-black px-3 py-1.5 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #D203DD, #0D1E79)', color: '#fff' }}>
            Ver Planes
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : services.map((service) => {
              const unlocked = isUnlocked(service.requiredPlan ?? null)
              const isFree = (service as any).free === true

              return (
                <div key={service.id}
                  className={`relative rounded-3xl overflow-hidden transition-all duration-500 group ${unlocked ? 'hover:-translate-y-1.5' : 'opacity-55'}`}
                  style={{
                    background: unlocked
                      ? `radial-gradient(120% 72% at 50% -8%, ${service.from}1f, rgba(255,255,255,0) 58%), linear-gradient(180deg, rgba(17,19,40,0.85) 0%, rgba(10,11,24,0.8) 54%, rgba(14,16,34,0.74) 100%)`
                      : 'linear-gradient(180deg, rgba(22,22,34,0.85), rgba(14,14,24,0.85))',
                    border: `1px solid ${unlocked ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)'}`,
                    boxShadow: unlocked ? '0 26px 54px -24px rgba(0,0,0,0.82), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (!unlocked) return
                    e.currentTarget.style.boxShadow = `0 34px 64px -24px rgba(0,0,0,0.88), 0 0 30px -8px ${service.from}40, inset 0 1px 0 rgba(255,255,255,0.08)`
                    e.currentTarget.style.borderColor = `${service.from}55`
                  }}
                  onMouseLeave={e => {
                    if (!unlocked) return
                    e.currentTarget.style.boxShadow = '0 26px 54px -24px rgba(0,0,0,0.82), inset 0 1px 0 rgba(255,255,255,0.05)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'
                  }}>

                  {/* Figura gigante del servicio integrada en el fondo */}
                  <service.icon className="absolute -bottom-6 -right-5 pointer-events-none select-none"
                    style={{ width: 168, height: 168, color: service.from, opacity: unlocked ? 0.06 : 0.03, filter: 'blur(1.5px)', transform: 'rotate(-8deg)' }} />

                  {/* Reflejo glass diagonal tenue */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(152deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 36%)' }} />

                  {/* Línea de reflejo superior premium */}
                  <div className="absolute top-0 left-5 right-5 h-px transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${unlocked ? service.from + 'aa' : 'rgba(255,255,255,0.12)'}, transparent)`,
                      opacity: unlocked ? 1 : 0.4,
                    }} />

                  {/* Halo ambiental cinematográfico */}
                  {unlocked && (
                    <div className="svc-glow-pulse absolute -top-10 left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
                      style={{ width: 200, height: 110, background: `radial-gradient(ellipse, ${service.from}33, transparent 72%)`, filter: 'blur(22px)' }} />
                  )}

                  <div className="relative z-10 p-6 flex flex-col h-full">

                    {/* Icon row */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300"
                          style={{
                            background: unlocked
                              ? `linear-gradient(155deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02)), rgba(18,15,32,0.7)`
                              : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${unlocked ? service.from + '55' : 'rgba(255,255,255,0.08)'}`,
                            boxShadow: unlocked ? `0 14px 30px -10px rgba(0,0,0,0.7), 0 0 16px -2px ${service.from}3a, inset 0 1px 0 rgba(255,255,255,0.12)` : 'none',
                          }}>
                          <service.icon className="w-7 h-7 transition-transform duration-300 group-hover:scale-110"
                            style={{ color: unlocked ? service.from : 'rgba(255,255,255,0.2)', filter: unlocked ? `drop-shadow(0 0 7px ${service.from}55)` : 'none' }} />
                        </div>
                        {/* Live dot */}
                        {unlocked && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0b0c1a] svc-glow-pulse"
                            style={{ background: service.from, boxShadow: `0 0 8px ${service.from}` }} />
                        )}
                      </div>

                      {/* Badge */}
                      <span className="text-[9px] font-bold uppercase tracking-[0.18em] px-3 py-1 rounded-full backdrop-blur-sm"
                        style={
                          isFree
                            ? { background: 'rgba(210,3,221,0.12)', color: '#FF2DF7', border: '1px solid rgba(210,3,221,0.3)' }
                            : unlocked
                              ? { background: `${service.from}1c`, color: service.from, border: `1px solid ${service.from}45`, boxShadow: `0 0 12px -3px ${service.from}55` }
                              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.28)', border: '1px solid rgba(255,255,255,0.08)' }
                        }>
                        {isFree ? '✦ Gratis' : unlocked ? '● Activo' : expired ? 'Vencido' : '🔒 Bloqueado'}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold mb-2 leading-tight"
                      style={{ color: '#fff', letterSpacing: '-0.02em', textShadow: '0 1px 14px rgba(0,0,0,0.45)' }}>
                      {service.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs leading-relaxed mb-5 flex-1"
                      style={{ color: unlocked ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)', fontWeight: 400, letterSpacing: '0.01em' }}>
                      {service.description}
                    </p>

                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {service.features.map((f, i) => (
                        <span key={i} className="text-[10px] font-medium px-2.5 py-1 rounded-full"
                          style={{
                            background: unlocked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${unlocked ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)'}`,
                            color: unlocked ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.18)',
                          }}>
                          {f}
                        </span>
                      ))}
                    </div>

                    {/* CTA */}
                    {unlocked ? (
                      <Link href={service.link}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm text-white transition-all duration-300 group-hover:gap-3 active:scale-[0.98]"
                        style={{
                          background: `linear-gradient(135deg, ${service.from}2e, ${service.to}24)`,
                          border: `1px solid ${service.from}4d`,
                          boxShadow: `0 8px 22px -10px ${service.from}66, inset 0 1px 0 rgba(255,255,255,0.10)`,
                        }}>
                        Abrir Servicio
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                    ) : (
                      <button onClick={() => router.push('/dashboard/planes')}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm transition-all duration-300 active:scale-[0.98]"
                        style={{
                          background: 'rgba(210,3,221,0.07)',
                          border: '1px solid rgba(210,3,221,0.2)',
                          color: 'rgba(210,3,221,0.6)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(210,3,221,0.14)'
                          e.currentTarget.style.borderColor = 'rgba(210,3,221,0.4)'
                          e.currentTarget.style.color = '#D203DD'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(210,3,221,0.07)'
                          e.currentTarget.style.borderColor = 'rgba(210,3,221,0.2)'
                          e.currentTarget.style.color = 'rgba(210,3,221,0.6)'
                        }}>
                        <Lock className="w-4 h-4" />
                        {expired ? 'Renovar Plan' : 'Ver Planes'}
                      </button>
                    )}
                  </div>

                  {/* Wave glow inferior — energía elegante difuminada */}
                  {unlocked && (
                    <svg width="100%" height="30" viewBox="0 0 200 30" preserveAspectRatio="none" className="svc-wave absolute bottom-0 left-0 right-0 pointer-events-none">
                      <defs>
                        <linearGradient id={`svcw-srv-${service.id}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0" stopColor={service.from} stopOpacity="0" />
                          <stop offset="0.5" stopColor={service.from} stopOpacity="0.75" />
                          <stop offset="1" stopColor={service.from} stopOpacity="0" />
                        </linearGradient>
                        <filter id={`svcwb-srv-${service.id}`} x="-20%" y="-60%" width="140%" height="240%">
                          <feGaussianBlur stdDeviation="2.2" />
                        </filter>
                      </defs>
                      <path d="M0 18 Q 100 4 200 20 L 200 25 Q 100 10 0 24 Z" fill={`url(#svcw-srv-${service.id})`} opacity="0.5" filter={`url(#svcwb-srv-${service.id})`} />
                      <path d="M0 19 Q 100 6 200 21" stroke={`url(#svcw-srv-${service.id})`} strokeWidth="1.3" fill="none" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
              )
            })}
      </div>
    </div>
  )
}
