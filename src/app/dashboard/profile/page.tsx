'use client'

import { useState, useEffect } from 'react'
import { User, Mail, MapPin, Calendar, FileText, UserCircle, Pencil, Check, X, Loader2 } from 'lucide-react'

interface UserProfile {
  fullName: string
  username: string
  email: string
  country: string
  city: string
  identityDocument: string
  dateOfBirth: string
  isActive: boolean
  createdAt: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/network')
      .then(r => r.json())
      .then(d => {
        if (d.user) setUser(d.user)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function startEdit() {
    if (!user) return
    setNameInput(user.fullName)
    setEditing(true)
    setMsg(null)
  }

  function cancelEdit() {
    setEditing(false)
    setMsg(null)
  }

  async function saveName() {
    if (!user) return
    const trimmed = nameInput.trim()
    if (trimmed.length < 3) {
      setMsg({ type: 'err', text: 'El nombre debe tener al menos 3 caracteres' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: trimmed }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ type: 'err', text: d.error || 'Error al guardar' })
      } else {
        setUser({ ...user, fullName: trimmed })
        setEditing(false)
        setMsg({ type: 'ok', text: 'Nombre actualizado ✓' })
        setTimeout(() => setMsg(null), 2500)
      }
    } catch {
      setMsg({ type: 'err', text: 'Error de red. Probá de nuevo.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#D203DD' }} />
      </div>
    )
  }

  if (!user) return null

  const fields = [
    { icon: User,     label: 'Usuario',            value: `@${user.username}`,         color: '#D203DD' },
    { icon: Mail,     label: 'Correo Electrónico',  value: user.email,                  color: '#FF2DF7' },
    { icon: MapPin,   label: 'Ubicación',           value: user.city && user.country ? `${user.city}, ${user.country}` : 'No especificada', color: '#FFB800' },
    { icon: Calendar, label: 'Miembro desde',       value: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-', color: '#00FF88' },
  ]

  return (
    <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto pb-20 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(210,3,221,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <User className="w-5 h-5" style={{ color: '#D203DD' }} />
        </div>
        <div>
          <h1 className="text-xl font-medium text-white tracking-widest uppercase">Mi Perfil</h1>
          <p className="text-xs font-light tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Gestiona tu información personal</p>
        </div>
      </div>

      {/* Línea decorativa */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.15), transparent)' }} />

      <div className="grid md:grid-cols-3 gap-6">

        {/* Card de perfil */}
        <div className="md:col-span-1 relative rounded-2xl p-6 flex flex-col items-center text-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 0 40px rgba(210,3,221,0.05)'
          }}>
          {/* Barra neon superior */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #D203DD60, #FF2DF740, transparent)' }} />
          {/* Orbe decorativo */}
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl opacity-20"
            style={{ background: 'radial-gradient(circle, #9B00FF, transparent)' }} />

          {/* Avatar */}
          <div className="relative mb-4 mt-2">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: '#0A0030', border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 0 20px rgba(210,3,221,0.1)' }}>
              <UserCircle className="w-14 h-14" style={{ color: 'rgba(255,255,255,0.1)' }} />
            </div>
            <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-[#0A0030]"
              style={{ background: user.isActive ? '#00FF88' : '#ef4444', boxShadow: user.isActive ? '0 0 8px #00FF88' : 'none' }} />
          </div>

          {/* Nombre editable */}
          {editing ? (
            <div className="w-full mb-1 space-y-2">
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEdit() }}
                autoFocus
                disabled={saving}
                maxLength={80}
                className="w-full text-center text-base font-medium text-white uppercase tracking-widest px-3 py-2 rounded-lg outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(210,3,221,0.5)',
                  boxShadow: '0 0 12px rgba(210,3,221,0.18)',
                }}
              />
              <div className="flex gap-2 justify-center">
                <button onClick={saveName} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                  style={{ background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.35)', color: '#00FF88' }}>
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Guardar
                </button>
                <button onClick={cancelEdit} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
                  <X size={12} />
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative flex items-center justify-center gap-2 mb-1">
              <h2 className="text-base font-medium text-white uppercase tracking-widest">{user.fullName}</h2>
              <button onClick={startEdit}
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all opacity-50 group-hover:opacity-100"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}
                title="Editar nombre">
                <Pencil className="w-3 h-3" style={{ color: '#D203DD' }} />
              </button>
            </div>
          )}

          <p className="text-xs font-light tracking-[0.3em] uppercase mb-3" style={{ color: '#D203DD' }}>@{user.username}</p>

          {msg && (
            <div className="w-full mb-3 py-2 px-3 rounded-lg text-[11px] font-medium"
              style={{
                background: msg.type === 'ok' ? 'rgba(0,255,136,0.10)' : 'rgba(239,68,68,0.10)',
                border: `1px solid ${msg.type === 'ok' ? 'rgba(0,255,136,0.30)' : 'rgba(239,68,68,0.30)'}`,
                color: msg.type === 'ok' ? '#00FF88' : '#fca5a5',
              }}>
              {msg.text}
            </div>
          )}

          <div className="w-full py-2.5 px-4 rounded-xl"
            style={{ background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Estado de Cuenta</p>
            <p className="text-sm font-black uppercase tracking-widest"
              style={{ color: user.isActive ? '#00FF88' : '#ef4444' }}>
              {user.isActive ? 'Activo' : 'Inactivo'}
            </p>
          </div>
        </div>

        {/* Detalles */}
        <div className="md:col-span-2 relative rounded-2xl p-6 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #FF2DF740, #D203DD30, transparent)' }} />

          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-4 h-4" style={{ color: '#FF2DF7' }} />
            <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Detalles de la Cuenta
            </h3>
          </div>

          <div className="grid gap-3">
            {fields.map((field, i) => (
              <div key={i} className="flex items-center gap-4 p-3.5 rounded-xl transition-all duration-300 group"
                style={{ background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${field.color}40`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${field.color}12`, border: `1px solid ${field.color}25` }}>
                  <field.icon className="w-4 h-4" style={{ color: field.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{field.label}</p>
                  <p className="text-sm font-light text-white truncate">{field.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
