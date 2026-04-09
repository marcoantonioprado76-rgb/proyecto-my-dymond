'use client'

import { useEffect, useState } from 'react'
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

function getEmbedUrl(url: string): string {
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?badge=0&autopause=0`
  // Spotify
  if (url.includes('spotify.com')) {
    return url.replace('spotify.com/', 'spotify.com/embed/').replace('/episode/', '/episode/')
  }
  return url
}

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Podcast | null>(null)

  useEffect(() => {
    fetch('/api/podcasts')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setPodcasts(d.podcasts ?? [])
        if (d.podcasts?.length > 0) setSelected(d.podcasts[0])
        setLoading(false)
      })
      .catch(() => { setError('Error al cargar podcasts'); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto min-h-[60vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#00FF88', borderTopColor: 'transparent' }} />
    </div>
  )

  if (error) return (
    <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto">
      <Link href="/dashboard/academy" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← Volver a Academy</Link>
      <p className="text-red-400 text-sm mt-4">{error}</p>
    </div>
  )

  return (
    <div className="px-4 sm:px-6 pt-6 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/academy" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          ← Academy
        </Link>
        <h1 className="text-xl font-bold text-white uppercase tracking-widest">Podcasts</h1>
        <div className="h-px w-16 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #00FF88, transparent)' }} />
      </div>

      {podcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <i className="fa-solid fa-microphone" style={{ fontSize: 22, color: '#00FF88' }} />
          </div>
          <p className="text-sm text-white/40">No hay episodios disponibles aún.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Player activo */}
          {selected && (
            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(0,255,136,0.2)' }}>
              <div style={{ background: 'rgba(0,255,136,0.06)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fa-solid fa-microphone" style={{ fontSize: 13, color: '#00FF88' }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, flex: 1 }}>{selected.title}</p>
              </div>
              <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
                <iframe
                  key={selected.id}
                  src={getEmbedUrl(selected.embedUrl)}
                  title={selected.title}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                />
              </div>
              {selected.description && (
                <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.2)' }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>{selected.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Lista de episodios */}
          {podcasts.length > 1 && (
            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Todos los episodios
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {podcasts.map((ep, idx) => {
                  const isActive = ep.id === selected?.id
                  return (
                    <button
                      key={ep.id}
                      onClick={() => setSelected(ep)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px',
                        background: isActive ? 'rgba(0,255,136,0.08)' : 'transparent',
                        borderLeft: isActive ? '3px solid #00FF88' : '3px solid transparent',
                        borderRight: 'none', borderTop: 'none',
                        borderBottom: idx < podcasts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isActive ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${isActive ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        fontSize: 11, fontWeight: 700,
                        color: isActive ? '#00FF88' : 'rgba(255,255,255,0.4)',
                      }}>
                        {isActive ? <i className="fa-solid fa-play" style={{ fontSize: 9 }} /> : idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ep.title}
                        </p>
                        {ep.description && (
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ep.description}
                          </p>
                        )}
                      </div>
                      {isActive && <i className="fa-solid fa-volume-high" style={{ fontSize: 12, color: '#00FF88', flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
