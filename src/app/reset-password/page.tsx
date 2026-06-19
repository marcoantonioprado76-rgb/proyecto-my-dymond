'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    }>
      <ResetForm />
    </Suspense>
  )
}

function ResetForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess(true)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/15 transition-colors'
  const labelCls = 'block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[450px] h-[450px] rounded-full bg-purple-600/8 blur-[130px]" />
        <div className="absolute -bottom-40 -left-40 w-[450px] h-[450px] rounded-full bg-cyan-500/8 blur-[130px]" />
      </div>

      <div className="w-full max-w-[340px] relative z-10">

        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 mb-3 rounded-xl overflow-hidden border border-white/10 shadow-lg shadow-black/50">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="flex justify-center"><img src="/wordmark-mydiamond.png" alt="MY DIAMOND" className="h-[18px] w-auto" /></h1>
          <p className="text-[11px] text-white/30 mt-0.5">Network Marketing Digital</p>
        </div>

        <div className="water-glass shadow-2xl shadow-black/60" style={{ padding: '1.5rem' }}>
          {success ? (
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={26} className="text-green-400" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-1">¡Listo!</p>
              <h2 className="text-base font-black text-white mb-2">Contraseña actualizada</h2>
              <p className="text-xs text-white/35 mb-5">Tu contraseña ha sido restablecida exitosamente.</p>
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #0D1E79, #D203DD)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 4px 20px rgba(210,3,221,0.25)',
                }}
              >
                Iniciar sesión <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/25 mb-3">Nueva contraseña</p>
              <p className="text-xs text-white/40 mb-4 leading-relaxed">
                Ingresa tu nueva contraseña para acceder a tu cuenta.
              </p>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4">
                  <AlertCircle size={12} className="text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className={labelCls}>Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`${inputCls} pr-10`}
                      placeholder="Min. 8 caracteres"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Confirmar contraseña</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className={`${inputCls} pr-10`}
                      placeholder="Repite tu contraseña"
                      value={form.confirmPassword}
                      onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                      required
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-60 mt-1"
                  style={{
                    background: 'linear-gradient(135deg, #0D1E79, #D203DD)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 4px 20px rgba(210,3,221,0.25)',
                  }}
                >
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    : <><span>Restablecer contraseña</span><Lock size={13} /></>
                  }
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-white/25 text-[11px] mt-5">
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-bold transition-colors">
            ← Volver al inicio de sesión
          </Link>
        </p>

      </div>
    </div>
  )
}
