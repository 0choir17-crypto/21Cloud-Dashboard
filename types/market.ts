export type MarketConditions = {
  date: string
  market_regime: 'bull' | 'bear' | 'neutral'
  breadth_regime: 'strong' | 'normal' | 'weak'
  scorecard_regime: 'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear'
  positive_count: number
  total_count: number
  positive_pct: number
  // TOPIX
  topix_price: number | null
  topix_chg_1w: number | null
  topix_chg_1m: number | null
  topix_chg_ytd: number | null
  topix_chg_1y: number | null
  topix_pct_52wh: number | null
  topix_dist_sma50: number | null
  topix_dist_sma200: number | null
  topix_above_sma50: boolean | null
  topix_above_sma200: boolean | null
  // 日経225
  nikkei_price: number | null
  nikkei_chg_1w: number | null
  nikkei_chg_1m: number | null
  nikkei_chg_ytd: number | null
  nikkei_chg_1y: number | null
  nikkei_pct_52wh: number | null
  nikkei_dist_sma50: number | null
  nikkei_dist_sma200: number | null
  nikkei_above_sma50: boolean | null
  nikkei_above_sma200: boolean | null
  // グロース250
  growth_price: number | null
  growth_chg_1w: number | null
  growth_chg_1m: number | null
  growth_chg_ytd: number | null
  growth_chg_1y: number | null
  growth_pct_52wh: number | null
  growth_dist_sma50: number | null
  growth_dist_sma200: number | null
  growth_above_sma50: boolean | null
  growth_above_sma200: boolean | null
  // Breadth
  advances: number | null
  declines: number | null
  advance_pct: number | null
  ad_ratio_10: number | null
  ad_ratio_25: number | null
  new_highs: number | null
  new_lows: number | null
  nh_nl_diff: number | null
  pct_above_sma50: number | null
  pct_above_sma200: number | null
  // 12要因 (v1)
  f01_idx_perf_1w: boolean | null
  f02_idx_perf_1m: boolean | null
  f03_idx_perf_ytd: boolean | null
  f04_idx_perf_1y: boolean | null
  f05_idx_ma_position: boolean | null
  f06_idx_52wh: boolean | null
  f07_sec_perf_positive: boolean | null
  f08_sec_52wh: boolean | null
  f09_sec_ma_position: boolean | null
  f10_breadth_adv_pct: boolean | null
  f11_breadth_sma50: boolean | null
  f12_vix_condition: boolean | null
  // MC Score v3 (0-21, 7ファクター × 0-3点)
  mc_score?: number | null
  mc_score_v1?: number | null
  mc_score_v3?: number | null
  mc_regime_v3?: 'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear' | null
  divergence_flag?: number | null
  // v3 個別ファクター (0-3)
  f1_idx_momentum?: number | null
  f2_idx_trend?: number | null
  f3_idx_long_trend?: number | null
  f4_ema21_slope?: number | null
  f5_sell_pressure?: number | null
  f6_foreign_flow?: number | null
  f7_idx_52wh_distance?: number | null
}
