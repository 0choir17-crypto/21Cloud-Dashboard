import { supabase } from '@/lib/supabase'
import type {
  ChartApiResponse,
  OhlcvBar,
  StructurePivotBar,
} from '@/types/chart'

const CODE_RE = /^\d{4}$/

export interface FetchChartOptions {
  /** Limit to the most recent N trading days (server-side via DB ORDER + LIMIT, then re-sorted ASC). Omit/null = full history. */
  lookbackDays?: number | null
}

const SELECT_COLUMNS = [
  'date', 'open', 'high', 'low', 'close', 'volume',
  // Structure Pivot overlay (LL-HL long setup)
  'struct_long_curr_pivot',
  'struct_long_prev_pivot',
  'struct_long_break_val',
  'struct_long_active',
  'struct_long_just_broke',
  'sp_long_winning_length',
].join(', ')

/**
 * Client-side chart fetcher.
 *
 * The project is built with `output: "export"` (static hosting), so server-
 * side API routes can't run. We query Supabase directly from the browser
 * using the existing anon-key client. The return shape mirrors the response
 * shape that a `GET /api/chart/[code]` route would emit, so a future server
 * variant can be swapped in without touching call sites.
 */
export async function fetchChart(
  code: string,
  opts: FetchChartOptions = {},
): Promise<ChartApiResponse> {
  if (!CODE_RE.test(code)) {
    throw new Error('invalid code (must be 4-digit numeric)')
  }

  const lookback = opts.lookbackDays ?? null

  // For limited lookback we order DESC and limit, then reverse client-side.
  let query = supabase
    .from('chart_ohlcv_cache')
    .select(SELECT_COLUMNS)
    .eq('code', code)

  query = lookback != null
    ? query.order('date', { ascending: false }).limit(lookback)
    : query.order('date', { ascending: true })

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>
  const sorted = lookback != null ? [...rows].reverse() : rows

  const validBars = sorted.filter(
    r =>
      r.date &&
      r.open != null &&
      r.high != null &&
      r.low != null &&
      r.close != null,
  )

  const ohlcv: OhlcvBar[] = validBars.map(r => ({
    date: r.date as string,
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: r.volume != null ? Number(r.volume) : 0,
  }))

  const structurePivot: StructurePivotBar[] = validBars.map(r => ({
    date: r.date as string,
    curr_pivot: r.struct_long_curr_pivot != null ? Number(r.struct_long_curr_pivot) : null,
    prev_pivot: r.struct_long_prev_pivot != null ? Number(r.struct_long_prev_pivot) : null,
    break_val: r.struct_long_break_val != null ? Number(r.struct_long_break_val) : null,
    active: Boolean(r.struct_long_active),
    just_broke: Boolean(r.struct_long_just_broke),
    winning_length: r.sp_long_winning_length != null ? Number(r.sp_long_winning_length) : null,
  }))

  return { code, ohlcv, structurePivot, cockpit_rs: null, mc_v4: null }
}
