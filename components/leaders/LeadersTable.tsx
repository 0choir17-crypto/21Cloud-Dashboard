'use client'

import { useState, useMemo } from 'react'
import { DailyLeader } from '@/types/leaders'
import Tooltip from '@/components/shared/Tooltip'

// ── Types ────────────────────────────────────────────────────────────────────
type SortKey = keyof DailyLeader
type SortDir = 'asc' | 'desc'

// ── Column tooltips (Signals と同じ表現) ─────────────────────────────────────
const COLUMN_TOOLTIPS: Record<string, string> = {
  rs_composite:  'Cockpit RS — TOPIX相対強度（0–100パーセンタイル）',
  daily_pct:     '昨日比変化率（%）',
  adr_pct:       '平均日次値幅（%）: 直近20日の高低差の平均',
  weekly_pct:    '直近1週間（5営業日）のリターン（%）',
  monthly_pct:   '直近1ヶ月（20営業日）のリターン（%）',
  dist_ema21_r:  '21日EMAまでのATR正規化距離（R倍率）',
  dist_wma10_r:  '週足10WMAまでのATR正規化距離（R倍率）',
  dist_sma50_r:  '50日SMAまでのATR正規化距離（R倍率）',
  turnover_50d:  '50日平均売買代金（億円）',
}

// ── Helpers (Signals と同じスタイル) ──────────────────────────────────────────
function fmt(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined) return '—'
  return val.toFixed(decimals)
}

function ChangePill({ value, decimals = 2 }: { value: number | null | undefined; decimals?: number }) {
  if (value === null || value === undefined) return <span className="text-gray-400">—</span>
  const pos = value >= 0
  return (
    <span
      className="font-mono text-xs font-semibold"
      style={{ color: pos ? 'var(--positive)' : 'var(--negative)' }}
    >
      {pos ? '+' : ''}{value.toFixed(decimals)}%
    </span>
  )
}

function AtrDistCell({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-gray-400">—</span>
  const pos = value >= 0
  return (
    <span
      className="font-mono text-xs font-semibold"
      style={{ color: pos ? 'var(--positive)' : 'var(--negative)' }}
    >
      {pos ? '+' : ''}{value.toFixed(1)}R
    </span>
  )
}

// ── Sortable header (Signals と同じ) ─────────────────────────────────────────
function SortTh({
  label,
  tooltip,
  sortKey: key,
  currentKey,
  currentDir,
  onSort,
  align = 'right',
}: {
  label: string
  tooltip?: string
  sortKey: SortKey
  currentKey: SortKey
  currentDir: SortDir
  onSort: (k: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = currentKey === key
  const indicator = active ? (currentDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'
  const labelEl = tooltip ? <Tooltip content={tooltip}>{label}</Tooltip> : <>{label}</>
  return (
    <th
      onClick={() => onSort(key)}
      className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 transition-colors ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${active ? 'text-[var(--accent)]' : 'text-gray-500'}`}
    >
      {labelEl}<span className="text-[10px] opacity-50">{indicator}</span>
    </th>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function LeadersTable({ leaders }: { leaders: DailyLeader[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('rs_composite')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [sectorFilter, setSectorFilter] = useState<string>('all')

  const sectors = useMemo(() => {
    const set = new Set<string>()
    leaders.forEach(l => { if (l.sector) set.add(l.sector) })
    return Array.from(set).sort()
  }, [leaders])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => {
    let data = leaders
    if (sectorFilter !== 'all') {
      data = data.filter(l => l.sector === sectorFilter)
    }
    return [...data].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      const diff = (av as number) - (bv as number)
      return sortDir === 'asc' ? diff : -diff
    })
  }, [leaders, sortKey, sortDir, sectorFilter])

  const sp = { currentKey: sortKey, currentDir: sortDir, onSort: handleSort }

  return (
    <div>
      {/* サマリー + フィルター */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Today&apos;s leaders: <strong style={{ color: 'var(--text-primary)' }}>{sorted.length}</strong>
        </span>
        <select
          value={sectorFilter}
          onChange={e => setSectorFilter(e.target.value)}
          className="text-sm border border-[var(--border)] rounded-lg px-3 py-1.5 bg-white"
          style={{ color: 'var(--text-primary)' }}
        >
          <option value="all">All Sectors</option>
          {sectors.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* テーブル */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-[#e8eaed]">
              {/* 銘柄 (Signals と同じ: Code+Name 1セル, ソート不可) */}
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">Name</th>
              <SortTh label="Sector"     sortKey="sector"       {...sp} align="left" />
              <SortTh label="RS"         sortKey="rs_composite" tooltip={COLUMN_TOOLTIPS.rs_composite} {...sp} />
              <SortTh label="1D%"        sortKey="daily_pct"    tooltip={COLUMN_TOOLTIPS.daily_pct}    {...sp} />
              <SortTh label="1W%"        sortKey="weekly_pct"   tooltip={COLUMN_TOOLTIPS.weekly_pct}   {...sp} />
              <SortTh label="1M%"        sortKey="monthly_pct"  tooltip={COLUMN_TOOLTIPS.monthly_pct}  {...sp} />
              <SortTh label="ADR%"       sortKey="adr_pct"      tooltip={COLUMN_TOOLTIPS.adr_pct}      {...sp} />
              <SortTh label="EMA21(R)"   sortKey="dist_ema21_r" tooltip={COLUMN_TOOLTIPS.dist_ema21_r} {...sp} />
              <SortTh label="10WMA(R)"   sortKey="dist_wma10_r" tooltip={COLUMN_TOOLTIPS.dist_wma10_r} {...sp} />
              <SortTh label="50SMA(R)"   sortKey="dist_sma50_r" tooltip={COLUMN_TOOLTIPS.dist_sma50_r} {...sp} />
              <SortTh label="Turnover"   sortKey="turnover_50d" tooltip={COLUMN_TOOLTIPS.turnover_50d} {...sp} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={`${row.code}-${i}`}
                className={`border-b border-[#f0f2f4] hover:bg-gray-50 transition-colors ${
                  i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'
                }`}
              >
                {/* 銘柄 (Signals と同じ: Code→TV, Name→四季報, 1セル) */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <a
                    href={`https://jp.tradingview.com/chart/?symbol=TSE:${row.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono font-bold text-blue-600 hover:underline text-sm leading-tight block"
                  >
                    {row.code}
                  </a>
                  <a
                    href={`https://shikiho.toyokeizai.net/stocks/${row.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-gray-400 hover:underline mt-0.5 max-w-[130px] truncate"
                  >
                    {row.name ?? '—'}
                  </a>
                </td>
                {/* セクター */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="text-xs text-gray-500 block max-w-[120px] truncate">{row.sector ?? '—'}</span>
                </td>
                {/* RS */}
                <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">{fmt(row.rs_composite, 1)}</td>
                {/* 1D% */}
                <td className="px-3 py-2.5 text-right whitespace-nowrap"><ChangePill value={row.daily_pct} decimals={2} /></td>
                {/* 1W% */}
                <td className="px-3 py-2.5 text-right whitespace-nowrap"><ChangePill value={row.weekly_pct} decimals={1} /></td>
                {/* 1M% */}
                <td className="px-3 py-2.5 text-right whitespace-nowrap"><ChangePill value={row.monthly_pct} decimals={1} /></td>
                {/* ADR% */}
                <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">{fmt(row.adr_pct, 1)}%</td>
                {/* EMA21(R) */}
                <td className="px-3 py-2.5 text-right whitespace-nowrap"><AtrDistCell value={row.dist_ema21_r} /></td>
                {/* 10WMA(R) */}
                <td className="px-3 py-2.5 text-right whitespace-nowrap"><AtrDistCell value={row.dist_wma10_r} /></td>
                {/* 50SMA(R) */}
                <td className="px-3 py-2.5 text-right whitespace-nowrap"><AtrDistCell value={row.dist_sma50_r} /></td>
                {/* 売買代金50d */}
                <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">
                  {row.turnover_50d != null ? `¥${row.turnover_50d.toFixed(1)}B` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            <p className="text-sm">該当するリーダー銘柄がありません</p>
          </div>
        )}
      </div>
    </div>
  )
}
