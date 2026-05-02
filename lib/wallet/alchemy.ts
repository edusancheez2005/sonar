import 'server-only'
import type { Chain, Holding } from './types'
import { STABLECOINS } from './types'

// Heuristic: many airdrop-spam tokens hide their nature in their NAME or
// SYMBOL with claim instructions, URLs, or visit-prompts. We hard-drop any
// metadata that smells like that so the portfolio panel is not polluted.
function isSpamToken(symbol: string, name: string): boolean {
  const s = `${symbol || ''} ${name || ''}`.toLowerCase()
  return (
    /https?:\/\//.test(s) ||
    /\bclaim\b/.test(s) ||
    /\bvisit\b/.test(s) ||
    /\baccess\b/.test(s) ||
    /\.com\b|\.io\b|\.xyz\b|\.app\b|\.me\b|\.org\b/.test(s) ||
    /\bairdrop\b/.test(s) ||
    /t\.me\//.test(s) ||
    /\$\s*\d/.test(s) // "$1500 reward"
  )
}

const ALCHEMY_NETWORKS: Partial<Record<Chain, string>> = {
  ethereum: 'eth-mainnet',
  polygon: 'polygon-mainnet',
  arbitrum: 'arb-mainnet',
  base: 'base-mainnet',
  optimism: 'opt-mainnet',
}

const NATIVE_SYMBOL: Partial<Record<Chain, { symbol: string; name: string; decimals: number; coingeckoId: string }>> = {
  ethereum: { symbol: 'ETH', name: 'Ether', decimals: 18, coingeckoId: 'ethereum' },
  polygon: { symbol: 'MATIC', name: 'Polygon', decimals: 18, coingeckoId: 'matic-network' },
  arbitrum: { symbol: 'ETH', name: 'Ether', decimals: 18, coingeckoId: 'ethereum' },
  base: { symbol: 'ETH', name: 'Ether', decimals: 18, coingeckoId: 'ethereum' },
  optimism: { symbol: 'ETH', name: 'Ether', decimals: 18, coingeckoId: 'ethereum' },
}

function rpcUrl(chain: Chain): string | null {
  const net = ALCHEMY_NETWORKS[chain]
  const key = process.env.ALCHEMY_API_KEY
  if (!net || !key) return null
  return `https://${net}.g.alchemy.com/v2/${key}`
}

async function jsonRpc(url: string, method: string, params: any[]): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method, params }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Alchemy ${method} failed: ${res.status}`)
  const j = await res.json()
  if (j.error) throw new Error(`Alchemy ${method}: ${j.error.message}`)
  return j.result
}

function fromHexBalance(hex: string, decimals: number): { decimal: string; numeric: number } {
  if (!hex) return { decimal: '0', numeric: 0 }
  let n: bigint
  try { n = BigInt(hex) } catch { return { decimal: '0', numeric: 0 } }
  if (n === 0n) return { decimal: '0', numeric: 0 }
  const divisor = 10n ** BigInt(decimals)
  const whole = n / divisor
  const frac = n % divisor
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  const decimal = fracStr ? `${whole}.${fracStr}` : whole.toString()
  return { decimal, numeric: Number(decimal) }
}

interface CoingeckoPrice { [contract: string]: { usd?: number } }

async function priceForContracts(
  chain: Chain,
  contracts: string[]
): Promise<Record<string, number>> {
  if (contracts.length === 0) return {}
  const platform = chain === 'ethereum' ? 'ethereum'
    : chain === 'polygon' ? 'polygon-pos'
    : chain === 'arbitrum' ? 'arbitrum-one'
    : chain === 'base' ? 'base'
    : chain === 'optimism' ? 'optimistic-ethereum'
    : null
  if (!platform) return {}
  const out: Record<string, number> = {}
  // Chunk to keep URL under limit
  for (let i = 0; i < contracts.length; i += 50) {
    const chunk = contracts.slice(i, i + 50).map((c) => c.toLowerCase())
    const url = `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${chunk.join(',')}&vs_currencies=usd`
    try {
      const res = await fetch(url, { next: { revalidate: 60 } } as any)
      if (!res.ok) continue
      const j: CoingeckoPrice = await res.json()
      for (const [addr, v] of Object.entries(j)) {
        if (typeof v?.usd === 'number') out[addr.toLowerCase()] = v.usd
      }
    } catch { /* ignore */ }
  }
  return out
}

async function priceForCoingeckoId(id: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`, {
      next: { revalidate: 60 },
    } as any)
    if (!res.ok) return null
    const j = await res.json()
    return j?.[id]?.usd ?? null
  } catch { return null }
}

export async function getEvmHoldings(chain: Chain, address: string): Promise<Holding[]> {
  const url = rpcUrl(chain)
  if (!url) return []
  const native = NATIVE_SYMBOL[chain]
  const out: Holding[] = []

  // 1. Native balance
  try {
    const hex: string = await jsonRpc(url, 'eth_getBalance', [address, 'latest'])
    const { decimal, numeric } = fromHexBalance(hex, native!.decimals)
    if (numeric > 0) {
      const price = await priceForCoingeckoId(native!.coingeckoId)
      out.push({
        symbol: native!.symbol,
        name: native!.name,
        contract: null,
        balance: decimal,
        decimals: native!.decimals,
        price_usd: price,
        value_usd: price ? numeric * price : 0,
        logo: null,
      })
    }
  } catch { /* ignore */ }

  // 2. ERC-20 balances
  let tokenBalances: Array<{ contractAddress: string; tokenBalance: string }> = []
  try {
    const result = await jsonRpc(url, 'alchemy_getTokenBalances', [address, 'erc20'])
    tokenBalances = (result?.tokenBalances || []).filter((t: any) => t.tokenBalance && t.tokenBalance !== '0x0' && t.tokenBalance !== '0x')
  } catch { /* ignore */ }

  // 3. Metadata in parallel (cap to top 60 by length to control cost)
  const sliced = tokenBalances.slice(0, 60)
  const metas = await Promise.all(sliced.map(async (t) => {
    try {
      const m = await jsonRpc(url, 'alchemy_getTokenMetadata', [t.contractAddress])
      return { ...t, meta: m }
    } catch {
      return { ...t, meta: null }
    }
  }))

  const contracts = metas.map((m) => m.contractAddress)
  const prices = await priceForContracts(chain, contracts)

  for (const t of metas) {
    if (!t.meta) continue
    const decimals = Number(t.meta.decimals ?? 18)
    const { decimal, numeric } = fromHexBalance(t.tokenBalance, decimals)
    if (numeric <= 0) continue
    const symbol = (t.meta.symbol || '').toUpperCase()
    const name = t.meta.name || t.meta.symbol || 'Unknown'
    if (isSpamToken(symbol, name)) continue
    let price = prices[t.contractAddress.toLowerCase()] ?? null
    // Fallback: known stablecoins are pegged to $1. CoinGecko occasionally
    // misses the per-network contract listing (e.g. native USDC on Polygon),
    // so without this the panel showed a real $53 USDC balance as $0 and
    // filtered it out as dust.
    if (price == null && STABLECOINS.has(symbol)) {
      price = 1
    }
    const value = price ? numeric * price : 0
    out.push({
      symbol,
      name,
      contract: t.contractAddress.toLowerCase(),
      balance: decimal,
      decimals,
      price_usd: price,
      value_usd: value,
      logo: t.meta.logo || null,
    })
  }

  return out
}
