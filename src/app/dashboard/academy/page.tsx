'use client'

import Link from 'next/link'

const SECTIONS = [
  {
    href: '/dashboard/courses',
    icon: 'fa-solid fa-book-open',
    label: 'Cursos',
    desc: 'Aprende con cursos exclusivos paso a paso. Desbloquea cada lección completando la anterior.',
    color: '#D203DD',
    colorBg: 'rgba(210,3,221,0.08)',
    colorBorder: 'rgba(210,3,221,0.2)',
  },
  {
    href: '/dashboard/podcasts',
    icon: 'fa-solid fa-microphone',
    label: 'Podcasts',
    desc: 'Escucha episodios exclusivos con estrategias, casos de éxito y tendencias del mercado.',
    color: '#00FF88',
    colorBg: 'rgba(0,255,136,0.06)',
    colorBorder: 'rgba(0,255,136,0.18)',
  },
]

export default function AcademyPage() {
  return (
    <div className="px-4 sm:px-6 pt-6 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white uppercase tracking-widest">MY DIAMOND Academy</h1>
        <div className="h-px w-20 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D203DD, #FF2DF7, transparent)' }} />
        <p className="text-xs text-white/30 mt-2">Selecciona el tipo de contenido que deseas ver.</p>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-4">
        {SECTIONS.map(s => (
          <Link
            key={s.href}
            href={s.href}
            style={{ textDecoration: 'none' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '22px 24px',
                borderRadius: 18,
                background: s.colorBg,
                border: `1px solid ${s.colorBorder}`,
                transition: 'transform 0.15s, border-color 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.015)'; (e.currentTarget as HTMLDivElement).style.borderColor = s.color }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLDivElement).style.borderColor = s.colorBorder }}
            >
              {/* Icon */}
              <div style={{
                width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${s.color}18`, border: `1px solid ${s.color}40`,
              }}>
                <i className={s.icon} style={{ fontSize: 22, color: s.color }} />
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
              </div>

              {/* Arrow */}
              <i className="fa-solid fa-chevron-right" style={{ fontSize: 14, color: s.color, flexShrink: 0 }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
