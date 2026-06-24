'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Settings, User, Camera, Pencil, Check, X, Loader2, Trash2, UserCircle,
  Mail, AtSign, Gem, Plus, History, BarChart3, Activity, Calendar, Info,
} from 'lucide-react'

interface ProfileData {
  fullName: string
  username: string
  email: string
  avatarUrl: string | null
}

interface CreditsInfo {
  aiBalanceUsd: number
  spent30dUsd: number
  lastRecharge: { amountUsd: number; date: string } | null
}

const CARD_BG = 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)'

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [credits, setCredits] = useState<CreditsInfo | null>(null)

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

    // Datos reales de créditos: saldo, uso 30 días y última recarga
    Promise.all([
      fetch('/api/credits').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/credits/purchase').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([c, p]) => {
      if (!c) return
      const list: any[] = Array.isArray(p) ? p : (Array.isArray(p?.purchases) ? p.purchases : [])
      const lastApproved = list.find(x => x?.status === 'APPROVED') ?? null
      setCredits({
        aiBalanceUsd: Number(c.aiBalanceUsd ?? 0),
        spent30dUsd: Number(c.spent30dUsd ?? 0),
        lastRecharge: lastApproved
          ? { amountUsd: Number(lastApproved.amountUsd ?? 0), date: lastApproved.reviewedAt || lastApproved.createdAt }
          : null,
      })
    }).catch(() => {})
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

  const fmtDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch { return '—' }
  }

  return (
    <div className="px-4 sm:px-6 pt-6 max-w-4xl mx-auto pb-20 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.15)' }}>
          <Settings className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '8s' }} />
        </div>
        <div>
          <h1 className="text-xl font-medium text-white uppercase tracking-widest">Configuración</h1>
          <p className="text-xs font-light tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Personaliza tu experiencia en MY DIAMOND
          </p>
        </div>
      </div>

      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.15), transparent)' }} />

      {/* ── MI INFORMACIÓN ────────────────────────────────────────────── */}
      <div className="relative rounded-2xl p-5 sm:p-7 overflow-hidden"
        style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.15)' }}>
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #D203DD60, #FF2DF740, transparent)' }} />

        {/* Cabecera de la tarjeta */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(210,3,221,0.14)', border: '1px solid rgba(210,3,221,0.3)' }}>
              <User className="w-3.5 h-3.5" style={{ color: '#D203DD' }} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Mi Información
            </h3>
          </div>
          {profile && !editingName && (
            <button onClick={startEditName}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.97] hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #9B00FF, #D203DD)', boxShadow: '0 4px 16px rgba(155,0,255,0.3)' }}>
              <User className="w-3.5 h-3.5" /> Editar perfil
            </button>
          )}
        </div>

        {loadingProfile ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} />
          </div>
        ) : !profile ? (
          <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.4)' }}>No se pudieron cargar los datos</p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-center">

              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden flex items-center justify-center"
                  style={{ background: '#0A0030', border: '3px solid rgba(210,3,221,0.5)', boxShadow: '0 0 30px rgba(210,3,221,0.35), inset 0 0 20px rgba(0,0,0,0.5)' }}>
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-20 h-20" style={{ color: 'rgba(255,255,255,0.12)' }} />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-50 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #9B00FF, #D203DD)', border: '3px solid #0A0030', boxShadow: '0 0 14px rgba(210,3,221,0.5)' }}
                  title="Cambiar foto de perfil">
                  {uploadingAvatar
                    ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                    : <Camera className="w-4 h-4 text-white" />}
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
                <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Nombre completo
                </p>

                {editingName ? (
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName() }}
                      autoFocus
                      disabled={savingName}
                      maxLength={80}
                      className="w-full text-2xl font-bold text-white px-3 py-2 rounded-lg outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(210,3,221,0.5)', boxShadow: '0 0 12px rgba(210,3,221,0.18)' }}
                    />
                    <div className="flex gap-2 justify-center sm:justify-start">
                      <button onClick={saveName} disabled={savingName}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                        style={{ background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.35)', color: '#00FF88' }}>
                        {savingName ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Guardar
                      </button>
                      <button onClick={cancelEditName} disabled={savingName}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
                        <X size={12} /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                    <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{profile.fullName}</p>
                    <button onClick={startEditName}
                      className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}
                      title="Editar nombre">
                      <Pencil className="w-3.5 h-3.5" style={{ color: '#D203DD' }} />
                    </button>
                  </div>
                )}

                {/* Usuario + email con íconos */}
                {!editingName && (
                  <div className="flex items-center justify-center sm:justify-start gap-x-5 gap-y-1.5 flex-wrap mt-3">
                    <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      <AtSign className="w-3.5 h-3.5" style={{ color: '#D203DD' }} />
                      {profile.username}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      <Mail className="w-3.5 h-3.5" style={{ color: '#D203DD' }} />
                      {profile.email}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Divisor + acciones de foto */}
            {!editingName && (
              <>
                <div className="h-px w-full my-5" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-50 hover:bg-white/[0.04]"
                    style={{ background: 'rgba(210,3,221,0.10)', border: '1px solid rgba(210,3,221,0.35)', color: '#E879F9' }}>
                    <Camera className="w-3.5 h-3.5" /> Cambiar foto
                  </button>
                  {profile.avatarUrl && (
                    <button onClick={removeAvatar} disabled={uploadingAvatar}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-50 hover:bg-white/[0.04]"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                      <Trash2 className="w-3.5 h-3.5" /> Quitar foto
                    </button>
                  )}
                </div>
              </>
            )}
          </>
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
      <div className="relative rounded-2xl p-5 sm:p-7 overflow-hidden"
        style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.15)' }}>
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #D203DD60, #FF2DF740, transparent)' }} />

        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(210,3,221,0.12)', border: '1px solid rgba(210,3,221,0.3)' }}>
            <Gem className="w-5 h-5" style={{ color: '#D203DD' }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Créditos IA</p>
            <p className="text-[11px] font-light" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Consulta tu saldo, recarga y mira tu historial de uso
            </p>
          </div>
        </div>

        {/* Saldo + acciones */}
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(210,3,221,0.2), rgba(155,0,255,0.15))', border: '1px solid rgba(210,3,221,0.35)' }}>
                <Gem className="w-7 h-7" style={{ color: '#E879F9' }} />
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-white leading-none">
                  {credits ? `$${credits.aiBalanceUsd.toFixed(2)}` : <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] mt-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Saldo disponible
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link href="/dashboard/wallet"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.97] hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #9B00FF, #D203DD)', boxShadow: '0 4px 16px rgba(155,0,255,0.3)', textDecoration: 'none' }}>
                <Plus className="w-4 h-4" /> Recargar
              </Link>
              <Link href="/dashboard/wallet"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] hover:bg-white/[0.04]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>
                <History className="w-3.5 h-3.5" /> Ver historial
              </Link>
              <Link href="/dashboard/wallet"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] hover:bg-white/[0.04]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>
                <BarChart3 className="w-3.5 h-3.5" /> Movimientos
              </Link>
            </div>
          </div>
        </div>

        {/* Fila inferior: última recarga · uso 30 días · info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Calendar className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Última recarga</p>
              <p className="text-xs font-bold text-white truncate">
                {credits?.lastRecharge
                  ? <>{fmtDate(credits.lastRecharge.date)} <span style={{ color: '#00FF88' }}>+${credits.lastRecharge.amountUsd.toFixed(0)}</span></>
                  : 'Sin recargas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Activity className="w-4 h-4 shrink-0" style={{ color: '#D203DD' }} />
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Uso últimos 30 días</p>
              <p className="text-xs font-bold text-white">
                {credits ? `$${credits.spent30dUsd.toFixed(2)}` : '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Info className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Los créditos IA se usan para generar respuestas, contenido y análisis.
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] font-light" style={{ color: 'rgba(255,255,255,0.12)' }}>
        MY DIAMOND © 2026 &bull; Build 20260217
      </p>
    </div>
  )
}
