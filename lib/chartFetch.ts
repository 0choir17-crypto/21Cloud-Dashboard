import { supabase } from '@/lib/supabase'
import type { ChartApiResponse, OhlcvBar } from '@/types/chart'

const CODE_RE = /^\d{4}$/

/**
 * Client-side chart fetcher.
 *
 * The project is built with `output: "export"` (static hosting), so server-
 * side API routes can't run. We query Supabase directly from the browser
 * using the existing anon-key client. The return shape mirrors the response
 * shape that a `GET /api/chart/[code]` route would emit, so a future server
 * variant can be swapped in without touching call sites.
 */
export async function fetchChart(code: string): Promise<ChartApiResponse> {
  if (!CODE_RE.test(code)) {
    throw new Error('invalid code (must be 4-digit numeric)')
  }

  const { data, error } = await supabase
    .from('chart_ohlcv_cache')
    .select('date, open, high, low, close, volume')
    .eq('code', code)
    .order('date', { ascending: true })

  if (error) throw new Error(error.message)

  const ohlcv: OhlcvBar[] = (data ?? [])
    .filter(
      r =>
        r.date &&
        r.open != null &&
        r.high != null &&
        r.low != null &&
        r.close != null,
    )
    .map(r => ({
      date: r.date as string,
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: r.volume != null ? Number(r.volume) : 0,
    }))

  return { code, ohlcv, cockpit_rs: null, mc_v4: null }
}
