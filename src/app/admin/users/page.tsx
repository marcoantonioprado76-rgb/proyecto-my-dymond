'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Search,
  Users,
  Crown,
  Shield,
  ShieldOff,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  AlertTriangle,
  Smartphone,
  X,
  Unlink,
  MapPin,
  Monitor,
  Globe,
  Clock,
  AlertOctagon,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'

interface UserRow {
  id: string
  username: string
  fullName: string
  email: string
  country: string
  plan: string
  isActive: boolean
  isAdmin: boolean
  extraBots: number
  createdAt: string
  locationChanged?: boolean
}

const PLAN_BADGE: Record<string, string> = {
  NONE: 'text-[#111827]/30 bg-[#F4F6FA] border-[#E4E9F0]',
  BASIC: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
  PRO: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
  ELITE: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [updating, setUpdating] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ id: string; username: string; fullName: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [devicesModal, setDevicesModal] = useState<{ id: string; username: string; fullName: string } | null>(null)
  const [devices, setDevices] = useState<{
    id: string; deviceId: string; label: string | null; lastSeen: string; createdAt: string
    ip: string | null; city: string | null; country: string | null
    lat: number | null; lng: number | null; address: string | null
    browser: string | null; os: string | null; deviceType: string | null
    prevIp: string | null; prevCity: string | null; locationChanged: boolean
  }[]>([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [unlinking, setUnlinking] = useState<string | null>(null)
  const devicesRequestIdRef = useRef(0) // tracks latest request to avoid stale state

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set('q', search)
    const res = await fetch(`/api/admin/users?${params}`)
    if (!res.ok) {
      setLoading(false)
      return
    }
    const data = await res.json()
    setUsers(data.users ?? [])
    setTotalPages(data.pages ?? 1)
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [page, search])

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300)
    return () => clearTimeout(t)
  }, [fetchUsers])

  // Auto-refresh devices every 30s while modal is open (picks up GPS updates)
  useEffect(() => {
    if (!devicesModal) return
    const interval = setInterval(() => loadDevices(devicesModal.id), 30000)
    return () => clearInterval(interval)
  }, [devicesModal])

  async function updateUser(id: string, patch: Record<string, unknown>) {
    setUpdating(id)
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    await fetchUsers()
    setUpdating(null)
  }

  async function confirmDelete() {
    if (!deleteModal) return
    setDeleting(true)
    const res = await fetch(`/api/admin/users/${deleteModal.id}`, { method: 'DELETE' })
    const data = await res.json()
    setDeleting(false)
    if (!res.ok) {
      alert(data.error ?? 'Error al eliminar el usuario')
      return
    }
    setDeleteModal(null)
    fetchUsers()
  }

  async function loadDevices(userId: string) {
    const requestId = ++devicesRequestIdRef.current
    const res = await fetch(`/api/admin/users/${userId}/devices`)
    // Ignore stale responses if a newer request was made
    if (requestId !== devicesRequestIdRef.current) return
    if (res.ok) {
      const data = await res.json()
      setDevices(data.devices ?? [])
    }
  }

  async function openDevicesModal(user: { id: string; username: string; fullName: string }) {
    setDevicesModal(user)
    setDevices([])
    setDevicesLoading(true)
    try {
      await loadDevices(user.id)
    } finally {
      setDevicesLoading(false)
    }
  }

  async function unlinkDevice(userId: string, deviceId: string) {
    setUnlinking(deviceId)
    const res = await fetch(`/api/admin/users/${userId}/devices`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    })
    if (res.ok) {
      setDevices(prev => prev.filter(d => d.deviceId !== deviceId))
      // Refresh user list to clear location badge
      fetchUsers()
    }
    setUnlinking(null)
  }

  return (
  <div className="dm-page font-ui">
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Users size={18} className="text-cyan-400" /> Usuarios
          </h1>
          <p className="text-xs text-[#111827]/30 mt-0.5">{total} usuarios registrados</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111827]/25" />
        <input
          type="text"
          placeholder="Buscar por nombre, usuario o email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#111827] placeholder-white/25 outline-none focus:border-purple-500/50"
        />
      </div>

      {/* Table */}
      <div className="bg-white/[0.025] border border-[#E4E9F0] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-purple-400" size={22} />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xs text-[#111827]/20">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E9F0]">
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#111827]/30">Usuario</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#111827]/30">Plan</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#111827]/30">Estado</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#111827]/30">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-[11px] font-black text-purple-400 shrink-0">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold truncate max-w-[120px]">{u.fullName}</p>
                            {u.isAdmin && <Crown size={10} className="text-yellow-400 shrink-0" />}
                            {u.locationChanged && (
                              <span className="flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 animate-pulse">
                                <AlertOctagon size={8} /> Ubicación
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#111827]/30 truncate max-w-[120px]">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PLAN_BADGE[u.plan] ?? PLAN_BADGE.NONE}`}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${u.isActive ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {updating === u.id ? (
                          <Loader2 size={14} className="animate-spin text-[#111827]/40" />
                        ) : (
                          <>
                            <button
                              onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                              title={u.isActive ? 'Desactivar' : 'Activar'}
                              className="p-1.5 rounded-lg bg-[#F4F6FA] hover:bg-[#EEF2F7] transition-colors"
                            >
                              {u.isActive
                                ? <UserX size={13} className="text-red-400" />
                                : <UserCheck size={13} className="text-green-400" />
                              }
                            </button>
                            <button
                              onClick={() => updateUser(u.id, { isAdmin: !u.isAdmin })}
                              title={u.isAdmin ? 'Quitar admin' : 'Hacer admin'}
                              className="p-1.5 rounded-lg bg-[#F4F6FA] hover:bg-[#EEF2F7] transition-colors"
                            >
                              {u.isAdmin
                                ? <ShieldOff size={13} className="text-yellow-400" />
                                : <Shield size={13} className="text-[#111827]/30" />
                              }
                            </button>
                            <select
                              value={u.plan}
                              onChange={e => updateUser(u.id, { plan: e.target.value })}
                              className="text-[10px] bg-[#0d0d1a] border border-[#E4E9F0] rounded-lg px-1.5 py-1 text-[#111827] outline-none cursor-pointer hover:border-[#E4E9F0] [&>option]:bg-[#0d0d1a] [&>option]:text-[#111827]"
                            >
                              <option value="NONE">NONE</option>
                              <option value="BASIC">BASIC</option>
                              <option value="PRO">PRO</option>
                              <option value="ELITE">ELITE</option>
                            </select>
                            <div className="flex items-center gap-0.5" title="Bots extra otorgados por admin">
                              <button
                                onClick={() => updateUser(u.id, { extraBots: Math.max(0, (u.extraBots ?? 0) - 1) })}
                                className="w-5 h-5 rounded bg-[#F4F6FA] hover:bg-[#EEF2F7] text-[#111827]/50 hover:text-[#111827] transition-colors flex items-center justify-center text-xs font-black leading-none"
                              >−</button>
                              <span className="text-[10px] font-black text-[#00FF88] min-w-[1.5rem] text-center" title={`+${u.extraBots ?? 0} bots extra`}>+{u.extraBots ?? 0}</span>
                              <button
                                onClick={() => updateUser(u.id, { extraBots: (u.extraBots ?? 0) + 1 })}
                                className="w-5 h-5 rounded bg-[#F4F6FA] hover:bg-[#00FF88]/20 text-[#111827]/50 hover:text-[#00FF88] transition-colors flex items-center justify-center text-xs font-black leading-none"
                              >+</button>
                            </div>
                            <button
                              onClick={() => openDevicesModal({ id: u.id, username: u.username, fullName: u.fullName })}
                              title="Ver dispositivos"
                              className="p-1.5 rounded-lg bg-amber-500/8 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                            >
                              <Smartphone size={13} className="text-amber-400" />
                            </button>
                            {!u.isAdmin && (
                              <button
                                onClick={() => setDeleteModal({ id: u.id, username: u.username, fullName: u.fullName })}
                                title="Eliminar usuario"
                                className="p-1.5 rounded-lg bg-red-500/8 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                              >
                                <Trash2 size={13} className="text-red-400" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-[#F4F6FA] border border-[#E4E9F0] disabled:opacity-30 hover:bg-[#EEF2F7] transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-[#111827]/40">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-[#F4F6FA] border border-[#E4E9F0] disabled:opacity-30 hover:bg-[#EEF2F7] transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Devices modal */}
      {devicesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setDevicesModal(null)} />
          <div className="relative bg-[#13131f] border border-amber-500/20 rounded-2xl p-6 w-full max-w-sm z-10 shadow-2xl shadow-black/60">

            <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.7), transparent)' }} />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Smartphone size={15} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#111827]">{devicesModal.fullName}</p>
                  <p className="text-[10px] text-[#111827]/30">@{devicesModal.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  En vivo
                </span>
                <button
                  onClick={() => loadDevices(devicesModal.id)}
                  title="Actualizar ahora"
                  className="p-1.5 rounded-lg hover:bg-[#EEF2F7] transition-colors"
                >
                  <RefreshCw size={13} className="text-[#111827]/30 hover:text-[#111827]/60" />
                </button>
                <button onClick={() => setDevicesModal(null)} className="p-1.5 rounded-lg hover:bg-[#EEF2F7] transition-colors">
                  <X size={14} className="text-[#111827]/40" />
                </button>
              </div>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-[#111827]/25 mb-3">Dispositivos de confianza</p>

            {devicesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={18} className="animate-spin text-amber-400" />
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-8">
                <Smartphone size={28} className="text-[#111827]/10 mx-auto mb-2" />
                <p className="text-xs text-[#111827]/25">Sin dispositivos registrados</p>
                <p className="text-[10px] text-[#111827]/15 mt-1">El usuario deberá verificar en su próximo inicio de sesión</p>
              </div>
            ) : (
              <div className="space-y-3">
                {devices.map(d => (
                  <div key={d.id} className="bg-white border border-[#E4E9F0] rounded-2xl overflow-hidden">

                    {/* Location changed banner */}
                    {d.locationChanged && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border-b border-orange-500/20">
                        <AlertOctagon size={12} className="text-orange-400 shrink-0" />
                        <p className="text-[10px] font-bold text-orange-400">Cambio de ubicación detectado</p>
                        {d.prevCity && d.prevIp && (
                          <p className="text-[10px] text-orange-400/60 ml-auto">Antes: {d.prevCity} · {d.prevIp}</p>
                        )}
                      </div>
                    )}

                    <div className="p-3 space-y-2.5">
                      {/* Header row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <Smartphone size={13} className="text-amber-400" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#111827]/80">{d.label ?? 'Dispositivo'}</p>
                            <p className="text-[10px] text-[#111827]/25 font-mono">{d.deviceId.slice(0, 14)}…</p>
                          </div>
                        </div>
                        <button
                          onClick={() => unlinkDevice(devicesModal.id, d.deviceId)}
                          disabled={unlinking === d.deviceId}
                          title="Desvincular"
                          className="p-1.5 rounded-lg bg-red-500/8 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                        >
                          {unlinking === d.deviceId
                            ? <Loader2 size={12} className="animate-spin text-red-400" />
                            : <Unlink size={12} className="text-red-400" />
                          }
                        </button>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {/* IP */}
                        <div className="flex items-start gap-1.5 bg-white/[0.025] rounded-lg px-2 py-1.5">
                          <Globe size={10} className="text-cyan-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] text-[#111827]/25 uppercase font-bold">IP</p>
                            <p className="text-[10px] text-cyan-300 font-mono">{d.ip ?? '—'}</p>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-start gap-1.5 bg-white/[0.025] rounded-lg px-2 py-1.5">
                          <MapPin size={10} className="text-green-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] text-[#111827]/25 uppercase font-bold">Ubicación</p>
                            <p className="text-[10px] text-[#111827]/70">{d.city ?? '—'}{d.country ? `, ${d.country}` : ''}</p>
                          </div>
                        </div>

                        {/* Device */}
                        <div className="flex items-start gap-1.5 bg-white/[0.025] rounded-lg px-2 py-1.5">
                          <Monitor size={10} className="text-purple-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] text-[#111827]/25 uppercase font-bold">Dispositivo</p>
                            <p className="text-[10px] text-[#111827]/70">{d.deviceType ?? '—'} · {d.os ?? '—'}</p>
                          </div>
                        </div>

                        {/* Browser */}
                        <div className="flex items-start gap-1.5 bg-white/[0.025] rounded-lg px-2 py-1.5">
                          <Smartphone size={10} className="text-blue-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] text-[#111827]/25 uppercase font-bold">Navegador</p>
                            <p className="text-[10px] text-[#111827]/70">{d.browser ?? '—'}</p>
                          </div>
                        </div>

                        {/* Last seen */}
                        <div className="col-span-2 flex items-start gap-1.5 bg-white/[0.025] rounded-lg px-2 py-1.5">
                          <Clock size={10} className="text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] text-[#111827]/25 uppercase font-bold">Último acceso</p>
                            <p className="text-[10px] text-[#111827]/70">
                              {new Date(d.lastSeen).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* GPS address + Ver en mapa */}
                      {(d.address || (d.lat && d.lng)) && (
                        <div className="space-y-1.5">
                          {d.address && (
                            <div className="flex items-start gap-1.5 bg-green-500/5 border border-green-500/15 rounded-lg px-2 py-1.5">
                              <MapPin size={10} className="text-green-400 mt-0.5 shrink-0" />
                              <p className="text-[10px] text-green-400/80 leading-snug">{d.address}</p>
                            </div>
                          )}
                          {d.lat && d.lng && (
                            <a
                              href={`https://www.google.com/maps?q=${d.lat},${d.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-[10px] font-bold transition-all hover:opacity-90 active:scale-[0.98]"
                              style={{ background: 'linear-gradient(135deg, #166534, #14532d)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}
                            >
                              <MapPin size={11} />
                              Ver ubicación en Google Maps
                              <ExternalLink size={9} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[10px] text-[#111827]/20 text-center mt-4">
              Al desvincular, el usuario tendrá que verificar de nuevo su dispositivo
            </p>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !deleting && setDeleteModal(null)} />
          <div className="relative bg-[#13131f] border border-red-500/20 rounded-2xl p-6 w-full max-w-sm z-10 shadow-2xl shadow-black/60">

            {/* Top red line */}
            <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.7), transparent)' }} />

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-4">
                <AlertTriangle size={26} className="text-red-400" />
              </div>
              <h3 className="text-base font-black text-[#111827] mb-1">Eliminar usuario</h3>
              <p className="text-xs text-[#111827]/40 mb-1">
                Estás a punto de eliminar a
              </p>
              <p className="text-sm font-black text-[#111827] mb-0.5">{deleteModal.fullName}</p>
              <p className="text-xs text-[#111827]/30 mb-4">@{deleteModal.username}</p>

              <div className="w-full flex items-start gap-2 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2.5 mb-5 text-left">
                <AlertTriangle size={12} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-400/80 leading-relaxed">
                  Esta acción es <strong>irreversible</strong>. Se eliminarán todos sus datos, bots, solicitudes y comisiones.
                </p>
              </div>

              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setDeleteModal(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] text-sm text-[#111827]/50 hover:bg-[#EEF2F7] transition-colors disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/80 border border-red-500/30 text-sm font-black text-[#111827] hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleting
                    ? <Loader2 size={14} className="animate-spin" />
                    : <><Trash2 size={13} /> Eliminar</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
