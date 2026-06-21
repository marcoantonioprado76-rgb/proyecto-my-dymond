'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

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
  const [cat, setCat] = useState<string>('todas')

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

  const categorias = useMemo(() => {
    const set = new Set(templates.map(t => t.categoria))
    return ['todas', ...Array.from(set)]
  }, [templates])

  const visibles = cat === 'todas' ? templates : templates.filter(t => t.categoria === cat)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <i className="fa-solid fa-wand-magic-sparkles text-[#D203DD]"></i>
            Recursos
          </h1>
          <p className="text-sm text-white/40 mt-0.5">Elegí una plantilla, poné tu foto y tu texto, y descargá tu diseño.</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/recursos/admin"
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#0D1E79,#D203DD)' }}>
            <i className="fa-solid fa-sliders"></i> Panel admin
          </Link>
        )}
      </div>

      {/* Filtros por categoría */}
      {categorias.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {categorias.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-all border ${
                cat === c
                  ? 'bg-[#D203DD]/20 border-[#D203DD]/50 text-white'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
              }`}>
              {c}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24 text-white/40">
          <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
        </div>
      )}

      {error && <p className="text-red-400 text-sm py-10 text-center">{error}</p>}

      {!loading && !error && visibles.length === 0 && (
        <div className="text-center py-24 text-white/40">
          <i className="fa-regular fa-image text-4xl mb-3 block opacity-50"></i>
          <p className="text-sm">Todavía no hay plantillas{cat !== 'todas' ? ' en esta categoría' : ''}.</p>
          {isAdmin && <p className="text-xs mt-2">Subí la primera desde el <Link href="/dashboard/recursos/admin" className="underline text-[#D203DD]">panel admin</Link>.</p>}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {visibles.map(t => (
          <Link key={t.id} href={`/dashboard/recursos/${t.id}`}
            className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] hover:border-[#D203DD]/40 transition-all active:scale-[0.98]">
            <div className="relative w-full bg-black/30" style={{ aspectRatio: `${t.ancho} / ${t.alto}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.thumbUrl || t.fondoUrl} alt={t.nombre}
                className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                <span className="text-xs font-black text-white px-3 py-1.5 rounded-full" style={{ background: 'linear-gradient(135deg,#0D1E79,#D203DD)' }}>
                  <i className="fa-solid fa-pen-to-square mr-1"></i> Editar
                </span>
              </div>
            </div>
            <div className="p-2.5">
              <p className="text-xs font-bold text-white truncate">{t.nombre}</p>
              <p className="text-[10px] text-white/35 capitalize">{t.categoria}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
