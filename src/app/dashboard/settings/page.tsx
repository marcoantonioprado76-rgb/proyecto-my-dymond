'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, Shield, Bell, Moon, Globe, ChevronRight } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const sections = [
    {
      title: 'Cuenta & Seguridad',
      items: [
        { icon: Shield, label: 'Seguridad',    sub: 'Contraseña y 2FA',       color: '#D203DD' },
        { icon: Globe,  label: 'Idioma',       sub: 'Español (ES)',            color: '#9B00FF' },
      ]
    },
    {
      title: 'Preferencias',
      items: [
        { icon: Bell, label: 'Notificaciones', sub: 'Alertas y correos',       color: '#00FF88' },
        { icon: Moon, label: 'Apariencia',     sub: 'Tema Oscuro (Activo)',    color: '#FFB800' },
      ]
    }
  ]

  return (
    <div className="px-4 sm:px-6 pt-6 max-w-4xl mx-auto pb-20 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(13,30,121,0.5)', border: '1px solid rgba(210,3,221,0.2)' }}>
          <Settings className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '8s' }} />
        </div>
        <div>
          <h1 className="text-xl font-medium text-white uppercase tracking-widest">Configuración</h1>
          <p className="text-xs font-light tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Personaliza tu experiencia en MY DIAMOND
          </p>
        </div>
      </div>

      {/* Línea decorativa */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(210,3,221,0.2), transparent)' }} />

      {/* Secciones */}
      <div className="relative rounded-2xl p-5 sm:p-6 overflow-hidden space-y-6"
        style={{ background: 'rgba(13,30,121,0.4)', border: '1px solid rgba(210,3,221,0.2)' }}>
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />

        {sections.map((section, idx) => (
          <div key={idx}>
            <h3 className="text-[9px] font-black uppercase tracking-[0.4em] mb-3 ml-1"
              style={{ color: 'rgba(255,255,255,0.2)' }}>
              {section.title}
            </h3>
            <div className="space-y-2">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl transition-all duration-300 cursor-pointer group"
                  style={{ background: 'rgba(13,30,121,0.4)', border: '1px solid rgba(210,3,221,0.12)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${item.color}10`
                    e.currentTarget.style.borderColor = `${item.color}30`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(13,30,121,0.4)'
                    e.currentTarget.style.borderColor = 'rgba(210,3,221,0.12)'
                  }}>
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: `${item.color}10`, border: `1px solid ${item.color}20` }}>
                      <item.icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-[10px] font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>{item.sub}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 transition-all duration-300 group-hover:translate-x-1"
                    style={{ color: 'rgba(255,255,255,0.2)' }} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Separador */}
        <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 group"
          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.05)'
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)'
          }}>
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
              style={{ background: 'rgba(239,68,68,0.1)' }}>
              <LogOut className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-red-400">
                {loggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
              </p>
              <p className="text-[10px] font-light" style={{ color: 'rgba(239,68,68,0.5)' }}>
                Finalizar tu sesión actual de forma segura
              </p>
            </div>
          </div>
        </button>
      </div>

      <p className="text-center text-[10px] font-light" style={{ color: 'rgba(255,255,255,0.12)' }}>
        MY DIAMOND © 2026 &bull; Build 20260217
      </p>
    </div>
  )
}
