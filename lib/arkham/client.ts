/**
 * Arkham Intelligence client.
 *
 * Single entry point for every outbound Arkham call. Responsibilities:
 *   1. Resolve and rotate API keys (lib/arkham/keys).
 *   2. Enforce monthly budget guard (arkham_quota_month view).
 *   3. Cache responses (arkham_cache table) with per-call TTL.
 *   4. Stale-on-error fallback up to 30 days on 429 / 5xx.
 *   5. Log EVERY attempt (success, failure, cache hit) to arkham_call_log
 *      so the admin dashboard + projection are always accurate.
 *   6. Throttle HEAVY endpoints to ~1 rps process-wide (best-effort).
 *
 * Probe-derived endpoint quirks:
 *   - /predictions does not exist on Starter (returns 405) — do not call.
 *   - /counterparties/{slug} requires flow=in OR flow=out (NOT 'either').
 *   - No quota headers in any response → all telemetry is internal.
 */
import 'server-only';
import { supabaseAdminFresh } from '@/app/lib/supabaseAdmin';
import { getNextKey } from './keys';
import { creditWeight, isHeavy } from './credit-weights';
import { ARKHAM_BUDGET_GUARD, ARKHAM_ENABLED } from './license';

const BASE_URL = (process.env.ARKHAM_BASE_URL || 'https://api.arkm.com').replace(/\/+$/, '');
const STALE_MAX_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type ArkhamFetchOpts = {
  /** Cache key. Omit to bypass cache entirely. */
  cacheKey?: string;
  /** TTL for fresh cache reads. Default 1h. */
  ttlSeconds?: number;
  /** Where the call originated, for spend attribution. */
  source?: 'cron' | 'on_demand' | 'orca' | 'backfill' | 'health' | 'admin';
  /** Free-text reason / endpoint context. */
  reason?: string;
  /** HTTP method (Arkham is GET-only in practice). */
  method?: 'GET';
  /** Skip the budget guard (admin dashboard only). */
  bypassGuard?: boolean;
};

class ArkhamError extends Error {
  status: number;
  code: string;
  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// -------- HEAVY throttle (best-effort, single-process) --------
let nextHeavyAt = 0;
async function awaitHeavySlot(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, nextHeavyAt - now);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  nextHeavyAt = Math.max(now, nextHeavyAt) + 1050; // ~1 rps + 50ms slack
}

// -------- Logging --------
async function logCall(row: {
  endpoint: string;
  method: string;
  cost: number;
  status: number | null;
  ms: number;
  cache_hit: boolean;
  source?: string;
  reason?: string;
}): Promise<void> {
  try {
    await supabaseAdminFresh.from('arkham_call_log').insert({
      endpoint: row.endpoint,
      method: row.method,
      cost: row.cost,
      status: row.status,
      ms: row.ms,
      cache_hit: row.cache_hit,
      source: row.source ?? null,
      reason: row.reason ?? null,
    });
  } catch (err) {
    // Never let telemetry failure break the caller.
    console.warn('[arkham] logCall failed:', (err as Error).message);
  }
}

// -------- Cache --------
type CacheRow = { key: string; value: unknown; written_at: string; ttl_seconds: number };

async function readCache(key: string): Promise<CacheRow | null> {
  const { data, error } = await supabaseAdminFresh
    .from('arkham_cache')
    .select('key,value,written_at,ttl_seconds')
    .eq('key', key)
    .maybeSingle();
  if (error || !data) return null;
  return data as CacheRow;
}

async function writeCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await supabaseAdminFresh
      .from('arkham_cache')
      .upsert({ key, value, ttl_seconds: ttlSeconds, written_at: new Date().toISOString() });
  } catch (err) {
    console.warn('[arkham] writeCache failed:', (err as Error).message);
  }
}

function isFresh(row: CacheRow): boolean {
  const ageMs = Date.now() - new Date(row.written_at).getTime();
  return ageMs < row.ttl_seconds * 1000;
}

function isUsableStale(row: CacheRow): boolean {
  const ageMs = Date.now() - new Date(row.written_at).getTime();
  return ageMs < STALE_MAX_MS;
}

// -------- Quota guard --------
let lastGuardCheck = 0;
let lastGuardProjection = 0;

async function ensureUnderBudget(bypass: boolean): Promise<void> {
  if (bypass) return;
  // Only re-poll the view at most once per 30s to avoid hammering Postgres.
  const now = Date.now();
  if (now - lastGuardCheck < 30_000) {
    if (lastGuardProjection > ARKHAM_BUDGET_GUARD) {
      throw new ArkhamError(
        'ARKHAM_QUOTA_GUARD',
        429,
        `projected month-end ${lastGuardProjection.toFixed(0)} > guard ${ARKHAM_BUDGET_GUARD}`
      );
    }
    return;
  }
  lastGuardCheck = now;
  const { data, error } = await supabaseAdminFresh
    .from('arkham_quota_month')
    .select('projected_month_end,calls_used')
    .maybeSingle();
  if (error) {
    console.warn('[arkham] guard read failed (open):', error.message);
    return; // fail-open if telemetry is broken; don't deadlock the system.
  }
  const projected = Number(data?.projected_month_end ?? 0);
  lastGuardProjection = projected;
  if (projected > ARKHAM_BUDGET_GUARD) {
    throw new ArkhamError(
      'ARKHAM_QUOTA_GUARD',
      429,
      `projected month-end ${projected.toFixed(0)} > guard ${ARKHAM_BUDGET_GUARD}`
    );
  }
}

// -------- Public client --------
export async function arkhamFetch<T = unknown>(
  path: string,
  opts: ArkhamFetchOpts = {}
): Promise<T> {
  const method = opts.method ?? 'GET';
  const url = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const endpointKey = path.split('?')[0]; // strip query for grouping
  const cost = creditWeight(path);

  // 1. Fresh cache?
  if (opts.cacheKey) {
    const row = await readCache(opts.cacheKey);
    if (row && isFresh(row)) {
      await logCall({
        endpoint: endpointKey,
        method,
        cost: 0,
        status: 200,
        ms: 0,
        cache_hit: true,
        source: opts.source,
        reason: opts.reason ?? 'fresh',
      });
      return row.value as T;
    }
  }

  // 1b. Master kill switch. When ARKHAM_ENABLED=false (subscription cancelled
  //     or paused) we never make outbound calls. Serve stale cache up to
  //     30 days, otherwise throw a typed error so callers can degrade.
  if (!ARKHAM_ENABLED) {
    if (opts.cacheKey) {
      const row = await readCache(opts.cacheKey);
      if (row && isUsableStale(row)) {
        await logCall({
          endpoint: endpointKey, method, cost: 0, status: 200, ms: 0,
          cache_hit: true, source: opts.source, reason: 'stale_on_disabled',
        });
        return row.value as T;
      }
    }
    throw new ArkhamError('ARKHAM_DISABLED', 503, 'ARKHAM_ENABLED=false; outbound calls are blocked');
  }

  // 2. Budget guard before any outbound spend.
  try {
    await ensureUnderBudget(!!opts.bypassGuard);
  } catch (err) {
    // If we're guarded, fall back to stale cache rather than throw.
    if (opts.cacheKey) {
      const row = await readCache(opts.cacheKey);
      if (row && isUsableStale(row)) {
        await logCall({
          endpoint: endpointKey,
          method,
          cost: 0,
          status: 200,
          ms: 0,
          cache_hit: true,
          source: opts.source,
          reason: 'stale_on_guard',
        });
        return row.value as T;
      }
    }
    throw err;
  }

  // 3. HEAVY throttle.
  if (isHeavy(path)) await awaitHeavySlot();

  // 4. Outbound request.
  const apiKey = getNextKey();
  const started = Date.now();
  let status = 0;
  let body: unknown = null;
  let networkError: Error | null = null;
  try {
    const res = await fetch(url, {
      method,
      headers: { 'API-Key': apiKey, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    status = res.status;
    const text = await res.text();
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!res.ok) {
      throw new ArkhamError(`ARKHAM_HTTP_${status}`, status, typeof body === 'string' ? body : res.statusText);
    }
  } catch (err) {
    networkError = err as Error;
  }
  const ms = Date.now() - started;

  // 5. Log the attempt (always).
  await logCall({
    endpoint: endpointKey,
    method,
    cost,
    status: status || null,
    ms,
    cache_hit: false,
    source: opts.source,
    reason: opts.reason,
  });

  // 6. On 429 / 5xx → stale fallback.
  const transient = status === 429 || (status >= 500 && status < 600) || (networkError && status === 0);
  if (networkError) {
    if (transient && opts.cacheKey) {
      const row = await readCache(opts.cacheKey);
      if (row && isUsableStale(row)) {
        await logCall({
          endpoint: endpointKey,
          method,
          cost: 0,
          status: 200,
          ms: 0,
          cache_hit: true,
          source: opts.source,
          reason: 'stale_on_error',
        });
        return row.value as T;
      }
    }
    throw networkError;
  }

  // 7. Persist fresh value.
  if (opts.cacheKey) {
    await writeCache(opts.cacheKey, body, opts.ttlSeconds ?? 3600);
  }
  return body as T;
}

export { ArkhamError };
