export type DailyLeader = {
  date: string
  code: string
  name: string | null
  sector: string | null
  rs_composite: number | null
  adr_pct: number | null
  turnover_50d: number | null
  weekly_pct: number | null
  monthly_pct: number | null
  close: number | null
  volume: number | null
  wma10: number | null
  wma30: number | null
  sma50: number | null
}
