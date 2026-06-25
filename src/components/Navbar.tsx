'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NotificationBell from './NotificationBell'

const serviceItems = [
  { href: '/dashboard/services/ads/meta',      iconClass: 'fa-brands fa-meta',        label: 'Meta Ads',      grad: 'linear-gradient(145deg, #4f8dff, #1d4ed8)' },
  // { href: '/dashboard/services/ads/tiktok',    iconClass: 'fa-brands fa-tiktok',      label: 'TikTok Ads' }, // oculto temporalmente
  // { href: '/dashboard/services/ads/google',    iconClass: 'fa-brands fa-google',      label: 'Google Ads' }, // oculto temporalmente
  { href: '/dashboard/services/whatsapp',      iconClass: 'fa-solid fa-robot',        label: 'Agentes de AI', grad: 'linear-gradient(145deg, #22d3ee, #0891b2)' },
  { href: '/dashboard/services/social',        iconClass: 'fa-solid fa-share-nodes',  label: 'Social',        grad: 'linear-gradient(145deg, #c084fc, #9333ea)' },
  { href: '/dashboard/services/landing-pages', iconClass: 'fa-solid fa-file-lines',   label: 'Landing',       grad: 'linear-gradient(145deg, #fbbf24, #d97706)' },
  { href: '/dashboard/services/virtual-store', iconClass: 'fa-solid fa-shop',         label: 'Tienda',        grad: 'linear-gradient(145deg, #a3e635, #4d7c0f)' },
  // { href: '/dashboard/services/clipping',      iconClass: 'fa-solid fa-newspaper',    label: 'Clipping' }, // oculto temporalmente
  { href: '/dashboard/crm',                    iconClass: 'fa-solid fa-users-gear',   label: 'CRM Broadcast', grad: 'linear-gradient(145deg, #fb923c, #ea580c)' },
]

const mainItemsBottom = [
  { href: '/dashboard/recursos', iconClass: 'fa-solid fa-wand-magic-sparkles', label: 'Recursos' },
  { href: '/dashboard/store',  iconClass: 'fa-solid fa-bag-shopping', label: 'Shop' },
]

const mobileNavItems = [
  { href: '/dashboard',         iconClass: 'fa-solid fa-house',        label: 'Inicio' },
  { href: '/dashboard/services',iconClass: 'fa-solid fa-th-large',     label: 'Servicios' },
  { href: '/dashboard/academy', iconClass: 'fa-solid fa-graduation-cap', label: 'Academy' },
  { href: '/dashboard/recursos',iconClass: 'fa-solid fa-wand-magic-sparkles', label: 'Recursos' },
  { href: '/dashboard/store',   iconClass: 'fa-solid fa-bag-shopping', label: 'Shop' },
  { href: '/dashboard/settings',iconClass: 'fa-solid fa-gear',         label: 'Ajustes' },
]

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.href = '/login'
}

export default function Navbar() {
  const pathname = usePathname()
  const isInServices = pathname.startsWith('/dashboard/services') || pathname.startsWith('/dashboard/crm')
  const isInAcademy  = pathname.startsWith('/dashboard/courses') || pathname.startsWith('/dashboard/podcasts') || pathname === '/dashboard/academy'

  const [servicesOpen, setServicesOpen] = useState(isInServices)

  return (
    <>
      {/* ── SIDEBAR DESKTOP ── */}
      <aside className="sidebar hidden lg:flex" aria-label="Barra lateral">
        <Link href="/dashboard" className="sidebar__logo">
          <div className="sidebar__logo-ring">
            <img src="/logo.png" alt="MY DIAMOND" />
          </div>
          <div className="sidebar__logo-info">
            <img src="/wordmark-mydiamond.png" alt="MY DIAMOND" className="sidebar__logo-wordmark" />
          </div>
        </Link>

        <nav className="sidebar__nav" aria-label="Menú">

          {/* Inicio */}
          <Link href="/dashboard" className={`nav-item ${pathname === '/dashboard' ? 'nav-item--active' : ''}`}>
            <span className="nav-item__icon"><i className="fa-solid fa-house"></i></span>
            <span className="nav-item__label">Inicio</span>
            <span className="nav-item__dot"></span>
          </Link>

          {/* Servicios colapsable */}
          <button
            onClick={() => setServicesOpen(o => !o)}
            className={`nav-item ${isInServices ? 'nav-item--active' : ''}`}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span className="nav-item__icon"><i className="fa-solid fa-th-large"></i></span>
            <span className="nav-item__label">Servicios</span>
            <i className="fa-solid fa-chevron-down" style={{
              fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto',
              transition: 'transform 0.2s ease',
              transform: servicesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}></i>
          </button>
          {servicesOpen && (
            <div style={{ paddingLeft: 10 }}>
              {serviceItems.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'nav-item--active' : ''}`} style={{ fontSize: '0.78rem', padding: '8px 10px' }}>
                    <span className="nav-item__icon" style={{
                      width: 30, height: 30, fontSize: '0.78rem', color: '#fff',
                      background: item.grad,
                      boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.22), 0 3px 8px rgba(0,0,0,0.4)',
                    }}><i className={item.iconClass}></i></span>
                    <span className="nav-item__label">{item.label}</span>
                    <span className="nav-item__dot"></span>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Academy — enlace directo a la página con los botones-imagen */}
          <Link href="/dashboard/academy" className={`nav-item ${isInAcademy ? 'nav-item--active' : ''}`}>
            <span className="nav-item__icon"><i className="fa-solid fa-graduation-cap"></i></span>
            <span className="nav-item__label">Academy</span>
            <span className="nav-item__dot"></span>
          </Link>

          {/* Shop / Wallet */}
          {mainItemsBottom.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'nav-item--active' : ''}`}>
                <span className="nav-item__icon"><i className={item.iconClass}></i></span>
                <span className="nav-item__label">{item.label}</span>
                <span className="nav-item__dot"></span>
              </Link>
            )
          })}

          <div className="sidebar__nav-sep"></div>
          <Link href="/dashboard/settings" className={`nav-item ${pathname === '/dashboard/settings' ? 'nav-item--active' : ''}`}>
            <span className="nav-item__icon"><i className="fa-solid fa-gear"></i></span>
            <span className="nav-item__label">Configuración</span>
            <span className="nav-item__dot"></span>
          </Link>
          <button onClick={logout} className="nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,100,100,0.8)' }}>
            <span className="nav-item__icon"><i className="fa-solid fa-right-from-bracket"></i></span>
            <span className="nav-item__label">Salir</span>
          </button>
        </nav>

        <div className="sidebar__user">
          <div className="sidebar__user-av" id="dAvatar"><i className="fa-solid fa-user"></i></div>
          <div className="sidebar__user-info">
            <p className="sidebar__user-name">Usuario</p>
            <p className="sidebar__user-role">
              <span className="sidebar__user-handle">@user</span>
              <span className="sidebar__user-dot" aria-hidden></span>
              <span className="sidebar__user-status">Activo</span>
            </p>
          </div>
          <NotificationBell />
        </div>
      </aside>

      {/* ── BARRA MÓVIL ── */}
      <nav className="bottom-nav lg:hidden" aria-label="Navegación principal">
        {mobileNavItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} className={`bnav__item ${isActive ? 'bnav__item--active' : ''}`}>
              <i className={item.iconClass}></i>
              {item.label}
            </Link>
          )
        })}
        <button
          onClick={logout}
          className="bnav__item"
          style={{ color: 'rgba(255,100,100,0.85)', cursor: 'pointer' }}
          aria-label="Cerrar sesión"
        >
          <i className="fa-solid fa-right-from-bracket"></i>
          Salir
        </button>
      </nav>
    </>
  )
}
