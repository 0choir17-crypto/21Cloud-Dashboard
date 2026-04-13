'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Trade } from '@/types/trades'
import { SCREEN_NAME_MAP } from '@/lib/screenNames'
import Modal from '@/components/shared/Modal'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  trade: Trade | null
}

const SCREEN_OPTIONS = Object.entries(SCREEN_NAME_MAP).map(([raw, display]) => ({
  value: raw,
  label: display,
}))

const REGIME_MAP: Record<string, string> = {
  strong_bull: 'Strong Bull',
  bull: 'Bull',
  neutral: 'Neutral',
  bear: 'Bear',
  strong_bear: 'Strong Bear',
}

const REGIME_LABEL: Record<string, string> = { ...REGIME_MAP }

export default function EditTradeModal({ open, onClose, onSaved, trade }: Props) {
  const [ticker, setTicker] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [screenName, setScreenName] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [entryPrice, setEntryPrice] = useState('')
  const [shares, setShares] = useState('')
  const [memo, setMemo] = useState('')
  const [mcScore, setMcScore] = useState<number | null>(null)
  const [mcRegime, setMcRegime] = useState<string | null>(null)
  const [mcLoading, setMcLoading] = useState(false)

  // CLOSED trades: exit fields
  const [exitDate, setExitDate] = useState('')
  const [exitPrice, setExitPrice] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isClosed = trade?.status === 'closed'

  // Populate form from trade
  useEffect(() => {
    if (open && trade) {
      setTicker(trade.ticker)
      setCompanyName(trade.company_name ?? '')
      setScreenName(trade.screen_name ?? '')
      setEntryDate(trade.entry_date)
      setEntryPrice(String(trade.entry_price))
      setShares(String(trade.shares))
      setMemo(trade.memo ?? '')
      setMcScore(trade.mc_score)
      setMcRegime(trade.mc_regime)
      setExitDate(trade.exit_date ?? '')
      setExitPrice(trade.exit_price != null ? String(trade.exit_price) : '')
      setError('')
    }
  }, [open, trade])

  // Re-fetch MC Score when entry_date changes
  useEffect(() => {
    if (!open || !entryDate) return
    // Skip if date hasn't changed from original
    if (trade && entryDate === trade.entry_date) return

    let cancelled = false

    async function fetchMc() {
      setMcLoading(true)
      const { data } = await supabase
        .from('market_conditions')
        .select('positive_pct, scorecard_regime')
        .lte('date', entryDate)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      if (!cancelled && data) {
        setMcScore(data.positive_pct ?? null)
        setMcRegime(data.scorecard_regime ?? null)
      } else if (!cancelled) {
        setMcScore(null)
        setMcRegime(null)
      }
      if (!cancelled) setMcLoading(false)
    }

    fetchMc()
    return () => { cancelled = true }
  }, [open, entryDate, trade])

  // PnL preview for closed trades
  const preview = useMemo(() => {
    if (!isClosed || !exitPrice || isNaN(Number(exitPrice)) || !entryPrice || isNaN(Number(entryPrice))) return null
    const ep = parseFloat(exitPrice)
    const enp = parseFloat(entryPrice)
    const sh = parseInt(shares, 10) || 0
    if (!sh) return null
    const pnl = (ep - enp) * sh
    const pnlPct = ((ep - enp) / enp) * 100
    return { pnl, pnlPct, result: pnl > 0 ? 'WIN' : 'LOSS' }
  }, [isClosed, exitPrice, entryPrice, shares])

  async function handleSave() {
    if (!trade) return
    if (!ticker.trim()) { setError('銘柄コードは必須です'); return }
    if (!entryDate) { setError('エントリー日は必須です'); return }
    if (!entryPrice || isNaN(Number(entryPrice))) { setError('エントリー価格は必須です'); return }
    if (!shares || isNaN(Number(shares))) { setError('株数は必須です'); return }

    if (isClosed) {
      if (!exitDate) { setError('イグジット日は必須です'); return }
      if (!exitPrice || isNaN(Number(exitPrice))) { setError('イグジット価格は必須です'); return }
    }

    setSaving(true)
    setError('')

    const record: Record<string, unknown> = {
      ticker: ticker.trim(),
      company_name: companyName.trim() || null,
      screen_name: screenName || null,
      entry_date: entryDate,
      entry_price: parseFloat(entryPrice),
      shares: parseInt(shares, 10),
      mc_score: mcScore,
      mc_regime: mcRegime ? (REGIME_MAP[mcRegime] ?? mcRegime) : null,
      memo: memo.trim() || null,
      updated_at: new Date().toISOString(),
    }

    // Recalculate PnL for closed trades
    if (isClosed) {
      const ep = parseFloat(exitPrice)
      const enp = parseFloat(entryPrice)
      const sh = parseInt(shares, 10)
      const pnl = (ep - enp) * sh
      const pnlPct = ((ep - enp) / enp) * 100
      record.exit_date = exitDate
      record.exit_price = ep
      record.pnl = pnl
      record.pnl_pct = pnlPct
      record.result = pnl > 0 ? 'WIN' : 'LOSS'
    }

    const { error: err } = await supabase
      .from('trades')
      .update(record)
      .eq('id', trade.id)

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  if (!trade) return null

  return (
    <Modal open={open} onClose={onClose} title="トレード編集">
      <div className="px-6 py-5 space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Ticker */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              銘柄コード <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={ticker}
              onChange={e => setTicker(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">銘柄名</label>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Screen Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">スクリーン</label>
            <select
              value={screenName}
              onChange={e => setScreenName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">-- 選択 --</option>
              {SCREEN_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
              <option value="other">その他</option>
            </select>
          </div>

          {/* Entry Date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              エントリー日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Entry Price */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              エントリー価格 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={entryPrice}
              onChange={e => setEntryPrice(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Shares */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              株数 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={shares}
              onChange={e => setShares(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* MC Score */}
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <span className="text-xs font-medium text-gray-500">MC Score: </span>
          {mcLoading ? (
            <span className="text-xs text-gray-400">取得中...</span>
          ) : mcScore != null ? (
            <span className="text-sm font-semibold text-gray-800">
              {mcScore.toFixed(0)}% ({REGIME_LABEL[mcRegime ?? ''] ?? mcRegime ?? '—'})
            </span>
          ) : (
            <span className="text-xs text-gray-400">取得できません</span>
          )}
        </div>

        {/* Exit fields for CLOSED trades */}
        {isClosed && (
          <>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">イグジット情報</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    イグジット日 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={exitDate}
                    onChange={e => setExitDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    イグジット価格 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={exitPrice}
                    onChange={e => setExitPrice(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* PnL preview */}
            {preview && (
              <div className={`rounded-lg px-4 py-3 text-center ${
                preview.result === 'WIN' ? 'bg-emerald-50' : 'bg-red-50'
              }`}>
                <p className={`text-lg font-bold ${
                  preview.result === 'WIN' ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {preview.pnl >= 0 ? '+' : ''}&yen;{preview.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  {' '}
                  ({preview.pnlPct >= 0 ? '+' : ''}{preview.pnlPct.toFixed(2)}%)
                </p>
                <p className={`text-xs font-semibold ${
                  preview.result === 'WIN' ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {preview.result}
                </p>
              </div>
            )}
          </>
        )}

        {/* Memo */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">メモ</label>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            rows={2}
            placeholder="エントリー理由など"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] disabled:opacity-50"
          >
            {saving ? '保存中...' : '更新'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
