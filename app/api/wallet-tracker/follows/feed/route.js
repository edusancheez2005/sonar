import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { addressVariants, canonicalAddress } from '@/lib/wallet/addressVariants'
import { loadNativePrices, transferUsd } from '@/lib/wallet/transferValue'
import { FAMOUS_WALLETS } from '@/lib/onboarding/famousWallets'

// ?include=transfers adds USD-valued transfers from the tracked-address poller
// (tracked_address_transfers). Famous wallets — exchanges, market makers,
// founders — rarely appear as the BUY/SELL whale on the tape, so without this
// "Your whales" stayed "All quiet" for them while their alerts fired.
const TRANSFER_MIN_USD = 1_000
const TRANSFER_ADDR_CAP = 25
const TRANSFER_PER_WALLET = 5
// Picker follows carry the figure's name; use its alert floor so an exchange
// hot wallet's $1K shuffles do not bury a founder's rare move.
const FLOOR_BY_NAME = new Map(FAMOUS_WALLETS.map((w) => [w.name, w.minUsd]))

async function recentTrackedMoves(follows, sinceIso) {
  const out = []
  const list = follows.slice(0, TRANSFER_ADDR_CAP)
  if (list.length === 0) return out
  const prices = await loadNativePrices(supabaseAdmin)
  await Promise.all(list.map(async (f) => {
    try {
      const floor = FLOOR_BY_NAME.get(f.nickname) ?? TRANSFER_MIN_USD
      let q = supabaseAdmin
        .from('tracked_address_transfers')
        .select('tx_hash, chain, contract, direction, amount, amount_usd, token_symbol, timestamp')
        .in('address', addressVariants(f.address))
        .gte('timestamp', sinceIso)
      // A busy wallet's 50 newest rows are mostly small; for a high floor ask
      // for rows that can clear it: valued ones, native coins (priced here)
      // and token amounts big enough to be allowlisted stablecoins.
      if (floor > TRANSFER_MIN_USD) q = q.or(`amount_usd.gte.${floor},contract.eq."",amount.gte.${floor}`)
      const { data } = await q.order('timestamp', { ascending: false }).limit(50)
      let kept = 0
      for (const r of data || []) {
        if (kept >= TRANSFER_PER_WALLET) break
        const usd = transferUsd(r, prices)
        if (usd === null || usd < floor) continue
        kept += 1
        out.push({
          whale_address: f.address,
          token_symbol: r.token_symbol || null,
          classification: r.direction === 'in' ? 'RECEIVE' : 'SEND',
          usd_value: usd,
          blockchain: r.chain,
          timestamp: r.timestamp,
          transaction_hash: r.tx_hash,
          nickname: f.nickname || null,
        })
      }
    } catch { /* one address failing must not empty the feed */ }
  }))
  return out
}

async function getUserFromRequest(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user || null
}

export async function GET(req) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get followed addresses
  const { data: follows } = await supabaseAdmin
    .from('wallet_follows')
    .select('address, nickname')
    .eq('user_id', user.id)

  if (!follows || follows.length === 0) {
    return NextResponse.json({ data: [], wallets: [] })
  }

  // One entry per wallet: the same wallet may be followed in two spellings
  // (checksummed from a wallet page, lower-case from the welcome picker).
  const followByCanon = new Map()
  for (const f of follows) {
    const k = canonicalAddress(f.address)
    const prev = followByCanon.get(k)
    if (!prev || (!prev.nickname && f.nickname)) followByCanon.set(k, f)
  }
  const uniqueFollows = Array.from(followByCanon.values())
  const addresses = uniqueFollows.map(f => f.address)
  const nicknameMap = new Map(uniqueFollows.map(f => [f.address, f.nickname]))
  // The whale tape stores EVM addresses lower-case; follows may be checksummed.
  const tapeKeys = Array.from(followByCanon.keys())
  const lookupKeys = Array.from(new Set([...tapeKeys, ...addresses]))
  const toFollowed = (addr) => followByCanon.get(canonicalAddress(addr))?.address || addr

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100)
  const include = String(searchParams.get('include') || '').split(',')
  const now = Date.now()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  const dayAgo = new Date(now - 24 * 3600 * 1000).toISOString()

  // Every read is independent: run them side by side (they used to run one
  // after another — ~9s for a user following exchange wallets). The tape read
  // is bounded to 7 days so the planner can use the timestamp index.
  const [profilesRes, labelsRes, tapeRes, sparkRes, moves] = await Promise.all([
    supabaseAdmin
      .from('wallet_profiles')
      .select('address, entity_name, smart_money_score, tags, total_volume_usd_30d, last_active, chain')
      .in('address', lookupKeys),
    supabaseAdmin
      .from('addresses')
      .select('address, entity_name')
      .in('address', lookupKeys)
      .not('entity_name', 'is', null)
      .not('entity_name', 'eq', '')
      .limit(500),
    supabaseAdmin
      .from('all_whale_transactions')
      .select('whale_address, token_symbol, classification, usd_value, blockchain, timestamp, transaction_hash')
      .in('whale_address', tapeKeys)
      .in('classification', ['BUY', 'SELL'])
      .gte('timestamp', sevenDaysAgo)
      .order('timestamp', { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from('all_whale_transactions')
      .select('whale_address, timestamp, usd_value')
      .in('whale_address', tapeKeys)
      .gte('timestamp', sevenDaysAgo),
    include.includes('transfers') ? recentTrackedMoves(uniqueFollows, dayAgo) : Promise.resolve([]),
  ])

  // Profiles and labels keyed by the address as the user follows it.
  const profileMap = new Map()
  for (const p of profilesRes?.data || []) {
    const key = toFollowed(p.address)
    if (!profileMap.has(key) || (!profileMap.get(key).entity_name && p.entity_name)) profileMap.set(key, p)
  }
  const labelMap = new Map()
  for (const l of labelsRes?.data || []) {
    const key = toFollowed(l.address)
    if (!labelMap.has(key)) labelMap.set(key, l.entity_name)
  }

  // Build wallet cards (include addresses without profiles too)
  const wallets = addresses.map(addr => {
    const p = profileMap.get(addr)
    return {
      address: addr,
      nickname: nicknameMap.get(addr) || null,
      entity_name: p?.entity_name || labelMap.get(addr) || null,
      smart_money_score: p?.smart_money_score || null,
      tags: p?.tags || [],
      total_volume_usd_30d: p?.total_volume_usd_30d || null,
      last_active: p?.last_active || null,
      chain: p?.chain || null,
    }
  })

  // Key tape rows back to the address as the user follows it.
  const txs = (tapeRes?.data || []).map(tx => ({ ...tx, whale_address: toFollowed(tx.whale_address) }))

  let feed = txs.map(tx => ({
    ...tx,
    nickname: nicknameMap.get(tx.whale_address) || null,
    entity_name: profileMap.get(tx.whale_address)?.entity_name || labelMap.get(tx.whale_address) || null,
    smart_money_score: profileMap.get(tx.whale_address)?.smart_money_score || null,
  }))

  if (moves.length > 0) {
    const seenHashes = new Set(feed.map(t => String(t.transaction_hash || '').toLowerCase()))
    for (const m of moves) {
      const h = String(m.transaction_hash || '').toLowerCase()
      if (seenHashes.has(h)) continue
      seenHashes.add(h)
      feed.push({ ...m, entity_name: profileMap.get(m.whale_address)?.entity_name || labelMap.get(m.whale_address) || null, smart_money_score: null })
    }
    feed = feed
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  // Sparkline per wallet (last 7 days)
  const sparklines = {}
  for (const addr of addresses) sparklines[addr] = [0, 0, 0, 0, 0, 0, 0]
  for (const raw of sparkRes?.data || []) {
    const addr = toFollowed(raw.whale_address)
    if (!sparklines[addr]) continue
    const daysAgo = Math.floor((now - new Date(raw.timestamp).getTime()) / (24 * 60 * 60 * 1000))
    const idx = 6 - Math.min(daysAgo, 6)
    sparklines[addr][idx] += Math.abs(Number(raw.usd_value) || 0)
  }

  // Last trade per wallet
  const lastTrades = {}
  for (const tx of txs) {
    if (!lastTrades[tx.whale_address]) {
      lastTrades[tx.whale_address] = {
        token: tx.token_symbol,
        action: tx.classification,
        usd_value: tx.usd_value,
        timestamp: tx.timestamp,
      }
    }
  }

  // Attach sparklines and last trade to wallet cards
  for (const w of wallets) {
    w.sparkline = sparklines[w.address] || [0, 0, 0, 0, 0, 0, 0]
    w.last_trade = lastTrades[w.address] || null
  }

  return NextResponse.json({ wallets, feed })
}
