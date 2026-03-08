import { supabase } from '@/lib/supabase'
import { MarketConditions } from '@/types/market'
import ScoreGauge from '@/components/market/ScoreGauge'
import FactorGrid from '@/components/market/FactorGrid'
import IndexCard from '@/components/market/IndexCard'
import BreadthPanel from '@/components/market/BreadthPanel'
import RefreshButton from '@/components/market/RefreshButton'

export const revalidate = 3600

async function getData(): Promise<MarketConditions | null> {
  const { data } = await supabase
    .from('market_conditions')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .single()
  return data
}

export default async function Page() {
  const market = await getData()

  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>

      {/* ヘッダー */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans, sans-serif)' }}
          >
            Market Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            21 Cloud — 日本株マーケットコンディション
          </p>
        </div>
        <div className="flex items-center gap-4">
          {market?.date && (
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Updated: {market.date}
            </span>
          )}
          <RefreshButton />
        </div>
      </header>

      {/* データなし */}
      {!market && (
        <div className="card p-8 text-center" style={{ color: 'var(--text-muted)' }}>
          <p className="text-lg font-medium mb-2">データが見つかりません</p>
          <p className="text-sm">Supabase の market_conditions テーブルにデータを挿入してください。</p>
        </div>
      )}

      {market && (
        <>
          {/* ② Scorecard + Factors（左） / 指数カード（右） */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6 mb-8 items-stretch">
            {/* 左: ゲージ + 12 Factors を1つのカード */}
            <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-6 flex flex-col h-full">
              <p className="text-sm font-semibold text-gray-500 mb-4">Market Scorecard</p>
              <ScoreGauge
                regime={market.scorecard_regime}
                positiveCount={market.positive_count}
                totalCount={market.total_count}
                positivePct={market.positive_pct}
                marketRegime={market.market_regime}
                breadthRegime={market.breadth_regime}
              />
              <hr className="my-4 border-[#e8eaed]" />
              <FactorGrid market={market} />
            </div>
            {/* 右: 指数カード縦3枚 */}
            <div className="flex flex-col gap-4 h-full">
              <IndexCard label="日経225"     prefix="nikkei" data={market} className="flex-1" />
              <IndexCard label="TOPIX"       prefix="topix"  data={market} className="flex-1" />
              <IndexCard label="グロース250" prefix="growth" data={market} className="flex-1" />
            </div>
          </div>

          {/* ③ Market Breadth */}
          <BreadthPanel market={market} />
        </>
      )}

    </main>
  )
}
