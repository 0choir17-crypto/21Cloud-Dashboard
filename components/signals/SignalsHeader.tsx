const REGIME_COLOR: Record<string, string> = {
  strong_bull: '#16a34a',
  bull:        '#16a34a',
  strong:      '#16a34a',
  neutral:     '#d97706',
  normal:      '#d97706',
  bear:        '#dc2626',
  strong_bear: '#dc2626',
  weak:        '#dc2626',
}

const REGIME_LABEL: Record<string, string> = {
  strong_bull: 'Strong Bull',
  bull:        'Bull',
  strong:      'Strong',
  neutral:     'Neutral',
  normal:      'Normal',
  bear:        'Bear',
  strong_bear: 'Strong Bear',
  weak:        'Weak',
}

type BadgeProps = {
  label: string
  value?: string | null
  suffix?: string
}

function RegimeBadge({ label, value, suffix }: BadgeProps) {
  const color   = value ? (REGIME_COLOR[value] ?? '#9ca3af') : '#9ca3af'
  const display = value ? (REGIME_LABEL[value] ?? value)     : '\u2014'

  return (
    <span
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border"
      style={{
        backgroundColor: color + '1a',
        color,
        borderColor: color + '40',
      }}
    >
      <span className="text-gray-500 font-normal text-xs">{label}</span>
      {'\u25CF'} {display}{suffix}
    </span>
  )
}

type Props = {
  marketRegime?:    string | null
  breadthRegime?:   string | null
  scorecardRegime?: string | null
  positiveCount?:   number | null
  totalCount?:      number | null
  mcScore?:         number | null
  divergenceFlag?:  number | null
}

export default function SignalsHeader({
  marketRegime,
  breadthRegime,
  scorecardRegime,
  positiveCount,
  totalCount,
  mcScore,
  divergenceFlag,
}: Props) {
  // v3: show mc_score/21, fallback to v1 positive_count/total_count
  const isV3 = mcScore != null
  const scorecardSuffix = isV3
    ? ` ${mcScore}/21`
    : (positiveCount != null && totalCount != null
        ? ` ${positiveCount}/${totalCount}`
        : undefined)

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <RegimeBadge label="Trend"     value={marketRegime} />
      <RegimeBadge label="Scorecard" value={scorecardRegime} suffix={scorecardSuffix} />
      <RegimeBadge label="Breadth"   value={breadthRegime} />
      {divergenceFlag === 1 && (
        <span
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border"
          style={{ backgroundColor: '#FAEEDA', color: '#633806', borderColor: '#F0D9A8' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L15 14H1L8 1Z" fill="#EF9F27" />
            <text x="8" y="12" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">!</text>
          </svg>
          Divergence
        </span>
      )}
    </div>
  )
}
