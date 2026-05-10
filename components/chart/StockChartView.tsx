'use client'

import { useEffect, useMemo, useState } from 'react'
import type {
  CounterTrendBar,
  OhlcvBar,
  StructurePivotPhase,
} from '@/types/chart'
import { computeCockpit } from '@/lib/cockpit'
import { fetchChart } from '@/lib/chartFetch'
import PriceChart from './PriceChart'
import CockpitPanel from './CockpitPanel'

type LookbackKey = '6M' | '1Y' | '2Y' | 'ALL'

const LOOKBACK_DAYS: Record<LookbackKey, number | null> = {
  '6M': 180,
  '1Y': 252,
  '2Y': 504,
  ALL: null,
}

interface Props {
  code: string
  name?: string | null
  sector?: string | null
}

type FetchState =
  | { status: 'loading'; code: string }
  | {
      status: 'ok'
      code: string
      bars: OhlcvBar[]
      structurePivotPhases: StructurePivotPhase[]
      counterTrend: CounterTrendBar[]
    }
  | { status: 'error'; code: string; error: string }

export default function StockChartView({ code, name, sector }: Props) {
  const [state, setState] = useState<FetchState>({ status: 'loading', code })
  const [lookback, setLookback] = useState<LookbackKey>('1Y')
  const [showPivotHistory, setShowPivotHistory] = useState(true)
  const [showCounterTrend, setShowCounterTrend] = useState(true)
  const [currentOnly, setCurrentOnly] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetchChart(code)
      .then(json => {
        if (cancelled) return
        setState({
          status: 'ok',
          code,
          bars: json.ohlcv,
          structurePivotPhases: json.structurePivotPhases ?? [],
          counterTrend: json.counterTrend ?? [],
        })
      })
      .catch(err => {
        if (cancelled) return
        setState({
          status: 'error',
          code,
          error: err instanceof Error ? err.message : 'fetch failed',
        })
      })

    return () => {
      cancelled = true
    }
  }, [code])

  // when code changes, surface a fresh loading state until the fetch above lands
  const effectiveState: FetchState = useMemo(
    () => (state.code === code ? state : { status: 'loading', code }),
    [state, code],
  )

  const loading = effectiveState.status === 'loading'
  const error = effectiveState.status === 'error' ? effectiveState.error : null
  const bars = useMemo(
    () => (effectiveState.status === 'ok' ? effectiveState.bars : []),
    [effectiveState],
  )
  const structurePivotPhases = useMemo(
    () =>
      effectiveState.status === 'ok'
        ? effectiveState.structurePivotPhases
        : [],
    [effectiveState],
  )
  const counterTrend = useMemo(
    () =>
      effectiveState.status === 'ok' ? effectiveState.counterTrend : [],
    [effectiveState],
  )

  const sliceFrom = useMemo(() => {
    if (bars.length === 0) return 0
    const days = LOOKBACK_DAYS[lookback]
    if (days == null) return 0
    return Math.max(0, bars.length - days)
  }, [bars, lookback])

  const visibleBars = useMemo(
    () => (sliceFrom > 0 ? bars.slice(sliceFrom) : bars),
    [bars, sliceFrom],
  )

  // Phase records reference dates that may be older than the visible window.
  // The chart's time axis only contains the visible bars' dates, and series
  // points (or markers) at out-of-window dates are silently dropped by
  // lightweight-charts — so we filter phases whose anchors are entirely
  // before the visible range out, then clip remaining anchor dates inward.
  const firstVisibleDate = visibleBars[0]?.date ?? null
  const visiblePhases = useMemo(() => {
    if (firstVisibleDate == null) return structurePivotPhases
    return structurePivotPhases
      .filter(p => p.phase_end_date >= firstVisibleDate)
      .map(p => ({
        ...p,
        // Anchor any out-of-window pivot/start dates to the leftmost visible bar
        phase_start_date:
          p.phase_start_date < firstVisibleDate
            ? firstVisibleDate
            : p.phase_start_date,
        prev_pivot_date:
          p.prev_pivot_date != null && p.prev_pivot_date < firstVisibleDate
            ? firstVisibleDate
            : p.prev_pivot_date,
        curr_pivot_date:
          p.curr_pivot_date != null && p.curr_pivot_date < firstVisibleDate
            ? firstVisibleDate
            : p.curr_pivot_date,
      }))
  }, [structurePivotPhases, firstVisibleDate])

  const visibleCounterTrend = useMemo(
    () =>
      sliceFrom > 0 ? counterTrend.slice(sliceFrom) : counterTrend,
    [counterTrend, sliceFrom],
  )

  // Cockpit is computed against the FULL history so MAs/ATR are seeded properly
  const cockpit = useMemo(() => computeCockpit(bars), [bars])

  const lastBar = bars[bars.length - 1] ?? null
  const prevBar = bars[bars.length - 2] ?? null
  const dailyPct =
    lastBar && prevBar && prevBar.close > 0
      ? ((lastBar.close - prevBar.close) / prevBar.close) * 100
      : null

  return (
    <div className="flex flex-col gap-3">
      {/* Header strip */}
      <div className="card p-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-mono text-lg font-bold text-[var(--accent)]">{code}</span>
        {name && (
          <span className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[260px]">
            {name}
          </span>
        )}
        {sector && (
          <span className="text-xs text-[var(--text-muted)]">{sector}</span>
        )}
        <span className="ml-auto flex items-center gap-3">
          {lastBar && (
            <span className="font-mono text-base font-bold text-[var(--text-primary)]">
              {lastBar.close.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}
            </span>
          )}
          {dailyPct != null && (
            <span
              className="font-mono text-sm font-semibold"
              style={{
                color: dailyPct >= 0 ? 'var(--positive)' : 'var(--negative)',
              }}
            >
              {dailyPct >= 0 ? '+' : ''}
              {dailyPct.toFixed(2)}%
            </span>
          )}
          <label
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] cursor-pointer select-none"
            title="過去 phase の Pivot / Structure 線 (gray) を表示"
          >
            <input
              type="checkbox"
              checked={showPivotHistory}
              onChange={e => setShowPivotHistory(e.target.checked)}
              disabled={currentOnly}
              className="w-3.5 h-3.5 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer disabled:opacity-50"
            />
            Pivot History
          </label>
          <label
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] cursor-pointer select-none"
            title="Counter Trend 連続線 (orange) を表示"
          >
            <input
              type="checkbox"
              checked={showCounterTrend}
              onChange={e => setShowCounterTrend(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
            />
            Counter Trend
          </label>
          <label
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] cursor-pointer select-none"
            title="現在の pending phase 1 つだけ表示"
          >
            <input
              type="checkbox"
              checked={currentOnly}
              onChange={e => setCurrentOnly(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
            />
            Current Only
          </label>
          <span className="flex items-center gap-1">
            {(['6M', '1Y', '2Y', 'ALL'] as LookbackKey[]).map(k => (
              <button
                key={k}
                onClick={() => setLookback(k)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  lookback === k
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-gray-50'
                }`}
              >
                {k}
              </button>
            ))}
          </span>
        </span>
      </div>

      {/* Cockpit */}
      <CockpitPanel snapshot={cockpit} />

      {/* Chart */}
      {loading ? (
        <div className="card p-8 text-center text-[var(--text-muted)] text-sm">
          Loading chart…
        </div>
      ) : error ? (
        <div className="card p-6 text-center text-sm text-red-600 bg-red-50 border border-red-200">
          チャート取得失敗: {error}
        </div>
      ) : visibleBars.length === 0 ? (
        <div className="card p-6 text-center text-sm text-[var(--text-muted)]">
          {code} の OHLCV データがありません
        </div>
      ) : (
        <PriceChart
          bars={visibleBars}
          structurePivotPhases={visiblePhases}
          counterTrend={visibleCounterTrend}
          showPivotHistory={showPivotHistory}
          showCounterTrend={showCounterTrend}
          currentOnly={currentOnly}
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)] px-2">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: 'rgba(139,92,246,0.45)' }} />
          MA Cloud (EMA21 high/low)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5" style={{ background: '#fbbf24' }} />
          SMA10
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5" style={{ background: '#9c9c9c' }} />
          EMA21
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5" style={{ background: '#faa1a4' }} />
          SMA50
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-0.5"
            style={{
              background:
                'repeating-linear-gradient(to right, #2196f3 0, #2196f3 3px, transparent 3px, transparent 6px)',
            }}
          />
          Pivot Line (current)
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-0.5"
            style={{
              background:
                'repeating-linear-gradient(to right, #f44336 0, #f44336 3px, transparent 3px, transparent 6px)',
            }}
          />
          Structure (LL→HL)
        </span>
        {showPivotHistory && !currentOnly && (
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-0.5"
              style={{
                background:
                  'repeating-linear-gradient(to right, #9aa0a6 0, #9aa0a6 1px, transparent 1px, transparent 4px)',
              }}
            />
            History (resolved phases)
          </span>
        )}
        {showCounterTrend && (
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-0.5"
              style={{
                background:
                  'repeating-linear-gradient(to right, #f97316 0, #f97316 3px, transparent 3px, transparent 6px)',
              }}
            />
            Counter Trend
          </span>
        )}
        <span className="flex items-center gap-1">
          <span style={{ color: '#16a34a' }}>▲</span>
          HL_BREAK
        </span>
      </div>
    </div>
  )
}
