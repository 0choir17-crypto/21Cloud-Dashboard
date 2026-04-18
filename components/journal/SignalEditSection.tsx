'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trade } from '@/types/trades'

type Props = {
  trade: Trade
  onSaved: () => void
  onCancel: () => void
}

function toStr(v: number | null | undefined): string {
  return v == null ? '' : String(v)
}

function toNum(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

export default function SignalEditSection({ trade, onSaved, onCancel }: Props) {
  const [signalPrice, setSignalPrice] = useState(toStr(trade.signal_price))
  const [rs, setRs] = useState(toStr(trade.rs_at_entry))
  const [rvol, setRvol] = useState(toStr(trade.rvol_at_entry))
  const [adr, setAdr] = useState(toStr(trade.adr_at_entry))
  const [distEma21, setDistEma21] = useState(toStr(trade.dist_ema21_at_entry))
  const [stopPct, setStopPct] = useState(toStr(trade.stop_pct_at_entry))
  const [mcMet, setMcMet] = useState<boolean>(trade.mc_met_at_entry ?? false)
  const [mcCondition, setMcCondition] = useState(trade.mc_condition_at_entry ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSignalPrice(toStr(trade.signal_price))
    setRs(toStr(trade.rs_at_entry))
    setRvol(toStr(trade.rvol_at_entry))
    setAdr(toStr(trade.adr_at_entry))
    setDistEma21(toStr(trade.dist_ema21_at_entry))
    setStopPct(toStr(trade.stop_pct_at_entry))
    setMcMet(trade.mc_met_at_entry ?? false)
    setMcCondition(trade.mc_condition_at_entry ?? '')
    setError('')
  }, [trade.id])

  async function handleSave() {
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('trades')
      .update({
        signal_price: toNum(signalPrice),
        rs_at_entry: toNum(rs),
        rvol_at_entry: toNum(rvol),
        adr_at_entry: toNum(adr),
        dist_ema21_at_entry: toNum(distEma21),
        stop_pct_at_entry: toNum(stopPct),
        mc_met_at_entry: mcMet,
        mc_condition_at_entry: mcCondition.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', trade.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  const inputClass = 'w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
  const labelClass = 'block text-[11px] font-medium text-gray-600 mb-0.5'

  return (
    <div className="rounded-lg border border-gray-200 bg-amber-50/40 border-l-2 border-l-amber-400 px-4 py-4 space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-800">
          📝 シグナル編集: <span className="font-mono">{trade.ticker}</span> {trade.company_name ?? ''}
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
      )}

      {/* グリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Signal Price</label>
          <input type="number" value={signalPrice} onChange={e => setSignalPrice(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>RS (0-100)</label>
          <input type="number" min={0} max={100} value={rs} onChange={e => setRs(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>RVOL</label>
          <input type="number" step="0.1" value={rvol} onChange={e => setRvol(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>ADR%</label>
          <input type="number" step="0.1" value={adr} onChange={e => setAdr(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>EMA21乖離 (R)</label>
          <input type="number" step="0.1" value={distEma21} onChange={e => setDistEma21(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Stop%</label>
          <input type="number" step="0.1" value={stopPct} onChange={e => setStopPct(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>MC Condition</label>
          <input type="text" value={mcCondition} onChange={e => setMcCondition(e.target.value)} placeholder="例: MC≤9" className={inputClass} />
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 py-1.5">
            <input
              type="checkbox"
              checked={mcMet}
              onChange={e => setMcMet(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            MC条件を満たした (mc_met_at_entry)
          </label>
        </div>
      </div>

      {/* フッター */}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
