import { supabase } from '@/lib/supabase'
import type {
  ChartApiResponse,
  OhlcvBar,
  StructurePivotBar,
} from '@/types/chart'

const CODE_RE = /^[A-Z0-9]{4}$/i

export interface FetchChartOptions {
  /** Limit to the most recent N trading days (server-side via DB ORDER + LIMIT, then re-sorted ASC). Omit/null = full history. */
  lookbackDays?: number | null
}

const OHLCV_COLUMNS = 'date, open, high, low, close, volume'

const STRUCTURE_PIVOT_COLUMNS = [
  'date',
  'struct_long_curr_pivot',
  'struct_long_prev_pivot',
  'struct_long_break_val',
  'struct_long_active',
  'struct_long_just_broke',
  'sp_long_winning_length',
].join(', ')

// One-shot warning so the console isn't spammed for every card on the grid.
let warnedAboutMissingStructurePivot = false

/**
 * Client-side chart fetcher.
 *
 * The project is built with `output: "export"` (static hosting), so server-
 * side API routes can't run. We query Supabase directly from the browser
 * using the existing anon-key client. The return shape mirrors the response
 * shape that a `GET /api/chart/[code]` route would emit, so a future server
 * variant can be swapped in without touching call sites.
 *
 * OHLCV and the Structure Pivot overlay are fetched as two separate queries
 * so that a missing / not-yet-populated overlay column set does not break
 * the base chart. If the second query errors, we just return no overlay.
 */
export async function fetchChart(
  code: string,
  opts: FetchChartOptions = {},
): Promise<ChartApiResponse> {
  if (!CODE_RE.test(code)) {
    throw new Error('invalid code (must be 4-digit numeric)')
  }

  const lookback = opts.lookbackDays ?? null

  // ---- OHLCV (base) ----------------------------------------------------
  let ohlcvQ = supabase
    .from('chart_ohlcv_cache')
    .select(OHLCV_COLUMNS)
    .eq('code', code)

  ohlcvQ = lookback != null
    ? ohlcvQ.order('date', { ascending: false }).limit(lookback)
    : ohlcvQ.order('date', { ascending: true })

  const { data: ohlcvData, error: ohlcvErr } = await ohlcvQ
  if (ohlcvErr) throw new Error(ohlcvErr.message)

  const ohlcvRows = (ohlcvData ?? []) as unknown as Array<Record<string, unknown>>
  const ohlcvSorted = lookback != null ? [...ohlcvRows].reverse() : ohlcvRows

  const ohlcv: OhlcvBar[] = ohlcvSorted
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

  // ---- Structure Pivot overlay (best-effort) ---------------------------
  let structurePivot: StructurePivotBar[] = []
  try {
    let spQ = supabase
      .from('chart_ohlcv_cache')
      .select(STRUCTURE_PIVOT_COLUMNS)
      .eq('code', code)

    spQ = lookback != null
      ? spQ.order('date', { ascending: false }).limit(lookback)
      : spQ.order('date', { ascending: true })

    const { data: spData, error: spErr } = await spQ
    if (spErr) {
      if (!warnedAboutMissingStructurePivot) {
        warnedAboutMissingStructurePivot = true
        console.warn(
          '[structure-pivot] overlay columns unavailable in chart_ohlcv_cache:',
          spErr.message,
          '— chart will render without the overlay until the backend (21-Cloudl-Database) populates these columns.',
        )
      }
    } else {
      const spRows = (spData ?? []) as unknown as Array<Record<string, unknown>>
      const spSorted = lookback != null ? [...spRows].reverse() : spRows
      structurePivot = spSorted
        .filter(r => r.date)
        .map(r => ({
          date: r.date as string,
          curr_pivot:
            r.struct_long_curr_pivot != null ? Number(r.struct_long_curr_pivot) : null,
          prev_pivot:
            r.struct_long_prev_pivot != null ? Number(r.struct_long_prev_pivot) : null,
          break_val:
            r.struct_long_break_val != null ? Number(r.struct_long_break_val) : null,
          active: Boolean(r.struct_long_active),
          just_broke: Boolean(r.struct_long_just_broke),
          winning_length:
            r.sp_long_winning_length != null ? Number(r.sp_long_winning_length) : null,
        }))
    }
  } catch (e) {
    if (!warnedAboutMissingStructurePivot) {
      warnedAboutMissingStructurePivot = true
      console.warn('[structure-pivot] overlay fetch failed:', e)
    }
  }

  return { code, ohlcv, structurePivot, cockpit_rs: null, mc_v4: null }
}
