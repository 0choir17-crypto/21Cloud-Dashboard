'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DailySignal } from '@/types/signals'
import { useDate } from '@/contexts/DateContext'
import SignalsHeader from '@/components/signals/SignalsHeader'
import SignalsFilter from '@/components/signals/SignalsFilter'

const COLUMNS = `
  date, code, company_name, screen_name, sector_name,
  price_chg_1d, price_chg_5d, rs_composite, rvol, adr_pct,
  dist_ema21_r, dist_10wma_r, dist_50sma_r,
  high_52w_pct, stop_pct, hit_count,
  cockpit_rs, mansfield_rs,
  short_interest_ratio, short_position_change,
  mc_met, mc_condition,
  mc_score, mc_score_v1, divergence_flag
`

export default function SignalsPage() {
  const { selectedDate, isLatest } = useDate()
  const [signals, setSignals] = useState<DailySignal[]>([])
  const [market, setMarket] = useState<{
    date: string
    market_regime: string
    breadth_regime: string
    scorecard_regime: string
    positive_count: number
    total_count: number
    mc_score?: number | null
    mc_score_v3?: number | null
    mc_score_v1?: number | null
    divergence_flag?: number | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!selectedDate) return
    setLoading(true)

    const { data } = await supabase
      .from('daily_signals')
      .select(COLUMNS)
      .eq('date', selectedDate)
      .order('hit_count', { ascending: false })

    const rawSignals = (data ?? []) as DailySignal[]

    // market_conditions: selectedDate に一致、なければ最新
    let marketQuery = supabase
      .from('market_conditions')
      .select('date, market_regime, breadth_regime, scorecard_regime, positive_count, total_count, mc_score, mc_score_v3, mc_score_v1, divergence_flag')

    if (isLatest) {
      marketQuery = marketQuery.order('date', { ascending: false }).limit(1)
    } else {
      marketQuery = marketQuery.eq('date', selectedDate).limit(1)
    }
    const { data: marketData } = await marketQuery.single()

    setSignals(rawSignals)
    setMarket(marketData)
    setLoading(false)
  }, [selectedDate, isLatest])

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
          {selectedDate && (
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isLatest ? 'Updated' : 'Snapshot'}: {selectedDate}
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
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* 過去日バナー */}
      {!isLatest && selectedDate && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-sm font-medium">
          {selectedDate} のスナップショットを表示中
        </div>
      )}

      {/* マーケット状況バッジ */}
      <SignalsHeader
        marketRegime={market?.market_regime}
        breadthRegime={market?.breadth_regime}
        scorecardRegime={market?.scorecard_regime}
        positiveCount={market?.positive_count}
        totalCount={market?.total_count}
        mcScore={market?.mc_score ?? market?.mc_score_v3}
        divergenceFlag={market?.divergence_flag}
      />

      {/* ローディング */}
      {loading && signals.length === 0 && (
        <div
          className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-lg font-medium">Loading...</p>
        </div>
      )}

      {/* フィルター + テーブル */}
      {!loading && signals.length === 0 ? (
        <div
          className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-lg font-medium mb-2">シグナルが見つかりません</p>
          <p className="text-sm">
            {isLatest
              ? 'Supabase の daily_signals テーブルにデータを挿入してください。'
              : `${selectedDate} のデータはありません。`}
          </p>
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
