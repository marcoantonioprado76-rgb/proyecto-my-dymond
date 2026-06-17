'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ShoppingBag, Store, Search, Menu, X, ChevronRight } from 'lucide-react'
import { CartProvider, useCart } from './CartContext'
import { CartDrawer } from './CartDrawer'
import { LandingViewClient } from './LandingViewClient'
import { ProductCard } from './ProductCard'
import { resolveStoreTheme } from './theme'

export function StoreViewClient({ store, products, categories, phone, paymentQrUrl }: any) {
    const theme = resolveStoreTheme(store?.themeConfig)
    return (
        <CartProvider>
            {/* Tipografía del tema (Next la sube al <head>) */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="stylesheet" href={theme.fontHref} />
            <StoreViewContent
                store={store}
                products={products}
                categories={categories}
                phone={phone}
                paymentQrUrl={paymentQrUrl}
                theme={theme}
            />
        </CartProvider>
    )
}

function StoreViewContent({ store, products, categories, phone, paymentQrUrl, theme }: any) {
    const [isCartOpen, setIsCartOpen] = useState(false)
    const { totalItems, totalPoints, totalPrice, cart } = useCart()

    return (
        <div style={{
            ...theme.vars,
            minHeight: '100vh',
            background: 'var(--st-bg)',
            color: 'var(--st-text)',
            fontFamily: 'var(--st-font)',
        }}>
            {store.type === 'LANDING' ? (
                <LandingViewClient
                    store={store}
                    product={products[0]}
                    phone={phone}
                    onOpenCart={() => setIsCartOpen(true)}
                />
            ) : (
                <CatalogView
                    store={store}
                    products={products}
                    categories={categories}
                    phone={phone}
                    onOpenCart={() => setIsCartOpen(true)}
                    totalItems={totalItems}
                    totalPoints={totalPoints}
                    totalPrice={totalPrice}
                    cart={cart}
                />
            )}
            <CartDrawer
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                storeWhatsapp={phone}
                paymentQrUrl={paymentQrUrl}
                isMLM={store.type === 'NETWORK_MARKETING'}
                storeName={store.name}
            />
        </div>
    )
}

function BannerCarousel({ banners }: { banners: string[] }) {
    const [idx, setIdx] = useState(0)

    useEffect(() => {
        if (banners.length < 2) return
        const t = setInterval(() => setIdx(i => (i + 1) % banners.length), 4000)
        return () => clearInterval(t)
    }, [banners.length])

    if (!banners.length) return null

    return (
        <div style={{ position: 'relative', borderRadius: 'var(--st-radius)', overflow: 'hidden', height: 190, marginBottom: 24, border: '1px solid var(--st-border)', boxShadow: 'var(--st-card-shadow)' }}>
            {banners.map((url, i) => (
                <img
                    key={url}
                    src={url}
                    alt={`banner-${i}`}
                    style={{
                        position: 'absolute', inset: 0, width: '100%', height: '100%',
                        objectFit: 'cover',
                        opacity: i === idx ? 1 : 0,
                        transition: 'opacity 0.8s ease',
                    }}
                />
            ))}
            {/* Degradado inferior para legibilidad */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent 55%)', pointerEvents: 'none' }} />
            {banners.length > 1 && (
                <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
                    {banners.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIdx(i)}
                            aria-label={`Banner ${i + 1}`}
                            style={{
                                width: i === idx ? 22 : 6, height: 6,
                                borderRadius: 9999, border: 'none', cursor: 'pointer',
                                background: i === idx ? 'var(--st-primary)' : 'rgba(255,255,255,0.55)',
                                transition: 'all 0.3s ease', padding: 0,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function CatalogView({ store, products, categories, phone, onOpenCart, totalItems, totalPoints, totalPrice, cart }: any) {
    const isMLM = store.type === 'NETWORK_MARKETING'
    const [activeCategory, setActiveCategory] = useState('Todos')
    const [searchQuery, setSearchQuery] = useState('')
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const categoryList = ['Todos', ...Object.keys(categories)]

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        if (menuOpen) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [menuOpen])

    const currencySymbol = (currency: string) =>
        currency === 'PEN' ? 'S/' : currency === 'BOB' ? 'Bs' : currency === 'VES' ? 'Bs.S' : currency === 'EUR' ? '€' : '$'

    return (
        <div>
            {/* ── HEADER ── */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'var(--st-surface)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid var(--st-border)',
            }}>
                {/* Línea de acento superior */}
                <div style={{ height: 3, background: 'linear-gradient(90deg, var(--st-primary), rgba(var(--st-primary-rgb),0.35), transparent)' }} />
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Marca */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        {store.logoUrl
                            ? <img src={store.logoUrl} alt={store.name} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--st-card-border)' }} />
                            : <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(var(--st-primary-rgb),0.12)', border: '1px solid var(--st-card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Store size={16} style={{ color: 'var(--st-primary)' }} />
                            </div>
                        }
                        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--st-text)', letterSpacing: '-0.01em' }}>{store.name}</span>
                    </div>

                    {/* Carrito */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isMLM && totalPoints > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: 8, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--st-muted)' }}>PV</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--st-primary)' }}>+{totalPoints}</span>
                            </div>
                        )}
                        <button onClick={onOpenCart} aria-label="Carrito" style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 15px',
                            background: 'rgba(var(--st-primary-rgb),0.12)', border: '1px solid rgba(var(--st-primary-rgb),0.32)', borderRadius: 12,
                            color: 'var(--st-text)', cursor: 'pointer', position: 'relative',
                        }}>
                            <div style={{ position: 'relative' }}>
                                <ShoppingBag size={19} style={{ color: 'var(--st-primary)' }} />
                                {totalItems > 0 && (
                                    <span style={{
                                        position: 'absolute', top: -8, right: -8,
                                        background: 'var(--st-price)', color: '#04210f', fontSize: 9, fontWeight: 800,
                                        minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>{totalItems}</span>
                                )}
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* ── HERO DE LA TIENDA ── */}
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 20px 0' }}>
                <BannerCarousel banners={[store.bannerUrl, store.themeConfig?.bannerUrl2].filter(Boolean) as string[]} />
                <div style={{ marginBottom: 22 }}>
                    <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 800, color: 'var(--st-text)', marginBottom: 6, letterSpacing: '-0.02em' }}>{store.name}</h1>
                    {store.description && (
                        <p style={{ fontSize: 13.5, color: 'var(--st-muted)', lineHeight: 1.7, maxWidth: 640 }}>{store.description}</p>
                    )}
                </div>

                {/* ── BUSCADOR ── */}
                <div style={{ position: 'relative', marginBottom: 14 }}>
                    <Search size={16} style={{ color: 'var(--st-primary)', position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.7 }} />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '12px 14px 12px 40px',
                            background: 'rgba(var(--st-primary-rgb),0.06)', border: '1px solid rgba(var(--st-primary-rgb),0.20)',
                            borderRadius: 14, color: 'var(--st-text)', fontSize: 14,
                            outline: 'none', fontFamily: 'inherit',
                        }}
                    />
                </div>

                {/* ── CATEGORÍAS ── */}
                {categoryList.length > 1 && (
                    <div ref={menuRef} style={{ position: 'relative', marginBottom: 18 }}>
                        <button
                            onClick={() => setMenuOpen(o => !o)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
                                background: menuOpen ? 'rgba(var(--st-primary-rgb),0.16)' : 'rgba(var(--st-primary-rgb),0.08)',
                                border: `1px solid rgba(var(--st-primary-rgb),${menuOpen ? '0.5' : '0.2'})`,
                                color: 'var(--st-primary)', fontSize: 13, fontWeight: 700,
                                letterSpacing: '0.03em', transition: 'all 0.2s',
                            }}
                        >
                            {menuOpen ? <X size={16} style={{ color: 'var(--st-primary)' }} /> : <Menu size={16} style={{ color: 'var(--st-primary)' }} />}
                            <span>{activeCategory}</span>
                        </button>

                        {menuOpen && (
                            <div style={{
                                position: 'absolute', top: '110%', left: 0, zIndex: 100,
                                background: 'var(--st-bg)', border: '1px solid var(--st-card-border)',
                                borderRadius: 14, overflow: 'hidden', minWidth: 200,
                                boxShadow: 'var(--st-card-shadow)',
                            }}>
                                {categoryList.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => { setActiveCategory(cat); setMenuOpen(false) }}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '11px 16px', background: 'none',
                                            border: 'none', borderBottom: '1px solid var(--st-border)',
                                            color: activeCategory === cat ? 'var(--st-primary)' : 'var(--st-muted)',
                                            fontSize: 13.5, fontWeight: activeCategory === cat ? 700 : 500,
                                            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                                        }}
                                    >
                                        {cat}
                                        {activeCategory === cat && <ChevronRight size={14} style={{ color: 'var(--st-primary)' }} />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── GRID DE PRODUCTOS (2 columnas en móvil) ── */}
            <main style={{ maxWidth: 1280, margin: '0 auto', padding: '8px 20px 60px' }}>
                {products.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--st-muted)' }}>
                        <Store size={40} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                        <p style={{ fontSize: 14 }}>No hay productos disponibles aún.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {(activeCategory === 'Todos'
                            ? (Object.values(categories).flat() as any[])
                            : (categories[activeCategory] || [])
                        ).filter((p: any) =>
                            !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
                        ).map((p: any) => (
                            <ProductCard key={p.id} p={p} whatsappPhone={phone} isMLM={isMLM} />
                        ))}
                    </div>
                )}
            </main>

            {/* ── FOOTER ── */}
            <footer style={{ borderTop: '1px solid var(--st-border)', padding: '24px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 10.5, color: 'var(--st-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {store.name} · Powered by MY DIAMOND © 2026
                </p>
            </footer>
        </div>
    )
}
