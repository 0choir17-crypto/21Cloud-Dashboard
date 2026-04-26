import { supabase } from './supabase'
import type { TimeSeriesPoint } from '@/components/market/TimeSeriesChart'

const DEFAULT_LOOKBACK_DAYS = 180

function startDateStr(lookbackDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() - lookbackDays)
  return d.toISOString().slice(0, 10)
}

export async function fetchMcScoreTimeSeries(
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS,
): Promise<TimeSeriesPoint[]> {
  // v4 (0-100) を優先取得。v4 が未書き込みの古い日付は v3 (0-21) を 100 換算で表示。
  const { data, error } = await supabase
    .from('market_conditions')
    .select('date, mc_v4, mc_score')
    .gte('date', startDateStr(lookbackDays))
    .order('date', { ascending: true })

  if (error || !data) return []

  return (data as { date: string; mc_v4: number | null; mc_score: number | null }[])
    .map((r) => {
      // v4 があればそのまま 0-100、なければ v3 を 0-21 → 0-100 に正規化して欠損を埋める
      const v = r.mc_v4 != null
        ? Number(r.mc_v4)
        : r.mc_score != null
          ? (Number(r.mc_score) / 21) * 100
          : Number.NaN
      return { time: r.date, value: v }
    })
    .filter((p) => Number.isFinite(p.value))
}

export async function fetchAdvDecRatioTimeSeries(
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS,
): Promise<TimeSeriesPoint[]> {
  const { data, error } = await supabase
    .from('market_conditions')
    .select('date, ad_ratio_10')
    .gte('date', startDateStr(lookbackDays))
    .order('date', { ascending: true })

  if (error || !data) return []

  return (data as { date: string; ad_ratio_10: number | null }[])
    .map((r) => ({ time: r.date, value: Number(r.ad_ratio_10) }))
    .filter((p) => Number.isFinite(p.value))
}

export async function fetchNhNlDiffTimeSeries(
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS,
): Promise<TimeSeriesPoint[]> {
  const { data, error } = await supabase
    .from('market_conditions')
    .select('date, nh_nl_diff')
    .gte('date', startDateStr(lookbackDays))
    .order('date', { ascending: true })

  if (error || !data) return []

  return (data as { date: string; nh_nl_diff: number | null }[])
    .map((r) => ({ time: r.date, value: Number(r.nh_nl_diff) }))
    .filter((p) => Number.isFinite(p.value))
}

export async function fetchPctAboveSmaTimeSeries(
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS,
): Promise<{ sma50: TimeSeriesPoint[]; sma200: TimeSeriesPoint[] }> {
  const { data, error } = await supabase
    .from('market_conditions')
    .select('date, pct_above_sma50, pct_above_sma200')
    .gte('date', startDateStr(lookbackDays))
    .order('date', { ascending: true })

  if (error || !data) return { sma50: [], sma200: [] }

  const rows = data as {
    date: string
    pct_above_sma50: number | null
    pct_above_sma200: number | null
  }[]

  return {
    sma50: rows
      .map((r) => ({ time: r.date, value: Number(r.pct_above_sma50) }))
      .filter((p) => Number.isFinite(p.value)),
    sma200: rows
      .map((r) => ({ time: r.date, value: Number(r.pct_above_sma200) }))
      .filter((p) => Number.isFinite(p.value)),
  }
}
