'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Settings, Save, Loader2, Check, AlertCircle, Info, Bot, Clock, Globe,
} from 'lucide-react'

// ── Paleta de marca ───────────────────────────────────────────────────────────
const BRAND_GRADIENT = 'linear-gradient(135deg,#FF2D95,#B735B8,#233B8F)'

// ── Sub-navegación del módulo Reto 90D ────────────────────────────────────────
const NAV = [
  { href: '/admin/reto-90d', label: 'Resumen' },
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
        botId: form.botId || null,
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
                El número del reto se vincula por QR en{' '}
                <strong style={{ color: '#111827' }}>Dashboard → Bots (Baileys)</strong>; aquí solo eliges cuál
                bot usa el reto.
              </p>
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
                {/* Bot select */}
                <div>
                  <label style={labelStyle}>Bot de Baileys del reto</label>
                  <select
                    value={form.botId}
                    onChange={e => set('botId', e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="">— Selecciona un bot —</option>
                    {bots.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                        {b.baileysPhone ? ` · ${b.baileysPhone}` : ''}
                        {b.status ? ` (${b.status})` : ''}
                      </option>
                    ))}
                  </select>
                  {bots.length === 0 && (
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
                      No hay bots Baileys disponibles. Crea y vincula uno en Dashboard → Bots.
                    </p>
                  )}
                </div>

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
