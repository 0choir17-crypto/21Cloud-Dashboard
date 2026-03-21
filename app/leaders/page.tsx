'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DailyLeader } from '@/types/leaders'
import LeadersTable from '@/components/leaders/LeadersTable'

const COLUMNS = `
  date, code, name, sector,
  rs_composite, daily_pct, adr_pct,
  weekly_pct, monthly_pct,
  dist_ema21_r, dist_wma10_r, dist_sma50_r
`

export default function LeadersPage() {
  const [leaders, setLeaders] = useState<DailyLeader[]>([])
  const [loading, setLoading] = useState(true)
  const [latestDate, setLatestDate] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)

    // 最新日のリーダーを取得
    const { data, error } = await supabase
      .from('daily_leaders')
      .select(COLUMNS)
      .order('date', { ascending: false })
      .order('rs_composite', { ascending: false })
      .limit(500)

    if (error) {
      console.error('daily_leaders fetch error:', error)
      setLeaders([])
      setLoading(false)
      return
    }

    const raw = (data ?? []) as DailyLeader[]

    // 最新日に絞る
    const maxDate = raw.length > 0
      ? raw.reduce((max, r) => (r.date > max ? r.date : max), raw[0].date)
      : null
    const filtered = maxDate ? raw.filter(r => r.date === maxDate) : raw

    setLatestDate(maxDate)
    setLeaders(filtered)
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
            Leaders
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            RS上位 × トレンド確認済みのリーダー銘柄
          </p>
        </div>
        <div className="flex items-center gap-4">
          {latestDate && (
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {latestDate}
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
          <p className="text-sm">daily_leaders テーブルにデータが挿入されるまでお待ちください。</p>
        </div>
      ) : !loading && (
        <LeadersTable leaders={leaders} />
      )}

    </main>
  )
}
