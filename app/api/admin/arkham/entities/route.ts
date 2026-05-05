/**
 * GET /api/admin/arkham/entities
 *
 * Lists curated_entities with their Arkham enrichment status and harvest
 * stats from tracked_address_universe. Powers /admin/arkham/entities.
 */
import { NextResponse } from 'next/server';
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { isAdmin } from '@/app/lib/adminConfig';

export const dynamic = 'force-dynamic';

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return { error: 'Unauthorized' as const };
  const token = authHeader.replace('Bearer ', '');
  if (!token) return { error: 'Unauthorized' as const };
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return { error: 'Unauthorized' as const };
  if (!isAdmin(user.email || '')) return { error: 'Forbidden' as const };
  return { error: null };
}

export async function GET(req: Request) {
  const { error: authErr } = await requireAdmin(req);
  if (authErr) {
    return NextResponse.json({ error: authErr }, { status: authErr === 'Unauthorized' ? 401 : 403 });
  }

  const [entRes, tauRes] = await Promise.all([
    supabaseAdmin
      .from('curated_entities')
      .select('slug, display_name, category, is_featured, arkham_entity_id, arkham_entity_type, arkham_synced_at, arkham_raw')
      .order('is_featured', { ascending: false })
      .order('slug', { ascending: true }),
    supabaseAdmin
      .from('tracked_address_universe')
      .select('arkham_entity_id, harvested_at')
      .not('arkham_entity_id', 'is', null)
      .limit(50_000),
  ]);

  // Aggregate harvested counts per entity_id.
  type Tau = { arkham_entity_id: string; harvested_at: string };
  const byEntity = new Map<string, { count: number; lastHarvested: string | null }>();
  for (const r of (tauRes.data ?? []) as Tau[]) {
    const k = r.arkham_entity_id;
    const cur = byEntity.get(k) ?? { count: 0, lastHarvested: null };
    cur.count += 1;
    if (!cur.lastHarvested || r.harvested_at > cur.lastHarvested) cur.lastHarvested = r.harvested_at;
    byEntity.set(k, cur);
  }

  const entities = (entRes.data ?? []).map((row: any) => {
    const stats = row.arkham_entity_id ? byEntity.get(row.arkham_entity_id) : null;
    let status: 'enriched' | 'missing' | 'never' = 'never';
    if (row.arkham_synced_at && row.arkham_entity_id) status = 'enriched';
    else if (row.arkham_synced_at && !row.arkham_entity_id) status = 'missing';
    return {
      slug: row.slug,
      display_name: row.display_name,
      category: row.category,
      is_featured: row.is_featured,
      status,
      arkham_entity_id: row.arkham_entity_id,
      arkham_entity_type: row.arkham_entity_type,
      arkham_synced_at: row.arkham_synced_at,
      website: row.arkham_raw?.website ?? null,
      twitter: row.arkham_raw?.twitter ?? null,
      addresses_harvested: stats?.count ?? 0,
      last_harvested_at: stats?.lastHarvested ?? null,
    };
  });

  // Top-level counts.
  const totals = {
    entities: entities.length,
    enriched: entities.filter(e => e.status === 'enriched').length,
    missing: entities.filter(e => e.status === 'missing').length,
    never: entities.filter(e => e.status === 'never').length,
    addresses: (tauRes.data ?? []).length,
  };

  return NextResponse.json({ totals, entities });
}
