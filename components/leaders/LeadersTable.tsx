'use client'

import { useState, useMemo } from 'react'
import { DailyLeader } from '@/types/leaders'
import Tooltip from '@/components/shared/Tooltip'

// ── Types ────────────────────────────────────────────────────────────────────
type SortKey = keyof DailyLeader
type SortDir = 'asc' | 'desc'

// ── Column tooltips ──────────────────────────────────────────────────────────
const COLUMN_TOOLTIPS: Record<string, string> = {
  rs_composite: '相対強度パーセンタイル（0–100）— 上位10%のみ表示',
  adr_pct:      '平均日次値幅（%）: 直近21日の高低差の平均',
  weekly_pct:   '直近1週間（5営業日）のリターン（%）',
  monthly_pct:  '直近1ヶ月（20営業日）のリターン（%）',
  turnover_50d: '50日平均売買代金（億円）',
  close:        '当日終値',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined) return '—'
  return val.toFixed(decimals)
}

function ChangePill({ value, decimals = 1 }: { value: number | null | undefined; decimals?: number }) {
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
              <SortTh label="コード" sortKey="code" align="left" {...thProps} />
              <SortTh label="銘柄名" sortKey="name" align="left" {...thProps} />
              <SortTh label="セクター" sortKey="sector" align="left" {...thProps} />
              <SortTh label="RS" tooltip={COLUMN_TOOLTIPS.rs_composite} sortKey="rs_composite" {...thProps} />
              <SortTh label="ADR%" tooltip={COLUMN_TOOLTIPS.adr_pct} sortKey="adr_pct" {...thProps} />
              <SortTh label="1W%" tooltip={COLUMN_TOOLTIPS.weekly_pct} sortKey="weekly_pct" {...thProps} />
              <SortTh label="1M%" tooltip={COLUMN_TOOLTIPS.monthly_pct} sortKey="monthly_pct" {...thProps} />
              <SortTh label="終値" tooltip={COLUMN_TOOLTIPS.close} sortKey="close" {...thProps} />
              <SortTh label="売買代金" tooltip={COLUMN_TOOLTIPS.turnover_50d} sortKey="turnover_50d" {...thProps} />
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-center whitespace-nowrap">
                リンク
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const code4 = row.code
              return (
                <tr
                  key={`${row.code}-${i}`}
                  className={`border-b border-[var(--border)] hover:bg-[var(--bg-card-hover)] transition-colors ${
                    i % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'
                  }`}
                >
                  {/* コード */}
                  <td className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {code4}
                  </td>

                  {/* 銘柄名 */}
                  <td
                    className="px-3 py-2 text-left max-w-[160px] truncate"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jp, sans-serif)' }}
                    title={row.name ?? ''}
                  >
                    {row.name ?? '—'}
                  </td>

                  {/* セクター */}
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
                    {fmt(row.rs_composite)}
                  </td>

                  {/* ADR% */}
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--text-primary)' }}>
                    {fmt(row.adr_pct)}%
                  </td>

                  {/* 1W% */}
                  <td className="px-3 py-2 text-right">
                    <ChangePill value={row.weekly_pct} />
                  </td>

                  {/* 1M% */}
                  <td className="px-3 py-2 text-right">
                    <ChangePill value={row.monthly_pct} />
                  </td>

                  {/* 終値 */}
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--text-primary)' }}>
                    {row.close !== null && row.close !== undefined
                      ? Math.round(row.close).toLocaleString()
                      : '—'}
                  </td>

                  {/* 売買代金 */}
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>
                    {fmt(row.turnover_50d)}億
                  </td>

                  {/* 外部リンク */}
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <a
                      href={`https://jp.tradingview.com/chart/?symbol=TSE:${code4}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100 transition-colors"
                      title="TradingView"
                    >
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </a>
                    <a
                      href={`https://shikiho.toyokeizai.net/stocks/${code4}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100 transition-colors ml-1"
                      title="四季報オンライン"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </a>
                  </td>
                </tr>
              )
            })}
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
