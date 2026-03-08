export type DailySignal = {
  date: string
  code: string
  company_name: string | null
  screen_name: string
  sector_name: string | null
  close: number | null
  price_chg_1d: number | null
  price_chg_5d: number | null
  rs_composite: number | null
  rvol: number | null
  adr_pct: number | null
  dist_ema21_r: number | null
  dist_10wma_r: number | null
  dist_50sma_r: number | null
  high_52w_pct: number | null
  stop_pct: number | null
  hit_count: number | null
  // エントリースコア
  entry_score?: number    // 1〜3
  entry_stars?: string    // "★" | "★★" | "★★★"
  entry_badges?: string   // JSON文字列 例: '["EMA21 0.5R以内", "SMA10 0.5R以内"]'
}
