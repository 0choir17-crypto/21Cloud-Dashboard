export const SCREEN_NAME_MAP: Record<string, string> = {
  // screens_v3 構成（5本）
  'FCT_SMA10_SMA50_RS70':  'SMA10+50押目',
  'FCT_EMA21_SMA10_RS70':  'EMA21押目',
  'EVT_SMA10_ADR_Gap3':    'Gap反発',
  'EVT_RVOL2x_BPS_EpsGr':  'RVOL2x',
  'EVT_CWH_BPS_EPS':       'CWH',
}

// screens_v3 成績順ランク（小さいほど上位）
export const SCREEN_RANK: Record<string, number> = {
  'FCT_SMA10_SMA50_RS70':  1,
  'FCT_EMA21_SMA10_RS70':  2,
  'EVT_SMA10_ADR_Gap3':    3,
  'EVT_RVOL2x_BPS_EpsGr':  4,
  'EVT_CWH_BPS_EPS':        5,
}

// screen_name は | で複数連結されている場合がある
// 例: "EVT_RVOL2x_BPS_EpsGr|EVT_CWH_BPS_EPS"
export function formatScreenName(raw: string): string {
  return raw
    .split('|')
    .map(s => SCREEN_NAME_MAP[s.trim()] ?? s.trim())
    .join(' · ')
}

// v3 は全スクリーン regime="both" のため、全環境で全スクリーン推奨
// scorecardRegime による優先度差なし
const RECOMMENDED_SCREENS: Record<string, string[]> = {
  'bull_strong_bull': ['SMA10+50押目', 'EMA21押目', 'Gap反発', 'RVOL2x', 'CWH'],
  'bull_bull':        ['SMA10+50押目', 'EMA21押目', 'Gap反発', 'RVOL2x', 'CWH'],
  'bull_neutral':     ['SMA10+50押目', 'EMA21押目', 'Gap反発', 'RVOL2x', 'CWH'],
  'bull_bear':        ['SMA10+50押目', 'EMA21押目', 'Gap反発', 'RVOL2x', 'CWH'],
  'neutral_neutral':  ['SMA10+50押目', 'EMA21押目', 'Gap反発', 'RVOL2x', 'CWH'],
  'bear_bear':        ['SMA10+50押目', 'EMA21押目', 'Gap反発', 'RVOL2x', 'CWH'],
  'bear_strong_bear': ['SMA10+50押目', 'EMA21押目', 'Gap反発', 'RVOL2x', 'CWH'],
}

export function getRecommendedScreens(
  marketRegime?: string | null,
  scorecardRegime?: string | null,
): string[] {
  if (!marketRegime || !scorecardRegime) return []
  return RECOMMENDED_SCREENS[`${marketRegime}_${scorecardRegime}`] ?? []
}

// raw screen_name（|区切り可）が推奨リストに含まれるか判定
export function isRecommended(raw: string, recommended: string[]): boolean {
  if (recommended.length === 0) return false
  const shortNames = raw.split('|').map(s => SCREEN_NAME_MAP[s.trim()] ?? s.trim())
  return shortNames.some(name => recommended.includes(name))
}
