/**
 * Arkham health cron — daily.
 *
 * Cheapest known-good call (`/intelligence/entity/binance`, ~1 credit)
 * just to confirm key + commercial-use status are still valid. Writes a
 * row to arkham_call_log via the client; the admin dashboard surfaces
 * the most recent attempt under "Health".
 */
import { NextResponse } from 'next/server';
import { supabaseAdminFresh } from '@/app/lib/supabaseAdmin';
import { arkhamFetch, ArkhamError } from '@/lib/arkham/client';
import { ARKHAM_COMMERCIAL_USE, ARKHAM_ENABLED, ARKHAM_MONTHLY_BUDGET, ARKHAM_BUDGET_GUARD } from '@/lib/arkham/license';

export const dynamic = 'force-dynamic';

// Unauthenticated freshness summary: latest cache write per key family +
// directory-stats timestamp. Timestamps only — no keys, no values. Lets
// external monitors (cloud routines, uptime checks) verify the daily
// GitHub-Actions Arkham refresh fired without holding any secret.
async function publicFreshness() {
  const latest = async (pattern: string) => {
    const { data } = await supabaseAdminFresh
      .from('arkham_cache')
      .select('written_at')
      .like('key', pattern)
      .order('written_at', { ascending: false })
      .limit(1);
    return Array.isArray(data) && data[0] ? data[0].written_at : null;
  };
  const [history, counterparties, holders] = await Promise.all([
    latest('entity_history:%'),
    latest('counterparties:%'),
    latest('token_holders:%'),
  ]);
  const { data: stats } = await supabaseAdminFresh
    .from('app_cache')
    .select('updated_at')
    .eq('key', 'figure_directory_stats')
    .maybeSingle();
  return NextResponse.json({
    ok: true,
    public: true,
    cache_freshness: {
      entity_history: history,
      counterparties,
      token_holders: holders,
      directory_stats: stats?.updated_at ?? null,
    },
  });
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return publicFreshness();
  }

  // Subscription cancelled / paused — never make an outbound call.
  if (!ARKHAM_ENABLED) {
    return NextResponse.json({
      ok: true,
      disabled: true,
      message: 'ARKHAM_ENABLED=false; skipping health ping (no credits will be used)',
      license: {
        commercialUse: ARKHAM_COMMERCIAL_USE,
        monthlyBudget: ARKHAM_MONTHLY_BUDGET,
        budgetGuard: ARKHAM_BUDGET_GUARD,
      },
    });
  }

  const started = Date.now();
  try {
    const data = await arkhamFetch<{ id?: string; name?: string }>(
      '/intelligence/entity/binance',
      {
        cacheKey: 'health:entity:binance',
        ttlSeconds: 60 * 60 * 12, // 12h — health pings are cheap, don't burn budget
        source: 'health',
        reason: 'daily_health_ping',
      }
    );
    return NextResponse.json({
      ok: true,
      ms: Date.now() - started,
      entity: { id: data?.id, name: data?.name },
      license: {
        commercialUse: ARKHAM_COMMERCIAL_USE,
        monthlyBudget: ARKHAM_MONTHLY_BUDGET,
        budgetGuard: ARKHAM_BUDGET_GUARD,
      },
    });
  } catch (err) {
    const e = err as ArkhamError;
    return NextResponse.json(
      {
        ok: false,
        ms: Date.now() - started,
        code: e.code ?? 'UNKNOWN',
        status: e.status ?? 0,
        message: e.message,
      },
      { status: 200 } // 200 so cron doesn't retry-storm; admin UI shows ok=false
    );
  }
}
