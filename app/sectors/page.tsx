import { supabase } from '@/lib/supabase'
import { SectorData } from '@/types/sectors'
import SectorBarChart from '@/components/sectors/SectorBarChart'
import SectorRRG from '@/components/sectors/SectorRRG'
import SectorQuadrantTable from '@/components/sectors/SectorQuadrantTable'
import RefreshButton from '@/components/market/RefreshButton'

export const revalidate = 3600

const SECTOR_SELECT_BASE = `
  date, sector_name,
  chg_1d_pct, chg_5d_pct, chg_21d_pct,
  pct_from_52wh, dist_sma25_pct, dist_sma50_pct, dist_ema21_pct
`

const SECTOR_SELECT_WITH_RS = `
  ${SECTOR_SELECT_BASE.trim()},
  rs_1d, rs_1w, rs_1m, rs_chg_1w, rs_chg_1m
`

export default async function SectorsPage() {
  // ── 最新日データ（テーブル用）— RS列が存在しない場合はフォールバック ───
  const { data: rawFull, error: fullErr } = await supabase
    .from('sector_index_prices')
    .select(SECTOR_SELECT_WITH_RS)
    .order('date', { ascending: false })
    .limit(200)

  let rawData: any[] | null = rawFull

  if (fullErr) {
    // RS columns not yet added → fall back to base columns
    const { data: rawBase } = await supabase
      .from('sector_index_prices')
      .select(SECTOR_SELECT_BASE)
      .order('date', { ascending: false })
      .limit(200)
    rawData = rawBase
  }

  const sectors: SectorData[] = (rawData ?? []) as SectorData[]

  // 最新日付の行だけに絞る
  const latestDate = sectors[0]?.date ?? null
  const latest = latestDate
    ? sectors.filter(s => s.date === latestDate)
    : []

  // ── RS履歴（ラインチャート用: 最大30日 × 17セクター） ──────────────────
  // rsHistoryクエリはRS列が存在しない場合にエラーになる可能性があるため、
  // エラー時は空配列にフォールバック
  const { data: rsRaw } = await supabase
    .from('sector_index_prices')
    .select('date, sector_name, rs_1d')
    .order('date', { ascending: true })
    .not('rs_1d', 'is', null)
    .limit(17 * 30)

  const rsHistory = (rsRaw ?? []).filter((r: any) => r.rs_1d !== null) as {
    date: string
    sector_name: string
    rs_1d: number
  }[]

  // ── RRG用: 各セクターの日付ユニーク数が20以上あるか確認 ────────────────
  const sectorDays: Record<string, Set<string>> = {}
  for (const s of sectors) {
    if (!sectorDays[s.sector_name]) sectorDays[s.sector_name] = new Set()
    sectorDays[s.sector_name].add(s.date)
  }
  const isRRGReady = latest.every(s => (sectorDays[s.sector_name]?.size ?? 0) >= 20)

  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>

      {/* ヘッダー */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans, sans-serif)' }}
          >
            Sectors
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            21 Cloud — TOPIX-17 セクター分析
          </p>
        </div>
        <div className="flex items-center gap-4">
          {latestDate && (
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Updated: {latestDate}
            </span>
          )}
          <RefreshButton />
        </div>
      </header>

      {latest.length === 0 ? (
        <div
          className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-lg font-medium mb-2">データが見つかりません</p>
          <p className="text-sm">Supabase の sector_index_prices テーブルにデータを挿入してください。</p>
        </div>
      ) : (
        <>
          {/* Phase 1: RSチャート + 象限テーブル */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <SectorBarChart rsHistory={rsHistory} sectors={latest} />
            <SectorQuadrantTable sectors={latest} />
          </div>

          {/* Phase 2: RRG散布図 */}
          <div>
            {isRRGReady ? (
              <SectorRRG sectors={latest} />
            ) : (
              <div className="bg-white rounded-xl border border-[#e8eaed] shadow-sm p-8 text-center text-gray-400">
                <p className="text-sm">RRG表示には20日以上のデータが必要です（現在取得中）</p>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  )
}
