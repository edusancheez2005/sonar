/**
 * API Route: price movers for /trending (top gainers and losers).
 * Data source: Binance rolling-window tickers over the symbols we map
 * (lib/binance/symbol-map.ts); ?window=1h | 24h | 7d.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRollingTicker } from '@/lib/binance/client'
import { getAllPairs, pairToSymbol } from '@/lib/binance/symbol-map'
import { getTokenLogos } from '@/lib/logos/getTokenLogos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Token name map for display (Binance only gives symbols)
const TOKEN_NAMES: Record<string, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', SOL: 'Solana',
  XRP: 'XRP', ADA: 'Cardano', DOGE: 'Dogecoin', AVAX: 'Avalanche',
  DOT: 'Polkadot', LINK: 'Chainlink', UNI: 'Uniswap', ATOM: 'Cosmos',
  LTC: 'Litecoin', FIL: 'Filecoin', NEAR: 'NEAR Protocol', APT: 'Aptos',
  ARB: 'Arbitrum', OP: 'Optimism', AAVE: 'Aave', MKR: 'Maker',
  CRV: 'Curve', SNX: 'Synthetix', COMP: 'Compound', SUSHI: 'SushiSwap',
  ALGO: 'Algorand', FTM: 'Fantom', SAND: 'The Sandbox', MANA: 'Decentraland',
  AXS: 'Axie Infinity', GRT: 'The Graph', SHIB: 'Shiba Inu', PEPE: 'Pepe',
  WLD: 'Worldcoin', SUI: 'Sui', SEI: 'Sei', TIA: 'Celestia',
  INJ: 'Injective', STX: 'Stacks', IMX: 'Immutable', RENDER: 'Render',
  FET: 'Fetch.ai', JUP: 'Jupiter', WIF: 'dogwifhat', BONK: 'Bonk',
  FLOKI: 'Floki', JASMY: 'JasmyCoin', ENA: 'Ethena', PENDLE: 'Pendle',
  TAO: 'Bittensor', ONDO: 'Ondo', TRX: 'Tron', TON: 'Toncoin',
  ETC: 'Ethereum Classic', XLM: 'Stellar', HBAR: 'Hedera', VET: 'VeChain',
  ICP: 'Internet Computer', THETA: 'Theta', RUNE: 'THORChain', ENS: 'ENS',
  MATIC: 'Polygon', POL: 'Polygon',
}

// 1H / 24H / 7D are real Binance rolling windows (the old 1H/7D/30D buttons
// re-fetched the same 24 h data and relabelled it; Binance has no 30 d window).
const WINDOWS: Record<string, string> = { '1h': '1h', '24h': '1d', '7d': '7d' }

export async function GET(request: NextRequest) {
  const raw = (request.nextUrl.searchParams.get('window') || request.nextUrl.searchParams.get('duration') || '24h').toLowerCase()
  const window = WINDOWS[raw] ? raw : '24h'
  try {
    const pairs = getAllPairs()
    const tickers = await getRollingTicker(pairs, WINDOWS[window])
    const rows = tickers
      .map((t) => {
        const sym = pairToSymbol(t.symbol)
        if (!sym || !Number.isFinite(t.priceChangePercent) || !(t.lastPrice > 0)) return null
        return {
          symbol: sym,
          name: TOKEN_NAMES[sym] || sym,
          image: null as string | null,
          price: t.lastPrice,
          change_pct: t.priceChangePercent,
          quote_volume: t.quoteVolume,
        }
      })
      .filter(Boolean) as Array<{ symbol: string; name: string; image: string | null; price: number; change_pct: number; quote_volume: number }>

    const logos = await getTokenLogos(rows.map((r) => r.symbol))
    for (const r of rows) r.image = logos[r.symbol] || null

    const byChange = [...rows].sort((a, b) => b.change_pct - a.change_pct)
    return NextResponse.json(
      {
        success: true,
        window,
        source: 'binance',
        generated_at: new Date().toISOString(),
        gainers: byChange.slice(0, 10),
        losers: byChange.slice(-10).reverse(),
      },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
    )
  } catch (error) {
    console.error('Trending movers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price movers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
