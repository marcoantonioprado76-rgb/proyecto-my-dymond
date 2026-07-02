'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface Podcast {
  id: string
  title: string
  description: string | null
  coverUrl: string | null
  embedUrl: string
  order: number
  createdAt: string
}

const DG = 'linear-gradient(135deg,#FF2D95 0%,#B735B8 48%,#233B8F 100%)'
const AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.aac', '.m4a']
const isDirectAudio = (url: string) => AUDIO_EXTS.some(ext => url.toLowerCase().includes(ext))
const fmt = (t: number) => {
  if (!isFinite(t) || t <= 0) return '0:00'
  const m = Math.floor(t / 60), s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Podcast | null>(null)

  const heroRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)

  useEffect(() => {
    fetch('/api/podcasts')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else { const list: Podcast[] = d.podcasts ?? []; setPodcasts(list); setSelected(list[0] ?? null) }
        setLoading(false)
      })
      .catch(() => { setError('Error al cargar podcasts'); setLoading(false) })
  }, [])

  const filtered = podcasts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))

  function choose(p: Podcast, play = false) {
    setSelected(p); setCur(0); setDur(0); setPlaying(false)
    if (typeof window !== 'undefined' && window.innerWidth < 900) heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (play) setTimeout(() => { audioRef.current?.play().catch(() => {}) }, 120)
  }
  const heroAudio = selected ? isDirectAudio(selected.embedUrl) : false
  const frac = dur ? cur / dur : 0
  const toggle = () => { const a = audioRef.current; if (!a) return; a.paused ? a.play().catch(() => {}) : a.pause() }
  const seekAt = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current; if (!a || !dur) return
    const r = e.currentTarget.getBoundingClientRect()
    a.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * dur
  }

  if (loading) return (
    <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto min-h-[60vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#B735B8', borderTopColor: 'transparent' }} />
    </div>
  )
  if (error) return <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto"><p className="text-red-500 text-sm">{error}</p></div>

  return (
    <div className="dm-page font-ui">
      <div className="px-4 sm:px-6 pt-6 pb-24 max-w-6xl mx-auto">
        <Link href="/dashboard/academy" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16, textDecoration: 'none', fontSize: 13, color: '#6B7280' }}>
          <i className="fa-solid fa-arrow-left" style={{ fontSize: 12 }} /> Volver a Academy
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ color: '#111827' }}>MY DIAMOND </span>
            <span style={{ background: DG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PODCASTS</span>
          </h1>
          <div style={{ height: 4, width: 96, borderRadius: 999, background: DG, marginTop: 10 }} />
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 12, maxWidth: 460 }}>Episodios exclusivos para aprender sobre productos, bienestar y negocio.</p>
        </div>

        {/* ── Destacado (dinámico) ── */}
        {selected && (
          <div ref={heroRef} style={{ background: '#fff', border: '1px solid #E8EAF2', borderRadius: 24, padding: 18, marginBottom: 22, boxShadow: '0 30px 70px -40px rgba(35,59,143,0.35)', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Cover */}
            <div style={{ flex: '0 0 auto', width: 300, maxWidth: '100%', margin: '0 auto', position: 'relative', borderRadius: 18, overflow: 'hidden', aspectRatio: '16/10', background: '#0a0e24' }}>
              {selected.coverUrl
                ? <img src={selected.coverUrl} alt={selected.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.3)' }}><i className="fa-solid fa-microphone" style={{ fontSize: 36 }} /></div>}
              <button onClick={heroAudio ? toggle : undefined} aria-label="play" style={{ position: 'absolute', bottom: 12, left: 12, width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: heroAudio ? 'pointer' : 'default', background: DG, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16, boxShadow: '0 8px 20px -6px rgba(183,53,184,0.8)' }}>
                <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`} style={{ marginLeft: playing ? 0 : 2 }} />
              </button>
            </div>

            {/* Info */}
            <div style={{ flex: '1 1 320px', minWidth: 280 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B735B8' }}>
                <i className="fa-solid fa-star" style={{ fontSize: 10 }} /> Episodio destacado
              </span>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#111827', margin: '6px 0 0', lineHeight: 1.15 }}>{selected.title}</h2>
              {selected.description && <p style={{ fontSize: 14, color: '#5B6472', lineHeight: 1.6, marginTop: 8 }}>{selected.description}</p>}

              {heroAudio ? (
                <div style={{ marginTop: 16 }}>
                  <audio key={selected.id} ref={audioRef} src={selected.embedUrl} preload="metadata"
                    onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
                    onTimeUpdate={e => setCur(e.currentTarget.currentTime)} onLoadedMetadata={e => setDur(e.currentTarget.duration)} />
                  {/* barra de avance */}
                  <div onClick={seekAt} style={{ height: 8, borderRadius: 999, background: '#EDEFF6', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${frac * 100}%`, background: DG, borderRadius: 999 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: '#8A93A2', fontVariantNumeric: 'tabular-nums' }}>{fmt(cur)} / {fmt(dur)}</span>
                    <button onClick={toggle} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', background: DG, color: '#fff', fontWeight: 800, fontSize: 14, boxShadow: '0 10px 24px -10px rgba(183,53,184,0.7)' }}>
                      <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-headphones'}`} /> {playing ? 'Pausar' : 'Escuchar'}
                    </button>
                  </div>
                </div>
              ) : (
                <Link href={`/dashboard/podcasts/${selected.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 12, background: DG, color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none', marginTop: 16 }}>
                  <i className="fa-solid fa-headphones" /> Escuchar
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9AA3B2', fontSize: 13 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar episodios por tema o palabra clave..."
            style={{ width: '100%', padding: '12px 16px 12px 38px', borderRadius: 14, fontSize: 14, color: '#111827', outline: 'none', background: '#fff', border: '1px solid #E8EAF2', boxSizing: 'border-box' }} />
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#9AA3B2', background: '#fff', border: '1px dashed #D5DCE6', borderRadius: 18 }}>
            {podcasts.length === 0 ? 'No hay episodios disponibles aún.' : <>Sin resultados para &quot;{search}&quot;</>}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #E8EAF2', borderRadius: 18, overflow: 'hidden' }}>
            {filtered.map((p, i) => {
              const active = selected?.id === p.id
              return (
                <div key={p.id} onClick={() => choose(p)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', cursor: 'pointer', borderTop: i === 0 ? 'none' : '1px solid #F0F2F7', background: active ? 'rgba(183,53,184,0.05)' : 'transparent', transition: 'background .15s' }}>
                  <div style={{ flex: '0 0 auto', width: 52, height: 52, borderRadius: 12, overflow: 'hidden', background: '#0a0e24', position: 'relative' }}>
                    {p.coverUrl ? <img src={p.coverUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.3)' }}><i className="fa-solid fa-microphone" style={{ fontSize: 16 }} /></div>}
                    {active && playing && <div style={{ position: 'absolute', inset: 0, background: 'rgba(183,53,184,0.35)', display: 'grid', placeItems: 'center', color: '#fff' }}><i className="fa-solid fa-volume-high" style={{ fontSize: 14 }} /></div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: 14, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                    <p style={{ fontSize: 12.5, color: '#8A93A2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{p.description ?? 'Episodio exclusivo de MY DIAMOND.'}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); choose(p, true) }}
                    style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, border: '1px solid #E3D4F0', background: active ? DG : '#fff', color: active ? '#fff' : '#B735B8', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                    <i className="fa-solid fa-headphones" /> Escuchar
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
