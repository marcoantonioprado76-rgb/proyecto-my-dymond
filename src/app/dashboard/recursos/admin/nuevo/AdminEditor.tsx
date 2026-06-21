'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminEditor() {
  const router = useRouter()
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fcanvasRef = useRef<any>(null)
  const fabricRef = useRef<any>(null)
  const baseFileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'upload' | 'edit'>('upload')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fondoUrl, setFondoUrl] = useState('')
  const [ancho, setAncho] = useState(1080)
  const [alto, setAlto] = useState(1350)
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [hasPhoto, setHasPhoto] = useState(false)
  const [sel, setSel] = useState<any>(null) // objeto seleccionado (para panel de texto)

  // 1) Subir imagen base
  async function onBaseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError(null)
    try {
      // dimensiones naturales
      const dims = await new Promise<{ w: number; h: number }>((res, rej) => {
        const img = new Image()
        img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight })
        img.onerror = rej
        img.src = URL.createObjectURL(file)
      })
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch('/api/recursos/upload', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error al subir')
      setFondoUrl(d.url); setAncho(dims.w); setAlto(dims.h)
      setStep('edit')
    } catch (err: any) {
      setError(err?.message || 'No se pudo subir la imagen')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // 2) Init Fabric cuando hay imagen base
  useEffect(() => {
    if (step !== 'edit' || !fondoUrl || !canvasElRef.current) return
    let disposed = false
    let fcanvas: any
    let onResize = () => {}
    ;(async () => {
      const mod: any = await import('fabric')
      const fabric = mod.fabric || mod.default || mod
      fabricRef.current = fabric
      if (disposed || !canvasElRef.current) return

      fcanvas = new fabric.Canvas(canvasElRef.current, {
        width: ancho, height: alto, backgroundColor: '#0b0b16', preserveObjectStacking: true,
      })
      fcanvasRef.current = fcanvas

      onResize = () => {
        const parentW = canvasElRef.current?.parentElement?.clientWidth || 460
        const scale = Math.min(1, Math.min(460, parentW) / ancho)
        fcanvas.setDimensions({ width: ancho * scale, height: alto * scale }, { cssOnly: true })
      }
      onResize(); window.addEventListener('resize', onResize)

      fabric.Image.fromURL(fondoUrl, (img: any) => {
        if (disposed) return
        img.set({ left: 0, top: 0, selectable: false, evented: false })
        img.scaleToWidth(ancho)
        fcanvas.add(img); img.sendToBack(); fcanvas.renderAll()
      }, { crossOrigin: 'anonymous' })

      fcanvas.on('selection:created', (e: any) => setSel(e.selected?.[0] || null))
      fcanvas.on('selection:updated', (e: any) => setSel(e.selected?.[0] || null))
      fcanvas.on('selection:cleared', () => setSel(null))
    })()
    return () => {
      disposed = true; window.removeEventListener('resize', onResize)
      try { fcanvas?.dispose() } catch {}
      fcanvasRef.current = null
    }
  }, [step, fondoUrl, ancho, alto])

  function addPhotoHole() {
    const fc = fcanvasRef.current, fabric = fabricRef.current
    if (!fc || !fabric || hasPhoto) return
    const w = Math.round(ancho * 0.6), h = Math.round(alto * 0.4)
    const rect = new fabric.Rect({
      left: (ancho - w) / 2, top: (alto - h) / 2, width: w, height: h,
      fill: 'rgba(210,3,221,0.12)', stroke: '#D203DD', strokeDashArray: [12, 9], strokeWidth: 4,
      rx: 10, ry: 10, cornerColor: '#D203DD', transparentCorners: false,
    })
    ;(rect as any)._isPhoto = true
    fc.add(rect); fc.setActiveObject(rect); fc.renderAll(); setHasPhoto(true)
  }

  function addText() {
    const fc = fcanvasRef.current, fabric = fabricRef.current
    if (!fc || !fabric) return
    const tb = new fabric.Textbox('Tu texto', {
      left: ancho * 0.1, top: alto * 0.1, width: Math.round(ancho * 0.8),
      fontSize: Math.round(alto * 0.05), fontFamily: 'Archivo', fontWeight: '800',
      fill: '#ffffff', textAlign: 'center', cornerColor: '#00B4FF', transparentCorners: false,
    })
    ;(tb as any)._isText = true
    fc.add(tb); fc.setActiveObject(tb); fc.renderAll(); setSel(tb)
  }

  function delSelected() {
    const fc = fcanvasRef.current; const o = fc?.getActiveObject()
    if (!o) return
    if ((o as any)._isPhoto) setHasPhoto(false)
    fc.remove(o); fc.discardActiveObject(); fc.renderAll(); setSel(null)
  }

  // panel de texto: cambios sobre el objeto seleccionado
  function updSel(props: Record<string, any>) {
    const fc = fcanvasRef.current, o = sel
    if (!fc || !o) return
    o.set(props); fc.renderAll(); setSel({ ...o, set: o.set.bind(o) }) // forzar re-render del panel
  }

  async function save() {
    const fc = fcanvasRef.current
    if (!fc) return
    if (!nombre.trim() || !categoria.trim()) { setError('Poné nombre y categoría.'); return }
    setSaving(true); setError(null)

    let photo: any = null
    const texts: any[] = []
    for (const o of fc.getObjects()) {
      if ((o as any)._isPhoto) {
        photo = {
          x: Math.round(o.left), y: Math.round(o.top),
          w: Math.round(o.width * o.scaleX), h: Math.round(o.height * o.scaleY),
        }
      } else if ((o as any)._isText) {
        texts.push({
          id: Math.random().toString(36).slice(2, 9),
          x: Math.round(o.left), y: Math.round(o.top),
          w: Math.round((o.width || 0) * o.scaleX),
          text: o.text || '',
          fontSize: Math.round((o.fontSize || 48) * o.scaleY),
          fontFamily: o.fontFamily || 'Archivo',
          fill: o.fill || '#ffffff',
          align: o.textAlign || 'left',
          fontWeight: String(o.fontWeight || '700'),
        })
      }
    }

    try {
      const r = await fetch('/api/recursos/templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(), categoria: categoria.trim().toLowerCase(),
          ancho, alto, fondoUrl, thumbUrl: fondoUrl,
          zonas: { photo, texts },
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'No se pudo guardar')
      router.push('/dashboard/recursos/admin')
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar'); setSaving(false)
    }
  }

  // ── UI ──
  if (step === 'upload') {
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/recursos/admin" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10">
            <i className="fa-solid fa-arrow-left text-white/70 text-sm"></i>
          </Link>
          <h1 className="text-xl font-black text-white">Nueva plantilla</h1>
        </div>
        <input ref={baseFileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onBaseFile} className="hidden" />
        <button onClick={() => baseFileRef.current?.click()} disabled={uploading}
          className="w-full rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.03] py-16 flex flex-col items-center gap-3 text-white/50 hover:border-[#D203DD]/40 hover:text-white/70 transition-all disabled:opacity-60">
          {uploading
            ? <><i className="fa-solid fa-spinner fa-spin text-3xl"></i><span className="text-sm">Subiendo…</span></>
            : <><i className="fa-solid fa-cloud-arrow-up text-3xl"></i><span className="text-sm font-bold">Subir imagen base (JPG/PNG/WEBP)</span><span className="text-xs">Recomendado 1080×1350</span></>}
        </button>
        {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
      </div>
    )
  }

  const isTextSel = sel && (sel as any)._isText

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/recursos/admin" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10">
          <i className="fa-solid fa-arrow-left text-white/70 text-sm"></i>
        </Link>
        <h1 className="text-lg font-black text-white">Definir plantilla</h1>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-6 items-start">
        {/* Lienzo */}
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3 flex justify-center overflow-hidden">
          <canvas ref={canvasElRef} className="rounded-lg max-w-full" style={{ touchAction: 'none' }} />
        </div>

        {/* Panel */}
        <div className="w-full space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre"
              className="col-span-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#D203DD]/40" />
            <input value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Categoría (ej: ventas)"
              className="col-span-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#D203DD]/40" />
          </div>

          <div className="flex gap-2">
            <button onClick={addPhotoHole} disabled={hasPhoto}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-[#D203DD]/15 border border-[#D203DD]/30 transition-all active:scale-95 disabled:opacity-40">
              <i className="fa-solid fa-crop-simple mr-1"></i> Hueco de foto
            </button>
            <button onClick={addText}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-[#00B4FF]/15 border border-[#00B4FF]/30 transition-all active:scale-95">
              <i className="fa-solid fa-font mr-1"></i> Texto
            </button>
          </div>

          {sel && (
            <button onClick={delSelected} className="w-full py-2 rounded-xl text-xs font-bold text-red-300 bg-red-500/10 border border-red-500/25 transition-all active:scale-95">
              <i className="fa-solid fa-trash mr-1"></i> Quitar lo seleccionado
            </button>
          )}

          {/* Controles de texto seleccionado */}
          {isTextSel && (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 space-y-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/40">Texto seleccionado</p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/50 w-12">Tamaño</span>
                <button onClick={() => updSel({ fontSize: Math.max(10, (sel.fontSize || 48) - 4) })} className="w-7 h-7 rounded-lg bg-white/10 text-white text-sm">−</button>
                <span className="text-xs text-white/70 w-9 text-center">{Math.round(sel.fontSize || 48)}</span>
                <button onClick={() => updSel({ fontSize: (sel.fontSize || 48) + 4 })} className="w-7 h-7 rounded-lg bg-white/10 text-white text-sm">+</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/50 w-12">Alinear</span>
                {(['left', 'center', 'right'] as const).map(a => (
                  <button key={a} onClick={() => updSel({ textAlign: a })}
                    className={`w-7 h-7 rounded-lg text-xs ${sel.textAlign === a ? 'bg-[#00B4FF]/30 text-white' : 'bg-white/10 text-white/60'}`}>
                    <i className={`fa-solid fa-align-${a}`}></i>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/50 w-12">Color</span>
                <input type="color" value={(sel.fill as string) || '#ffffff'} onChange={e => updSel({ fill: e.target.value })}
                  className="w-7 h-7 rounded-lg bg-transparent border border-white/10 cursor-pointer" />
                <button onClick={() => updSel({ fontWeight: sel.fontWeight === '800' ? '400' : '800' })}
                  className={`px-2.5 h-7 rounded-lg text-xs font-black ${sel.fontWeight === '800' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'}`}>B</button>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 text-[11px] text-white/45 leading-relaxed">
            <p>• Agregá <b>un</b> hueco de foto y los <b>textos</b> que quieras.</p>
            <p>• Arrastrá y redimensioná cada uno sobre la imagen.</p>
            <p>• Doble clic en un texto para escribir el texto por defecto.</p>
          </div>

          <button onClick={save} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#0D1E79,#D203DD)' }}>
            {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Guardando…</> : <><i className="fa-solid fa-check"></i> Guardar plantilla</>}
          </button>
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        </div>
      </div>
    </div>
  )
}
