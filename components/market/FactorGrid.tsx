import { MarketConditions } from '@/types/market'

type Props = { market: MarketConditions | null }

type FactorItem = {
  key: keyof MarketConditions
  label: string
}

type Group = {
  title: string
  factors: FactorItem[]
}

const GROUPS: Group[] = [
  {
    title: '指数パフォーマンス',
    factors: [
      { key: 'f01_idx_perf_1w',  label: '1週間' },
      { key: 'f02_idx_perf_1m',  label: '1ヶ月' },
      { key: 'f03_idx_perf_ytd', label: '年初来' },
      { key: 'f04_idx_perf_1y',  label: '1年' },
    ],
  },
  {
    title: '指数 MA・高値位置',
    factors: [
      { key: 'f05_idx_ma_position',   label: 'MA位置（2/3以上がSMA50上）' },
      { key: 'f06_idx_52wh', label: '52週高値圏（平均-5%以内）' },
    ],
  },
  {
    title: 'セクター',
    factors: [
      { key: 'f07_sec_perf_positive', label: 'セクターパフォーマンス（9/17以上プラス）' },
      { key: 'f08_sec_52wh', label: 'セクター52週高値圏' },
      { key: 'f09_sec_ma_position',   label: 'セクターMA位置' },
    ],
  },
  {
    title: 'ブレッド・VIX',
    factors: [
      { key: 'f10_breadth_adv_pct', label: '騰落率（> 50%）' },
      { key: 'f11_breadth_sma50',   label: 'SMA50超え比率（> 50%）' },
      { key: 'f12_vix_condition',   label: 'VIX（CBOE < 25）' },
    ],
  },
]

function FactorBadge({ value }: { value: boolean | null }) {
  if (value === null || value === undefined) {
    return (
      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
        N/A
      </span>
    )
  }
  if (value) {
    return (
      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--positive-bg)] text-[var(--positive)]">
        ✓
      </span>
    )
  }
  return (
    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--negative-bg)] text-[var(--negative)]">
      ✗
    </span>
  )
}

export default function FactorGrid({ market }: Props) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-500 mb-3">12 Factors</p>
      <div className="grid grid-cols-2 gap-x-4">
        {GROUPS.map((group) => (
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
