'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Eye, EyeOff, Loader2, Lock, UploadCloud, FileText } from 'lucide-react'
import { CATEGORIAS_RECURSOS } from '@/lib/recursos'

interface Res {
  id: string; tipo: string; titulo: string; categoria: string
  archivoUrl: string; portadaUrl: string | null; paginas: number | null; activo?: boolean
}

const LABEL = {
  presentacion: { sing: 'presentación', plur: 'presentaciones' },
  libro: { sing: 'libro', plur: 'libros' },
} as const

export default function ResourcesAdmin({ tipo }: { tipo: 'presentacion' | 'libro' }) {
  const l = LABEL[tipo]
  const [items, setItems] = useState<Res[]>([])
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  // formulario
  const [open, setOpen] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_RECURSOS[0])
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [paginas, setPaginas] = useState<number | null>(null)
  const [portadaFile, setPortadaFile] = useState<File | null>(null)
  const [autoPortada, setAutoPortada] = useState<Blob | null>(null)
  const [portadaPreview, setPortadaPreview] = useState<string | null>(null)
  const [analizando, setAnalizando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const pdfInput = useRef<HTMLInputElement>(null)

  function load() {
    fetch(`/api/recursos/resources?tipo=${tipo}&todos=1`)
      .then(r => r.json())
      .then(d => { setItems(d.resources || []); setIsAdmin(!!d.isAdmin) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [tipo])

  function resetForm() {
    setOpen(false); setTitulo(''); setCategoria(CATEGORIAS_RECURSOS[0])
    setPdfFile(null); setPaginas(null); setPortadaFile(null)
    setAutoPortada(null); setPortadaPreview(null); setErr(null)
    if (pdfInput.current) pdfInput.current.value = ''
  }

  // Al elegir el PDF: leer nº de páginas y generar portada de la página 1.
  async function onPdf(file: File | null) {
    setPdfFile(file); setPaginas(null); setAutoPortada(null)
    if (!portadaFile) setPortadaPreview(null)
    if (!file) return
    if (!titulo) setTitulo(file.name.replace(/\.pdf$/i, ''))
    setAnalizando(true)
    try {
      const pdfjs = await import('pdfjs-dist')
      ;(pdfjs as any).GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
      const buf = await file.arrayBuffer()
      const pdf = await (pdfjs as any).getDocument({ data: buf }).promise
      setPaginas(pdf.numPages)
      const page = await pdf.getPage(1)
      const baseVp = page.getViewport({ scale: 1 })
      const scale = Math.min(2, 900 / baseVp.width)
      const vp = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = vp.width; canvas.height = vp.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport: vp }).promise
      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.82))
      if (blob) {
        setAutoPortada(blob)
        if (!portadaFile) setPortadaPreview(URL.createObjectURL(blob))
      }
    } catch (e) {
      console.error('[admin recursos] no se pudo analizar el PDF', e)
    } finally {
      setAnalizando(false)
    }
  }

  function onPortada(file: File | null) {
    setPortadaFile(file)
    if (file) setPortadaPreview(URL.createObjectURL(file))
    else if (autoPortada) setPortadaPreview(URL.createObjectURL(autoPortada))
    else setPortadaPreview(null)
  }

  async function uploadFile(file: Blob, filename: string): Promise<string> {
    const fd = new FormData()
    fd.append('file', file, filename)
    const r = await fetch('/api/recursos/upload', { method: 'POST', body: fd })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || 'Error al subir archivo')
    return d.url as string
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!titulo.trim()) return setErr('Ponle un título.')
    if (!pdfFile) return setErr('Selecciona el archivo PDF.')
    setSaving(true)
    try {
      const archivoUrl = await uploadFile(pdfFile, pdfFile.name)
      let portadaUrl: string | undefined
      if (portadaFile) portadaUrl = await uploadFile(portadaFile, portadaFile.name)
      else if (autoPortada) portadaUrl = await uploadFile(autoPortada, 'portada.jpg')

      const r = await fetch('/api/recursos/resources', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, titulo: titulo.trim(), categoria, archivoUrl, portadaUrl, paginas: paginas ?? undefined }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'No se pudo guardar')
      resetForm(); load()
    } catch (e: any) {
      setErr(e?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function toggle(t: Res) {
    setBusy(t.id)
    await fetch(`/api/recursos/resources/${t.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !t.activo }),
    })
    setBusy(null); load()
  }
  async function remove(t: Res) {
    if (!confirm(`¿Eliminar "${t.titulo}"? No se puede deshacer.`)) return
    setBusy(t.id)
    await fetch(`/api/recursos/resources/${t.id}`, { method: 'DELETE' })
    setBusy(null); load()
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-purple-400" /></div>

  if (isAdmin === false) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <Lock className="mx-auto text-white/25 mb-3" size={28} />
        <p className="text-white/60 text-sm">Tu cuenta no gestiona Recursos. La maneja la cuenta de administración designada.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-5">
        <p className="text-xs text-white/40">{items.length} {items.length === 1 ? l.sing : l.plur}. Sube el PDF; la portada y el nº de páginas se generan solos.</p>
        <button onClick={() => setOpen(o => !o)}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all">
          <Plus size={15} /> {open ? 'Cerrar' : `Nuevo`}
        </button>
      </div>

      {/* Formulario de subida */}
      {open && (
        <form onSubmit={submit} className="mb-7 rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-white/50 mb-1.5">Título</label>
              <input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={150}
                placeholder={`Nombre de la ${l.sing}`}
                className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-sm text-white placeholder-white/25 focus:border-[#D203DD]/50 outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-white/50 mb-1.5">Categoría</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-sm text-white focus:border-[#D203DD]/50 outline-none">
                {CATEGORIAS_RECURSOS.map(c => <option key={c} value={c} className="bg-[#0b0b14]">{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-start">
            <div>
              <label className="block text-[11px] font-bold text-white/50 mb-1.5">Archivo PDF</label>
              <input ref={pdfInput} type="file" accept="application/pdf"
                onChange={e => onPdf(e.target.files?.[0] || null)}
                className="block w-full text-xs text-white/60 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:text-xs file:font-bold hover:file:bg-purple-500" />
              <div className="mt-2 text-[11px] text-white/40 flex items-center gap-2 min-h-[18px]">
                {analizando ? <><Loader2 size={12} className="animate-spin" /> Analizando PDF…</>
                  : pdfFile ? <><FileText size={12} /> {pdfFile.name}{paginas ? ` · ${paginas} pág.` : ''}</>
                  : <span className="text-white/25">Solo PDF.</span>}
              </div>
              <label className="block text-[11px] font-bold text-white/50 mt-3 mb-1.5">Portada (opcional — si no, se usa la página 1)</label>
              <input type="file" accept="image/png,image/jpeg,image/webp"
                onChange={e => onPortada(e.target.files?.[0] || null)}
                className="block w-full text-xs text-white/60 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-white file:text-xs file:font-bold hover:file:bg-white/20" />
            </div>
            <div className="w-28 shrink-0">
              <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden flex items-center justify-center" style={{ aspectRatio: '3 / 4' }}>
                {portadaPreview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={portadaPreview} alt="portada" className="w-full h-full object-cover" />
                  : <UploadCloud className="text-white/20" size={22} />}
              </div>
              <p className="text-[10px] text-white/30 text-center mt-1">Portada</p>
            </div>
          </div>

          {err && <p className="text-red-400 text-xs">{err}</p>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white/60 bg-white/5 hover:bg-white/10 transition-all">Cancelar</button>
            <button type="submit" disabled={saving || analizando}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all disabled:opacity-50">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Subiendo…</> : <>Guardar {l.sing}</>}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {items.length === 0 ? (
        <div className="text-center py-20 text-white/40 border border-dashed border-white/10 rounded-2xl">
          <FileText className="mx-auto mb-3 opacity-40" size={32} />
          <p className="text-sm">No hay {l.plur} todavía.</p>
          <p className="text-xs mt-1">Sube el primero con “Nuevo”.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map(t => (
            <div key={t.id} className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03]">
              <div className="relative w-full bg-black/30 flex items-center justify-center" style={{ aspectRatio: '3 / 4' }}>
                {t.portadaUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={t.portadaUrl} alt={t.titulo} className="w-full h-full object-cover" loading="lazy" />
                  : <FileText className="text-white/20" size={30} />}
                {!t.activo && <span className="absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full bg-black/70 text-white/70">OCULTO</span>}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-bold text-white truncate">{t.titulo}</p>
                <p className="text-[10px] text-white/35 mb-2">{t.categoria}{t.paginas ? ` · ${t.paginas} pág.` : ''}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => toggle(t)} disabled={busy === t.id}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 ${t.activo ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25' : 'bg-green-500/15 text-green-300 border border-green-500/25'}`}>
                    {t.activo ? <><EyeOff size={11} /> Ocultar</> : <><Eye size={11} /> Activar</>}
                  </button>
                  <button onClick={() => remove(t)} disabled={busy === t.id}
                    className="px-2.5 py-1.5 rounded-lg text-red-300 bg-red-500/15 border border-red-500/25 transition-all disabled:opacity-50">
                    <Trash2 size={11} />
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
