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

const SERVICE_GROUPS = [
  {
    title: 'Atraer clientes',
    icon: 'fa-solid fa-bullseye',
    services: [
      { href: '/dashboard/services/ads',           icon: 'fa-solid fa-bullhorn',    label: 'Ads',           desc: 'Campañas en Meta, Google y TikTok.',     from: '#D203DD', to: '#0066FF', badge: 'Recomendado' },
      { href: '/dashboard/services/social',        icon: 'fa-solid fa-share-nodes', label: 'Social',        desc: 'Publica en todas tus redes desde aquí.', from: '#FF2DF7', to: '#FF8800', badge: 'Disponible' },
      { href: '/dashboard/services/landing-pages', icon: 'fa-solid fa-file',        label: 'Landing Pages', desc: 'Páginas de venta generadas con IA.',     from: '#9B00FF', to: '#FF2DF7', badge: 'Disponible' },
    ],
  },
  {
    title: 'Convertir ventas',
    icon: 'fa-solid fa-bolt',
    services: [
      { href: '/dashboard/services/whatsapp',      icon: 'fa-brands fa-whatsapp', label: 'Agentes de AI', desc: 'Bots que atienden y venden 24/7.', from: '#00FF88', to: '#00C2FF', badge: 'Automatización activa' },
      { href: '/dashboard/services/virtual-store', icon: 'fa-solid fa-shop',      label: 'Tienda Virtual', desc: 'Tu tienda online sin comisiones.', from: '#38bdf8', to: '#0066FF', badge: 'Disponible' },
    ],
  },
  {
    title: 'Escalar',
    icon: 'fa-solid fa-rocket',
    services: [
      { href: '/dashboard/crm',               icon: 'fa-solid fa-users-gear',     label: 'CRM Broadcast', desc: 'Mensajes masivos a tus contactos.',    from: '#D203DD', to: '#9B00FF', badge: 'Disponible' },
      { href: '/dashboard/services/clipping', icon: 'fa-solid fa-newspaper',      label: 'Clipping',      desc: 'Gana por vistas en TikTok y YouTube.', from: '#FF2D55', to: '#FF6B00', badge: 'Disponible' },
      { href: '/dashboard/academy',           icon: 'fa-solid fa-graduation-cap', label: 'Academy',       desc: 'Cursos y formación para crecer.',      from: '#00C2FF', to: '#9B00FF', badge: 'Disponible' },
    ],
  },
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
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 18px', lineHeight: 1.5 }}>
            Elige una herramienta para activar tu sistema de automatización.
          </p>
          {SERVICE_GROUPS.map(group => (
            <div key={group.title} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <i className={group.icon} style={{ fontSize: 10, color: 'rgba(232,85,240,0.85)' }} />
                <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.72)' }}>{group.title}</span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.18), transparent)' }} />
              </div>
              <div className="grid-2">
                {group.services.map(s => (
                  <Link key={s.href} href={s.href} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{
                      borderRadius: 20, padding: 1.5,
                      background: `linear-gradient(135deg, ${s.from}, ${s.to})`,
                      boxShadow: `0 8px 22px rgba(0,0,0,0.35), 0 0 16px ${s.from}26`,
                    }}>
                      <div style={{
                        position: 'relative', borderRadius: 18.5, overflow: 'hidden', padding: '14px 13px 12px',
                        background: 'linear-gradient(160deg, rgba(28,25,44,0.93), rgba(18,14,34,0.97))',
                        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                        display: 'flex', flexDirection: 'column', gap: 7, minHeight: 142,
                      }}>
                        <div style={{ position: 'absolute', top: -28, right: -22, width: 86, height: 86, borderRadius: '50%', background: `radial-gradient(circle, ${s.from}30, transparent 70%)`, pointerEvents: 'none' }} />
                        <div style={{
                          width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: `linear-gradient(135deg, ${s.from}, ${s.to})`,
                          boxShadow: `0 4px 14px ${s.from}55`, fontSize: 15, color: '#fff',
                        }}>
                          <i className={s.icon} />
                        </div>
                        <span style={{
                          alignSelf: 'flex-start', fontSize: 8, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                          color: '#fff', padding: '3px 7px', borderRadius: 99,
                          background: `${s.from}2e`, border: `1px solid ${s.from}55`,
                        }}>{s.badge}</span>
                        <p style={{ fontSize: 12.5, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>{s.label}</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.45, flex: 1 }}>{s.desc}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', opacity: 0.85 }}>Abrir →</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
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
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 26px', lineHeight: 1.5 }}>
              Elige una herramienta para activar tu sistema de automatización.
            </p>
            {SERVICE_GROUPS.map(group => (
              <div key={group.title} style={{ marginBottom: 30 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <i className={group.icon} style={{ fontSize: 12, color: 'rgba(232,85,240,0.9)' }} />
                  <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>{group.title}</span>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.18), transparent)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
                  {group.services.map(s => (
                    <Link key={s.href} href={s.href} style={{ textDecoration: 'none', display: 'block' }}>
                      <div style={{
                        borderRadius: 22, padding: 1.5,
                        background: `linear-gradient(135deg, ${s.from}, ${s.to})`,
                        boxShadow: `0 10px 30px rgba(0,0,0,0.32), 0 0 22px ${s.from}22`,
                        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.transform = 'translateY(-6px)'
                        el.style.boxShadow = `0 22px 48px rgba(0,0,0,0.45), 0 0 40px ${s.from}66`
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.transform = 'translateY(0)'
                        el.style.boxShadow = `0 10px 30px rgba(0,0,0,0.32), 0 0 22px ${s.from}22`
                      }}>
                        <div style={{
                          position: 'relative', borderRadius: 20.5, overflow: 'hidden', padding: '20px 18px 16px',
                          background: 'linear-gradient(160deg, rgba(28,25,44,0.92), rgba(18,14,34,0.97))',
                          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
                          display: 'flex', flexDirection: 'column', gap: 10, minHeight: 184,
                        }}>
                          <div style={{ position: 'absolute', top: -36, right: -28, width: 130, height: 130, borderRadius: '50%', background: `radial-gradient(circle, ${s.from}2b, transparent 70%)`, pointerEvents: 'none' }} />
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div style={{
                              width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: `linear-gradient(135deg, ${s.from}, ${s.to})`,
                              boxShadow: `0 6px 18px ${s.from}55`, fontSize: 19, color: '#fff',
                            }}>
                              <i className={s.icon} />
                            </div>
                            <span style={{
                              fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                              color: '#fff', padding: '4px 9px', borderRadius: 99,
                              background: `${s.from}2e`, border: `1px solid ${s.from}55`, whiteSpace: 'nowrap',
                            }}>{s.badge}</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: '0 0 5px', letterSpacing: '0.01em' }}>{s.label}</p>
                            <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.55 }}>{s.desc}</p>
                          </div>
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '9px 0', borderRadius: 13, marginTop: 2,
                            background: `linear-gradient(135deg, ${s.from}26, ${s.to}26)`,
                            border: `1px solid ${s.from}45`,
                            fontSize: 11.5, fontWeight: 800, color: '#fff',
                          }}>
                            Abrir <i className="fa-solid fa-arrow-right" style={{ fontSize: 9 }} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>

        </main>
      </div>
    </>
  )
}
