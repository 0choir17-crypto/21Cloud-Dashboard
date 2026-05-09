'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useDate } from '@/contexts/DateContext'
import { fetchStructurePivot } from '@/lib/structurePivotFetch'
import type {
  StructurePivotResponse,
  StructurePivotRow,
} from '@/types/structurePivot'
import StructurePivotHeader from '@/components/structurePivot/StructurePivotHeader'
import StructurePivotFilter, {
  type SignalFilter,
  type StructurePivotFilters,
  type TierFilter,
} from '@/components/structurePivot/StructurePivotFilter'
import StructurePivotTable from '@/components/structurePivot/StructurePivotTable'
import StructurePivotLegend from '@/components/structurePivot/StructurePivotLegend'
import StockChartView from '@/components/chart/StockChartView'
import StockGrid, { type GridEntry } from '@/components/chart/StockGrid'
import ViewToggle, { type ViewMode } from '@/components/chart/ViewToggle'

const INITIAL_FILTERS: StructurePivotFilters = {
  signal: 'all',
  tier: 'all',
  vcpOnly: false,
  watchlistOnly: false,
}

export default function StructurePivotPage() {
  const { selectedDate, isLatest } = useDate()
  const [response, setResponse] = useState<StructurePivotResponse>({
    date: null,
    rows: [],
    summary: {
      total: 0,
      by_tier: { S: 0, A: 0, B: 0 },
      by_signal: { HL_BREAK: 0, SETUP_LONG: 0 },
    },
  })
  const [latestPivotDate, setLatestPivotDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<StructurePivotFilters>(INITIAL_FILTERS)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  const detailRef = useRef<HTMLDivElement | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)

    // 最新日表示時はテーブル内最新日を取得 (DateContext は daily_signals 基準なので
    // structure pivot にとって最新でない可能性がある).
    const result = await fetchStructurePivot({
      date: !isLatest && selectedDate ? selectedDate : undefined,
      limit: 500,
    })

    setResponse(result)
    if (isLatest) {
      setLatestPivotDate(result.date)
    }
    setLoading(false)
  }, [selectedDate, isLatest])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const displayDate = useMemo(
    () => (isLatest ? (latestPivotDate ?? selectedDate) : selectedDate),
    [isLatest, latestPivotDate, selectedDate],
  )

  // Filtering (client side, on top of fetched data)
  const filtered: StructurePivotRow[] = useMemo(() => {
    return response.rows.filter(r => {
      if (filters.signal !== 'all' && r.signal_type !== filters.signal)
        return false
      if (filters.tier !== 'all' && r.quality_tier !== filters.tier)
        return false
      if (filters.vcpOnly && !r.vcp_within_21d) return false
      if (filters.watchlistOnly && !r.in_watchlist) return false
      return true
    })
  }, [response.rows, filters])

  // Counts for filter button badges
  const signalCounts: Record<SignalFilter, number> = useMemo(() => {
    const c: Record<SignalFilter, number> = {
      all: response.rows.length,
      HL_BREAK: 0,
      SETUP_LONG: 0,
    }
    for (const r of response.rows) {
      if (r.signal_type === 'HL_BREAK') c.HL_BREAK += 1
      else if (r.signal_type === 'SETUP_LONG') c.SETUP_LONG += 1
    }
    return c
  }, [response.rows])

  // Card view needs an explicitly sorted list (table view has its own sort)
  const TIER_ORDER: Record<string, number> = useMemo(
    () => ({ S: 0, A: 1, B: 2 }),
    [],
  )
  const SIGNAL_ORDER: Record<string, number> = useMemo(
    () => ({ HL_BREAK: 0, SETUP_LONG: 1 }),
    [],
  )
  const sortedForCards: StructurePivotRow[] = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ta = TIER_ORDER[a.quality_tier] ?? 9
      const tb = TIER_ORDER[b.quality_tier] ?? 9
      if (ta !== tb) return ta - tb
      const sa = SIGNAL_ORDER[a.signal_type] ?? 9
      const sb = SIGNAL_ORDER[b.signal_type] ?? 9
      if (sa !== sb) return sa - sb
      return (b.days_in_setup ?? 0) - (a.days_in_setup ?? 0)
    })
  }, [filtered, TIER_ORDER, SIGNAL_ORDER])

  const gridEntries: GridEntry[] = useMemo(
    () =>
      sortedForCards.map(r => ({
        code: r.code,
        name: r.name,
        sector: r.sector,
        overrides: {
          rs: r.cockpit_rs ?? null,
          adrPct: r.adr_pct ?? null,
        },
      })),
    [sortedForCards],
  )

  const tierCounts: Record<TierFilter, number> = useMemo(() => {
    const c: Record<TierFilter, number> = {
      all: response.rows.length,
      S: 0,
      A: 0,
      B: 0,
    }
    for (const r of response.rows) {
      if (r.quality_tier === 'S') c.S += 1
      else if (r.quality_tier === 'A') c.A += 1
      else if (r.quality_tier === 'B') c.B += 1
    }
    return c
  }, [response.rows])

  const regime = useMemo(
    () => response.rows.find(r => r.regime != null)?.regime ?? null,
    [response.rows],
  )
  const mcV4 = useMemo(
    () => response.rows.find(r => r.mc_v4 != null)?.mc_v4 ?? null,
    [response.rows],
  )

  const selectedRow = useMemo(
    () =>
      selectedCode ? response.rows.find(r => r.code === selectedCode) : null,
    [response.rows, selectedCode],
  )

  useEffect(() => {
    if (selectedCode && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedCode])

  const handleSelect = (code: string) => {
    setSelectedCode(prev => (prev === code ? null : code))
  }

  return (
    <main
      className="min-h-screen p-6"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans, sans-serif)',
            }}
          >
            <span aria-hidden className="mr-2">🏗️</span>Structure Pivot
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            LL-HL ベースの長期 setup → HL_BREAK イベント。VCP × Pivot で +8.2pp
            edge、S tier (cockpit_rs 80–90 + mc_v4 70–85) で 75.76% winrate。
          </p>
        </div>
        <div className="flex items-center gap-4">
          {displayDate && (
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isLatest ? '' : 'Snapshot: '}
              {displayDate}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--border)] bg-white hover:bg-[var(--bg-card-hover)] transition-colors disabled:opacity-50"
            style={{ color: 'var(--accent)' }}
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      {!isLatest && selectedDate && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-sm font-medium">
          {selectedDate} のスナップショットを表示中
        </div>
      )}

      <StructurePivotHeader
        summary={response.summary}
        regime={regime}
        mcV4={mcV4}
      />

      <StructurePivotLegend />

      {loading && response.rows.length === 0 ? (
        <div
          className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-lg font-medium">Loading...</p>
        </div>
      ) : !loading && response.rows.length === 0 ? (
        <div
          className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-lg font-medium mb-2">
            この日の Structure Pivot 候補は 0 件です。
          </p>
          <p className="text-sm">
            日次 cron (平日 18:00 JST) の更新を待つか、別日を選択してください。
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <StructurePivotFilter
              filters={filters}
              onChange={setFilters}
              signalCounts={signalCounts}
              tierCounts={tierCounts}
            />
            <ViewToggle mode={viewMode} onChange={setViewMode} />
          </div>

          <p className="mb-2 text-xs text-gray-500">
            Showing {filtered.length} of {response.rows.length} rows
            {filtered.length < response.rows.length && ' (filtered)'}
          </p>

          {viewMode === 'cards' ? (
            <StockGrid
              entries={gridEntries}
              selectedCode={selectedCode}
              onSelect={handleSelect}
            />
          ) : (
            <StructurePivotTable
              rows={filtered}
              onSelect={handleSelect}
              selectedCode={selectedCode}
            />
          )}

          {selectedCode && selectedRow && (
            <div ref={detailRef} className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Detail — {selectedCode}
                  {selectedRow.signal_type === 'HL_BREAK' && (
                    <span className="ml-2 inline-block px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                      🔵 HL_BREAK
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setSelectedCode(null)}
                  className="text-xs px-2 py-1 rounded border border-[var(--border)] bg-white hover:bg-gray-50 text-[var(--text-secondary)]"
                >
                  閉じる ✕
                </button>
              </div>

              {/* Pivot summary strip */}
              <div className="card p-3 mb-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                <DetailStat
                  label="pivot_price"
                  value={
                    selectedRow.pivot_price != null
                      ? selectedRow.pivot_price.toFixed(2)
                      : '—'
                  }
                />
                <DetailStat
                  label="break_dist_pct"
                  value={
                    selectedRow.break_dist_pct != null
                      ? `${selectedRow.break_dist_pct >= 0 ? '+' : ''}${selectedRow.break_dist_pct.toFixed(2)}%`
                      : '—'
                  }
                  emphasize={
                    selectedRow.break_dist_pct != null &&
                    Math.abs(selectedRow.break_dist_pct) <= 2
                  }
                />
                <DetailStat
                  label="days_in_setup"
                  value={
                    selectedRow.days_in_setup != null
                      ? `${selectedRow.days_in_setup}d`
                      : '—'
                  }
                />
                <DetailStat
                  label="vcp_days_since"
                  value={
                    selectedRow.vcp_days_since != null
                      ? `${selectedRow.vcp_days_since}d`
                      : '—'
                  }
                />
                <DetailStat
                  label="cockpit_rs"
                  value={
                    selectedRow.cockpit_rs != null
                      ? selectedRow.cockpit_rs.toFixed(1)
                      : '—'
                  }
                />
                <DetailStat
                  label="vcs_score"
                  value={
                    selectedRow.vcs_score != null
                      ? selectedRow.vcs_score.toFixed(1)
                      : '—'
                  }
                />
              </div>

              <StockChartView
                code={selectedCode}
                name={selectedRow.name ?? null}
                sector={selectedRow.sector ?? null}
              />
            </div>
          )}
        </>
      )}
    </main>
  )
}

function DetailStat({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p
        className={`mt-0.5 font-mono ${emphasize ? 'font-bold' : 'font-semibold'}`}
        style={{
          color: emphasize ? '#a16207' : 'var(--text-primary)',
        }}
      >
        {value}
      </p>
    </div>
  )
}
