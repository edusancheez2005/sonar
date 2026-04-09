/**
 * API Route: Get trending coins and top gainers/losers
 * Data source: Binance 24hr ticker (replaced CoinGecko)
 * Trending = highest volume; gainers/losers = 24h price change
 */

import { NextRequest, NextResponse } from 'next/server'
import { get24hrTicker } from '@/lib/binance/client'
import { pairToSymbol } from '@/lib/binance/symbol-map'

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

export async function GET(request: NextRequest) {
  try {
    const allTickers = await get24hrTicker()

    // Filter to only USDT pairs we track
    const tracked = allTickers
      .filter(t => t.symbol.endsWith('USDT'))
      .map(t => {
        const sym = pairToSymbol(t.symbol)
        if (!sym) return null
        return {
          id: sym.toLowerCase(),
          symbol: sym.toLowerCase(),
          name: TOKEN_NAMES[sym] || sym,
          image: null, // Frontend uses TokenIcon component which handles this
          current_price: t.lastPrice,
          market_cap: null,
          market_cap_rank: null,
          price_change_percentage_24h: t.priceChangePercent,
          price_change_percentage: t.priceChangePercent,
          volume: t.quoteVolume,
        }
      })
      .filter(Boolean) as any[]

    // Trending = highest quote volume (most traded)
    const trending = [...tracked]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 15)
      .map(t => ({
        id: t.id,
        symbol: t.symbol,
        name: t.name,
        large: t.image,
        thumb: t.image,
        market_cap_rank: t.market_cap_rank,
        price_btc: null,
        data: { price_change_percentage_24h: { usd: t.price_change_percentage_24h } },
      }))

    // Top gainers = highest 24h % change
    const sortedByChange = [...tracked].sort(
      (a, b) => b.price_change_percentage - a.price_change_percentage
    )

    const top_gainers = sortedByChange.slice(0, 20)
    const top_losers = sortedByChange.slice(-20).reverse()

    return NextResponse.json({
      success: true,
      trending,
      top_gainers,
      top_losers,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Trending API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trending data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
