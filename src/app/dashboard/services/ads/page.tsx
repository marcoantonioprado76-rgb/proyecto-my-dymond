// Ads → Meta (default)
// El servicio "Ads" se separó en 3 dashboards independientes: Meta, TikTok y Google.
// Esta ruta legacy redirige al dashboard de Meta (la única plataforma activa hoy).
// Todas las sub-rutas (wizard, setup, brief, strategies, history, analytics, preview, campaign)
// siguen viviendo bajo /dashboard/services/ads/* y funcionan sin cambios.
//
// Backup del dashboard agregador original: page.tsx.bak
import { redirect } from 'next/navigation'

export default function AdsLegacyPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    // Preservar query params (?connected=META, ?error=..., etc.) durante el redirect
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
        if (typeof value === 'string') params.set(key, value)
        else if (Array.isArray(value) && value[0]) params.set(key, value[0])
    }
    const query = params.toString()
    redirect(`/dashboard/services/ads/meta${query ? `?${query}` : ''}`)
}
