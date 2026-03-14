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
}
