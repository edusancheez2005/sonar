import 'server-only'
import type { Holding } from './types'
import { cgRequest } from '@/lib/coingecko/client'

export async function getBitcoinHoldings(address: string): Promise<Holding[]> {
  // A failed read ≠ empty wallet: throwing (instead of returning []) keeps
  // callers from presenting and caching fake $0 portfolios when mempool.space
  // is down or rate-limiting — same fix as the Alchemy/Helius providers.
  let j: any
  try {
    const res = await fetch(`https://mempool.space/api/address/${address}`, { next: { revalidate: 60 } } as any)
    if (!res.ok) throw new Error(`mempool.space ${res.status}`)
    j = await res.json()
  } catch {
    throw new Error('btc_unavailable:bitcoin')
  }
  const funded = Number(j?.chain_stats?.funded_txo_sum || 0)
  const spent = Number(j?.chain_stats?.spent_txo_sum || 0)
  const sats = funded - spent
  if (sats <= 0) return []
  const btc = sats / 1e8
  let price: number | null = null
  try {
    const cg = cgRequest('/simple/price?ids=bitcoin&vs_currencies=usd')
    const p = await fetch(cg.url, { headers: cg.headers, next: { revalidate: 60 } } as any)
    if (p.ok) {
      const pj = await p.json()
      price = pj?.bitcoin?.usd ?? null
    }
  } catch { /* ignore */ }
  return [{
    symbol: 'BTC',
    name: 'Bitcoin',
    contract: null,
    balance: btc.toString(),
    decimals: 8,
    price_usd: price,
    value_usd: price ? btc * price : 0,
    logo: null,
  }]
}
