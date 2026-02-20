import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/whales/entities
 * Returns all named entities from the addresses table, grouped by entity_name.
 * Query params:
 *   - category: filter by analysis_tags->category (e.g., "individual", "institution", "exchange")
 *   - type: filter by address_type (e.g., "CEX", "DEX", "WHALE")
 *   - search: search entity_name (ilike)
 *   - limit: max results (default 100, max 500)
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)

    let query = supabaseAdmin
      .from('addresses')
      .select('address, blockchain, address_type, entity_name, label, confidence, signal_potential, analysis_tags, source')
      .not('entity_name', 'is', null)
      .order('entity_name')
      .limit(limit)

    if (type) {
      query = query.eq('address_type', type)
    }

    if (search) {
      query = query.ilike('entity_name', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by entity_name
    const entityMap = new Map()
    for (const row of data || []) {
      const name = row.entity_name
      const tags = row.analysis_tags || {}
      const rowCategory = tags.category || 'unknown'

      // Filter by category if specified
      if (category && rowCategory !== category) continue

      if (!entityMap.has(name)) {
        entityMap.set(name, {
          entity_name: name,
          address_type: row.address_type,
          label: row.label,
          category: rowCategory,
          subcategory: tags.subcategory || null,
          is_famous: tags.is_famous || false,
          signal_potential: row.signal_potential,
          addresses: [],
          address_count: 0,
        })
      }
      const entity = entityMap.get(name)
      entity.addresses.push({
        address: row.address,
        blockchain: row.blockchain,
        label: row.label,
        confidence: row.confidence,
      })
      entity.address_count += 1
    }

    const entities = Array.from(entityMap.values())
      .sort((a, b) => {
        // Famous first, then by name
        if (a.is_famous && !b.is_famous) return -1
        if (!a.is_famous && b.is_famous) return 1
        return a.entity_name.localeCompare(b.entity_name)
      })

    // Get available categories for filter UI
    const categories = [...new Set(entities.map(e => e.category))].sort()

    return NextResponse.json({
      entities,
      total: entities.length,
      categories,
    })
  } catch (err) {
    console.error('Entities API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
