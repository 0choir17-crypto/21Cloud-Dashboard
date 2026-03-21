'use client'

import { useState } from 'react'

// ── Screen Guide Data (v4) ───────────────────────────────────────────────────
type ScreenGuideEntry = {
  rank: number
  name: string
  dbName: string
  type: 'bull' | 'bear' | 'both' | 'unknown'
  kind: 'factor' | 'event'
  holdDays: number
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
  star3?: string
}

const SCREEN_GUIDE_V4: ScreenGuideEntry[] = [
  {
    rank: 1,
    name: 'Gap反発',
    dbName: 'EVT_SMA10_ADR_Gap3',
    type: 'bear',
    kind: 'event',
    holdDays: 20,
    conditions: 'SMA10から-1R以下 & ADR\u22642.5% & ギャップアップ\u22653% & Cockpit RS\u226560',
    role: 'MA下の低ボラ銘柄が材料で急反発 \u2014 TOPIX相対強度フィルタ付き',
    backtest: {
      oos_pf: 25.35, oos_wr: 89.4, oos_n: 564, spd: 0.4,
      wf: '5/5',
      regime_note: 'bear PF=26.37 / bull PF\u22480',
    },
  },
  {
    rank: 2,
    name: 'EMA21押目',
    dbName: 'FCT_EMA21_SMA10_CRS',
    type: 'bear',
    kind: 'factor',
    holdDays: 20,
    conditions: 'EMA21から-1.5R以下 & SMA10から-1R以下 & Cockpit RS\u226570 & 空売り比率\u22645',
    role: 'TOPIX相対で強い銘柄の押し目買い \u2014 需給フィルタ付き',
    backtest: {
      oos_pf: 21.56, oos_wr: 85.8, oos_n: 5285, spd: 4.2,
      wf: '5/5',
      regime_note: 'bear PF=21.56 / bull PF\u22480',
    },
  },
  {
    rank: 3,
    name: 'SMA10+50押目',
    dbName: 'FCT_SMA10_SMA50_CRS',
    type: 'bear',
    kind: 'factor',
    holdDays: 40,
    conditions: 'SMA10から-1R以下 & SMA50から-1R以下 & Cockpit RS\u226570 & ADR\u22645% & 空売り残変化\u22640',
    role: '深い調整後の反発狙い \u2014 需給改善確認付き',
    backtest: {
      oos_pf: 12.34, oos_wr: 81.2, oos_n: 5013, spd: 4.0,
      wf: '5/5',
      regime_note: 'bear PF=12.34 / bull PF\u22480',
    },
  },
  {
    rank: 4,
    name: 'バリュー品質',
    dbName: 'FCT_ValueQuality_CRS',
    type: 'bull',
    kind: 'factor',
    holdDays: 40,
    conditions: 'PBR\u22640.6 & EPS\u2265150 & ADR\u22643% & Cockpit RS\u226570',
    role: 'bull相場用 \u2014 割安\u00d7高収益\u00d7低ボラ\u00d7TOPIX相対強度',
    backtest: {
      oos_pf: 3.72, oos_wr: 66.0, oos_n: 24942, spd: 20.0,
      wf: '4/5',
      regime_note: 'bull PF=4.86 / bear PF=3.84',
    },
  },
  {
    rank: 5,
    name: 'CWH',
    dbName: 'EVT_CWH_BPS_EPS',
    type: 'both',
    kind: 'event',
    holdDays: 40,
    conditions: 'カップ深さ-40\u301C-8% & 出来高収縮\u22640.6 & 52W高値-10%以内 & BPS\u22652240 & EPS\u226595',
    role: 'カップウィズハンドル \u2014 典型的なMinerviniパターン',
    backtest: {
      oos_pf: 3.05, oos_wr: 63.4, oos_n: 4637, spd: 3.7,
      wf: '4/5',
      regime_note: 'bull PF=3.55 / bear PF=2.88',
    },
    star3: 'SMA50\u22641R & EMA21\u22640.5R \u2192 PF18.66',
  },
  {
    rank: 6,
    name: 'RVOL2x',
    dbName: 'EVT_RVOL2x_BPS_EpsGr',
    type: 'both',
    kind: 'event',
    holdDays: 15,
    conditions: '出来高\u22652倍 & BPS\u22652240 & EPS成長\u226525% & SMA10から1R以内',
    role: '出来高急増 \u00d7 好業績 \u00d7 財務健全 \u2014 機関投資家の参入を示唆',
    backtest: {
      oos_pf: 2.28, oos_wr: 59.1, oos_n: 4205, spd: 3.3,
      wf: '4/5',
      regime_note: 'bear PF=5.34 / bull PF=1.79',
    },
    star3: 'EMA21\u22640.5R & ADR\u22645 & RS\u226560 \u2192 PF3.50',
  },
]

// ── Sort logic ────────────────────────────────────────────────────────────────
type SortKey = 'rank' | 'name' | 'type' | 'kind' | 'holdDays' | 'oos_pf' | 'oos_wr' | 'spd'
type SortDir = 'asc' | 'desc'

// ── Type / Kind badge colors ─────────────────────────────────────────────────
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

function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined) return '\u2014'
  return v.toFixed(2)
}

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return '\u2014'
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
          screens_v4 \u2014 Factor\u578b 3\u672c + Event\u578b 3\u672c\uff08Cockpit RS + \u9700\u7d66\u30d5\u30a3\u30eb\u30bf\uff09
        </p>
      </header>

      <section className="mb-8">
        <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#e8eaed]">
                <GuideSortTh label="#"         sortKey="rank"     {...sp} />
                <GuideSortTh label="Screen"    sortKey="name"     {...sp} />
                <GuideSortTh label="Type"      sortKey="type"     {...sp} />
                <GuideSortTh label="Kind"      sortKey="kind"     {...sp} />
                <GuideSortTh label="Hold"      sortKey="holdDays" {...sp} align="right" />
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">条件サマリー</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">役割</th>
                <GuideSortTh label="OOS PF"    sortKey="oos_pf"   {...sp} align="right" />
                <GuideSortTh label="OOS WR"    sortKey="oos_wr"   {...sp} align="right" />
                <GuideSortTh label="SPD"       sortKey="spd"      {...sp} align="right" />
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">WF</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">{'\u2605\u2605\u2605'}条件</th>
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
                      {s.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${KIND_BADGE[s.kind]}`}>
                      {s.kind}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{s.holdDays}d</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[220px]">{s.conditions}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[260px]">{s.role}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">{fmtNum(s.backtest.oos_pf)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">{fmtPct(s.backtest.oos_wr)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{s.backtest.spd.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-[11px] text-gray-600 whitespace-nowrap">{s.backtest.wf || '\u2014'}</td>
                  <td className="px-3 py-2.5 text-[11px] text-gray-600 whitespace-nowrap">{s.star3 || '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
