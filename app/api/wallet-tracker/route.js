import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'

const VALID_SORT = ['smart_money_score', 'total_volume_usd_30d', 'portfolio_value_usd', 'pnl_estimated_usd']
const VALID_CHAINS = ['ethereum', 'bitcoin', 'solana', 'polygon', 'arbitrum', 'base']

const BLACKLIST = [
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead',
]

export async function GET(req) {
  const ip = getClientIp(req)
  const rl = rateLimit(`wallet-tracker:${ip}`, 60, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { searchParams } = new URL(req.url)
  const sortBy = VALID_SORT.includes(searchParams.get('sort_by'))
    ? searchParams.get('sort_by')
    : 'smart_money_score'
  const chain = searchParams.get('chain') || null
  if (chain && !VALID_CHAINS.includes(chain)) {
    return NextResponse.json({ error: 'Invalid chain' }, { status: 400 })
  }
  const ascending = searchParams.get('sort_asc') === '1'
  const limitRaw = parseInt(searchParams.get('limit') || '50', 10)
  const limit = Math.min(Math.max(1, limitRaw), 100)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const from = (page - 1) * limit
  const to = from + limit - 1

  // Get total count
  let countQuery = supabaseAdmin
    .from('wallet_profiles')
    .select('*', { count: 'exact', head: true })
    .not('address', 'in', `(${BLACKLIST.join(',')})`)
    .gte('tx_count_30d', 10)

  if (chain) {
    countQuery = countQuery.eq('chain', chain)
  }

  const { count } = await countQuery

  // Get page data
  let query = supabaseAdmin
    .from('wallet_profiles')
    .select('*')
    .not('address', 'in', `(${BLACKLIST.join(',')})`)
    .gte('tx_count_30d', 10)
    .order(sortBy, { ascending })
    .range(from, to)

  if (chain) {
    query = query.eq('chain', chain)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich with entity labels from addresses table for wallets missing entity_name
  const unlabeled = (data || []).filter(w => !w.entity_name).map(w => w.address)
  if (unlabeled.length > 0) {
    const { data: labels } = await supabaseAdmin
      .from('addresses')
      .select('address, entity_name')
      .in('address', unlabeled)
      .not('entity_name', 'is', null)
      .not('entity_name', 'eq', '')

    if (labels && labels.length > 0) {
      const labelMap = new Map()
      for (const l of labels) {
        const existing = labelMap.get(l.address)
        if (!existing || l.entity_name.length > existing.length) {
          labelMap.set(l.address, l.entity_name)
        }
      }
      for (const wallet of data) {
        if (!wallet.entity_name && labelMap.has(wallet.address)) {
          wallet.entity_name = labelMap.get(wallet.address)
        }
      }
    }
  }

  const totalPages = Math.ceil((count || 0) / limit)

  return NextResponse.json(
    { data, page, limit, total: count || 0, total_pages: totalPages, sort_by: sortBy },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
  )
}
