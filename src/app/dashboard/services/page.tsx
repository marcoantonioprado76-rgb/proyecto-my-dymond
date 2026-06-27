'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, MessageCircle, Layout, ArrowRight, Megaphone, Lock, AlertTriangle, Send, Users } from 'lucide-react'
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
    title: 'Meta Ads',
    description: 'Campañas en Facebook & Instagram con copy, creativos y estrategia generados por IA.',
    icon: Megaphone,
    from: '#0081FB', to: '#3B82F6',
    features: ['Facebook · Instagram', 'Creativos con IA', 'Métricas en tiempo real'],
    link: '/dashboard/services/ads/meta',
    requiredPlan: 'BASIC' as UserPlan,
  },
  // {
  //   id: 41,
  //   title: 'TikTok Ads',
  //   description: 'Próximamente: campañas en TikTok for Business con creativos generados por IA.',
  //   icon: Music2,
  //   from: '#EE1D52', to: '#69C9D0',
  //   features: ['TikTok for Business', 'Creativos con IA', 'Próximamente'],
  //   link: '/dashboard/services/ads/tiktok',
  //   requiredPlan: 'BASIC' as UserPlan,
  // }, // oculto temporalmente
  // {
  //   id: 42,
  //   title: 'Google Ads',
  //   description: 'Próximamente: Search, Display y YouTube. Copy y bidding inteligente con IA.',
  //   icon: Search,
  //   from: '#4285F4', to: '#FBBC04',
  //   features: ['Search · Display · YouTube', 'Copy con IA', 'Próximamente'],
  //   link: '/dashboard/services/ads/google',
  //   requiredPlan: 'BASIC' as UserPlan,
  // }, // oculto temporalmente
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
    <div className="rounded-card p-6 animate-pulse" style={{ background: '#FFFFFF', border: '1px solid #E4E9F0' }}>
      <div className="flex items-start justify-between mb-6">
        <div className="w-14 h-14 rounded-2xl" style={{ background: '#F0F3F7' }} />
        <div className="w-16 h-6 rounded-full" style={{ background: '#F0F3F7' }} />
      </div>
      <div className="w-3/4 h-5 rounded-lg mb-3" style={{ background: '#F0F3F7' }} />
      <div className="w-full h-3 rounded mb-2" style={{ background: '#F0F3F7' }} />
      <div className="w-5/6 h-3 rounded mb-6" style={{ background: '#F0F3F7' }} />
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map(i => <div key={i} className="h-6 w-24 rounded-full" style={{ background: '#F0F3F7' }} />)}
      </div>
      <div className="w-full h-12 rounded-2xl" style={{ background: '#F0F3F7' }} />
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
    <div className="font-ui" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F5F7FA 45%, #EEF2F7 100%)', minHeight: '100vh' }}>
    <div className="px-4 sm:px-6 lg:px-8 pt-8 max-w-screen-xl mx-auto pb-20">

      {/* Header */}
      <header className="mb-8">
        <h1 className="font-display" style={{ fontSize: 34, fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.1 }}>Servicios</h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: '6px 0 0' }}>
          {!loading && plan !== 'NONE' && !expired
            ? `${PLAN_NAMES[plan]} activo · ${services.filter(s => isUnlocked(s.requiredPlan ?? null)).length} servicios desbloqueados`
            : 'Gestiona tus herramientas digitales para crecer tu negocio.'}
        </p>
      </header>

      {/* Banners de estado */}
      {!loading && expired && (
        <div className="mb-6 flex items-start gap-3 px-4 py-4 rounded-2xl"
          style={{ background: 'rgba(232,89,12,0.07)', border: '1px solid rgba(232,89,12,0.22)' }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#E8590C' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: '#E8590C' }}>Tu plan ha vencido</p>
            <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>Renueva tu plan para seguir usando todas las herramientas.</p>
          </div>
          <button onClick={() => router.push('/dashboard/planes')}
            className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(232,89,12,0.12)', border: '1px solid rgba(232,89,12,0.3)', color: '#E8590C' }}>
            Renovar
          </button>
        </div>
      )}

      {!loading && !expired && plan === 'NONE' && (
        <div className="mb-6 flex items-start gap-3 px-4 py-4 rounded-2xl"
          style={{ background: 'rgba(255,9,108,0.06)', border: '1px solid rgba(255,9,108,0.18)' }}>
          <Lock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#FF096C' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: '#111827' }}>Activa tu plan para desbloquear los servicios</p>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
              Pack Básico desde $49 USD — agentes AI, tienda, landing pages y más.
            </p>
          </div>
          <button onClick={() => router.push('/dashboard/planes')}
            className="dm-btn shrink-0" style={{ padding: '9px 16px', fontSize: 12 }}>
            Ver Planes
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : services.map((service) => {
              const unlocked = isUnlocked(service.requiredPlan ?? null)
              const isFree = (service as any).free === true
              return (
                <div key={service.id} className={`dm-card ${unlocked ? 'dm-card--hover' : ''}`}
                  style={{ padding: 24, display: 'flex', flexDirection: 'column', opacity: unlocked ? 1 : 0.72 }}>
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: unlocked ? `linear-gradient(145deg, ${service.from}, ${service.to})` : '#EEF2F7', boxShadow: unlocked ? `0 12px 28px -8px ${service.from}66` : 'none' }}>
                      <service.icon className="w-7 h-7" style={{ color: unlocked ? '#fff' : '#9CA3AF' }} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] px-3 py-1 rounded-full"
                      style={isFree
                        ? { background: 'rgba(255,9,108,0.08)', color: '#FF096C', border: '1px solid rgba(255,9,108,0.2)' }
                        : unlocked
                          ? { background: 'rgba(34,197,94,0.10)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.22)' }
                          : { background: '#F0F3F7', color: '#9CA3AF', border: '1px solid #E4E9F0' }}>
                      {isFree ? '✦ Gratis' : unlocked ? '● Activo' : expired ? 'Vencido' : '🔒 Bloqueado'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold mb-2 leading-tight" style={{ color: '#111827' }}>{service.title}</h3>
                  <p className="text-[13px] leading-relaxed mb-4 flex-1" style={{ color: '#6B7280' }}>{service.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {service.features.map((f, i) => (
                      <span key={i} className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: '#F0F3F7', border: '1px solid #E4E9F0', color: '#6B7280' }}>{f}</span>
                    ))}
                  </div>
                  {unlocked ? (
                    <Link href={service.link} className="dm-btn" style={{ width: '100%', textDecoration: 'none' }}>
                      Abrir servicio <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <button onClick={() => router.push('/dashboard/planes')} className="dm-btn-ghost" style={{ width: '100%' }}>
                      <Lock className="w-4 h-4" /> {expired ? 'Renovar Plan' : 'Ver Planes'}
                    </button>
                  )}
                </div>
              )
            })}
      </div>
    </div>
    </div>
  )
}
