'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Position } from '@/types/portfolio'
import Modal from '@/components/shared/Modal'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  position: Position | null
}

const today = () => new Date().toISOString().slice(0, 10)

const EXIT_REASONS = ['利確', '損切', 'トレール損切', '目標達成', 'その他']

export default function CloseModal({ open, onClose, onSaved, position }: Props) {
  const [exitPrice, setExitPrice] = useState('')
  const [exitDate, setExitDate] = useState(today())
  const [exitReason, setExitReason] = useState('利確')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setExitPrice('')
      setExitDate(today())
      setExitReason('利確')
      setError('')
    }
  }, [open])

  if (!position) return null

  const ep = parseFloat(exitPrice)
  const realizedPnl = !isNaN(ep) ? (ep - position.entry_price) * position.shares : null
  const rMultiple =
    !isNaN(ep) && position.stop_price != null && position.entry_price !== position.stop_price
      ? (ep - position.entry_price) / (position.entry_price - position.stop_price)
      : null

  async function handleClose() {
    if (exitPrice === '') { setError('売値は必須です'); return }
    if (!exitDate) { setError('売却日は必須です'); return }
    if (!position) return

    setSaving(true)
    setError('')

    const ep2 = parseFloat(exitPrice)
    const pnl = (ep2 - position.entry_price) * position.shares
    const rMult =
      position.stop_price != null && position.entry_price !== position.stop_price
        ? (ep2 - position.entry_price) / (position.entry_price - position.stop_price)
        : null

    // 1. Insert trade_history
    const { error: histErr } = await supabase.from('trade_history').insert({
      ticker: position.ticker,
      company_name: position.company_name,
      entry_date: position.entry_date,
      exit_date: exitDate,
      entry_price: position.entry_price,
      exit_price: ep2,
      shares: position.shares,
      stop_price: position.stop_price,
      target_r: position.target_r,
      realized_pnl: pnl,
      r_multiple: rMult,
      exit_reason: exitReason,
      memo: position.memo,
    })
    if (histErr) { setSaving(false); setError(histErr.message); return }

    // 2. Update position status to closed
    const { error: posErr } = await supabase
      .from('positions')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', position.id)
    if (posErr) { setSaving(false); setError(posErr.message); return }

    // 3. Update consec_losses in risk_settings
    const { data: riskData } = await supabase
      .from('risk_settings')
      .select('id, consec_losses')
      .limit(1)
      .maybeSingle()

    const prevLosses = riskData?.consec_losses ?? 0
    const newLosses = (rMult != null && rMult < 0) ? prevLosses + 1 : 0

    if (riskData?.id) {
      await supabase
        .from('risk_settings')
        .update({ consec_losses: newLosses, updated_at: new Date().toISOString() })
        .eq('id', riskData.id)
    } else {
      await supabase.from('risk_settings').insert({ consec_losses: newLosses })
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`クローズ: ${position.ticker}`}>
      <div className="px-6 py-5 space-y-4">
        {/* Position summary */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-600 grid grid-cols-3 gap-2">
          <div><span className="text-gray-400 block">Entry価格</span>¥{position.entry_price.toLocaleString()}</div>
          <div><span className="text-gray-400 block">株数</span>{position.shares.toLocaleString()}株</div>
          <div><span className="text-gray-400 block">Stop</span>{position.stop_price != null ? `¥${position.stop_price.toLocaleString()}` : '—'}</div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Exit Price */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              売値 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={exitPrice}
              onChange={e => setExitPrice(e.target.value)}
              placeholder="例: 2800"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Exit Date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              売却日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={exitDate}
              onChange={e => setExitDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Exit Reason */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Exit理由</label>
            <select
              value={exitReason}
              onChange={e => setExitReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {EXIT_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Calculated P&L preview */}
        {realizedPnl != null && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-400 block mb-0.5">確定損益</span>
              <span
                className={`text-lg font-bold font-mono ${realizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {realizedPnl >= 0 ? '+' : ''}¥{realizedPnl.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}
              </span>
            </div>
            {rMultiple != null && (
              <div>
                <span className="text-xs text-gray-400 block mb-0.5">R倍率</span>
                <span
                  className={`text-lg font-bold font-mono ${rMultiple >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {rMultiple >= 0 ? '+' : ''}{rMultiple.toFixed(2)}R
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            キャンセル
          </button>
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors min-h-[44px] disabled:opacity-50"
          >
            {saving ? '処理中…' : 'クローズ確定'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
