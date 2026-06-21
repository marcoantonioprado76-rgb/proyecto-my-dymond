'use client'

import dynamic from 'next/dynamic'

const AdminEditor = dynamic(() => import('./AdminEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-32 text-white/40">
      <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
    </div>
  ),
})

export default function NuevaPlantillaPage() {
  return <AdminEditor />
}
