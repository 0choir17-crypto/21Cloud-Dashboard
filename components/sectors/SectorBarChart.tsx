'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip,
  ReferenceLine, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import { SectorData } from '@/types/sectors'

type RSPoint = { date: string; sector_name: string; rs_1d: number }

type Props = {
  rsHistory: RSPoint[]
  sectors: SectorData[]
}

// ── 21D バーチャート フォールバック ─────────────────────────────────────────
function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const val  = payload[0]?.value as number
  const name = payload[0]?.payload?.name as string
  return (
    <div className="bg-white border border-[#e8eaed] rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="font-medium text-gray-700 mb-1">{name}</p>
      <p style={{ color: val >= 0 ? '#16a34a' : '#dc2626' }}>
        {val >= 0 ? '+' : ''}{val}%
      </p>
    </div>
  )
}

function SectorBarChartFallback({ sectors }: { sectors: SectorData[] }) {
  const data = [...sectors]
    .sort((a, b) => (b.chg_21d_pct ?? 0) - (a.chg_21d_pct ?? 0))
    .map(s => ({ name: s.sector_name, value: +(s.chg_21d_pct ?? 0).toFixed(2) }))

  return (
    <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-500 mb-4">21日パフォーマンス（%）</p>
      <ResponsiveContainer width="100%" height={500}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickFormatter={v => `${v}%`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={155}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <RechartsTooltip content={<BarTooltip />} cursor={{ fill: '#f9fafb' }} />
          <ReferenceLine x={0} stroke="#9ca3af" strokeWidth={1} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={22}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.value >= 0 ? '#16a34a' : '#dc2626'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── RS 推移ライングラフ ──────────────────────────────────────────────────────
const TOP_COLORS = ['#2563eb', '#7c3aed', '#16a34a']

function LineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const sorted = [...payload]
    .filter((p: any) => p.value != null)
    .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
  return (
    <div className="bg-white border border-[#e8eaed] rounded-lg px-3 py-2 shadow-sm text-xs max-w-[220px]">
      <p className="font-semibold text-gray-500 mb-1.5">{label}</p>
      {sorted.slice(0, 6).map((p: any) => (
        <div key={p.name} className="flex justify-between gap-3">
          <span className="text-gray-700 truncate">{p.name}</span>
          <span className="font-mono font-semibold" style={{ color: p.stroke }}>
            {(p.value as number).toFixed(0)}
          </span>
        </div>
      ))}
      {sorted.length > 6 && (
        <p className="text-gray-400 mt-1 text-[10px]">他 {sorted.length - 6} セクター</p>
      )}
    </div>
  )
}

export default function SectorBarChart({ rsHistory, sectors }: Props) {
  const uniqueDays = new Set(rsHistory.map(r => r.date)).size

  // RSデータが5日未満 → バーチャートにフォールバック
  if (uniqueDays < 5) {
    return <SectorBarChartFallback sectors={sectors} />
  }

  // ── データ変換: 縦長 → 横長（recharts LineChart 形式） ─────────────────
  const allDates     = [...new Set(rsHistory.map(r => r.date))].sort()
  const allSectors   = [...new Set(rsHistory.map(r => r.sector_name))]

  const chartData = allDates.map(date => {
    const entry: Record<string, string | number> = { date: date.slice(5) } // MM-DD
    rsHistory.filter(r => r.date === date).forEach(r => {
      entry[r.sector_name] = r.rs_1d
    })
    return entry
  })

  // ── 当日RS ランク付け ───────────────────────────────────────────────────
  const sortedByRS = [...sectors]
    .filter(s => s.rs_1d !== null)
    .sort((a, b) => (b.rs_1d ?? 0) - (a.rs_1d ?? 0))

  const topSectors    = sortedByRS.slice(0, 3).map(s => s.sector_name)
  const bottomSectors = new Set(sortedByRS.slice(-3).map(s => s.sector_name))

  function getLineProps(sector: string) {
    const topIdx = topSectors.indexOf(sector)
    if (topIdx >= 0)          return { stroke: TOP_COLORS[topIdx], strokeWidth: 2.5, opacity: 1 }
    if (bottomSectors.has(sector)) return { stroke: '#fca5a5',     strokeWidth: 1,   opacity: 0.7 }
    return                           { stroke: '#cbd5e1',           strokeWidth: 1,   opacity: 0.8 }
  }

  const lastIdx = chartData.length - 1

  return (
    <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-5">
      {/* タイトル + 上位3凡例 */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <p className="text-sm font-semibold text-gray-500 whitespace-nowrap">
          RS推移（過去{uniqueDays}日）
        </p>
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
          {topSectors.map((s, i) => (
            <span key={s} className="flex items-center gap-1 text-xs">
              <span
                className="inline-block w-5 h-0.5 rounded"
                style={{ backgroundColor: TOP_COLORS[i] }}
              />
              <span className="font-medium" style={{ color: TOP_COLORS[i] }}>
                {s}
              </span>
            </span>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <LineChart data={chartData} margin={{ top: 4, right: 110, bottom: 4, left: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <RechartsTooltip content={<LineTooltip />} />
          <ReferenceLine y={50} stroke="#9ca3af" strokeDasharray="4 2" strokeWidth={1} />

          {allSectors.map(sector => {
            const { stroke, strokeWidth, opacity } = getLineProps(sector)
            const isTop   = topSectors.includes(sector)
            const topIdx  = topSectors.indexOf(sector)
            const shortName = sector.length > 10 ? sector.slice(0, 10) + '…' : sector

            return (
              <Line
                key={sector}
                type="monotone"
                dataKey={sector}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={opacity}
                dot={false}
                activeDot={isTop ? { r: 4, fill: stroke } : false}
                isAnimationActive={false}
                label={isTop
                  ? ((props: any) => {
                      if (props.index !== lastIdx) return null
                      return (
                        <text
                          x={props.x + 5}
                          y={props.y + 4}
                          fontSize={10}
                          fill={TOP_COLORS[topIdx]}
                          fontWeight="bold"
                        >
                          {shortName}
                        </text>
                      )
                    }) as any
                  : false
                }
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
