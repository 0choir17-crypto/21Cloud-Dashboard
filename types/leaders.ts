export type DailyLeader = {
  date: string
  code: string
  name: string | null
  sector: string | null
  rs_composite: number | null
  daily_pct: number | null
  adr_pct: number | null
  weekly_pct: number | null
  monthly_pct: number | null
  dist_ema21_r: number | null
  dist_wma10_r: number | null
  dist_sma50_r: number | null
}
