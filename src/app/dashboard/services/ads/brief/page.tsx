'use client'

import { useState, useEffect, useRef } from 'react'
import {
    Mic, Type, Loader2, Sparkles, ArrowLeft, CheckCircle2,
    AlertCircle, Edit3, Save, RefreshCw, Volume2, Square, Plus,
    Trash2, Building2, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AIKeySelector from '@/components/AIKeySelector'

interface BriefForm {
    name: string; industry: string; description: string; valueProposition: string
    painPoints: string[]; interests: string[]; brandVoice: string
    brandColors: string[]; visualStyle: string[]; primaryObjective: string
    mainCTA: string; targetLocations: string[]; keyMessages: string[]
    personalityTraits: string[]; contentThemes: string[]; engagementLevel: string
}

interface Brief extends BriefForm { id: string; createdAt: string; updatedAt: string }

const emptyBrief: BriefForm = {
    name: '', industry: '', description: '', valueProposition: '',
    painPoints: [], interests: [], brandVoice: '', brandColors: [],
    visualStyle: [], primaryObjective: 'conversion', mainCTA: 'Comprar ahora',
    targetLocations: [], keyMessages: [], personalityTraits: [],
    contentThemes: [], engagementLevel: 'medio'
}

type View = 'list' | 'create' | 'edit'

export default function BriefPage() {
    const router = useRouter()
    const [briefs, setBriefs] = useState<Brief[]>([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<View>('list')
    const [editingBrief, setEditingBrief] = useState<Brief | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => { loadBriefs() }, [])

    async function loadBriefs() {
        setLoading(true)
        try {
            const res = await fetch('/api/ads/brief')
            const data = await res.json()
            setBriefs(data.briefs || [])
        } finally { setLoading(false) }
    }

    async function deleteBrief(id: string) {
        if (!confirm('¿Eliminar este negocio?')) return
        setDeletingId(id)
        try {
            const res = await fetch(`/api/ads/brief?id=${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) return setError(data.error || 'Error al eliminar')
            setBriefs(prev => prev.filter(b => b.id !== id))
            setSuccess('Negocio eliminado')
            setTimeout(() => setSuccess(null), 3000)
        } finally { setDeletingId(null) }
    }

    if (view === 'create') {
        return (
            <CreateBriefView
                onSaved={(brief) => { setBriefs(prev => [brief, ...prev]); setView('list'); setSuccess('Negocio creado correctamente') }}
                onCancel={() => setView('list')}
            />
        )
    }

    if (view === 'edit' && editingBrief) {
        return (
            <EditBriefView
                brief={editingBrief}
                onSaved={(updated) => {
                    setBriefs(prev => prev.map(b => b.id === updated.id ? updated : b))
                    setView('list')
                    setSuccess('Negocio actualizado')
                }}
                onCancel={() => setView('list')}
            />
        )
    }

    // List view
    return (
        <div className="px-4 md:px-6 xl:px-10 pt-6 max-w-screen-xl 2xl:max-w-screen-2xl mx-auto pb-24 text-white">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/services/ads" className="w-9 h-9 rounded-xl bg-white/5 border border-purple-500/25 flex items-center justify-center hover:bg-white/10 transition-all">
                    <ArrowLeft size={16} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-black uppercase tracking-tighter">Mis Negocios</h1>
                    <p className="text-xs text-white/30">Perfiles de negocio para tus campañas</p>
                </div>
                <AIKeySelector compact />
                <button
                    onClick={() => setView('create')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all"
                >
                    <Plus size={14} /> Nuevo Negocio
                </button>
            </div>

            {error && (
                <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 text-red-400 text-sm">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="font-bold text-xs">✕</button>
                </div>
            )}
            {success && (
                <div className="mb-5 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex gap-3 text-green-400 text-sm">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                    <p>{success}</p>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3">
                    <Loader2 className="animate-spin text-purple-400" size={24} />
                    <span className="text-white/40 text-sm">Cargando...</span>
                </div>
            ) : briefs.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.015] border border-dashed border-white/10 rounded-3xl">
                    <Building2 size={32} className="text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 font-bold mb-1">Sin negocios creados</p>
                    <p className="text-white/20 text-xs mb-6">Crea el perfil de tu negocio para lanzar campañas con IA</p>
                    <button
                        onClick={() => setView('create')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all"
                    >
                        <Plus size={15} /> Crear mi primer negocio
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {briefs.map(brief => (
                        <div key={brief.id} className="bg-white/3 border border-purple-500/20 rounded-2xl p-4 md:p-5 hover:border-white/15 transition-all">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
                                    <Building2 size={18} className="text-purple-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm leading-tight">{brief.name}</h3>
                                    <p className="text-xs text-white/40 mt-0.5">{brief.industry}</p>
                                    <p className="text-xs text-white/25 mt-1.5 line-clamp-2 leading-relaxed">{brief.description}</p>

                                    {/* Tags */}
                                    {brief.painPoints?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {brief.painPoints.slice(0, 3).map((p, i) => (
                                                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/8 border border-red-500/15 text-red-400/70">{p}</span>
                                            ))}
                                            {brief.painPoints.length > 3 && (
                                                <span className="text-[10px] text-white/20">+{brief.painPoints.length - 3} más</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                                <Link
                                    href={`/dashboard/services/ads/wizard?briefId=${brief.id}`}
                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white hover:opacity-90 transition-all"
                                >
                                    <Sparkles size={12} /> Crear campaña
                                </Link>
                                <button
                                    onClick={() => { setEditingBrief(brief); setView('edit') }}
                                    className="px-3 py-2 rounded-xl bg-white/5 border border-purple-500/25 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <Edit3 size={14} />
                                </button>
                                <button
                                    onClick={() => deleteBrief(brief.id)}
                                    disabled={deletingId === brief.id}
                                    className="px-3 py-2 rounded-xl bg-white/5 border border-purple-500/25 text-white/30 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 disabled:opacity-40 transition-all"
                                >
                                    {deletingId === brief.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={() => setView('create')}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-dashed border-white/10 text-white/30 hover:border-white/25 hover:text-white/50 text-sm font-bold transition-all"
                    >
                        <Plus size={15} /> Agregar otro negocio
                    </button>
                </div>
            )}
        </div>
    )
}

// ─── Create Brief View ────────────────────────────────────────────────────────

function CreateBriefView({ onSaved, onCancel }: { onSaved: (b: Brief) => void; onCancel: () => void }) {
    const [inputMode, setInputMode] = useState<'text' | 'audio'>('text')
    const [text, setText] = useState('')
    const [recording, setRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [transcribing, setTranscribing] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [saving, setSaving] = useState(false)
    const [brief, setBrief] = useState<BriefForm | null>(null)
    const [error, setError] = useState<string | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

    async function startRecording() {
        setError(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            chunksRef.current = []
            const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' })
            mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
            mr.onstop = () => { setAudioBlob(new Blob(chunksRef.current, { type: mr.mimeType })); stream.getTracks().forEach(t => t.stop()) }
            mr.start(250)
            mediaRecorderRef.current = mr
            setRecording(true); setRecordingTime(0)
            timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
        } catch { setError('No se pudo acceder al micrófono.') }
    }

    function stopRecording() {
        if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop()
        if (timerRef.current) clearInterval(timerRef.current)
        setRecording(false)
    }

    async function transcribeAudio() {
        if (!audioBlob) return
        setTranscribing(true); setError(null)
        try {
            const fd = new FormData()
            fd.append('audio', audioBlob, 'recording.webm')
            const res = await fetch('/api/ads/brief/transcribe', { method: 'POST', body: fd })
            const data = await res.json()
            if (!res.ok) return setError(data.error || 'Error al transcribir')
            setText(data.text); setInputMode('text')
        } catch { setError('Error de conexión') } finally { setTranscribing(false) }
    }

    async function generateBrief() {
        if (text.trim().length < 20) return setError('Escribe al menos 20 caracteres')
        setGenerating(true); setError(null)
        try {
            const res = await fetch('/api/ads/brief/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.trim() }) })
            const data = await res.json()
            if (!res.ok) return setError(data.error || 'Error al generar brief')
            setBrief({ ...emptyBrief, ...data.brief })
        } catch { setError('Error de conexión') } finally { setGenerating(false) }
    }

    async function saveBrief() {
        if (!brief) return
        setSaving(true); setError(null)
        try {
            const res = await fetch('/api/ads/brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(brief) })
            const data = await res.json()
            if (!res.ok) return setError(data.error || 'Error al guardar')
            onSaved(data.brief)
        } catch { setError('Error de conexión') } finally { setSaving(false) }
    }

    const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

    return (
        <div className="px-4 md:px-6 xl:px-10 pt-6 max-w-screen-xl 2xl:max-w-screen-2xl mx-auto pb-24 text-white">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onCancel} className="w-9 h-9 rounded-xl bg-white/5 border border-purple-500/25 flex items-center justify-center hover:bg-white/10 transition-all">
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tighter">Nuevo Negocio</h1>
                    <p className="text-xs text-white/30">Describe tu negocio y la IA generará el perfil</p>
                </div>
            </div>

            {error && (
                <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 text-red-400 text-sm">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" /><p className="flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="font-bold text-xs">✕</button>
                </div>
            )}

            {!brief ? (
                <>
                    <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-2xl border border-purple-500/20">
                        {(['text', 'audio'] as const).map(mode => (
                            <button key={mode} onClick={() => setInputMode(mode)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${inputMode === mode ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}>
                                {mode === 'text' ? <><Type size={15} /> Escribir</> : <><Mic size={15} /> Grabar</>}
                            </button>
                        ))}
                    </div>

                    {inputMode === 'text' && (
                        <div className="space-y-4">
                            <textarea value={text} onChange={e => setText(e.target.value)} rows={8}
                                placeholder="Describe tu negocio con el mayor detalle posible. Incluye: ¿Qué vendes o qué servicio ofreces? ¿A quién va dirigido? ¿Cuál es tu propuesta de valor o diferencial? ¿Qué problemas resuelves a tus clientes? ¿Cuál es tu llamada a la acción principal? Entre más detalles, mejor será el resultado."
                                className="w-full bg-[#1c1d2e] border border-white/20 rounded-2xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-purple-500/50 placeholder:text-white/30 leading-relaxed" />
                            <p className="text-xs text-white/20 text-right">{text.length} chars · mínimo 20</p>
                            <button onClick={generateBrief} disabled={generating || text.trim().length < 20}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white font-bold py-4 rounded-2xl hover:opacity-90 disabled:opacity-40 transition-all shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                                {generating ? <><Loader2 size={18} className="animate-spin" /> Analizando...</> : <><Sparkles size={18} /> Generar Brief con IA</>}
                            </button>
                        </div>
                    )}

                    {inputMode === 'audio' && (
                        <div className="text-center py-8">
                            {!audioBlob ? (
                                <div className="flex flex-col items-center gap-6">
                                    <button onClick={recording ? stopRecording : startRecording}
                                        className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all ${recording ? 'bg-red-500 shadow-[0_0_60px_rgba(239,68,68,0.5)]' : 'bg-purple-600 shadow-[0_0_60px_rgba(139,92,246,0.4)]'}`}>
                                        {recording && <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-25" />}
                                        {recording ? <Square size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
                                    </button>
                                    {recording && <p className="text-4xl font-black font-mono text-red-400">{fmtTime(recordingTime)}</p>}
                                    {!recording && <p className="text-sm text-white/40">Toca para grabar</p>}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center">
                                        <Volume2 size={32} className="text-green-400" />
                                    </div>
                                    <p className="text-sm text-white/60">Audio ({fmtTime(recordingTime)})</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => { setAudioBlob(null); setRecordingTime(0) }} className="px-4 py-2 rounded-xl bg-white/5 border border-purple-500/25 text-sm font-bold hover:bg-white/10 transition-all flex items-center gap-2">
                                            <RefreshCw size={14} /> Volver a grabar
                                        </button>
                                        <button onClick={transcribeAudio} disabled={transcribing} className="px-6 py-2 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-500 disabled:opacity-50 transition-all flex items-center gap-2">
                                            {transcribing ? <><Loader2 size={14} className="animate-spin" /> Transcribiendo...</> : <><Sparkles size={14} /> Transcribir</>}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3">
                        <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-green-300">{brief.name} · {brief.industry}</p>
                            <p className="text-xs text-green-400/60 mt-0.5">Brief generado. Puedes editarlo antes de guardar.</p>
                        </div>
                        <button onClick={() => setBrief(null)} className="ml-auto text-xs font-bold text-white/30 hover:text-white/60 transition-all">Descartar</button>
                    </div>

                    <EditBriefForm brief={brief} onChange={setBrief} />

                    <div className="flex gap-3 pt-2">
                        <button onClick={onCancel} className="flex-1 py-3 rounded-2xl bg-white/5 border border-purple-500/25 text-sm font-bold hover:bg-white/10 transition-all">
                            Cancelar
                        </button>
                        <button onClick={saveBrief} disabled={saving} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                            {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Save size={16} /> Guardar Negocio</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Edit Brief View ──────────────────────────────────────────────────────────

function EditBriefView({ brief, onSaved, onCancel }: { brief: Brief; onSaved: (b: Brief) => void; onCancel: () => void }) {
    const [form, setForm] = useState<BriefForm>(brief)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function save() {
        setSaving(true); setError(null)
        try {
            const res = await fetch('/api/ads/brief', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: brief.id, ...form }) })
            const data = await res.json()
            if (!res.ok) return setError(data.error || 'Error al guardar')
            onSaved(data.brief)
        } catch { setError('Error de conexión') } finally { setSaving(false) }
    }

    return (
        <div className="px-4 md:px-6 xl:px-10 pt-6 max-w-screen-xl 2xl:max-w-screen-2xl mx-auto pb-24 text-white">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onCancel} className="w-9 h-9 rounded-xl bg-white/5 border border-purple-500/25 flex items-center justify-center hover:bg-white/10 transition-all">
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tighter">Editar Negocio</h1>
                    <p className="text-xs text-white/30">{brief.name}</p>
                </div>
            </div>
            {error && (
                <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 text-red-400 text-sm">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" /><p className="flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="font-bold text-xs">✕</button>
                </div>
            )}
            <EditBriefForm brief={form} onChange={setForm} />
            <div className="flex gap-3 mt-6">
                <button onClick={onCancel} className="flex-1 py-3 rounded-2xl bg-white/5 border border-purple-500/25 text-sm font-bold hover:bg-white/10 transition-all">Cancelar</button>
                <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                    {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Save size={16} /> Guardar Cambios</>}
                </button>
            </div>
        </div>
    )
}

// ─── Shared form component ────────────────────────────────────────────────────

function EditBriefForm({ brief, onChange }: { brief: BriefForm; onChange: (b: BriefForm) => void }) {
    const field = (key: keyof BriefForm) => ({
        value: brief[key] as string,
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
            onChange({ ...brief, [key]: e.target.value })
    })

    return (
        <div className="space-y-5">
            <Section title="Información del Negocio">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Nombre" {...field('name')} />
                    <InputField label="Industria" {...field('industry')} />
                    <div className="md:col-span-2"><TextareaField label="Descripción" {...field('description')} /></div>
                    <div className="md:col-span-2"><TextareaField label="Propuesta de Valor" {...field('valueProposition')} /></div>
                </div>
            </Section>

            <Section title="Audiencia">
                <TagList label="Puntos de Dolor" items={brief.painPoints} onChange={v => onChange({ ...brief, painPoints: v })} placeholder="Ej: Dificultad para bajar de peso..." />
                <TagList label="Intereses" items={brief.interests} onChange={v => onChange({ ...brief, interests: v })} placeholder="Ej: Salud y bienestar..." />
                <TagList label="Ubicaciones" items={brief.targetLocations} onChange={v => onChange({ ...brief, targetLocations: v })} placeholder="Ej: Colombia, México..." />
            </Section>

            <Section title="Identidad de Marca">
                <InputField label="Voz de Marca" {...field('brandVoice')} />
                <TagList label="Estilo Visual" items={brief.visualStyle} onChange={v => onChange({ ...brief, visualStyle: v })} placeholder="Ej: minimalista, moderno..." />
                <TagList label="Rasgos de Personalidad" items={brief.personalityTraits} onChange={v => onChange({ ...brief, personalityTraits: v })} placeholder="Ej: Confiable, Cercano..." />
                <TagList label="Mensajes Clave" items={brief.keyMessages} onChange={v => onChange({ ...brief, keyMessages: v })} placeholder="Ej: Recupera tu bienestar..." />
            </Section>

            <Section title="Estrategia">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Objetivo Principal</label>
                        <select {...field('primaryObjective')} className="w-full bg-[#1c1d2e] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 [&>option]:bg-[#1c1d2e]">
                            <option value="conversion">Conversión / Ventas</option>
                            <option value="leads">Generación de Leads</option>
                            <option value="traffic">Tráfico al sitio</option>
                            <option value="awareness">Conciencia de marca</option>
                        </select>
                    </div>
                    <InputField label="CTA Principal" {...field('mainCTA')} placeholder="Ej: Comprar ahora" />
                </div>
            </Section>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-dark-900/40 border border-purple-500/20 rounded-2xl p-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{title}</p>
            {children}
        </div>
    )
}

function TagList({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
    const [input, setInput] = useState('')
    const add = () => { const v = input.trim(); if (v && !items.includes(v)) onChange([...items, v]); setInput('') }
    return (
        <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">{label}</label>
            <div className="flex flex-wrap gap-2 mb-2">
                {items.map((item, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300 px-3 py-1.5 rounded-full font-medium">
                        {item}
                        <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-purple-400 hover:text-red-400">×</button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
                    placeholder={placeholder} className="flex-1 bg-[#1c1d2e] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 placeholder:text-white/30" />
                <button onClick={add} className="px-3 py-2 bg-white/5 border border-purple-500/25 rounded-xl text-xs font-bold hover:bg-purple-500/20 transition-all">+ Agregar</button>
            </div>
        </div>
    )
}

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: any; placeholder?: string }) {
    return (
        <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">{label}</label>
            <input value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-[#1c1d2e] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 placeholder:text-white/30" />
        </div>
    )
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: any }) {
    return (
    <div className="dm-page font-ui">
        <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">{label}</label>
            <textarea value={value} onChange={onChange} rows={3} className="w-full bg-[#1c1d2e] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white resize-none focus:outline-none focus:border-purple-500/50 leading-relaxed" />
        </div>
    </div>
    )
}
