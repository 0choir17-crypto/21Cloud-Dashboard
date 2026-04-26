import { MarketConditions } from '@/types/market'

type Props = { market: MarketConditions | null }

// ── v4 8-Factor display (0-100 percentile rank per factor) ──────────────────
// Weights match mc_config/mc_v4_config.py.

type V4Factor = {
  key: keyof MarketConditions
  label: string
  weight: number  // %
}

const V4_FACTORS: V4Factor[] = [
  { key: 'mc_v4_m1', label: 'M1 Short MOM',     weight: 20 },
  { key: 'mc_v4_m2', label: 'M2 Mid Trend',     weight: 10 },
  { key: 'mc_v4_m3', label: 'M3 EMA Slope',     weight: 20 },
  { key: 'mc_v4_c1', label: 'C1 Long Confirm',  weight: 5  },
  { key: 'mc_v4_b1', label: 'B1 Breadth',       weight: 15 },
  { key: 'mc_v4_s1', label: 'S1 Flow',          weight: 15 },
  { key: 'mc_v4_s2', label: 'S2 IV',            weight: 10 },
  { key: 'mc_v4_s3', label: 'S3 Short/Basis',   weight: 5  },
]

// regime 境界 (80/60/40/20) と同じ色階調でスコアバーを塗る
function v4Color(score: number): string {
  if (score >= 80) return '#639922'  // strong_bull
  if (score >= 60) return '#97C459'  // bull
  if (score >= 40) return '#B4B2A9'  // neutral
  if (score >= 20) return '#F09595'  // bear
  return '#E24B4A'                    // strong_bear
}

function ScoreBar({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) {
    return (
      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
        N/A
      </span>
    )
  }
  const pct = Math.max(0, Math.min(100, score))
  const color = v4Color(pct)
  return (
    <div className="flex items-center gap-2 w-32">
      <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
        <div
          className="h-full rounded"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono text-gray-500 w-8 text-right">
        {Math.round(pct)}
      </span>
    </div>
  )
}

// ── v3 7-Factor display (0-3 score per factor, legacy fallback) ─────────────

type V3Factor = {
  key: keyof MarketConditions
  label: string
}

const V3_FACTORS: V3Factor[] = [
  { key: 'f1_idx_momentum',      label: 'Short MOM' },
  { key: 'f2_idx_trend',         label: 'Mid Trend' },
  { key: 'f3_idx_long_trend',    label: 'Long Trend' },
  { key: 'f4_ema21_slope',       label: 'EMA Slope' },
  { key: 'f5_sell_pressure',     label: 'Sell Pressure' },
  { key: 'f6_foreign_flow',      label: 'Foreign Flow' },
  { key: 'f7_idx_52wh_distance', label: '52WH Dist' },
]

function ScoreDots({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) {
    return <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">N/A</span>
  }
  const colors = ['#E24B4A', '#F09595', '#B4B2A9', '#639922']
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: i < score ? colors[score] : '#e5e7eb' }}
        />
      ))}
      <span className="text-xs font-mono text-gray-500 ml-1">{score}/3</span>
    </div>
  )
}

// ── v1 12-Factor fallback (boolean) ─────────────────────────────────────────

type V1Factor = {
  key: keyof MarketConditions
  label: string
}

type V1Group = {
  title: string
  factors: V1Factor[]
}

const V1_GROUPS: V1Group[] = [
  {
    title: 'Index Performance',
    factors: [
      { key: 'f01_idx_perf_1w',  label: '1W' },
      { key: 'f02_idx_perf_1m',  label: '1M' },
      { key: 'f03_idx_perf_ytd', label: 'YTD' },
      { key: 'f04_idx_perf_1y',  label: '1Y' },
    ],
  },
  {
    title: 'Index MA / 52W High',
    factors: [
      { key: 'f05_idx_ma_position', label: 'MA Position' },
      { key: 'f06_idx_52wh',        label: '52W High Zone' },
    ],
  },
  {
    title: 'Sector',
    factors: [
      { key: 'f07_sec_perf_positive', label: 'Sector Perf' },
      { key: 'f08_sec_52wh',          label: 'Sector 52WH Zone' },
      { key: 'f09_sec_ma_position',   label: 'Sector MA' },
    ],
  },
  {
    title: 'Breadth / VIX',
    factors: [
      { key: 'f10_breadth_adv_pct', label: 'Adv %' },
      { key: 'f11_breadth_sma50',   label: '% Above SMA50' },
      { key: 'f12_vix_condition',   label: 'VIX' },
    ],
  },
]

function FactorBadge({ value }: { value: boolean | null }) {
  if (value === null || value === undefined) {
    return <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">N/A</span>
  }
  if (value) {
    return <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--positive-bg)] text-[var(--positive)]">{'✓'}</span>
  }
  return <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--negative-bg)] text-[var(--negative)]">{'✗'}</span>
}

// ── Main component ──────────────────────────────────────────────────────────

export default function FactorGrid({ market }: Props) {
  // 優先順位: v4 (mc_v4_* が少なくとも 1 つあれば) > v3 > v1
  const hasV4 = (
    market?.mc_v4_m1 != null || market?.mc_v4_m2 != null ||
    market?.mc_v4_m3 != null || market?.mc_v4_c1 != null ||
    market?.mc_v4_b1 != null || market?.mc_v4_s1 != null
  )
  const hasV3 = market?.f1_idx_momentum != null

  if (hasV4) {
    const validWeight = market?.mc_v4_valid_weight_pct
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-500">8 Factors (v4)</p>
          {validWeight != null && (
            <span className="text-[11px] font-mono text-gray-400">
              valid_weight: {validWeight.toFixed(0)}%
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {V4_FACTORS.map(f => (
            <div key={f.key} className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-600">
                {f.label}
                <span className="ml-1 text-[10px] text-gray-400">{f.weight}%</span>
              </span>
              <ScoreBar score={market?.[f.key] as number | null} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (hasV3) {
    return (
      <div>
        <p className="text-sm font-semibold text-gray-500 mb-3">7 Factors (v3 — legacy)</p>
        <div className="space-y-1.5">
          {V3_FACTORS.map(f => (
            <div key={f.key} className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-600">{f.label}</span>
              <ScoreDots score={market?.[f.key] as number | null} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Final fallback: v1 12 Factors
  return (
    <div>
      <p className="text-sm font-semibold text-gray-500 mb-3">12 Factors (v1 — legacy)</p>
      <div className="grid grid-cols-2 gap-x-4">
        {V1_GROUPS.map((group) => (
          <div key={group.title} className="mb-3">
            <p className="text-xs text-gray-400 font-semibold uppercase mb-1">
              {group.title}
            </p>
            <div>
              {group.factors.map((factor) => (
                <div key={factor.key} className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600 leading-tight">
                    {factor.label}
                  </span>
                  <FactorBadge value={market?.[factor.key] as boolean | null} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
