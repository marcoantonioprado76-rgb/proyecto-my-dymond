'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Settings, ChevronRight, Wallet,
  User, Camera, Pencil, Check, X, Loader2, Trash2, UserCircle,
} from 'lucide-react'

interface ProfileData {
  fullName: string
  username: string
  email: string
  avatarUrl: string | null
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Edit nombre
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Upload avatar
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Feedback global
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function flashMsg(type: 'ok' | 'err', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 2800)
  }

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setProfile(d.user) })
      .catch(() => {})
      .finally(() => setLoadingProfile(false))
  }, [])

  function startEditName() {
    if (!profile) return
    setNameInput(profile.fullName)
    setEditingName(true)
    setMsg(null)
  }
  function cancelEditName() {
    setEditingName(false)
    setMsg(null)
  }
  async function saveName() {
    if (!profile) return
    const trimmed = nameInput.trim()
    if (trimmed.length < 3) {
      flashMsg('err', 'El nombre debe tener al menos 3 caracteres')
      return
    }
    setSavingName(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: trimmed }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        flashMsg('err', d.error || 'Error al guardar')
      } else {
        setProfile(p => p ? { ...p, fullName: trimmed } : p)
        setEditingName(false)
        flashMsg('ok', 'Nombre actualizado ✓')
      }
    } catch {
      flashMsg('err', 'Error de red')
    } finally {
      setSavingName(false)
    }
  }

  async function uploadAvatar(file: File) {
    if (!file) return
    // Validación cliente: solo imagen, <5 MB
    if (!file.type.startsWith('image/')) {
      flashMsg('err', 'Subí una imagen (JPG, PNG, WEBP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      flashMsg('err', 'La imagen no puede pesar más de 5 MB')
      return
    }
    setUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const up = await fetch('/api/upload', { method: 'POST', body: fd })
      const upData = await up.json().catch(() => ({}))
      if (!up.ok || !upData.url) {
        flashMsg('err', upData.error || 'Error al subir la imagen')
        return
      }
      // Guardar URL en el perfil
      const save = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: upData.url }),
      })
      const saveData = await save.json().catch(() => ({}))
      if (!save.ok) {
        flashMsg('err', saveData.error || 'No se pudo guardar el avatar')
        return
      }
      setProfile(p => p ? { ...p, avatarUrl: upData.url } : p)
      flashMsg('ok', 'Foto de perfil actualizada ✓')
    } catch {
      flashMsg('err', 'Error de red')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function removeAvatar() {
    if (!profile?.avatarUrl) return
    if (!confirm('¿Quitar tu foto de perfil?')) return
    setUploadingAvatar(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: null }),
      })
      if (res.ok) {
        setProfile(p => p ? { ...p, avatarUrl: null } : p)
        flashMsg('ok', 'Foto removida')
      } else {
        flashMsg('err', 'Error al quitar la foto')
      }
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 pt-6 max-w-4xl mx-auto pb-20 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)', border: '1px solid rgba(255,255,255,0.15)' }}>
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
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.15), transparent)' }} />

      {/* ── MI INFORMACIÓN ────────────────────────────────────────────── */}
      <div className="relative rounded-2xl p-5 sm:p-6 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #D203DD60, #FF2DF740, transparent)' }} />

        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4" style={{ color: '#D203DD' }} />
          <h3 className="text-[9px] font-black uppercase tracking-[0.4em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Mi Información
          </h3>
        </div>

        {loadingProfile ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} />
          </div>
        ) : !profile ? (
          <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.4)' }}>No se pudieron cargar los datos</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
                style={{ background: '#0A0030', border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 0 20px rgba(210,3,221,0.15)' }}>
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.12)' }} />
                )}
              </div>

              {/* Botón cámara overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-50 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #D203DD, #FF2DF7)',
                  border: '2px solid #0A0030',
                  boxShadow: '0 0 12px rgba(210,3,221,0.45)',
                }}
                title="Cambiar foto de perfil">
                {uploadingAvatar
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <Camera className="w-4 h-4 text-white" />
                }
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }}
                disabled={uploadingAvatar}
              />
            </div>

            {/* Datos */}
            <div className="flex-1 min-w-0 w-full text-center sm:text-left">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Nombre completo
              </p>

              {editingName ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName() }}
                    autoFocus
                    disabled={savingName}
                    maxLength={80}
                    className="w-full text-base font-medium text-white px-3 py-2 rounded-lg outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(210,3,221,0.5)',
                      boxShadow: '0 0 12px rgba(210,3,221,0.18)',
                    }}
                  />
                  <div className="flex gap-2 justify-center sm:justify-start">
                    <button onClick={saveName} disabled={savingName}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                      style={{ background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.35)', color: '#00FF88' }}>
                      {savingName ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Guardar
                    </button>
                    <button onClick={cancelEditName} disabled={savingName}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
                      <X size={12} />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <p className="text-lg font-medium text-white">{profile.fullName}</p>
                  <button onClick={startEditName}
                    className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:bg-white/10"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}
                    title="Editar nombre">
                    <Pencil className="w-3 h-3" style={{ color: '#D203DD' }} />
                  </button>
                </div>
              )}

              <p className="text-xs font-light tracking-widest mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                @{profile.username} · {profile.email}
              </p>

              {profile.avatarUrl && !editingName && (
                <button onClick={removeAvatar} disabled={uploadingAvatar}
                  className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-all hover:underline disabled:opacity-50"
                  style={{ color: 'rgba(239,68,68,0.7)' }}>
                  <Trash2 size={10} /> Quitar foto
                </button>
              )}
            </div>
          </div>
        )}

        {msg && (
          <div className="mt-4 py-2 px-3 rounded-lg text-[11px] font-medium text-center"
            style={{
              background: msg.type === 'ok' ? 'rgba(0,255,136,0.10)' : 'rgba(239,68,68,0.10)',
              border: `1px solid ${msg.type === 'ok' ? 'rgba(0,255,136,0.30)' : 'rgba(239,68,68,0.30)'}`,
              color: msg.type === 'ok' ? '#00FF88' : '#fca5a5',
            }}>
            {msg.text}
          </div>
        )}
      </div>

      {/* ── CRÉDITOS IA ─────────────────────────────────────────────── */}
      <Link href="/dashboard/wallet" className="block relative rounded-2xl p-4 sm:p-5 overflow-hidden transition-all duration-300 group"
        style={{ background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)', border: '1px solid rgba(255,255,255,0.15)', textDecoration: 'none' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(210,3,221,0.4)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}>
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #D203DD60, #FF2DF740, transparent)' }} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(210,3,221,0.12)', border: '1px solid rgba(210,3,221,0.3)' }}>
              <Wallet className="w-5 h-5" style={{ color: '#D203DD' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Créditos IA</p>
              <p className="text-[11px] font-light" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Consulta tu saldo, recarga y mira tu historial de uso
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 transition-all duration-300 group-hover:translate-x-1 shrink-0"
            style={{ color: 'rgba(255,255,255,0.3)' }} />
        </div>
      </Link>

      <p className="text-center text-[10px] font-light" style={{ color: 'rgba(255,255,255,0.12)' }}>
        MY DIAMOND © 2026 &bull; Build 20260217
      </p>
    </div>
  )
}
