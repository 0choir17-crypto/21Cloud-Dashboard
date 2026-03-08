'use client'

import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip as RechartsTooltip,
  ReferenceLine, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { SectorData, Quadrant, getQuadrant, QUADRANT_CONFIG } from '@/types/sectors'

type Props = { sectors: SectorData[] }

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-white border border-[#e8eaed] rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="font-medium text-gray-700 mb-1">{d?.name}</p>
      <p className="text-gray-500">SMA50乖離: <span className="font-mono">{(d?.x ?? 0).toFixed(2)}%</span></p>
      <p className="text-gray-500">5D%: <span className="font-mono">{(d?.y ?? 0).toFixed(2)}%</span></p>
    </div>
  )
}

const QUADRANTS: Quadrant[] = ['leader', 'improving', 'weakening', 'lagging']

export default function SectorRRG({ sectors }: Props) {
  if (sectors.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center text-gray-400">
        <p className="text-sm">データ不足（20日以上必要）</p>
      </div>
    )
  }

  const allData = sectors.map(s => ({
    x: s.dist_sma50_pct ?? 0,
    y: s.chg_5d_pct     ?? 0,
    name: s.sector_name,
    quadrant: getQuadrant(s),
  }))

  return (
    <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-500 mb-4">
        セクター RRG（X: SMA50乖離% / Y: 5D%）
      </p>
      <div className="relative">
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f4" />
            <XAxis
              type="number"
              dataKey="x"
              name="SMA50乖離%"
              tick={{ fontSize: 11 }}
              tickFormatter={v => `${v}%`}
              label={{ value: 'SMA50乖離%', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#9ca3af' }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="5D%"
              tick={{ fontSize: 11 }}
              tickFormatter={v => `${v}%`}
              label={{ value: '5D%', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11, fill: '#9ca3af' }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <ReferenceLine x={0} stroke="#9ca3af" strokeDasharray="4 4" />
            <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
            {QUADRANTS.map(q => {
              const config = QUADRANT_CONFIG[q]
              return (
                <Scatter
                  key={q}
                  name={config.label}
                  data={allData.filter(d => d.quadrant === q)}
                  fill={config.color}
                  opacity={0.85}
                />
              )
            })}
          </ScatterChart>
        </ResponsiveContainer>
        {/* 4象限ラベル */}
        <div className="absolute top-6 right-8 text-[11px] font-semibold text-green-700 pointer-events-none">🟢 リーダー</div>
        <div className="absolute top-6  left-16 text-[11px] font-semibold text-blue-700  pointer-events-none">🔵 改善中</div>
        <div className="absolute bottom-12 right-8 text-[11px] font-semibold text-amber-700 pointer-events-none">🟡 弱体化</div>
        <div className="absolute bottom-12 left-16 text-[11px] font-semibold text-red-700   pointer-events-none">🔴 遅行</div>
      </div>
    </div>
  )
}
