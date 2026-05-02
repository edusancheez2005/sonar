import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'
import { ADDRESS_RE, isSupportedChain, getUserFromRequest } from '@/app/lib/walletAuth'
import { readGuestWallet, writeGuestWallet } from '@/app/lib/guestWalletCookie'
import { canonicalSymbol } from '@/lib/wallet/symbol-aliases'
import { STABLECOINS } from '@/lib/wallet/types'

export const dynamic = 'force-dynamic'

const DETECTION_THRESHOLD_USD = 25
const TOP_N = 10

async function fetchPortfolio(req: Request, address: string, chain: string) {
  const url = new URL(req.url)
  const portfolioUrl = `${url.origin}/api/wallet/${address}/portfolio?chain=${chain}`
  const res = await fetch(portfolioUrl, { cache: 'no-store' })
  if (!res.ok) throw new Error(`portfolio fetch failed: ${res.status}`)
  return res.json()
}

export async function POST(req: Request) {
  const ip = getClientIp(req as any)
  const rl = rateLimit(`wallet-personalize:${ip}`, 30, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const address = String(body?.address || '').trim()
  const chain = String(body?.chain || '').trim().toLowerCase()
  if (!ADDRESS_RE.test(address)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
  if (!isSupportedChain(chain)) return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 })

  const user = await getUserFromRequest(req)

  // If signed in, ensure the wallet either belongs to the user OR is unowned (guest add).
  if (user) {
    const { data: identity } = await supabaseAdmin
      .from('wallet_identities')
      .select('user_id')
      .eq('address', address.toLowerCase())
      .eq('chain', chain)
      .maybeSingle()
    if (identity && identity.user_id && identity.user_id !== user.id) {
      return NextResponse.json({ error: 'Wallet linked to another account' }, { status: 403 })
    }
  }

  let portfolio: any
  try {
    portfolio = await fetchPortfolio(req, address, chain)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'portfolio fetch failed' }, { status: 502 })
  }

  const holdings: any[] = portfolio?.holdings || []
  const detected = holdings
    .filter((h) => Number(h.value_usd) >= DETECTION_THRESHOLD_USD)
    .filter((h) => !STABLECOINS.has(String(h.symbol || '').toUpperCase()))
    .slice(0, TOP_N)
    .map((h) => canonicalSymbol(h.symbol))
    .filter((s): s is string => !!s)

  if (user) {
    if (detected.length > 0) {
      const rows = detected.map((symbol) => ({
        user_id: user.id,
        symbol,
        source: 'detected',
      }))
      await supabaseAdmin
        .from('user_portfolio_tokens')
        .upsert(rows, { onConflict: 'user_id,symbol', ignoreDuplicates: true })
    }
    const { data } = await supabaseAdmin
      .from('user_portfolio_tokens')
      .select('symbol, source')
      .eq('user_id', user.id)
    return NextResponse.json({ tokens: data || [], detected })
  }

  // Guest path
  const prev = (await readGuestWallet()) || { address, chain, tokens: [] as string[] }
  const merged = Array.from(new Set([...(prev.tokens || []), ...detected]))
  await writeGuestWallet({ address, chain, tokens: merged })
  return NextResponse.json({
    tokens: merged.map((s) => ({ symbol: s, source: 'detected' })),
    detected,
    guest: true,
  })
}
