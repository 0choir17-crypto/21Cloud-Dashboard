import { MarketConditions } from '@/types/market'

type Regime = MarketConditions['scorecard_regime']

const REGIME_CONFIG: Record<NonNullable<Regime>, { color: string; label: string }> = {
  strong_bull: { color: '#16a34a', label: 'Strong Bull' },
  bull:         { color: '#2563eb', label: 'Bull' },
  neutral:      { color: '#d97706', label: 'Neutral' },
  bear:         { color: '#dc2626', label: 'Bear' },
  strong_bear:  { color: '#991b1b', label: 'Strong Bear' },
}

const MARKET_REGIME_CONFIG: Record<string, { color: string; label: string }> = {
  bull:    { color: '#16a34a', label: 'Bull' },
  neutral: { color: '#d97706', label: 'Neutral' },
  bear:    { color: '#dc2626', label: 'Bear' },
}

const BREADTH_REGIME_CONFIG: Record<string, { color: string; label: string }> = {
  strong: { color: '#16a34a', label: 'Strong' },
  normal: { color: '#d97706', label: 'Normal' },
  weak:   { color: '#dc2626', label: 'Weak' },
}

type Props = {
  regime?: Regime
  positiveCount?: number
  totalCount?: number
  positivePct?: number
  marketRegime?: string
  breadthRegime?: string
}

export default function ScoreGauge({ regime, positiveCount, totalCount, positivePct, marketRegime, breadthRegime }: Props) {
  const config = regime ? REGIME_CONFIG[regime] : { color: '#9ca3af', label: '—' }
  const pct = positivePct ?? 0

  const trendCfg   = marketRegime  ? MARKET_REGIME_CONFIG[marketRegime]   : null
  const breadthCfg = breadthRegime ? BREADTH_REGIME_CONFIG[breadthRegime] : null

  const trendColor        = trendCfg?.color   ?? '#9ca3af'
  const marketRegimeLabel = trendCfg?.label   ?? '—'
  const breadthColor      = breadthCfg?.color ?? '#9ca3af'
  const breadthRegimeLabel = breadthCfg?.label ?? '—'

  // SVG semi-circle gauge
  // Viewbox: 200x110, center at (100, 100), radius 80
  const cx = 100
  const cy = 100
  const r = 80
  const strokeWidth = 14

  // Arc from 180° to 0° (left to right, half circle on top)
  // progress arc: fraction of the semicircle
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const startAngle = 180
  const endAngle = startAngle + (pct / 100) * 180

  const polarToXY = (angle: number) => ({
    x: cx + r * Math.cos(toRad(angle)),
    y: cy + r * Math.sin(toRad(angle)),
  })

  const start = polarToXY(startAngle)
  const end = polarToXY(endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0

  const bgStart = polarToXY(180)
  const bgEnd = polarToXY(360)

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 140" width="100%" height="160" style={{ display: 'block' }}>
        {/* Background arc */}
        <path
          d={`M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 1 1 ${bgEnd.x} ${bgEnd.y}`}
          fill="none"
          stroke="#e8eaed"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Progress arc */}
        {pct > 0 && (
          <path
            d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`}
            fill="none"
            stroke={config.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* Regime label */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          fill={config.color}
          fontFamily="var(--font-sans, sans-serif)"
        >
          {config.label}
        </text>

        {/* Count label */}
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fontSize="11"
          fill="#6b7280"
          fontFamily="var(--font-mono, monospace)"
        >
          {positiveCount ?? '—'} / {totalCount ?? '—'}
        </text>

        {/* Pct label */}
        <text
          x={cx}
          y={cy + 30}
          textAnchor="middle"
          fontSize="11"
          fill="#9ca3af"
          fontFamily="var(--font-mono, monospace)"
        >
          {pct.toFixed(1)}%
        </text>
      </svg>

      {/* Regime badge */}
      <span
        className="mt-2 px-3 py-1 rounded-full text-xs font-semibold"
        style={{
          backgroundColor: config.color + '1a',
          color: config.color,
          border: `1px solid ${config.color}40`,
        }}
      >
        {config.label}
      </span>

      {/* Trend / Breadth mini panel */}
      <div className="mt-4 w-full rounded-lg border border-[#e8eaed] overflow-hidden text-sm">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#e8eaed]">
          <span className="text-gray-500 font-medium">Trend</span>
          <span className="flex items-center gap-1.5 font-semibold" style={{ color: trendColor }}>
            ● {marketRegimeLabel}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-gray-500 font-medium">Breadth</span>
          <span className="flex items-center gap-1.5 font-semibold" style={{ color: breadthColor }}>
            ● {breadthRegimeLabel}
          </span>
        </div>
      </div>
    </div>
  )
}
