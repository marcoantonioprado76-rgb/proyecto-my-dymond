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
  const photoRef = useRef<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

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

      // Escala de visualización (el backing store queda en tamaño nativo para exportar a full res)
      onResize = () => {
        const parentW = canvasElRef.current?.parentElement?.clientWidth || 460
        const maxW = Math.min(460, parentW)
        const scale = Math.min(1, maxW / W)
        fcanvas.setDimensions({ width: W * scale, height: H * scale }, { cssOnly: true })
      }
      onResize()
      window.addEventListener('resize', onResize)

      // Fondo bloqueado
      fabric.Image.fromURL(template.fondoUrl, (img: any) => {
        if (disposed) return
        img.set({ left: 0, top: 0, selectable: false, evented: false })
        img.scaleToWidth(W)
        fcanvas.add(img)
        img.sendToBack()
        fcanvas.renderAll()
        setReady(true)
      }, { crossOrigin: 'anonymous' })

      // Guía del hueco de foto
      const pz = template.zonas?.photo
      if (pz) {
        const guide = new fabric.Rect({
          left: pz.x, top: pz.y, width: pz.w, height: pz.h,
          fill: 'rgba(210,3,221,0.06)', stroke: '#D203DD', strokeDashArray: [12, 9], strokeWidth: 3,
          rx: 10, ry: 10, selectable: false, evented: false,
        })
        ;(guide as any)._guide = true
        fcanvas.add(guide)
      }

      // Cajas de texto editables (doble clic para editar)
      for (const tz of (template.zonas?.texts || [])) {
        const it = new fabric.Textbox(tz.text || 'Tu texto', {
          left: tz.x, top: tz.y,
          width: tz.w || Math.round(template.ancho * 0.8),
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
    })()

    return () => {
      disposed = true
      window.removeEventListener('resize', onResize)
      try { fcanvas?.dispose() } catch {}
      fcanvasRef.current = null
      photoRef.current = null
    }
  }, [template])

  // 3) Subir foto del usuario (se procesa en el navegador, NO se sube al servidor)
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
        const zone = template.zonas?.photo || { x: 0, y: 0, w: template.ancho, h: template.alto }
        const scale = Math.max(zone.w / img.width, zone.h / img.height)
        img.set({
          left: zone.x + zone.w / 2, top: zone.y + zone.h / 2,
          originX: 'center', originY: 'center', scaleX: scale, scaleY: scale,
        })
        img.clipPath = new fabric.Rect({
          left: zone.x, top: zone.y, width: zone.w, height: zone.h,
          absolutePositioned: true, rx: 10, ry: 10,
        })
        photoRef.current = img
        fcanvas.add(img)
        img.moveTo(1) // arriba del fondo, debajo de guía/textos
        fcanvas.setActiveObject(img)
        fcanvas.renderAll()
      })
    }
    reader.readAsDataURL(file)
    e.target.value = '' // permite re-subir el mismo archivo
  }

  // 4) Descargar a tamaño nativo (1080x1350) en JPG o PNG
  function download(format: 'jpeg' | 'png') {
    const fcanvas = fcanvasRef.current
    if (!fcanvas || !template) return
    fcanvas.discardActiveObject()
    const guides = fcanvas.getObjects().filter((o: any) => o._guide)
    guides.forEach((g: any) => g.set('visible', false))
    fcanvas.renderAll()
    const dataUrl = fcanvas.toDataURL({ format, quality: 0.95, multiplier: 1 })
    guides.forEach((g: any) => g.set('visible', true))
    fcanvas.renderAll()
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
        <Link href="/dashboard/recursos" className="text-[#D203DD] underline text-sm">Volver a Recursos</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/recursos" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
          <i className="fa-solid fa-arrow-left text-white/70 text-sm"></i>
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg font-black text-white truncate">{template?.nombre}</h1>
          <p className="text-xs text-white/40 capitalize">{template?.categoria}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
        {/* Lienzo */}
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3 flex justify-center overflow-hidden">
          <canvas ref={canvasElRef} className="rounded-lg max-w-full" style={{ touchAction: 'none' }} />
        </div>

        {/* Controles */}
        <div className="w-full md:w-64 space-y-3">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhotoChange} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={!ready}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#0D1E79,#D203DD)' }}>
            <i className="fa-solid fa-image"></i> {photoRef.current ? 'Cambiar foto' : 'Subir foto'}
          </button>

          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 text-[11px] text-white/45 leading-relaxed">
            <p className="font-bold text-white/70 mb-1.5"><i className="fa-solid fa-lightbulb text-amber-400 mr-1"></i> Cómo editar</p>
            <p>• Arrastrá/escalá tu foto dentro del recuadro.</p>
            <p>• <b>Doble clic</b> en un texto para escribir el tuyo.</p>
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
