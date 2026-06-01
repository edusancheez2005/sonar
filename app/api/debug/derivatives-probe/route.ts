/**
 * Public diagnostic: probes every derivatives venue we know about from
 * Vercel egress and returns status + first line of body. Used to confirm
 * which venues are reachable from prod after geo-blocks.
 *
 * NOT a cron. Public read-only. Returns no secrets.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30
export const runtime = 'nodejs'

async function probe(name: string, url: string) {
  const t0 = Date.now()
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' })
    const dt = Date.now() - t0
    let body = ''
    try { body = (await r.text()).slice(0, 200) } catch {}
    return { name, url, status: r.status, ms: dt, body }
  } catch (err) {
    return { name, url, status: 0, ms: Date.now() - t0, body: (err as Error).message }
  }
}

export async function GET() {
  const results = await Promise.all([
    probe('binance.funding', 'https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1'),
    probe('binance.openInterest', 'https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT'),
    probe('bybit.funding', 'https://api.bybit.com/v5/market/funding/history?category=linear&symbol=BTCUSDT&limit=1'),
    probe('bybit.openInterest', 'https://api.bybit.com/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1h&limit=1'),
    probe('bybit.accountRatio', 'https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=BTCUSDT&period=1h&limit=1'),
    probe('okx.funding', 'https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP'),
    probe('okx.openInterest', 'https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=BTC-USDT-SWAP'),
    probe('deribit.funding', 'https://www.deribit.com/api/v2/public/get_funding_rate_value?instrument_name=BTC-PERPETUAL&start_timestamp=' + (Date.now() - 3_600_000) + '&end_timestamp=' + Date.now()),
  ])
  return NextResponse.json({ probedAt: new Date().toISOString(), results }, {
    headers: { 'cache-control': 'no-store' },
  })
}
