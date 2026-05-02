import 'server-only'
import type { Holding } from './types'

export async function getBitcoinHoldings(address: string): Promise<Holding[]> {
  try {
    const res = await fetch(`https://mempool.space/api/address/${address}`, { next: { revalidate: 60 } } as any)
    if (!res.ok) return []
    const j = await res.json()
    const funded = Number(j?.chain_stats?.funded_txo_sum || 0)
    const spent = Number(j?.chain_stats?.spent_txo_sum || 0)
    const sats = funded - spent
    if (sats <= 0) return []
    const btc = sats / 1e8
    let price: number | null = null
    try {
      const p = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { next: { revalidate: 60 } } as any)
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
  } catch {
    return []
  }
}
