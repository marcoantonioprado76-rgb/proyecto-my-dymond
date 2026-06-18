'use client'

import { useState } from 'react'
import { Search, X, MapPin, Globe } from 'lucide-react'

// Storage format:
//   Countries: "CO" (ISO-2 code, 2 chars)         → Meta: countries: ["CO"]
//   Cities:    "cc:CO:Bogotá" (cc = city_country)  → Meta: countries: ["CO"] (deduplicated)

interface CityEntry { name: string; country: string; code: string }

const CITIES: CityEntry[] = [
    // Colombia
    { name: 'Bogotá', country: 'Colombia', code: 'CO' },
    { name: 'Medellín', country: 'Colombia', code: 'CO' },
    { name: 'Cali', country: 'Colombia', code: 'CO' },
    { name: 'Barranquilla', country: 'Colombia', code: 'CO' },
    { name: 'Cartagena', country: 'Colombia', code: 'CO' },
    { name: 'Bucaramanga', country: 'Colombia', code: 'CO' },
    { name: 'Pereira', country: 'Colombia', code: 'CO' },
    { name: 'Manizales', country: 'Colombia', code: 'CO' },
    { name: 'Santa Marta', country: 'Colombia', code: 'CO' },
    { name: 'Cúcuta', country: 'Colombia', code: 'CO' },
    { name: 'Ibagué', country: 'Colombia', code: 'CO' },
    { name: 'Villavicencio', country: 'Colombia', code: 'CO' },
    // México
    { name: 'Ciudad de México', country: 'México', code: 'MX' },
    { name: 'Guadalajara', country: 'México', code: 'MX' },
    { name: 'Monterrey', country: 'México', code: 'MX' },
    { name: 'Puebla', country: 'México', code: 'MX' },
    { name: 'Tijuana', country: 'México', code: 'MX' },
    { name: 'León', country: 'México', code: 'MX' },
    { name: 'Ciudad Juárez', country: 'México', code: 'MX' },
    { name: 'Zapopan', country: 'México', code: 'MX' },
    { name: 'Mérida', country: 'México', code: 'MX' },
    { name: 'Cancún', country: 'México', code: 'MX' },
    { name: 'Querétaro', country: 'México', code: 'MX' },
    { name: 'Toluca', country: 'México', code: 'MX' },
    { name: 'San Luis Potosí', country: 'México', code: 'MX' },
    { name: 'Aguascalientes', country: 'México', code: 'MX' },
    // Argentina
    { name: 'Buenos Aires', country: 'Argentina', code: 'AR' },
    { name: 'Córdoba', country: 'Argentina', code: 'AR' },
    { name: 'Rosario', country: 'Argentina', code: 'AR' },
    { name: 'Mendoza', country: 'Argentina', code: 'AR' },
    { name: 'La Plata', country: 'Argentina', code: 'AR' },
    { name: 'Tucumán', country: 'Argentina', code: 'AR' },
    { name: 'Mar del Plata', country: 'Argentina', code: 'AR' },
    { name: 'Salta', country: 'Argentina', code: 'AR' },
    { name: 'Santa Fe', country: 'Argentina', code: 'AR' },
    // Perú
    { name: 'Lima', country: 'Perú', code: 'PE' },
    { name: 'Arequipa', country: 'Perú', code: 'PE' },
    { name: 'Trujillo', country: 'Perú', code: 'PE' },
    { name: 'Chiclayo', country: 'Perú', code: 'PE' },
    { name: 'Cusco', country: 'Perú', code: 'PE' },
    { name: 'Piura', country: 'Perú', code: 'PE' },
    { name: 'Iquitos', country: 'Perú', code: 'PE' },
    // Chile
    { name: 'Santiago', country: 'Chile', code: 'CL' },
    { name: 'Valparaíso', country: 'Chile', code: 'CL' },
    { name: 'Concepción', country: 'Chile', code: 'CL' },
    { name: 'Antofagasta', country: 'Chile', code: 'CL' },
    { name: 'La Serena', country: 'Chile', code: 'CL' },
    { name: 'Temuco', country: 'Chile', code: 'CL' },
    // Ecuador
    { name: 'Guayaquil', country: 'Ecuador', code: 'EC' },
    { name: 'Quito', country: 'Ecuador', code: 'EC' },
    { name: 'Cuenca', country: 'Ecuador', code: 'EC' },
    { name: 'Ambato', country: 'Ecuador', code: 'EC' },
    { name: 'Manta', country: 'Ecuador', code: 'EC' },
    // Venezuela
    { name: 'Caracas', country: 'Venezuela', code: 'VE' },
    { name: 'Maracaibo', country: 'Venezuela', code: 'VE' },
    { name: 'Valencia', country: 'Venezuela', code: 'VE' },
    { name: 'Barquisimeto', country: 'Venezuela', code: 'VE' },
    { name: 'Maracay', country: 'Venezuela', code: 'VE' },
    // Bolivia
    { name: 'La Paz', country: 'Bolivia', code: 'BO' },
    { name: 'Santa Cruz de la Sierra', country: 'Bolivia', code: 'BO' },
    { name: 'Cochabamba', country: 'Bolivia', code: 'BO' },
    { name: 'Sucre', country: 'Bolivia', code: 'BO' },
    // Paraguay
    { name: 'Asunción', country: 'Paraguay', code: 'PY' },
    { name: 'Ciudad del Este', country: 'Paraguay', code: 'PY' },
    // Uruguay
    { name: 'Montevideo', country: 'Uruguay', code: 'UY' },
    { name: 'Salto', country: 'Uruguay', code: 'UY' },
    // Costa Rica
    { name: 'San José', country: 'Costa Rica', code: 'CR' },
    { name: 'Alajuela', country: 'Costa Rica', code: 'CR' },
    { name: 'Heredia', country: 'Costa Rica', code: 'CR' },
    // Guatemala
    { name: 'Ciudad de Guatemala', country: 'Guatemala', code: 'GT' },
    { name: 'Quetzaltenango', country: 'Guatemala', code: 'GT' },
    // Honduras
    { name: 'Tegucigalpa', country: 'Honduras', code: 'HN' },
    { name: 'San Pedro Sula', country: 'Honduras', code: 'HN' },
    // El Salvador
    { name: 'San Salvador', country: 'El Salvador', code: 'SV' },
    { name: 'Santa Ana', country: 'El Salvador', code: 'SV' },
    // Nicaragua
    { name: 'Managua', country: 'Nicaragua', code: 'NI' },
    { name: 'León', country: 'Nicaragua', code: 'NI' },
    // Panamá
    { name: 'Ciudad de Panamá', country: 'Panamá', code: 'PA' },
    { name: 'Colón', country: 'Panamá', code: 'PA' },
    // Rep. Dominicana
    { name: 'Santo Domingo', country: 'Rep. Dominicana', code: 'DO' },
    { name: 'Santiago de los Caballeros', country: 'Rep. Dominicana', code: 'DO' },
    { name: 'San Pedro de Macorís', country: 'Rep. Dominicana', code: 'DO' },
    // Cuba
    { name: 'La Habana', country: 'Cuba', code: 'CU' },
    { name: 'Santiago de Cuba', country: 'Cuba', code: 'CU' },
    // Puerto Rico
    { name: 'San Juan', country: 'Puerto Rico', code: 'PR' },
    // Brasil
    { name: 'São Paulo', country: 'Brasil', code: 'BR' },
    { name: 'Rio de Janeiro', country: 'Brasil', code: 'BR' },
    { name: 'Brasília', country: 'Brasil', code: 'BR' },
    { name: 'Salvador', country: 'Brasil', code: 'BR' },
    { name: 'Fortaleza', country: 'Brasil', code: 'BR' },
    { name: 'Belo Horizonte', country: 'Brasil', code: 'BR' },
    { name: 'Manaus', country: 'Brasil', code: 'BR' },
    { name: 'Curitiba', country: 'Brasil', code: 'BR' },
    // España
    { name: 'Madrid', country: 'España', code: 'ES' },
    { name: 'Barcelona', country: 'España', code: 'ES' },
    { name: 'Valencia', country: 'España', code: 'ES' },
    { name: 'Sevilla', country: 'España', code: 'ES' },
    { name: 'Bilbao', country: 'España', code: 'ES' },
    { name: 'Zaragoza', country: 'España', code: 'ES' },
    { name: 'Málaga', country: 'España', code: 'ES' },
    { name: 'Alicante', country: 'España', code: 'ES' },
    // Estados Unidos
    { name: 'Miami', country: 'Estados Unidos', code: 'US' },
    { name: 'Nueva York', country: 'Estados Unidos', code: 'US' },
    { name: 'Los Ángeles', country: 'Estados Unidos', code: 'US' },
    { name: 'Houston', country: 'Estados Unidos', code: 'US' },
    { name: 'Chicago', country: 'Estados Unidos', code: 'US' },
    { name: 'Dallas', country: 'Estados Unidos', code: 'US' },
    { name: 'Phoenix', country: 'Estados Unidos', code: 'US' },
    { name: 'San Antonio', country: 'Estados Unidos', code: 'US' },
    { name: 'Orlando', country: 'Estados Unidos', code: 'US' },
    { name: 'Las Vegas', country: 'Estados Unidos', code: 'US' },
    // Canadá
    { name: 'Toronto', country: 'Canadá', code: 'CA' },
    { name: 'Montreal', country: 'Canadá', code: 'CA' },
    { name: 'Vancouver', country: 'Canadá', code: 'CA' },
]

const COUNTRIES: { code: string; name: string }[] = [
    { code: 'AR', name: 'Argentina' }, { code: 'BO', name: 'Bolivia' },
    { code: 'BR', name: 'Brasil' }, { code: 'CA', name: 'Canadá' },
    { code: 'CL', name: 'Chile' }, { code: 'CO', name: 'Colombia' },
    { code: 'CR', name: 'Costa Rica' }, { code: 'CU', name: 'Cuba' },
    { code: 'DO', name: 'República Dominicana' }, { code: 'EC', name: 'Ecuador' },
    { code: 'SV', name: 'El Salvador' }, { code: 'ES', name: 'España' },
    { code: 'US', name: 'Estados Unidos' }, { code: 'GT', name: 'Guatemala' },
    { code: 'HN', name: 'Honduras' }, { code: 'MX', name: 'México' },
    { code: 'NI', name: 'Nicaragua' }, { code: 'PA', name: 'Panamá' },
    { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Perú' },
    { code: 'PR', name: 'Puerto Rico' }, { code: 'UY', name: 'Uruguay' },
    { code: 'VE', name: 'Venezuela' }, { code: 'DE', name: 'Alemania' },
    { code: 'FR', name: 'Francia' }, { code: 'GB', name: 'Reino Unido' },
    { code: 'IT', name: 'Italia' }, { code: 'PT', name: 'Portugal' },
    { code: 'AU', name: 'Australia' }, { code: 'JP', name: 'Japón' },
]

export function encodeCity(city: CityEntry): string {
    return `cc:${city.code}:${city.name}`
}

export function parseLocation(loc: string): { type: 'country' | 'city'; code: string; name: string } {
    if (loc.startsWith('cc:')) {
        const parts = loc.split(':')
        return { type: 'city', code: parts[1], name: parts.slice(2).join(':') }
    }
    const country = COUNTRIES.find(c => c.code === loc.toUpperCase())
    return { type: 'country', code: loc.toUpperCase(), name: country?.name || loc }
}

// Resuelve ubicaciones en texto libre (las que genera la IA en el brief,
// ej. "Bolivia", "Peru", "Cochabamba ,Sacaba") al formato de almacenamiento
// del selector ("BO", "cc:BO:Cochabamba"). Lo que no se reconoce (continentes,
// países no listados) se ignora — así nunca mete un valor que Meta rechace.
export function resolveBriefLocations(texts: string[]): string[] {
    const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    const norm = (s: string) => strip(String(s).toLowerCase()).trim()
    const out: string[] = []
    const add = (v: string) => { if (v && !out.includes(v)) out.push(v) }
    for (const raw of texts || []) {
        for (const piece of String(raw).split(/[,/;|\n]+/)) {
            const t = norm(piece)
            if (!t) continue
            const country = COUNTRIES.find(c => norm(c.name) === t || c.code.toLowerCase() === t)
            if (country) { add(country.code); continue }
            const city = CITIES.find(c => norm(c.name) === t)
            if (city) { add(encodeCity(city)); continue }
            // no reconocido → se ignora
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
    const [tab, setTab] = useState<'country' | 'city'>('country')
    const [search, setSearch] = useState('')

    const selectedCountries = selected.filter(l => !l.startsWith('cc:'))
    const selectedCities = selected.filter(l => l.startsWith('cc:'))

    const q = search.toLowerCase().trim()

    const filteredCountries = q
        ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
        : COUNTRIES

    const filteredCities = q
        ? CITIES.filter(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
        : CITIES

    function toggleCountry(code: string) {
        selectedCountries.includes(code)
            ? onChange(selected.filter(l => l !== code))
            : onChange([...selected, code])
    }

    function toggleCity(city: CityEntry) {
        const val = encodeCity(city)
        selected.includes(val)
            ? onChange(selected.filter(l => l !== val))
            : onChange([...selected, val])
    }

    function removeLocation(loc: string) {
        onChange(selected.filter(l => l !== loc))
    }

    return (
        <div className="bg-dark-900/60 border border-white/10 rounded-2xl overflow-hidden">
            {/* Selected chips */}
            {selected.length > 0 && (
                <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5 border-b border-white/5">
                    {selected.map(loc => {
                        const parsed = parseLocation(loc)
                        return (
                            <span key={loc} className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${parsed.type === 'country'
                                ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                                : 'bg-blue-500/10 border-blue-500/20 text-blue-300'}`}>
                                {parsed.type === 'country' ? <Globe size={10} /> : <MapPin size={10} />}
                                {parsed.name}
                                <button onClick={() => removeLocation(loc)} className="text-white/30 hover:text-red-400 transition-all ml-0.5">
                                    <X size={10} />
                                </button>
                            </span>
                        )
                    })}
                    <button onClick={() => onChange([])} className="text-[10px] text-white/20 hover:text-red-400 transition-all px-1">
                        Limpiar todo
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-white/8">
                {([
                    ['country', 'Países', <Globe size={12} />, selectedCountries.length],
                    ['city', 'Ciudades', <MapPin size={12} />, selectedCities.length],
                ] as const).map(([key, label, icon, count]) => (
                    <button key={key} onClick={() => { setTab(key); setSearch('') }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all ${tab === key ? 'text-white border-b-2 border-purple-500' : 'text-white/30 hover:text-white/60'}`}>
                        {icon} {label}
                        {count > 0 && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-purple-500/30 text-purple-200' : 'bg-white/8 text-white/40'}`}>{count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="px-3 pt-3 pb-2">
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={tab === 'country' ? 'Buscar país...' : 'Buscar ciudad...'}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 placeholder:text-white/20"
                    />
                </div>
            </div>

            {/* Country list */}
            {tab === 'country' && (
                <div className="px-3 pb-3">
                    <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                        {filteredCountries.map(c => {
                            const isSelected = selectedCountries.includes(c.code)
                            return (
                                <button key={c.code} onClick={() => toggleCountry(c.code)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all ${isSelected
                                        ? 'bg-purple-500/20 border border-purple-500/40 text-purple-200'
                                        : 'bg-white/3 border border-white/8 text-white/60 hover:bg-white/8 hover:text-white/90'}`}>
                                    <span className="font-black text-[10px] text-white/30 w-5 shrink-0">{c.code}</span>
                                    <span className="truncate flex-1">{c.name}</span>
                                    {isSelected && <X size={10} className="shrink-0 text-purple-400" />}
                                </button>
                            )
                        })}
                        {filteredCountries.length === 0 && (
                            <p className="col-span-2 text-center text-xs text-white/20 py-6">Sin resultados</p>
                        )}
                    </div>
                </div>
            )}

            {/* City list */}
            {tab === 'city' && (
                <div className="px-3 pb-3">
                    <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
                        {filteredCities.map((city, i) => {
                            const val = encodeCity(city)
                            const isSelected = selected.includes(val)
                            return (
                                <button key={`${city.code}-${city.name}-${i}`} onClick={() => toggleCity(city)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-all ${isSelected
                                        ? 'bg-blue-500/15 border border-blue-500/30 text-blue-200'
                                        : 'bg-white/3 border border-white/8 text-white/60 hover:bg-white/8 hover:text-white/90'}`}>
                                    <MapPin size={11} className={`shrink-0 ${isSelected ? 'text-blue-400' : 'text-white/20'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{city.name}</p>
                                        <p className="text-[10px] text-white/30">{city.country}</p>
                                    </div>
                                    {isSelected && <X size={10} className="shrink-0 text-blue-400" />}
                                </button>
                            )
                        })}
                        {filteredCities.length === 0 && (
                            <p className="text-center text-xs text-white/20 py-6">Sin resultados para "{search}"</p>
                        )}
                    </div>
                    <p className="text-[10px] text-white/15 mt-2 text-center">{CITIES.length} ciudades disponibles</p>
                </div>
            )}
        </div>
    )
}
