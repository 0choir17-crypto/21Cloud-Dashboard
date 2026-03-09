'use client'

import { useState } from 'react'

// ── Screen Guide Data ─────────────────────────────────────────────────────────
type ScreenGuideEntry = {
  rank: number
  name: string
  dbName: string
  type: 'bull' | 'bear' | 'both' | 'unknown'
  kind: 'factor' | 'event'
  conditions: string
  role: string
  is_pf: number | null
  is_wr: number | null
  oos_pf: number | null
  oos_wr: number | null
  star3: string
  star3_note: string
}

const SCREEN_GUIDE: ScreenGuideEntry[] = [
  {
    rank: 1,
    name: 'CWH',
    dbName: 'EVT_CWH_BPS_EPS',
    type: 'both',
    kind: 'event',
    conditions: 'カップ深さ-40~-8%, 出来高収縮≤0.8, 52w高値-10%以内, BPS≥2240, EPS≥95',
    role: 'カップウィズハンドル: 出来高収縮を伴う高値圏パターン。全レジーム対応の最重要スクリーン',
    is_pf: 7.09, is_wr: 75.2, oos_pf: 9.75, oos_wr: 78.2,
    star3: '50MA≤1R, 21E≤0.5R',
    star3_note: 'WR85.5% PF18.66 N=242',
  },
  {
    rank: 2,
    name: 'HiddenLdr',
    dbName: 'PF52whigh_BookValuePer_epsactual_BullOnly',
    type: 'bull',
    kind: 'factor',
    conditions: '52w高値圏, BPS≥高, EPS≥高',
    role: '隠れたリーダー: 高値圏で好業績・好財務の銘柄を検出',
    is_pf: null, is_wr: null, oos_pf: null, oos_wr: null,
    star3: '21E≤0.5R, 10W≤0.5R',
    star3_note: 'WR80.6% PF19.30 N=180',
  },
  {
    rank: 3,
    name: 'CANSLIM_Cloud',
    dbName: 'BookValuePer_epsactual_clouddaysabo_BullOnly',
    type: 'bull',
    kind: 'factor',
    conditions: 'BPS≥高, EPS≥高, 一目雲上',
    role: 'CANSLIM+雲: 好業績＋一目均衡表の雲上抜けで上昇トレンド確認',
    is_pf: null, is_wr: null, oos_pf: null, oos_wr: null,
    star3: '10W≤0.5R, RS≥70',
    star3_note: 'PF15.31 N=1107',
  },
  {
    rank: 4,
    name: 'CANSLIM_MA',
    dbName: 'BookValuePer_epsactual_distsma200_BullOnly',
    type: 'bull',
    kind: 'factor',
    conditions: 'BPS≥高, EPS≥高, SMA200上方',
    role: 'CANSLIM+MA: 好業績＋長期移動平均上方で安定上昇トレンド',
    is_pf: null, is_wr: null, oos_pf: null, oos_wr: null,
    star3: '10W≤0.5R, RS≥70',
    star3_note: 'PF15.31 N=1107',
  },
  {
    rank: 5,
    name: 'CANSLIM_RS',
    dbName: 'BookValuePer_epsactual_rscomposite_BullOnly',
    type: 'bull',
    kind: 'factor',
    conditions: 'BPS≥高, EPS≥高, RS Composite≥高',
    role: 'CANSLIM+RS: 好業績＋相対強度で市場をリードする銘柄',
    is_pf: null, is_wr: null, oos_pf: null, oos_wr: null,
    star3: '10W≤0.5R, RS≥70',
    star3_note: 'PF15.31 N=1107',
  },
  {
    rank: 6,
    name: 'PEAD',
    dbName: 'EVT_Brk20d_52wh_EPS_BullOnly',
    type: 'bull',
    kind: 'event',
    conditions: '20日高値ブレイク, 52w高値圏, EPS好調',
    role: '決算後ドリフト: 好決算後のブレイクアウトを捕捉',
    is_pf: null, is_wr: null, oos_pf: null, oos_wr: null,
    star3: '21E≤0.5R, VolC≤0.8',
    star3_note: 'クロススクリーン共通',
  },
  {
    rank: 7,
    name: 'VCP',
    dbName: 'EVT_VCP_BPS_BullOnly',
    type: 'bull',
    kind: 'event',
    conditions: 'VCPパターン, BPS≥高',
    role: 'Volatility Contraction: ボラティリティ収縮パターンのブレイク',
    is_pf: null, is_wr: null, oos_pf: null, oos_wr: null,
    star3: '21E≤0.5R, VolC≤0.8',
    star3_note: 'クロススクリーン共通',
  },
  {
    rank: 8,
    name: 'DeepRecov',
    dbName: 'epsactual_epsgrowthyoy_BearOnly',
    type: 'bear',
    kind: 'factor',
    conditions: 'EPS≥高, EPS成長YoY≥高',
    role: 'ディープリカバリー: bear市場で業績成長を続ける銘柄を検出',
    is_pf: null, is_wr: null, oos_pf: null, oos_wr: null,
    star3: '21E≤0.5R, ADR≤2',
    star3_note: 'PF16.65 N=390',
  },
  {
    rank: 9,
    name: 'ValueRecov',
    dbName: 'BookValuePer_epsgrowthyoy_BearOnly',
    type: 'bear',
    kind: 'factor',
    conditions: 'BPS≥高, EPS成長YoY≥高',
    role: 'バリューリカバリー: bear市場の割安成長銘柄',
    is_pf: null, is_wr: null, oos_pf: null, oos_wr: null,
    star3: '21E≤0.5R, ADR≤2',
    star3_note: 'PF16.65 N=390',
  },
  {
    rank: 10,
    name: 'DeepValue',
    dbName: 'epsactual_BookValuePer_epsgrowthyoy_BearOnly',
    type: 'bear',
    kind: 'factor',
    conditions: 'EPS≥高, BPS≥高, EPS成長YoY≥高',
    role: 'ディープバリュー: bear市場で業績・財務・成長の三拍子',
    is_pf: null, is_wr: null, oos_pf: null, oos_wr: null,
    star3: '21E≤0.5R, ADR≤2',
    star3_note: 'PF16.65 N=390',
  },
  {
    rank: 11,
    name: 'GapUp',
    dbName: 'EVT_GapUp3_EPS_EpsGr_BearOnly',
    type: 'bear',
    kind: 'event',
    conditions: 'ギャップアップ≥3%, EPS好調, EPS成長',
    role: 'ギャップアップ: bear市場でも強い買い需要を示すギャップ',
    is_pf: null, is_wr: null, oos_pf: null, oos_wr: null,
    star3: '21E≤1R, RS≥70',
    star3_note: 'クロススクリーン共通',
  },
  {
    rank: 12,
    name: 'RVOL',
    dbName: 'EVT_RVOL2x_BPS_EpsGr_BearOnly',
    type: 'bear',
    kind: 'event',
    conditions: '相対出来高≥2倍, BPS≥高, EPS成長',
    role: '出来高急増: bear市場で機関の買い集めを示唆する出来高',
    is_pf: null, is_wr: null, oos_pf: null, oos_wr: null,
    star3: '21E≤1R, RS≥70',
    star3_note: 'クロススクリーン共通',
  },
]

type FactorGuideEntry = {
  rank: number
  name: string
  dbName: string
  type: 'bull' | 'bear' | 'both' | 'unknown'
  kind: 'factor' | 'event'
  conditions: string
  role: string
}

const FACTOR_SCREEN_GUIDE: FactorGuideEntry[] = [
  {
    rank: 13,
    name: 'RS+EPS+Hi',
    dbName: 'rs126d_epsactual_PF52whigh',
    type: 'unknown',
    kind: 'factor',
    conditions: 'RS126d≥70, EPS≥90, 52w高値-4%以内',
    role: 'RSモメンタム+好業績+高値圏の三重フィルタ',
  },
  {
    rank: 14,
    name: 'Lo↑+EPS+Hi',
    dbName: 'PF52wlow_epsactual_PF52whigh',
    type: 'unknown',
    kind: 'factor',
    conditions: '52w安値+35%↑, EPS≥90, 52w高値-4%以内',
    role: '安値から大幅上昇+好業績+高値圏 → 強い上昇トレンド',
  },
  {
    rank: 15,
    name: 'R6m+EPS+Hi',
    dbName: 'ret126d_epsactual_PF52whigh',
    type: 'unknown',
    kind: 'factor',
    conditions: '6mリターン≥20%, EPS≥90, 52w高値-4%以内',
    role: '半年で+20%以上+好業績+高値圏 → 持続的上昇銘柄',
  },
  {
    rank: 16,
    name: 'RS+BPS+Hi',
    dbName: 'rs126d_BookValuePer_PF52whigh',
    type: 'unknown',
    kind: 'factor',
    conditions: 'RS126d≥70, BPS≥2340, 52w高値-4%以内',
    role: 'RSモメンタム+厚い純資産+高値圏',
  },
  {
    rank: 17,
    name: 'EPS+Slp+Hi',
    dbName: 'epsactual_slopesma50_PF52whigh',
    type: 'unknown',
    kind: 'factor',
    conditions: 'EPS≥90, SMA50傾き≥4, 52w高値-4%以内',
    role: '好業績+移動平均の上向き傾き+高値圏 → トレンド加速',
  },
  {
    rank: 18,
    name: 'EPS+Hi+R3m',
    dbName: 'epsactual_PF52whigh_ret63d',
    type: 'unknown',
    kind: 'factor',
    conditions: 'EPS≥90, 52w高値-4%以内, 3mリターン≥15%',
    role: '好業績+高値圏+直近3ヶ月の勢い',
  },
  {
    rank: 19,
    name: 'RS+EPS+Slp',
    dbName: 'rs126d_epsactual_slopesma50',
    type: 'unknown',
    kind: 'factor',
    conditions: 'RS126d≥70, EPS≥90, SMA50傾き≥4',
    role: 'RS+好業績+トレンド傾き → 高値圏条件なしで幅広く検出',
  },
  {
    rank: 20,
    name: 'RS+BPS',
    dbName: 'rs126d_BookValuePer',
    type: 'unknown',
    kind: 'factor',
    conditions: 'RS126d≥70, BPS≥2340',
    role: 'RSモメンタム+厚い純資産 → 2条件のみでゆるめ',
  },
  {
    rank: 21,
    name: 'R6m+RS+BPS',
    dbName: 'ret126d_rs126d_BookValuePer',
    type: 'unknown',
    kind: 'factor',
    conditions: '6mリターン≥20%, RS126d≥70, BPS≥2340',
    role: 'リターン+RS+純資産の三重フィルタ',
  },
  {
    rank: 22,
    name: 'Lo↑+RS+BPS',
    dbName: 'PF52wlow_rs126d_BookValuePer',
    type: 'unknown',
    kind: 'factor',
    conditions: '52w安値+35%↑, RS126d≥70, BPS≥2340',
    role: '安値からの回復力+RS+純資産',
  },
]

// ── Sort logic ────────────────────────────────────────────────────────────────
type SortKey = 'rank' | 'name' | 'type' | 'kind' | 'is_pf' | 'is_wr' | 'oos_pf' | 'oos_wr'
type SortDir = 'asc' | 'desc'

// ── Type / Kind badge colors ──────────────────────────────────────────────────
const TYPE_BADGE: Record<string, string> = {
  bull:    'bg-green-100 text-green-700 border-green-300',
  bear:    'bg-red-100 text-red-700 border-red-300',
  both:    'bg-blue-100 text-blue-700 border-blue-300',
  unknown: 'bg-gray-100 text-gray-500 border-gray-300',
}

const KIND_BADGE: Record<string, string> = {
  factor: 'bg-purple-100 text-purple-700 border-purple-300',
  event:  'bg-orange-100 text-orange-700 border-orange-300',
}

function fmtNum(v: number | null): string {
  if (v === null) return '—'
  return v.toFixed(2)
}

function fmtPct(v: number | null): string {
  if (v === null) return '—'
  return v.toFixed(1) + '%'
}

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
  const indicator = active ? (currentDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'
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

  function sortEntries<T extends { rank: number; name: string; type: string; kind: string; is_pf?: number | null; is_wr?: number | null; oos_pf?: number | null; oos_wr?: number | null }>(entries: T[]): T[] {
    return [...entries].sort((a, b) => {
      const getVal = (e: T): string | number => {
        switch (sortKey) {
          case 'rank':   return e.rank
          case 'name':   return e.name
          case 'type':   return e.type
          case 'kind':   return e.kind
          case 'is_pf':  return (e as unknown as ScreenGuideEntry).is_pf ?? -Infinity
          case 'is_wr':  return (e as unknown as ScreenGuideEntry).is_wr ?? -Infinity
          case 'oos_pf': return (e as unknown as ScreenGuideEntry).oos_pf ?? -Infinity
          case 'oos_wr': return (e as unknown as ScreenGuideEntry).oos_wr ?? -Infinity
          default:       return e.rank
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

  const sortedMain = sortEntries(SCREEN_GUIDE)
  const sortedFactor = sortEntries(FACTOR_SCREEN_GUIDE)

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
          全スクリーンの条件・役割・成績一覧
        </p>
      </header>

      {/* Section 1: Named Screens */}
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Named Screens
        </h2>
        <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#e8eaed]">
                <GuideSortTh label="#"        sortKey="rank"   {...sp} />
                <GuideSortTh label="Screen"   sortKey="name"   {...sp} />
                <GuideSortTh label="Type"     sortKey="type"   {...sp} />
                <GuideSortTh label="Kind"     sortKey="kind"   {...sp} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">条件サマリー</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">役割</th>
                <GuideSortTh label="IS PF"    sortKey="is_pf"  {...sp} align="right" />
                <GuideSortTh label="IS WR"    sortKey="is_wr"  {...sp} align="right" />
                <GuideSortTh label="OOS PF"   sortKey="oos_pf" {...sp} align="right" />
                <GuideSortTh label="OOS WR"   sortKey="oos_wr" {...sp} align="right" />
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">★★★条件</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">★★★成績</th>
              </tr>
            </thead>
            <tbody>
              {sortedMain.map((s, i) => (
                <tr
                  key={s.dbName}
                  className={`border-b border-[#f0f2f4] hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-500 text-center">{s.rank}</td>
                  <td className="px-3 py-2.5 font-bold text-sm whitespace-nowrap">{s.name}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${TYPE_BADGE[s.type]}`}>
                      {s.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${KIND_BADGE[s.kind]}`}>
                      {s.kind}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[220px]">{s.conditions}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[260px]">{s.role}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{fmtNum(s.is_pf)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{fmtPct(s.is_wr)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">{fmtNum(s.oos_pf)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">{fmtPct(s.oos_wr)}</td>
                  <td className="px-3 py-2.5 text-[11px] text-gray-600 whitespace-nowrap">{s.star3}</td>
                  <td className="px-3 py-2.5 text-[10px] text-gray-400 whitespace-nowrap">{s.star3_note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Discovery (Factor) Screens */}
      <section>
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Discovery Screens
        </h2>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Screen Discoveryで自動生成されたfactorスクリーン。バックテスト成績はscreens.jsonに含まれていないため未掲載。
        </p>
        <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#e8eaed]">
                <GuideSortTh label="#"        sortKey="rank" {...sp} />
                <GuideSortTh label="Screen"   sortKey="name" {...sp} />
                <GuideSortTh label="Type"     sortKey="type" {...sp} />
                <GuideSortTh label="Kind"     sortKey="kind" {...sp} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">条件サマリー</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">役割</th>
              </tr>
            </thead>
            <tbody>
              {sortedFactor.map((s, i) => (
                <tr
                  key={s.dbName}
                  className={`border-b border-[#f0f2f4] hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-500 text-center">{s.rank}</td>
                  <td className="px-3 py-2.5 font-bold text-sm whitespace-nowrap">{s.name}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${TYPE_BADGE[s.type]}`}>
                      {s.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${KIND_BADGE[s.kind]}`}>
                      {s.kind}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[220px]">{s.conditions}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[260px]">{s.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
