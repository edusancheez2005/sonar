import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { readGuestWallet, writeGuestWallet } from '@/app/lib/guestWalletCookie'
import { canonicalSymbol } from '@/lib/wallet/symbol-aliases'

export const dynamic = 'force-dynamic'

async function listTokens(req: Request) {
  const user = await getUserFromRequest(req)
  if (user) {
    const { data, error } = await supabaseAdmin
      .from('user_portfolio_tokens')
      .select('symbol, source, added_at')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })
    if (error) throw new Error(error.message)
    return { tokens: data || [], guest: false, user }
  }
  const guest = await readGuestWallet()
  const tokens = (guest?.tokens || []).map((symbol) => ({
    symbol,
    source: 'detected',
    added_at: null,
  }))
  return { tokens, guest: true, user: null, guestWallet: guest }
}

export async function GET(req: Request) {
  const ip = getClientIp(req as any)
  const rl = rateLimit(`portfolio-tokens-get:${ip}`, 120, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)
  try {
    const out = await listTokens(req)
    return NextResponse.json({ data: out.tokens, guest: out.guest })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const ip = getClientIp(req as any)
  const rl = rateLimit(`portfolio-tokens-post:${ip}`, 60, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const symbol = canonicalSymbol(String(body?.symbol || ''))
  if (!symbol || symbol.length > 20) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }

  const user = await getUserFromRequest(req)
  if (user) {
    const { error } = await supabaseAdmin
      .from('user_portfolio_tokens')
      .upsert(
        { user_id: user.id, symbol, source: 'manual' },
        { onConflict: 'user_id,symbol', ignoreDuplicates: false }
      )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, symbol })
  }

  const guest = await readGuestWallet()
  if (!guest) {
    return NextResponse.json({ error: 'No active session — connect a wallet first' }, { status: 401 })
  }
  const tokens = Array.from(new Set([...(guest.tokens || []), symbol]))
  await writeGuestWallet({ ...guest, tokens })
  return NextResponse.json({ ok: true, symbol, guest: true })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = canonicalSymbol(searchParams.get('symbol'))
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

  const user = await getUserFromRequest(req)
  if (user) {
    const { error } = await supabaseAdmin
      .from('user_portfolio_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('symbol', symbol)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const guest = await readGuestWallet()
  if (!guest) return NextResponse.json({ error: 'No active session' }, { status: 401 })
  const tokens = (guest.tokens || []).filter((s) => s !== symbol)
  await writeGuestWallet({ ...guest, tokens })
  return NextResponse.json({ ok: true, guest: true })
}
