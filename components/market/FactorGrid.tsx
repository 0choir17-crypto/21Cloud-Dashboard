import { MarketConditions } from '@/types/market'

type Props = { market: MarketConditions | null }

// ── v3 7-Factor display (0-3 score per factor) ──────────────────────────────

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
    return <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--positive-bg)] text-[var(--positive)]">{'\u2713'}</span>
  }
  return <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--negative-bg)] text-[var(--negative)]">{'\u2717'}</span>
}

export default function FactorGrid({ market }: Props) {
  // Check if v3 factors are available
  const hasV3 = market?.f1_idx_momentum != null

  if (hasV3) {
    return (
      <div>
        <p className="text-sm font-semibold text-gray-500 mb-3">7 Factors (v3)</p>
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

  // Fallback: v1 12 Factors
  return (
    <div>
      <p className="text-sm font-semibold text-gray-500 mb-3">12 Factors</p>
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
