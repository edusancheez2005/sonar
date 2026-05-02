import 'server-only'
import type { Holding } from './types'

export async function getSolanaHoldings(address: string): Promise<Holding[]> {
  const key = process.env.HELIUS_API_KEY
  if (!key) return []
  const url = `https://mainnet.helius-rpc.com/?api-key=${key}`
  const out: Holding[] = []

  // 1. Native SOL via getBalance
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'getBalance', params: [address] }),
      cache: 'no-store',
    })
    const j = await res.json()
    const lamports = Number(j?.result?.value || 0)
    if (lamports > 0) {
      const sol = lamports / 1e9
      const price = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', { next: { revalidate: 60 } } as any)
        .then((r) => r.ok ? r.json() : null).then((j) => j?.solana?.usd ?? null).catch(() => null)
      out.push({
        symbol: 'SOL',
        name: 'Solana',
        contract: null,
        balance: sol.toString(),
        decimals: 9,
        price_usd: price,
        value_usd: price ? sol * price : 0,
        logo: null,
      })
    }
  } catch { /* ignore */ }

  // 2. Fungibles via DAS
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 2,
        jsonrpc: '2.0',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: address,
          page: 1,
          limit: 200,
          displayOptions: { showFungible: true, showNativeBalance: false },
        },
      }),
      cache: 'no-store',
    })
    const j = await res.json()
    const items: any[] = j?.result?.items || []
    for (const it of items) {
      const interface_ = it.interface
      // Only fungible tokens
      if (interface_ !== 'FungibleToken' && interface_ !== 'FungibleAsset') continue
      const ti = it.token_info || {}
      const decimals = Number(ti.decimals ?? 0)
      const rawBal = Number(ti.balance ?? 0)
      if (!rawBal || !decimals) continue
      const bal = rawBal / Math.pow(10, decimals)
      const price = ti.price_info?.price_per_token ?? null
      const value = price ? bal * price : 0
      out.push({
        symbol: (ti.symbol || it.content?.metadata?.symbol || '').toUpperCase(),
        name: it.content?.metadata?.name || ti.symbol || 'Unknown',
        contract: it.id || null,
        balance: bal.toString(),
        decimals,
        price_usd: price,
        value_usd: value,
        logo: it.content?.links?.image || null,
      })
    }
  } catch { /* ignore */ }

  return out.filter((h) => h.symbol)
}
