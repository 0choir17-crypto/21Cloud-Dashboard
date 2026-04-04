'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DailyLeader } from '@/types/leaders'
import { useDate } from '@/contexts/DateContext'
import LeadersTable from '@/components/leaders/LeadersTable'

const COLUMNS = `
  date, code, name, sector,
  rs_composite, daily_pct, adr_pct,
  weekly_pct, monthly_pct,
  dist_ema21_r, dist_wma10_r, dist_sma50_r
`

export default function LeadersPage() {
  const { selectedDate, isLatest } = useDate()
  const [leaders, setLeaders] = useState<DailyLeader[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!selectedDate) return
    setLoading(true)

    const { data, error } = await supabase
      .from('daily_leaders')
      .select(COLUMNS)
      .eq('date', selectedDate)
      .order('rs_composite', { ascending: false })

    if (error) {
      console.error('daily_leaders fetch error:', error)
      setLeaders([])
      setLoading(false)
      return
    }

    setLeaders((data ?? []) as DailyLeader[])
    setLoading(false)
  }, [selectedDate])

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
            Leaders
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            RS上位 × トレンド確認済みのリーダー銘柄
          </p>
        </div>
        <div className="flex items-center gap-4">
          {selectedDate && (
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isLatest ? '' : 'Snapshot: '}{selectedDate}
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

      {/* 過去日バナー */}
      {!isLatest && selectedDate && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-sm font-medium">
          {selectedDate} のスナップショットを表示中
        </div>
      )}

      {/* ローディング */}
      {loading && leaders.length === 0 && (
        <div
          className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-lg font-medium">読み込み中…</p>
        </div>
      )}

      {/* データなし */}
      {!loading && leaders.length === 0 ? (
        <div
          className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-lg font-medium mb-2">データがありません</p>
          <p className="text-sm">
            {isLatest
              ? 'daily_leaders テーブルにデータが挿入されるまでお待ちください。'
              : `${selectedDate} のデータはありません。`}
          </p>
        </div>
      ) : !loading && (
        <LeadersTable leaders={leaders} />
      )}

    </main>
  )
}
