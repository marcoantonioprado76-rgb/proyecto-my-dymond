export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { runFinalReport } from '@/lib/reto90d/scheduler'

// Respaldo manual del reporte final del Reto 90D (protegido por CRON_SECRET).
// El disparo automático lo hace el worker in-process de instrumentation.ts cada 60s;
// este endpoint permite forzar/probar con ?force=1 (ignora la ventana horaria).
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const force = new URL(req.url).searchParams.get('force') === '1'
  const result = await runFinalReport({ force })
  return NextResponse.json(result)
}
