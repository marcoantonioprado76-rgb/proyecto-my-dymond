'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PrismLoader from '@/components/PrismLoader'
import NotificationBell from '@/components/NotificationBell'

interface DashboardData {
  user: {
    fullName: string
    username: string
    isActive: boolean
    avatarUrl?: string | null
    rank?: string
    planExpiresAt?: string | null
  }
}

const IMAGES = [
  'https://i.ibb.co/ksmGqK0R/estrategia-metaverso-de-meta-2025-detalle2-1024x573.jpg',
  'https://i.ibb.co/Z1vWB05C/estrategia-metaverso-de-meta-2025-detalle1-1024x573.jpg',
  'https://i.ibb.co/cK5Wv5yG/estrategia-metaverso-de-meta-2025.jpg',
]

// Clipping queda en la lista con hidden:true — oculto visualmente del Inicio
// pero su lógica/ruta siguen intactas. Para restaurarlo: quitar `hidden: true`.
const SERVICES = [
  { href: '/dashboard/services/ads/meta',      icon: 'fa-brands fa-meta',          label: 'Meta Ads',       desc: 'Facebook & Instagram',   accent: '#0081FB' },
  { href: '/dashboard/services/ads/tiktok',    icon: 'fa-brands fa-tiktok',        label: 'TikTok Ads',     desc: 'TikTok for Business',    accent: '#EE1D52', hidden: true },
  { href: '/dashboard/services/ads/google',    icon: 'fa-brands fa-google',        label: 'Google Ads',     desc: 'Search · Display · YT',  accent: '#FBBC04', hidden: true },
  { href: '/dashboard/services/social',        icon: 'fa-solid fa-circle-nodes',   label: 'Social',         desc: 'Todas tus redes',        accent: '#9B6BFF' },
  { href: '/dashboard/services/landing-pages', icon: 'fa-solid fa-layer-group',    label: 'Landing Pages',  desc: 'Páginas que venden',     accent: '#7B5BFF' },
  { href: '/dashboard/services/whatsapp',      icon: 'fa-solid fa-robot',          label: 'Agentes de IA', desc: 'Venden 24/7',            accent: '#00C2FF' },
  { href: '/dashboard/services/virtual-store', icon: 'fa-solid fa-store',          label: 'Tienda Virtual', desc: 'Tu tienda online',       accent: '#3B82F6' },
  { href: '/dashboard/crm',                    icon: 'fa-solid fa-users-gear',     label: 'CRM Broadcast',  desc: 'Mensajes masivos',       accent: '#D203DD' },
  { href: '/dashboard/academy',                icon: 'fa-solid fa-graduation-cap', label: 'Academy',        desc: 'Aprende y escala',       accent: '#8B5CF6' },
  { href: '/dashboard/services/clipping',      icon: 'fa-solid fa-newspaper',      label: 'Clipping',       desc: 'Gana por vistas',        accent: '#FF2D55', hidden: true },
]

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [countdown, setCountdown] = useState<{ d: number; h: number; m: number; s: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/network')
      if (res.status === 401) { router.push('/login'); return }
      const json = await res.json()
      if (json?.user) setData(json)
    } catch { /**/ } finally { setLoading(false) }
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    const id = setInterval(() => setImgIdx(p => (p + 1) % IMAGES.length), 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!data?.user.planExpiresAt) { setCountdown(null); return }
    const target = new Date(data.user.planExpiresAt).getTime()
    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) { setCountdown({ d: 0, h: 0, m: 0, s: 0 }); return }
      setCountdown({ d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) })
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [data?.user.planExpiresAt])

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !data) return
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await fetch('/api/users/avatar', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) return
      setData(prev => prev ? { ...prev, user: { ...prev.user, avatarUrl: json.avatarUrl } } : prev)
    } catch { /**/ } finally {
      setUploading(false); if (fileRef.current) fileRef.current.value = ''
    }
  }

  useEffect(() => {
    if (!data?.user) return
    const nameEl = document.querySelector('.sidebar__user-name')
    const roleEl = document.querySelector('.sidebar__user-role')
    if (nameEl) nameEl.textContent = data.user.fullName
    if (roleEl) roleEl.innerHTML = `@${data.user.username} · <span style="color:var(--clr-accent-lt)">Activo</span>`
    if (data.user.avatarUrl) {
      const sidebarAv = document.getElementById('dAvatar')
      if (sidebarAv) sidebarAv.innerHTML = `<img src="${data.user.avatarUrl}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
    }
  }, [data])

  if (loading) return <PrismLoader />
  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
      Error al cargar datos
    </div>
  )

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
           MOBILE VIEW
      ═══════════════════════════════════════════════════════════ */}
      <div className="lg:hidden flex flex-col min-h-screen w-full" style={{ position: 'relative' }}>

        {/* Cover Photo */}
        <div className="cover" id="cover">
          {IMAGES.map((img, i) => (
            <div key={i} className={`cover__slide ${imgIdx === i ? 'cover__slide--active' : ''}`} style={{ backgroundImage: `url('${img}')` }}></div>
          ))}
          <div className="cover__dots">
            {IMAGES.map((_, i) => (
              <button key={i} onClick={() => setImgIdx(i)} className={`cover__dot ${imgIdx === i ? 'cover__dot--active' : ''}`} aria-label={`Slide ${i + 1}`}></button>
            ))}
          </div>
          <div className="lg:hidden" style={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}>
            <NotificationBell />
          </div>
        </div>

        {/* Profile */}
        <div className="profile">
          <div className="avatar-wrap">
            <div className="avatar-ring"></div>
            <label htmlFor="avatar-file-mobile" className="avatar" style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
              <input id="avatar-file-mobile" type="file" accept="image/*" disabled={uploading} style={{ display: 'none' }} onChange={uploadAvatar} />
              {data.user.avatarUrl
                ? <img src={data.user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : <i className="fa-solid fa-user" aria-hidden="true"></i>}
            </label>
            <div className="avatar__status" title="En línea"></div>
          </div>
          <p className="profile__name">
            {data.user.fullName}
            <span className="u-pill u-pill--accent">{data.user.rank || 'PRO'}</span>
          </p>
          <p className="profile__handle">@{data.user.username} · MY DIAMOND</p>
          <span className="u-pill u-pill--accent" style={{ marginTop: '4px', fontSize: '.74rem', padding: '5px 14px' }}>
            <span className="u-live-dot"></span>&nbsp;{data.user.rank || 'Plan'} · {data.user.isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {/* Plan CTA — mobile */}
        <div style={{ padding: '0 16px 4px' }}>
          <Link
            href="/dashboard/planes"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '12px 0', borderRadius: 12, textDecoration: 'none',
              fontWeight: 700, fontSize: 13, letterSpacing: '0.04em',
              background: data.user.rank && data.user.rank !== 'NONE'
                ? 'linear-gradient(135deg, rgba(210,3,221,0.12) 0%, rgba(0,255,136,0.08) 100%)'
                : 'linear-gradient(135deg, #D203DD 0%, #0D1E79 100%)',
              border: data.user.rank && data.user.rank !== 'NONE'
                ? '1px solid rgba(210,3,221,0.25)'
                : 'none',
              color: data.user.rank && data.user.rank !== 'NONE' ? '#D203DD' : '#fff',
            }}
          >
            <i className={`fa-solid ${data.user.rank && data.user.rank !== 'NONE' ? 'fa-rotate' : 'fa-crown'}`}></i>
            {data.user.rank && data.user.rank !== 'NONE' ? 'Renovar Plan' : 'Comprar Plan'}
          </Link>
        </div>

        {/* Services Grid — mobile */}
        <main className="feed" id="feed">
          <p className="section-label" style={{ marginBottom: 4 }}><i className="fa-solid fa-th-large"></i>Servicios</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: '0 0 30px', lineHeight: 1.5 }}>
            Activa tu sistema de automatización.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 14, rowGap: 32 }}>
            {SERVICES.filter(s => !s.hidden).map((s, i) => (
              <Link key={s.href} href={s.href} style={{ textDecoration: 'none', display: 'block' }}>
                <div
                  className="svc-card"
                  style={{
                    position: 'relative', borderRadius: 18,
                    padding: '36px 14px 18px',
                    background: `radial-gradient(122% 76% at 50% -4%, ${s.accent}24, rgba(255,255,255,0) 58%), linear-gradient(180deg, rgba(17,19,40,0.78) 0%, rgba(10,11,24,0.66) 52%, rgba(14,16,34,0.55) 100%)`,
                    border: '1px solid rgba(255,255,255,0.10)',
                    boxShadow: '0 18px 40px -20px rgba(0,0,0,0.78), 0 4px 14px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  }}
                >
                  {/* figura gigante del servicio integrada en el fondo (recortada a la card) */}
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden', pointerEvents: 'none' }}>
                    <i className={s.icon} style={{
                      position: 'absolute', right: -10, bottom: -16, fontSize: 92,
                      color: s.accent, opacity: 0.07, filter: 'blur(1.2px)',
                      transform: 'rotate(-8deg)',
                    }} />
                  </div>
                  {/* reflejo glass diagonal tenue */}
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 18, background: 'linear-gradient(152deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 36%)', pointerEvents: 'none' }} />
                  {/* línea de reflejo superior */}
                  <div style={{ position: 'absolute', top: 0, left: 14, right: 14, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.13), transparent)', pointerEvents: 'none' }} />
                  {/* halo ambiental cinematográfico detrás del icono */}
                  <div className="svc-glow-pulse" style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', width: 110, height: 74, borderRadius: '50%', background: `radial-gradient(ellipse, ${s.accent}3a, transparent 72%)`, filter: 'blur(13px)', pointerEvents: 'none' }} />
                  {/* icono sobresaliendo desde arriba */}
                  <div className="svc-float" style={{
                    position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
                    width: 44, height: 44, borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(155deg, rgba(255,255,255,0.13), rgba(255,255,255,0.02)), rgba(18,15,32,0.72)`,
                    border: `1px solid ${s.accent}55`,
                    boxShadow: `0 12px 26px -8px rgba(0,0,0,0.65), 0 0 14px -2px ${s.accent}3a, inset 0 1px 0 rgba(255,255,255,0.14)`,
                    fontSize: 17, color: s.accent,
                    WebkitFontSmoothing: 'antialiased',
                  }}>
                    <i className={s.icon} style={{ filter: `drop-shadow(0 0 6px ${s.accent}55)` }} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.18, textAlign: 'center', letterSpacing: '-0.02em', textShadow: '0 1px 12px rgba(0,0,0,0.45)' }}>{s.label}</p>
                  <p style={{ fontSize: 9.5, fontWeight: 400, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.3, textAlign: 'center', letterSpacing: '0.02em' }}>{s.desc}</p>
                  {/* wave glow inferior — energía elegante difuminada */}
                  <svg width="100%" height="26" viewBox="0 0 200 26" preserveAspectRatio="none" className="svc-wave"
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, pointerEvents: 'none' }}>
                    <defs>
                      <linearGradient id={`svcw-m-${i}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor={s.accent} stopOpacity="0" />
                        <stop offset="0.5" stopColor={s.accent} stopOpacity="0.8" />
                        <stop offset="1" stopColor={s.accent} stopOpacity="0" />
                      </linearGradient>
                      <filter id={`svcwb-m-${i}`} x="-20%" y="-60%" width="140%" height="240%">
                        <feGaussianBlur stdDeviation="2" />
                      </filter>
                    </defs>
                    <path d="M0 15 Q 100 3 200 17 L 200 21 Q 100 8 0 20 Z" fill={`url(#svcw-m-${i})`} opacity="0.55" filter={`url(#svcwb-m-${i})`} />
                    <path d="M0 16 Q 100 5 200 18" stroke={`url(#svcw-m-${i})`} strokeWidth="1.3" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════
           DESKTOP VIEW — Premium light (MY DIAMOND)
      ═══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex w-full flex-1">
        <main className="d-main font-ui" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F5F7FA 45%, #EEF2F7 100%)', color: '#111827', minHeight: '100vh', gap: '24px' }}>

          {/* ── TOPBAR ── */}
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 460 }}>
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 13 }} />
              <input placeholder="Buscar en la plataforma…" className="dm-input" style={{ paddingLeft: 40, height: 48, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <NotificationBell />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.9)', border: '1px solid #E4E9F0', borderRadius: 16, padding: '7px 12px', boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }}>
                <label htmlFor="avatar-file-desktop" style={{ cursor: uploading ? 'not-allowed' : 'pointer', width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dm-grad)', color: '#fff', flexShrink: 0 }}>
                  <input id="avatar-file-desktop" type="file" accept="image/*" disabled={uploading} style={{ display: 'none' }} onChange={uploadAvatar} />
                  {data.user.avatarUrl
                    ? <img src={data.user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <i className="fa-solid fa-user" style={{ fontSize: 14 }} />}
                </label>
                <div style={{ lineHeight: 1.25 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>{data.user.fullName}</p>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#FF096C' }}>{data.user.rank || 'Plan'} · {data.user.isActive ? 'Activo' : 'Inactivo'}</p>
                </div>
              </div>
            </div>
          </header>

          {/* ── HERO premium ── */}
          <div className="dm-hero" style={{ display: 'flex', alignItems: 'stretch', minHeight: 240 }}>
            <div style={{ position: 'relative', zIndex: 2, flex: 1, padding: '38px 42px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#FF6FA8' }}>Bienvenido de nuevo</p>
              <h1 className="font-display text-silver-gradient" style={{ margin: '4px 0 0', fontSize: 'clamp(34px, 4vw, 52px)', fontWeight: 600, lineHeight: 1, letterSpacing: '-0.01em' }}>{data.user.fullName}</h1>
              <p style={{ margin: '12px 0 16px', fontSize: 13.5, color: 'rgba(255,255,255,0.5)' }}>@{data.user.username} · MY DIAMOND</p>
              <Link href="/dashboard/planes" className="dm-badge" style={{ width: 'fit-content', textDecoration: 'none' }}>
                <i className="fa-solid fa-crown" style={{ fontSize: 11 }} /> {data.user.rank || 'Plan'} · {data.user.isActive ? 'Activo' : 'Inactivo'}
              </Link>
            </div>
            <div className="hidden xl:flex" style={{ position: 'relative', width: 340, alignItems: 'center', justifyContent: 'center', padding: '0 36px 0 0' }}>
              <div style={{ position: 'absolute', right: 60, top: '50%', transform: 'translateY(-50%)', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,9,108,0.28), transparent 60%)', filter: 'blur(8px)' }} />
              <i className="fa-solid fa-gem" style={{ position: 'relative', fontSize: 96, background: 'var(--dm-silver)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 18px 40px rgba(255,9,108,0.35))' }} />
            </div>
          </div>

          {/* ── STAT CARDS (datos reales) ── */}
          <div className="d-grid d-grid-4">
            {[
              { icon: 'fa-crown',        label: 'Tu Plan',         value: data.user.rank || '—',                          href: '/dashboard/planes', cta: 'Ver planes' },
              { icon: 'fa-clock',        label: 'Días restantes',  value: countdown ? String(countdown.d) : '—',          href: '/dashboard/planes', cta: 'Renovar' },
              { icon: 'fa-layer-group',  label: 'Servicios',       value: String(SERVICES.filter(s => !s.hidden).length), href: '/dashboard/services', cta: 'Explorar' },
              { icon: 'fa-circle-check', label: 'Estado',          value: data.user.isActive ? 'Activo' : 'Inactivo',     href: '/dashboard/profile', cta: 'Mi perfil' },
            ].map((st, i) => (
              <div key={i} className="dm-card dm-card--hover" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 50, height: 50, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dm-grad)', color: '#fff', boxShadow: '0 12px 28px rgba(255,9,108,0.24)', flexShrink: 0 }}>
                    <i className={`fa-solid ${st.icon}`} style={{ fontSize: 18 }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6B7280' }}>{st.label}</p>
                    <p className="font-display" style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 600, color: '#111827', lineHeight: 1.05 }}>{st.value}</p>
                  </div>
                </div>
                <Link href={st.href} style={{ fontSize: 12.5, fontWeight: 700, color: '#FF096C', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{st.cta} <i className="fa-solid fa-arrow-right" style={{ fontSize: 10 }} /></Link>
              </div>
            ))}
          </div>

          {/* ── CTA Plan (countdown o comprar) ── */}
          {data.user.rank && data.user.rank !== 'NONE' && data.user.planExpiresAt ? (
            <div className="dm-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, padding: '22px 26px' }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280' }}>
                  <i className="fa-solid fa-clock" style={{ color: '#FF096C' }} />&nbsp; Plan {data.user.rank} · Vence en
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  {[{ v: countdown?.d, l: 'Días' }, { v: countdown?.h, l: 'Horas' }, { v: countdown?.m, l: 'Min' }, { v: countdown?.s, l: 'Seg' }].map((u, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {i > 0 && <span style={{ fontSize: 20, fontWeight: 700, color: '#B735B8', marginBottom: 16 }}>:</span>}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                        <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: '#111827', background: '#F0F3F7', border: '1px solid #E4E9F0', borderRadius: 12, padding: '6px 14px', minWidth: 58, textAlign: 'center', lineHeight: 1 }}>{u.v !== undefined ? String(u.v).padStart(2, '0') : '00'}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF' }}>{u.l}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/dashboard/planes" className="dm-btn" style={{ textDecoration: 'none' }}><i className="fa-solid fa-rotate" /> Renovar Plan</Link>
            </div>
          ) : (
            <div className="dm-card-dark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, padding: 26 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="dm-icon" style={{ width: 50, height: 50 }}><i className="fa-solid fa-crown" style={{ fontSize: 20 }} /></div>
                <div>
                  <p className="font-display" style={{ fontSize: 22, fontWeight: 600, color: '#fff', margin: 0 }}>Lleva tu cuenta al siguiente nivel</p>
                  <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', margin: '4px 0 0' }}>Desbloquea acceso completo a todos los servicios MY DIAMOND.</p>
                </div>
              </div>
              <Link href="/dashboard/planes" className="dm-btn" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}><i className="fa-solid fa-crown" /> Comprar Plan</Link>
            </div>
          )}

          {/* ── SERVICIOS — cards claras premium ── */}
          <section>
            <h2 className="font-display" style={{ fontSize: 28, fontWeight: 600, color: '#111827', margin: 0 }}>Servicios</h2>
            <p style={{ fontSize: 13.5, color: '#6B7280', margin: '4px 0 22px' }}>Gestiona tus herramientas digitales para crecer tu negocio.</p>
            <div className="d-grid d-grid-4">
              {SERVICES.filter(s => !s.hidden).map((s) => (
                <Link key={s.href} href={s.href} className="dm-card dm-card--hover" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, textDecoration: 'none', minHeight: 168 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(145deg, ${s.accent}, ${s.accent}cc)`, color: '#fff', boxShadow: `0 12px 28px ${s.accent}3a`, fontSize: 20, flexShrink: 0 }}>
                    <i className={s.icon} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>{s.label}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#6B7280', lineHeight: 1.4 }}>{s.desc}</p>
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#FF096C', display: 'inline-flex', alignItems: 'center', gap: 6 }}>Abrir servicio <i className="fa-solid fa-arrow-right" style={{ fontSize: 10 }} /></span>
                </Link>
              ))}
            </div>
          </section>

        </main>
      </div>

    </>
  )
}
