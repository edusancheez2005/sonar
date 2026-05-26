/**
 * Personal watchlist data layer
 * =============================================================================
 * Reads a user's combined holdings + watchlist set and hydrates each ticker
 * with the lightweight market data needed for the Personal Dashboard
 * Watchlist panel (§4.D Panel A of ORCA_COPILOT_BUILD_PROMPT.md).
 *
 * Pure functions: the Supabase client is injected so this is trivially
 * testable with stubs.
 *
 * Privacy / safety notes:
 * - This module deliberately does NOT return approx_usd_value or any other
 *   field that could leak the user's portfolio shape to a logger or cache.
 *   It only returns the ticker set and per-ticker market data.
 * - All queries are scoped to the supplied userId. The caller is responsible
 *   for verifying the JWT and only passing the authenticated user's id.
 */

export type TickerSource = 'holding' | 'watchlist';

export interface WatchlistItem {
  ticker: string;
  source: TickerSource;
  // Hydrated fields — any of these can be null if the underlying data is
  // unavailable. The UI must render a quiet em-dash in that case.
  price_usd: number | null;
  change_24h: number | null;
  change_7d: number | null;
  net_flow_24h_usd: number | null;
  net_flow_direction: 'up' | 'down' | 'flat' | null;
  latest_headline: string | null;
  fetched_at: string;
}

interface SupabaseLike {
  from: (table: string) => any;
}

const WHALE_NET_FLOW_FLAT_THRESHOLD_USD = 100_000;

/**
 * Read a user's combined tickers from user_holdings and user_watchlists.
 *
 * STAGE B.1 unification (2026-05-26): we now read from `user_watchlists`
 * (plural, column `symbol`) — the same table the token-page "+ Watchlist"
 * button writes to via /api/watchlist. Previously this read from
 * `user_watchlist` (singular, column `ticker`), so additions made on token
 * pages never appeared in the personal Watchlist tab.
 *
 * The boundary maps `symbol` → internal `ticker` so callers don't change.
 *
 * Deduplicates with holdings taking precedence over watchlist for the source label.
 */
export async function getUserTickers(
  userId: string,
  supabase: SupabaseLike
): Promise<Array<{ ticker: string; source: TickerSource }>> {
  if (!userId) return [];

  const [holdingsRes, watchlistRes] = await Promise.all([
    supabase.from('user_holdings').select('ticker').eq('user_id', userId),
    supabase.from('user_watchlists').select('symbol').eq('user_id', userId),
  ]);

  const map = new Map<string, TickerSource>();

  for (const row of (holdingsRes?.data ?? []) as Array<{ ticker: string }>) {
    const t = normaliseTicker(row.ticker);
    if (t) map.set(t, 'holding');
  }
  for (const row of (watchlistRes?.data ?? []) as Array<{ symbol: string }>) {
    const t = normaliseTicker(row.symbol);
    if (t && !map.has(t)) map.set(t, 'watchlist');
  }

  return Array.from(map.entries()).map(([ticker, source]) => ({ ticker, source }));
}

function normaliseTicker(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = String(raw).trim().toUpperCase();
  if (!t || t.length > 12) return null;
  if (!/^[A-Z0-9._-]+$/.test(t)) return null;
  return t;
}

/**
 * Hydrate a set of tickers with market data from existing public tables.
 * Each lookup is wrapped in try/catch so a single broken query does not
 * blank out the entire panel.
 */
export async function hydrateTickers(
  tickers: Array<{ ticker: string; source: TickerSource }>,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<WatchlistItem[]> {
  const fetchedAt = now().toISOString();
  if (tickers.length === 0) return [];

  const results = await Promise.all(
    tickers.map(async ({ ticker, source }) => {
      const [price, netFlow, headline] = await Promise.all([
        readLatestPrice(ticker, supabase).catch(() => null),
        readNetFlow24h(ticker, supabase, now()).catch(() => null),
        readLatestHeadline(ticker, supabase).catch(() => null),
      ]);

      const direction = classifyDirection(netFlow);

      return {
        ticker,
        source,
        price_usd: price?.price_usd ?? null,
        change_24h: price?.change_24h ?? null,
        change_7d: price?.change_7d ?? null,
        net_flow_24h_usd: netFlow,
        net_flow_direction: direction,
        latest_headline: headline,
        fetched_at: fetchedAt,
      } satisfies WatchlistItem;
    })
  );

  return results;
}

function classifyDirection(netFlow: number | null): WatchlistItem['net_flow_direction'] {
  if (netFlow === null) return null;
  if (netFlow > WHALE_NET_FLOW_FLAT_THRESHOLD_USD) return 'up';
  if (netFlow < -WHALE_NET_FLOW_FLAT_THRESHOLD_USD) return 'down';
  return 'flat';
}

async function readLatestPrice(
  ticker: string,
  supabase: SupabaseLike
): Promise<{ price_usd: number; change_24h: number | null; change_7d: number | null } | null> {
  const { data } = await supabase
    .from('price_snapshots')
    .select('price_usd, price_change_24h, price_change_7d')
    .eq('ticker', ticker)
    .order('timestamp', { ascending: false })
    .limit(1);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.price_usd !== 'number') return null;
  return {
    price_usd: row.price_usd,
    change_24h: typeof row.price_change_24h === 'number' ? row.price_change_24h : null,
    change_7d: typeof row.price_change_7d === 'number' ? row.price_change_7d : null,
  };
}

async function readNetFlow24h(
  ticker: string,
  supabase: SupabaseLike,
  asOf: Date
): Promise<number | null> {
  const sinceIso = new Date(asOf.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('all_whale_transactions')
    .select('usd_value, classification')
    .eq('token_symbol', ticker)
    .gte('timestamp', sinceIso)
    .limit(500);
  if (!Array.isArray(data) || data.length === 0) return null;
  let net = 0;
  for (const row of data as Array<{ usd_value: number | string; classification: string }>) {
    const v = Number(row.usd_value);
    if (!Number.isFinite(v) || v <= 0) continue;
    const c = String(row.classification || '').toLowerCase();
    if (c.startsWith('buy')) net += v;
    else if (c.startsWith('sell')) net -= v;
  }
  return net;
}

async function readLatestHeadline(
  ticker: string,
  supabase: SupabaseLike
): Promise<string | null> {
  // Canonical news table is `news_items` with a single `ticker` column
  // (see app/api/news/personalized/route.ts). The previous query against
  // `news_articles.related_tickers` returned 0 rows because that table is
  // not maintained by the news pipeline.
  const { data } = await supabase
    .from('news_items')
    .select('title')
    .eq('ticker', ticker.toUpperCase())
    .order('published_at', { ascending: false })
    .limit(1);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.title !== 'string') return null;
  return row.title.trim();
}
