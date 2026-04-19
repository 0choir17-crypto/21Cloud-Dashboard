'use client'

import { useEffect, useState } from 'react'
import { LineStyle } from 'lightweight-charts'
import { TimeSeriesChart, type TimeSeriesPoint } from './TimeSeriesChart'
import { fetchMcScoreTimeSeries } from '@/lib/marketChartData'

interface Props {
  height?: number
}

export function McScoreChart({ height = 240 }: Props) {
  const [data, setData] = useState<TimeSeriesPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchMcScoreTimeSeries(180).then((result) => {
      if (cancelled) return
      setData(result)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const latest = data.length > 0 ? data[data.length - 1].value : null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-500">
          MC Score — Last 180 days
        </h3>
        {latest !== null && (
          <span className="text-sm font-mono text-[var(--text-secondary)]">
            Latest: {latest.toFixed(0)}/21
          </span>
        )}
      </div>
      {loading ? (
        <div
          className="flex items-center justify-center bg-slate-50 rounded-md text-sm text-slate-400"
          style={{ height }}
        >
          Loading...
        </div>
      ) : (
        <TimeSeriesChart
          data={data}
          color="#10b981"
          name="MC Score"
          height={height}
          yMin={0}
          yMax={21}
          horizontalLines={[
            {
              price: 21,
              color: 'rgba(148, 163, 184, 0.5)',
              title: 'Max 21',
              lineStyle: LineStyle.Dotted,
            },
            {
              price: 17,
              color: 'rgba(16, 185, 129, 0.5)',
              title: 'Bull (≥17)',
              lineStyle: LineStyle.Dashed,
            },
            {
              price: 9,
              color: 'rgba(239, 68, 68, 0.5)',
              title: 'Bear (≤9)',
              lineStyle: LineStyle.Dashed,
            },
          ]}
        />
      )}
    </div>
  )
}
