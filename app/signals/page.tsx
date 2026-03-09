import { supabase } from '@/lib/supabase'
import { DailySignal } from '@/types/signals'
import SignalsHeader from '@/components/signals/SignalsHeader'
import SignalsFilter from '@/components/signals/SignalsFilter'
import RefreshButton from '@/components/market/RefreshButton'

export const revalidate = 3600

// エントリースコアカラムを含むクエリ（カラム未追加時はフォールバック）
const COLUMNS_WITH_ENTRY = `
  date, code, company_name, screen_name, sector_name,
  price_chg_1d, price_chg_5d, rs_composite, rvol, adr_pct,
  dist_ema21_r, dist_10wma_r, dist_50sma_r,
  high_52w_pct, stop_pct, hit_count,
  entry_score, entry_stars, entry_badges
`

const COLUMNS_BASE = `
  date, code, company_name, screen_name, sector_name,
  price_chg_1d, price_chg_5d, rs_composite, rvol, adr_pct,
  dist_ema21_r, dist_10wma_r, dist_50sma_r,
  high_52w_pct, stop_pct, hit_count
`

export default async function SignalsPage() {
  // entry_score カラムが存在しない場合はフォールバック
  let rawSignals: DailySignal[] | null = null

  const { data, error } = await supabase
    .from('daily_signals')
    .select(COLUMNS_WITH_ENTRY)
    .order('date', { ascending: false })
    .order('hit_count', { ascending: false })
    .limit(100)

  if (error && error.message?.includes('entry_score')) {
    // カラム未追加 → エントリースコアなしで再取得
    const { data: fallback } = await supabase
      .from('daily_signals')
      .select(COLUMNS_BASE)
      .order('date', { ascending: false })
      .order('hit_count', { ascending: false })
      .limit(100)
    rawSignals = (fallback ?? []) as DailySignal[]
  } else {
    rawSignals = (data ?? []) as DailySignal[]
  }

  const { data: market } = await supabase
    .from('market_conditions')
    .select('date, market_regime, breadth_regime, scorecard_regime, positive_count, total_count')
    .order('date', { ascending: false })
    .limit(1)
    .single()

  // 最新日付のシグナルのみに絞る
  const allSignals = rawSignals ?? []
  const latestDate = allSignals.length > 0
    ? allSignals.reduce((max, s) => (s.date > max ? s.date : max), allSignals[0].date)
    : null
  const signals = latestDate
    ? allSignals.filter(s => s.date === latestDate)
    : allSignals

  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>

      {/* ヘッダー */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans, sans-serif)' }}
          >
            Daily Signals
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            21 Cloud — 日本株スクリーニング結果
          </p>
        </div>
        <div className="flex items-center gap-4">
          {market?.date && (
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Updated: {market.date}
            </span>
          )}
          <RefreshButton />
        </div>
      </header>

      {/* マーケット状況バッジ */}
      <SignalsHeader
        marketRegime={market?.market_regime}
        breadthRegime={market?.breadth_regime}
        scorecardRegime={market?.scorecard_regime}
        positiveCount={market?.positive_count}
        totalCount={market?.total_count}
      />

      {/* フィルター + テーブル */}
      {signals.length === 0 ? (
        <div
          className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-lg font-medium mb-2">シグナルが見つかりません</p>
          <p className="text-sm">Supabase の daily_signals テーブルにデータを挿入してください。</p>
        </div>
      ) : (
        <SignalsFilter
          signals={signals}
          marketRegime={market?.market_regime}
          scorecardRegime={market?.scorecard_regime}
        />
      )}

    </main>
  )
}
