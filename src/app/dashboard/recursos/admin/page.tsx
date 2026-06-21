'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface T {
  id: string; nombre: string; categoria: string
  ancho: number; alto: number; thumbUrl: string | null; fondoUrl: string
  activo?: boolean
}

export default function RecursosAdminPage() {
  const [items, setItems] = useState<T[]>([])
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  function load() {
    fetch('/api/recursos/templates?todos=1')
      .then(r => r.json())
      .then(d => { setItems(d.templates || []); setIsAdmin(!!d.isAdmin) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function toggle(t: T) {
    setBusy(t.id)
    await fetch(`/api/recursos/templates/${t.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !t.activo }),
    })
    setBusy(null); load()
  }
  async function remove(t: T) {
    if (!confirm(`¿Eliminar la plantilla "${t.nombre}"? No se puede deshacer.`)) return
    setBusy(t.id)
    await fetch(`/api/recursos/templates/${t.id}`, { method: 'DELETE' })
    setBusy(null); load()
  }

  if (loading) return <div className="flex items-center justify-center py-32 text-white/40"><i className="fa-solid fa-spinner fa-spin text-2xl"></i></div>

  if (isAdmin === false) {
    return (
      <div className="max-w-md mx-auto text-center py-24">
        <i className="fa-solid fa-lock text-3xl text-white/30 mb-3 block"></i>
        <p className="text-white/60 text-sm mb-4">Esta sección es solo para administradores.</p>
        <Link href="/dashboard/recursos" className="text-[#D203DD] underline text-sm">Volver a Recursos</Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/recursos" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10">
            <i className="fa-solid fa-arrow-left text-white/70 text-sm"></i>
          </Link>
          <div>
            <h1 className="text-xl font-black text-white">Plantillas — Admin</h1>
            <p className="text-xs text-white/40">{items.length} plantilla(s)</p>
          </div>
        </div>
        <Link href="/dashboard/recursos/admin/nuevo"
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg,#0D1E79,#D203DD)' }}>
          <i className="fa-solid fa-plus"></i> Nueva plantilla
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-24 text-white/40">
          <i className="fa-regular fa-image text-4xl mb-3 block opacity-50"></i>
          <p className="text-sm">No hay plantillas todavía. Creá la primera.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map(t => (
            <div key={t.id} className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03]">
              <div className="relative w-full bg-black/30" style={{ aspectRatio: `${t.ancho} / ${t.alto}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.thumbUrl || t.fondoUrl} alt={t.nombre} className="w-full h-full object-cover" loading="lazy" />
                {!t.activo && <span className="absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full bg-black/70 text-white/70">OCULTA</span>}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-bold text-white truncate">{t.nombre}</p>
                <p className="text-[10px] text-white/35 capitalize mb-2">{t.categoria}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => toggle(t)} disabled={busy === t.id}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 ${t.activo ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25' : 'bg-green-500/15 text-green-300 border border-green-500/25'}`}>
                    {t.activo ? 'Ocultar' : 'Activar'}
                  </button>
                  <button onClick={() => remove(t)} disabled={busy === t.id}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/15 text-red-300 border border-red-500/25 transition-all disabled:opacity-50">
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
