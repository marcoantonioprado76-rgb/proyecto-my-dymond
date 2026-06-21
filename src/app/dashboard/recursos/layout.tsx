'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/dashboard/recursos/flyers', label: 'Flyers', icon: 'fa-wand-magic-sparkles' },
  { href: '/dashboard/recursos/presentaciones', label: 'Presentaciones', icon: 'fa-display' },
  { href: '/dashboard/recursos/libros', label: 'Libros', icon: 'fa-book-open' },
]

export default function RecursosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Las pestañas se muestran en las páginas de lista; en el editor/visor ([id]) no,
  // para que tengan su propia vista enfocada con su botón "volver".
  const isList = TABS.some(t => pathname === t.href) || pathname === '/dashboard/recursos'

  if (!isList) return <>{children}</>

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6">
      <h1 className="text-2xl font-black text-white flex items-center gap-2">
        <i className="fa-solid fa-folder-open text-[#D203DD]"></i> Recursos
      </h1>
      <p className="text-sm text-white/40 mt-0.5 mb-4">Plantillas editables, presentaciones y libros.</p>

      <div className="flex gap-1 border-b border-white/10 overflow-x-auto">
        {TABS.map(t => {
          const active = pathname.startsWith(t.href)
          return (
            <Link key={t.href} href={t.href}
              className={`shrink-0 px-4 py-2.5 text-sm font-bold flex items-center gap-2 border-b-2 -mb-px transition-all ${
                active ? 'border-[#D203DD] text-white' : 'border-transparent text-white/40 hover:text-white/70'
              }`}>
              <i className={`fa-solid ${t.icon}`}></i> {t.label}
            </Link>
          )
        })}
      </div>

      <div className="py-6">{children}</div>
    </div>
  )
}
