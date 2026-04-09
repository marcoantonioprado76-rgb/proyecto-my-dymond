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

const SERVICES = [
  { href: '/dashboard/services/ads',           icon: 'fa-solid fa-bullhorn',     label: 'Ads',           desc: 'Campañas publicitarias',      color: '#D203DD' },
  { href: '/dashboard/services/whatsapp',      icon: 'fa-brands fa-whatsapp',    label: 'WhatsApp',      desc: 'Bots y automatización',       color: '#22c55e' },
  { href: '/dashboard/services/social',        icon: 'fa-solid fa-share-nodes',  label: 'Social',        desc: 'Publicaciones y métricas',    color: '#e855f0' },
  { href: '/dashboard/services/sales',         icon: 'fa-solid fa-chart-line',   label: 'Sales',         desc: 'Seguimiento de ventas',       color: '#fbbf24' },
  { href: '/dashboard/services/landing-pages', icon: 'fa-solid fa-file',         label: 'Landing Pages', desc: 'Crea páginas de conversión',  color: '#a855f7' },
  { href: '/dashboard/services/virtual-store', icon: 'fa-solid fa-shop',         label: 'Tienda Virtual', desc: 'Tu escaparate digital',      color: '#38bdf8' },
  { href: '/dashboard/services/marketplace',   icon: 'fa-solid fa-cube',         label: 'Marketplace',   desc: 'Vende tus cursos',            color: '#fb7185' },
  { href: '/dashboard/services/clipping',      icon: 'fa-solid fa-newspaper',    label: 'Clipping',      desc: 'Monitoreo de contenido',      color: '#f472b6' },
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
          <p className="section-label"><i className="fa-solid fa-th-large"></i>Servicios</p>
          <div className="grid-2">
            {SERVICES.map(s => (
              <Link key={s.href} href={s.href} className="d-card-comp metric" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <div className="icon-chip" style={{ background: `${s.color}18`, color: s.color, width: 38, height: 38 }}>
                  <i className={s.icon}></i>
                </div>
                <p className="metric__label" style={{ marginTop: 4 }}>{s.label}</p>
                <p style={{ fontSize: '.7rem', color: 'var(--clr-muted)', margin: 0 }}>{s.desc}</p>
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
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(7,16,46,0.88) 0%, rgba(7,16,46,0.25) 100%)' }} />
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
            <p className="section-label" style={{ marginBottom: 'var(--sp-4)' }}><i className="fa-solid fa-th-large"></i>Servicios</p>
            <div className="d-grid d-grid-4">
              {SERVICES.map(s => (
                <Link key={s.href} href={s.href} className="d-card-comp d-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                  <div className="d-card__top">
                    <div className="icon-chip" style={{ background: `${s.color}18`, color: s.color, width: 42, height: 42, fontSize: '1.1rem' }}>
                      <i className={s.icon}></i>
                    </div>
                  </div>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: '8px 0 4px' }}>{s.label}</p>
                  <p style={{ fontSize: '.78rem', color: 'var(--clr-muted)', margin: 0 }}>{s.desc}</p>
                </Link>
              ))}
            </div>
          </section>

        </main>
      </div>
    </>
  )
}
