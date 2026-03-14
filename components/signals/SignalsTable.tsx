'use client'

import { useState } from 'react'
import { DailySignal } from '@/types/signals'
import { SCREEN_NAME_MAP, getRecommendedScreens, isRecommended } from '@/lib/screenNames'
import Tooltip from '@/components/shared/Tooltip'
import WatchlistModal from '@/components/watchlist/WatchlistModal'
import { WatchlistItem } from '@/types/portfolio'

// ── Badge display name mapping ────────────────────────────────────────────────
const BADGE_DISPLAY_NAMES: Record<string, string> = {
  'SMA50 1R以内':      '50MA≤1R',
  'SMA50 2R以内':      '50MA≤2R',
  'EMA21 0.5R以内':    '21E≤0.5R',
  'EMA21 1R以内':      '21E≤1R',
  'SMA10 0.5R以内':    '10W≤0.5R',
  'SMA10 1R以内':      '10W≤1R',
  '出来高収縮':         'VolC',
  '出来高収縮 0.8以下': 'VolC≤0.8',
  'RS ≥ 70':          'RS≥70',
  'RS>=60':            'RS≥60',
  'RS>=50':            'RS≥50',
  'ADR ≤ 2%':         'ADR≤2',
  'ADR ≤ 3%':         'ADR≤3',
  'ADR ≤ 4%':         'ADR≤4',
  'ADR ≤ 5%':         'ADR≤5',
  'ADR<=2':            'ADR≤2',
  'ADR<=5':            'ADR≤5',
  '出来高収縮<=0.8':    'VolC≤0.8',
}

// ── Column tooltips ───────────────────────────────────────────────────────────
const COLUMN_TOOLTIPS: Record<string, string> = {
  entry_score:  'バックテスト検証済みエントリー適性スコア（★1〜3）',
  price_chg_1d: '昨日比変化率（%）',
  price_chg_5d: '直近5日間の変化率（%）',
  rs_composite: '相対強度スコア（複合指標）',
  rvol:         '相対出来高: 当日出来高 ÷ 20日平均出来高',
  adr_pct:      '平均日次値幅（%）: 直近20日の高低差の平均',
  dist_ema21_r: '21日EMAからの乖離率（%）— ライジングEMAを基準',
  dist_10wma_r: '10週WMAからの乖離率（%）— ライジングWMAを基準',
  dist_50sma_r: '50日SMAからの乖離率（%）— ライジングSMAを基準',
  high_52w_pct: '52週高値からの下落率（%）— 0に近いほど高値圏',
  stop_pct:     '推定ストップロス幅（%）— ATRベース',
  hit_count:    'ヒットしたスクリーン数（バッジにホバーで詳細表示）',
}

// ── Types ────────────────────────────────────────────────────────────────────
type SortKey = keyof DailySignal
type SortDir = 'asc' | 'desc'

type Props = {
  signals: DailySignal[]
  marketRegime?: string | null
  scorecardRegime?: string | null
}

// ── EntryScoreBadge ─────────────────────────────────────────────────────────
function EntryScoreBadge({ score, stars, badgesJson }: {
  score: number
  stars: string
  badgesJson: string
}) {
  const badges: string[] = (() => {
    try { return JSON.parse(badgesJson) } catch { return [] }
  })()

  const colorMap: Record<number, string> = {
    3: 'bg-emerald-500 text-white',
    2: 'bg-yellow-400 text-gray-900',
    1: 'bg-gray-200 text-gray-500',
  }

  return (
    <div className="flex flex-col gap-1">
      {/* ★バッジ */}
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-bold ${colorMap[score] ?? colorMap[1]}`}>
        {stars}
      </span>
      {/* 満たした条件ラベル */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {badges.map((b, i) => (
            <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 whitespace-nowrap">
              {BADGE_DISPLAY_NAMES[b] ?? b}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Helper cells ─────────────────────────────────────────────────────────────
function fmt(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined) return '—'
  return val.toFixed(decimals)
}

function ChangePill({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-gray-400">—</span>
  const pos = value >= 0
  return (
    <span
      className="font-mono text-xs font-semibold"
      style={{ color: pos ? 'var(--positive)' : 'var(--negative)' }}
    >
      {pos ? '+' : ''}{value.toFixed(2)}%
    </span>
  )
}

function RvolCell({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-gray-400">—</span>
  const high = value >= 2.0
  return (
    <span
      className={`font-mono text-xs ${high ? 'font-bold' : ''}`}
      style={{ color: high ? 'var(--positive)' : 'inherit' }}
    >
      {value.toFixed(2)}
    </span>
  )
}

function HitTooltip({
  value,
  screenName,
  recommended,
}: {
  value: number | null | undefined
  screenName: string
  recommended: string[]
}) {
  const count = value ?? 0
  const isHigh = count >= 3
  return (
    <div className="relative group inline-block">
      {/* バッジ */}
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold cursor-default ${
          isHigh
            ? 'bg-amber-100 text-amber-700 border border-amber-400'
            : 'bg-gray-100 text-gray-600'
        }`}
      >
        {value ?? '—'}
      </span>
      {/* ツールチップ */}
      <div className="absolute z-10 right-0 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
        <p className="font-semibold mb-1">ヒットスクリーン</p>
        {screenName.split('|').map(name => {
          const short = SCREEN_NAME_MAP[name.trim()] ?? name.trim()
          const isRec = recommended.includes(short)
          return (
            <p key={name} className={isRec ? 'text-amber-400' : 'text-gray-300'}>
              {isRec ? '★ ' : '\u3000'}{short}
            </p>
          )
        })}
        {/* 矢印 */}
        <div className="absolute right-3 top-full border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  )
}

// ── Sortable header ──────────────────────────────────────────────────────────
function SortTh({
  label,
  tooltip,
  sortKey: key,
  currentKey,
  currentDir,
  onSort,
  align = 'right',
}: {
  label: string
  tooltip?: string
  sortKey: SortKey
  currentKey: SortKey
  currentDir: SortDir
  onSort: (k: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = currentKey === key
  const indicator = active ? (currentDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'
  const labelEl = tooltip ? <Tooltip content={tooltip}>{label}</Tooltip> : <>{label}</>
  return (
    <th
      onClick={() => onSort(key)}
      className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 transition-colors ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${active ? 'text-[var(--accent)]' : 'text-gray-500'}`}
    >
      {labelEl}<span className="text-[10px] opacity-50">{indicator}</span>
    </th>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SignalsTable({ signals, marketRegime, scorecardRegime }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('entry_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [watchTarget, setWatchTarget] = useState<Partial<WatchlistItem> | null>(null)

  const recommended = getRecommendedScreens(marketRegime, scorecardRegime)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...signals].sort((a, b) => {
    // 文字列ソート（セクター）
    if (sortKey === 'sector_name') {
      const av = a.sector_name ?? ''
      const bv = b.sector_name ?? ''
      return sortDir === 'asc'
        ? av.localeCompare(bv, 'ja')
        : bv.localeCompare(av, 'ja')
    }
    // 数値ソート
    const av = (a[sortKey] as number | null) ?? -Infinity
    const bv = (b[sortKey] as number | null) ?? -Infinity
    if (av === bv) return 0
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center text-gray-400">
        <p className="text-sm">シグナルが見つかりません</p>
      </div>
    )
  }

  const sp = { currentKey: sortKey, currentDir: sortDir, onSort: handleSort }

  return (
    <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-[#e8eaed]">
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">銘柄</th>
            <SortTh label="エントリー" sortKey="entry_score" tooltip={COLUMN_TOOLTIPS.entry_score} {...sp} align="left" />
            <SortTh label="セクター"  sortKey="sector_name"  {...sp} align="left" />
            <SortTh label="1D%"       sortKey="price_chg_1d" tooltip={COLUMN_TOOLTIPS.price_chg_1d} {...sp} />
            <SortTh label="5D%"       sortKey="price_chg_5d" tooltip={COLUMN_TOOLTIPS.price_chg_5d} {...sp} />
            <SortTh label="RS"        sortKey="rs_composite" tooltip={COLUMN_TOOLTIPS.rs_composite} {...sp} />
            <SortTh label="RVOL"      sortKey="rvol"         tooltip={COLUMN_TOOLTIPS.rvol}         {...sp} />
            <SortTh label="ADR%"      sortKey="adr_pct"      tooltip={COLUMN_TOOLTIPS.adr_pct}      {...sp} />
            <SortTh label="EMA21(R)"  sortKey="dist_ema21_r" tooltip={COLUMN_TOOLTIPS.dist_ema21_r} {...sp} />
            <SortTh label="10WMA(R)"  sortKey="dist_10wma_r" tooltip={COLUMN_TOOLTIPS.dist_10wma_r} {...sp} />
            <SortTh label="50SMA(R)"  sortKey="dist_50sma_r" tooltip={COLUMN_TOOLTIPS.dist_50sma_r} {...sp} />
            <SortTh label="52W高値%"  sortKey="high_52w_pct" tooltip={COLUMN_TOOLTIPS.high_52w_pct} {...sp} />
            <SortTh label="Stop%"     sortKey="stop_pct"     tooltip={COLUMN_TOOLTIPS.stop_pct}     {...sp} />
            <SortTh label="HIT"       sortKey="hit_count"    tooltip={COLUMN_TOOLTIPS.hit_count}    {...sp} />
            <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">WL</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((sig, i) => {
            const rec = isRecommended(sig.screen_name, recommended)
            return (
              <tr
                key={`${sig.code}-${sig.screen_name}-${i}`}
                className={`border-b border-[#f0f2f4] hover:bg-gray-50 transition-colors ${
                  rec ? 'border-l-2 border-l-amber-400' : ''
                } ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}
              >
                {/* 銘柄 + Watch button */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <a
                    href={`https://jp.tradingview.com/chart/?symbol=TSE:${sig.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono font-bold text-blue-600 hover:underline text-sm leading-tight block"
                  >
                    {sig.code}
                  </a>
                  <a
                    href={`https://shikiho.toyokeizai.net/stocks/${sig.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-gray-400 hover:underline mt-0.5 max-w-[130px] truncate"
                  >
                    {sig.company_name ?? '—'}
                  </a>
                </td>
                {/* エントリースコア */}
                <td className="px-3 py-2.5">
                  <EntryScoreBadge
                    score={sig.entry_score ?? 1}
                    stars={sig.entry_stars ?? '★'}
                    badgesJson={sig.entry_badges ?? '[]'}
                  />
                </td>
                {/* セクター */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="text-xs text-gray-500 block max-w-[120px] truncate">{sig.sector_name ?? '—'}</span>
                </td>
                {/* 1D% */}
                <td className="px-3 py-2.5 text-right whitespace-nowrap"><ChangePill value={sig.price_chg_1d} /></td>
                {/* 5D% */}
                <td className="px-3 py-2.5 text-right whitespace-nowrap"><ChangePill value={sig.price_chg_5d} /></td>
                {/* RS */}
                <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">{fmt(sig.rs_composite, 1)}</td>
                {/* RVOL */}
                <td className="px-3 py-2.5 text-right whitespace-nowrap"><RvolCell value={sig.rvol} /></td>
                {/* ADR% */}
                <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">{fmt(sig.adr_pct)}</td>
                {/* EMA21(R) */}
                <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">{fmt(sig.dist_ema21_r)}</td>
                {/* 10WMA(R) */}
                <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">{fmt(sig.dist_10wma_r)}</td>
                {/* 50SMA(R) */}
                <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">{fmt(sig.dist_50sma_r)}</td>
                {/* 52W高値% */}
                <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">{fmt(sig.high_52w_pct)}</td>
                {/* Stop% */}
                <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">{fmt(sig.stop_pct)}</td>
                {/* HIT + tooltip */}
                <td className="px-3 py-3 text-right">
                  <HitTooltip
                    value={sig.hit_count}
                    screenName={sig.screen_name}
                    recommended={recommended}
                  />
                </td>
                {/* WL (Watch) */}
                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                  <button
                    onClick={() => setWatchTarget({
                      ticker: sig.code,
                      company_name: sig.company_name ?? undefined,
                      screen_tag: sig.screen_name ?? undefined,
                    })}
                    className="text-[10px] font-medium text-indigo-500 hover:text-indigo-700 hover:underline leading-none"
                  >
                    + Watch
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* WatchlistModal: fixed-position overlay, safe to mount inside any container */}
      <WatchlistModal
        open={watchTarget !== null}
        onClose={() => setWatchTarget(null)}
        onSaved={() => setWatchTarget(null)}
        initial={watchTarget ?? undefined}
      />
    </div>
  )
}
