import {
  IChartApi,
  ISeriesApi,
  LineSeries,
  LineStyle,
  SeriesType,
  Time,
  createSeriesMarkers,
} from 'lightweight-charts'
import type { CounterTrendBar, StructurePivotPhase } from '@/types/chart'

// Pine-faithful palette for the LL-HL Long-side overlay.
const COLOR_PIVOT_CURRENT = '#2196f3' // Pivot horizontal — current pending phase
const COLOR_HL_CURRENT = '#f44336' // Structure diagonal — current pending phase
const COLOR_HISTORY = '#9aa0a6' // gray for resolved phases
const COLOR_BREAK = '#16a34a' // BREAK ▲
const COLOR_HL_DOT = '#1d4ed8' // HL marker
const COLOR_LL_DOT = '#9333ea' // LL marker
const COLOR_COUNTER = '#f97316' // orange — Counter Trend continuous line

export type DrawOptions = {
  /** Show resolved (broken / invalidated) phases. Default true. */
  showHistory?: boolean
  /** Show only the current pending phase, hide everything else. Default false. */
  currentOnly?: boolean
  /** Show the per-bar Counter Trend continuous line. Default true. */
  showCounterTrend?: boolean
  /** Suppress on-chart text (BREAK label, Pivot price label, HL/LL text). */
  compact?: boolean
}

/**
 * Render the Structure Pivot overlay onto an existing chart.
 *
 * Returns a cleanup function (no-op for now — the chart's own .remove()
 * disposes everything).
 */
export function drawStructurePivot(
  chart: IChartApi,
  candleSeries: ISeriesApi<SeriesType>,
  phases: StructurePivotPhase[] | undefined,
  counterTrend: CounterTrendBar[] | undefined,
  opts: DrawOptions = {},
): void {
  const showHistory = opts.showHistory ?? true
  const currentOnly = opts.currentOnly ?? false
  const showCounterTrend = opts.showCounterTrend ?? true
  const compact = opts.compact ?? false

  // ---- Phase filter ----------------------------------------------------
  let visiblePhases: StructurePivotPhase[] = phases ?? []

  if (currentOnly) {
    // 「現 phase のみ」= まだ broke していない最新 phase 1 つ
    const pending = visiblePhases.filter(p => p.broke_at == null)
    visiblePhases = pending.length > 0 ? [pending[pending.length - 1]] : []
  } else if (!showHistory) {
    // History を抑制するときは、broke していない phase + 直近 1 broke までに絞る
    visiblePhases = visiblePhases.filter(p => p.broke_at == null)
    if (visiblePhases.length === 0 && (phases?.length ?? 0) > 0) {
      visiblePhases = [phases![phases!.length - 1]]
    }
  }

  // 直近 phase = 「現在 pending な phase（broke==null）」または最新の 1 つ
  const lastPending = (phases ?? []).slice().reverse().find(p => p.broke_at == null)
  const isCurrent = (p: StructurePivotPhase) =>
    lastPending != null && p.phase_start_date === lastPending.phase_start_date

  // ---- Per-phase drawing ----------------------------------------------
  const breakMarkers: Array<{
    time: Time
    position: 'aboveBar' | 'belowBar' | 'inBar'
    color: string
    shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square'
    text?: string
  }> = []
  const pivotMarkers: typeof breakMarkers = []

  for (const phase of visiblePhases) {
    const current = isCurrent(phase)
    const pivotColor = current ? COLOR_PIVOT_CURRENT : COLOR_HISTORY
    const hlColor = current ? COLOR_HL_CURRENT : COLOR_HISTORY
    const lineWidth = current ? 2 : 1
    const lineStyle = current ? LineStyle.Dashed : LineStyle.Dotted

    // 1) Pivot horizontal line: phase_start → phase_end at break_val
    const pivotLine = chart.addSeries(LineSeries, {
      color: pivotColor,
      lineWidth,
      lineStyle,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })
    pivotLine.setData([
      { time: phase.phase_start_date as Time, value: phase.break_val },
      { time: phase.phase_end_date as Time, value: phase.break_val },
    ])

    // 2) Structure diagonal line: prev_pivot → curr_pivot
    if (
      phase.prev_pivot_date != null &&
      phase.prev_pivot_price != null &&
      phase.curr_pivot_date != null
    ) {
      const structLine = chart.addSeries(LineSeries, {
        color: hlColor,
        lineWidth,
        lineStyle,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      // setData requires ascending time
      const a = {
        time: phase.prev_pivot_date as Time,
        value: phase.prev_pivot_price,
      }
      const b = {
        time: phase.curr_pivot_date as Time,
        value: phase.curr_pivot_price,
      }
      structLine.setData(
        a.time < b.time ? [a, b] : [b, a],
      )
    }

    // 3) HL / LL labels at pivot bars
    if (phase.curr_pivot_date != null) {
      pivotMarkers.push({
        time: phase.curr_pivot_date as Time,
        position: 'belowBar',
        color: current ? COLOR_HL_DOT : COLOR_HISTORY,
        shape: 'circle',
        text: compact ? undefined : 'HL',
      })
    }
    if (phase.prev_pivot_date != null && phase.prev_pivot_price != null) {
      pivotMarkers.push({
        time: phase.prev_pivot_date as Time,
        position: 'belowBar',
        color: current ? COLOR_LL_DOT : COLOR_HISTORY,
        shape: 'circle',
        text: compact ? undefined : 'LL',
      })
    }

    // 4) HL_BREAK ▲
    if (phase.broke_at != null) {
      breakMarkers.push({
        time: phase.broke_at as Time,
        position: 'belowBar',
        color: COLOR_BREAK,
        shape: 'arrowUp',
        text: compact ? undefined : 'BREAK',
      })
    }
  }

  // ---- Counter Trend (continuous line, NULL → whitespace) -------------
  if (showCounterTrend && counterTrend && counterTrend.length > 0) {
    const counterLine = chart.addSeries(LineSeries, {
      color: COLOR_COUNTER,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })
    counterLine.setData(
      counterTrend.map(c =>
        c.value != null
          ? { time: c.date as Time, value: c.value }
          : { time: c.date as Time },
      ),
    )
  }

  // ---- Markers (single setMarkers call per series) --------------------
  // pivotMarkers ＋ breakMarkers をまとめて時系列ソートして 1 回でセット
  const allMarkers = [...pivotMarkers, ...breakMarkers]
  if (allMarkers.length > 0) {
    allMarkers.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
    createSeriesMarkers(candleSeries, allMarkers)
  }
}
