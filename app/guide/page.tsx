'use client'

import { useState } from 'react'

// ── Screen Guide Data (v4) ───────────────────────────────────────────────────
type ScreenGuideEntry = {
  rank: number
  name: string
  dbName: string
  type: 'always_on' | 'bull' | 'bear'
  kind: 'factor' | 'event'
  holdDays: number
  mcCondition: string
  conditions: string
  role: string
  backtest: {
    oos_pf: number
    oos_wr: number
    oos_n?: number
    spd: number
    wf: string
    regime_note: string
  }
}

const SCREEN_GUIDE_V4: ScreenGuideEntry[] = [
  {
    rank: 1,
    name: 'Gap Up',
    dbName: 'EVT_SMA10_ADR_Gap3',
    type: 'always_on',
    kind: 'event',
    holdDays: 10,
    mcCondition: 'Always-on',
    conditions: 'SMA10から-1.5R以下 & ADR≤3.5% & ギャップアップ≥3% & RS≥70 & 信用買い残比率5d≤0.25',
    role: '移動平均線より下に沈んだ低ボラ銘柄が、材料で急騰した初動を捉える',
    backtest: {
      oos_pf: 55.49, oos_wr: 95.2, oos_n: 433, spd: 0.3,
      wf: '4/5',
      regime_note: 'v5 R1: margin_buy_ratio_5d≤0.25追加（breakdown filter）',
    },
  },
  {
    rank: 2,
    name: 'RS Dip',
    dbName: 'FCT_RS_Divergence',
    type: 'always_on',
    kind: 'factor',
    holdDays: 15,
    mcCondition: 'Always-on',
    conditions: 'RS≥80 & SMA10から-3R以上急落',
    role: 'TOPIXに対して相対的に強い銘柄が、一時的に深く売られた後の反発を狙う',
    backtest: {
      oos_pf: 36.82, oos_wr: 92.7, oos_n: 1943, spd: 1.6,
      wf: '5/5',
      regime_note: 'v4新規: RS高位×深い急落の反発',
    },
  },
  {
    rank: 3,
    name: '21EMA Pullback',
    dbName: 'FCT_EMA21_SMA10_CRS',
    type: 'always_on',
    kind: 'factor',
    holdDays: 15,
    mcCondition: 'Always-on',
    conditions: 'EMA21から-2R以下 & SMA10から-1.5R以下 & RS≥80 & 空売り比率≤5 & DuPont Leverage<2.0',
    role: '21日指数移動平均から深く調整した相対強度の高い銘柄を捕捉',
    backtest: {
      oos_pf: 33.06, oos_wr: 90.7, oos_n: 2729, spd: 2.2,
      wf: '5/5',
      regime_note: 'v4: RS 70→80, ema21 -2.0, dist10 -1.5, hold 15d. dupont_leverage<2.0追加',
    },
  },
  {
    rank: 4,
    name: '10/50SMA Pullback',
    dbName: 'FCT_SMA10_SMA50_CRS',
    type: 'always_on',
    kind: 'factor',
    holdDays: 20,
    mcCondition: 'Always-on',
    conditions: 'SMA10から-1.5R以下 & SMA50から-1R以下 & RS≥75 & 空売り残変化≤0 & DuPont Leverage≥2.0 & 現物買い比率5d≥0.7',
    role: '短期・中期MAから同時調整。空売り残の減少がリバーサルシグナル',
    backtest: {
      oos_pf: 20.39, oos_wr: 86.0, oos_n: 3060, spd: 2.5,
      wf: '5/5',
      regime_note: 'v5 R1: cash_buy_ratio_5d≥0.7追加. R2: RS 80→75 (WF 4/5→5/5)',
    },
  },
  {
    rank: 5,
    name: 'CWH',
    dbName: 'EVT_CWH_BPS_EPS',
    type: 'bull',
    kind: 'event',
    holdDays: 40,
    mcCondition: 'MC≥17',
    conditions: 'カップ深さ-30〜-8% & 出来高収縮≤0.5 & 52W高値-10%以内 & BPS≥2240 & EPS≥95 & RS≥70 & DuPont Leverage≥2.0 & 信用買い残比率5d≤0.25',
    role: 'クラシックなMinerviniパターン。出来高が収縮してエネルギーを蓄積した銘柄のブレイクアウト',
    backtest: {
      oos_pf: 4.42, oos_wr: 61.0, oos_n: 508, spd: 0.4,
      wf: '5/5',
      regime_note: 'v5 R1: margin_buy_ratio_5d≤0.25追加. R2: cup_depth -40→-30 (WF 2/5→4/5)',
    },
  },
  {
    rank: 6,
    name: 'RVOL 2x',
    dbName: 'EVT_RVOL2x_BPS_EpsGr',
    type: 'bear',
    kind: 'event',
    holdDays: 15,
    mcCondition: 'MC≤9',
    conditions: '出来高≥2倍 & BPS≥1500 & EPS成長≥20% & SMA10から0.0R以内 & RS≥80 & DuPont Leverage≥2.0 & 信用買い残比率5d≤0.3',
    role: '割安かつ高成長のファンダメンタルを持つ銘柄に、異常出来高が発生した日を検出',
    backtest: {
      oos_pf: 16.65, oos_wr: 78.1, oos_n: 122, spd: 0.4,
      wf: '5/5',
      regime_note: 'v5 R1: margin_buy_ratio_5d≤0.3追加. R2: BPS 2240→1500, eps_gr 25→20, RS 70→80, dist10 0.5→0.0 (PF 4.21→16.65)',
    },
  },
  {
    rank: 7,
    name: 'Value',
    dbName: 'FCT_ValueQuality_CRS',
    type: 'bull',
    kind: 'factor',
    holdDays: 40,
    mcCondition: 'MC≥20',
    conditions: 'PBR≤0.5 & EPS≥100 & ADR≤3% & RS≥80',
    role: 'バリュー×クオリティの複合スクリーン。低PBRだが収益力がある銘柄',
    backtest: {
      oos_pf: 4.20, oos_wr: 67.5, oos_n: 17817, spd: 14.4,
      wf: '4/5',
      regime_note: 'v4: RS 80, pbr 0.5, eps 100. MC≥20で発動',
    },
  },
  {
    rank: 8,
    name: 'VCS Coil',
    dbName: 'FCT_RS_VCS_Coil',
    type: 'bull',
    kind: 'factor',
    holdDays: 40,
    mcCondition: 'MC≥18',
    conditions: 'RS≥80 & VCS≥80 & ADR≤3% & DuPont Leverage<2.0',
    role: 'ボラティリティが収縮した相対強度の高い銘柄。ブレイクアウト前のwatch候補',
    backtest: {
      oos_pf: 2.78, oos_wr: 58.1, oos_n: 8369, spd: 6.7,
      wf: '5/5',
      regime_note: 'v4新規: 既存スクリーンと直交するコンセプト. MC≥18で発動. dupont_leverage<2.0追加',
    },
  },
  {
    rank: 9,
    name: 'BearRS',
    dbName: 'BearRS_Leader',
    type: 'bear',
    kind: 'factor',
    holdDays: 30,
    mcCondition: 'MC≤4',
    conditions: 'MC≤4 & RS≥70 & Low≤21EMA',
    role: 'Bear環境(MC≤4)で相対強度の高い銘柄を、21EMAへの押し目で拾うスクリーン',
    backtest: {
      oos_pf: 3.36, oos_wr: 63.1, oos_n: 53522, spd: 42.5,
      wf: '4/5',
      regime_note: 'MC≤4のみ発動。固定30日保有',
    },
  },
  {
    rank: 10,
    name: 'Div Bear',
    dbName: 'DIV_DY_Incr_EpsGr',
    type: 'bear',
    kind: 'factor',
    holdDays: 20,
    mcCondition: 'MC≤1',
    conditions: '配当利回り≥2% & 増配 & EPS成長≥30% & MC≤1',
    role: 'Extreme Bear環境(MC≤1)で配当利回り・増配・EPS成長の3条件を満たすディフェンシブ銘柄を検出',
    backtest: {
      oos_pf: 5.69, oos_wr: 68.0, oos_n: 320, spd: 0.3,
      wf: '5/5',
      regime_note: 'MC≤1のみ発動。Premium配当データ使用',
    },
  },
  {
    rank: 11,
    name: 'ShortCover',
    dbName: 'EVT_BearRS_ShortCover',
    type: 'bear',
    kind: 'event',
    holdDays: 15,
    mcCondition: 'MC≤3',
    conditions: 'cockpit_rs<35 & RS 5日下落≥8pt & short_sell>0.30 & dist_ema21≤-10 & pct_52wh≤-30 & margin_buy<0.20',
    role: 'Bear深押し+高空売り反発型（T-5統合版）。5日間でRSが8pt以上下落した低RS銘柄の逆張りシグナル',
    backtest: {
      oos_pf: 35.62, oos_wr: 37.66, oos_n: 1901, spd: 0.2,
      wf: '5/5',
      regime_note: 'MC≤3のみ発動。Phase X-2 T-5統合版。baseline PF14.85から+140%改善',
    },
  },
]

// ── Sort logic ────────────────────────────────────────────────────────────────
type SortKey = 'rank' | 'name' | 'type' | 'kind' | 'holdDays' | 'oos_pf' | 'oos_wr' | 'spd'
type SortDir = 'asc' | 'desc'

// ── Type / Kind badge colors ─────────────────────────────────────────────────
const TYPE_BADGE: Record<string, string> = {
  always_on: 'bg-blue-100 text-blue-700 border-blue-300',
  bull:      'bg-green-100 text-green-700 border-green-300',
  bear:      'bg-red-100 text-red-700 border-red-300',
}

const KIND_BADGE: Record<string, string> = {
  factor: 'bg-purple-100 text-purple-700 border-purple-300',
  event:  'bg-orange-100 text-orange-700 border-orange-300',
}

function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined) return '\u2014'
  return v.toFixed(2)
}

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return '\u2014'
  return v.toFixed(1) + '%'
}

// ── Glossary data ────────────────────────────────────────────────────────────
const GLOSSARY = [
  { term: 'RS',       desc: 'Cockpit RS\u3002\u500b\u5225\u9298\u67c4\u306eClose\u00f7TOPIX\u6bd4\u7387\u3092\u3001\u904e\u53bb\u306e\u81ea\u5206\u81ea\u8eab\u3068\u6bd4\u8f03\u3057\u305f\u30d1\u30fc\u30bb\u30f3\u30bf\u30a4\u30eb\uff080\u301c100\uff09\u300280\u4ee5\u4e0a=TOPIX\u306b\u5bfe\u3057\u3066\u76f4\u8fd1\u3067\u304b\u306a\u308a\u5f37\u3044' },
  { term: 'R (ATR\u5358\u4f4d)', desc: '\u8ddd\u96e2\u3092ATR\uff0814\u65e5\u5e73\u5747\u771f\u306e\u30ec\u30f3\u30b8\uff09\u3067\u5272\u3063\u305f\u5024\u3002-1.5R = ATR\u306e1.5\u500d\u5206\u3060\u3051\u4e0b\u843d\u3057\u3066\u3044\u308b' },
  { term: 'VCS',      desc: 'Volatility Contraction Score\u3002\u30dc\u30e9\u30c6\u30a3\u30ea\u30c6\u30a3\u306e\u53ce\u7e2e\u5ea6\u5408\u30920-100\u3067\u30b9\u30b3\u30a2\u5316\u300280\u4ee5\u4e0a=\u304b\u306a\u308a\u30bf\u30a4\u30c8\u306b\u53ce\u7e2e' },
  { term: 'ADR%',     desc: 'Average Daily Range\u3002\u904e\u53bb21\u65e5\u306e\u5e73\u5747\u65e5\u4e2d\u5024\u5e45(%)\u3002\u4f4e\u3044\u307b\u3069\u4f4e\u30dc\u30e9' },
  { term: 'PF',       desc: 'Profit Factor\u3002\u7dcf\u5229\u76ca\u00f7\u7dcf\u640d\u5931\u30001.0\u4ee5\u4e0a\u3067\u671f\u5f85\u5024\u30d7\u30e9\u30b9' },
  { term: 'WF',       desc: 'Walk-Forward\u3002\u6642\u7cfb\u52175\u5206\u5272\u3067\u5404\u671f\u9593\u306eOOS\u6210\u7e3e\u3092\u691c\u8a3c\u30005/5=\u5168\u671f\u9593\u3067PF>1.0' },
  { term: 'SPD',      desc: 'Signals Per Day\u30001\u65e5\u3042\u305f\u308a\u306e\u5e73\u5747\u30b7\u30b0\u30ca\u30eb\u6570' },
  { term: 'Hit',      desc: '1\u9298\u67c4\u304c\u8907\u6570\u30b9\u30af\u30ea\u30fc\u30f3\u306b\u540c\u6642\u30d2\u30c3\u30c8\u3057\u305f\u56de\u6570\u3002\u591a\u3044\u307b\u3069\u78ba\u4fe1\u5ea6\u304c\u9ad8\u3044' },
  { term: 'Factor',   desc: '\u6bce\u65e5\u5168\u9298\u67c4\u3092\u30b9\u30ad\u30e3\u30f3\u3059\u308b\u30bf\u30a4\u30d7\u3002\u6761\u4ef6\u3092\u6e80\u305f\u3059\u9650\u308a\u6bce\u65e5\u30b7\u30b0\u30ca\u30eb\u304c\u51fa\u308b' },
  { term: 'Event',    desc: '\u7279\u5b9a\u306e\u30a4\u30d9\u30f3\u30c8\uff08\u30ae\u30e3\u30c3\u30d7\u30a2\u30c3\u30d7\u3001\u30d6\u30ec\u30a4\u30af\u30a2\u30a6\u30c8\u7b49\uff09\u304c\u767a\u751f\u3057\u305f\u65e5\u306e\u307f\u30b7\u30b0\u30ca\u30eb\u304c\u51fa\u308b' },
  { term: 'MC',    desc: 'Market Condition v3\u300221\u8981\u7d20\u306e\u30b9\u30b3\u30a2\u30ab\u30fc\u30c9\u3067\u5e02\u5834\u74b0\u5883\u30920\u301c21\u70b9\u3067\u8a55\u4fa1\u3002\u9ad8\u3044=\u5f37\u6c17\u3001\u4f4e\u3044=\u5f31\u6c17' },
  { term: 'DuPont Leverage', desc: '\u7dcf\u8cc7\u7523\u00f7\u81ea\u5df1\u8cc7\u672c\u3002\u8ca1\u52d9\u30ec\u30d0\u30ec\u30c3\u30b8\u306e\u6307\u6a19\u30022.0\u4ee5\u4e0a\u306f\u904e\u5270\u50b5\u52d9\u30ea\u30b9\u30af\u3068\u3057\u3066\u30d5\u30a3\u30eb\u30bf\u30fc' },
  { term: 'Divergence', desc: '\u6307\u6570\u304c\u4e0a\u6607\u3057\u3066\u3044\u308b\u306e\u306bBreadth\u304c\u60aa\u5316\u3057\u3066\u3044\u308b\u72b6\u614b\u3002\u5929\u4e95\u306e\u8b66\u544a\u30b7\u30b0\u30ca\u30eb' },
]

// ── Sortable header ───────────────────────────────────────────────────────────
function GuideSortTh({
  label,
  sortKey: key,
  currentKey,
  currentDir,
  onSort,
  align = 'left',
}: {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  currentDir: SortDir
  onSort: (k: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = currentKey === key
  const indicator = active ? (currentDir === 'asc' ? ' \u2191' : ' \u2193') : ' \u2195'
  return (
    <th
      onClick={() => onSort(key)}
      className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 transition-colors ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${active ? 'text-[var(--accent)]' : 'text-gray-500'}`}
    >
      {label}<span className="text-[10px] opacity-50">{indicator}</span>
    </th>
  )
}

// ── Main Guide Page ───────────────────────────────────────────────────────────
export default function GuidePage() {
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'rank' ? 'asc' : 'desc')
    }
  }

  function sortEntries(entries: ScreenGuideEntry[]): ScreenGuideEntry[] {
    return [...entries].sort((a, b) => {
      const getVal = (e: ScreenGuideEntry): string | number => {
        switch (sortKey) {
          case 'rank':     return e.rank
          case 'name':     return e.name
          case 'type':     return e.type
          case 'kind':     return e.kind
          case 'holdDays': return e.holdDays
          case 'oos_pf':   return e.backtest.oos_pf ?? -Infinity
          case 'oos_wr':   return e.backtest.oos_wr ?? -Infinity
          case 'spd':      return e.backtest.spd ?? -Infinity
          default:         return e.rank
        }
      }
      const av = getVal(a)
      const bv = getVal(b)
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      if (av === bv) return 0
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
  }

  const sp = { currentKey: sortKey, currentDir: sortDir, onSort: handleSort }
  const sorted = sortEntries(SCREEN_GUIDE_V4)

  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <header className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans, sans-serif)' }}
        >
          Screen Guide
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          screens_v5 + MC — Always-on 4 + Bear 4 + Bull 3（11 screens）
        </p>
      </header>

      {/* ── Screen Table ─────────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Screens
        </h2>
        <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#e8eaed]">
                <GuideSortTh label="#"         sortKey="rank"     {...sp} />
                <GuideSortTh label="Screen"    sortKey="name"     {...sp} />
                <GuideSortTh label="Type"      sortKey="type"     {...sp} />
                <GuideSortTh label="Kind"      sortKey="kind"     {...sp} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">MC</th>
                <GuideSortTh label="Hold"      sortKey="holdDays" {...sp} align="right" />
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">Conditions</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">Role</th>
                <GuideSortTh label="OOS PF"    sortKey="oos_pf"   {...sp} align="right" />
                <GuideSortTh label="OOS WR"    sortKey="oos_wr"   {...sp} align="right" />
                <GuideSortTh label="SPD"       sortKey="spd"      {...sp} align="right" />
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">WF</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr
                  key={s.dbName}
                  className={`border-b border-[#f0f2f4] hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-500 text-center">{s.rank}</td>
                  <td className="px-3 py-2.5 font-bold text-sm whitespace-nowrap">{s.name}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${TYPE_BADGE[s.type]}`}>
                      {s.type === 'always_on' ? 'Always' : s.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${KIND_BADGE[s.kind]}`}>
                      {s.kind}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      s.type === 'always_on'
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : s.type === 'bear'
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-green-50 text-green-600 border-green-200'
                    }`}>
                      {s.mcCondition}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{s.holdDays}d</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[220px]">{s.conditions}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[260px]">{s.role}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">{fmtNum(s.backtest.oos_pf)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">{fmtPct(s.backtest.oos_wr)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{s.backtest.spd.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-[11px] text-gray-600 whitespace-nowrap">{s.backtest.wf || '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Market Condition ──────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Market Condition (MC)
        </h2>
        <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-5">
          <p className="text-sm text-gray-600 mb-3">
            画面上部のバッジはマーケット全体の状態を示します。MC は21要素のスコアカードで市場環境を0〜21点で評価します。
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li><strong className="text-gray-900">Trend</strong> — TOPIXの位置関係（Bull / Neutral / Bear）</li>
            <li><strong className="text-gray-900">Scorecard</strong> — MC スコアカード（0-21）。数値が高いほど強気環境</li>
            <li><strong className="text-gray-900">Breadth</strong> — 値上がり銘柄比率の強度（Strong / Normal / Weak）</li>
            <li><strong className="text-gray-900">Divergence</strong> — 指数↑ × Breadth↓ の天井警告フラグ</li>
          </ul>
          <div className="mt-4 rounded-lg bg-gray-50 border border-[#e8eaed] p-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">Screen Activation Category</p>
            <ul className="space-y-1.5 text-xs text-gray-600">
              <li><span className="inline-block w-16 font-semibold text-blue-600">Always-on</span>MC スコアに関係なく常に発動（4本）</li>
              <li><span className="inline-block w-16 font-semibold text-red-600">Bear</span>MC スコアが閾値以下で発動 — 下落相場で有効（3本）</li>
              <li><span className="inline-block w-16 font-semibold text-green-600">Bull</span>MC スコアが閾値以上で発動 — 上昇相場で有効（3本）</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Glossary ──────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Glossary
        </h2>
        <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#e8eaed]">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-[140px]">Term</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
              </tr>
            </thead>
            <tbody>
              {GLOSSARY.map((g, i) => (
                <tr
                  key={g.term}
                  className={`border-b border-[#f0f2f4] ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}
                >
                  <td className="px-4 py-2 font-mono text-xs font-bold text-gray-900">{g.term}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">{g.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
