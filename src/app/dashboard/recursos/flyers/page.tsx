'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CATEGORIAS_RECURSOS } from '@/lib/recursos'

interface TemplateItem {
  id: string
  nombre: string
  categoria: string
  ancho: number
  alto: number
  thumbUrl: string | null
  fondoUrl: string
}

export default function RecursosGaleriaPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // null = mostrar el menú de áreas (en móvil). 'todas' o un área = ver sus flyers.
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/recursos/templates')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setTemplates(d.templates || [])
        setIsAdmin(!!d.isAdmin)
      })
      .catch(() => setError('No se pudieron cargar las plantillas'))
      .finally(() => setLoading(false))
  }, [])

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const t of templates) m[t.categoria] = (m[t.categoria] || 0) + 1
    return m
  }, [templates])

  // Todas las áreas predefinidas + cualquier categoría vieja con flyers (al final)
  const areas = useMemo(() => {
    const base = CATEGORIAS_RECURSOS as readonly string[]
    const extra = Array.from(new Set(templates.map(t => t.categoria))).filter(c => !base.includes(c))
    return [...base, ...extra]
  }, [templates])

  const activeKey = selected || 'todas'
  const gridItems = (!selected || selected === 'todas')
    ? templates
    : templates.filter(t => t.categoria === selected)
  const titulo = (!selected || selected === 'todas') ? 'Todos los flyers' : selected

  function Row({ value, label, n }: { value: string; label: string; n: number }) {
    const active = activeKey === value
    const empty = n === 0 && value !== 'todas'
    return (
      <button
        onClick={() => setSelected(value)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
          active
            ? 'bg-[#D203DD]/15 border-[#D203DD]/50 text-white'
            : 'bg-white/[0.03] border-white/10 text-white/70 hover:text-white hover:border-white/20'
        } ${empty ? 'opacity-45' : ''}`}
      >
        {/* indicador estilo radio */}
        <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${active ? 'border-[#D203DD]' : 'border-white/30'}`}>
          {active && <span className="w-1.5 h-1.5 rounded-full bg-[#D203DD]" />}
        </span>
        <span className="flex-1 text-sm font-bold truncate">{label}</span>
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${active ? 'bg-[#D203DD]/30 text-white' : 'bg-white/10 text-white/50'}`}>{n}</span>
        <i className="fa-solid fa-chevron-right text-[10px] text-white/30 md:hidden"></i>
      </button>
    )
  }

  return (
    <div className="md:flex md:gap-6">
      {/* ── MENÚ VERTICAL DE ÁREAS ── */}
      <aside className={`${selected ? 'hidden md:block' : 'block'} md:w-60 md:shrink-0`}>
        <h2 className="text-sm font-black text-white/80 mb-3 px-1">Filtrar flyers</h2>
        <div className="space-y-1.5">
          <Row value="todas" label="Todas" n={templates.length} />
          {areas.map(a => <Row key={a} value={a} label={a} n={counts[a] || 0} />)}
        </div>
        {isAdmin && (
          <Link href="/admin/recursos" className="mt-3 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/15 text-xs font-bold text-white/50 hover:text-white hover:border-[#D203DD]/40 transition-all">
            <i className="fa-solid fa-plus"></i> Subir flyers por área
          </Link>
        )}
      </aside>

      {/* ── FLYERS DEL ÁREA ── */}
      <section className={`${selected ? 'block' : 'hidden md:block'} flex-1 min-w-0`}>
        {selected && (
          <button onClick={() => setSelected(null)}
            className="md:hidden flex items-center gap-2 mb-4 text-sm font-bold text-white/60 hover:text-white transition-all">
            <i className="fa-solid fa-arrow-left"></i> Áreas
          </button>
        )}

        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-black text-white truncate">{titulo}</h3>
          {!loading && <span className="text-xs text-white/40 shrink-0">{gridItems.length} flyer(s)</span>}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24 text-white/40">
            <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
          </div>
        )}
        {error && <p className="text-red-400 text-sm py-10 text-center">{error}</p>}

        {!loading && !error && gridItems.length === 0 && (
          <div className="text-center py-24 text-white/40">
            <i className="fa-regular fa-image text-4xl mb-3 block opacity-50"></i>
            <p className="text-sm">Todavía no hay flyers{selected && selected !== 'todas' ? ' en esta área' : ''}.</p>
            {isAdmin && <p className="text-xs mt-2">Subí el primero desde <Link href="/admin/recursos" className="underline text-[#D203DD]">Admin → Recursos</Link>.</p>}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {gridItems.map(t => (
            <Link key={t.id} href={`/dashboard/recursos/flyers/${t.id}`}
              className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] hover:border-[#D203DD]/40 transition-all active:scale-[0.98]">
              <div className="relative w-full bg-black/30" style={{ aspectRatio: `${t.ancho} / ${t.alto}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.thumbUrl || t.fondoUrl} alt={t.nombre} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                  <span className="text-xs font-black text-white px-3 py-1.5 rounded-full" style={{ background: 'linear-gradient(135deg,#0D1E79,#D203DD)' }}>
                    <i className="fa-solid fa-pen-to-square mr-1"></i> Editar
                  </span>
                </div>
              </div>
              <div className="p-2.5">
                <p className="text-xs font-bold text-white truncate">{t.nombre}</p>
                <p className="text-[10px] text-white/35">{t.categoria}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
