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
  { href: '/dashboard/services/ads',           icon: 'fa-solid fa-bullhorn',       label: 'Ads',            desc: 'Campañas inteligentes',  accent: '#D203DD' },
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
            {SERVICES.filter(s => !s.hidden).map(s => (
              <Link key={s.href} href={s.href} style={{ textDecoration: 'none', display: 'block' }}>
                <div
                  className="svc-card"
                  style={{
                    position: 'relative', borderRadius: 18,
                    padding: '36px 14px 16px',
                    background: `radial-gradient(120% 80% at 50% 0%, ${s.accent}14, rgba(255,255,255,0) 60%), rgba(255,255,255,0.025)`,
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 12px 26px -16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  }}
                >
                  {/* línea de reflejo superior */}
                  <div style={{ position: 'absolute', top: 0, left: 14, right: 14, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)', pointerEvents: 'none' }} />
                  {/* iluminación ambiental detrás del icono */}
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', width: 78, height: 50, borderRadius: '50%', background: `radial-gradient(ellipse, ${s.accent}26, transparent 70%)`, filter: 'blur(7px)', pointerEvents: 'none' }} />
                  {/* icono sobresaliendo desde arriba */}
                  <div style={{
                    position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
                    width: 44, height: 44, borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(155deg, rgba(255,255,255,0.10), rgba(255,255,255,0.015)), rgba(20,16,34,0.6)`,
                    border: `1px solid ${s.accent}40`,
                    boxShadow: `0 10px 22px -6px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10)`,
                    fontSize: 17, color: s.accent,
                    WebkitFontSmoothing: 'antialiased',
                  }}>
                    <i className={s.icon} style={{ filter: `drop-shadow(0 0 5px ${s.accent}40)` }} />
                  </div>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.2, textAlign: 'center', letterSpacing: '-0.015em' }}>{s.label}</p>
                  <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.3, textAlign: 'center', letterSpacing: '0.02em' }}>{s.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════
           DESKTOP VIEW
      ═══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex w-full flex-1">
        <main className="d-main">

          {/* Banner + Profile */}
          <div style={{ position: 'relative', borderRadius: '22px', overflow: 'hidden', height: '200px', flexShrink: 0 }}>
            {IMAGES.map((img, i) => (
              <div key={i} style={{ position: 'absolute', inset: 0, backgroundImage: `url('${img}')`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: imgIdx === i ? 1 : 0, transition: 'opacity 1.3s ease' }} />
            ))}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(10,0,48,0.88) 0%, rgba(13,30,121,0.25) 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: '20px', padding: '0 28px' }}>
              <div className="avatar-wrap" style={{ marginTop: 0 }}>
                <div className="avatar-ring" />
                <label htmlFor="avatar-file-desktop" className="avatar" style={{ cursor: uploading ? 'not-allowed' : 'pointer', width: 80, height: 80 }}>
                  <input id="avatar-file-desktop" type="file" accept="image/*" disabled={uploading} style={{ display: 'none' }} onChange={uploadAvatar} />
                  {data.user.avatarUrl
                    ? <img src={data.user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : <i className="fa-solid fa-user" style={{ fontSize: '1.8rem' }} />}
                </label>
                <div className="avatar__status" />
              </div>
              <div>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>{data.user.fullName}</p>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', margin: '5px 0 10px' }}>@{data.user.username} · MY DIAMOND</p>
                <span className="u-pill u-pill--accent" style={{ fontSize: '.72rem' }}>
                  <span className="u-live-dot" />&nbsp;{data.user.rank || 'Plan'} · {data.user.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
            <div className="cover__dots">
              {IMAGES.map((_, i) => (
                <button key={i} onClick={() => setImgIdx(i)} className={`cover__dot ${imgIdx === i ? 'cover__dot--active' : ''}`} aria-label={`Slide ${i + 1}`} />
              ))}
            </div>
          </div>

          {/* Topbar */}
          <header className="topbar">
            <div>
              <h1 className="topbar__title">Dashboard</h1>
              <p className="topbar__sub">MY DIAMOND &nbsp;·&nbsp; <span className="tag-active"><span className="u-live-dot"></span>&nbsp;{data.user.rank || 'Plan'} {data.user.isActive ? 'Activo' : 'Inactivo'}</span></p>
            </div>
          </header>

          {/* Countdown / CTA Plan */}
          {data.user.rank && data.user.rank !== 'NONE' && data.user.planExpiresAt ? (
            <div className="d-card-comp countdown-row">
              <div>
                <p className="d-card__label" style={{ marginBottom: 'var(--sp-3)' }}>
                  <i className="fa-solid fa-clock" style={{ color: 'var(--clr-accent-lt)' }}></i>&nbsp; Plan {data.user.rank} · Vence en
                </p>
                <div className="countdown-units">
                  {[{ v: countdown?.d, l: 'Días' }, { v: countdown?.h, l: 'Horas' }, { v: countdown?.m, l: 'Min' }, { v: countdown?.s, l: 'Seg' }].map((u, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                      {i > 0 && <span className="countdown-sep">:</span>}
                      <div className="countdown-unit">
                        <span className="countdown-num">{u.v !== undefined ? String(u.v).padStart(2, '0') : '00'}</span>
                        <span className="countdown-lbl">{u.l}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/dashboard/planes" className="renew-btn"><i className="fa-solid fa-rotate"></i> Renovar Plan</Link>
            </div>
          ) : (
            <div className="d-card-comp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, background: 'linear-gradient(135deg, rgba(210,3,221,0.08) 0%, rgba(13,30,121,0.12) 100%)', border: '1px solid rgba(210,3,221,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="icon-chip chip--accent" style={{ width: 50, height: 50, fontSize: '1.3rem', flexShrink: 0 }}>
                  <i className="fa-solid fa-crown"></i>
                </div>
                <div>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>¡Activa tu Plan MY DIAMOND!</p>
                  <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>Desbloquea acceso completo a todos los servicios.</p>
                </div>
              </div>
              <Link href="/dashboard/planes" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 12, background: 'linear-gradient(135deg, #D203DD 0%, #0D1E79 100%)', color: '#fff', fontWeight: 800, fontSize: '.85rem', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <i className="fa-solid fa-crown"></i> Comprar Plan
              </Link>
            </div>
          )}

          {/* Services Grid — desktop */}
          <section>
            <p className="section-label" style={{ marginBottom: 6 }}><i className="fa-solid fa-th-large"></i>Servicios</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '0 0 44px', lineHeight: 1.5 }}>
              Activa tu sistema de automatización.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', columnGap: 18, rowGap: 44 }}>
              {SERVICES.filter(s => !s.hidden).map(s => (
                <Link key={s.href} href={s.href} style={{ textDecoration: 'none', display: 'block' }}>
                  <div
                    style={{
                      position: 'relative', borderRadius: 20,
                      padding: '44px 20px 22px',
                      background: `radial-gradient(115% 78% at 50% 0%, ${s.accent}14, rgba(255,255,255,0) 60%), rgba(255,255,255,0.022)`,
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 16px 36px -18px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.045)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                      transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.transform = 'translateY(-4px)'
                      el.style.borderColor = `${s.accent}4d`
                      el.style.boxShadow = `0 22px 46px -18px rgba(0,0,0,0.7), 0 0 24px -6px ${s.accent}33, inset 0 1px 0 rgba(255,255,255,0.07)`
                      el.style.background = `radial-gradient(115% 78% at 50% 0%, ${s.accent}1f, rgba(255,255,255,0) 62%), rgba(255,255,255,0.035)`
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.transform = 'translateY(0)'
                      el.style.borderColor = 'rgba(255,255,255,0.08)'
                      el.style.boxShadow = '0 16px 36px -18px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.045)'
                      el.style.background = `radial-gradient(115% 78% at 50% 0%, ${s.accent}14, rgba(255,255,255,0) 60%), rgba(255,255,255,0.022)`
                    }}
                  >
                    {/* línea de reflejo superior */}
                    <div style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)', pointerEvents: 'none' }} />
                    {/* iluminación ambiental detrás del icono */}
                    <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', width: 96, height: 60, borderRadius: '50%', background: `radial-gradient(ellipse, ${s.accent}26, transparent 70%)`, filter: 'blur(8px)', pointerEvents: 'none' }} />
                    {/* icono premium sobresaliendo desde arriba */}
                    <div style={{
                      position: 'absolute', top: -26, left: '50%', transform: 'translateX(-50%)',
                      width: 56, height: 56, borderRadius: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `linear-gradient(155deg, rgba(255,255,255,0.10), rgba(255,255,255,0.015)), rgba(20,16,34,0.6)`,
                      border: `1px solid ${s.accent}40`,
                      boxShadow: `0 14px 30px -8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.10)`,
                      fontSize: 22, color: s.accent,
                      WebkitFontSmoothing: 'antialiased',
                    }}>
                      <i className={s.icon} style={{ filter: `drop-shadow(0 0 6px ${s.accent}40)` }} />
                    </div>
                    <p style={{ fontSize: 14.5, fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.25, textAlign: 'center', letterSpacing: '-0.015em' }}>{s.label}</p>
                    <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.36)', margin: 0, lineHeight: 1.4, textAlign: 'center', letterSpacing: '0.02em' }}>{s.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

        </main>
      </div>
    </>
  )
}
