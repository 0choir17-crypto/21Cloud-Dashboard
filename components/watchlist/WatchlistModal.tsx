'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { WatchlistItem } from '@/types/portfolio'
import Modal from '@/components/shared/Modal'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  initial?: Partial<WatchlistItem>
}

const today = () => new Date().toISOString().slice(0, 10)

export default function WatchlistModal({ open, onClose, onSaved, initial }: Props) {
  const isEdit = !!initial?.id

  const [ticker, setTicker] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [watchDate, setWatchDate] = useState(today())
  const [screenTag, setScreenTag] = useState('')
  const [entryPrice, setEntryPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [targetR, setTargetR] = useState('')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setTicker(initial?.ticker ?? '')
      setCompanyName(initial?.company_name ?? '')
      setWatchDate(initial?.watch_date ?? today())
      setScreenTag(initial?.screen_tag ?? '')
      setEntryPrice(initial?.entry_price != null ? String(initial.entry_price) : '')
      setStopPrice(initial?.stop_price != null ? String(initial.stop_price) : '')
      setTargetR(initial?.target_r != null ? String(initial.target_r) : '')
      setMemo(initial?.memo ?? '')
      setError('')
    }
  }, [open, initial])

  async function handleSave() {
    if (!ticker.trim()) { setError('Ticker は必須です'); return }
    if (!watchDate) { setError('ウォッチ日は必須です'); return }
    setSaving(true)
    setError('')

    const record = {
      ticker: ticker.trim().toUpperCase(),
      company_name: companyName.trim() || null,
      watch_date: watchDate,
      screen_tag: screenTag.trim() || null,
      entry_price: entryPrice !== '' ? parseFloat(entryPrice) : null,
      stop_price: stopPrice !== '' ? parseFloat(stopPrice) : null,
      target_r: targetR !== '' ? parseFloat(targetR) : null,
      memo: memo.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { error: err } = isEdit
      ? await supabase.from('watchlist').update(record).eq('id', initial!.id!)
      : await supabase.from('watchlist').insert(record)

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'ウォッチ編集' : 'ウォッチ追加'}>
      <div className="px-6 py-5 space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Ticker */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ticker <span className="text-red-500">*</span>
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

          {/* Watch Date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              ウォッチ日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={watchDate}
              onChange={e => setWatchDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Screen Tag */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">スクリーン名タグ</label>
            <input
              type="text"
              value={screenTag}
              onChange={e => setScreenTag(e.target.value)}
              placeholder="例: CANSLIM_MA"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Entry Price */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">買い候補値段</label>
            <input
              type="number"
              inputMode="numeric"
              value={entryPrice}
              onChange={e => setEntryPrice(e.target.value)}
              placeholder="例: 2500"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Stop Price */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ストップ値段</label>
            <input
              type="number"
              inputMode="numeric"
              value={stopPrice}
              onChange={e => setStopPrice(e.target.value)}
              placeholder="例: 2350"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Target R */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rターゲット</label>
            <input
              type="number"
              inputMode="numeric"
              value={targetR}
              onChange={e => setTargetR(e.target.value)}
              placeholder="例: 3.0"
              step="0.1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Memo */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">メモ</label>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            rows={3}
            placeholder="スクリーニング理由など"
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
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
