# ORCA — Inline Charts + Clickable Data Tiles Build Prompt

**Audience:** the next coding agent.
**Scope:** add inline interactive data tiles (price chip, sparkline, whale-flow chip, sentiment chip, news card) and an inline price chart inside EVERY ORCA assistant answer, across EVERY surface that renders one. Make it sleek, terminal-themed, zero new tabs, zero new dependencies the repo doesn't already have, and zero visible errors anywhere.
**Out of scope for this prompt:** proactive alerts inbox (that's the next stage), email digests, anything outside ORCA answer rendering.

---

## 0. Hard rules (do not break)

1. **Do not delete any existing surface.** `/ai-advisor`, `ClientOrca.jsx`, `PersonalCopilotPanel`, the personal `CopilotPane`, `AskOrcaClient`, `OrcaDrawer` — all stay. Add to them, don't replace them.
2. **Do not introduce a new chart library.** The repo already has:
   - inline custom SVG `SparkChart` (in `app/ai-advisor/ClientOrca.jsx` ~L1327 and `app/ai/AskOrcaClient.jsx` ~L916)
   - `lightweight-charts` (lazy-loaded inside `components/charts/TradingViewChart.jsx`)
   - TradingView iframe fallback
   Use those. No recharts, no plotly, no D3.
3. **Do not change the v1 `ORCA_SYSTEM_PROMPT` answer format** (`**Data**` / `**News and Market Impact**` / `**Bottom Line**`). You will ADD a single optional micro-directive (see §3) and rely on the *existing* mandatory backtick-around-numbers convention for everything else. Numbers already in backticks are the citation surface — no new prose required from the model.
4. **No new visible errors anywhere.** Every fetch in a tile component is `try/catch` + skeleton + silent-fail-to-static-text. If the chart endpoint 5xxs, the tile degrades to a plain backtick number (its original markdown). Never show "failed to load", "undefined", or a red box.
5. **Zero layout shift on hover.** Hover-cards open in a fixed-position popover anchored to the chip; they never push surrounding text.
6. **SSR-safe.** Every new client component starts with `'use client'`. No `window`/`document` reads outside `useEffect`.
7. **Tests stay green.** `npx vitest run` must finish at the same count or higher (currently 426 passed / 6 skipped). Add tests for the new pieces.
8. **No emojis.** House rule §3.5.2.
9. **Service-role Supabase only on server.** Any new endpoint that reads private data verifies the JWT and pins `userId` from it.

---

## 1. The mental model

The model writes a long-form research note that already cites numbers like:

```
Price is ` $76,432 ` (24h ` -1.91% `, 7d ` +3.4% `). Net whale flow last 24h ` +$1.01B `.
Sentiment ` 62 ` (provider LunarCrush), Galaxy Score ` 71 `.
```

Today those backticked spans render as inert `<code>` blocks. We are going to **upgrade the markdown renderer** so that:

| Pattern in the rendered text | Becomes |
|---|---|
| `` `$NUMBER` `` adjacent to a known ticker word (BTC / $BTC / SOL / etc.) earlier in the same paragraph | **PriceChip** — hover shows live sparkline + 24h/7d %, click opens **InlineChart** drawer-within-the-message |
| `` `±$NUMBER` `` inside a sentence containing "whale", "net flow", "accumulation", "distribution" | **WhaleChip** — hover shows 24h whale flow sparkline, click opens whale-activity panel |
| `` `NUMBER` `` (no `$`) adjacent to "sentiment", "Galaxy Score", "Alt Rank", "% bullish" | **SentimentChip** — hover shows 7d sentiment trend |
| Standalone `[Headline text](https://news-url/...)` link inside the **News and Market Impact** section | **NewsCard** — replaces the bare link with a card that shows title + source + sentiment pip + "Explain this →" button that re-asks ORCA with intent=`article_explain` |
| A literal HTML comment `<!-- orca:chart ticker=BTC tf=24h kind=price -->` emitted by a renderer | **InlineChart** — full-width embedded chart panel between paragraphs |

**No new model output format is required for the chips.** They are detected from the text the model already produces. The HTML comment for `InlineChart` is optional and emitted only by `overview.ts`, `personal.ts`, `wallet_lookup.ts` renderers (see §3).

---

## 2. Architecture

### 2.1 New folder: `components/orca/inline/`

Create these files. Every one of them is a small, focused, fully-tested unit.

```
components/orca/inline/
├── OrcaMarkdown.jsx          # the ONE markdown renderer all 4 surfaces import
├── PriceChip.jsx             # `$76,432` → interactive chip
├── WhaleChip.jsx             # `$+1.01B` → interactive chip
├── SentimentChip.jsx         # `62` → interactive chip
├── NewsCard.jsx              # Markdown link inside the news section
├── InlineChart.jsx           # full chart panel (via <!-- orca:chart … --> comment)
├── HoverPopover.jsx          # shared anchored floating panel (no portal library; CSS only)
├── Sparkline.jsx             # tiny inline SVG (port + share from existing SparkChart)
├── useInlineData.js          # SWR-lite hook: cache by (kind, ticker, window) for the session
├── tileTokens.js             # design tokens: cyan, mono font, sizes — see §6
├── parsers/
│   ├── extractTickerContext.js  # walks a paragraph, returns the dominant ticker
│   ├── extractChartDirective.js # parses <!-- orca:chart … --> comments
│   └── classifyCodeSpan.js      # decides if `code` text is price/whale/sentiment/none
└── __tests__/                 # see §7
```

### 2.2 `OrcaMarkdown.jsx` is the integration point

This component is a thin wrapper around `<ReactMarkdown remarkPlugins={[remarkGfm]}>` with a fully-defined `components={}` map. Every existing call site becomes a one-line swap.

```jsx
// Before (4 places)
<ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>

// After (4 places)
<OrcaMarkdown>{m.content}</OrcaMarkdown>
```

The `components` map overrides:

- `code` → `classifyCodeSpan(text, paragraphContext) ⇒ <PriceChip>|<WhaleChip>|<SentimentChip>|<code>`
- `a` → if `parent === news section` then `<NewsCard>`, else default `<a>`
- `p` → captures the paragraph's text into a React context (`InlineDataCtx`) so `code` children can ask "what ticker does this paragraph mention?"; renders `<p>` as normal
- `h2` / `h3` → keep existing styling (the cyan uppercase header we already shipped in `PersonalCopilotPanel`)
- HTML comments → handled by a tiny remark plugin (`remark-orca-directives`, ~30 lines) that turns `<!-- orca:chart … -->` into a custom AST node `<InlineChart>`

Detection contract: `classifyCodeSpan` runs on every `<code>` and is pure. Inputs: code text, the paragraph string, the section header context. Output: one of `{ kind: 'price' | 'whale' | 'sentiment' | 'none', ticker?: string, value?: number, unit?: '$' | '%' | null }`. Unit-tested in §7.

### 2.3 No new backend endpoints

Everything the tiles need is already in the repo (subagent confirmed):

| Tile | Endpoint | Cache TTL |
|---|---|---|
| PriceChip sparkline | `/api/coingecko/market-chart?vs_currency=usd&days=7&symbol=BTC` | 60 s in `useInlineData` |
| InlineChart candle | `/api/coingecko/ohlc?symbol=BTC&days=7` | 60 s |
| WhaleChip sparkline | `/api/whales/timeseries?ticker=BTC&window=24h` | 60 s |
| SentimentChip trend | `/api/token/social-timeseries?ticker=BTC&days=7` | 5 min |
| NewsCard sentiment pip | already in markdown (the model puts the sentiment score next to the link) — no fetch needed |

**Caching:** `useInlineData(key, fetcher)` is a 30-line custom hook. Cache lives in a module-scoped `Map` keyed by `kind:ticker:window`. Two tiles for the same `(BTC, 24h, price)` issue one network call. Cache survives within the session (no localStorage). If the user reloads, cache is empty.

### 2.4 Stream behaviour

For surfaces that use SSE (AskOrcaClient, OrcaDrawer, ClientOrca), the tiles **must work mid-stream**. As partial markdown arrives, `OrcaMarkdown` already re-renders — the chips light up as soon as their backtick is in the DOM, then the hover-fetch fires on first hover. Do not pre-fetch anything during streaming — that creates a thundering herd if the model writes 30 backticked numbers.

For `PersonalCopilotPanel` (currently JSON-only), nothing changes in the transport: the panel already swallows the SSE frames into a single final reply. The chips still light up on render.

---

## 3. Renderer prompt directives (one tiny, optional addition)

In `lib/orca/renderers/overview.ts`, `personal.ts`, and `wallet_lookup.ts`, append the following **after** the existing RESPONSE FORMAT block. Do NOT touch `data_query.ts`, `explainer.ts`, `signal_explain.ts`, `article_explain.ts`, `compliance_decline.ts`, `followup.ts` — they should keep their short form.

```
## OPTIONAL INLINE CHART DIRECTIVE

When (and ONLY when) the user is asking about a specific ticker AND the **Data** section
includes price action, you MAY emit ONE HTML comment immediately AFTER the **Data**
section, before **News and Market Impact**, in this exact shape:

  <!-- orca:chart ticker=BTC tf=7d kind=price -->

Rules:
  - Exactly one chart per answer. Never two.
  - `tf` must be one of: 24h | 7d | 30d.
  - `kind` must be one of: price | whale | sentiment.
  - Pick the kind that the **Data** section emphasised most.
  - If the question is NOT about a specific ticker (e.g. "what is DeFi?"), DO NOT emit
    the comment.
  - The comment is invisible in plain markdown viewers but the Sonar UI renders it
    as an embedded interactive chart. Never describe the chart in prose ("see chart
    below" etc.) — the placement is self-explanatory.
```

Keep the rest of the prompt untouched. This addition is a hard ≤180 chars in the model's instruction surface, so it costs almost nothing in tokens or latency.

Add three unit tests under `test/orchestrator/renderers.inline.test.ts`:
- `overview.ts` output includes the directive block.
- `data_query.ts` does NOT include the directive block.
- `extractChartDirective` correctly parses a well-formed comment and ignores malformed ones.

---

## 4. Per-surface integration (four call sites, four 1-line edits)

For each, replace the existing `<ReactMarkdown remarkPlugins={[remarkGfm]}>` with `<OrcaMarkdown>` and remove the now-redundant `remarkPlugins` import in that file (`OrcaMarkdown` owns it).

| Surface | File | Approx line | Notes |
|---|---|---|---|
| Personal dashboard panel | `components/orca/PersonalCopilotPanel.jsx` | ~382 | Keep the existing terminal-themed `Bubble` CSS — `OrcaMarkdown` returns inline content, the styling is the parent's job. |
| Stage C `/ai` page | `app/ai/AskOrcaClient.jsx` | ~846 | Keep the existing `TokenDataCard` below the markdown — it serves a different purpose (full-row KPI grid). The inline chips complement it. |
| Stage D drawer | `components/orca/OrcaDrawer.jsx` | (inherits AskOrcaClient) | Nothing to do here; the swap in AskOrcaClient propagates. |
| Legacy v1 long-form pane | `app/ai-advisor/ClientOrca.jsx` | ~1215 | Delete the now-duplicate inline `SparkChart` definition (lines ~1327–1422) and `import { Sparkline } from '@/components/orca/inline/Sparkline'` instead — same SVG, single source of truth. |

`tmp/old-orca.jsx` is dead code; leave it untouched.

---

## 5. The five tile components — exact behaviour

### 5.1 `<PriceChip ticker="BTC" value={76432} unit="$" raw="$76,432" />`

**Resting state (in-flow, inline-block):**
- Background: `rgba(0,229,255,0.10)`; border: `1px solid rgba(0,229,255,0.25)`; radius `3px`; padding `1px 6px`.
- Font: mono (`'JetBrains Mono', ui-monospace, …`), 12 px, weight 600, color `#6ee7ff`.
- Cursor `pointer`; on focus, 2 px cyan outline.
- Text: the original `raw` string (`$76,432`) — never reformat.
- A 6 px caret-down glyph (CSS `::after`, no glyph font) on the right edge at 60 % opacity.

**Hover / focus / tap:**
- After 150 ms hover delay, render `<HoverPopover anchor={chipRef}>` with:
  - Ticker symbol + 24h price change (color-coded: green/red/grey, mono).
  - 7 d `<Sparkline data={data} />` (140 × 36 px).
  - Two text rows: `24h vol ` / `mcap ` (mono, in backtick chips).
  - Footer: button `Open chart →` which triggers an `<InlineChart>` insertion in-place beneath the paragraph (see §5.5).
- Popover positions itself relative to viewport; flips above the chip if there isn't 200 px below; max-width 280 px.

**Loading state:** popover shows skeleton lines (no spinner). Hover-fetch uses `useInlineData('price:BTC:7d', …)`.

**Failure state:** popover shows "Live data unavailable." in muted grey, single line, no error icon. The chip itself remains clickable and never breaks the inline flow.

### 5.2 `<WhaleChip ticker="BTC" value={+1.01e9} unit="$" raw="+$1.01B" />`

Identical anatomy to PriceChip, but:
- The chip's left-edge dot is green/red depending on sign (`Pip` reused from `components/personal/PulseStrip.jsx`).
- Hover popover shows 24h whale net-flow sparkline + buy/sell tx counts + "Open whale feed →" button that emits a `window.dispatchEvent('orca:open-whale-panel', { ticker })` (the existing whale drawer listens for this; if no listener, the click is a no-op rather than a route change).

### 5.3 `<SentimentChip ticker="BTC" value={62} unit={null} raw="62" />`

- Color-coded background: <40 red-tinted, 40–60 grey, >60 green-tinted (subtle, 8 % alpha).
- Hover popover: 7 d sentiment line, `Galaxy Score`, `Alt Rank`, `% bullish`. All from `/api/token/social-timeseries`.

### 5.4 `<NewsCard href="…" title="…" sentiment={0.4} source="theblock.co">`

Drop-in replacement for an `<a>` inside the **News and Market Impact** section.
- Renders as a card: cyan left stripe, source domain in mono uppercase, headline in regular weight, sentiment pip on the right.
- Bottom row: two ghost buttons: `Open ↗` (real link, `target="_blank" rel="noopener noreferrer"`) and `Explain →`.
- `Explain →` fires `window.dispatchEvent('orca:reask', { intent: 'article_explain', url, headline })`. Each surface's chat component listens for this event and seeds the next user message accordingly. If the event has no listener (e.g. on `/ai-advisor` and the legacy v1 client doesn't subscribe yet), the click degrades to opening the URL.

### 5.5 `<InlineChart ticker="BTC" tf="7d" kind="price" />`

**Placement:** the remark plugin turns the `<!-- orca:chart … -->` comment into this node, rendered between paragraphs as a full-width block (max-width = answer column width).

**Content:**
- Header row: ticker + kind + timeframe segmented control (`24h | 7d | 30d`) — switching the timeframe re-fetches without unmounting the chart.
- Chart body: 320 px tall, lazy-imports `lightweight-charts` exactly like `TradingViewChart.jsx` does today. Reuse that import pattern.
- Footer: one row of stats (last price, change %, volume) in mono.
- The chart MUST NOT autoplay an animation that re-runs on every re-render. Mount the chart once, update its `setData` on tf change.
- If `lightweight-charts` fails to load (network), fall back to a 600 × 200 inline `<Sparkline>` with the same data. Never show an error block.

**Also accessible from PriceChip's "Open chart →" button** — that button calls a callback `onOpenChart(ticker, tf, kind)` passed down via context; the answer renderer mounts the InlineChart in a `<details open>` directly under the paragraph that owns the chip. Once opened, the same chart stays open for the rest of the session.

---

## 6. Design tokens (`tileTokens.js`)

Single source of truth so every tile matches the terminal vibe we shipped in §057b94e.

```js
export const TILE = {
  mono: "'JetBrains Mono','Fira Code','SFMono-Regular',ui-monospace,Menlo,Consolas,monospace",
  cyan: '#00e5ff',
  cyanSoft: 'rgba(0,229,255,0.10)',
  cyanBorder: 'rgba(0,229,255,0.25)',
  cyanText: '#6ee7ff',
  green: '#4ade80',
  red: '#ff7a7a',
  grey: '#8896a6',
  bgPanel: 'linear-gradient(180deg, rgba(13,20,33,0.92) 0%, rgba(8,14,24,0.92) 100%)',
  radiusChip: '3px',
  radiusPanel: '6px',
  shadowPanel: '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,229,255,0.18)',
  hoverDelayMs: 150,
}
```

Every chip + popover imports this. No inline magic strings.

---

## 7. Tests (add these, don't modify the 426 existing)

Under `test/orca/inline/`:

```
classifyCodeSpan.test.ts       # 12 cases: price w/ ticker, price w/o ticker, whale, sentiment, none, false-positives
extractTickerContext.test.ts   # 6 cases: ticker as $BTC, as BTC, in parent sentence vs prior sentence
extractChartDirective.test.ts  # 5 cases: well-formed comment, missing tf, unknown kind, two comments → take first
useInlineData.test.ts          # 4 cases: cache hit, cache miss, in-flight dedupe, failure surfaces null
PriceChip.test.tsx             # render text, click opens popover, ArrowDown opens popover, Escape closes, no console errors
WhaleChip.test.tsx             # same shape, plus pip color matches sign
SentimentChip.test.tsx         # same shape, plus background colour matches bucket
NewsCard.test.tsx              # rendering + "Explain →" dispatches event + "Open ↗" opens new tab
InlineChart.test.tsx           # mounts container, timeframe switch re-fetches once, fallback to Sparkline on import failure
OrcaMarkdown.test.tsx          # end-to-end: feed a sample assistant reply, assert it produces N PriceChips, 1 InlineChart, 0 raw <code>
```

Under `test/orchestrator/renderers.inline.test.ts`:
- `overview.ts` system prompt contains the directive block.
- `data_query.ts` system prompt does NOT contain the directive block.

**Existing tests to verify still green** (read-only run, no edits):
- `test/personal/PersonalCopilotPanel.test.tsx` — the panel still renders `m.content`; the swap to `<OrcaMarkdown>` shouldn't change DOM testids.
- `test/orca/contextFromPath.test.ts`, `test/orca/suggestedChips.test.ts` — untouched.
- All `test/orchestrator/*` — untouched (we only ADD a string to three system prompts; assertion is "contains existing format", which still holds).

Run: `npx vitest run` must finish ≥ 426 passed.

---

## 8. Accessibility + keyboard

- Every chip is a real `<button>` (not a `<span>`). It has `aria-haspopup="dialog"`, `aria-expanded` toggled on open.
- Popover has `role="dialog"`, an `aria-label` ("BTC price details"), and traps focus while open.
- `Escape` closes the popover and returns focus to the chip.
- `Tab` from the chip moves to the next interactive element in the answer, not into the (closed) popover.
- The hover-delay (150 ms) is bypassed for keyboard focus — focus opens immediately.
- Respect `prefers-reduced-motion`: chip transitions, popover fade-in, and sparkline draw animation become instant.

---

## 9. Performance budget

- First chip render: <2 ms (no fetch).
- Popover open → first paint of skeleton: <16 ms.
- Sparkline mount (with cached data): <8 ms.
- `InlineChart` lazy import: same pattern as `TradingViewChart` (≈80 ms one-time on first chart, then cached for the session).
- Memoise `classifyCodeSpan` per-paragraph in `OrcaMarkdown`'s `p` override — running it 30 times per long answer should still be <1 ms total.
- Module-scoped `Map` cache: cap at 200 entries; LRU evict on overflow.
- No `setInterval` anywhere — popovers fetch on open, not on a timer.

---

## 10. Telemetry (internal, never user-visible)

In `lib/orca/telemetry/inlineTiles.ts` (new), add a tiny logger:

```ts
export function logTileEvent(event: 'chip_render' | 'chip_open' | 'chart_open' | 'news_explain' | 'chart_fallback', meta: Record<string, any>) {
  if (process.env.NODE_ENV !== 'production') return
  try {
    void fetch('/api/orca/telemetry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event, meta, t: Date.now() }) })
  } catch { /* ignore */ }
}
```

Create the endpoint `app/api/orca/telemetry/route.ts` that:
- Accepts auth-optional POST.
- Inserts a row into the existing `orca_traces` table with `stage='inline_tile'` and `payload=` the event body.
- Never returns more than `{ ok: true }`.
- Hard-fails silently to 204 on any error (do not leak DB errors).
- Hard rate limit per IP: 60/min via the existing rate-limit helper.

The `chip_open` / `chart_open` events let you measure adoption without surfacing anything to the user.

---

## 11. Compliance / safety

- Tiles must NOT introduce any directional verb. They show data, not advice. The hover popover never reads "buy", "sell", "target", "rally", or "crash" — only neutral nouns ("price", "volume", "flow", "score").
- News tiles use the existing sentiment scores untouched — no re-classification.
- The "Explain →" handler on `NewsCard` triggers `intent='article_explain'`, which already goes through `applyGuardrails()`. Nothing new to add server-side.
- No tile reads user PII. Personalisation continues to live only in the model context block.

---

## 12. Deliverables (one PR)

```
+ components/orca/inline/OrcaMarkdown.jsx
+ components/orca/inline/PriceChip.jsx
+ components/orca/inline/WhaleChip.jsx
+ components/orca/inline/SentimentChip.jsx
+ components/orca/inline/NewsCard.jsx
+ components/orca/inline/InlineChart.jsx
+ components/orca/inline/HoverPopover.jsx
+ components/orca/inline/Sparkline.jsx
+ components/orca/inline/useInlineData.js
+ components/orca/inline/tileTokens.js
+ components/orca/inline/parsers/extractTickerContext.js
+ components/orca/inline/parsers/extractChartDirective.js
+ components/orca/inline/parsers/classifyCodeSpan.js
+ components/orca/inline/remark-orca-directives.js
+ lib/orca/telemetry/inlineTiles.ts
+ app/api/orca/telemetry/route.ts
+ test/orca/inline/  (11 files per §7)
+ test/orchestrator/renderers.inline.test.ts

~ components/orca/PersonalCopilotPanel.jsx   (one-line swap)
~ app/ai/AskOrcaClient.jsx                   (one-line swap)
~ app/ai-advisor/ClientOrca.jsx              (one-line swap + remove duplicate SparkChart)
~ lib/orca/renderers/overview.ts             (append directive block)
~ lib/orca/renderers/personal.ts             (append directive block)
~ lib/orca/renderers/wallet_lookup.ts        (append directive block)
```

No dependency changes in `package.json`. (We are reusing `react-markdown`, `remark-gfm`, `lightweight-charts`, all already installed.)

---

## 13. Verification checklist (run before push)

```
[ ] npx vitest run                    → ≥ 426 passed, 0 failed
[ ] npx tsc --noEmit                  → 0 errors
[ ] npm run build                     → success, no new warnings
[ ] open /ai-advisor, ask "what is btc doing today"
      → see PriceChips on every backticked $-number
      → hover one → sparkline + 24h % appears within 200 ms
      → click "Open chart →" → InlineChart slides under the paragraph
      → news section: each link is a NewsCard, "Explain →" reasks correctly
[ ] open /dashboard/personal, ask "what is sol doing"
      → same tiles render inside the personal copilot bubble
      → no layout shift, no console errors
[ ] open /token/btc → click "Ask ORCA" pill → drawer opens
      → tiles present in drawer, hover works inside the drawer overlay
[ ] open DevTools console → assert 0 warnings/errors during a full answer render
[ ] open Network tab on a re-asked question with cached data
      → no duplicate /api/coingecko or /api/whales calls within 60 s
[ ] focus a chip with Tab → press Enter → popover opens, focus inside
      → press Escape → popover closes, focus returns to chip
[ ] toggle prefers-reduced-motion → all animations become instant
[ ] confirm <!-- orca:chart … --> is HIDDEN in markdown output (no raw "orca:chart" text leaks)
[ ] confirm a v1 answer with NO ticker (e.g. "what is DeFi?") renders 0 chips, 0 charts, 0 errors
```

---

## 14. Out-of-scope reminders (for clarity)

- No new persistent storage. Telemetry goes into the existing `orca_traces` table.
- No watchlist mutations from tiles. (Watchlist writes already happen via `fastWrites`; tiles are read-only.)
- No new chat intents. The model keeps producing the same long-form note; we just transform the *rendering*.
- No login-gating. Tiles work in every state the chat already works in. If unauth, the chat is gated; tiles never render alone.
- No analytics SDK. Telemetry is one POST to an internal route.

---

## 15. After this lands

The next stage (proactive alerts inbox + email opt-in) builds on top of this without conflict. The tile design tokens (`tileTokens.js`) and the in-app inbox will share the same cyan/mono visual language, so the eventual notification cards inherit the look for free.
