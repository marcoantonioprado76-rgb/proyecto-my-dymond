'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface TextZone {
  id: string
  x: number; y: number; w: number
  text?: string
  fontSize?: number
  fontFamily?: string
  fill?: string
  align?: 'left' | 'center' | 'right'
  fontWeight?: string | number
}
interface Template {
  id: string
  nombre: string
  categoria: string
  ancho: number
  alto: number
  fondoUrl: string
  zonas: { photo?: { x: number; y: number; w: number; h: number } | null; texts: TextZone[] }
}

export default function UserEditor({ templateId }: { templateId: string }) {
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fcanvasRef = useRef<any>(null)
  const overlayRef = useRef<any>(null) // imagen del flyer (encima)
  const photoRef = useRef<any>(null)   // foto del usuario (al fondo)
  const fileRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)

  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [hasPhoto, setHasPhoto] = useState(false)
  const [availW, setAvailW] = useState(360)
  const [win, setWin] = useState({ w: 1200, h: 800 })
  const [expanded, setExpanded] = useState(false)

  // 1) Cargar la plantilla
  useEffect(() => {
    fetch(`/api/recursos/templates/${templateId}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setTemplate(d.template) })
      .catch(() => setError('No se pudo cargar la plantilla'))
      .finally(() => setLoading(false))
  }, [templateId])

  // 2) Inicializar Fabric cuando hay plantilla
  useEffect(() => {
    if (!template || !canvasElRef.current) return
    let disposed = false
    let fcanvas: any
    let onResize = () => {}

    ;(async () => {
      const mod: any = await import('fabric')
      const fabric = mod.fabric || mod.default || mod
      if (disposed || !canvasElRef.current) return

      const W = template.ancho, H = template.alto
      fcanvas = new fabric.Canvas(canvasElRef.current, {
        width: W, height: H, backgroundColor: '#0b0b16', preserveObjectStacking: true,
      })
      fcanvasRef.current = fcanvas

      // El tamaño visual lo controla el CSS (.rec-canvas-wrap → proporcional y compacto).
      // Solo recalculamos el offset para que el puntero mapee bien sobre el lienzo escalado.
      onResize = () => { try { fcanvas.calcOffset() } catch {} }
      setTimeout(onResize, 120)
      window.addEventListener('resize', onResize)

      // FLYER (diseño) — va ENCIMA y bloqueado. evented:false → los clics atraviesan
      // hacia la foto del fondo para poder seleccionarla. La zona transparente del PNG
      // deja ver la foto del usuario.
      fabric.Image.fromURL(template.fondoUrl, (img: any) => {
        if (disposed) return
        img.set({ left: 0, top: 0, selectable: false, evented: false })
        img.scaleToWidth(W)
        overlayRef.current = img
        fcanvas.add(img)
        // textos encima del flyer
        for (const tz of (template.zonas?.texts || [])) {
          const it = new fabric.Textbox(tz.text || 'Tu texto', {
            left: tz.x, top: tz.y,
            width: tz.w || Math.round(W * 0.8),
            fontSize: tz.fontSize || 48,
            fontFamily: tz.fontFamily || 'Archivo',
            fill: tz.fill || '#ffffff',
            textAlign: tz.align || 'left',
            fontWeight: (tz.fontWeight as any) || '700',
            editable: true,
          })
          fcanvas.add(it)
        }
        fcanvas.renderAll()
        setReady(true)
      }, { crossOrigin: 'anonymous' })
    })()

    return () => {
      disposed = true
      window.removeEventListener('resize', onResize)
      try { fcanvas?.dispose() } catch {}
      fcanvasRef.current = null
      photoRef.current = null
      overlayRef.current = null
    }
  }, [template])

  // Medir ancho disponible + tamaño de ventana (para el lienzo y el modo ampliado)
  useEffect(() => {
    const measure = () => {
      if (measureRef.current) setAvailW(measureRef.current.clientWidth)
      setWin({ w: window.innerWidth, h: window.innerHeight })
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' && measureRef.current ? new ResizeObserver(measure) : null
    if (ro && measureRef.current) ro.observe(measureRef.current)
    window.addEventListener('resize', measure)
    return () => { window.removeEventListener('resize', measure); ro?.disconnect() }
  }, [template])

  // Al ampliar/cambiar tamaño: bloquear scroll, Escape para cerrar, y recalcular el offset de Fabric
  useEffect(() => {
    const t = setTimeout(() => { try { fcanvasRef.current?.calcOffset() } catch {} }, 140)
    if (!expanded) return () => clearTimeout(t)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [expanded, availW, win])

  // 3) Subir foto del usuario → va AL FONDO (detrás del flyer), seleccionable/movible/escalable.
  //    Se procesa en el navegador, NO se sube al servidor.
  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !template) return
    const reader = new FileReader()
    reader.onload = async () => {
      const mod: any = await import('fabric')
      const fabric = mod.fabric || mod.default || mod
      const fcanvas = fcanvasRef.current
      if (!fcanvas) return
      fabric.Image.fromURL(reader.result as string, (img: any) => {
        if (photoRef.current) { fcanvas.remove(photoRef.current); photoRef.current = null }
        // posición/escala inicial: cubrir la zona marcada por el admin (o todo el lienzo)
        const zone = template.zonas?.photo || { x: 0, y: 0, w: template.ancho, h: template.alto }
        const scale = Math.max(zone.w / img.width, zone.h / img.height)
        img.set({
          left: zone.x + zone.w / 2, top: zone.y + zone.h / 2,
          originX: 'center', originY: 'center', scaleX: scale, scaleY: scale,
          selectable: true, hasControls: true,
        })
        photoRef.current = img
        fcanvas.add(img)
        img.sendToBack()              // ← AL FONDO: el flyer queda encima
        fcanvas.setActiveObject(img)  // seleccionada para moverla de una
        fcanvas.renderAll()
        setHasPhoto(true)
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // 4) Descargar al tamaño real del flyer en JPG o PNG
  function download(format: 'jpeg' | 'png') {
    const fcanvas = fcanvasRef.current
    if (!fcanvas || !template) return
    fcanvas.discardActiveObject()
    fcanvas.renderAll()
    const dataUrl = fcanvas.toDataURL({ format, quality: 0.95, multiplier: 1 })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${template.nombre.replace(/\s+/g, '-').toLowerCase()}.${format === 'jpeg' ? 'jpg' : 'png'}`
    document.body.appendChild(a); a.click(); a.remove()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-32 text-white/40"><i className="fa-solid fa-spinner fa-spin text-2xl"></i></div>
  }
  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-24">
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <Link href="/dashboard/recursos/flyers" className="text-[#D203DD] underline text-sm">Volver a Recursos</Link>
      </div>
    )
  }

  // Tamaño visible del lienzo. Inline: compacto (como pediste). Ampliado: lo más grande que entre en pantalla.
  const ratio = template ? template.ancho / template.alto : 0.8
  const inlineW = Math.min(340, Math.max(220, availW - 24))
  const expandedW = Math.min(win.w - 32, Math.round((win.h - 150) * ratio), 1200)
  const canvasW = expanded ? Math.max(260, expandedW) : inlineW

  return (
    <div ref={measureRef} className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-5">
        <Link href="/dashboard/recursos/flyers" className="w-9 h-9 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
          <i className="fa-solid fa-arrow-left text-white/70 text-sm"></i>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black text-white truncate">{template?.nombre}</h1>
          <p className="text-xs text-white/40 capitalize">{template?.categoria}</p>
        </div>
        <button onClick={() => setExpanded(true)} disabled={!ready}
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50">
          <i className="fa-solid fa-up-right-and-down-left-from-center"></i><span className="hidden sm:inline">Ampliar</span>
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhotoChange} className="hidden" />

      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Lienzo — el marco abraza el lienzo (sin recuadro negro). Al ampliar pasa a pantalla completa. */}
        <div className={expanded
          ? 'fixed inset-0 z-[80] bg-[#07070d]/98 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-3'
          : 'rounded-2xl border border-white/10 bg-black/30 p-3 w-fit max-w-full mx-auto md:mx-0'}>
          {expanded && (
            <div className="w-full max-w-3xl flex items-center justify-between gap-3 shrink-0">
              <p className="text-sm font-bold text-white truncate">{template?.nombre}</p>
              <button onClick={() => setExpanded(false)}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all flex items-center justify-center shrink-0">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}
          <div className="rec-canvas-wrap" style={{ width: canvasW, maxWidth: '100%', aspectRatio: `${template?.ancho} / ${template?.alto}` }}>
            <canvas ref={canvasElRef} className="rounded-lg" style={{ touchAction: 'none' }} />
          </div>
          {expanded && (
            <div className="flex items-center gap-2 flex-wrap justify-center shrink-0">
              <button onClick={() => fileRef.current?.click()} disabled={!ready}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#0D1E79,#D203DD)' }}>
                <i className="fa-solid fa-image"></i> {hasPhoto ? 'Cambiar foto' : 'Subir foto'}
              </button>
              <button onClick={() => download('jpeg')} disabled={!ready}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-black transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#00FF9D,#00B4FF)' }}>
                <i className="fa-solid fa-download"></i> JPG
              </button>
              <button onClick={() => download('png')} disabled={!ready}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-white border border-white/15 bg-white/5 transition-all active:scale-95 disabled:opacity-50">
                <i className="fa-solid fa-download"></i> PNG
              </button>
            </div>
          )}
        </div>

        {/* Controles (modo en línea) */}
        <div className="w-full md:w-64 md:shrink-0 space-y-3">
          <button onClick={() => fileRef.current?.click()} disabled={!ready}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#0D1E79,#D203DD)' }}>
            <i className="fa-solid fa-image"></i> {hasPhoto ? 'Cambiar foto' : 'Subir foto'}
          </button>

          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 text-[11px] text-white/45 leading-relaxed">
            <p className="font-bold text-white/70 mb-1.5"><i className="fa-solid fa-lightbulb text-amber-400 mr-1"></i> Cómo editar</p>
            <p>• Tu foto va <b>detrás</b> del diseño: arrastrala y escalala para acomodarla.</p>
            <p>• <b>Doble clic</b> en un texto para escribir el tuyo.</p>
            <p>• Usa <b>Ampliar</b> para editar más grande.</p>
            <p>• Tu foto se procesa en tu navegador (no se sube).</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => download('jpeg')} disabled={!ready}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-black text-black transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#00FF9D,#00B4FF)' }}>
              <i className="fa-solid fa-download"></i> JPG
            </button>
            <button onClick={() => download('png')} disabled={!ready}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-black text-white border border-white/15 bg-white/5 transition-all active:scale-95 disabled:opacity-50">
              <i className="fa-solid fa-download"></i> PNG
            </button>
          </div>
          <p className="text-[10px] text-white/30 text-center">Descarga en {template?.ancho}×{template?.alto}px</p>
        </div>
      </div>
    </div>
  )
}
