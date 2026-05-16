'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchLatestSectorSelection } from '@/lib/sectorSelectionFetch'
import { SectorSelectionRow } from '@/types/sectorSelection'
import SectorSelectionTable from '@/components/sectors33/SectorSelectionTable'

export default function SectorSelectionPage() {
  const [rows, setRows] = useState<SectorSelectionRow[]>([])
  const [latestDate, setLatestDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { latestDate, rows } = await fetchLatestSectorSelection()
    setRows(rows)
    setLatestDate(latestDate)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>

      <header className="flex justify-between items-center mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans, sans-serif)' }}
          >
            Sector Selection
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            21 Cloud — TOPIX-33 業種別 composite_score (今どこを買うか)
          </p>
        </div>
        <div className="flex items-center gap-4">
          {latestDate && (
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Updated: {latestDate}
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

      {loading && rows.length === 0 && (
        <div
          className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-lg font-medium">Loading...</p>
        </div>
      )}

      {!loading && rows.length === 0 ? (
        <div
          className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-lg font-medium mb-2">データが見つかりません</p>
          <p className="text-sm">Supabase の sector_selection_s33 テーブルにデータを挿入してください。</p>
        </div>
      ) : !loading && (
        <SectorSelectionTable rows={rows} />
      )}
    </main>
  )
}
