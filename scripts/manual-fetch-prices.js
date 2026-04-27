// Manual trigger of the new fetch-prices logic to immediately unfreeze the
// price feed without waiting for the next 22:00 UTC Vercel cron tick.
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TICKER_MAP = [
  { symbol: 'BTC', id: 'bitcoin' }, { symbol: 'ETH', id: 'ethereum' },
  { symbol: 'SOL', id: 'solana' }, { symbol: 'BNB', id: 'binancecoin' },
  { symbol: 'XRP', id: 'ripple' }, { symbol: 'ADA', id: 'cardano' },
  { symbol: 'DOGE', id: 'dogecoin' }, { symbol: 'TRX', id: 'tron' },
  { symbol: 'AVAX', id: 'avalanche-2' }, { symbol: 'SHIB', id: 'shiba-inu' },
  { symbol: 'DOT', id: 'polkadot' }, { symbol: 'LINK', id: 'chainlink' },
  { symbol: 'MATIC', id: 'matic-network' }, { symbol: 'UNI', id: 'uniswap' },
  { symbol: 'LTC', id: 'litecoin' }, { symbol: 'ATOM', id: 'cosmos' },
  { symbol: 'ETC', id: 'ethereum-classic' }, { symbol: 'XLM', id: 'stellar' },
  { symbol: 'NEAR', id: 'near' }, { symbol: 'ALGO', id: 'algorand' },
  { symbol: 'VET', id: 'vechain' }, { symbol: 'FIL', id: 'filecoin' },
  { symbol: 'APT', id: 'aptos' }, { symbol: 'HBAR', id: 'hedera-hashgraph' },
  { symbol: 'ARB', id: 'arbitrum' }, { symbol: 'OP', id: 'optimism' },
  { symbol: 'SUI', id: 'sui' }, { symbol: 'SEI', id: 'sei-network' },
  { symbol: 'TIA', id: 'celestia' }, { symbol: 'STX', id: 'blockstack' },
  { symbol: 'INJ', id: 'injective-protocol' }, { symbol: 'STRK', id: 'starknet' },
  { symbol: 'MNT', id: 'mantle' }, { symbol: 'AAVE', id: 'aave' },
  { symbol: 'MKR', id: 'maker' }, { symbol: 'SNX', id: 'havven' },
  { symbol: 'RUNE', id: 'thorchain' }, { symbol: 'CRV', id: 'curve-dao-token' },
  { symbol: 'COMP', id: 'compound-governance-token' }, { symbol: 'LDO', id: 'lido-dao' },
  { symbol: 'PENDLE', id: 'pendle' }, { symbol: 'ONDO', id: 'ondo-finance' },
  { symbol: 'ENA', id: 'ethena' }, { symbol: 'EIGEN', id: 'eigenlayer' },
  { symbol: 'SSV', id: 'ssv-network' }, { symbol: 'ENS', id: 'ethereum-name-service' },
  { symbol: '1INCH', id: '1inch' }, { symbol: 'SUSHI', id: 'sushi' },
  { symbol: 'CVX', id: 'convex-finance' }, { symbol: 'FXS', id: 'frax-share' },
  { symbol: 'RPL', id: 'rocket-pool' }, { symbol: 'YFI', id: 'yearn-finance' },
  { symbol: 'LPT', id: 'livepeer' }, { symbol: 'GNO', id: 'gnosis' },
  { symbol: 'FET', id: 'artificial-superintelligence-alliance' },
  { symbol: 'RENDER', id: 'render-token' }, { symbol: 'TAO', id: 'bittensor' },
  { symbol: 'NMR', id: 'numeraire' }, { symbol: 'GRT', id: 'the-graph' },
  { symbol: 'SAND', id: 'the-sandbox' }, { symbol: 'MANA', id: 'decentraland' },
  { symbol: 'IMX', id: 'immutable-x' }, { symbol: 'AXS', id: 'axie-infinity' },
  { symbol: 'GALA', id: 'gala' }, { symbol: 'ENJ', id: 'enjincoin' },
  { symbol: 'CHZ', id: 'chiliz' }, { symbol: 'APE', id: 'apecoin' },
  { symbol: 'PEPE', id: 'pepe' }, { symbol: 'WLD', id: 'worldcoin-wld' },
  { symbol: 'WIF', id: 'dogwifcoin' }, { symbol: 'BONK', id: 'bonk' },
  { symbol: 'FLOKI', id: 'floki' }, { symbol: 'FTM', id: 'fantom' },
  { symbol: 'DYDX', id: 'dydx' }, { symbol: 'GMX', id: 'gmx' },
  { symbol: 'BAT', id: 'basic-attention-token' }, { symbol: 'ZRX', id: '0x' },
  { symbol: 'BLUR', id: 'blur' }, { symbol: 'LRC', id: 'loopring' },
  { symbol: 'QNT', id: 'quant-network' }, { symbol: 'MASK', id: 'mask-network' },
  { symbol: 'SKL', id: 'skale' }, { symbol: 'ANKR', id: 'ankr' },
  { symbol: 'CELO', id: 'celo' }, { symbol: 'API3', id: 'api3' },
  { symbol: 'MINA', id: 'mina-protocol' }, { symbol: 'KAS', id: 'kaspa' },
  { symbol: 'PYTH', id: 'pyth-network' }, { symbol: 'JUP', id: 'jupiter-exchange-solana' },
  { symbol: 'RNDR', id: 'render-token' }, { symbol: 'WBTC', id: 'wrapped-bitcoin' },
  { symbol: 'WETH', id: 'weth' },
]

;(async () => {
  const ids = TICKER_MAP.map(t => t.id).join(',')
  const url = `https://pro-api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
  const res = await fetch(url, {
    headers: { 'x-cg-pro-api-key': process.env.COINGECKO_API_KEY },
  })
  if (!res.ok) {
    console.error('CG fetch failed', res.status, await res.text())
    return
  }
  const data = await res.json()
  let inserted = 0, skipped = 0
  const now = new Date().toISOString()
  for (const t of TICKER_MAP) {
    const pd = data[t.id]
    if (!pd?.usd) { skipped++; continue }
    const { error } = await sb.from('price_snapshots').insert({
      ticker: t.symbol,
      timestamp: now,
      price_usd: pd.usd,
      market_cap: pd.usd_market_cap || null,
      volume_24h: pd.usd_24h_vol || null,
      price_change_24h: pd.usd_24h_change || null,
    })
    if (error) console.error('insert', t.symbol, error.message)
    else inserted++
  }
  console.log(`Inserted ${inserted}, skipped ${skipped}`)
  console.log(`Spot check: BTC=$${data.bitcoin?.usd}, UNI=$${data.uniswap?.usd}, ETH=$${data.ethereum?.usd}`)
})()
