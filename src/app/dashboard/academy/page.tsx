'use client'

import Link from 'next/link'

const CARD_BG = '#0e0a1c'

const SECTIONS = [
  {
    href: '/dashboard/courses',
    image: '/academy/cursos.jpg',
    icon: 'fa-book-open',
    label: 'Cursos',
    desc: 'Aprende paso a paso con cursos exclusivos. Desbloquea cada lección completando la anterior.',
    badge: 'Más popular',
    accent: '#C026D3',
    iconBg: 'rgba(160,32,240,0.18)',
    iconBorder: 'rgba(192,38,211,0.55)',
    buttonGradient: 'linear-gradient(90deg, #8b1fb0 0%, #C026D3 55%, #e23ad9 100%)',
    buttonShadow: 'rgba(192,38,211,0.45)',
    buttonText: 'Explorar cursos',
    features: [
      { icon: 'fa-graduation-cap', text: 'Contenido exclusivo' },
      { icon: 'fa-infinity', text: 'Acceso ilimitado' },
      { icon: 'fa-award', text: 'Certificado' },
    ],
  },
  {
    href: '/dashboard/podcasts',
    image: '/academy/podcasts.jpg',
    icon: 'fa-microphone',
    label: 'Podcasts',
    desc: 'Episodios exclusivos con estrategias, casos de éxito y tendencias del mercado.',
    badge: null as string | null,
    accent: '#5b6cff',
    iconBg: 'rgba(91,108,255,0.18)',
    iconBorder: 'rgba(91,108,255,0.55)',
    buttonGradient: 'linear-gradient(90deg, #2540ff 0%, #5b6cff 55%, #7a5cff 100%)',
    buttonShadow: 'rgba(91,108,255,0.45)',
    buttonText: 'Explorar podcasts',
    features: [
      { icon: 'fa-headphones', text: 'Episodios semanales' },
      { icon: 'fa-users', text: 'Invitados expertos' },
      { icon: 'fa-gem', text: 'Contenido premium' },
    ],
  },
]

export default function AcademyPage() {
  return (
    <div className="px-4 sm:px-6 pt-6 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-xl font-bold text-white uppercase tracking-widest">MY DIAMOND Academy</h1>
        <div className="h-px w-20 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D203DD, #FF2DF7, transparent)' }} />
        <p className="text-xs text-white/30 mt-2">Selecciona el tipo de contenido que deseas ver.</p>
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {SECTIONS.map(s => (
          <Link key={s.href} href={s.href} style={{ textDecoration: 'none' }} className="academy-card">
            <div
              className="academy-card__box"
              style={{
                position: 'relative', display: 'flex', flexDirection: 'column', height: '100%',
                borderRadius: 24, overflow: 'hidden', background: CARD_BG,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {/* Imagen superior que se funde al fondo */}
              <div style={{ position: 'relative', height: 230, flexShrink: 0 }}>
                <img
                  src={s.image}
                  alt={s.label}
                  className="academy-card__img"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(180deg, rgba(14,10,28,0) 25%, rgba(14,10,28,0.55) 62%, ${CARD_BG} 100%)`,
                }} />
                {/* Badge "Más popular" */}
                {s.badge && (
                  <span style={{
                    position: 'absolute', top: 14, left: 14, display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '6px 13px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: '#fff',
                    background: 'linear-gradient(90deg, #8b1fb0, #C026D3)',
                    border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 4px 16px rgba(192,38,211,0.4)',
                  }}>
                    <i className="fa-solid fa-star" style={{ fontSize: 10 }} /> {s.badge}
                  </span>
                )}
              </div>

              {/* Contenido */}
              <div style={{ position: 'relative', padding: '0 22px 22px', marginTop: -26, display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Ícono + título */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 15, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: s.iconBg, border: `1px solid ${s.iconBorder}`,
                    boxShadow: `0 6px 18px ${s.buttonShadow}`,
                  }}>
                    <i className={`fa-solid ${s.icon}`} style={{ fontSize: 22, color: '#fff' }} />
                  </div>
                  <h2 style={{ fontWeight: 900, fontSize: 26, color: '#fff', margin: 0, letterSpacing: '0.01em' }}>{s.label}</h2>
                </div>

                {/* Descripción */}
                <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: '0 0 16px' }}>{s.desc}</p>

                {/* Features */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {s.features.map(f => (
                    <span key={f.text} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 10,
                      fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)',
                      background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.09)',
                    }}>
                      <i className={`fa-solid ${f.icon}`} style={{ fontSize: 12, color: s.accent }} /> {f.text}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <div className="academy-card__cta" style={{
                  marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  padding: '15px 20px', borderRadius: 15, fontWeight: 800, fontSize: 15, color: '#fff',
                  background: s.buttonGradient, boxShadow: `0 8px 24px ${s.buttonShadow}`,
                }}>
                  {s.buttonText}
                  <i className="fa-solid fa-arrow-right" style={{ fontSize: 14 }} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .academy-card__img { transition: transform 0.5s ease; }
        .academy-card:hover .academy-card__img { transform: scale(1.06); }
        .academy-card__box { transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease; }
        .academy-card:hover .academy-card__box { border-color: rgba(255,255,255,0.22); box-shadow: 0 14px 40px rgba(0,0,0,0.5); transform: translateY(-3px); }
        .academy-card__cta { transition: filter 0.2s ease, transform 0.2s ease; }
        .academy-card:hover .academy-card__cta { filter: brightness(1.1); }
      `}</style>
    </div>
  )
}
