'use client'

import { LayoutTemplate } from 'lucide-react'
import RecursosTabs from '../RecursosTabs'
import ResourcesAdmin from '../ResourcesAdmin'

export default function AdminPresentacionesPage() {
  return (
    <div>
      <h1 className="text-xl font-black text-white flex items-center gap-2 mb-5">
        <LayoutTemplate size={20} className="text-purple-400" /> Recursos
      </h1>
      <RecursosTabs />
      <ResourcesAdmin tipo="presentacion" />
    </div>
  )
}
