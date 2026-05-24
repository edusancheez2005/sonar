# Sonar — Honest Stance Document
**As of 2026-05-13. Written for downstream deep research with Claude Opus 4.7. No marketing language. No spin.**

---

## 1. What Sonar is, in one paragraph

Sonar Tracker is a multi-chain crypto on-chain intelligence product. It tracks whale wallets and large transactions across Ethereum, Bitcoin, Solana, Polygon, Arbitrum, Base, Optimism, BSC, Avalanche, and Fantom; aggregates them into a public dashboard, leaderboards, and entity profiles; runs a 4-tier composite signal engine across ~95 tokens; surfaces news and sentiment; and offers an AI chat ("ORCA") for natural-language queries over this data. It is built on Next.js 14 / React 18 deployed on Vercel, backed by Supabase Postgres, and monetized via Stripe at $7.99/month.

It is one solo founder's product, with ~$1,000 of grant spend to date (mostly Alchemy + APIs). It is live, real, and shipping daily — but it is also six product surfaces stitched together, and only some of them are actually differentiated.

---

## 2. Stack & infrastructure

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14.2.31 (App Router) | Auto-deploys from `main` branch on Vercel |
| Frontend | React 18, styled-components, framer-motion | Chart.js + lightweight-charts for visualizations |
| Backend | Next.js API routes + 19 Vercel cron jobs | No separate Node backend |
| Database | Supabase Postgres + PostgREST | 42 migrations applied; ~25 production tables |
| Auth | Supabase Auth + SIWE (Sign In With Ethereum) | RainbowKit (EVM) + Solana Wallet Adapter |
| Payments | Stripe v2024-06-20 | $7.99/mo Pro tier; webhook-driven subscription state |
| Hosting | Vercel (production) | Crons run on Vercel scheduler |
| Email | Brevo + Resend + Nodemailer | Brevo for marketing/weekly digests, Resend transactional |
| AI | OpenAI GPT-4o-mini | Sentiment analysis on news + ORCA chat |

---

## 3. Token & chain coverage

### Chains supported (10)
| Chain | Provider | Status |
|---|---|---|
| Ethereum | Alchemy | Live |
| Bitcoin | Mempool.space (free) | Live |
| Solana | Helius | Live |
| Polygon | Alchemy | Live |
| Arbitrum | Alchemy | Live |
| Base | Alchemy | Live |
| Optimism | Alchemy | Live |
| BSC | Free RPC | Live |
| Avalanche | Free RPC | Live |
| Fantom | Free RPC | Live |

### Token universe in the signal engine: ~95 tokens
- Defined in `app/api/cron/fetch-prices/route.ts` (`TICKER_MAP`)
- Top ~90 by market cap + memecoins (PEPE, SHIB, BONK, WIF, FLOKI)
- 35 low-liquidity tokens have CoinGecko fallback in `evaluate-signals/route.js` (`CG_ID_FALLBACK`)
- One known exclusion: `MATICUSDT` is on a hard skiplist (zombie pair frozen at $0.3794 since the POL migration)

### Tracked addresses / entities
- ~90 curated entities in `data/curated-entities-manifest.json` (CEXs, bridges, traders, VCs, governments, protocols, individuals)
- ~50 curated traders in `data/curated-traders-manifest.json` (ENS-verified where possible)
- Database tables: `curated_entities`, `addresses`, `tracked_address_universe`, `tracked_address_transfers`, `wallet_follows`, `all_whale_transactions`
- Marketing copy says "70,000+ tracked wallets" — actual count in `addresses` is the source of truth and should be verified before any external use

---

## 4. Page surface (the six products inside Sonar)

This is the honest count of distinct product areas the user sees:

### A. Whale tracker
- `/whale-tracker`, `/bitcoin-whale-tracker`, `/ethereum-whale-tracker`, `/solana-whale-tracker`, `/whales`, `/statistics`, `/wallet-tracker`, `/wallet-tracker/[address]`, `/entities`
- Real, multi-chain, live data
- The strongest leg of the product

### B. Signal engine
- `/api/signals/accuracy`, embedded into token pages
- `HIDE_BULLISH_SIGNALS=true` is currently set in production — all BUY emissions are muted to NEUTRAL pending IC re-audit
- 4-tier composite (CEX whale flow / momentum-volume / sentiment-social / EOA-community) + optional 5th derivatives tier
- See `SIGNAL_PIPELINE_2026-05-13.md` for the deep dive

### C. AI advisor (ORCA)
- `/ai-advisor`, `/ai-crypto-signals`
- BETA badge in production
- 2 prompts/day free, 10/day for Pro
- Quota enforced by `user_quotas` table
- OpenAI moderation API + OFAC keyword screen NOT yet wired (flagged in `LEGAL_AUDIT_2026-04-21.md`)

### D. News & sentiment
- `/news`, `/blog`
- LunarCrush + CryptoPanic ingestion every 4h
- GPT-4o-mini sentiment analysis layered on top
- `news_items`, `sentiment_scores` tables

### E. Trader profiles & backtests
- `/figures`, `/figures/[slug]`, `/backtest`
- `figure_backtests` table; daily cron computes 7d/90d returns for each curated figure
- Replay accuracy vs live unknown (no validation harness)
- Yellow legal disclaimer banner on `/backtest`

### F. Personalization
- `/watchlist`, `/profile`, `/personalize`, `/dashboard`
- Auth required; data stored in `profiles`, `wallet_personalization`
- Telegram alerts cron runs every 5 min for opted-in users

---

## 5. Cron schedule (19 jobs)

From `vercel.json`:

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/fetch-prices` | `*/15 * * * *` | Binance + CoinGecko → `price_snapshots` |
| `/api/cron/compute-signals` | `5,20,35,50 * * * *` | Run 4-tier engine → `token_signals` |
| `/api/cron/evaluate-signals` | `30 * * * *` | Score 1h/6h/24h outcomes → `signal_outcomes` |
| `/api/cron/accuracy-watchdog` | `0 */6 * * *` | Auto-trip/clear `signal_circuit_breaker` |
| `/api/cron/calibrate-signals` | `0 3 * * *` | Per-token IC → `token_signal_calibration` |
| `/api/cron/cache-derivatives` | `*/5 * * * *` | Binance Futures → `derivatives_cache` |
| `/api/cron/whale-alerts/sync` | `*/10 * * * *` | Ingest whale txs |
| `/api/cron/poll-tracked-addresses` | `10 * * * *` | Refresh user-tracked addresses |
| `/api/cron/refresh-wallets` | `0 * * * *` | Refresh cached personalization |
| `/api/cron/ingest-news` | `0 */4 * * *` | LunarCrush + CryptoPanic |
| `/api/cron/analyze-sentiment` | `15 */2 * * *` | GPT-4o-mini sentiment |
| `/api/cron/aggregate-sentiment` | `0 * * * *` | Hourly sentiment rollup |
| `/api/cron/ingest-social` | `30 */2 * * *` | LunarCrush social signals |
| `/api/cron/weekly-insights` | `0 14 * * 6` | AI weekly brief + Brevo email |
| `/api/cron/telegram-alerts` | `*/5 * * * *` | Push alerts |
| `/api/cron/whale-whisper` | `0 */4 * * *` | Whale activity summaries (purpose unclear) |
| `/api/cron/seo-article` | `0 8 * * *` | AI-generated SEO blog post |
| `/api/cron/backtest-figures` | `0 4 * * *` | Recompute figure backtests |
| `/api/cron/weekly-top-wallets` | `0 15 * * 0` | Sunday wallet ranking |

---

## 6. Database schema (key tables)

### Signal engine
| Table | Purpose |
|---|---|
| `token_signals` | Each emission: token, signal label, score 0-100, raw_score, tier1..4 scores+confidence, top_factors, traps, price_at_signal, computed_at, market_cap |
| `signal_outcomes` | Eval result per (signal × window): price_at_eval, price_change_pct, btc_change_pct, alpha_pct, beat_benchmark, correct, eval_time, eval_window, **suspect**, **suspect_reason** |
| `signal_circuit_breaker` | Per-direction (BUY/SELL): active, acc_pct, sample_size, triggered_at, cleared_at, reason |
| `token_signal_calibration` | Per-token IC over 1h/6h/24h, sign_multiplier, sample_size |
| `signal_calibration_snapshot` | Operator-approved calibration override |

### Market data
| Table | Purpose |
|---|---|
| `price_snapshots` | 15-min price snapshots for ~95 tokens |
| `derivatives_cache` | Funding, OI, L/S ratio, taker volume per token |
| `news_items` | Title, URL, sentiment_raw, sentiment_llm |
| `sentiment_scores` | Hourly aggregated per ticker |
| `system_health` | Cron run logs (component, status, started_at, details JSONB) |

### Whales / entities
| Table | Purpose |
|---|---|
| `curated_entities` | Named entities (CEX, protocol, trader, etc.) |
| `addresses` | Address → entity mapping with classifier metadata |
| `tracked_address_universe` | Arkham-enriched ingestion scope |
| `tracked_address_transfers` | Snapshot of recent txs per address |
| `all_whale_transactions` | Whale tx feed used by Tier 1 |
| `wallet_follows` | User → addresses they're tracking |

### User / payments
| Table | Purpose |
|---|---|
| `profiles` | Country, experience, interests, telegram, twitter, preferred_chains |
| `subscriptions` | Stripe customer/sub IDs, status, plan, period dates |
| `user_quotas` | Daily AI prompt quota |
| `wallet_personalization` | Preferred tokens, alert thresholds |

### Editorial / community
| Table | Purpose |
|---|---|
| `figure_backtests` | Computed 7d/90d returns per figure |
| `weekly_insights` | AI-generated weekly briefs |
| `blog_posts` | SEO blog content |
| `figure_submissions` | Pending user-submitted traders |
| `contact_messages` | Support inbox |
| `data_removal_requests` | GDPR audit trail |

---

## 7. External data dependencies

| Provider | What we use | Cost so far | Risk if it dies |
|---|---|---|---|
| **Binance data-api.binance.vision** | Spot prices, klines, ticker (no key) | Free | Critical — primary price feed |
| **Binance Futures fapi** | Funding, OI, L/S, taker (no key) | Free | High — kills 25-30% of signal engine weight |
| **Coinbase API** | Canary cross-check | Free | Low — diagnostic only |
| **CoinGecko** | Fallback prices for thin pairs | Free tier | Medium — 35 tokens |
| **LunarCrush** | Social, Galaxy Score, news | Free / cheap tier | Medium — Tier 3 sentiment |
| **CryptoPanic** | News | Free | Low — news only |
| **Helius** | Solana RPC | Pay-as-you-go | High for Solana whales |
| **Alchemy** | EVM RPC across 6+ chains | **~$800 spent** | Critical for EVM whales |
| **Mempool.space** | Bitcoin UTXO | Free | High for BTC whales |
| **Arkham Intelligence (API)** | Entity enrichment | Used in scripts only | Low — already harvested |
| **OpenAI** | Sentiment + ORCA chat | Variable per usage | Medium — degrades AI features |
| **Stripe** | Payments | % of revenue | Critical for monetization |
| **Brevo** | Email | Sub fee | Low — could swap to Resend |

---

## 8. The signal engine, in 200 words

A 4-tier weighted composite producing a 0-100 score, mapped to one of five labels (STRONG SELL / SELL / NEUTRAL / BUY / STRONG BUY) using fixed band thresholds (≤28 / ≤42 / 43-57 / ≥58 / ≥72). Tier 1 is CEX whale flow (~30% weight), Tier 2 is price momentum + volume (~30%), Tier 3 is news + social sentiment (~5%), Tier 4 is on-chain activity + community (~5-10%), and an optional Tier 5 is derivatives (funding, OI, L/S ratio, taker pressure) at ~25-30%.

Outputs are written to `token_signals` every ~15 min for ~95 tokens. The evaluator compares the price at signal time vs price at +1h, +6h, +24h to write `signal_outcomes` rows with `correct`, `price_change_pct`, `alpha_pct`, `beat_benchmark`, and `suspect` flags. A watchdog cron auto-trips per-direction circuit breakers when 6h accuracy drops below 35% on n≥25; auto-clears at ≥45%.

**Honest truth:** This is a hand-tuned linear heuristic, not a machine-learning model. On clean post-2026-05-11 data (n=966), it shows no positive alpha at any horizon on either side. See `SIGNAL_PIPELINE_2026-05-13.md` for full math and the latest measured PnL.

---

## 9. Honest measured performance (post-fix, 2026-05-11 → 2026-05-13)

After two frozen-cache bugs were fixed and 1040 + 267 quarantined rows excluded:

| Window | Side | n | Win | Net/trade (10bps fee) | Alpha vs BTC |
|---|---|---:|---:|---:|---:|
| 1h | BUY | 145 | 42.1% | −0.24% | −0.17% |
| 1h | SELL | 182 | 52.2% | −0.06% | +0.05% |
| 6h | BUY | 160 | 31.2% | −0.82% | −0.75% |
| 6h | SELL | 184 | 48.4% | −0.29% | −0.10% |
| 24h | BUY | 159 | 5.0% | −3.80% | **−2.85%** |
| 24h | SELL | 119 | 63.9% | −21.94% | **−22.54%** |

**The engine has no measurable edge on clean data.** BUY consistently buys local tops at the 24h horizon. SELL has a high win rate but catastrophic tail (occasional pumps wipe out many small wins). The 24h SELL row is the most damning: 64% win rate but −22% net per trade.

The watchdog correctly auto-tripped BUY on 2026-05-13 at 26.5% win rate; emissions are now muted to NEUTRAL.

---

## 10. The two fetch-cache bugs (2026-05-06 and 2026-05-11)

**Root cause:** Next.js wraps `fetch()` and applies framework-level caching by default. Routes calling `fetch()` without `{ cache: 'no-store', next: { revalidate: 0 } }` were served stale snapshots indefinitely.

**Bug 1 (2026-05-06):** `/api/cron/fetch-prices/route.ts` froze BTC at $76,876 from May 6. Detected days later. Fixed in commit `ac98405`. 267 rows quarantined.

**Bug 2 (2026-05-11):** Same root cause in `/api/cron/evaluate-signals/route.js`, missed by the May 6 sweep. ~47% of post-May-7 evaluator runs read $76,876 from cache. **This inverted the engine verdict** (was claiming BUY 85% win rate / +4.42% net at 24h — that was an artifact of dividing real prices by frozen prices). Fixed in commit `508a1aa`. 1040 rows quarantined via migration `20260511a_quarantine_evaluator_frozen_cache.sql`.

**Bug 3 sweep (2026-05-11):** Same pattern found in 7 more files: `compute-signals`, `derivativesData.ts`, `whale-whisper`, `smart-money`, `token/price`, `token/comprehensive-data`, `ticker`. All fixed in commit `21bde0b`.

**Hardening:** New `scripts/audit-pipeline-health.mjs` runs 7 checks: live BTC vs Binance, price_snapshots drift, fetch-prices health, btc_price_at_eval per-hour distinctness, recent eval row drift vs live, circuit breaker state, signal freshness, and arithmetic recomputation of price_change_pct vs stored values.

**Lesson:** Always falsify model output against the underlying market. "SELL +4%/trade while BTC is flat" is mathematically impossible without short alpha and should trigger reflexive disbelief.

---

## 11. Marketing surface — what we publicly claim

### SEO landing pages (live)
`/whale-tracker`, `/bitcoin-whale-tracker`, `/ethereum-whale-tracker`, `/solana-whale-tracker`, `/ai-crypto-signals` (BETA), `/statistics`, `/blog`, `/figures`, `/glossary`, `/help`, `/faq`

### Pulled / disabled
- `/arkham-alternative` — pulled 2026-04-21 due to Lanham Act §43(a) concerns (used Arkham trademark, omitted competitor's free tier in comparative claims). Currently 301 redirects to `/pricing`.
- `/nansen-alternative` — status unverified

### Claims that are over-stated
1. **"700+ traders trust Sonar"** — homepage meta. Actual user count not exposed via any endpoint and unverified. Likely aspirational copy.
2. **"AI-powered signals"** — `HIDE_BULLISH_SIGNALS=true` is active in prod. Bullish signals are being muted. Marketing copy doesn't disclose this.
3. **"Win rate" / "alpha" framing on signals** — measured edge is negative on clean data; copy that implies positive edge needs to be removed before any further marketing push.

### Claims that are accurate
- Real-time multi-chain whale tracking ✅
- 90+ curated entities ✅
- Stripe-billed $7.99/mo Pro tier ✅
- BETA badge on AI features ✅
- GDPR / PECR / CCPA disclosure pages live ✅

---

## 12. Legal & compliance state

From `LEGAL_AUDIT_2026-04-21.md`:

**Done:**
- Removed advisory language ("BUY/SELL signals", "alpha", "edge", "actionable", "guaranteed", "win rate") from public pages.
- Added prominent disclaimers on `/backtest`, `/ai-crypto-signals`, `/ai-advisor`.
- GDPR/PECR/CCPA pages live: `/legal`, `/privacy`, `/terms`.
- `data_removal_requests` table for erasure audit.
- Pulled `/arkham-alternative`.

**Outstanding (TODO from same audit):**
- ORCA AI chat needs OpenAI moderation API + OFAC keyword screen wired in.
- Brevo double-opt-in not yet executed (PECR gap for newsletter).

**Visa-related (per Olu, 2026-05):**
- Founder is on UK Student visa.
- Grant funds usable only for early-stage concept dev / R&D — NOT customer acquisition, sales, trading, or self-payment.
- Sonar accepts Stripe payments (current plan: $7.99/mo). This is genuine commercial activity and creates tension with the visa restrictions on "self-employment / business activity." This needs explicit resolution with Olu before any marketing push or revenue scaling.

---

## 13. Spend to date (~$1,000)

- **Alchemy:** ~$800 (EVM RPC infrastructure for 6+ chains)
- **Other APIs:** ~$200 (CoinGecko, Helius, market data)
- **Tools used (subscription, smaller):** X Premium (research), Brevo (email), Holo AI (trialled and dropped)
- **No spend on:** ads, paid acquisition, paid marketing, contractors, paying self

---

## 14. Honest list of half-built / overclaimed / fragile things

### Critical
1. **Signal engine has no measurable edge on clean data** (post-2026-05-11). Marketing must reflect this.
2. **`HIDE_BULLISH_SIGNALS=true` is active** but copy claims AI signals. Misleading.
3. **Production env vars (Vercel) may differ from local** — e.g. expired CoinGecko key. Fixable only via Vercel dashboard, not code.

### Significant
4. **Tier 4 (EOA + community) is sparse** — 5-10% weight but mostly fallback data; commits/votes/participations not actually integrated.
5. **Figure backtests** — no validation harness comparing replay vs live; replay correctness unknown.
6. **Weekly insights** — first runs may be placeholder text.
7. **Whale-whisper cron** — running every 4h but unclear what consumes it.
8. **ORCA moderation gap** (legal TODO).
9. **Brevo double-opt-in gap** (legal TODO).

### Cosmetic
10. **`ChainLandingClient.jsx` `ChartMock` component** — labeled "LIVE DATA DEMO" but is a static animated mockup. Real data lives on `/statistics` and `/dashboard`.
11. **STRONG band labels rarely fire** — tanh saturation in tier composition; thresholds were set arbitrarily, not empirically.

### Inert / quarantined
12. **`TIER1_SIGN_BY_TOKEN`** — deleted 2026-04-30, replaced by live calibration.
13. **Look-ahead columns** (`price_*_later`, `return_*`) — deleted 2026-05-02 to prevent backtest leakage.
14. **267 + 1040 `signal_outcomes` rows** — quarantined via `suspect=true` flag, never deleted.

---

## 15. Strategic position (founder's honest read, 2026-05-13)

### What we genuinely have that competitors don't
1. **Multi-chain whale tracking that actually works on BTC + Solana + EVM equally.** Nansen and Arkham are EVM-heavy. DeBank is portfolio-first not whale-flow. There is a real gap.
2. **Self-auditing signal pipeline** with quarantine, circuit breakers, watchdogs, and a 7-check end-to-end audit script. None of the major competitors publish anything like this.
3. **Honest UX** — explicit disclaimers, removed guarantee chips, BETA badges on unproven features.

### What we lack vs the leaders
1. **Wallet labels at scale** — Nansen's real moat is 4 years of manual labelling. Our `curated_entities` is 90 entries; theirs is in the tens of thousands.
2. **Brand recognition / SEO** — "Nansen" and "Arkham" are search terms.
3. **A clear one-sentence product** — Sonar today is six products. Each one is mid because attention is split.

### The candidate pivot (under discussion, not committed)
Reposition Sonar as: **"the honest multi-chain whale tracker. Open methodology. No black boxes."**

- Whale feed becomes the homepage.
- Signals demote from headline to a contextual chip on each whale event.
- Tagline candidates: "Crypto, with the receipts" / "See what big money is actually doing across every chain" / "The honest whale tracker. Every chain. Open methodology."
- The signal engine keeps running internally (powers the chip, the watchdog, the quarantine) but the user never sees a "BUY / SELL" label that implies an action.
- Marketing copy and SEO pages get a truth pass to remove all alpha / win-rate claims.

This pivot is not yet implemented. As of this document's date, the signal-as-headline framing is still live in production.

---

## 16. What this document is for

This is the source-of-truth state document for Sonar as of 2026-05-13. It exists so that downstream deep-research conversations (with Claude Opus 4.7 or any other large model) have a complete, honest, hype-free baseline. Any external claim about Sonar should be verifiable against this document or against the codebase directly.

Last verified: 2026-05-13. Pipeline status at time of writing: ✅ PASS (all 7 audit checks green). Signal engine status: BUY auto-suppressed by watchdog; SELL active but with no measured edge. Founder mood: realistic, considering a pivot to whale-tracker-first positioning.
