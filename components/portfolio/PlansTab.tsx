'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Trade } from '@/types/trades'
import { RiskSettings } from '@/types/portfolio'
import PositionModal from './PositionModal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

type Props = {
  plans: Trade[]
  riskSettings: RiskSettings | null
  onRefresh: () => void
}

function fmt(v: number | null | undefined, decimals = 0): string {
  if (v == null) return '—'
  return v.toLocaleString('ja-JP', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function JudgmentBadge({ shares }: { shares: number }) {
  if (shares === 0) return (
    <span className="inline-block px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-semibold">0 sh</span>
  )
  return (
    <span className="inline-block px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-semibold">OK</span>
  )
}

export default function PlansTab({ plans, riskSettings, onRefresh }: Props) {
  const [editPlan, setEditPlan] = useState<Trade | null>(null)
  const [deletePlan, setDeletePlan] = useState<Trade | null>(null)

  const accountCapital = riskSettings?.account_capital ?? 0
  const basePct = riskSettings?.risk_pct ?? 0
  const consecLosses = riskSettings?.consec_losses ?? 0
  const appliedRiskPct = consecLosses >= 3 ? basePct / 2 : basePct
  const isHalfRisk = consecLosses >= 3

  async function handleDelete() {
    if (!deletePlan) return
    await supabase.from('trades').delete().eq('id', deletePlan.id)
    setDeletePlan(null)
    onRefresh()
  }

  // Convert plan to open position (promote)
  async function handlePromote(plan: Trade) {
    await supabase
      .from('positions')
      .update({ status: 'open', updated_at: new Date().toISOString() })
      .eq('id', plan.id)
    onRefresh()
  }

  return (
    <div>
      {/* Warning banner for half-risk */}
      {isHalfRisk && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
          <span>⚠️</span>
          <span>
            Losing streak <strong>{consecLosses}</strong> → Applied risk:
            <strong className="ml-1">{appliedRiskPct.toFixed(2)}% (halved)</strong>
          </span>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-500">{plans.length} plans</span>
        <button
          onClick={() => setEditPlan({ status: 'plan' } as Trade)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors min-h-[36px]"
        >
          + Add Plan
        </button>
      </div>

      {/* Desktop table */}
      <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm overflow-x-auto hidden sm:block">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-t border-[#e8eaed]">
              {['Ticker','Name','Sector','Entry','Stop','Stop(21L)','StopDist%','Risk ¥','Shares','Invest ¥','Invest %','R Target','Judge','Actions'].map(h => (
                <th key={h} className={`px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${h === 'Ticker' || h === 'Name' || h === 'Sector' || h === 'Actions' ? 'text-left' : 'text-right'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.map((plan, i) => {
              const ep = plan.entry_price
              const sp = plan.stop_price
              const stopDistPct = sp != null && ep > 0 ? (ep - sp) / ep * 100 : null
              const riskYen = accountCapital > 0 && appliedRiskPct > 0 ? accountCapital * appliedRiskPct / 100 : null
              const rawShares = riskYen != null && sp != null && ep !== sp ? riskYen / (ep - sp) : null
              const sharesPlan = rawShares != null ? Math.max(0, Math.floor(rawShares / 100) * 100) : 0
              const investYen = sharesPlan > 0 ? sharesPlan * ep : null
              const investPct = investYen != null && accountCapital > 0 ? investYen / accountCapital * 100 : null

              return (
                <tr key={plan.id} className={`border-b border-[#f0f2f4] hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <a href={`https://www.tradingview.com/chart/?symbol=TSE:${plan.ticker}`} target="_blank" rel="noreferrer"
                       className="font-mono font-bold text-blue-600 hover:underline text-xs">{plan.ticker}</a>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-700">
                    {plan.company_name ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">{plan.sector ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">¥{fmt(ep)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">{sp != null ? `¥${fmt(sp)}` : '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">{plan.stop_21l != null ? `¥${fmt(plan.stop_21l)}` : '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">
                    {stopDistPct != null ? <span className="text-orange-600">{stopDistPct.toFixed(2)}%</span> : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">
                    {riskYen != null ? `¥${fmt(riskYen)}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs font-bold whitespace-nowrap">
                    {sharesPlan > 0 ? `${sharesPlan.toLocaleString()} sh` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">
                    {investYen != null ? `¥${fmt(investYen)}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">
                    {investPct != null ? `${investPct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">
                    {plan.target_r != null ? `${plan.target_r}R` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <JudgmentBadge shares={sharesPlan} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handlePromote(plan)}
                        className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100">→ Hold</button>
                      <button onClick={() => setEditPlan(plan)}
                        className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100">Edit</button>
                      <button onClick={() => setDeletePlan(plan)}
                        className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100">Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {plans.length === 0 && (
          <div className="py-10 text-center text-gray-400 text-sm">No entry plans</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="block sm:hidden space-y-3">
        {plans.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No entry plans</p>}
        {plans.map(plan => {
          const ep = plan.entry_price
          const sp = plan.stop_price
          const riskYen = accountCapital > 0 && appliedRiskPct > 0 ? accountCapital * appliedRiskPct / 100 : null
          const rawShares = riskYen != null && sp != null && ep !== sp ? riskYen / (ep - sp) : null
          const sharesPlan = rawShares != null ? Math.max(0, Math.floor(rawShares / 100) * 100) : 0
          return (
            <div key={plan.id} className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <a href={`https://www.tradingview.com/chart/?symbol=TSE:${plan.ticker}`} target="_blank" rel="noreferrer"
                     className="font-mono font-bold text-blue-600 text-base">{plan.ticker}</a>
                  {plan.company_name && <span className="ml-2 text-xs text-gray-600">{plan.company_name}</span>}
                </div>
                <JudgmentBadge shares={sharesPlan} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-3">
                <div><span className="text-gray-400 block">Entry</span>¥{fmt(ep)}</div>
                <div><span className="text-gray-400 block">Stop</span>{sp != null ? `¥${fmt(sp)}` : '—'}</div>
                <div><span className="text-gray-400 block">Shares</span>{sharesPlan > 0 ? `${sharesPlan} sh` : '—'}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePromote(plan)} className="flex-1 py-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">→ Hold</button>
                <button onClick={() => setEditPlan(plan)} className="px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg">Edit</button>
                <button onClick={() => setDeletePlan(plan)} className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg">Delete</button>
              </div>
            </div>
          )
        })}
      </div>

      <PositionModal
        open={!!editPlan}
        onClose={() => setEditPlan(null)}
        onSaved={() => { setEditPlan(null); onRefresh() }}
        initial={editPlan ?? undefined}
        defaultStatus="plan"
      />
      <ConfirmDialog
        open={!!deletePlan}
        message={`「${deletePlan?.ticker}」のエントリー計画を削除しますか？`}
        onConfirm={handleDelete}
        onCancel={() => setDeletePlan(null)}
      />
    </div>
  )
}
