export const SCREEN_NAME_MAP: Record<string, string> = {
  // STRONG（環境非依存エッジ確認済み）
  'EVT_RVOL2x_BPS_EpsGr':   'RVOL2x+BPS',
  'EVT_RVOL15_EpsGr':        'RVOL1.5+EpsGr',
  'EVT_HighVolPrev_EpsGr':   'HighVol翌日+EpsGr',
  'EVT_GapUp3_EPS80':        'GapUp3%+EPS',
  // GOOD（条件付きエッジ）
  'EVT_HighVolPrev_BPS':     'HighVol翌日+BPS',
  'EVT_GapUp3_EPS95':        'GapUp3%+EPS95',
  'EVT_CloudBreak_RS_EPS':   'CloudBrk+RS',
  // CWH（既存維持）
  'EVT_CWH_BPS_EPS':         'CWH',
}

// 成績順ランク（小さいほど上位）: STRONG → GOOD → CWH
export const SCREEN_RANK: Record<string, number> = {
  'EVT_RVOL2x_BPS_EpsGr':   1,
  'EVT_RVOL15_EpsGr':        2,
  'EVT_HighVolPrev_EpsGr':   3,
  'EVT_GapUp3_EPS80':        4,
  'EVT_HighVolPrev_BPS':     5,
  'EVT_GapUp3_EPS95':        6,
  'EVT_CloudBreak_RS_EPS':   7,
  'EVT_CWH_BPS_EPS':         8,
}

// screen_name は | で複数連結されている場合がある
// 例: "EVT_RVOL2x_BPS_EpsGr|EVT_GapUp3_EPS80"
export function formatScreenName(raw: string): string {
  return raw
    .split('|')
    .map(s => SCREEN_NAME_MAP[s.trim()] ?? s.trim())
    .join(' · ')
}

// 全スクリーンが regime="both" のため推奨はstability別に定義
// STRONG screens は全環境で推奨、GOOD は補助的
const RECOMMENDED_SCREENS: Record<string, string[]> = {
  'bull_strong_bull': ['RVOL2x+BPS', 'RVOL1.5+EpsGr', 'HighVol翌日+EpsGr', 'GapUp3%+EPS', 'HighVol翌日+BPS', 'GapUp3%+EPS95', 'CloudBrk+RS', 'CWH'],
  'bull_bull':        ['RVOL2x+BPS', 'RVOL1.5+EpsGr', 'HighVol翌日+EpsGr', 'GapUp3%+EPS', 'CWH'],
  'bull_neutral':     ['RVOL2x+BPS', 'HighVol翌日+EpsGr', 'GapUp3%+EPS', 'CWH'],
  'bull_bear':        ['RVOL2x+BPS', 'CWH'],
  'neutral_neutral':  ['RVOL2x+BPS', 'RVOL1.5+EpsGr', 'HighVol翌日+EpsGr', 'CWH'],
  'bear_bear':        ['RVOL2x+BPS', 'HighVol翌日+EpsGr', 'CWH', 'CloudBrk+RS'],
  'bear_strong_bear': ['RVOL2x+BPS', 'CWH', 'CloudBrk+RS'],
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
