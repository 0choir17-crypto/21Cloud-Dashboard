export const SCREEN_NAME_MAP: Record<string, string> = {
  // screens_v4 構成（8本）— RS再最適化 + 新規2スクリーン
  'FCT_SMA10_SMA50_CRS':   'SMA10+50押目',
  'FCT_EMA21_SMA10_CRS':   'EMA21押目',
  'EVT_SMA10_ADR_Gap3':    'Gap反発',
  'EVT_RVOL2x_BPS_EpsGr':  'RVOL2x',
  'EVT_CWH_BPS_EPS':       'CWH',
  'FCT_ValueQuality_CRS':  'バリュー品質',
  'FCT_RS_Divergence':     'RS乖離反発',
  'FCT_RS_VCS_Coil':       'RS×VCSコイル',
}

// screens_v4 成績順ランク（PF降順）
export const SCREEN_RANK: Record<string, number> = {
  'EVT_SMA10_ADR_Gap3':    1,  // PF 55.49
  'FCT_RS_Divergence':     2,  // PF 36.82
  'FCT_EMA21_SMA10_CRS':   3,  // PF 33.06
  'FCT_SMA10_SMA50_CRS':   4,  // PF 20.39
  'EVT_CWH_BPS_EPS':       5,  // PF 4.42
  'EVT_RVOL2x_BPS_EpsGr':  6,  // PF 4.23
  'FCT_ValueQuality_CRS':  7,  // PF 4.20
  'FCT_RS_VCS_Coil':       8,  // PF 2.78
}

// screen_name は | で複数連結されている場合がある
// 例: "EVT_RVOL2x_BPS_EpsGr|EVT_CWH_BPS_EPS"
export function formatScreenName(raw: string): string {
  return raw
    .split('|')
    .map(s => SCREEN_NAME_MAP[s.trim()] ?? s.trim())
    .join(' · ')
}

// 全スクリーン regime="both" のため、全環境で全スクリーン推奨
const RECOMMENDED_SCREENS: Record<string, string[]> = {
  'bull_strong_bull': ['SMA10+50押目', 'EMA21押目', 'Gap反発', 'RVOL2x', 'CWH', 'バリュー品質', 'RS乖離反発', 'RS×VCSコイル'],
  'bull_bull':        ['SMA10+50押目', 'EMA21押目', 'Gap反発', 'RVOL2x', 'CWH', 'バリュー品質', 'RS乖離反発', 'RS×VCSコイル'],
  'bull_neutral':     ['SMA10+50押目', 'EMA21押目', 'Gap反発', 'RVOL2x', 'CWH', 'バリュー品質', 'RS乖離反発', 'RS×VCSコイル'],
  'bull_bear':        ['SMA10+50押目', 'EMA21押目', 'Gap反発', 'RVOL2x', 'CWH', 'バリュー品質', 'RS乖離反発', 'RS×VCSコイル'],
  'neutral_neutral':  ['SMA10+50押目', 'EMA21押目', 'Gap反発', 'RVOL2x', 'CWH', 'バリュー品質', 'RS乖離反発', 'RS×VCSコイル'],
  'bear_bear':        ['SMA10+50押目', 'EMA21押目', 'Gap反発', 'RVOL2x', 'CWH', 'バリュー品質', 'RS乖離反発', 'RS×VCSコイル'],
  'bear_strong_bear': ['SMA10+50押目', 'EMA21押目', 'Gap反発', 'RVOL2x', 'CWH', 'バリュー品質', 'RS乖離反発', 'RS×VCSコイル'],
}

export function getRecommendedScreens(
  marketRegime?: string | null,
  scorecardRegime?: string | null,
): string[] {
  if (!marketRegime || !scorecardRegime) return []
  return RECOMMENDED_SCREENS[`${marketRegime}_${scorecardRegime}`] ?? []
}

export function isRecommended(raw: string, recommended: string[]): boolean {
  if (recommended.length === 0) return false
  const shortNames = raw.split('|').map(s => SCREEN_NAME_MAP[s.trim()] ?? s.trim())
  return shortNames.some(name => recommended.includes(name))
}
