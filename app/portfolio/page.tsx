'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Trade } from '@/types/trades'
import { RiskSettings } from '@/types/portfolio'
import PositionsTab from '@/components/portfolio/PositionsTab'
import PlansTab from '@/components/portfolio/PlansTab'
import HistoryTab from '@/components/portfolio/HistoryTab'
import RiskTab from '@/components/portfolio/RiskTab'

type Tab = 'positions' | 'plans' | 'history' | 'risk'

const TABS: { key: Tab; label: string }[] = [
  { key: 'positions', label: 'Positions' },
  { key: 'plans',     label: 'Plans' },
  { key: 'history',   label: 'History' },
  { key: 'risk',      label: 'Risk' },
]

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<Tab>('positions')
  const [trades, setTrades] = useState<Trade[]>([])
  const [riskSettings, setRiskSettings] = useState<RiskSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [tradesRes, riskRes] = await Promise.all([
      supabase
        .from('trades')
        .select('*')
        .order('entry_date', { ascending: false }),
      supabase
        .from('risk_settings')
        .select('*')
        .limit(1)
        .maybeSingle(),
    ])

    setTrades((tradesRes.data ?? []) as Trade[])
    setRiskSettings((riskRes.data ?? null) as RiskSettings | null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openPositions = trades.filter(t => t.status === 'open')
  const plans = trades.filter(t => t.status === 'plan')
  const history = trades.filter(t => t.status === 'closed')

  return (
    <main className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Portfolio</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            21 Cloud — ポジション管理・リスク管理
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="hidden sm:block">
            Positions: <strong>{openPositions.length}</strong> Plans: <strong>{plans.length}</strong>
          </span>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="overflow-x-auto whitespace-nowrap mb-6 -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="inline-flex gap-1 bg-white rounded-xl border border-[#e8eaed] shadow-sm p-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 min-w-fit text-sm font-semibold rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.key === 'positions' && openPositions.length > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'positions' ? 'bg-white/30' : 'bg-blue-100 text-blue-700'}`}>
                  {openPositions.length}
                </span>
              )}
              {tab.key === 'plans' && plans.length > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'plans' ? 'bg-white/30' : 'bg-blue-100 text-blue-700'}`}>
                  {plans.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
      ) : (
        <>
          {activeTab === 'positions' && (
            <PositionsTab positions={openPositions} onRefresh={load} />
          )}
          {activeTab === 'plans' && (
            <PlansTab plans={plans} riskSettings={riskSettings} onRefresh={load} />
          )}
          {activeTab === 'history' && (
            <HistoryTab history={history} />
          )}
          {activeTab === 'risk' && (
            <RiskTab riskSettings={riskSettings} history={history} onRefresh={load} />
          )}
        </>
      )}
    </main>
  )
}
