export interface Trade {
  id: number
  ticker: string
  company_name: string | null
  screen_name: string | null
  entry_date: string
  entry_price: number
  shares: number
  exit_date: string | null
  exit_price: number | null
  pnl: number | null
  pnl_pct: number | null
  result: 'WIN' | 'LOSS' | null
  mc_score: number | null
  mc_regime: string | null
  memo: string | null
  status: 'OPEN' | 'CLOSED'
  created_at: string
  updated_at: string

  // Portfolio統合用（Step C準備）
  sector: string | null
  stop_price: number | null
  target_r: number | null
  exit_reason: string | null
  r_multiple: number | null

  // シグナルスナップショット
  signal_price: number | null
  rs_at_entry: number | null
  rvol_at_entry: number | null
  adr_at_entry: number | null
  dist_ema21_at_entry: number | null
  stop_pct_at_entry: number | null
  mc_met_at_entry: boolean | null
  mc_condition_at_entry: string | null
}
