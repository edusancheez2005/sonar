/**
 * Arkham health cron — daily.
 *
 * Cheapest known-good call (`/intelligence/entity/binance`, ~1 credit)
 * just to confirm key + commercial-use status are still valid. Writes a
 * row to arkham_call_log via the client; the admin dashboard surfaces
 * the most recent attempt under "Health".
 */
import { NextResponse } from 'next/server';
import { arkhamFetch, ArkhamError } from '@/lib/arkham/client';
import { ARKHAM_COMMERCIAL_USE, ARKHAM_ENABLED, ARKHAM_MONTHLY_BUDGET, ARKHAM_BUDGET_GUARD } from '@/lib/arkham/license';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
