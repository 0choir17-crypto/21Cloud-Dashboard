'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Trade } from '@/types/trades'
import TradeSummary from '@/components/journal/TradeSummary'
import McScoreChart from '@/components/journal/McScoreChart'
import TradeList from '@/components/journal/TradeList'
import TradeModal from '@/components/journal/TradeModal'
import CloseTradeModal from '@/components/journal/CloseTradeModal'

export default function JournalPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewTrade, setShowNewTrade] = useState(false)
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null)

  const fetchTrades = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('trades')
      .select('*')
      .order('entry_date', { ascending: false })
      .limit(500)

    setTrades((data ?? []) as Trade[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTrades() }, [fetchTrades])

  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ヘッダー */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans, sans-serif)' }}
          >
            Trade Journal
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            21 Cloud — トレード記録・分析
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTrades}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--border)] bg-white hover:bg-[var(--bg-card-hover)] transition-colors disabled:opacity-50"
            style={{ color: 'var(--accent)' }}
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? '更新中...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowNewTrade(true)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            + 新規トレード
          </button>
        </div>
      </header>

      {/* ローディング */}
      {loading && trades.length === 0 && (
        <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center" style={{ color: 'var(--text-muted)' }}>
          <p className="text-lg font-medium">読み込み中...</p>
        </div>
      )}

      {/* コンテンツ */}
      {!loading && (
        <>
          {/* サマリーカード */}
          <TradeSummary trades={trades} />

          {/* MC Score帯別WRチャート + Regime別テーブル */}
          <McScoreChart trades={trades} />

          {/* トレード一覧 */}
          <TradeList
            trades={trades}
            onClose={(trade) => setClosingTrade(trade)}
          />
        </>
      )}

      {/* 新規トレードモーダル */}
      <TradeModal
        open={showNewTrade}
        onClose={() => setShowNewTrade(false)}
        onSaved={fetchTrades}
      />

      {/* トレードクローズモーダル */}
      <CloseTradeModal
        open={closingTrade !== null}
        onClose={() => setClosingTrade(null)}
        onSaved={fetchTrades}
        trade={closingTrade}
      />
    </main>
  )
}
