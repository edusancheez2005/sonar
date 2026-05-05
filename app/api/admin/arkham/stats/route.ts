/**
 * GET /api/admin/arkham/stats
 *
 * Powers /admin/arkham. Returns:
 *   - quota: month-to-date credit usage + projection (arkham_quota_month)
 *   - byEndpoint: spend grouped by endpoint (last 30d)
 *   - cache: cache-hit rate (last 24h)
 *   - recentErrors: last 25 non-2xx attempts
 *   - lastHealth: most recent /api/arkham/health attempt
 */
import { NextResponse } from 'next/server';
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { isAdmin } from '@/app/lib/adminConfig';
import {
  ARKHAM_BUDGET_GUARD,
  ARKHAM_COMMERCIAL_USE,
  ARKHAM_MONTHLY_BUDGET,
} from '@/lib/arkham/license';

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

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [quotaRes, callsRes, cacheRes, errsRes, healthRes] = await Promise.all([
    supabaseAdmin
      .from('arkham_quota_month')
      .select('calls_used,calls_remaining,days_left,projected_month_end')
      .maybeSingle(),
    supabaseAdmin
      .from('arkham_call_log')
      .select('endpoint,cost,status,cache_hit,ms,called_at')
      .gte('called_at', since30d)
      .limit(50_000),
    supabaseAdmin
      .from('arkham_call_log')
      .select('cache_hit,called_at')
      .gte('called_at', since24h)
      .limit(50_000),
    supabaseAdmin
      .from('arkham_call_log')
      .select('endpoint,status,reason,called_at,ms')
      .not('status', 'is', null)
      .or('status.lt.200,status.gte.300')
      .order('called_at', { ascending: false })
      .limit(25),
    supabaseAdmin
      .from('arkham_call_log')
      .select('called_at,status,ms,reason')
      .eq('source', 'health')
      .order('called_at', { ascending: false })
      .limit(1),
  ]);

  // Aggregate by endpoint.
  type Row = { endpoint: string; cost: number; status: number | null; cache_hit: boolean; ms: number };
  const byEndpointMap = new Map<string, { calls: number; spend: number; cacheHits: number; avgMs: number; errors: number }>();
  for (const row of (callsRes.data ?? []) as Row[]) {
    const k = row.endpoint;
    const cur = byEndpointMap.get(k) ?? { calls: 0, spend: 0, cacheHits: 0, avgMs: 0, errors: 0 };
    cur.calls += 1;
    cur.spend += row.cache_hit || (row.status && (row.status < 200 || row.status >= 300)) ? 0 : row.cost;
    if (row.cache_hit) cur.cacheHits += 1;
    if (row.status && (row.status < 200 || row.status >= 300)) cur.errors += 1;
    cur.avgMs += row.ms || 0;
    byEndpointMap.set(k, cur);
  }
  const byEndpoint = [...byEndpointMap.entries()]
    .map(([endpoint, v]) => ({
      endpoint,
      calls: v.calls,
      spend: v.spend,
      cacheHits: v.cacheHits,
      errors: v.errors,
      avgMs: v.calls ? Math.round(v.avgMs / v.calls) : 0,
    }))
    .sort((a, b) => b.spend - a.spend);

  // Cache hit rate over 24h.
  const cacheRows = (cacheRes.data ?? []) as { cache_hit: boolean }[];
  const cache24h = {
    total: cacheRows.length,
    hits: cacheRows.filter((r) => r.cache_hit).length,
    rate: cacheRows.length ? cacheRows.filter((r) => r.cache_hit).length / cacheRows.length : 0,
  };

  return NextResponse.json({
    license: {
      commercialUse: ARKHAM_COMMERCIAL_USE,
      monthlyBudget: ARKHAM_MONTHLY_BUDGET,
      budgetGuard: ARKHAM_BUDGET_GUARD,
    },
    quota: quotaRes.data ?? null,
    byEndpoint,
    cache24h,
    recentErrors: errsRes.data ?? [],
    lastHealth: (healthRes.data ?? [])[0] ?? null,
  });
}
