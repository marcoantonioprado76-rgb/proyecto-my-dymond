'use client'

import Link from 'next/link'

const SECTIONS = [
  {
    href: '/dashboard/courses',
    image: '/academy/cursos.jpg',
    label: 'Cursos',
    desc: 'Aprende paso a paso con cursos exclusivos. Desbloquea cada lección completando la anterior.',
  },
  {
    href: '/dashboard/podcasts',
    image: '/academy/podcasts.jpg',
    label: 'Podcasts',
    desc: 'Episodios exclusivos con estrategias, casos de éxito y tendencias del mercado.',
  },
]

export default function AcademyPage() {
  return (
    <div className="px-4 sm:px-6 pt-6 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-xl font-bold text-white uppercase tracking-widest">MY DIAMOND Academy</h1>
        <div className="h-px w-20 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D203DD, #FF2DF7, transparent)' }} />
        <p className="text-xs text-white/30 mt-2">Selecciona el tipo de contenido que deseas ver.</p>
      </div>

      {/* Botones-imagen */}
      <div className="flex flex-col gap-4 sm:gap-5">
        {SECTIONS.map(s => (
          <Link key={s.href} href={s.href} style={{ textDecoration: 'none' }} className="academy-card">
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '2 / 1',
                borderRadius: 20,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer',
              }}
            >
              {/* Imagen de fondo */}
              <img
                src={s.image}
                alt={s.label}
                className="academy-card__img"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />

              {/* Degradado para legibilidad del texto */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(8,6,20,0.10) 0%, rgba(8,6,20,0.15) 45%, rgba(8,6,20,0.82) 100%)',
              }} />

              {/* Línea de marca arriba */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: 'linear-gradient(90deg, transparent, #D203DD, #FF2DF7, transparent)',
              }} />

              {/* Contenido */}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 900, fontSize: 22, color: '#fff', margin: 0, letterSpacing: '0.02em', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
                    {s.label}
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', lineHeight: 1.45, margin: '4px 0 0', textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}>
                    {s.desc}
                  </p>
                </div>
                <span style={{
                  flexShrink: 0, width: 40, height: 40, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(210,3,221,0.85)', border: '1px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 4px 16px rgba(210,3,221,0.4)',
                }}>
                  <i className="fa-solid fa-arrow-right" style={{ fontSize: 15, color: '#fff' }} />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .academy-card__img { transition: transform 0.4s ease; }
        .academy-card:hover .academy-card__img { transform: scale(1.05); }
        .academy-card > div { transition: border-color 0.2s ease, box-shadow 0.2s ease; }
        .academy-card:hover > div { border-color: rgba(210,3,221,0.6); box-shadow: 0 8px 30px rgba(210,3,221,0.25); }
      `}</style>
    </div>
  )
}
