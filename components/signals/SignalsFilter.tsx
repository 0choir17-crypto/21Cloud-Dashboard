'use client'

import { useState } from 'react'
import { DailySignal } from '@/types/signals'
import { SCREEN_NAME_MAP, getRecommendedScreens, isRecommended } from '@/lib/screenNames'
import SignalsTable from './SignalsTable'

type Props = {
  signals: DailySignal[]
  marketRegime?: string | null
  scorecardRegime?: string | null
}

export default function SignalsFilter({ signals, marketRegime, scorecardRegime }: Props) {
  const [activeScreen, setActiveScreen] = useState<string>('all')
  const [entryFilter, setEntryFilter] = useState<number | null>(null)

  const recommended = getRecommendedScreens(marketRegime, scorecardRegime)

  // | で分割して個別スクリーン一覧（重複排除・ソート）
  const allScreens = Array.from(
    new Set(
      signals.flatMap(s => s.screen_name.split('|').map(n => n.trim()))
    )
  ).sort()

  // フィルター条件: 選択中スクリーンが screen_name に含まれるか
  let filtered = activeScreen === 'all'
    ? signals
    : signals.filter(s =>
        s.screen_name.split('|').map(n => n.trim()).includes(activeScreen)
      )

  // エントリースコアフィルター
  if (entryFilter !== null) {
    filtered = filtered.filter(s => (s.entry_score ?? 1) >= entryFilter)
  }

  const btnClass = (name: string, rec: boolean) => {
    const isActive = name === activeScreen
    if (isActive) {
      return 'px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white border border-blue-600 transition-colors'
    }
    if (rec) {
      return 'px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-amber-700 border border-amber-400 hover:bg-amber-50 transition-colors'
    }
    return 'px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-600 border border-[#e8eaed] hover:bg-gray-50 transition-colors'
  }

  return (
    <>
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button className={btnClass('all', false)} onClick={() => setActiveScreen('all')}>
          全て（{signals.length}）
        </button>
        {allScreens.map(name => {
          const count = signals.filter(s =>
            s.screen_name.split('|').map(n => n.trim()).includes(name)
          ).length
          const rec       = isRecommended(name, recommended)
          const shortName = SCREEN_NAME_MAP[name] ?? name
          return (
            <button
              key={name}
              className={btnClass(name, rec)}
              onClick={() => setActiveScreen(name)}
            >
              {rec && <span className="mr-1">★</span>}
              {shortName}（{count}）
            </button>
          )
        })}

        {/* ★★★フィルター */}
        <button
          onClick={() => setEntryFilter(entryFilter === 3 ? null : 3)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            entryFilter === 3
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
          }`}
        >
          ★★★のみ
        </button>
      </div>

      {/* Filtered table */}
      <SignalsTable
        signals={filtered}
        marketRegime={marketRegime}
        scorecardRegime={scorecardRegime}
      />
    </>
  )
}
