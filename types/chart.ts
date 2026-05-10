export type OhlcvBar = {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// LL-HL Structure Pivot per-bar overlay data (from chart_ohlcv_cache).
// Aligned to the same date series as OhlcvBar.
export type StructurePivotBar = {
  date: string
  curr_pivot: number | null   // HL price (struct_long_curr_pivot)
  prev_pivot: number | null   // LL price (struct_long_prev_pivot)
  break_val: number | null    // pivot break target (struct_long_break_val)
  active: boolean             // setup 区間 (struct_long_active)
  just_broke: boolean         // HL_BREAK 当日 (struct_long_just_broke)
  winning_length: number | null  // 採用 length (sp_long_winning_length)
}

export type ChartApiResponse = {
  code: string
  ohlcv: OhlcvBar[]
  structurePivot?: StructurePivotBar[] | null
  // future overlay slots — currently null but kept for forward-compat
  cockpit_rs?: { date: string; value: number }[] | null
  mc_v4?: { date: string; value: number }[] | null
}
