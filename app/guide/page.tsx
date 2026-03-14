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
  oos_pf: number | null
  oos_wr: number | null
  stability: 'STRONG' | 'GOOD'
  star3: string
  star3_note: string
}

const SCREEN_GUIDE: ScreenGuideEntry[] = [
  // STRONG
  {
    rank: 1,
    name: 'RVOL2x+BPS',
    dbName: 'EVT_RVOL2x_BPS_EpsGr',
    type: 'both',
    kind: 'event',
    conditions: 'RVOL≥2.0, BPS≥2240, EPS成長≥25%',
    role: '出来高2倍急増+財務健全+業績成長。全環境で唯一のリフト確認済みスクリーン',
    oos_pf: 2.25,
    oos_wr: 58.1,
    stability: 'STRONG',
    star3: 'dist_ema21_r≤0.5 + ADR≤5%',
    star3_note: 'EMA21接触+低ボラ = 初動エントリー',
  },
  {
    rank: 2,
    name: 'RVOL1.5+EpsGr',
    dbName: 'EVT_RVOL15_EpsGr',
    type: 'both',
    kind: 'event',
    conditions: 'RVOL≥1.5, EPS成長≥25%',
    role: 'RVOL2xの閾値緩和版。ヒット数40倍でカバレッジ大',
    oos_pf: 1.23,
    oos_wr: 49.2,
    stability: 'STRONG',
    star3: 'dist_ema21_r≤0.5 + ADR≤5%',
    star3_note: '',
  },
  {
    rank: 3,
    name: 'HighVol翌日+EpsGr',
    dbName: 'EVT_HighVolPrev_EpsGr',
    type: 'both',
    kind: 'event',
    conditions: '前日RVOL≥2.0, EPS成長≥25%',
    role: '前日の出来高急増を検出→翌朝寄りでエントリー可能。最も実用的',
    oos_pf: 1.23,
    oos_wr: 49.0,
    stability: 'STRONG',
    star3: 'dist_ema21_r≤0.5 + ADR≤5%',
    star3_note: '',
  },
  {
    rank: 4,
    name: 'GapUp3%+EPS',
    dbName: 'EVT_GapUp3_EPS80',
    type: 'both',
    kind: 'event',
    conditions: 'ギャップアップ≥3%, EPS≥80',
    role: '材料ドリブン。ギャップアップ+好業績の組み合わせ',
    oos_pf: 1.23,
    oos_wr: 49.7,
    stability: 'STRONG',
    star3: 'dist_ema21_r≤0.5 + ADR≤5%',
    star3_note: '',
  },
  // GOOD
  {
    rank: 5,
    name: 'HighVol翌日+BPS',
    dbName: 'EVT_HighVolPrev_BPS',
    type: 'both',
    kind: 'event',
    conditions: '前日RVOL≥2.0, BPS≥2240',
    role: '#3のBPS版。財務健全フィルタ',
    oos_pf: 1.21,
    oos_wr: 50.1,
    stability: 'GOOD',
    star3: 'dist_ema21_r≤0.5 + ADR≤5%',
    star3_note: '',
  },
  {
    rank: 6,
    name: 'GapUp3%+EPS95',
    dbName: 'EVT_GapUp3_EPS95',
    type: 'both',
    kind: 'event',
    conditions: 'ギャップアップ≥3%, EPS≥95',
    role: '#4のEPS厳格版',
    oos_pf: 1.19,
    oos_wr: 49.4,
    stability: 'GOOD',
    star3: 'dist_ema21_r≤0.5 + ADR≤5%',
    star3_note: '',
  },
  {
    rank: 7,
    name: 'CloudBrk+RS',
    dbName: 'EVT_CloudBreak_RS_EPS',
    type: 'both',
    kind: 'event',
    conditions: '21EMA Cloud上抜け, RS≥60, EPS≥80',
    role: '他スクリーンが全滅するpct_above_sma50>40%帯で有効',
    oos_pf: 1.05,
    oos_wr: 48.0,
    stability: 'GOOD',
    star3: 'dist_ema21_r≤0.5 + ADR≤5%',
    star3_note: '',
  },
  {
    rank: 8,
    name: 'CWH',
    dbName: 'EVT_CWH_BPS_EPS',
    type: 'both',
    kind: 'event',
    conditions: 'カップ-40〜-8%, ハンドル≤12%, 出来高収縮≤0.8, 52w高値-10%以内, BPS≥2240, EPS≥95',
    role: 'カップウィズハンドル。pct_above_sma50 20-40%帯でlift 1.4x',
    oos_pf: 9.75,
    oos_wr: 78.2,
    stability: 'GOOD',
    star3: 'dist_50sma_r≤1.0 + dist_ema21_r≤0.5',
    star3_note: '★★★: WR85.5% PF18.66 N=242',
  },
]

// ── Sort logic ────────────────────────────────────────────────────────────────
type SortKey = 'rank' | 'name' | 'type' | 'kind' | 'stability' | 'oos_pf' | 'oos_wr'
type SortDir = 'asc' | 'desc'

// ── Type / Kind / Stability badge colors ─────────────────────────────────────
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

const STABILITY_BADGE: Record<string, string> = {
  STRONG: 'bg-green-100 text-green-700 border-green-300',
  GOOD:   'bg-yellow-100 text-yellow-700 border-yellow-300',
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

  function sortEntries(entries: ScreenGuideEntry[]): ScreenGuideEntry[] {
    return [...entries].sort((a, b) => {
      const getVal = (e: ScreenGuideEntry): string | number => {
        switch (sortKey) {
          case 'rank':      return e.rank
          case 'name':      return e.name
          case 'type':      return e.type
          case 'kind':      return e.kind
          case 'stability': return e.stability
          case 'oos_pf':    return e.oos_pf ?? -Infinity
          case 'oos_wr':    return e.oos_wr ?? -Infinity
          default:          return e.rank
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
          全スクリーンの条件・役割・成績一覧（Event型 8本）
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Event Screens
        </h2>
        <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#e8eaed]">
                <GuideSortTh label="#"         sortKey="rank"      {...sp} />
                <GuideSortTh label="Screen"    sortKey="name"      {...sp} />
                <GuideSortTh label="Type"      sortKey="type"      {...sp} />
                <GuideSortTh label="Kind"      sortKey="kind"      {...sp} />
                <GuideSortTh label="Stability" sortKey="stability" {...sp} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">条件サマリー</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">役割</th>
                <GuideSortTh label="OOS PF"    sortKey="oos_pf"    {...sp} align="right" />
                <GuideSortTh label="OOS WR"    sortKey="oos_wr"    {...sp} align="right" />
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
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${STABILITY_BADGE[s.stability]}`}>
                      {s.stability}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[220px]">{s.conditions}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[260px]">{s.role}</td>
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
    </main>
  )
}
