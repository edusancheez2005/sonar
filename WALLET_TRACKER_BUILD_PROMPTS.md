# Sonar Wallet Tracker — Claude Opus 4.7 Build Prompts

Three sequential prompts. Run them **in order**, in **separate Claude sessions** (each one is large enough to deserve its own context window). Don't combine them.

---

## SHARED PREAMBLE (paste at the top of every prompt below)

```
You are a senior staff engineer + on-chain analyst hired to ship a production
feature for Sonar (https://www.sonartracker.io), a Next.js 14 App Router app
that tracks crypto whale activity. Codebase lives at the repo root; relevant
folders: app/, components/, lib/, scripts/, supabase/migrations/.

Stack: Next.js 14.2 (App Router, JS+TS mix), Supabase (Postgres + auth),
Vercel deploy, RainbowKit/wagmi/viem for EVM read-only RPC, Helius for
Solana, mempool.space for BTC, Alchemy for multi-chain EVM, CoinGecko for
prices.

Existing relevant files (already audited — DO NOT re-discover):
- DB seed:        scripts/seed_curated_entities.sql
- DB migration:   supabase/migrations/20260419_curated_entities.sql
- Scraper:        scripts/scrape_famous_wallets.js
- Public list:    app/figures/page.js          (24/page, sort by featured)
- Profile:        app/figures/[slug]/page.jsx
- Hub:            app/wallet-tracker/page.jsx  (featured limit hardcoded 8)
- Whale profile:  app/whale/[address]/page.jsx
- API list:       app/api/wallet-tracker/route.js
- API one wallet: app/api/wallet-tracker/[address]/route.js
- API search:     app/api/wallet-tracker/search/route.js
- Helpers:        lib/wallet/alchemy.ts, lib/wallet/helius.ts, lib/wallet/btc.ts
- Constants:      lib/wallet-tracker.js
- Submit form:    app/api/figures/submit/route.js

Schema of `curated_entities`:
  slug TEXT PK, display_name TEXT, description TEXT,
  category TEXT CHECK IN ('person','company','government','protocol','celebrity'),
  avatar_url TEXT, twitter_handle TEXT, is_featured BOOL,
  addresses JSONB DEFAULT '[]'::jsonb,    -- [{address, chain, note?, source?, verified?}]
  submission_status TEXT, created_at TIMESTAMPTZ

Hard rules:
1. NEVER claim an address is owned by a person without a citation. Speculation
   creates legal exposure (defamation / false light). Every address you add
   must include a `source` URL pointing to a public attribution by the owner
   themselves, by a major exchange/foundation, or by Arkham/Nansen/Etherscan
   labels (those three are court-acceptable provenance).
2. Use ONLY public OSINT sources. Do not invent addresses. If you can't find
   a verified address for a figure, leave their `addresses` array empty AND
   flip `is_featured = false` so they don't pollute the hub.
3. Treat env, secrets, and Supabase service-role keys as already configured.
   Read them from `process.env`; never hard-code.
4. PowerShell terminal (Windows). Use `;` not `&&` in commands.
5. Don't refactor unrelated code. Don't add tests unless asked. Don't add
   markdown docs except the one explicitly requested.
6. After each commit, push with `git push origin main` and report the commit
   SHA.
```

---

## PROMPT 1 — CURATE 60+ VERIFIED FAMOUS WALLETS (RESEARCH-HEAVY)

> Use this prompt with **web search / deep research enabled**. The output is a SQL seed file. No app code changes. Estimated runtime: 30–60 min of agent research.

```
[paste SHARED PREAMBLE above]

MISSION
Build a verified, citation-backed seed list of at least 60 famous crypto
wallets across these categories:
  - Founders / public figures (Vitalik, CZ, Saylor, Trump, etc.)
  - Smart-money traders / on-chain personalities (Cobie, Hsaka, Tetranode, etc.)
  - VCs / funds (a16z crypto, Paradigm, Polychain, Multicoin, Pantera, ...)
  - NFT collectors / culture (Pranksy, beeple, Punk6529, deeze, ...)
  - Institutional / ETF (BlackRock IBIT, Fidelity FBTC, MicroStrategy, ...)
  - DAOs / protocol treasuries (Uniswap, Compound, Aave, MakerDAO, ENS, Gitcoin)
  - Exchange cold wallets (Binance, Coinbase, Kraken — well-known ones only)

RESEARCH METHODOLOGY (do all of this — cite each source):
1. For each candidate, search the live web for an address with provenance.
   Acceptable provenance, in priority order:
     a) Self-disclosed (tweet / personal site / ENS reverse record).
     b) Arkham Intelligence entity page (https://intel.arkm.com/explorer/entity/<slug>)
     c) Etherscan public name tag (the green/blue label on the address page)
     d) Nansen wallet label
     e) Foundation / company official disclosure (proof-of-reserves, treasury page)
   REJECT: Reddit speculation, "according to a tweet I saw", random Medium
   posts, address-poisoning lookalikes.
2. For ENS names, resolve to the canonical address via
   https://app.ens.domains/<name> and record BOTH the ENS and the resolved
   0x address.
3. For Solana, use https://solscan.io/account/<addr> to confirm the label.
4. For Bitcoin, use mempool.space or blockchain.com — only include if the
   address is publicly attributed (e.g., MicroStrategy disclosed addresses,
   Mt. Gox cold storage, US Government seizure addresses).
5. For each entity, capture 1–5 addresses across whichever chains apply.
   Better to ship 1 well-cited address than 5 sketchy ones.

DELIVERABLE
Create a single SQL file at:
  scripts/seed_famous_wallets_v2.sql

Format (one INSERT block per entity, idempotent via ON CONFLICT DO UPDATE):

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'vitalik-buterin',
  'Vitalik Buterin',
  'Co-founder of Ethereum',
  'person',
  NULL,                 -- avatar handled separately by scripts/fetch_figure_avatars.js
  'VitalikButerin',
  true,
  '[
    {"address":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","chain":"ethereum",
     "note":"vitalik.eth — primary public wallet",
     "source":"https://etherscan.io/address/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
     "verified":true},
    {"address":"0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B","chain":"ethereum",
     "note":"Vitalik old wallet (per his 2018 tweet)",
     "source":"https://twitter.com/VitalikButerin/status/...",
     "verified":true}
  ]'::jsonb,
  'approved'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured,
  addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

-- Repeat for at least 60 entities, grouped with section comments:
-- ==== FOUNDERS ====
-- ==== TRADERS ====
-- ==== VCs ====
-- etc.

ACCEPTANCE CRITERIA
- ≥ 60 entities total.
- ≥ 80% of entities have at least 1 address.
- ZERO addresses without a `source` URL field.
- ZERO speculative addresses (each one resolvable to a public label).
- File parses cleanly: psql --dry-run on the SQL must succeed.
- A README block at the top of the SQL file lists:
    * Generation date
    * Total entity count
    * Total address count
    * Per-chain breakdown
    * Source inventory (e.g., "37 from Etherscan name tags, 12 from Arkham,
      8 from self-disclosure tweets, 3 from foundation treasuries")

VERIFICATION
After producing the file, do NOT run it against the DB. Instead, output the
top of the file (first ~80 lines) and the README block in your final reply
so the human can review before applying.

Then create a follow-up apply script:
  scripts/apply_famous_wallets_v2.sh   (POSIX) and
  scripts/apply_famous_wallets_v2.ps1  (PowerShell)
that simply reads SUPABASE_DB_URL from env and pipes the SQL to psql.

Commit message:
  feat(curated-entities): seed 60+ verified famous wallets with provenance
```

---

## PROMPT 2 — SHIP THE PIPELINE FIXES + ADMIN UI

> Run after Prompt 1's SQL is reviewed and applied. No web research needed; pure code work.

```
[paste SHARED PREAMBLE above]

MISSION
Fix the structural reasons that the curated_entities table cannot grow
post-seed, and give admins a UI to add new famous wallets in 30 seconds.

TASK 1 — FIX THE SCRAPER
File: scripts/scrape_famous_wallets.js (~L506–530)
Current bug: filters out existing slugs AND uses upsert with
ignoreDuplicates: true. Net effect: existing rows can never be enriched.

Required changes:
  a) REMOVE the `existingSlugs` filter so we re-process existing rows.
  b) Change the upsert to:
       .upsert(rows, { onConflict: 'slug' })
     (no `ignoreDuplicates`).
  c) Before upsert, MERGE addresses from the existing row with new ones,
     deduping by lowercased address+chain. Existing addresses must NEVER be
     deleted by the scraper — only added to.
  d) Add a `--dry-run` CLI flag that prints what would change without
     writing.
  e) Add structured console output: per slug, log
     "[+N] elon-musk: added 2 addresses (eth, sol)".

TASK 2 — ADMIN ENDPOINT TO MANAGE ADDRESSES
Create: app/api/admin/figures/[slug]/addresses/route.ts

Methods:
  POST   body: { address, chain, note?, source } → append to addresses jsonb
  DELETE body: { address, chain }                → remove from addresses jsonb
  PATCH  body: { addresses: Address[] }          → full replace (advanced)

Auth: Require the caller's email (from supabaseServer cookie session) to be
in the existing ADMIN_EMAILS allowlist (search the codebase — it's already
defined; reuse it, don't redeclare).

Validation:
  - address: regex per chain
      * ethereum/polygon/arbitrum/base/optimism: /^0x[a-fA-F0-9]{40}$/
      * solana: base58, length 32–44 (use bs58 from existing deps)
      * bitcoin: bech32 (bc1...) OR legacy (1...|3...) — accept both
  - chain: must be one of ethereum, polygon, arbitrum, base, optimism,
    solana, bitcoin
  - source: must be a https:// URL, length < 500
  - note: optional, < 200 chars, sanitize HTML

Response: { ok: true, addresses: Address[] }
On error: { ok: false, error: string }, status 400 / 401 / 404.

Rate limit: 30 writes/min/IP via the existing rate-limit helper (search
the codebase, don't reinvent it).

TASK 3 — ADMIN UI PAGE
Create: app/admin/figures/page.jsx + app/admin/figures/AdminFiguresClient.jsx

Server component fetches all curated_entities, sorted by
(addresses.length ASC, display_name ASC) — empty figures float to the top
so admins triage them first.

Client renders a table with columns:
  | Avatar | Display Name | Category | # Addresses | Featured | Actions |

Click a row → side panel opens showing:
  - Existing addresses (chain badge, truncated addr, source link, ✕ delete)
  - "Add address" form (chain dropdown, address input, source URL, note)
  - "Submit" button → POST to admin endpoint
  - Toast on success/error
  - On success, optimistically update the row's # Addresses count

Style: match existing admin pages (look at app/admin/* for the pattern —
likely uses styled-components with the same dark theme).

TASK 4 — UNHARDCODE THE FEATURED LIMIT
File: app/wallet-tracker/page.jsx (~L28–34)
Change `.limit(8)` to `.limit(24)`.
Also change the search-results cap in app/api/wallet-tracker/search/route.js
from `.slice(0, 30)` to `.slice(0, 100)`.

TASK 5 — EMPTY-FIGURE FILTER
File: app/figures/page.js (the public directory)
Add a query filter so figures with zero addresses are HIDDEN from the public
list (jsonb_array_length(addresses) > 0). Admin page is not affected.

ACCEPTANCE CRITERIA
- Scraper change: running `node scripts/scrape_famous_wallets.js --dry-run`
  prints planned changes without DB writes; running without --dry-run
  actually merges and never deletes existing addresses.
- Admin endpoint: returns 401 for non-admin, 200 for admin, validates
  address format strictly. Manually test with curl + a real admin cookie.
- Admin UI: loads on /admin/figures, lets you add an address in <5 clicks,
  shows the new # in the row immediately.
- Public /figures page no longer shows entities with 0 addresses.
- All TypeScript / lint passes (`npm run build` succeeds locally).

DELIVERABLES
- One commit per task, in order, with messages:
    fix(scraper): merge addresses on existing rows instead of skipping
    feat(admin): POST/DELETE/PATCH endpoint for figure addresses
    feat(admin): /admin/figures UI for curating famous wallets
    chore(wallet-tracker): raise featured limit 8→24, search cap 30→100
    feat(figures): hide empty figures from public directory
- Push each. Report all 5 commit SHAs.

DO NOT
- Touch the signal-engine or backtest code.
- Add new dependencies (everything you need is already in package.json).
- Change the curated_entities schema. If you think it needs a new column,
  STOP and ask.
```

---

## PROMPT 3 — WALLET BACKTESTING ("WOULD I HAVE MADE MONEY COPYING THIS WHALE?")

> The user said "wallet backtesting" not "signal backtesting". This means: for any wallet (especially a famous one), simulate what would have happened if a user had copied each of that wallet's swaps with $X capital, and report the realized P&L vs HODLing. This is the killer feature for the figures page.

```
[paste SHARED PREAMBLE above]

MISSION
Build a wallet backtester. Given any wallet address + a capital amount +
a date range, replay every BUY/SELL the wallet executed and compute what a
copy-trader's portfolio would look like today.

This becomes a new tab on every figure profile page and on /whale/[address]:
  "If you had copied <name> with $10,000 starting on <date>, you would have
   $X today (Y% return), vs $Z if you had just held BTC (A% return)."

DATA SOURCES (already wired in this codebase)
- EVM transaction history: lib/wallet/alchemy.ts has `getEvmHoldings`. You
  need to ADD `getEvmTransfers(address, chain, fromBlock?, toBlock?)` using
  `alchemy_getAssetTransfers` (categories: external, erc20). See
  https://docs.alchemy.com/reference/alchemy-getassettransfers
- Solana history: lib/wallet/helius.ts — add `getSolanaSwaps(address, since?)`
  using Helius Enhanced Transactions API
  (https://docs.helius.dev/api-reference/enhanced-transactions-api).
  Filter `type === 'SWAP'`.
- Historical prices: existing `price_snapshots` table is too sparse for
  backtest. Use CoinGecko `/coins/{id}/market_chart/range` for hourly OHLC
  in the date range. Cache aggressively (the same token+range is queried
  many times). Use lib/coingecko/* if it exists, else create lib/coingecko/history.ts.

ALGORITHM (this is critical — implement EXACTLY this; do not invent)
1. Fetch all transfers for the wallet in [start, end].
2. Classify each into a CanonicalTrade:
     { ts, action: 'BUY'|'SELL'|'TRANSFER_IN'|'TRANSFER_OUT'|'NOISE',
       token_in, qty_in, token_out, qty_out, usd_value }
   Heuristic:
     - ETH/SOL/stable → token X    = BUY of X
     - token X → ETH/SOL/stable    = SELL of X
     - token X → token Y           = SELL X + BUY Y (two trades)
     - native send to EOA          = TRANSFER (ignore)
     - dust (< $25 USD value)      = NOISE (ignore)
3. Initialize a synthetic portfolio: cash = capital_usd, holdings = {}.
4. For each trade in chronological order:
     - On BUY: spend `min(cash, trade.usd_value)` from cash; receive
       `(spent / price_at_ts) * 1` of the token. Apply 30bps round-trip fee.
       If cash < trade.usd_value, scale the position proportionally.
     - On SELL: sell `min(holdings[token], trade.qty)`; add proceeds to cash.
       Apply 30bps fee.
     - Skip if we don't have a price for this token at this timestamp.
5. At each timestamp where holdings change, record an equity snapshot.
6. At `end`, mark all remaining holdings to market and report:
     final_equity_usd, total_return_pct, max_drawdown_pct, trade_count,
     win_rate_pct (closed positions only), sharpe (daily, annualized),
     equity_curve: [{ts, equity_usd}].
7. Compute the same for a HODL benchmark: $capital → BTC at `start`,
   marked to market at every snapshot timestamp. Same for ETH and SOL.

ANTI-PATTERNS (do not commit any of these — they will get caught in code review)
- Look-ahead bias: NEVER use a price from after the trade timestamp. Use
  the closest price <= trade ts, never >.
- Survivorship bias: if a token has no historical price (rugged, delisted),
  mark it to ZERO at the timestamp the price feed dies — do not just drop
  the trade.
- Free P&L from transfers: TRANSFER_IN of a token at $X must be entered at
  cost basis = $X (not $0). Otherwise wallets that get airdrops look
  godlike.
- Slippage handwave: apply a 30 bps round-trip fee as a flat cost. Do not
  pretend zero fees.
- Latency cheating: assume execution at the trade timestamp. The whale's
  on-chain ts IS the execution ts (unlike signal backtesting). This is the
  one place we don't need a latency model.

FILES TO CREATE
  lib/wallet/transfers.ts          (EVM transfer fetcher)
  lib/wallet/sol-swaps.ts          (Solana swap fetcher)
  lib/coingecko/history.ts         (cached historical price fetcher)
  lib/wallet-backtest/engine.ts    (the algorithm above)
  lib/wallet-backtest/types.ts     (CanonicalTrade, EquityPoint, BacktestResult)
  app/api/wallet-backtest/[address]/route.ts  (the API)
  components/wallet-tracker/WalletBacktestPanel.jsx  (the UI)

API CONTRACT
GET /api/wallet-backtest/[address]
  Query params:
    chain      = ethereum|polygon|solana (required)
    capital    = number, default 10000
    start_date = YYYY-MM-DD, default 90 days ago
    end_date   = YYYY-MM-DD, default today
  Response (200):
    {
      address, chain, capital_usd, start, end,
      trades_count, equity_curve: [{ ts, equity_usd }],
      result: {
        final_equity_usd, total_return_pct, max_drawdown_pct,
        win_rate_pct, sharpe, fees_paid_usd
      },
      benchmarks: {
        btc_hodl: { final_equity_usd, total_return_pct },
        eth_hodl: { final_equity_usd, total_return_pct }
      },
      computed_in_ms, cache_hit
    }
  Response (4xx/5xx):
    { error: string }
  Cache: 1 hour in Supabase table `wallet_backtest_cache` keyed on
    (address, chain, capital, start, end).
  Rate limit: 5 requests / minute / IP (this is expensive).

UI
Add a tab "Backtest" to:
  - app/figures/[slug]/page.jsx
  - app/whale/[address]/page.jsx

The tab renders <WalletBacktestPanel /> with controls:
  Capital: [$10,000] (slider 1k–1M)
  Range:   [Last 90d] [Last 180d] [Last 1y] [All]
  Chain:   [chain dropdown if wallet has multiple]
  → Run backtest

On submit: POST to the API, show a loading skeleton, then render:
  - Big number: "+$8,432 (+84.3%)"  (green if positive, red if negative)
  - Comparison: "vs BTC hodl: +12% · ETH hodl: +5%"
  - Equity curve chart (use the existing chart library — search components/
    for what's already imported, likely recharts or chart.js — REUSE IT)
  - Stats grid: trades, win rate, max DD, Sharpe, fees
  - Disclaimer footer: "Past performance does not predict future results.
    This simulation assumes 30bps round-trip fees and excludes slippage,
    MEV, and gas. Source addresses may not represent the figure's complete
    on-chain activity."

ACCEPTANCE CRITERIA
- API returns realistic results for at least 3 famous wallets:
    Vitalik (0xd8dA…), CZ's known ETH wallet, and one Solana memecoin trader.
- Backtest of Vitalik over the last 1y completes in < 15s on cold cache,
  < 500ms on warm cache.
- Equity curve has at least 1 point per day (no gaps).
- BTC hodl benchmark uses real BTC prices from CoinGecko (not hardcoded).
- The result for a wallet that did NOTHING in the period equals the
  starting capital (sanity check).
- Manual smoke test: run a backtest for a wallet that bought BONK at
  bottom in 2024 → should show massive return. If it shows 0%, the
  algorithm is broken — debug before shipping.
- Disclaimer is visible and legally defensive.

DO NOT
- Touch the signal engine or its calibration cron.
- Use mock data or fixtures in the API path.
- Skip the cache table — without it the CoinGecko free tier will rate-limit
  you within an hour of launch.

DELIVERABLES
- One commit per file group, ordered:
    feat(wallet-backtest): historical transfer fetchers (EVM + Solana)
    feat(wallet-backtest): cached CoinGecko historical price layer
    feat(wallet-backtest): engine + types + cache table migration
    feat(wallet-backtest): API endpoint with rate limit + cache
    feat(wallet-backtest): UI panel + integration into figure/whale pages
- Migration file: supabase/migrations/<today>_wallet_backtest_cache.sql
- Push and report all commit SHAs.
```

---

## EXECUTION ORDER & REVIEW GATES

1. **Run Prompt 1** in a fresh Claude Opus 4.7 session with web search enabled. Review the SQL file's top 80 lines. If quality is good, run the apply script against your Supabase DB.
2. **Run Prompt 2** in a new session. Review each commit on GitHub before merging the PR (or push directly to `main` if you trust the agent). Smoke-test `/admin/figures` locally with `npm run dev`.
3. **Run Prompt 3** in a new session. The agent will need ~1–2 hours of work. Smoke-test with Vitalik before going live.

After all three: your `/figures` page goes from "ghost town" to "60+ tracked figures with real wallets and historical P&L curves." That's the entire moat versus Arkham/Nansen for the long-tail figure use case — they show *positions*, you'll show *would-have-copied-them returns*.

---

## OPTIONAL PROMPT 4 — POLISH PASS (only if first 3 land cleanly)

```
[SHARED PREAMBLE]

Add to /figures and /wallet-tracker:
1. Sort figures by 90d backtested return (precomputed nightly cron).
2. "Top performers this week" leaderboard component on the hub.
3. Email digest: weekly "Top 5 wallets by 7d return" via Brevo (existing
   integration in brevo/).
Do not over-engineer. Reuse existing components. One commit per item.
```
