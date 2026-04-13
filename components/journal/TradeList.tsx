'use client'

import { Trade } from '@/types/trades'
import { SCREEN_NAME_MAP } from '@/lib/screenNames'

type Props = {
  trades: Trade[]
  onClose: (trade: Trade) => void
  onEdit: (trade: Trade) => void
}

function RegimeBadge({ regime }: { regime: string | null }) {
  if (!regime) return null
  const colorMap: Record<string, string> = {
    'Strong Bull': 'bg-emerald-100 text-emerald-800',
    'Bull':        'bg-green-100 text-green-800',
    'Neutral':     'bg-gray-100 text-gray-700',
    'Bear':        'bg-orange-100 text-orange-800',
    'Strong Bear': 'bg-red-100 text-red-800',
  }
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colorMap[regime] ?? 'bg-gray-100 text-gray-600'}`}>
      {regime}
    </span>
  )
}

function SignalSnapshotLine({ t }: { t: Trade }) {
  if (t.rs_at_entry == null) return null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-400 mt-0.5">
      <span>RS: <strong className="text-gray-600">{t.rs_at_entry.toFixed(1)}</strong></span>
      <span>RVOL: <strong className={(t.rvol_at_entry ?? 0) >= 2 ? 'text-emerald-600 font-bold' : 'text-gray-600'}>{t.rvol_at_entry?.toFixed(2)}</strong></span>
      <span>ADR: <strong className="text-gray-600">{t.adr_at_entry?.toFixed(2)}%</strong></span>
      <span>EMA21: <strong className="text-gray-600">{t.dist_ema21_at_entry?.toFixed(2)}R</strong></span>
      {t.stop_pct_at_entry != null && <span>Stop: <strong className="text-gray-600">{t.stop_pct_at_entry.toFixed(2)}%</strong></span>}
      {t.sector && <span>Sector: <strong className="text-gray-600">{t.sector}</strong></span>}
      {t.signal_price != null && <span>Price: <strong className="text-gray-600">&yen;{t.signal_price.toLocaleString()}</strong></span>}
      {t.mc_condition_at_entry && (
        <span>MC: <strong className={t.mc_met_at_entry ? 'text-emerald-600' : 'text-gray-400'}>{t.mc_condition_at_entry} {t.mc_met_at_entry ? '\u2705' : '\u274c'}</strong></span>
      )}
    </div>
  )
}

function McBadge({ score, regime }: { score: number | null; regime: string | null }) {
  if (score == null) return <span className="text-xs text-gray-400">MC: —</span>
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
      MC: {score.toFixed(0)}%
      <RegimeBadge regime={regime} />
    </span>
  )
}

export default function TradeList({ trades, onClose, onEdit }: Props) {
  const openTrades = trades.filter(t => t.status === 'open')
  const closedTrades = trades
    .filter(t => t.status === 'closed')
    .sort((a, b) => (b.exit_date ?? '').localeCompare(a.exit_date ?? ''))

  return (
    <div className="space-y-6">
      {/* OPEN trades */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          OPEN ({openTrades.length})
        </h3>
        {openTrades.length === 0 ? (
          <p className="text-sm text-gray-400 pl-4">オープンポジションなし</p>
        ) : (
          <div className="space-y-2">
            {openTrades.map(t => (
              <div
                key={t.id}
                className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600 text-sm">{t.ticker}</span>
                    <span className="text-xs text-gray-500">{t.company_name ?? ''}</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                      {t.screen_name ? (SCREEN_NAME_MAP[t.screen_name] ?? t.screen_name) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{t.entry_date}</span>
                    <span>&yen;{t.entry_price.toLocaleString()} &times; {t.shares}株</span>
                    <McBadge score={t.mc_score} regime={t.mc_regime} />
                  </div>
                  <SignalSnapshotLine t={t} />
                </div>
                <div className="flex gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => onEdit(t)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onClose(t)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CLOSED trades */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
          CLOSED ({closedTrades.length})
        </h3>
        {closedTrades.length === 0 ? (
          <p className="text-sm text-gray-400 pl-4">クローズ済みトレードなし</p>
        ) : (
          <div className="space-y-2">
            {closedTrades.map(t => {
              const isWin = t.result === 'WIN'
              return (
                <div
                  key={t.id}
                  className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-gray-800">{t.ticker}</span>
                      <span className="text-xs text-gray-500">{t.company_name ?? ''}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                        {t.screen_name ? (SCREEN_NAME_MAP[t.screen_name] ?? t.screen_name) : '—'}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isWin ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {t.result}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{t.entry_date} → {t.exit_date}</span>
                      <span>&yen;{t.entry_price.toLocaleString()} → &yen;{t.exit_price?.toLocaleString()}</span>
                      <span className={`font-semibold ${isWin ? 'text-emerald-600' : 'text-red-600'}`}>
                        {(t.pnl_pct ?? 0) >= 0 ? '+' : ''}{(t.pnl_pct ?? 0).toFixed(2)}%
                      </span>
                      <McBadge score={t.mc_score} regime={t.mc_regime} />
                    </div>
                    <SignalSnapshotLine t={t} />
                  </div>
                  <button
                    onClick={() => onEdit(t)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors self-end sm:self-auto"
                  >
                    Edit
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
