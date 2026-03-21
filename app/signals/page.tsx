'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DailySignal } from '@/types/signals'
import SignalsHeader from '@/components/signals/SignalsHeader'
import SignalsFilter from '@/components/signals/SignalsFilter'

// エントリースコアカラムを含むクエリ（カラム未追加時はフォールバック）
const COLUMNS_WITH_ENTRY = `
  date, code, company_name, screen_name, sector_name,
  price_chg_1d, price_chg_5d, rs_composite, rvol, adr_pct,
  dist_ema21_r, dist_10wma_r, dist_50sma_r,
  high_52w_pct, stop_pct, hit_count,
  entry_score, entry_stars, entry_badges,
  cockpit_rs, mansfield_rs,
  short_interest_ratio, short_position_change
`

const COLUMNS_BASE = `
  date, code, company_name, screen_name, sector_name,
  price_chg_1d, price_chg_5d, rs_composite, rvol, adr_pct,
  dist_ema21_r, dist_10wma_r, dist_50sma_r,
  high_52w_pct, stop_pct, hit_count,
  cockpit_rs, mansfield_rs,
  short_interest_ratio, short_position_change
`

export default function SignalsPage() {
  const [signals, setSignals] = useState<DailySignal[]>([])
  const [market, setMarket] = useState<{
    date: string
    market_regime: string
    breadth_regime: string
    scorecard_regime: string
    positive_count: number
    total_count: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)

    // entry_score カラムが存在しない場合はフォールバック
    let rawSignals: DailySignal[] = []

    const { data, error } = await supabase
      .from('daily_signals')
      .select(COLUMNS_WITH_ENTRY)
      .order('date', { ascending: false })
      .order('hit_count', { ascending: false })
      .limit(100)

    if (error && error.message?.includes('entry_score')) {
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

    const { data: marketData } = await supabase
      .from('market_conditions')
      .select('date, market_regime, breadth_regime, scorecard_regime, positive_count, total_count')
      .order('date', { ascending: false })
      .limit(1)
      .single()

    // 最新日付のシグナルのみに絞る
    const latestDate = rawSignals.length > 0
      ? rawSignals.reduce((max, s) => (s.date > max ? s.date : max), rawSignals[0].date)
      : null
    const filtered = latestDate
      ? rawSignals.filter(s => s.date === latestDate)
      : rawSignals

    setSignals(filtered)
    setMarket(marketData)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

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
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--border)] bg-white hover:bg-[var(--bg-card-hover)] transition-colors disabled:opacity-50"
            style={{ color: 'var(--accent)' }}
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? '更新中...' : 'Refresh'}
          </button>
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

      {/* ローディング */}
      {loading && signals.length === 0 && (
        <div
          className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-lg font-medium">読み込み中…</p>
        </div>
      )}

      {/* フィルター + テーブル */}
      {!loading && signals.length === 0 ? (
        <div
          className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-lg font-medium mb-2">シグナルが見つかりません</p>
          <p className="text-sm">Supabase の daily_signals テーブルにデータを挿入してください。</p>
        </div>
      ) : !loading && (
        <SignalsFilter
          signals={signals}
          marketRegime={market?.market_regime}
          scorecardRegime={market?.scorecard_regime}
        />
      )}

    </main>
  )
}
