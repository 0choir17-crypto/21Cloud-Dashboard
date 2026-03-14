'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SCREEN_NAME_MAP } from '@/lib/screenNames'
import Modal from '@/components/shared/Modal'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  initial?: {
    ticker?: string
    company_name?: string
    screen_name?: string
  }
}

const today = () => new Date().toISOString().slice(0, 10)

// スクリーン選択肢: raw name → display name
const SCREEN_OPTIONS = Object.entries(SCREEN_NAME_MAP).map(([raw, display]) => ({
  value: raw,
  label: display,
}))

export default function TradeModal({ open, onClose, onSaved, initial }: Props) {
  const [ticker, setTicker] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [screenName, setScreenName] = useState('')
  const [entryDate, setEntryDate] = useState(today())
  const [entryPrice, setEntryPrice] = useState('')
  const [shares, setShares] = useState('')
  const [memo, setMemo] = useState('')
  const [mcScore, setMcScore] = useState<number | null>(null)
  const [mcRegime, setMcRegime] = useState<string | null>(null)
  const [mcLoading, setMcLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // フォーム初期化
  useEffect(() => {
    if (open) {
      setTicker(initial?.ticker ?? '')
      setCompanyName(initial?.company_name ?? '')
      setScreenName(initial?.screen_name ?? '')
      setEntryDate(today())
      setEntryPrice('')
      setShares('')
      setMemo('')
      setMcScore(null)
      setMcRegime(null)
      setError('')
    }
  }, [open, initial])

  // entry_date 変更時に MC Score を自動取得
  useEffect(() => {
    if (!open || !entryDate) return
    let cancelled = false

    async function fetchMc() {
      setMcLoading(true)
      // entry_date 以前の最新データを取得
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
  }, [open, entryDate])

  async function handleSave() {
    if (!ticker.trim()) { setError('銘柄コードは必須です'); return }
    if (!entryDate) { setError('エントリー日は必須です'); return }
    if (!entryPrice || isNaN(Number(entryPrice))) { setError('エントリー価格は必須です'); return }
    if (!shares || isNaN(Number(shares))) { setError('株数は必須です'); return }

    setSaving(true)
    setError('')

    // MC regime を表示用に変換
    const regimeMap: Record<string, string> = {
      strong_bull: 'Strong Bull',
      bull: 'Bull',
      neutral: 'Neutral',
      bear: 'Bear',
      strong_bear: 'Strong Bear',
    }

    const record = {
      ticker: ticker.trim(),
      company_name: companyName.trim() || null,
      screen_name: screenName || null,
      entry_date: entryDate,
      entry_price: parseFloat(entryPrice),
      shares: parseInt(shares, 10),
      mc_score: mcScore,
      mc_regime: mcRegime ? (regimeMap[mcRegime] ?? mcRegime) : null,
      memo: memo.trim() || null,
      status: 'OPEN',
    }

    const { error: err } = await supabase.from('trades').insert(record)

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  const regimeLabel: Record<string, string> = {
    strong_bull: 'Strong Bull',
    bull: 'Bull',
    neutral: 'Neutral',
    bear: 'Bear',
    strong_bear: 'Strong Bear',
  }

  return (
    <Modal open={open} onClose={onClose} title="新規トレード">
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
              placeholder="例: 7203"
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
              placeholder="例: トヨタ自動車"
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
              placeholder="例: 3850"
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
              placeholder="例: 100"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* MC Score 表示 */}
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <span className="text-xs font-medium text-gray-500">MC Score: </span>
          {mcLoading ? (
            <span className="text-xs text-gray-400">取得中...</span>
          ) : mcScore != null ? (
            <span className="text-sm font-semibold text-gray-800">
              {mcScore.toFixed(0)}% ({regimeLabel[mcRegime ?? ''] ?? mcRegime ?? '—'})
            </span>
          ) : (
            <span className="text-xs text-gray-400">取得できません</span>
          )}
        </div>

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
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
