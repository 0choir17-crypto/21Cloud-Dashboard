'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { DailyVcpScreen } from '@/types/vcp'
import { useDate } from '@/contexts/DateContext'
import VcpHeader from '@/components/vcp/VcpHeader'
import VcpStats from '@/components/vcp/VcpStats'
import VcpFilter, {
  applyPreset,
  FilterPreset,
} from '@/components/vcp/VcpFilter'
import VcpTable from '@/components/vcp/VcpTable'
import ViewToggle, { ViewMode } from '@/components/chart/ViewToggle'
import StockGrid, { GridEntry } from '@/components/chart/StockGrid'
import StockChartView from '@/components/chart/StockChartView'
import WatchlistModal from '@/components/watchlist/WatchlistModal'
import { WatchlistItem } from '@/types/portfolio'

const COLUMNS = `
  date, code, name, sector,
  close, vcs_score, vcs_days_tight, cockpit_rs, adr_pct, turnover_50d_oku,
  dist_sma50, dist_sma200, ma_stack,
  daily_pct, weekly_pct, monthly_pct, volume, rvol, pct_from_20d_high, high_52w_pct,
  regime, mc_v4
`

export default function VcpPage() {
  const { selectedDate, isLatest } = useDate()
  const [rows, setRows] = useState<DailyVcpScreen[]>([])
  const [latestVcpDate, setLatestVcpDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState<FilterPreset>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [watchTarget, setWatchTarget] = useState<Partial<WatchlistItem> | null>(null)

  const detailRef = useRef<HTMLDivElement | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)

    let targetDate = selectedDate
    if (isLatest || !selectedDate) {
      const { data: latest } = await supabase
        .from('daily_vcp_screen')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
      targetDate = latest?.date ?? selectedDate
      setLatestVcpDate(latest?.date ?? null)
    }

    if (!targetDate) {
      setRows([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('daily_vcp_screen')
      .select(COLUMNS)
      .eq('date', targetDate)
      .order('vcs_score', { ascending: false })

    if (error) {
      console.error('daily_vcp_screen fetch error:', error)
      setRows([])
      setLoading(false)
      return
    }

    setRows((data ?? []) as DailyVcpScreen[])
    setLoading(false)
  }, [selectedDate, isLatest])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const displayDate = useMemo(
    () => (isLatest ? latestVcpDate ?? selectedDate : selectedDate),
    [isLatest, latestVcpDate, selectedDate],
  )

  const counts: Record<FilterPreset, number> = useMemo(
    () => ({
      all: rows.length,
      strong: applyPreset(rows, 'strong').length,
      pivot: applyPreset(rows, 'pivot').length,
      tight: applyPreset(rows, 'tight').length,
    }),
    [rows],
  )

  const filtered = useMemo(() => applyPreset(rows, preset), [rows, preset])

  // regime / mc_v4 はどの行も同日なら共通だが念のため最初の非null を採用
  const regime = useMemo(
    () => rows.find(r => r.regime != null)?.regime ?? null,
    [rows],
  )
  const mcV4 = useMemo(
    () => rows.find(r => r.mc_v4 != null)?.mc_v4 ?? null,
    [rows],
  )

  const gridEntries: GridEntry[] = useMemo(
    () =>
      filtered.map(r => ({
        code: r.code,
        name: r.name,
        sector: r.sector,
        overrides: {
          rs: r.cockpit_rs ?? null,
          adrPct: r.adr_pct ?? null,
          pivotPct: r.pct_from_20d_high ?? null,
          distSma50: r.dist_sma50 ?? null,
        },
      })),
    [filtered],
  )

  const selectedRow = useMemo(
    () => rows.find(r => r.code === selectedCode) ?? null,
    [rows, selectedCode],
  )

  // Smooth-scroll to detail when a card / row is selected
  useEffect(() => {
    if (selectedCode && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedCode])

  const handleSelect = (code: string) => {
    setSelectedCode(prev => (prev === code ? null : code))
  }

  const handleWatch = (code: string) => {
    const r = rows.find(x => x.code === code)
    if (!r) {
      setWatchTarget({ ticker: code })
      return
    }
    setWatchTarget({
      ticker: r.code,
      company_name: r.name ?? undefined,
      screen_tag: 'VCP',
      rs_composite: r.cockpit_rs ?? undefined,
      rvol: r.rvol ?? undefined,
      adr_pct: r.adr_pct ?? undefined,
      sector_name: r.sector ?? undefined,
      signal_price: r.close ?? undefined,
    })
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
            <span aria-hidden className="mr-2">📐</span>VCP Candidates
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Volatility Contraction Pattern — base → breakout 候補（3年バックテスト勝率 44.03% / 平均リターン +30.80%）
          </p>
        </div>
        <div className="flex items-center gap-4">
          {displayDate && (
            <span
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
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

      <VcpHeader regime={regime} mcV4={mcV4} />

      {loading && rows.length === 0 ? (
        <div
          className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-lg font-medium">Loading...</p>
        </div>
      ) : !loading && rows.length === 0 ? (
        <div
          className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-lg font-medium mb-2">本日の VCP 候補は 0 件です。</p>
          <p className="text-sm">
            通常 5〜40 件 / 日。市場が neutral/bear regime のとき少なくなります。
          </p>
          {regime && (
            <p className="text-xs mt-2 text-gray-500">
              現在 regime: <span className="font-mono">{regime}</span>
            </p>
          )}
        </div>
      ) : (
        <>
          <VcpStats rows={rows} />

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <VcpFilter preset={preset} onChange={setPreset} counts={counts} />
            <ViewToggle mode={viewMode} onChange={setViewMode} />
          </div>

          {viewMode === 'cards' ? (
            <StockGrid
              entries={gridEntries}
              selectedCode={selectedCode}
              onSelect={handleSelect}
              onWatch={handleWatch}
            />
          ) : (
            <VcpTable rows={filtered} />
          )}

          {selectedCode && (
            <div ref={detailRef} className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Detail — {selectedCode}
                </h2>
                <button
                  onClick={() => setSelectedCode(null)}
                  className="text-xs px-2 py-1 rounded border border-[var(--border)] bg-white hover:bg-gray-50 text-[var(--text-secondary)]"
                >
                  閉じる ✕
                </button>
              </div>
              <StockChartView
                code={selectedCode}
                name={selectedRow?.name ?? null}
                sector={selectedRow?.sector ?? null}
              />
            </div>
          )}
        </>
      )}

      <WatchlistModal
        open={watchTarget !== null}
        onClose={() => setWatchTarget(null)}
        onSaved={() => setWatchTarget(null)}
        initial={watchTarget ?? undefined}
      />
    </main>
  )
}
