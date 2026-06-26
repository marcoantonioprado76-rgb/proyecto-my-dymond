'use client'

import { useState, useEffect } from 'react'
import { Search, X, MapPin, Globe, Loader2 } from 'lucide-react'

// ── Formato de almacenamiento ───────────────────────────────────────────────
//   País:   "CO"  (ISO-2)              → Meta countries: ["CO"]
//   Ciudad: "city:KEY:Nombre"          → Meta cities: [{ key, radius 25km }]  ← targeting REAL de ciudad
//   (compat) "cc:CO:Nombre" de campañas viejas → el publish lo trata como país; lo seguimos mostrando.
//
// Las ciudades usan la CLAVE REAL de Meta (de la búsqueda dinámica), así "Cochabamba"
// targetea Cochabamba y no todo el país. Cubre TODA Latinoamérica (y el mundo).

const LATAM: { code: string; name: string }[] = [
    { code: 'MX', name: 'México' }, { code: 'CO', name: 'Colombia' },
    { code: 'AR', name: 'Argentina' }, { code: 'PE', name: 'Perú' },
    { code: 'CL', name: 'Chile' }, { code: 'BO', name: 'Bolivia' },
    { code: 'EC', name: 'Ecuador' }, { code: 'VE', name: 'Venezuela' },
    { code: 'GT', name: 'Guatemala' }, { code: 'CU', name: 'Cuba' },
    { code: 'DO', name: 'Rep. Dominicana' }, { code: 'HN', name: 'Honduras' },
    { code: 'PY', name: 'Paraguay' }, { code: 'NI', name: 'Nicaragua' },
    { code: 'SV', name: 'El Salvador' }, { code: 'CR', name: 'Costa Rica' },
    { code: 'PA', name: 'Panamá' }, { code: 'UY', name: 'Uruguay' },
    { code: 'PR', name: 'Puerto Rico' }, { code: 'BR', name: 'Brasil' },
]
const LATAM_CODES = LATAM.map(c => c.code)
const QUICK = ['MX', 'CO', 'AR', 'PE', 'CL', 'BO', 'EC'].map(code => LATAM.find(c => c.code === code)!)

const COUNTRY_NAMES: Record<string, string> = {
    ...Object.fromEntries(LATAM.map(c => [c.code, c.name])),
    ES: 'España', US: 'Estados Unidos', CA: 'Canadá',
}

type LocType = 'country' | 'region' | 'city' | 'subcity'
const TYPE_LABEL: Record<LocType, string> = { country: 'país', region: 'departamento', city: 'ciudad', subcity: 'pueblo' }

export function parseLocation(loc: string): { type: LocType; key: string; name: string } {
    if (loc.startsWith('region:')) { const p = loc.split(':'); return { type: 'region', key: p[1], name: p.slice(2).join(':') } }
    if (loc.startsWith('subcity:')) { const p = loc.split(':'); return { type: 'subcity', key: p[1], name: p.slice(2).join(':') } }
    if (loc.startsWith('city:') || loc.startsWith('cc:')) {
        const p = loc.split(':')
        return { type: 'city', key: p[1], name: p.slice(2).join(':') }
    }
    return { type: 'country', key: loc.toUpperCase(), name: COUNTRY_NAMES[loc.toUpperCase()] || loc.toUpperCase() }
}

// Respaldo si Meta no responde: resuelve PAÍSES conocidos del texto libre del brief.
export function resolveBriefLocations(texts: string[]): string[] {
    const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    const norm = (s: string) => strip(String(s).toLowerCase()).trim()
    const out: string[] = []
    const add = (v: string) => { if (v && !out.includes(v)) out.push(v) }
    for (const raw of texts || []) {
        for (const piece of String(raw).split(/[,/;|\n]+/)) {
            const t = norm(piece)
            if (!t) continue
            const hit = Object.entries(COUNTRY_NAMES).find(([code, name]) => norm(name) === t || code.toLowerCase() === t)
            if (hit) add(hit[0])
        }
    }
    return out
}

interface Props {
    selected: string[]
    onChange: (locs: string[]) => void
    platform?: string
}

export default function LocationSelector({ selected, onChange }: Props) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    // Búsqueda dinámica en Meta (con debounce). Cubre toda LatAm: cualquier país/ciudad.
    useEffect(() => {
        const q = query.trim()
        if (q.length < 2) { setResults([]); setLoading(false); return }
        setLoading(true)
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/ads/integrations/meta/locations?q=${encodeURIComponent(q)}`)
                const data = res.ok ? await res.json() : { locations: [] }
                // País, departamento (region), ciudad y pueblo (subcity): todos válidos en Meta.
                setResults((data.locations || []).filter((l: any) => ['country', 'region', 'city', 'subcity'].includes(l.type)).slice(0, 15))
            } catch { setResults([]) }
            finally { setLoading(false) }
        }, 350)
        return () => clearTimeout(t)
    }, [query])

    const has = (v: string) => selected.includes(v)
    const add = (v: string) => { if (v && !selected.includes(v)) onChange([...selected, v]) }
    const remove = (v: string) => onChange(selected.filter(l => l !== v))

    function pickResult(r: any) {
        if (r.type === 'country' && r.countryCode) add(String(r.countryCode).toUpperCase())
        else if (r.type === 'region' && r.key) add(`region:${r.key}:${r.name}`)
        else if (r.type === 'subcity' && r.key) add(`subcity:${r.key}:${r.name}`)
        else if (r.key) add(`city:${r.key}:${r.name}`)
        setQuery(''); setResults([])
    }

    function addAllLatam() {
        const merged = [...selected]
        for (const code of LATAM_CODES) if (!merged.includes(code)) merged.push(code)
        onChange(merged)
    }

    return (
        <div className="bg-dark-900/60 border border-white/10 rounded-2xl overflow-hidden">
            {/* Chips seleccionados */}
            {selected.length > 0 && (
                <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5 border-b border-white/5">
                    {selected.map(loc => {
                        const p = parseLocation(loc)
                        const broad = p.type === 'country' || p.type === 'region'
                        return (
                            <span key={loc} className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${broad
                                ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                                : 'bg-blue-500/10 border-blue-500/20 text-blue-300'}`}>
                                {broad ? <Globe size={10} /> : <MapPin size={10} />}
                                {p.name} <span className="opacity-40">· {TYPE_LABEL[p.type]}</span>
                                <button onClick={() => remove(loc)} className="text-white/30 hover:text-red-400 ml-0.5"><X size={10} /></button>
                            </span>
                        )
                    })}
                    <button onClick={() => onChange([])} className="text-[10px] text-white/20 hover:text-red-400 px-1">Limpiar todo</button>
                </div>
            )}

            {/* Buscador dinámico */}
            <div className="px-3 pt-3 pb-2 relative">
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Busca tu ciudad o país… (ej: Cochabamba, México)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-8 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 placeholder:text-white/20"
                    />
                    {loading && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 animate-spin" />}
                </div>

                {results.length > 0 && (
                    <div className="absolute left-3 right-3 mt-1 bg-[#15162a] border border-white/15 rounded-xl overflow-hidden z-20 shadow-xl">
                        {results.map((r, i) => (
                            <button key={`${r.key}-${i}`} onClick={() => pickResult(r)}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/8 text-left transition-colors">
                                {(r.type === 'country' || r.type === 'region')
                                    ? <Globe size={13} className="text-purple-400 shrink-0" />
                                    : <MapPin size={13} className="text-blue-400 shrink-0" />}
                                <span className="flex-1 min-w-0 flex items-baseline gap-1.5">
                                    <span className="text-xs text-white/90 truncate">{r.name}</span>
                                    <span className="text-[10px] text-white/35">{r.type === 'country' ? 'país' : `${TYPE_LABEL[r.type as LocType] || r.type}${r.countryName || r.countryCode ? ' · ' + (r.countryName || r.countryCode) : ''}`}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Atajos para LatAm */}
            <div className="px-3 pb-3 pt-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-1.5">Atajos rápidos</p>
                <div className="flex flex-wrap gap-1.5">
                    <button onClick={addAllLatam}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-200 hover:bg-purple-500/25 transition-all">
                        🌎 Toda Latinoamérica
                    </button>
                    {QUICK.map(c => (
                        <button key={c.code} onClick={() => add(c.code)} disabled={has(c.code)}
                            className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all ${has(c.code)
                                ? 'bg-white/5 border-white/8 text-white/25'
                                : 'bg-white/3 border-white/10 text-white/60 hover:border-purple-500/40 hover:text-white/90'}`}>
                            {c.name}
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-white/20 mt-2">📍 Tus anuncios se mostrarán en los lugares que elijas.</p>
            </div>
        </div>
    )
}
