'use client'

import { useState, useMemo } from 'react'
import { DailyLeader } from '@/types/leaders'
import Tooltip from '@/components/shared/Tooltip'

// ── Types ────────────────────────────────────────────────────────────────────
type SortKey = keyof DailyLeader
type SortDir = 'asc' | 'desc'

// ── Column tooltips ──────────────────────────────────────────────────────────
const COLUMN_TOOLTIPS: Record<string, string> = {
  rs_composite:  '相対強度パーセンタイル（0–100）— 上位10%のみ表示',
  daily_pct:     '当日騰落率（%）— 前営業日終値比',
  adr_pct:       '平均日次値幅（%）: 直近21日の高低差の平均',
  weekly_pct:    '直近1週間（5営業日）のリターン（%）',
  monthly_pct:   '直近1ヶ月（20営業日）のリターン（%）',
  dist_ema21_r:  '21日EMAまでの距離（ATR正規化）— 0に近いほどEMAに接近',
  dist_wma10_r:  '週足10WMAまでの距離（ATR正規化）',
  dist_sma50_r:  '50日SMAまでの距離（ATR正規化）',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function ChangePill({ value, decimals = 1, suffix = '%' }: {
  value: number | null | undefined
  decimals?: number
  suffix?: string
}) {
  if (value === null || value === undefined) return <span className="text-gray-400">—</span>
  const pos = value >= 0
  return (
    <span
      className="font-mono text-xs font-semibold"
      style={{ color: pos ? 'var(--positive)' : 'var(--negative)' }}
    >
      {pos ? '+' : ''}{value.toFixed(decimals)}{suffix}
    </span>
  )
}

// ── Sortable header ──────────────────────────────────────────────────────────
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

  // セクター一覧を抽出
  const sectors = useMemo(() => {
    const set = new Set<string>()
    leaders.forEach(l => { if (l.sector) set.add(l.sector) })
    return Array.from(set).sort()
  }, [leaders])

  // ソート切替
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  // フィルタ + ソート
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

  const thProps = { currentKey: sortKey, currentDir: sortDir, onSort: handleSort }

  return (
    <div>
      {/* サマリー + フィルター */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          本日のリーダー: <strong style={{ color: 'var(--text-primary)' }}>{sorted.length}</strong> 銘柄
        </span>

        <select
          value={sectorFilter}
          onChange={e => setSectorFilter(e.target.value)}
          className="text-sm border border-[var(--border)] rounded-lg px-3 py-1.5 bg-white"
          style={{ color: 'var(--text-primary)' }}
        >
          <option value="all">全セクター</option>
          {sectors.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* テーブル */}
      <div className="card overflow-x-auto">
        <table className="w-full text-xs" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
          <thead>
            <tr className="border-b border-[var(--border)]">
              <SortTh label="Code" sortKey="code" align="left" {...thProps} />
              <SortTh label="Name" sortKey="name" align="left" {...thProps} />
              <SortTh label="Sector" sortKey="sector" align="left" {...thProps} />
              <SortTh label="RS" tooltip={COLUMN_TOOLTIPS.rs_composite} sortKey="rs_composite" {...thProps} />
              <SortTh label="1D%" tooltip={COLUMN_TOOLTIPS.daily_pct} sortKey="daily_pct" {...thProps} />
              <SortTh label="ADR%" tooltip={COLUMN_TOOLTIPS.adr_pct} sortKey="adr_pct" {...thProps} />
              <SortTh label="1W%" tooltip={COLUMN_TOOLTIPS.weekly_pct} sortKey="weekly_pct" {...thProps} />
              <SortTh label="1M%" tooltip={COLUMN_TOOLTIPS.monthly_pct} sortKey="monthly_pct" {...thProps} />
              <SortTh label="EMA21" tooltip={COLUMN_TOOLTIPS.dist_ema21_r} sortKey="dist_ema21_r" {...thProps} />
              <SortTh label="WMA10" tooltip={COLUMN_TOOLTIPS.dist_wma10_r} sortKey="dist_wma10_r" {...thProps} />
              <SortTh label="SMA50" tooltip={COLUMN_TOOLTIPS.dist_sma50_r} sortKey="dist_sma50_r" {...thProps} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={`${row.code}-${i}`}
                className={`border-b border-[var(--border)] hover:bg-[var(--bg-card-hover)] transition-colors ${
                  i % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'
                }`}
              >
                {/* Code → TradingView link */}
                <td className="px-3 py-2 text-left font-semibold">
                  <a
                    href={`https://jp.tradingview.com/chart/?symbol=TSE:${row.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    {row.code}
                  </a>
                </td>

                {/* Name → 四季報 link */}
                <td
                  className="px-3 py-2 text-left max-w-[160px] truncate"
                  style={{ fontFamily: 'var(--font-jp, sans-serif)' }}
                  title={row.name ?? ''}
                >
                  <a
                    href={`https://shikiho.toyokeizai.net/stocks/${row.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {row.name ?? '—'}
                  </a>
                </td>

                {/* Sector */}
                <td
                  className="px-3 py-2 text-left max-w-[120px] truncate"
                  style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jp, sans-serif)' }}
                  title={row.sector ?? ''}
                >
                  {row.sector ?? '—'}
                </td>

                {/* RS */}
                <td className="px-3 py-2 text-right font-semibold" style={{
                  color: (row.rs_composite ?? 0) >= 95 ? 'var(--positive)' : 'var(--text-primary)',
                }}>
                  {row.rs_composite !== null && row.rs_composite !== undefined
                    ? row.rs_composite.toFixed(1) : '—'}
                </td>

                {/* 1D% */}
                <td className="px-3 py-2 text-right">
                  <ChangePill value={row.daily_pct} decimals={2} />
                </td>

                {/* ADR% */}
                <td className="px-3 py-2 text-right" style={{ color: 'var(--text-primary)' }}>
                  {row.adr_pct !== null && row.adr_pct !== undefined
                    ? `${row.adr_pct.toFixed(1)}%` : '—'}
                </td>

                {/* 1W% */}
                <td className="px-3 py-2 text-right">
                  <ChangePill value={row.weekly_pct} />
                </td>

                {/* 1M% */}
                <td className="px-3 py-2 text-right">
                  <ChangePill value={row.monthly_pct} />
                </td>

                {/* EMA21 (R) */}
                <td className="px-3 py-2 text-right">
                  <ChangePill value={row.dist_ema21_r} suffix="R" />
                </td>

                {/* WMA10 (R) */}
                <td className="px-3 py-2 text-right">
                  <ChangePill value={row.dist_wma10_r} suffix="R" />
                </td>

                {/* SMA50 (R) */}
                <td className="px-3 py-2 text-right">
                  <ChangePill value={row.dist_sma50_r} suffix="R" />
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
