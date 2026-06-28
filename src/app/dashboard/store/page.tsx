'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface EventTicketType { id: string; name: string; price: number; available: number | null; soldOut: boolean }
interface EventItem { id: string; title: string; description: string; image?: string | null; date?: string | null; location?: string | null; ticketTypes: EventTicketType[] }

interface StoreItem {
  id: string
  title: string
  description: string
  category: string
  price: number
  images: string[]
  stock: number
  variants: { name: string; options: string[] }[]
}

function useCartCount() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const update = () => {
      try {
        const c = JSON.parse(localStorage.getItem('store_cart') ?? '[]')
        setCount(c.reduce((s: number, i: any) => s + (i.quantity ?? 1), 0))
      } catch { setCount(0) }
    }
    update()
    window.addEventListener('storage', update)
    window.addEventListener('cart_updated', update)
    return () => { window.removeEventListener('storage', update); window.removeEventListener('cart_updated', update) }
  }, [])
  return count
}

export default function StorePage() {
  const [items, setItems] = useState<StoreItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('Todas')
  const [loading, setLoading] = useState(true)
  const cartCount = useCartCount()

  // Events/tickets
  const [events, setEvents] = useState<EventItem[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)

  // Quick-add modal
  const [quickItem, setQuickItem] = useState<StoreItem | null>(null)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch('/api/store/items')
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setCategories(d.categories ?? []); setLoading(false) })
      .catch(() => setLoading(false))

    fetch('/api/entradas/list')
      .then(r => r.json())
      .then(d => { setEvents(d.events ?? []); setEventsLoading(false) })
      .catch(() => setEventsLoading(false))
  }, [])

  const handleCategory = (cat: string) => {
    setActiveCategory(cat)
    const url = cat === 'Todas' ? '/api/store/items' : `/api/store/items?category=${encodeURIComponent(cat)}`
    fetch(url).then(r => r.json()).then(d => setItems(d.items ?? [])).catch(() => {})
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const addToCart = (item: StoreItem, variants: Record<string, string>) => {
    try {
      const cart = JSON.parse(localStorage.getItem('store_cart') ?? '[]')
      const key = JSON.stringify({ id: item.id, variants })
      const idx = cart.findIndex((c: any) => JSON.stringify({ id: c.itemId, variants: c.selectedVariants }) === key)
      if (idx >= 0) {
        cart[idx].quantity = Math.min(cart[idx].quantity + 1, item.stock)
      } else {
        cart.push({ itemId: item.id, title: item.title, price: item.price, image: item.images[0] ?? null, quantity: 1, selectedVariants: variants })
      }
      localStorage.setItem('store_cart', JSON.stringify(cart))
      window.dispatchEvent(new Event('cart_updated'))
      showToast('¡Agregado al carrito!')
    } catch {
      showToast('Error al agregar')
    }
  }

  const handleQuickAdd = (e: React.MouseEvent, item: StoreItem) => {
    e.preventDefault()
    e.stopPropagation()
    if (item.variants.length === 0) {
      addToCart(item, {})
    } else {
      setSelectedVariants({})
      setQuickItem(item)
    }
  }

  const confirmQuickAdd = () => {
    if (!quickItem) return
    for (const v of quickItem.variants) {
      if (!selectedVariants[v.name]) { showToast(`Selecciona ${v.name}`); return }
    }
    addToCart(quickItem, selectedVariants)
    setQuickItem(null)
  }

  return (
    <div className="dm-page font-ui">
    <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-10 max-w-screen-xl mx-auto">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.startsWith('¡') ? 'rgba(0,255,136,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${toast.startsWith('¡') ? 'rgba(0,255,136,0.3)' : 'rgba(239,68,68,0.3)'}`, color: toast.startsWith('¡') ? '#FF096C' : '#ef4444', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#111827] uppercase tracking-widest">Tienda</h1>
          <div className="h-px w-20 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D203DD, #FF2DF7, transparent)' }} />
          <p className="text-xs text-[#6B7280] mt-2">Productos exclusivos de MY DIAMOND.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/dashboard/store/my-orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#FF096C', background: 'rgba(255,9,108,0.1)', border: '1px solid #E4E9F0', borderRadius: 8, padding: '7px 14px', textDecoration: 'none' }}>
            📦 Mis pedidos
          </Link>
          <Link href="/dashboard/store/cart" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#111827', background: '#F0F3F7', border: '1px solid #E4E9F0', borderRadius: 8, padding: '7px 14px', textDecoration: 'none' }}>
            🛒 Carrito
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: -7, right: -7, background: '#FF2DF7', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 99, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Category pills */}
      {!loading && categories.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {['Todas', ...categories].map(cat => (
            <button key={cat} onClick={() => handleCategory(cat)}
              style={{ padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', background: 'transparent',
                borderColor: activeCategory === cat ? 'rgba(210,3,221,0.5)' : '#E4E9F0',
                color: activeCategory === cat ? '#D203DD' : '#6B7280' }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-[#FF096C] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-sm text-[#6B7280]">No hay productos disponibles{activeCategory !== 'Todas' ? ` en "${activeCategory}"` : ''}.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(item => {
            const img = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null
            const outOfStock = item.stock === 0
            return (
              <div key={item.id} style={{ borderRadius: 14, overflow: 'hidden', background: 'radial-gradient(120% 75% at 50% -10%, rgba(183,53,184,0.16), rgba(255,255,255,0) 60%), linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 18px 40px -24px rgba(8,22,36,0.6), inset 0 1px 0 rgba(255,255,255,0.05)', opacity: outOfStock ? 0.6 : 1, transition: 'border-color 0.2s', display: 'flex', flexDirection: 'column' }}>
                {/* Image — click goes to detail */}
                <Link href={`/dashboard/store/${item.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ aspectRatio: '1/1', background: 'rgba(210,3,221,0.04)', position: 'relative', overflow: 'hidden' }}>
                    {img ? (
                      <img src={img} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg className="w-10 h-10 opacity-20" viewBox="0 0 24 24" fill="none" stroke="#D203DD" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" /></svg>
                      </div>
                    )}
                    {outOfStock && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.78)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>No disponible</span>
                      </div>
                    )}
                    <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.78)', background: 'rgba(0,0,0,0.4)', borderRadius: 6, padding: '2px 7px' }}>
                      {item.category}
                    </span>
                  </div>
                </Link>

                {/* Info + buttons */}
                <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div>
                    <p style={{ fontWeight: 700, color: '#fff', marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="text-[11px] sm:text-sm">{item.title}</p>
                    <span style={{ fontWeight: 800, color: '#F5A623' }} className="text-[11px] sm:text-sm">{item.price.toFixed(2)} USDT</span>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 5, marginTop: 'auto' }}>
                    <Link href={`/dashboard/store/${item.id}`}
                      style={{ flex: 1, padding: '5px 0', borderRadius: 7, fontSize: 11, fontWeight: 600, textAlign: 'center', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      Ver
                    </Link>
                    <button
                      onClick={e => handleQuickAdd(e, item)}
                      disabled={outOfStock}
                      style={{ flex: 2, padding: '5px 0', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: outOfStock ? 'not-allowed' : 'pointer', border: 'none', background: outOfStock ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', color: outOfStock ? 'rgba(255,255,255,0.42)' : '#fff' }}>
                      {outOfStock ? 'Agotado' : '🛒 Agregar'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Events / Entradas section */}
      {(eventsLoading || events.length > 0) && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 900, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.12em' }}>🎟 Entradas</h2>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(210,3,221,0.4), transparent)' }} />
          </div>
          {eventsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D203DD', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map(ev => {
                const allSoldOut = ev.ticketTypes.every(t => t.soldOut)
                const formatDate = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                return (
                  <Link key={ev.id} href={`/entradas/${ev.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: 'radial-gradient(120% 75% at 50% -10%, rgba(183,53,184,0.16), rgba(255,255,255,0) 60%), linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', boxShadow: '0 18px 40px -24px rgba(8,22,36,0.6), inset 0 1px 0 rgba(255,255,255,0.05)', transition: 'border-color 0.2s', opacity: allSoldOut ? 0.6 : 1, display: 'flex', flexDirection: 'column' }}>
                      {ev.image && (
                        <div style={{ aspectRatio: '16/7', overflow: 'hidden' }}>
                          <img src={ev.image} alt={ev.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <p style={{ fontWeight: 800, color: '#fff', fontSize: 13, margin: '0 0 4px', lineHeight: 1.3 }}>{ev.title}</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {ev.date && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>📅 {formatDate(ev.date)}</span>}
                            {ev.location && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>📍 {ev.location}</span>}
                          </div>
                        </div>
                        {/* Ticket types */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {ev.ticketTypes.map(tt => (
                            <div key={tt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                              <span style={{ fontSize: 11, color: tt.soldOut ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.78)', fontWeight: 600 }}>{tt.name}{tt.soldOut ? ' — Agotado' : ''}</span>
                              <span style={{ fontSize: 11, fontWeight: 800, color: tt.soldOut ? 'rgba(255,255,255,0.42)' : '#F5A623' }}>${tt.price.toFixed(2)} USDT</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                          <div style={{ padding: '8px 0', borderRadius: 9, textAlign: 'center', fontSize: 12, fontWeight: 700, background: allSoldOut ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', color: allSoldOut ? 'rgba(255,255,255,0.42)' : '#fff' }}>
                            {allSoldOut ? 'Agotado' : '🎟 Comprar entrada'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick-add variant modal */}
      {quickItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,11,20,0.55)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setQuickItem(null)}>
          <div style={{ background: 'radial-gradient(120% 80% at 50% -10%, rgba(183,53,184,0.16), rgba(255,255,255,0) 58%), linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 60px -24px rgba(8,22,36,0.7), inset 0 1px 0 rgba(255,255,255,0.05)', borderRadius: 18, width: '100%', maxWidth: 360, padding: 24 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
              {quickItem.images[0] && (
                <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                  <img src={quickItem.images[0]} alt={quickItem.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div>
                <p style={{ fontWeight: 700, color: '#fff', fontSize: 14, lineHeight: 1.3 }}>{quickItem.title}</p>
                <p style={{ fontWeight: 800, color: '#F5A623', fontSize: 15, marginTop: 4 }}>{quickItem.price.toFixed(2)} USDT</p>
              </div>
            </div>

            {quickItem.variants.map(v => (
              <div key={v.name} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{v.name}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {v.options.map(opt => (
                    <button key={opt} onClick={() => setSelectedVariants(p => ({ ...p, [v.name]: opt }))}
                      style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid', background: 'transparent',
                        borderColor: selectedVariants[v.name] === opt ? '#FF2DF7' : 'rgba(255,255,255,0.1)',
                        color: selectedVariants[v.name] === opt ? '#FF2DF7' : 'rgba(255,255,255,0.55)' }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={() => setQuickItem(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={confirmQuickAdd}
                style={{ flex: 2, padding: '10px 0', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                🛒 Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
