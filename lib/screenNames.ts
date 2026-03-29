// screens_v4: 8スクリーン + BearRS_Leader — 英語統一表示名
export const SCREEN_NAME_MAP: Record<string, string> = {
  'EVT_SMA10_ADR_Gap3':    'Gap Up',
  'FCT_RS_Divergence':     'RS Dip',
  'FCT_EMA21_SMA10_CRS':   '21EMA Pullback',
  'FCT_SMA10_SMA50_CRS':   '10/50SMA Pullback',
  'EVT_CWH_BPS_EPS':       'CWH',
  'EVT_RVOL2x_BPS_EpsGr':  'RVOL 2x',
  'FCT_ValueQuality_CRS':  'Value',
  'FCT_RS_VCS_Coil':       'VCS Coil',
  'BearRS_Leader':          'BearRS',
}

// screens_v4 成績順ランク（PF降順）— フィルタータブの表示順
export const SCREEN_RANK: Record<string, number> = {
  'EVT_SMA10_ADR_Gap3':    1,  // PF 55.49
  'FCT_RS_Divergence':     2,  // PF 36.82
  'FCT_EMA21_SMA10_CRS':   3,  // PF 33.06
  'FCT_SMA10_SMA50_CRS':   4,  // PF 20.39
  'EVT_CWH_BPS_EPS':       5,  // PF 4.42
  'EVT_RVOL2x_BPS_EpsGr':  6,  // PF 4.23
  'FCT_ValueQuality_CRS':  7,  // PF 4.20
  'BearRS_Leader':          8,  // PF 3.06 (MC≤3のみ発動)
  'FCT_RS_VCS_Coil':       9,  // PF 2.78
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
// BearRS は bear/strong_bear 環境でのみ推奨（MC≤3 で発動するスクリーン）
const RECOMMENDED_SCREENS: Record<string, string[]> = {
  'bull_strong_bull': ['Gap Up', 'RS Dip', '21EMA Pullback', '10/50SMA Pullback', 'CWH', 'RVOL 2x', 'Value', 'VCS Coil'],
  'bull_bull':        ['Gap Up', 'RS Dip', '21EMA Pullback', '10/50SMA Pullback', 'CWH', 'RVOL 2x', 'Value', 'VCS Coil'],
  'bull_neutral':     ['Gap Up', 'RS Dip', '21EMA Pullback', '10/50SMA Pullback', 'CWH', 'RVOL 2x', 'Value', 'VCS Coil'],
  'bull_bear':        ['Gap Up', 'RS Dip', '21EMA Pullback', '10/50SMA Pullback', 'CWH', 'RVOL 2x', 'Value', 'VCS Coil', 'BearRS'],
  'neutral_neutral':  ['Gap Up', 'RS Dip', '21EMA Pullback', '10/50SMA Pullback', 'CWH', 'RVOL 2x', 'Value', 'VCS Coil'],
  'bear_bear':        ['Gap Up', 'RS Dip', '21EMA Pullback', '10/50SMA Pullback', 'CWH', 'RVOL 2x', 'Value', 'VCS Coil', 'BearRS'],
  'bear_strong_bear': ['Gap Up', 'RS Dip', '21EMA Pullback', '10/50SMA Pullback', 'CWH', 'RVOL 2x', 'Value', 'VCS Coil', 'BearRS'],
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
