'use client'

import { useEffect, useRef } from 'react'
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  IChartApi,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
} from 'lightweight-charts'
import type { OhlcvBar, StructurePivotBar } from '@/types/chart'
import { ema, sma, toSeries } from '@/lib/indicators'

interface Props {
  bars: OhlcvBar[]
  structurePivot?: StructurePivotBar[]
  height?: number
}

const CHART_BG = '#ffffff'
const UP = '#16a34a'
const DOWN = '#dc2626'
const VOL_UP = 'rgba(22, 163, 74, 0.45)'
const VOL_DOWN = 'rgba(220, 38, 38, 0.45)'
const CLOUD_PURPLE = 'rgba(139, 92, 246, 0.18)'
const EMA21_COLOR = '#9c9c9c'
const SMA50_COLOR = '#faa1a4'
const SP_HL_COLOR = '#f44336'
const SP_PIVOT_COLOR = '#2196f3'
const SP_BREAK_COLOR = '#4caf50'

export default function MiniChart({ bars, structurePivot, height = 180 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || bars.length === 0) return

    const chart = createChart(container, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: CHART_BG },
        textColor: '#94a3b8',
        attributionLogo: false,
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(148,163,184,0.06)' },
        horzLines: { color: 'rgba(148,163,184,0.06)' },
      },
      timeScale: {
        timeVisible: false,
        borderColor: 'rgba(203,213,225,0.6)',
        rightOffset: 3,
      },
      rightPriceScale: {
        borderColor: 'rgba(203,213,225,0.6)',
        scaleMargins: { top: 0.05, bottom: 0.32 },
      },
      crosshair: { mode: 0 },
      handleScroll: false,
      handleScale: false,
      autoSize: true,
    })

    /* MA Cloud (EMA21 high/low band, single colour) */
    const ema21Hi = toSeries(bars, ema(bars.map(b => b.high), 21))
    const ema21Lo = toSeries(bars, ema(bars.map(b => b.low), 21))

    const cloudHi = chart.addSeries(AreaSeries, {
      lineColor: 'rgba(0,0,0,0)',
      topColor: CLOUD_PURPLE,
      bottomColor: CLOUD_PURPLE,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })
    cloudHi.setData(ema21Hi)
    const cloudLoMask = chart.addSeries(AreaSeries, {
      lineColor: 'rgba(0,0,0,0)',
      topColor: CHART_BG,
      bottomColor: CHART_BG,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })
    cloudLoMask.setData(ema21Lo)

    /* MAs: EMA21 + SMA50 (compact: drop SMA10) */
    const closes = bars.map(b => b.close)
    const ema21Series = chart.addSeries(LineSeries, {
      color: EMA21_COLOR,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })
    ema21Series.setData(toSeries(bars, ema(closes, 21)))

    const sma50Series = chart.addSeries(LineSeries, {
      color: SMA50_COLOR,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })
    sma50Series.setData(toSeries(bars, sma(closes, 50)))

    /* Candles */
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      priceLineVisible: false,
    })
    candleSeries.setData(
      bars.map(b => ({
        time: b.date,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
    )

    /* Volume on overlay scale */
    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      priceLineVisible: false,
      lastValueVisible: false,
    })
    volSeries.setData(
      bars.map((b, i) => {
        const prev = i === 0 ? b.open : bars[i - 1].close
        return {
          time: b.date,
          value: b.volume,
          color: b.close >= prev ? VOL_UP : VOL_DOWN,
        }
      }),
    )
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    })

    /* Structure Pivot overlay (no marker label — too small for "BREAK" text) */
    if (structurePivot && structurePivot.length > 0) {
      // Same phase-boundary logic as PriceChart: insert whitespace at value
      // transitions inside an active block so each constant-value phase
      // renders as its own clean horizontal segment.
      const buildPhaseData = (pick: (sp: StructurePivotBar) => number | null) =>
        structurePivot.map((sp, i) => {
          if (!sp.active) return { time: sp.date }
          const v = pick(sp)
          if (v == null) return { time: sp.date }
          const prev = structurePivot[i - 1]
          if (prev && prev.active) {
            const pv = pick(prev)
            if (pv != null && pv !== v) return { time: sp.date }
          }
          return { time: sp.date, value: v }
        })

      const hlSeries = chart.addSeries(LineSeries, {
        color: SP_HL_COLOR,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      hlSeries.setData(buildPhaseData(sp => sp.curr_pivot))

      const pivotSeries = chart.addSeries(LineSeries, {
        color: SP_PIVOT_COLOR,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      pivotSeries.setData(buildPhaseData(sp => sp.break_val))

      const breakMarkers = structurePivot
        .filter(sp => sp.just_broke)
        .map(sp => ({
          time: sp.date,
          position: 'belowBar' as const,
          color: SP_BREAK_COLOR,
          shape: 'arrowUp' as const,
        }))
      if (breakMarkers.length > 0) {
        createSeriesMarkers(candleSeries, breakMarkers)
      }
    }

    chart.timeScale().fitContent()
    chartRef.current = chart

    const handleResize = () => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({ width: container.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
    }
  }, [bars, height, structurePivot])

  if (bars.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-slate-50 rounded text-[11px] text-slate-400"
        style={{ height }}
      >
        no data
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height, minHeight: height }}
    />
  )
}
