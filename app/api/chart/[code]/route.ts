import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { ChartApiResponse, OhlcvBar } from '@/types/chart'

const CODE_RE = /^\d{4}$/

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params

  if (!CODE_RE.test(code)) {
    return NextResponse.json(
      { error: 'invalid code (must be 4-digit numeric)' },
      { status: 400 },
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 500 },
    )
  }

  const supabase = createClient(url, key)

  const { data, error } = await supabase
    .from('chart_ohlcv_cache')
    .select('date, open, high, low, close, volume')
    .eq('code', code)
    .order('date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const ohlcv: OhlcvBar[] = (data ?? [])
    .filter(r => r.date && r.open != null && r.high != null && r.low != null && r.close != null)
    .map(r => ({
      date: r.date as string,
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: r.volume != null ? Number(r.volume) : 0,
    }))

  const body: ChartApiResponse = {
    code,
    ohlcv,
    cockpit_rs: null,
    mc_v4: null,
  }

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' },
  })
}
