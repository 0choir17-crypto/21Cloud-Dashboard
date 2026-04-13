// screens_v4: 8スクリーン + BearRS_Leader + DIV_DY_Incr_EpsGr (10スクリーン)
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
  'DIV_DY_Incr_EpsGr':     'Div Bear',
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
  'DIV_DY_Incr_EpsGr':     8,  // PF 5.69 (MC<=1のみ発動)
  'BearRS_Leader':          9,  // PF 3.06 (MC<=4のみ発動)
  'FCT_RS_VCS_Coil':       10, // PF 2.78
}

// MC 条件マッピング
export const MC_V3_CONDITIONS: Record<string, { type: 'always_on' | 'bear' | 'bull'; threshold?: number; label: string }> = {
  'FCT_SMA10_SMA50_CRS':  { type: 'always_on', label: '' },
  'FCT_EMA21_SMA10_CRS':  { type: 'always_on', label: '' },
  'EVT_SMA10_ADR_Gap3':   { type: 'always_on', label: '' },
  'FCT_RS_Divergence':    { type: 'always_on', label: '' },
  'EVT_RVOL2x_BPS_EpsGr': { type: 'bear', threshold: 9, label: 'MC\u22649' },
  'BearRS_Leader':         { type: 'bear', threshold: 4, label: 'MC\u22644' },
  'DIV_DY_Incr_EpsGr':    { type: 'bear', threshold: 1, label: 'MC\u22641' },
  'EVT_CWH_BPS_EPS':      { type: 'bull', threshold: 17, label: 'MC\u226517' },
  'FCT_RS_VCS_Coil':      { type: 'bull', threshold: 18, label: 'MC\u226518' },
  'FCT_ValueQuality_CRS': { type: 'bull', threshold: 20, label: 'MC\u226520' },
}

// screen_name は | で複数連結されている場合がある
export function formatScreenName(raw: string): string {
  return raw
    .split('|')
    .map(s => SCREEN_NAME_MAP[s.trim()] ?? s.trim())
    .join(' \u00B7 ')
}

// MC ベースの推奨スクリーン判定
// Always-on は常に推奨、Bear/Bull は MC 条件で判定
const RECOMMENDED_SCREENS: Record<string, string[]> = {
  'bull_strong_bull': ['Gap Up', 'RS Dip', '21EMA Pullback', '10/50SMA Pullback', 'CWH', 'RVOL 2x', 'Value', 'VCS Coil'],
  'bull_bull':        ['Gap Up', 'RS Dip', '21EMA Pullback', '10/50SMA Pullback', 'CWH', 'RVOL 2x', 'Value', 'VCS Coil'],
  'bull_neutral':     ['Gap Up', 'RS Dip', '21EMA Pullback', '10/50SMA Pullback', 'CWH', 'RVOL 2x', 'Value', 'VCS Coil'],
  'bull_bear':        ['Gap Up', 'RS Dip', '21EMA Pullback', '10/50SMA Pullback', 'CWH', 'RVOL 2x', 'Value', 'VCS Coil', 'BearRS'],
  'neutral_neutral':  ['Gap Up', 'RS Dip', '21EMA Pullback', '10/50SMA Pullback', 'CWH', 'RVOL 2x', 'Value', 'VCS Coil'],
  'bear_bear':        ['Gap Up', 'RS Dip', '21EMA Pullback', '10/50SMA Pullback', 'RVOL 2x', 'BearRS', 'Div Bear'],
  'bear_strong_bear': ['Gap Up', 'RS Dip', '21EMA Pullback', '10/50SMA Pullback', 'RVOL 2x', 'BearRS', 'Div Bear'],
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

// Premium データ使用フラグ
export const PREMIUM_SCREENS = new Set(['DIV_DY_Incr_EpsGr'])

export function isPremiumScreen(screenName: string): boolean {
  return screenName.split('|').some(s => PREMIUM_SCREENS.has(s.trim()))
}
