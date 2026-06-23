'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Trash2, Plus, Loader2, ChevronUp, ChevronDown, Tags } from 'lucide-react'

interface Area { id: string; nombre: string; orden: number; activo: boolean }

export default function AreasManager() {
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState('')
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function load() {
    fetch('/api/recursos/areas?todos=1')
      .then(r => r.json())
      .then(d => setAreas(d.areas || []))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function toggle(a: Area) {
    setBusy(a.id)
    await fetch(`/api/recursos/areas/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: !a.activo }) })
    setBusy(null); load()
  }
  async function remove(a: Area) {
    if (!confirm(`¿Eliminar el área "${a.nombre}"? Los flyers de esa área no se borran, pero el área deja de aparecer en el menú.`)) return
    setBusy(a.id)
    await fetch(`/api/recursos/areas/${a.id}`, { method: 'DELETE' })
    setBusy(null); load()
  }
  async function move(a: Area, dir: -1 | 1) {
    const idx = areas.findIndex(x => x.id === a.id)
    const j = idx + dir
    if (j < 0 || j >= areas.length) return
    const b = areas[j]
    setBusy(a.id)
    await Promise.all([
      fetch(`/api/recursos/areas/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orden: b.orden }) }),
      fetch(`/api/recursos/areas/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orden: a.orden }) }),
    ])
    setBusy(null); load()
  }
  async function add(e: React.FormEvent) {
    e.preventDefault()
    const n = nuevo.trim()
    if (!n) return
    setAdding(true); setErr(null)
    const r = await fetch('/api/recursos/areas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: n }) })
    const d = await r.json()
    setAdding(false)
    if (!r.ok) { setErr(d.error || 'No se pudo agregar'); return }
    setNuevo(''); load()
  }

  const activas = areas.filter(a => a.activo).length

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] mb-6 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-all">
        <span className="text-sm font-black text-white flex items-center gap-2">
          <Tags size={16} className="text-purple-400" /> Áreas del menú de Flyers
          <span className="text-[10px] font-bold text-white/40">({activas} visibles de {areas.length})</span>
        </span>
        {open ? <ChevronUp size={16} className="text-white/50" /> : <ChevronDown size={16} className="text-white/50" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-[11px] text-white/40 mb-2">Elegí qué áreas aparecen en “Filtrar flyers”. Ocultá las que no uses, agregá nuevas o borralas. (Esto solo lo ve el admin.)</p>

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-purple-400" size={20} /></div>
          ) : (
            <div className="space-y-1.5">
              {areas.map((a, i) => (
                <div key={a.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${a.activo ? 'border-white/10 bg-white/[0.02]' : 'border-white/5 bg-transparent'}`}>
                  <div className="flex flex-col -my-1">
                    <button onClick={() => move(a, -1)} disabled={i === 0 || !!busy} className="text-white/30 hover:text-white disabled:opacity-20 leading-none"><ChevronUp size={13} /></button>
                    <button onClick={() => move(a, 1)} disabled={i === areas.length - 1 || !!busy} className="text-white/30 hover:text-white disabled:opacity-20 leading-none"><ChevronDown size={13} /></button>
                  </div>
                  <span className={`flex-1 text-sm font-bold truncate ${a.activo ? 'text-white' : 'text-white/35 line-through'}`}>{a.nombre}</span>
                  <button onClick={() => toggle(a)} disabled={busy === a.id}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all disabled:opacity-50 ${a.activo ? 'bg-green-500/15 text-green-300 border-green-500/25' : 'bg-white/5 text-white/40 border-white/10'}`}>
                    {a.activo ? <><Eye size={11} /> Visible</> : <><EyeOff size={11} /> Oculta</>}
                  </button>
                  <button onClick={() => remove(a)} disabled={busy === a.id}
                    className="px-2 py-1 rounded-lg text-red-300 bg-red-500/15 border border-red-500/25 transition-all disabled:opacity-50">
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={add} className="flex gap-2 pt-2">
            <input value={nuevo} onChange={e => setNuevo(e.target.value)} maxLength={60}
              placeholder="Nueva área (ej. Promociones)"
              className="flex-1 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm text-white placeholder-white/25 focus:border-purple-500/50 outline-none" />
            <button type="submit" disabled={adding || !nuevo.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all disabled:opacity-50">
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />} Agregar
            </button>
          </form>
          {err && <p className="text-red-400 text-xs">{err}</p>}
        </div>
      )}
    </div>
  )
}
