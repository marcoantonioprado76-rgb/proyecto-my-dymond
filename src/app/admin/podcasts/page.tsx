'use client'

import { useEffect, useState } from 'react'
import { Mic, Plus, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react'

interface Podcast {
  id: string
  title: string
  description: string | null
  coverUrl: string | null
  embedUrl: string
  active: boolean
  order: number
  createdAt: string
}

const EMPTY = { title: '', description: '', coverUrl: '', embedUrl: '', order: '0', active: true }

export default function AdminPodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Podcast | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/podcasts')
    const d = await r.json()
    setPodcasts(d.podcasts ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setSaveError(null)
    setShowModal(true)
  }

  function openEdit(p: Podcast) {
    setEditing(p)
    setForm({
      title: p.title,
      description: p.description ?? '',
      coverUrl: p.coverUrl ?? '',
      embedUrl: p.embedUrl,
      order: String(p.order),
      active: p.active,
    })
    setSaveError(null)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.embedUrl.trim()) { setSaveError('Título y URL son obligatorios'); return }
    setSaving(true)
    setSaveError(null)
    const body = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      coverUrl: form.coverUrl.trim() || null,
      embedUrl: form.embedUrl.trim(),
      order: Number(form.order) || 0,
      active: form.active,
    }
    const url = editing ? `/api/admin/podcasts/${editing.id}` : '/api/admin/podcasts'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) { setSaveError(data.error ?? 'Error'); setSaving(false); return }
    setSaving(false)
    setShowModal(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este episodio?')) return
    setDeletingId(id)
    await fetch(`/api/admin/podcasts/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    load()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Mic size={20} className="text-green-400" />
          <h1 className="text-lg font-bold text-white">Podcasts</h1>
          <span className="text-xs text-white/35">{podcasts.length} episodio{podcasts.length !== 1 ? 's' : ''}</span>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-black" style={{ background: 'linear-gradient(135deg,#00FF88,#D203DD)' }}>
          <Plus size={14} /> Nuevo episodio
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-green-400" />
        </div>
      ) : podcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Mic size={32} className="text-white/20 mb-3" />
          <p className="text-sm text-white/40">No hay episodios todavía.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {podcasts.map(p => (
            <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {/* Cover */}
              <div style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.15)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.coverUrl ? <img src={p.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Mic size={18} className="text-green-400/50" />}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{p.title}</p>
                <p className="text-xs text-white/35 truncate mt-0.5">{p.embedUrl}</p>
              </div>
              {/* Status */}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${p.active ? 'text-green-400 bg-green-500/10' : 'text-white/30 bg-white/5'}`}>
                {p.active ? 'Activo' : 'Oculto'}
              </span>
              {/* Actions */}
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-white/8 text-white/50 hover:text-white transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors">
                  {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#0d0d15', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">{editing ? 'Editar episodio' : 'Nuevo episodio'}</h3>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>

            <div className="flex flex-col gap-4">
              {[
                { key: 'title', label: 'Título *', placeholder: 'Ep. 1 — Cómo escalar tu negocio' },
                { key: 'embedUrl', label: 'URL del episodio * (YouTube, Vimeo, Spotify)', placeholder: 'https://youtube.com/watch?v=...' },
                { key: 'coverUrl', label: 'Imagen de portada (URL)', placeholder: 'https://...' },
                { key: 'description', label: 'Descripción', placeholder: 'De qué trata este episodio...' },
                { key: 'order', label: 'Orden', placeholder: '0' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-white/50 block mb-1.5">{f.label}</label>
                  {f.key === 'description' ? (
                    <textarea
                      value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white resize-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
                    />
                  ) : (
                    <input
                      type={f.key === 'order' ? 'number' : 'text'}
                      value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
                    />
                  )}
                </div>
              ))}

              {/* Active toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Visible para usuarios</span>
                <button
                  onClick={() => setForm(p => ({ ...p, active: !p.active }))}
                  className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: form.active ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)', color: form.active ? '#00FF88' : 'rgba(255,255,255,0.35)', border: `1px solid ${form.active ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.08)'}` }}
                >
                  {form.active ? <><Check size={12} /> Activo</> : <><X size={12} /> Oculto</>}
                </button>
              </div>

              {saveError && <p className="text-xs text-red-400">{saveError}</p>}

              <div className="flex gap-3 mt-1">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-black" style={{ background: saving ? 'rgba(0,255,136,0.3)' : 'linear-gradient(135deg,#00FF88,#D203DD)', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear episodio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
