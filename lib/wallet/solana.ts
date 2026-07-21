import 'server-only'
import type { Holding } from './types'
import { cgRequest } from '@/lib/coingecko/client'

// Solana live holdings via the SAME Alchemy key as the EVM chains (Helius was
// never provisioned — HELIUS_API_KEY doesn't exist in prod, which rendered
// every Solana wallet as a fake $0 portfolio until the 2026-07-21 audit).
//
// Token metadata + prices come from Jupiter's free lite API: it only knows
// tradeable tokens, so the thousands of airdrop-spam mints big wallets hold
// simply don't resolve — a natural spam filter. Prices are only trusted when
// the token has real liquidity, mirroring the CoinGecko 24h-volume floor on
// the EVM side.

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
const WSOL_MINT = 'So11111111111111111111111111111111111111112'
const MIN_LIQUIDITY_USD = 1000
const MAX_MINTS = 200 // exchange-scale wallets hold thousands of dust mints

async function rpc(url: string, method: string, params: any[]): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method, params }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Solana RPC ${method} failed: ${res.status}`)
  const j = await res.json()
  if (j.error) throw new Error(`Solana RPC ${method}: ${j.error.message}`)
  return j.result
}

interface JupToken {
  id?: string
  symbol?: string
  name?: string
  icon?: string
  usdPrice?: number
  liquidity?: number
}

export async function getSolanaHoldings(address: string): Promise<Holding[]> {
  const key = process.env.ALCHEMY_API_KEY
  // No key ≠ empty wallet — throw so callers surface an error state instead
  // of presenting (and caching) a fake $0 portfolio.
  if (!key) throw new Error('alchemy_unavailable:solana_no_key')
  const url = `https://solana-mainnet.g.alchemy.com/v2/${key}`
  const out: Holding[] = []
  let nativeOk = false
  let tokensOk = false

  // 1. Native SOL
  try {
    const result = await rpc(url, 'getBalance', [address])
    nativeOk = true
    const lamports = Number(result?.value || 0)
    if (lamports > 0) {
      const sol = lamports / 1e9
      const cg = cgRequest('/simple/price?ids=solana&vs_currencies=usd')
      const price = await fetch(cg.url, { headers: cg.headers, next: { revalidate: 60 } } as any)
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

  // 2. SPL token accounts (classic + Token-2022)
  const byMint = new Map<string, { balance: number; decimals: number }>()
  for (const programId of [TOKEN_PROGRAM, TOKEN_2022_PROGRAM]) {
    try {
      const result = await rpc(url, 'getTokenAccountsByOwner', [
        address,
        { programId },
        { encoding: 'jsonParsed' },
      ])
      tokensOk = true
      for (const acc of result?.value || []) {
        const info = acc?.account?.data?.parsed?.info
        const amt = info?.tokenAmount
        const ui = Number(amt?.uiAmount || 0)
        if (!info?.mint || ui <= 0) continue
        const prev = byMint.get(info.mint)
        byMint.set(info.mint, {
          balance: (prev?.balance || 0) + ui,
          decimals: Number(amt?.decimals ?? 0),
        })
      }
    } catch { /* ignore */ }
  }

  // Both core reads failed — provider down, bad key, or network not enabled
  // for this key. We know nothing about this wallet; don't present it as empty.
  if (!nativeOk && !tokensOk) {
    throw new Error('alchemy_unavailable:solana')
  }

  // 3. Metadata + prices from Jupiter (batched; unknown mints don't resolve)
  const mints = [...byMint.keys()].slice(0, MAX_MINTS)
  const meta = new Map<string, JupToken>()
  for (let i = 0; i < mints.length; i += 20) {
    const chunk = mints.slice(i, i + 20)
    try {
      const res = await fetch(
        `https://lite-api.jup.ag/tokens/v2/search?query=${chunk.join(',')}`,
        { cache: 'no-store' }
      )
      if (!res.ok) continue
      const j: JupToken[] = await res.json()
      for (const t of j || []) {
        if (t?.id) meta.set(t.id, t)
      }
    } catch { /* ignore */ }
  }

  for (const [mint, { balance, decimals }] of byMint) {
    const m = meta.get(mint)
    if (!m?.symbol) continue // unknown to Jupiter = untradeable spam
    const price = typeof m.usdPrice === 'number' && Number(m.liquidity || 0) >= MIN_LIQUIDITY_USD
      ? m.usdPrice
      : null
    // Jupiter labels the wrapped-SOL mint plain "SOL", which rendered as a
    // confusing second SOL row next to the native balance.
    const isWsol = mint === WSOL_MINT
    out.push({
      symbol: isWsol ? 'WSOL' : String(m.symbol).toUpperCase(),
      name: isWsol ? 'Wrapped SOL' : (m.name || m.symbol),
      contract: mint,
      balance: balance.toString(),
      decimals,
      price_usd: price,
      value_usd: price ? balance * price : 0,
      logo: m.icon || null,
    })
  }

  return out
}
