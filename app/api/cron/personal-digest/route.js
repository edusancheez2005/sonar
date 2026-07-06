/**
 * CRON: Personal "Your whales moved" digest
 * Schedule: daily at 13:00 UTC (vercel.json).
 *
 * For every user who FOLLOWS at least one wallet, emails them the trades
 * their followed wallets made in the last 24h — but only when there is at
 * least one move (never an empty digest). This is the retention loop:
 * following a whale becomes worth something because it comes back to you.
 *
 * Respects notification_style: users set to 'quiet' are skipped.
 * user_digest_state guards against double-sends (daily run + manual test).
 *
 * Manual run: GET /api/cron/personal-digest?secret=<CRON_SECRET>
 * Dry run (no emails, just counts): add &dry=1
 */

import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { sendPersonalDigest } from '@/app/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const DIGEST_MIN_GAP_MS = 20 * 3600 * 1000 // don't re-send within 20h

export async function GET(request) {
  const url = new URL(request.url)
  const auth = request.headers.get('authorization')?.replace('Bearer ', '')
  const secretOk =
    auth === process.env.CRON_SECRET ||
    (url.searchParams.get('secret') && url.searchParams.get('secret') === process.env.CRON_SECRET)
  if (!process.env.CRON_SECRET || !secretOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const dry = url.searchParams.get('dry') === '1'

  // 1. Everyone who follows at least one wallet
  const { data: follows, error: followErr } = await supabaseAdmin
    .from('wallet_follows')
    .select('user_id, address, nickname')
  if (followErr) return NextResponse.json({ error: followErr.message }, { status: 500 })
  if (!follows || follows.length === 0) {
    return NextResponse.json({ ok: true, users_with_follows: 0, sent: 0 })
  }

  const followsByUser = new Map()
  const allAddresses = new Set()
  for (const f of follows) {
    if (!followsByUser.has(f.user_id)) followsByUser.set(f.user_id, new Map())
    followsByUser.get(f.user_id).set(f.address, f.nickname || null)
    allAddresses.add(f.address)
  }

  // 2. Last 24h of BUY/SELL trades for every followed address (one query)
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { data: txs } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('whale_address, token_symbol, classification, usd_value, timestamp')
    .in('whale_address', [...allAddresses])
    .in('classification', ['BUY', 'SELL'])
    .gte('timestamp', since)
    .order('usd_value', { ascending: false })

  const txByAddress = new Map()
  for (const t of txs || []) {
    if (!txByAddress.has(t.whale_address)) txByAddress.set(t.whale_address, [])
    txByAddress.get(t.whale_address).push(t)
  }

  // 3. Display names for the addresses that actually moved
  const movedAddresses = [...txByAddress.keys()]
  const nameByAddress = new Map()
  if (movedAddresses.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from('wallet_profiles')
      .select('address, entity_name')
      .in('address', movedAddresses)
    for (const p of profiles || []) {
      if (p.entity_name) nameByAddress.set(p.address, p.entity_name)
    }
    const unlabeled = movedAddresses.filter((a) => !nameByAddress.has(a))
    if (unlabeled.length > 0) {
      const { data: labels } = await supabaseAdmin
        .from('addresses')
        .select('address, entity_name')
        .in('address', unlabeled)
        .not('entity_name', 'is', null)
        .not('entity_name', 'eq', '')
      for (const l of labels || []) {
        if (!nameByAddress.has(l.address)) nameByAddress.set(l.address, l.entity_name)
      }
    }
  }
  const shortAddr = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`

  // 4. Quiet-hours opt-out
  const { data: quietRows } = await supabaseAdmin
    .from('user_profile')
    .select('user_id')
    .eq('notification_style', 'quiet')
  const quietUsers = new Set((quietRows || []).map((r) => r.user_id))

  // 5. Don't re-send within the gap window
  const { data: stateRows } = await supabaseAdmin
    .from('user_digest_state')
    .select('user_id, last_digest_at')
  const lastSentByUser = new Map((stateRows || []).map((r) => [r.user_id, r.last_digest_at]))

  let sent = 0
  let skippedQuiet = 0
  let skippedNoMoves = 0
  let skippedRecent = 0
  let eligible = 0

  for (const [userId, addrMap] of followsByUser) {
    if (quietUsers.has(userId)) { skippedQuiet++; continue }

    const last = lastSentByUser.get(userId)
    if (last && Date.now() - new Date(last).getTime() < DIGEST_MIN_GAP_MS) { skippedRecent++; continue }

    // Collect this user's followed-wallet moves
    const moves = []
    for (const addr of addrMap.keys()) {
      const list = txByAddress.get(addr)
      if (!list) continue
      for (const t of list) {
        moves.push({
          address: addr,
          display_name: addrMap.get(addr) || nameByAddress.get(addr) || shortAddr(addr),
          classification: t.classification,
          token: t.token_symbol,
          usd_value: t.usd_value,
          timestamp: t.timestamp,
        })
      }
    }
    if (moves.length === 0) { skippedNoMoves++; continue }
    moves.sort((a, b) => (Number(b.usd_value) || 0) - (Number(a.usd_value) || 0))
    eligible++

    if (dry) continue

    // Resolve email from auth.users
    let email = null
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId)
      email = u?.user?.email || null
    } catch { /* skip on lookup failure */ }
    if (!email) continue

    const ok = await sendPersonalDigest(email, { moves, totalCount: moves.length })
    if (ok) {
      sent++
      await supabaseAdmin
        .from('user_digest_state')
        .upsert({ user_id: userId, last_digest_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    }
  }

  return NextResponse.json({
    ok: true,
    dry,
    users_with_follows: followsByUser.size,
    eligible,
    sent,
    skipped: { quiet: skippedQuiet, no_moves: skippedNoMoves, recent: skippedRecent },
  })
}
