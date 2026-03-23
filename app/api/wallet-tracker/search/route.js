import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET(req) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ data: [] })
  }

  const pattern = `%${q}%`

  // Search wallet_profiles by address and entity_name
  const { data: profiles, error: profileErr } = await supabaseAdmin
    .from('wallet_profiles')
    .select('address, entity_name, chain, smart_money_score, tags')
    .or(`address.ilike.${pattern},entity_name.ilike.${pattern}`)
    .limit(20)

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  // Also search addresses table for entity matches
  const { data: entities, error: entityErr } = await supabaseAdmin
    .from('addresses')
    .select('address, entity_name, blockchain')
    .ilike('entity_name', pattern)
    .limit(20)

  if (entityErr) {
    // Non-fatal — just use profiles
    return NextResponse.json(
      { data: profiles || [] },
      { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } }
    )
  }

  // Merge and deduplicate
  const seen = new Set()
  const results = []

  for (const p of profiles || []) {
    if (!seen.has(p.address)) {
      seen.add(p.address)
      results.push({ ...p, source: 'wallet_profiles' })
    }
  }

  for (const e of entities || []) {
    if (!seen.has(e.address)) {
      seen.add(e.address)
      results.push({
        address: e.address,
        entity_name: e.entity_name,
        chain: e.blockchain,
        source: 'addresses',
      })
    }
  }

  return NextResponse.json(
    { data: results.slice(0, 30) },
    { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } }
  )
}
