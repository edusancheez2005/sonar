# ORCA — Proactive Alerts (In-App Inbox + Optional Email) Build Prompt

**Audience:** the next coding agent.
**Builds on:** Stage E (memory + personalisation) and the inline-tiles prompt (`ORCA_INLINE_TILES_BUILD_PROMPT.md`). Read that one first — same design language, same hard rules.
**Scope:** turn ORCA from "ask and wait" into a real copilot. Every ~5 minutes, evaluate each user's watchlist + holdings against price / whale / signal thresholds; deliver one-line notifications to (a) an in-app inbox (cyan bell in the global nav with an unread dot) and (b) an optional Brevo email digest. Voice writes from inside chat let users create, list, and cancel their own alert rules.
**Out of scope:** SMS, push notifications, third-party integrations (Telegram, Discord), portfolio P&L, anything that writes orders.

---

## 0. Hard rules (do not break)

1. **Reuse every existing pattern.** Cron auth = `Bearer ${CRON_SECRET}`. Server admin client = `supabaseAdminFresh`. JWT verification = the exact 12-line block from `app/api/personal/watchlist/route.js`. Email = the `sendBrevoCampaign` pattern from `app/api/cron/weekly-top-wallets/route.ts`. RLS migration shape = `supabase/migrations/20260525_user_profile_and_copilot_memory.sql`.
2. **No new chart library, no new email provider, no new ORM.** Everything ships on what's already in `package.json` and the existing Brevo / Supabase / Vercel stack.
3. **GDPR + compliance**:
   - Email is **opt-in only**, default off. Existing users have to flip a switch.
   - Every email includes the required footer block per `brevo/COMPLIANCE_CHECKLIST.md`: sender identity, one-click unsubscribe, `List-Unsubscribe` header, past-performance disclaimer.
   - In-app notifications are scoped by RLS; an authed user only ever sees their own rows.
   - All tables `ON DELETE CASCADE` from `auth.users(id)` so account deletion removes everything.
4. **No directional language in the alert copy.** Alerts state what happened (`SOL -5.2% in last 24h`, `Whale net inflow on LINK +$1.4M last 1h`), not what to do. No "buy", "sell", "target", "rally", "crash". Compliance.
5. **Hard rate caps**:
   - Per user: at most 1 in-app row per (alert_rule_id, hour). Re-trigger of the same rule within that hour deduplicates.
   - Per user per day: at most **20 in-app notifications**, **3 email digests**.
   - Per user: at most **50 active alert rules**. Creates past that return `quota_exceeded`.
6. **No new visible errors anywhere.** Every fetch, send, and DB write is `try/catch` and logs to `orca_traces` with `stage='alerts'`. UI degrades to empty state, never to a red banner.
7. **No surface deletions, no prompt regressions.** The chat path keeps the v1 long-form note. Alerts are an ADDITION.
8. **SSR-safe.** Every new client file starts with `'use client'`. No `window` reads outside `useEffect`.
9. **Tests stay green.** `npx vitest run` finishes at the same count or higher. Add tests for every new helper, migration, and route per §10.
10. **No emojis** (house rule §3.5.2). Cyan + mono everywhere — share design tokens with `components/orca/inline/tileTokens.js` from the previous stage.

---

## 1. The mental model

Two background loops, one foreground inbox, one settings page, one chat extension.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKGROUND (cron, server-side)                   │
│                                                                     │
│  every 5 min:  /api/cron/check-user-alerts                          │
│    └─ load all enabled rules → evaluate against latest snapshots    │
│       → insert user_notifications rows (dedup by (rule_id, hour))   │
│                                                                     │
│  every 1 hour: /api/cron/send-email-digests                         │
│    └─ for each user with email opt-in + unread notifications        │
│       since last_email_at, batch into one Brevo "Orca pulse" email  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FOREGROUND (client, in-app)                      │
│                                                                     │
│  • OrcaBell in global nav — unread dot, opens OrcaInbox drawer      │
│  • OrcaInbox drawer — list of notifications, mark read, click to    │
│      open a re-ask in the existing ORCA drawer                      │
│  • /dashboard/personal → Alerts tab (new) — manage rules            │
│  • Chat fastWrites — "alert me when SOL drops 5%" / "list my        │
│      alerts" / "remove SOL alert"                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database (one migration, three tables)

Add `supabase/migrations/20260603_user_alerts_and_notifications.sql`. Mirror the style of the Stage E migration. **Every table is `ON DELETE CASCADE` from `auth.users(id)`.**

### 2.1 `user_alerts` — rule definitions

```sql
CREATE TABLE IF NOT EXISTS public.user_alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker        text NOT NULL CHECK (ticker ~ '^[A-Z0-9._-]{1,12}$'),
  kind          text NOT NULL CHECK (kind IN (
                  'price_move',         -- |price_change_24h| >= threshold_pct
                  'whale_flow',         -- |whale_net_flow_24h_usd| >= threshold_usd
                  'signal_flip',        -- unified_direction changed from NEUTRAL → BUY|SELL
                  'news_high_impact'    -- news article with sentiment_score >= 0.6 in last 1h
                )),
  threshold_pct numeric CHECK (threshold_pct IS NULL OR threshold_pct > 0),
  threshold_usd bigint  CHECK (threshold_usd IS NULL OR threshold_usd > 0),
  enabled       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Exactly one of price/whale thresholds must be set when applicable.
  CONSTRAINT chk_threshold_shape CHECK (
    (kind = 'price_move'        AND threshold_pct IS NOT NULL AND threshold_usd IS NULL) OR
    (kind = 'whale_flow'        AND threshold_usd IS NOT NULL AND threshold_pct IS NULL) OR
    (kind IN ('signal_flip','news_high_impact') AND threshold_pct IS NULL AND threshold_usd IS NULL)
  ),
  -- Dedup: at most one (user, ticker, kind) row.
  UNIQUE (user_id, ticker, kind)
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_enabled
  ON public.user_alerts (ticker) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_user_alerts_user
  ON public.user_alerts (user_id, updated_at DESC);

ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_alerts_select_own ON public.user_alerts;
CREATE POLICY user_alerts_select_own ON public.user_alerts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_alerts_insert_own ON public.user_alerts;
CREATE POLICY user_alerts_insert_own ON public.user_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_alerts_update_own ON public.user_alerts;
CREATE POLICY user_alerts_update_own ON public.user_alerts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_alerts_delete_own ON public.user_alerts;
CREATE POLICY user_alerts_delete_own ON public.user_alerts
  FOR DELETE USING (auth.uid() = user_id);
```

### 2.2 `user_notifications` — inbox rows

```sql
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id              bigserial PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id         uuid REFERENCES public.user_alerts(id) ON DELETE SET NULL,
  ticker          text NOT NULL,
  kind            text NOT NULL,           -- mirrors user_alerts.kind for filtering
  title           text NOT NULL,           -- "SOL -5.2% in last 24h"
  body            text NOT NULL,           -- "Net whale flow on SOL was -$2.1M, 3x the 7d baseline."
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,  -- raw numbers for re-render
  dedup_hour      timestamptz NOT NULL,    -- date_trunc('hour', now()) — used in UNIQUE below
  read_at         timestamptz,
  emailed_at      timestamptz,             -- set when included in a digest
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, rule_id, dedup_hour)    -- the 1-per-rule-per-hour cap
);

CREATE INDEX IF NOT EXISTS idx_user_notif_user_unread
  ON public.user_notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_notif_user_all
  ON public.user_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notif_email_pending
  ON public.user_notifications (user_id, created_at)
  WHERE emailed_at IS NULL;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notif_select_own ON public.user_notifications;
CREATE POLICY user_notif_select_own ON public.user_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Writes ONLY via service-role (the cron). No insert/update policy for clients.
-- Mark-as-read uses an admin endpoint that injects user_id from the JWT (see §6.4).
DROP POLICY IF EXISTS user_notif_update_own ON public.user_notifications;
CREATE POLICY user_notif_update_own ON public.user_notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### 2.3 Extend `user_profile` (no new table for prefs)

Add four columns to the existing profile table to avoid sprawl:

```sql
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS notifications_in_app   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_email    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notifications_quiet_hours_utc int4range,
    -- e.g. '[22,7)'::int4range = quiet 22:00–07:00 UTC; null = always on
  ADD COLUMN IF NOT EXISTS notifications_last_email_at timestamptz;

COMMENT ON COLUMN public.user_profile.notifications_email IS
  'Opt-in (default false). When true and the user has unread notifications since notifications_last_email_at, the hourly digest cron includes them in a Brevo email.';
```

The existing `user_profile.notification_style` column (`quiet|balanced|frequent`) is repurposed: it scales the per-day cap (`quiet`=5, `balanced`=10, `frequent`=20 in-app; email digest cap unaffected).

---

## 3. Cron 1 — `/api/cron/check-user-alerts` (every 5 min)

File: `app/api/cron/check-user-alerts/route.ts`. Mirror the auth + telemetry pattern of `app/api/cron/compute-signals/route.js`.

### 3.1 Auth + skeleton

```ts
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const startedAt = Date.now()
  // … evaluation loop here …
  return NextResponse.json({ ok: true, ms: Date.now() - startedAt, fired, dedup })
}
```

Add to `vercel.json` `crons[]`:
```json
{ "path": "/api/cron/check-user-alerts", "schedule": "*/5 * * * *" }
```

### 3.2 Evaluation loop (sketch — implement exactly)

1. Pull every enabled rule, joined with its user_id:
   ```sql
   SELECT a.id, a.user_id, a.ticker, a.kind, a.threshold_pct, a.threshold_usd
   FROM   public.user_alerts a
   JOIN   public.user_profile p ON p.user_id = a.user_id
   WHERE  a.enabled = true
     AND  p.notifications_in_app = true
   ORDER  BY a.ticker;
   ```
2. Group by `ticker` so each ticker's underlying snapshots are read once per cron tick.
3. For each (ticker, kind) bucket, run a single query against the canonical source. **No new endpoints — query the tables directly with `supabaseAdminFresh`.**

| Kind | Source | Trigger condition |
|---|---|---|
| `price_move` | `price_snapshots` latest row for ticker | `abs(price_change_24h) >= threshold_pct` |
| `whale_flow` | `all_whale_transactions` rolling 24h sum (buy − sell USD) for ticker | `abs(net_24h_usd) >= threshold_usd` |
| `signal_flip` | `token_signals` latest 2 rows for ticker | most-recent `unified_direction` ≠ prior AND most-recent is `BUY`/`SELL`/`STRONG BUY`/`STRONG SELL` |
| `news_high_impact` | `news_items` for ticker, `published_at >= now() - 1h` | any row with `sentiment_score >= 0.6` OR `<= -0.6` |

4. For each rule that triggers:
   - Compute `dedup_hour = date_trunc('hour', now())`.
   - Build `title`/`body` from the helpers in §3.3.
   - `INSERT … ON CONFLICT (user_id, rule_id, dedup_hour) DO NOTHING`. The unique index does the per-hour dedup for free.
5. After the loop, enforce the daily cap by post-trim: for each user that exceeded their `notification_style`-scaled cap in the last 24h, soft-delete (`UPDATE … SET read_at = now()` on the *oldest* extras). Trim is a single SQL with a CTE.

### 3.3 Copy generators (`lib/orca/alerts/format.ts`)

Pure functions, fully unit-tested. **Never directional. Never speculative.**

```ts
export function formatPriceMove(t: string, pct: number): { title: string; body: string }
// "BTC moved -5.2% in last 24h", "Largest 24h move on your watchlist."

export function formatWhaleFlow(t: string, netUsd: number): { title: string; body: string }
// "LINK whale net flow +$1.4M last 24h", "3.2x the 7d baseline ($442k)."

export function formatSignalFlip(t: string, from: string, to: string, confidence: number): { … }
// "SOL signal flipped NEUTRAL → BUY at confidence 64.", "(Sonar's composite signal is informational, not advice.)"

export function formatNewsImpact(t: string, headline: string, sentiment: number, url: string): { … }
// "ETH headline: <title>", "Sentiment +0.72; opens article in Sonar."
```

Each generator returns `{ title, body, payload }`. `payload` carries the raw numbers + a re-ask hint so clicking a notification can deep-link to ORCA with a pre-seeded prompt (see §5.3).

### 3.4 Telemetry

Insert one row into `orca_traces` per cron run with `stage='alerts'` and `payload={ checked, fired, dedup, errors, ms }`. Never throw.

---

## 4. Cron 2 — `/api/cron/send-email-digests` (every 1 hour)

File: `app/api/cron/send-email-digests/route.ts`. Mirror `app/api/cron/weekly-top-wallets/route.ts` for Brevo.

Add to `vercel.json` crons: `{ "path": "/api/cron/send-email-digests", "schedule": "0 * * * *" }`.

### 4.1 Eligibility query

```sql
SELECT   p.user_id, p.notifications_last_email_at, u.email
FROM     public.user_profile p
JOIN     auth.users u ON u.id = p.user_id
WHERE    p.notifications_email = true
  AND    (p.notifications_last_email_at IS NULL
          OR p.notifications_last_email_at < now() - interval '60 minutes')
  AND    EXISTS (
    SELECT 1 FROM public.user_notifications n
    WHERE  n.user_id = p.user_id
      AND  n.emailed_at IS NULL
      AND  n.created_at > coalesce(p.notifications_last_email_at, now() - interval '24 hours')
  );
```

### 4.2 Quiet hours

Skip a user if `now() UTC` falls inside `notifications_quiet_hours_utc`. Queue, don't drop — the next hour's run picks them up.

### 4.3 Send + mark

For each eligible user:
1. Load up to 8 unsent notifications (oldest first).
2. Render the Brevo HTML using the template `brevo/brevo-orca-alerts-digest.yaml` (new — see §4.4).
3. Send via the existing `sendBrevoCampaign(brevoKey, subject, htmlBody, ‹label›)` pattern. Per-day cap: count emails sent in last 24h via `notifications_last_email_at` deltas; abort if ≥ 3.
4. On 2xx: `UPDATE user_notifications SET emailed_at = now()` for those IDs; `UPDATE user_profile SET notifications_last_email_at = now()` for the user.
5. On non-2xx: log to `orca_traces`, leave rows un-emailed; the next hour retries.

### 4.4 Template `brevo/brevo-orca-alerts-digest.yaml`

Sibling of the existing five Brevo YAMLs. Same shape. Mandatory footer block per `brevo/COMPLIANCE_CHECKLIST.md`:
- Sender identity line.
- One-click unsubscribe to `/api/notifications/unsubscribe?token=…` (token = signed JWT, exp 30 days, payload `{ user_id }`).
- `List-Unsubscribe: <https://www.sonartracker.io/api/notifications/unsubscribe?token=...>, <mailto:unsubscribe@sonartracker.io>` header.
- Past-performance disclaimer + "You're receiving this because you opted in on Sonar's Personal dashboard."

Subject: `Orca pulse — {N} updates on your watchlist`. Pre-header: `Top {ticker} ({delta}), {N-1} others.`.

### 4.5 Unsubscribe endpoint

`app/api/notifications/unsubscribe/route.ts`:
- GET, no auth other than the signed token.
- Verifies the JWT (HS256 with `NOTIFICATIONS_UNSUBSCRIBE_SECRET` — add to env list).
- `UPDATE user_profile SET notifications_email = false WHERE user_id = $1`.
- Returns a simple HTML confirmation page (server-rendered, no client JS needed).

---

## 5. In-app UI

### 5.1 `OrcaBell` — global nav widget

File: `components/orca/notifications/OrcaBell.jsx`. Mount in `src/components/AppShell.jsx` next to the existing nav links (top-right, between search and user menu).

- Cyan bell SVG, ~18px. Unread dot (4px cyan) absolutely positioned top-right of the icon when unread > 0.
- Polls `/api/notifications/inbox?unread_only=true&limit=1` every 60s; also listens to `window` event `'orca:notifications-changed'` so other parts of the app can force a refresh.
- Click opens `OrcaInbox` drawer (slides from right, same panel pattern as `OrcaDrawer.jsx`).
- Reuses `tileTokens.js` for colours.

### 5.2 `OrcaInbox` — slide-in drawer

File: `components/orca/notifications/OrcaInbox.jsx`.

- Header: "ORCA pulse" + a "Mark all read" ghost button.
- Body: vertical list of `NotificationCard` items, newest first, paginated 25 at a time.
- Empty state: terminal-style ascii box with one mono line: `> no signal yet — your watchlist is being watched.`.
- Each card:
  - Left cyan stripe (4px) matches `kind`: price (cyan), whale (cyan-green), signal (cyan-amber), news (cyan-purple).
  - Title (mono, 13px, white).
  - Body (sans, 12px, grey).
  - Footer row: timestamp (relative, "12m ago") + two buttons:
    - `Open in ORCA →` — fires `window.dispatchEvent('orca:reask', { intent, prompt })` (the same custom event the news tiles already dispatch). Closes the inbox.
    - `Dismiss` — `PATCH /api/notifications/{id}` with `{ read: true }`. Optimistic UI.
- On scroll near bottom: fetch next page.
- Drawer width: 380px desktop, full-width mobile.

### 5.3 Click-to-reask payloads

`payload.reask` on each notification is one of:
- `{ intent: 'overview', prompt: 'what is happening with SOL right now' }` (for price/whale/signal kinds)
- `{ intent: 'article_explain', prompt: 'explain this headline: …', url }` (for news)

The existing inline-tiles prompt already wired `orca:reask` for `NewsCard` — alerts use the same dispatcher.

### 5.4 `/dashboard/personal` Alerts tab

Add `Alerts` as a fourth tab in `app/dashboard/personal/PersonalDashboardClient.jsx` (next to Watchlist | Wallets | Signals).

File: `components/personal/AlertsTab.jsx`. Three sections:

1. **Active rules table** — one row per `user_alerts` record, columns: Ticker | Kind | Threshold | Enabled (toggle) | trash icon.
2. **Add a rule** — small form: ticker autocomplete (reuses watchlist), kind select, threshold input. Submit → POST `/api/personal/alerts`.
3. **Channels** — two checkboxes: "In-app inbox" (bound to `user_profile.notifications_in_app`) and "Email digest" (bound to `notifications_email`); a 2-input "Quiet hours (UTC)" pair that writes `notifications_quiet_hours_utc`.

All copy in the same terminal-vibe styling we shipped for the dashboard.

### 5.5 Settings page touch-up

In `app/personalize/` (or wherever the existing settings live — locate via `grep -r "notification_style"`), add the same Channels section so users can manage prefs without going to Personal. Single source of truth: the four `user_profile` columns from §2.3.

---

## 6. API routes

All under `app/api/` so they share Next.js middleware. Every route that touches user data uses the **anon-verify + admin-execute** pattern from `app/api/personal/watchlist/route.js`.

### 6.1 `POST /api/personal/alerts` — create

Body: `{ ticker, kind, threshold_pct?, threshold_usd? }`. Validates, normalises ticker via the `normaliseTicker` helper already in `lib/personal/watchlist.ts`. Enforces the 50-active-rules cap. Returns the created row.

### 6.2 `GET /api/personal/alerts` — list

Returns the user's rules sorted by `updated_at DESC`. Pagination not needed (cap is 50).

### 6.3 `PATCH /api/personal/alerts/[id]` — toggle / update

Allows `enabled`, `threshold_pct`, `threshold_usd`. Other fields immutable (delete + re-create).

### 6.4 `DELETE /api/personal/alerts/[id]` — remove

Hard delete. RLS allows only own rows.

### 6.5 `GET /api/notifications/inbox`

Query: `unread_only=bool, limit=int (max 50), before=created_at_iso`. Returns rows ordered `created_at DESC`. Includes an `unread_count` field.

### 6.6 `PATCH /api/notifications/[id]`

Body: `{ read: true }` (only allowed value). Sets `read_at = now()`. RLS does the rest.

### 6.7 `POST /api/notifications/mark-all-read`

Single SQL: `UPDATE user_notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`.

### 6.8 `GET /api/notifications/unsubscribe`

See §4.5. The only route that authenticates by signed token, not JWT.

---

## 7. Chat extension — voice-write alerts via fastWrites

Extend `lib/orca/orchestrator/fastWrites.ts` (DO NOT rewrite — additive). The pattern, verbs, and Confirm/Cancel two-trip flow are already proven in Stage B.

### 7.1 New verbs + detection

Add three intents to the detector:

```ts
export type WriteTool =
  | 'addToWatchlist' | 'removeFromWatchlist'
  | 'createAlert' | 'removeAlert' | 'listAlerts'   // NEW
```

Detection rules (regex-led, no LLM):
- **createAlert**: `(alert me|notify me|ping me|warn me|tell me) when?` + ticker + (price/whale/signal/news word) + optional numeric threshold.
  Examples that match: "alert me when SOL drops 5%", "ping me on BTC whale flow over 1M", "tell me when ETH signal flips".
- **removeAlert**: `(remove|delete|cancel|stop|untrack)` + (alert|notification) + ticker.
- **listAlerts**: `(list|show|what are) my alerts`. No ticker required.

Threshold parsing helper (`lib/orca/alerts/parseThreshold.ts`):
- `5%`, `5 percent`, `5pct` → `{ threshold_pct: 5 }`.
- `$1M`, `1 million`, `1.5m`, `750k` → `{ threshold_usd: …integer… }`.
- Defaults if unspecified: price_move → 5%; whale_flow → $1M; signal_flip → no threshold; news → no threshold.

Every detection returns the standard `{ label, calls }` shape; the existing Confirm/Cancel flow in `app/api/chat/route.ts` handles the rest. **No new SSE branch needed** — the chat route already supports JSON+SSE for fastWrites (Stage B.2).

### 7.2 Server-side execution

Add to `lib/orca/orchestrator/tools/writeTools.ts`:

- `runCreateAlert({ userId, ticker, kind, threshold_pct?, threshold_usd? })` — calls `user_alerts.upsert(…, { onConflict: 'user_id,ticker,kind' })`. Returns `{ ok, data: { id, ticker, kind } }`.
- `runRemoveAlert({ userId, ticker, kind? })` — deletes matching rules; if `kind` omitted, deletes all kinds for that ticker.
- `runListAlerts({ userId })` — returns the user's active rules. Pure read; no Confirm/Cancel needed; ORCA renders them inline.

After a successful create/remove, dispatch `window.dispatchEvent('orca:alerts-changed')` so the AlertsTab in Personal re-fetches.

### 7.3 Render the result

In the chat route's existing fastWrites success path, prefix the response text:
- create: `"Alert set: SOL price move ≥ 5%."`
- remove: `"Removed SOL price-move alert."`
- list: a small markdown table (which the inline-tiles markdown renderer already styles via `OrcaMarkdown`).

---

## 8. Wiring + global mount points

| File | Change |
|---|---|
| `vercel.json` | Add the two cron entries (§3.1, §4). |
| `src/components/AppShell.jsx` | Mount `<OrcaBell />` in the global header. |
| `app/dashboard/personal/PersonalDashboardClient.jsx` | Add `Alerts` tab. |
| `app/api/chat/route.ts` | No changes to the SSE branches — `fastWrites` detection in `lib/orca/orchestrator/fastWrites.ts` handles the new verbs. Confirm-trip executor branches into the new `runCreate/Remove/ListAlerts` based on `tool` value. |
| `lib/orca/memory/personalization.ts` | Append a one-line note to the personalisation block: `"User has {N} active alert rules; do not re-suggest setting alerts unless asked."` — surfaces in context so the writer model doesn't pester. |

---

## 9. Env vars

Add to the deployment env (and the project's `.env.example`):

```
NOTIFICATIONS_UNSUBSCRIBE_SECRET=<32+ char random>
BREVO_ALERTS_FROM_EMAIL=alerts@sonartracker.io
BREVO_ALERTS_FROM_NAME=Sonar Tracker
BREVO_ALERTS_LIST_ID=<numeric Brevo list id for the alerts list>
```

Existing vars already used: `CRON_SECRET`, `BREVO_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## 10. Tests (add these — do not modify the existing 426)

Mirror the Stage E test patterns. All new tests go under `test/`.

### 10.1 Migration tests
`test/migrations/user_alerts_and_notifications.test.ts`:
- creates the three columns + two tables.
- `ON DELETE CASCADE` to `auth.users(id)` on both new tables.
- enables RLS; installs select/insert/update/delete policies pinned to `auth.uid()`.
- `UNIQUE (user_id, ticker, kind)` on `user_alerts`.
- `UNIQUE (user_id, rule_id, dedup_hour)` on `user_notifications`.
- CHECK constraints on `kind`, `threshold_*`, and the `chk_threshold_shape` mutual-exclusion.
- All three composite indexes exist with the right `WHERE` clauses.

### 10.2 Helper unit tests
- `test/alerts/format.test.ts` — every copy generator produces title/body/payload, ZERO directional verbs (assert with a regex that the rendered text contains none of: `buy|sell|target|rally|crash|moon|dump|long|short`).
- `test/alerts/parseThreshold.test.ts` — every shape of percent/USD threshold (positive, negative, decimals, k/m/M/B suffixes, no-match returns null).
- `test/alerts/dedup.test.ts` — given a fixture timestamp, `dedup_hour` floors to the hour correctly across DST/UTC.

### 10.3 Cron eval tests
- `test/cron/check-user-alerts.test.ts` — given a mocked Supabase with one rule per kind, asserts the right notifications are inserted; re-running the same tick inserts nothing (dedup works); a soft cap kicks in at the configured per-user daily limit.
- `test/cron/send-email-digests.test.ts` — eligibility query honours opt-in + quiet hours + per-day cap; on Brevo 2xx, rows are marked emailed.

### 10.4 Route tests
- `test/api/personal-alerts.test.ts` — POST validates input; PATCH only allows `enabled`/`threshold_*`; DELETE is RLS-scoped.
- `test/api/notifications-inbox.test.ts` — GET returns own rows; PATCH and mark-all-read flip `read_at`.
- `test/api/notifications-unsubscribe.test.ts` — invalid token = 400; valid token flips `notifications_email = false`.

### 10.5 FastWrites tests
- `test/orchestrator/fastWrites-alerts.test.ts` — every example phrase from §7.1 detects the correct intent + ticker + threshold; pronoun fallback works ("alert me when **it** drops 5%" resolves via `contextTicker`).

### 10.6 Component tests
- `test/orca/notifications/OrcaBell.test.tsx` — unread > 0 shows the dot; click opens the inbox; listens to `'orca:notifications-changed'`.
- `test/orca/notifications/OrcaInbox.test.tsx` — renders cards; `Mark all read` POSTs; click on a card dispatches `'orca:reask'`.
- `test/personal/AlertsTab.test.tsx` — create + toggle + delete rules; the channels checkboxes write the right `user_profile` cols.

**Existing tests untouched.** Confirm with `npx vitest run` → ≥ 426 + new tests pass.

---

## 11. Accessibility + perf

- Bell is a real `<button>` with `aria-haspopup="dialog"` + `aria-expanded` + `aria-label="Notifications, {N} unread"`.
- Inbox dialog: focus trap on open, Escape closes, focus returns to bell.
- Notification cards: each is a region with a heading; the two action buttons are real buttons.
- Polling interval: 60s default, doubles to 120s when the document is hidden. Stops entirely after 5 min of hidden. Re-syncs on `visibilitychange`.
- Inbox query is indexed (`idx_user_notif_user_unread`). Bell's count-only check uses `head: true`.
- Cron `check-user-alerts` keeps a per-ticker memo for the duration of one run so 1,000 users watching BTC only hit the price/whale tables once.
- No `setInterval` in the cron route itself — Vercel invokes it on the schedule.

---

## 12. Compliance + safety

- **Opt-in email default off.** A new email column defaults to `false`. Existing users have to flip it manually.
- **Unsubscribe is one click**: the signed token is in every email; the endpoint requires no login.
- **No PII in notifications**: titles + bodies contain only ticker, %/USD numbers, and headline text (public). Wallet addresses are abbreviated.
- **Footer block on every email** per `brevo/COMPLIANCE_CHECKLIST.md`.
- **Per-day caps + quiet hours** prevent spam and night-time pings.
- **All alerts pass through the same compliance lens** as ORCA prose: assert no directional verb via the regex test in §10.2.
- **GDPR**: account deletion cascades to alerts + notifications (FK on `auth.users`).

---

## 13. Telemetry (internal)

Every cron run inserts one `orca_traces` row with `stage='alerts'` and a payload like:

```json
{ "tick": "check-user-alerts", "users": 412, "rules_evaluated": 1873, "notifications_inserted": 27, "dedup_collisions": 9, "errors": 0, "ms": 2841 }
```

`/api/notifications/*` routes also log on failure paths with `stage='alerts'`. The existing inline-tiles telemetry stays untouched.

---

## 14. Deliverables (one PR)

```
+ supabase/migrations/20260603_user_alerts_and_notifications.sql
+ app/api/cron/check-user-alerts/route.ts
+ app/api/cron/send-email-digests/route.ts
+ app/api/personal/alerts/route.ts
+ app/api/personal/alerts/[id]/route.ts
+ app/api/notifications/inbox/route.ts
+ app/api/notifications/[id]/route.ts
+ app/api/notifications/mark-all-read/route.ts
+ app/api/notifications/unsubscribe/route.ts
+ lib/orca/alerts/format.ts
+ lib/orca/alerts/parseThreshold.ts
+ lib/orca/alerts/dedup.ts
+ lib/orca/alerts/evaluators.ts        # one fn per kind (price_move/whale_flow/signal_flip/news_high_impact)
+ lib/orca/alerts/types.ts
+ components/orca/notifications/OrcaBell.jsx
+ components/orca/notifications/OrcaInbox.jsx
+ components/orca/notifications/NotificationCard.jsx
+ components/personal/AlertsTab.jsx
+ brevo/brevo-orca-alerts-digest.yaml
+ test/migrations/user_alerts_and_notifications.test.ts
+ test/alerts/format.test.ts
+ test/alerts/parseThreshold.test.ts
+ test/alerts/dedup.test.ts
+ test/cron/check-user-alerts.test.ts
+ test/cron/send-email-digests.test.ts
+ test/api/personal-alerts.test.ts
+ test/api/notifications-inbox.test.ts
+ test/api/notifications-unsubscribe.test.ts
+ test/orchestrator/fastWrites-alerts.test.ts
+ test/orca/notifications/OrcaBell.test.tsx
+ test/orca/notifications/OrcaInbox.test.tsx
+ test/personal/AlertsTab.test.tsx

~ vercel.json                                  # add two cron entries
~ src/components/AppShell.jsx                  # mount <OrcaBell />
~ app/dashboard/personal/PersonalDashboardClient.jsx   # add Alerts tab
~ lib/orca/orchestrator/fastWrites.ts          # add 3 detectors
~ lib/orca/orchestrator/tools/writeTools.ts    # add 3 runners
~ lib/orca/memory/personalization.ts           # add 1 line about active rules
```

**Zero new npm dependencies.** Brevo, Supabase, `react`, `styled-components`, Vercel crons — all already installed.

---

## 15. Verification checklist (run before push)

```
[ ] supabase db diff main → only the new migration file appears
[ ] npx vitest run                  → ≥ 426 + new tests pass, 0 failed
[ ] npx tsc --noEmit                → 0 errors
[ ] npm run build                   → success, no new warnings
[ ] Deploy preview, then in Vercel:
      • POST /api/cron/check-user-alerts with bearer CRON_SECRET → 200, payload shows fired/dedup counts
      • POST /api/cron/send-email-digests   with bearer CRON_SECRET → 200, no Brevo send for users without opt-in
[ ] Open /dashboard/personal as a test user:
      • Alerts tab appears
      • Create "SOL price move ≥ 5%" → toast or inline confirm
      • Toggle In-app and Email checkboxes → user_profile updates
[ ] In ORCA chat: type "alert me when sol drops 5%" → confirm card → yes
      → row in user_alerts, AlertsTab refreshes via 'orca:alerts-changed'
[ ] Wait for the next cron tick OR run the cron manually; force a triggering condition by
    inserting a synthetic price_snapshot with a -10% change → notification appears in
    OrcaInbox within 60s
[ ] OrcaBell shows the unread dot; clicking opens the drawer; clicking a card dispatches
    'orca:reask' and the ORCA drawer opens with the seeded prompt
[ ] Click "Mark all read" → bell dot disappears, rows have read_at set
[ ] Enable email opt-in; trigger one notification; wait for the hourly digest cron OR
    manually POST it → receive the Brevo email with:
      • mandatory footer block + List-Unsubscribe header
      • working one-click unsubscribe link
[ ] Click the unsubscribe link → confirmation page; user_profile.notifications_email = false
[ ] Per-day caps work: synthesise 25 notifications for one user → only 20 inbox rows after trim
[ ] Quiet hours work: set 0–23 UTC → no email digest fires for that user
[ ] DevTools console clean across all flows
[ ] DELETE a Supabase auth.users row → cascade removes alerts + notifications
[ ] Confirm v1 chat path is unchanged: "what is btc doing today" still renders the long-form
    research note with the inline tiles (Stage 1) — alerts are purely additive
```

---

## 16. Future-proofing notes (informational only)

- The `kind` enum is open-ended. Adding `unusual_volume` later is a one-line ALTER on the CHECK constraint + one new evaluator in `lib/orca/alerts/evaluators.ts`.
- The `payload` JSONB column on `user_notifications` is intentionally generous so the inbox can render rich cards in the future (sparkline thumbnail, mini whale-flow chart) without another migration. Reuse `<Sparkline>` from the inline-tiles stage.
- A future `/api/notifications/sse` long-poll endpoint can replace the 60s polling without changing the component API. Out of scope here.
- If a future stage adds Telegram / Discord delivery, model it as another column on `user_profile` plus a sibling cron (`/api/cron/send-telegram-alerts` already exists at `*/5 * * * *` — reuse that scheduler shape).

---

That's the whole stage. Net-add only. Same hard rules as Stage E and the inline-tiles prompt. Ship as one PR.
