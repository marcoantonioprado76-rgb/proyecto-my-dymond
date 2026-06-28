'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react'
import TurnstileWidget from '@/components/TurnstileWidget'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const handleTurnstile = useCallback((token: string) => setTurnstileToken(token), [])
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(''), [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, turnstileToken }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      if (data.requiresVerification) {
        router.push('/verify-device')
        return
      }
      window.location.href = '/dashboard'
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="font-ui min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(circle at top right, rgba(255,9,108,0.08), transparent 28%), radial-gradient(circle at bottom left, rgba(35,59,143,0.08), transparent 30%), linear-gradient(135deg, #EEF2F7 0%, #F5F7FA 45%, #E9EEF5 100%)' }}>

      {/* Glows suaves */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-60 -left-40 w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: 'rgba(255,9,108,0.08)' }} />
        <div className="absolute -bottom-60 -right-40 w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: 'rgba(106,53,217,0.08)' }} />
      </div>

      <div className="w-full max-w-[380px] relative z-10">

        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 mb-3 rounded-2xl overflow-hidden"
            style={{ background: '#071522', border: '1px solid #E4E9F0', boxShadow: '0 14px 32px rgba(8,22,36,0.18)' }}>
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-display text-diamond-gradient" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '0.04em', margin: 0 }}>MY DIAMOND</h1>
          <p className="text-[11px] mt-1 tracking-widest uppercase" style={{ color: '#9CA3AF' }}>Network Marketing Digital</p>
        </div>

        {/* Card */}
        <div className="dm-card" style={{ padding: '2rem' }}>

          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-5" style={{ color: '#9CA3AF' }}>Iniciar sesión</p>

          {error && (
            <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)' }}>
              <AlertCircle size={13} className="shrink-0" style={{ color: '#dc2626' }} />
              <p className="text-[11px] leading-snug" style={{ color: '#dc2626' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] mb-1.5" style={{ color: '#6B7280' }}>
                Usuario o Correo
              </label>
              <input
                type="text"
                placeholder="usuario o correo@ejemplo.com"
                value={form.identifier}
                onChange={e => setForm({ ...form, identifier: e.target.value })}
                required
                autoComplete="username"
                autoFocus
                className="dm-input text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: '#6B7280' }}>
                  Contraseña
                </label>
                <Link href="/forgot-password" className="text-[10px] transition-colors" style={{ color: '#6B7280' }}>
                  ¿Olvidaste?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  className="dm-input text-sm pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#9CA3AF' }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <TurnstileWidget onToken={handleTurnstile} onExpire={handleTurnstileExpire} />

            <button
              type="submit"
              disabled={loading}
              className="dm-btn w-full uppercase tracking-[0.18em] text-xs mt-2"
              style={{ padding: '13px 20px' }}
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><span>Ingresar</span><ArrowRight size={13} /></>
              }
            </button>

          </form>
        </div>

        <p className="text-center text-[11px] mt-5" style={{ color: '#9CA3AF' }}>
          ¿Sin cuenta?{' '}
          <Link href="/register" className="font-bold transition-colors" style={{ color: '#FF096C' }}>
            Registrarse
          </Link>
        </p>

      </div>
    </div>
  )
}