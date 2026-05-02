# Wallet-Personalized Dashboard — Implementation Prompt (for Claude Opus 4.7)

> **Paste everything below this line into Claude Opus 4.7 as a single message. It is a complete, self-contained spec for adding wallet connection + wallet-driven personalization to the Sonar Tracker dashboard.** It assumes the agent has read/write access to the repo and can run `npm install`.

---

## ROLE

You are a senior full-stack engineer working on **Sonar Tracker** — a Next.js 14 (App Router) / React 18 / Supabase / styled-components crypto whale-intelligence platform. You ship production code that is small, typed where the file is `.ts(x)`, and matches the existing terminal/Bloomberg aesthetic. You do not over-engineer. You do not introduce new design systems. You re-use existing primitives.

## OBJECTIVE

Add a **wallet-personalization layer** to the dashboard so that any visitor (free or premium) can:

1. **Connect** an Ethereum/EVM wallet (MetaMask, WalletConnect, Coinbase Wallet, Rabby) **or** a Solana wallet (Phantom, Backpack, Solflare) — or just **paste a public address** if they don't want to sign.
2. **Optionally sign in / sign up via that wallet** (SIWE for EVM, signed message for Solana) so a Supabase account is created/linked, no email required.
3. Have Sonar **fetch the wallet's real on-chain holdings** (token balances, USD value, % of portfolio) across the chains we already support.
4. **Auto-personalize the dashboard**: KPIs, signals, news, whale flows, alerts, and the AI summary become filtered/ranked around the tokens the user actually holds (their "Portfolio Tokens").
5. **Manually add/remove tokens** to the personalized set (e.g., "I'm watching SOL even though I don't hold it yet").
6. **Persist** the wallet, the holdings snapshot, and the personalized token set against the Supabase user (or a cookie-based anonymous session for guests).

This is the highest-leverage UX change we can ship: it converts the dashboard from a generic market view into a **"my whales, my tokens, my news"** view, which is the single biggest reason traders pay for Nansen / Arkham / DeBank.

---

## NON-NEGOTIABLE GUARDRAILS

These are inherited from `DASHBOARD_V2_PROMPT.md` and `LEGAL_AUDIT_2026-04-21.md` — **do not violate**:

1. **No investment advice.** Personalized panels MAY say *"You hold 4.2 ETH. Whales net-bought $47M of ETH in the last 24h."* They MUST NOT say *"You should buy more ETH"*, *"BUY signal for your ETH position"*, *"Recommended action: accumulate"*, or attach a directional confidence % to a price prediction. Re-use the existing non-advice disclaimer footer.
2. **Wallet connection is read-only.** Sonar MUST NEVER request `eth_sendTransaction`, `signTransaction`, `signAllTransactions`, token approvals, or any permission beyond `personal_sign` (EVM) / `signMessage` (Solana). The connection scope is *authentication and read-only balance lookup* only. Surface this in plain English on the connect modal.
3. **Sanctions / 18+ attestations** still apply if the user creates an account — the same checkboxes that gate `/api/auth/signup` MUST gate wallet sign-up. See `LEGAL_AUDIT_2026-04-21.md` finding A14.
4. **No private keys, ever.** No seed phrase input. No "import wallet". Connection only.
5. **Address-only mode (no signature)** is allowed and must be obvious — many users will paste a Vitalik-style public address to "try it" without connecting. Treat that session as anonymous + read-only and store nothing server-side beyond a 24h cache key.
6. **PII / data minimization.** Store the address (lowercase, checksummed where applicable), the chain, the linked `auth.users.id` (if signed in), and a holdings cache. Do not store balances of stablecoins below $1, NFTs, or LP positions in v1 — they add noise and surface area without revenue.
7. **Rate-limit every new endpoint** using `app/lib/rateLimit.js` (already used in `app/api/dashboard/summary/route.js`).
8. **Server-only secrets.** Alchemy / Helius / Moralis API keys go in `process.env.*` and are read **only** in `route.js` files. Never ship a key to the browser.

---

## WHAT EXISTS TODAY (read these before you write code)

- **Auth:** Supabase email/password + Google OAuth. Callback at `app/auth/callback/route.js` writes `profiles` row, stamps eligibility attestations. There is **no wallet auth** today.
- **DB:** Supabase Postgres. Relevant existing tables:
  - `auth.users` (Supabase managed)
  - `profiles` (id, display_name, over_18_confirmed_at, terms_accepted_at, sanctions_attestation_at, signup_ip, signup_user_agent, …)
  - `user_watchlists` (id, user_id, symbol, added_at) — token-symbol watchlist, RLS enabled, see `supabase/migrations/20260213_user_watchlists.sql`
  - `watchlists` + `watchlist_addresses` — wallet/entity follows (see `app/api/wallet-watchlist/route.js`)
  - `all_whale_transactions` — the firehose: token_symbol, classification (BUY/SELL), usd_value, blockchain, whale_address, from/to_address, timestamp
  - `wallet_profiles` — per-address aggregate (smart_money_score, entity_name, tags)
- **Existing wallet endpoints (whale-only data, useful as reference):**
  - `GET /api/wallet-tracker/[address]` — aggregate profile, falls back to computing from `all_whale_transactions`
  - `GET /api/wallet-tracker/[address]/holdings` — net buy/sell exposure per token, **only counts whale-classified txs** so a normal user wallet returns empty. We need a new path for real balances.
  - `GET /api/wallet-tracker/search?q=…` — address/entity search
- **Dashboard:** `src/views/Dashboard.js` (~1,289 lines). Currently shows generic market data. Already fetches `marketSentiment`, `riskMetrics`, `topHighValueTxs`, `tokenLeaders` etc. from `/api/dashboard/summary` and renders some of them. There is a `[watchlist, setWatchlist]` block fetching `/api/watchlist` (token symbols) — re-use this pattern.
- **Design system:** dark `#0a0e17`, cyan `#00e5ff`, green `#00e676`, red `#ff1744`, amber `#ffab00`. JetBrains Mono for data, Inter for UI. Glass panels with `backdrop-filter: blur(12px)`. Terminal prompts `> SECTION_NAME`. styled-components only (no Tailwind, no CSS modules). framer-motion for animations.
- **Stack constraints:** Next.js 14.2, React 18.2, no TypeScript on most files (mixed `.js`/`.jsx` in `app/`, `.ts(x)` allowed in `app/api/**` and `lib/**`). Do not introduce a different state library — local `useState` + `useEffect` is the convention.

---

## TECHNOLOGY CHOICES (decided — do not bikeshed)

These choices were researched against alternatives. Use them as given.

### Wallet connection libraries

| Need | Pick | Why |
|---|---|---|
| EVM connect (MetaMask/WC/Coinbase/Rabby) | **`wagmi` v2 + `viem` v2 + `@rainbow-me/rainbowkit` v2** | Industry standard, smallest API surface, RainbowKit's modal matches our dark aesthetic out of the box, supports WalletConnect v2 + injected + Coinbase + Safe. |
| Solana connect (Phantom/Backpack/Solflare) | **`@solana/wallet-adapter-react` + `@solana/wallet-adapter-react-ui` + `@solana/wallet-adapter-wallets`** | The canonical Solana stack. UI is themable. |
| EVM auth message | **SIWE (EIP-4361)** via the `siwe` npm package | Standard; verifiable server-side with `viem`. |
| Solana auth message | Custom message `Sign in to Sonar Tracker\nNonce: <nonce>\nIssued: <iso>` verified with `tweetnacl` + `bs58` server-side. (No mature "SIWS" standard yet but the pattern is identical.) |
| Bitcoin | **Address-paste only.** No BTC wallet connect in v1. Most BTC wallets don't expose a sign-message API consistently and BTC has no fungible tokens — the marginal UX is not worth the complexity. |

### Portfolio / balance data

We need real wallet balances (not just whale-classified flows). Pick **one provider per chain family** to keep cost predictable:

| Chain family | Provider | Endpoint we'll call |
|---|---|---|
| Ethereum, Polygon, Arbitrum, Base, Optimism | **Alchemy** | `alchemy_getTokenBalances` + `alchemy_getTokenMetadata` (batched). One API key works across all EVM networks Alchemy supports. |
| Solana | **Helius** | `getAssetsByOwner` (DAS API) — returns SPL tokens with metadata + USD value in one call. |
| BTC | `mempool.space` REST `/address/<addr>` for native balance only; no token enumeration. |
| Token USD prices (cross-check / fallback) | **CoinGecko** — we already have `app/api/coingecko/*` integrations. Use it to fill missing prices Alchemy/Helius don't provide. |

**Env vars to add** (document in README, do not commit values):

```
ALCHEMY_API_KEY=
HELIUS_API_KEY=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

### Supabase ↔ wallet auth bridge

Supabase doesn't natively support SIWE. The cleanest pattern that works on the current Supabase plan:

1. Browser: user connects wallet → requests a nonce from `POST /api/auth/wallet/nonce` → signs SIWE/Solana message → POSTs signature to `POST /api/auth/wallet/verify`.
2. Server (`/api/auth/wallet/verify`): verifies signature, then either:
   - **finds an existing `wallet_identities` row** linked to a `user_id` and uses `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email })` to mint a session, **OR**
   - **creates a synthetic user**: `email = ${address}@wallet.sonartracker.io`, random password, `email_confirm: true`, then inserts `wallet_identities` row, then mints the session link.
3. Server returns `{ access_token, refresh_token }` to the client which calls `supabase.auth.setSession(...)`.

This keeps RLS, `auth.uid()`, profile attestations, and Stripe tie-ins working unchanged. It also allows a user who already has an email account to **link** their wallet later (`POST /api/auth/wallet/link` while authenticated — no new user is created).

---

## DATA MODEL (new migrations)

Create `supabase/migrations/20260501_wallet_personalization.sql`:

```sql
-- 1. Wallet identities: a single auth.users.id may link multiple wallets
CREATE TABLE IF NOT EXISTS wallet_identities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,                -- lowercased
  chain TEXT NOT NULL CHECK (chain IN ('ethereum','solana','polygon','arbitrum','base','optimism','bitcoin')),
  is_primary BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,              -- set when SIWE/Solana sig verified; NULL for "address-paste only"
  label TEXT,                           -- user-friendly nickname e.g. "trading wallet"
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (address, chain)               -- a wallet maps to at most one user
);

CREATE INDEX IF NOT EXISTS idx_wallet_identities_user ON wallet_identities(user_id);

-- 2. Cached holdings snapshot per wallet (refreshed on read if older than ttl_seconds)
CREATE TABLE IF NOT EXISTS wallet_holdings_cache (
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  ttl_seconds INT DEFAULT 300,
  total_usd NUMERIC,
  holdings JSONB,                       -- [{ symbol, name, contract, balance, decimals, price_usd, value_usd, logo }]
  PRIMARY KEY (address, chain)
);

-- 3. Personalized token set (the user's "active tokens" for dashboard filtering)
--    Distinct from existing user_watchlists which is a strict watchlist.
--    A token enters this set automatically when detected in holdings >= $25,
--    and can be added/removed manually.
CREATE TABLE IF NOT EXISTS user_portfolio_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('detected','manual')),
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, symbol)
);

-- 4. Auth nonces (short-lived, for SIWE / Solana sign-in)
CREATE TABLE IF NOT EXISTS wallet_auth_nonces (
  nonce TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  consumed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_wallet_auth_nonces_issued ON wallet_auth_nonces(issued_at);

-- RLS
ALTER TABLE wallet_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolio_tokens ENABLE ROW LEVEL SECURITY;
-- wallet_holdings_cache and wallet_auth_nonces are service-role only (no policies)

CREATE POLICY "users read own wallet identities" ON wallet_identities
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users manage own wallet identities" ON wallet_identities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users read own portfolio tokens" ON user_portfolio_tokens
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users manage own portfolio tokens" ON user_portfolio_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

For **anonymous (guest) sessions** — i.e. someone who pasted an address without signing in — store the wallet + token set in a signed, httpOnly cookie (`sonar_guest_wallet`, max-age 24h, payload `{ address, chain, tokens: [] }`). Do not write guest data to Supabase.

---

## NEW API ENDPOINTS

All under `app/api/wallet/**`. All return JSON. All apply `rateLimit(...)` per IP. All read auth via the existing `Authorization: Bearer <jwt>` pattern (see `app/api/wallet-watchlist/route.js`). Wherever a route is callable by guests, accept the cookie session as fallback.

### 1. `POST /api/auth/wallet/nonce`
- Body: `{ address: string, chain: 'ethereum'|'solana'|... }`
- Validates address format (re-use the regex from `app/api/wallet-tracker/[address]/route.js`).
- Inserts a row into `wallet_auth_nonces` with a random 16-byte nonce.
- Returns `{ nonce, message }` where `message` is the canonical SIWE string (EVM) or the plain Solana message.

### 2. `POST /api/auth/wallet/verify`
- Body: `{ address, chain, signature, nonce }`
- Verifies the signature:
  - EVM: `import { SiweMessage } from 'siwe'` → `verify({ signature })` against the nonce-bound message; or `viem.verifyMessage`.
  - Solana: `nacl.sign.detached.verify(messageBytes, sigBytes, bs58.decode(address))`.
- Marks nonce consumed; rejects re-use; rejects nonces older than 5 minutes.
- Looks up `wallet_identities` by `(address, chain)`:
  - If found → use linked `user_id`.
  - If not found → create a synthetic Supabase user (`${address}@wallet.sonartracker.io`, random password, `email_confirm: true`), stamp `profiles` attestations from the request body (the connect modal must collect them — see UI section), insert `wallet_identities` row with `verified_at = now()`, `is_primary = true`.
- Generates a session via `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email })`, exchanges the link's `token_hash` server-side for a session, returns `{ access_token, refresh_token, user }`.
- Browser then calls `supabase.auth.setSession({ access_token, refresh_token })`.

### 3. `POST /api/auth/wallet/link` (authenticated)
- Body: `{ address, chain, signature, nonce }`
- Same verification flow but **never** creates a new user. Inserts `wallet_identities` with the current `auth.uid()`. Returns the row.

### 4. `GET /api/wallet/[address]/portfolio?chain=ethereum`
- Public (rate-limited). The core balance endpoint.
- Reads `wallet_holdings_cache`; if `now - fetched_at < ttl_seconds`, returns cached.
- Otherwise calls **Alchemy** (EVM) or **Helius** (Solana):
  - EVM: `alchemy_getTokenBalances` → for non-zero balances, batched `alchemy_getTokenMetadata` → CoinGecko price lookup (re-use `app/api/coingecko/*`) → compute `value_usd`.
  - Solana: Helius DAS `getAssetsByOwner` with `displayOptions.showFungible=true` → it returns price in `token_info.price_info.price_per_token` already.
  - BTC: `mempool.space` `/address/<addr>` → single native holding, price from CoinGecko.
- Filters out: balances < $1 USD value, known scam-token contract list (maintain `lib/scam-tokens.json`, ship empty for v1), and stablecoins below $25 (configurable via query `?includeStables=1`).
- Returns:
  ```json
  {
    "address": "0x...",
    "chain": "ethereum",
    "fetched_at": "2026-05-01T...",
    "total_usd": 18342.55,
    "holdings": [
      { "symbol": "ETH", "name": "Ether", "contract": null, "balance": "4.2031", "decimals": 18, "price_usd": 3120.4, "value_usd": 13117.2, "pct": 71.5, "logo": "..." },
      ...
    ]
  }
  ```
- Writes back to `wallet_holdings_cache`.

### 5. `POST /api/wallet/personalize`
- Body: `{ address, chain }` (must be a verified wallet of `auth.uid()`, OR the guest-cookie wallet).
- Calls the portfolio endpoint internally.
- For each holding with `value_usd >= 25`, upserts into `user_portfolio_tokens` with `source='detected'` (auth users) or merges into the guest cookie's `tokens` array.
- Returns the resulting personalized token set.

### 6. `GET /api/portfolio/tokens`
- Returns the current user's `user_portfolio_tokens` (or guest-cookie tokens), enriched with current price + 24h change (re-use existing CoinGecko helper).

### 7. `POST /api/portfolio/tokens` / `DELETE /api/portfolio/tokens`
- Body: `{ symbol }`. POST inserts with `source='manual'`. DELETE removes regardless of source.

### 8. `GET /api/dashboard/summary?tokens=ETH,SOL,LINK`
- **Extend the existing endpoint** (`app/api/dashboard/summary/route.js`). When `tokens` is present, additionally compute and return a `personalized` block:
  ```json
  {
    "personalized": {
      "tokens": ["ETH","SOL","LINK"],
      "whaleFlow24h": [{ "symbol":"ETH","net_usd":47000000,"buy_count":12,"sell_count":4 }, ...],
      "topTxs": [...],     // top 5 whale txs across user's tokens
      "signals": [...],    // /api/signals filtered to user tokens
      "newsCount": 14
    }
  }
  ```
- Do NOT change the existing return shape. `personalized` is purely additive.

### 9. `GET /api/news/personalized?tokens=...` and `GET /api/signals?tokens=...`
- Add a `tokens` filter to existing endpoints (additive; no breaking changes).

---

## FRONTEND COMPONENTS

### A. `components/wallet/WalletProvider.jsx` (new)
- Wraps the app in `app/layout.jsx` (or a thin client wrapper imported from layout).
- Composes: `WagmiProvider` (wagmi v2) + `RainbowKitProvider` (dark theme, accent `#00e5ff`) + `ConnectionProvider` (Solana RPC = `https://api.mainnet-beta.solana.com` or our env) + `WalletProvider` (Solana adapter) + `WalletModalProvider`.
- Exports a `useActiveWallet()` hook that returns `{ address, chain, isConnected, isVerified, signIn, disconnect }` — this hides the EVM/Solana split from consumers.

### B. `components/wallet/ConnectWalletModal.jsx` (new)
A single modal users open from a "Connect Wallet" button in the dashboard command bar and from a new dashboard hero panel. Contents:

1. **Three tabs** at top: `EVM` · `Solana` · `Paste address`.
2. EVM tab → renders RainbowKit's `<ConnectButton />`.
3. Solana tab → renders `<WalletMultiButton />` from the Solana adapter.
4. Paste tab → input with the address regex from `app/api/wallet-tracker/[address]/route.js`, chain dropdown.
5. After connection (any tab), if user is **not** signed in, show a secondary CTA: **"Sign in with this wallet"** (calls nonce → sign → verify flow). This step is optional — they can use Sonar fully without signing in, but personalization won't persist past 24h.
6. The "Sign in with this wallet" CTA must surface the **same three attestation checkboxes** as `/api/auth/signup` (18+, Terms, not in sanctioned jurisdiction). These must be checked before the signature is requested. POST them to `/api/auth/wallet/verify` so the server stamps `profiles`.
7. Plain-English copy: *"Sonar will only request a read-only signature to prove ownership. We will never request token approvals or transactions."*

### C. `components/wallet/PortfolioPanel.jsx` (new dashboard section)
- New top-of-dashboard panel inserted **between the Live Whale Feed ticker and the KPI strip** (see `DASHBOARD_V2_PROMPT.md` layout).
- Two states:
  - **Empty (no wallet):** Hero card with copy *"Personalize your dashboard around YOUR tokens."* + the `Connect Wallet` button + secondary *"Just paste an address →"* link. Show 3 example screenshots/animations.
  - **Connected:** Compact card showing:
    - Wallet pill: `0x3f…a7 · ETH` with chain icon, copy-to-clipboard, disconnect.
    - Total USD value (big number, monospace, green/red 24h delta).
    - Horizontal list of top 8 holdings as chips: `[ETH 71.5%] [SOL 14.2%] [LINK 6.8%] …` — clicking a chip filters the dashboard to that token (sets a global `activeTokenFilter` state via context).
    - Inline **"+ Add token"** button → small searchable token picker (re-use `/api/coingecko/trending` + `/api/coingecko/token-image` for the dropdown).
    - **"Refresh"** button (rate-limited to 1/min on the client).

### D. `components/wallet/PersonalizedDashboardContext.jsx` (new)
- React context storing `{ tokens: string[], setTokens, refresh }` so any dashboard panel can opt-in to personalization without prop drilling.

### E. Modify `src/views/Dashboard.js`
- Wrap the existing dashboard in `<PersonalizedDashboardContext.Provider>`.
- When `tokens.length > 0`, add a **toggle** at the top of the dashboard: `[All Markets] [My Tokens]`. Default to `My Tokens` if the user has any.
- When `My Tokens` is active:
  - Pass `?tokens=...` to `/api/dashboard/summary`.
  - Render a new section **"YOUR WHALES"** above `Net Inflows/Outflows` showing whale buy/sell flow **for the user's tokens only**, sourced from `personalized.whaleFlow24h`.
  - Filter `Most Traded Tokens`, `Top High-Value Transactions`, `AI Signal Cards`, and `Breaking News` to the user's tokens.
  - Add a small badge on each personalized panel: `> PERSONALIZED · 3 tokens`.
- When `All Markets` is active, behave exactly as today — no regression.

### F. Modify command bar in `src/views/Dashboard.js`
- Add a `Connect Wallet` button next to the username block. If a wallet is connected, replace it with a wallet pill (address truncated + chain icon).

### G. Add a small **"Connected wallet"** section to `app/profile/` so users can rename, set primary, or disconnect linked wallets (CRUD against `/api/wallet/identities`).

---

## ALGORITHM: AUTO-DETECTION OF PORTFOLIO TOKENS

When a wallet is connected (verified or address-paste):

1. Call `/api/wallet/[address]/portfolio?chain=...` for each connected chain.
2. Take all holdings with `value_usd >= 25` AND not in the stablecoin exclusion list (already defined in `app/api/dashboard/summary/route.js`).
3. Map each holding's `symbol` to the canonical symbol used in `all_whale_transactions.token_symbol` — most are direct matches; for ambiguous symbols (e.g., `WETH` → `ETH`, `WBTC` → `BTC`, `STETH` → `ETH`), maintain a small alias map in `lib/token-symbol-aliases.ts`.
4. Take the top 10 by `value_usd` and upsert into `user_portfolio_tokens` (or guest cookie) with `source='detected'`. Manual additions are preserved.
5. Display the resulting set in `PortfolioPanel`. The user can `+ Add` or `×` remove.

---

## STEP-BY-STEP IMPLEMENTATION ORDER

Do the work in this exact order. After each step, the app should still build and the existing dashboard should still render.

1. **Install deps:**
   ```
   npm i wagmi viem @tanstack/react-query @rainbow-me/rainbowkit siwe
   npm i @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
   npm i tweetnacl bs58
   ```
2. **Migration:** create `supabase/migrations/20260501_wallet_personalization.sql` (schema above). Add a note in README on how to run it.
3. **Server libs:** create `lib/wallet/alchemy.ts`, `lib/wallet/helius.ts`, `lib/wallet/btc.ts`, `lib/wallet/symbol-aliases.ts`. Each exports a single `getHoldings(address): Promise<Holding[]>`-style function.
4. **Endpoints (in this order):** `nonce` → `verify` → `link` → `portfolio` → `personalize` → `portfolio/tokens` GET/POST/DELETE → `summary` extension → `news`/`signals` `tokens=` filter.
5. **WalletProvider** + mount in `app/layout.jsx` (client wrapper).
6. **ConnectWalletModal** + the command-bar button.
7. **PortfolioPanel** with the empty + connected states; wire to the personalize endpoint on first connect.
8. **PersonalizedDashboardContext** + the `[All Markets] [My Tokens]` toggle in `Dashboard.js`.
9. **Personalization filters** on the dashboard panels (whale flow, signals, news, top txs).
10. **Profile page wallet management** section.
11. **Disclaimers, attestation checkboxes, copy review.**
12. **Telemetry:** instrument 4 events to the existing analytics layer — `wallet_connect_clicked`, `wallet_connected`, `wallet_signin_completed`, `personalized_view_enabled`.

---

## ACCEPTANCE CRITERIA

The feature is done when **all** of the following are true:

- A logged-out visitor can paste a public ETH address, see their real holdings (>$25) in the new PortfolioPanel within 3 seconds, and the dashboard's `Most Traded`, `Signals`, `News`, and a new `YOUR WHALES` panel auto-filter to those tokens. Refreshing the page within 24h restores the same view (cookie).
- A visitor can click **Connect Wallet → MetaMask → Sign in**, and the modal completes the SIWE flow, creates a Supabase user, stamps the three attestations, returns a session, and from then on the personalized state persists across devices.
- The same flow works for **Phantom** on Solana with a signed message verified server-side.
- A signed-in email user can **link** an additional wallet from the profile page without losing their original account.
- Toggling `[All Markets] [My Tokens]` on the dashboard switches the rendered data without a full page reload and never throws.
- No endpoint leaks a service role key, an Alchemy key, or a Helius key to the browser bundle.
- Lighthouse / build size: the dashboard route's first-load JS does not grow by more than **150 kB gzipped** vs. main. RainbowKit + wagmi + Solana adapters are heavy — tree-shake aggressively, dynamic-import the connect modal, and lazy-load the Solana adapter only when the Solana tab is opened.
- All new endpoints are rate-limited.
- All new tables have RLS enabled and tested with a non-owner JWT (returns empty / 403).
- The existing `/api/dashboard/summary` response shape is unchanged when `tokens` is absent.
- No panel ever displays a BUY/SELL recommendation tied to the user's holdings. Only descriptive on-chain observations.

---

## OUT OF SCOPE FOR V1 (do not build)

- Multi-wallet aggregation into a single combined portfolio view (we'll do this in v2 — for now switching wallets is a manual toggle).
- NFT, LP, lending, or staking position decoding (Zerion/Zapper-style). Token balances only.
- Bitcoin wallet *connection*. Address paste only.
- Hardware-wallet-specific UX flourishes — `wagmi` already handles Ledger via injected/WC; that is enough.
- A native mobile deep-link UX. Use WalletConnect's existing mobile flow.
- On-chain transaction *signing* of any kind.
- Backfilling existing email-only users with detected wallets (we'd need to ask them).

---

## DELIVERABLES

When you're done, output:

1. A single `git status` style summary listing every new and modified file.
2. The full SQL migration.
3. Any new env vars added, with a one-line description.
4. A 10-line README addition under `## Wallet Personalization` describing how a developer runs it locally (which keys are needed, how to seed a test wallet).
5. A short manual-QA script (numbered 1–10) that the founder can follow to verify the feature on a fresh browser session.

Begin.
