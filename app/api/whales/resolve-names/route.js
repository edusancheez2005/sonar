import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/whales/resolve-names
 * Batch-resolve whale addresses to entity names.
 * Query params:
 *   - addresses: comma-separated list of addresses (max 100)
 * Returns: { [address]: { entity_name, label, address_type, category } }
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const addressesParam = searchParams.get('addresses') || ''
    const addresses = addressesParam
      .split(',')
      .map(a => a.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 100)

    if (addresses.length === 0) {
      return NextResponse.json({ names: {} })
    }

    const { data, error } = await supabaseAdmin
      .from('addresses')
      .select('address, entity_name, label, address_type, analysis_tags')
      .in('address', addresses)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const names = {}
    for (const row of data || []) {
      const tags = row.analysis_tags || {}
      names[row.address] = {
        entity_name: row.entity_name,
        label: row.label,
        address_type: row.address_type,
        category: tags.category || null,
        is_famous: tags.is_famous || false,
      }
    }

    return NextResponse.json(
      { names },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (err) {
    console.error('Resolve names error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
