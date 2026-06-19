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
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">

      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-60 -left-40 w-[600px] h-[600px] rounded-full bg-cyan-500/6 blur-[140px]" />
        <div className="absolute -bottom-60 -right-40 w-[600px] h-[600px] rounded-full bg-purple-600/7 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-cyan-400/3 blur-[120px]" />
      </div>

      <div className="w-full max-w-[380px] relative z-10">

        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 mb-4 rounded-2xl overflow-hidden shadow-lg shadow-black/60"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="flex justify-center"><img src="/wordmark-mydiamond.png" alt="MY DIAMOND" className="h-5 w-auto" /></h1>
          <p className="text-[11px] text-white/30 mt-1 tracking-widest uppercase">Network Marketing Digital</p>
        </div>

        {/* Card */}
        <div className="water-glass relative overflow-hidden" style={{ padding: '2rem' }}>

          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(13,30,121,0.6) 40%, rgba(210,3,221,0.6) 60%, transparent)' }} />

          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25 mb-5">Iniciar sesión</p>

          {error && (
            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 mb-5">
              <AlertCircle size={13} className="text-red-400 shrink-0" />
              <p className="text-[11px] text-red-400 leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-1.5">
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
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/15 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.15em]">
                  Contraseña
                </label>
                <Link href="/forgot-password" className="text-[10px] text-white/30 hover:text-cyan-400 transition-colors">
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
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/15 transition-colors pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <TurnstileWidget onToken={handleTurnstile} onExpire={handleTurnstileExpire} />

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-[0.18em] transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
              style={{
                background: 'linear-gradient(135deg, #0D1E79, #D203DD)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 6px 24px rgba(210,3,221,0.35)',
              }}
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" />
                : <><span>Ingresar</span><ArrowRight size={13} /></>
              }
            </button>

          </form>
        </div>

        <p className="text-center text-white/25 text-[11px] mt-5">
          ¿Sin cuenta?{' '}
          <Link href="/register" className="text-purple-400 hover:text-purple-300 font-bold transition-colors">
            Registrarse
          </Link>
        </p>

      </div>
    </div>
  )
}
