export type OhlcvBar = {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type ChartApiResponse = {
  code: string
  ohlcv: OhlcvBar[]
  // future overlay slots — currently null but kept for forward-compat
  cockpit_rs?: { date: string; value: number }[] | null
  mc_v4?: { date: string; value: number }[] | null
}
