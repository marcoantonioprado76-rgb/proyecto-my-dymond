'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Settings, Save, Loader2, Check, AlertCircle, Info, Bot, Clock, Globe, Sparkles,
  QrCode, Smartphone, Power, RefreshCw,
} from 'lucide-react'

// ── Paleta de marca ───────────────────────────────────────────────────────────
const BRAND_GRADIENT = 'linear-gradient(135deg,#FF2D95,#B735B8,#233B8F)'

// ── Sub-navegación del módulo Reto 90D ────────────────────────────────────────
const NAV = [
  { href: '/admin/reto-90d', label: 'Resumen' },
  { href: '/admin/reto-90d/tablero', label: 'Tablero' },
  { href: '/admin/reto-90d/tareas', label: 'Tareas' },
  { href: '/admin/reto-90d/usuarios', label: 'Usuarios' },
  { href: '/admin/reto-90d/evidencias', label: 'Evidencias' },
  { href: '/admin/reto-90d/reportes', label: 'Reportes' },
  { href: '/admin/reto-90d/configuracion', label: 'Configuración' },
]

function SubNav() {
  const pathname = usePathname()
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
      {NAV.map(n => {
        const active = pathname === n.href
        return (
          <Link
            key={n.href}
            href={n.href}
            style={{
              padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, textDecoration: 'none',
              border: active ? 'none' : '1px solid #E4E9F0',
              background: active ? BRAND_GRADIENT : '#fff',
              color: active ? '#fff' : '#6B7280',
            }}
          >
            {n.label}
          </Link>
        )
      })}
    </div>
  )
}

// ── Switch reutilizable ───────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: 46, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer',
        background: on ? BRAND_GRADIENT : '#D9E0EA',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute', top: 3, left: on ? 23 : 3,
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}

// ── Conexión del número del reto (QR dedicado, aparte de los bots) ─────────────
interface ConnStatus { status: string; qrBase64?: string; phone?: string }

function RetoConnection() {
  const [status, setStatus] = useState<ConnStatus>({ status: 'loading' })
  const [connecting, setConnecting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchStatus(): Promise<string | undefined> {
    try {
      const r = await fetch('/api/admin/reto-90d/connection')
      const d = await r.json()
      const s: ConnStatus = d.status ?? { status: 'disconnected' }
      setStatus(s)
      return s.status
    } catch {
      return undefined
    }
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }
  function startPolling() {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const s = await fetchStatus()
      if (s === 'connected' || s === 'disconnected') { stopPolling(); setConnecting(false) }
    }, 2500)
  }

  useEffect(() => {
    fetchStatus().then((s) => { if (s === 'connecting' || s === 'qr_ready') startPolling() })
    return () => stopPolling()
  }, [])

  async function connect() {
    setConnecting(true); setErr(null)
    try {
      const r = await fetch('/api/admin/reto-90d/connection', { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`)
      setStatus({ status: 'connecting' })
      startPolling()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo conectar el número del reto.')
      setConnecting(false)
    }
  }

  async function disconnect() {
    setErr(null)
    try { await fetch('/api/admin/reto-90d/connection', { method: 'DELETE' }) } catch {}
    stopPolling(); setConnecting(false)
    await fetchStatus()
  }

  const st = status.status
  const connected = st === 'connected'
  const box: React.CSSProperties = { border: '1px solid #E4E9F0', borderRadius: 14, padding: 16, background: '#F9FAFC' }
  const primaryBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10,
    fontSize: 13, fontWeight: 800, color: '#fff', border: 'none', background: BRAND_GRADIENT,
    cursor: connecting ? 'wait' : 'pointer', opacity: connecting ? 0.75 : 1,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.25)' }}>
        <AlertCircle size={15} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
          Este número es <strong style={{ color: '#111827' }}>exclusivo del reto</strong>. Usa un número de WhatsApp
          <strong style={{ color: '#111827' }}> DIFERENTE</strong> al de tus bots de venta — se conecta aquí, aparte, y no se mezcla con ningún bot.
        </p>
      </div>

      <div style={box}>
        {st === 'loading' ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
            <Loader2 size={18} className="animate-spin" style={{ color: '#B735B8' }} />
          </div>
        ) : connected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(22,163,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={17} style={{ color: '#16A34A' }} />
              </div>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 800, color: '#16A34A', margin: 0 }}>Número conectado ✅</p>
                <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{status.phone ? `+${status.phone}` : 'Número del reto activo'}</p>
              </div>
            </div>
            <button onClick={disconnect} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, background: '#fff', border: '1px solid #E4E9F0', color: '#DC2626', cursor: 'pointer' }}>
              <Power size={13} /> Desconectar
            </button>
          </div>
        ) : st === 'qr_ready' && status.qrBase64 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <p style={{ fontSize: 12.5, color: '#6B7280', margin: 0, textAlign: 'center' }}>
              Abre <strong style={{ color: '#111827' }}>WhatsApp → Dispositivos vinculados</strong> en el teléfono del reto y escanea:
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={status.qrBase64} alt="QR del número del reto" style={{ width: 200, height: 200, borderRadius: 12, border: '1px solid #E4E9F0' }} />
            <button onClick={connect} disabled={connecting} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, background: '#fff', border: '1px solid #E4E9F0', color: '#6B7280', cursor: 'pointer' }}>
              <RefreshCw size={13} className={connecting ? 'animate-spin' : ''} /> Regenerar QR
            </button>
          </div>
        ) : st === 'connecting' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '6px 0' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: '#B735B8' }} />
            <p style={{ fontSize: 12.5, color: '#6B7280', margin: 0 }}>Generando QR…</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '4px 0' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(183,53,184,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={19} style={{ color: '#B735B8' }} />
            </div>
            <p style={{ fontSize: 12.5, color: '#6B7280', margin: 0, textAlign: 'center' }}>El número del reto no está conectado.</p>
            <button onClick={connect} disabled={connecting} style={primaryBtn}>
              <QrCode size={15} /> {connecting ? 'Conectando…' : 'Conectar número del reto'}
            </button>
          </div>
        )}
      </div>

      {err && <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{err}</p>}
    </div>
  )
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface BotOption {
  id: string
  name: string
  baileysPhone: string | null
  status: string
  type: string
}

interface RetoConfig {
  botId: string
  adminPhone: string
  groupId: string
  isActive: boolean
  sendGroupReports: boolean
  morningReminderTime: string
  middayReminderTime: string
  afternoonReminderTime: string
  nightReminderTime: string
  finalReportTime: string
  timezone: string
  botInstructions: string
}

const DEFAULTS: RetoConfig = {
  botId: '',
  adminPhone: '',
  groupId: '',
  isActive: true,
  sendGroupReports: false,
  morningReminderTime: '09:00',
  middayReminderTime: '12:30',
  afternoonReminderTime: '17:30',
  nightReminderTime: '21:30',
  finalReportTime: '23:50',
  timezone: 'America/La_Paz',
  botInstructions: '',
}

const labelStyle: React.CSSProperties = { fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6, fontWeight: 600 }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, color: '#111827',
  background: '#F4F6FA', border: '1px solid #E4E9F0', outline: 'none', boxSizing: 'border-box',
}

export default function RetoConfiguracionPage() {
  const [form, setForm] = useState<RetoConfig>(DEFAULTS)
  const [bots, setBots] = useState<BotOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const r = await fetch('/api/admin/reto-90d/settings')
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const d = await r.json()
        if (!alive) return
        const c = d.config ?? {}
        setForm({
          botId: c.botId ?? '',
          adminPhone: c.adminPhone ?? '',
          groupId: c.groupId ?? '',
          isActive: typeof c.isActive === 'boolean' ? c.isActive : DEFAULTS.isActive,
          sendGroupReports: typeof c.sendGroupReports === 'boolean' ? c.sendGroupReports : DEFAULTS.sendGroupReports,
          morningReminderTime: c.morningReminderTime ?? DEFAULTS.morningReminderTime,
          middayReminderTime: c.middayReminderTime ?? DEFAULTS.middayReminderTime,
          afternoonReminderTime: c.afternoonReminderTime ?? DEFAULTS.afternoonReminderTime,
          nightReminderTime: c.nightReminderTime ?? DEFAULTS.nightReminderTime,
          finalReportTime: c.finalReportTime ?? DEFAULTS.finalReportTime,
          timezone: c.timezone ?? DEFAULTS.timezone,
          botInstructions: c.botInstructions ?? '',
        })
        setBots(Array.isArray(d.bots) ? (d.bots as BotOption[]) : [])
      } catch {
        if (alive) setError('No se pudo cargar la configuración.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  function set<K extends keyof RetoConfig>(key: K, value: RetoConfig[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const body = {
        // botId lo gestiona la conexión del reto (no se toca al guardar ajustes)
        adminPhone: form.adminPhone.trim() || null,
        groupId: form.groupId.trim() || null,
        isActive: form.isActive,
        sendGroupReports: form.sendGroupReports,
        morningReminderTime: form.morningReminderTime,
        middayReminderTime: form.middayReminderTime,
        afternoonReminderTime: form.afternoonReminderTime,
        nightReminderTime: form.nightReminderTime,
        finalReportTime: form.finalReportTime,
        timezone: form.timezone.trim() || DEFAULTS.timezone,
        botInstructions: form.botInstructions.trim() || null,
      }
      const r = await fetch('/api/admin/reto-90d/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error ?? `HTTP ${r.status}`)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  const TIMES: { key: keyof RetoConfig; label: string }[] = [
    { key: 'morningReminderTime', label: 'Recordatorio mañana' },
    { key: 'middayReminderTime', label: 'Recordatorio mediodía' },
    { key: 'afternoonReminderTime', label: 'Recordatorio tarde' },
    { key: 'nightReminderTime', label: 'Recordatorio noche' },
    { key: 'finalReportTime', label: 'Reporte final del día' },
  ]

  return (
    <div className="dm-page font-ui">
      <div style={{ maxWidth: 720 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="text-xl font-bold text-[#111827] uppercase tracking-widest flex items-center gap-2">
            <Settings size={18} className="text-[#B735B8]" /> Reto 90D — Configuración
          </h1>
          <div className="h-px w-16 mt-2 rounded-full" style={{ background: BRAND_GRADIENT }} />
        </div>

        <SubNav />

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-[#B735B8]" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Aviso QR ──────────────────────────────────────────── */}
            <div
              style={{
                display: 'flex', gap: 10, padding: '14px 16px', borderRadius: 14,
                background: 'rgba(183,53,184,0.06)', border: '1px solid rgba(183,53,184,0.2)',
              }}
            >
              <Info size={16} className="text-[#B735B8]" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
                El número del reto se conecta <strong style={{ color: '#111827' }}>aquí mismo</strong> por QR
                (más abajo). Es un número dedicado, aparte de tus bots de venta.
              </p>
            </div>

            {/* Card: Instrucciones del bot (system prompt) ───────── */}
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Sparkles size={15} className="text-[#B735B8]" />
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Instrucciones del bot (personalidad)
                </p>
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6, margin: '0 0 12px' }}>
                Escribe el contexto del plan de 90 días y cómo debe tratar el bot a los participantes
                (tono, motivación, reglas). La IA seguirá estas instrucciones al responderles.
              </p>
              <textarea
                value={form.botInstructions}
                onChange={e => set('botInstructions', e.target.value)}
                rows={7}
                placeholder={"Ej: Eres el coach del Reto 90 Días de My Diamond. Trata a cada participante por su nombre, con energía y cercanía (tutéalos). Recuérdales el porqué del reto y felicítalos cuando cumplen. Sé claro y breve. Si una evidencia no corresponde, explícales con amabilidad qué falta."}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 120, lineHeight: 1.6, fontFamily: 'inherit' }}
              />
            </div>

            {/* Card: Bot y contactos ─────────────────────────────── */}
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Bot size={15} className="text-[#B735B8]" />
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Bot y contactos
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Conexión dedicada del número del reto (QR aparte) */}
                <RetoConnection />

                {/* Admin phone */}
                <div>
                  <label style={labelStyle}>Teléfono del admin</label>
                  <input
                    type="text"
                    value={form.adminPhone}
                    onChange={e => set('adminPhone', e.target.value)}
                    placeholder="591XXXXXXXX"
                    style={inputStyle}
                  />
                </div>

                {/* Group id */}
                <div>
                  <label style={labelStyle}>Grupo de WhatsApp (JID)</label>
                  <input
                    type="text"
                    value={form.groupId}
                    onChange={e => set('groupId', e.target.value)}
                    placeholder="1203...@g.us"
                    style={inputStyle}
                  />
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
                    Identificador del grupo donde se envían los reportes (termina en <code>@g.us</code>).
                  </p>
                </div>
              </div>
            </div>

            {/* Card: Interruptores ───────────────────────────────── */}
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  padding: '16px 20px', borderBottom: '1px solid #EEF2F7',
                }}
              >
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', margin: 0 }}>Reto activo</p>
                  <p style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 2 }}>
                    Si está apagado, el reto no envía recordatorios ni reportes.
                  </p>
                </div>
                <Toggle on={form.isActive} onToggle={() => set('isActive', !form.isActive)} />
              </div>

              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  padding: '16px 20px',
                }}
              >
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', margin: 0 }}>Enviar reportes al grupo</p>
                  <p style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 2 }}>
                    Publica el reporte de cierre del día en el grupo de WhatsApp.
                  </p>
                </div>
                <Toggle on={form.sendGroupReports} onToggle={() => set('sendGroupReports', !form.sendGroupReports)} />
              </div>
            </div>

            {/* Card: Horarios ────────────────────────────────────── */}
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Clock size={15} className="text-[#B735B8]" />
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Horarios
                </p>
              </div>

              <div
                style={{
                  display: 'grid', gap: 14,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                }}
              >
                {TIMES.map(t => (
                  <div key={t.key}>
                    <label style={labelStyle}>{t.label}</label>
                    <input
                      type="time"
                      value={String(form[t.key])}
                      onChange={e => set(t.key, e.target.value as RetoConfig[typeof t.key])}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>

              {/* Timezone */}
              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Globe size={12} /> Zona horaria
                  </span>
                </label>
                <input
                  type="text"
                  value={form.timezone}
                  onChange={e => set('timezone', e.target.value)}
                  placeholder="America/La_Paz"
                  style={{ ...inputStyle, maxWidth: 280 }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#b91c1c',
                }}
              >
                <AlertCircle size={16} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{error}</span>
              </div>
            )}

            {/* Guardar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 12,
                  fontSize: 14, fontWeight: 800, color: '#fff', border: 'none',
                  background: BRAND_GRADIENT, opacity: saving ? 0.7 : 1,
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'Guardando...' : 'Guardar configuración'}
              </button>
              {saved && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#059669' }}>
                  <Check size={15} /> Guardado
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
