import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET(req) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }
  const { searchParams } = new URL(req.url)
  const sinceHours = Number(searchParams.get('sinceHours') || '24')
  const rawMin = searchParams.get('minUsd')
  const rawMax = searchParams.get('maxUsd')
  const token = (searchParams.get('token') || '').trim()
  const side = (searchParams.get('side') || '').trim().toLowerCase()
  const chain = (searchParams.get('chain') || '').trim()
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limitRaw = parseInt(searchParams.get('limit') || '200', 10)
  const limit = Math.min(Math.max(1, limitRaw), 200)
  const from = (page - 1) * limit
  const to = from + limit - 1

  let q = supabaseAdmin
    .from('whale_transactions')
    .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,from_address,whale_score', { count: 'estimated' })
    .not('token_symbol', 'is', null)
    .not('token_symbol', 'ilike', 'unknown%')

  if (!Number.isNaN(sinceHours) && sinceHours > 0) {
    const sinceIso = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString()
    q = q.gte('timestamp', sinceIso)
  }
  const minUsd = rawMin === null || rawMin === '' ? undefined : Number(rawMin)
  const maxUsd = rawMax === null || rawMax === '' ? undefined : Number(rawMax)
  if (typeof minUsd === 'number' && !Number.isNaN(minUsd)) q = q.gte('usd_value', minUsd)
  if (typeof maxUsd === 'number' && !Number.isNaN(maxUsd)) q = q.lte('usd_value', maxUsd)
  if (token) q = q.ilike('token_symbol', `%${token}%`)
  if (side) q = q.ilike('classification', side)
  if (chain) q = q.ilike('blockchain', `%${chain}%`)

  const { data, error, count } = await q.order('timestamp', { ascending: false }).range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, page, limit, count })
} 