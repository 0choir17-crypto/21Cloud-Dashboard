export const SCREEN_NAME_MAP: Record<string, string> = {
  // --- Factor screens (screens.json由来) ---
  'rs126d_epsactual_PF52whigh':           'RS+EPS+Hi',
  'PF52wlow_epsactual_PF52whigh':         'Lo↑+EPS+Hi',
  'ret126d_epsactual_PF52whigh':          'R6m+EPS+Hi',
  'rs126d_BookValuePer_PF52whigh':        'RS+BPS+Hi',
  'epsactual_slopesma50_PF52whigh':       'EPS+Slp+Hi',
  'epsactual_PF52whigh_ret63d':           'EPS+Hi+R3m',
  'rs126d_epsactual_slopesma50':          'RS+EPS+Slp',
  'rs126d_BookValuePer':                  'RS+BPS',
  'ret126d_rs126d_BookValuePer':          'R6m+RS+BPS',
  'PF52wlow_rs126d_BookValuePer':         'Lo↑+RS+BPS',
  // --- Named screens (daily_screener.py _SCREEN_ENTRY_FILTERS由来) ---
  'PF52whigh_BookValuePer_epsactual_BullOnly':          'HiddenLdr',
  'BookValuePer_epsactual_distsma200_BullOnly':         'CANSLIM_MA',
  'BookValuePer_epsactual_clouddaysabo_BullOnly':       'CANSLIM_Cloud',
  'BookValuePer_epsactual_rscomposite_BullOnly':        'CANSLIM_RS',
  'EVT_VCP_BPS_BullOnly':                              'VCP',
  'EVT_Brk20d_52wh_EPS_BullOnly':                      'PEAD',
  'epsactual_epsgrowthyoy_BearOnly':                    'DeepRecov',
  'BookValuePer_epsgrowthyoy_BearOnly':                 'ValueRecov',
  'epsactual_BookValuePer_epsgrowthyoy_BearOnly':       'DeepValue',
  'EVT_GapUp3_EPS_EpsGr_BearOnly':                     'GapUp',
  'EVT_RVOL2x_BPS_EpsGr_BearOnly':                     'RVOL',
  'EVT_CWH_BPS_EPS':                                   'CWH',
}

// screen_name は | で複数連結されている場合がある
// 例: "CANSLIM_MA|CANSLIM_RS|HiddenLdr"
export function formatScreenName(raw: string): string {
  return raw
    .split('|')
    .map(s => SCREEN_NAME_MAP[s.trim()] ?? s.trim())
    .join(' · ')
}

// market_regime × scorecard_regime による推奨スクリーン（短縮名）
const RECOMMENDED_SCREENS: Record<string, string[]> = {
  'bull_strong_bull': ['HiddenLdr', 'CANSLIM_MA', 'CANSLIM_Cloud', 'CANSLIM_RS', 'VCP', 'PEAD'],
  'bull_bull':        ['HiddenLdr', 'CANSLIM_RS', 'CANSLIM_MA', 'VCP', 'PEAD'],
  'bull_neutral':     ['HiddenLdr', 'PEAD', 'VCP'],
  'bull_bear':        ['PEAD'],
  'neutral_neutral':  ['PEAD', 'DeepRecov'],
  'bear_bear':        ['DeepRecov', 'ValueRecov', 'DeepValue', 'GapUp', 'RVOL'],
  'bear_strong_bear': ['DeepRecov', 'ValueRecov', 'DeepValue'],
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
