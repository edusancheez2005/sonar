# Dashboard V2 — Enhancement Prompt

> **Context:** Sonar Tracker is a crypto whale intelligence platform (Next.js / React / Supabase / styled-components). The dashboard is the primary page for paid users and now partially open to free users. It needs to become the **one-stop trading intelligence hub** that traders actually keep open all day — like a Bloomberg terminal for crypto whales.

---

## WHAT EXISTS TODAY

### Current Dashboard Sections
1. **Command Bar** — sticky top bar with logo, live dot, total TXN count, volume, buys/sells, username, upgrade button
2. **KPI Strip** — 4 cells: Buy/Sell ratio, unique whales, 24h whale volume, total transactions
3. **Free User Conversion Banner** — "X whale transactions today. Upgrade..."
4. **My Watchlist** — user's saved tokens with live prices + 24h change
5. **Net Inflows / Net Outflows** — top 10 tokens with horizontal bars showing net USD flow
6. **Buy/Sell Pressure** (premium) — top 10 tokens by buy % and sell % with bars
7. **Most Traded Tokens** (partially free) — table: rank, token, trades, volume, buy/sell ratio, flow bar
8. **Top Whales** (premium) — table: rank, address, 7d net flow, buy/sell ratio, top tokens, last active
9. **Whale Alerts Card** (premium) — last 20 alerts classified as accumulation/distribution
10. **Social Pulse** — scrollable social posts feed + AI topic summaries

### Available API Data (already built, not all surfaced on dashboard)
- `/api/dashboard/summary` — returns: recent txs, topBuys/topSells, blockchainVolume, marketSentiment, riskMetrics, marketMomentum, whaleActivity, timeSeries (24h hourly), tokenLeaders, tokenInflows/Outflows, overall stats, topHighValueTxs, tokenTradeCounts
- `/api/signals` — per-token signals (BUY/SELL/HOLD) with confidence, score, 4-tier breakdown, traps, history (15min intervals for 24h)
- `/api/whale-alerts` — large transfers with exchange classification (accumulation vs distribution)
- `/api/whale-index` — 24h whale index: total txs, volume, top tokens, bullish/bearish/neutral counts
- `/api/social/feed` — influencer posts with sentiment + interactions
- `/api/sentiment/vote` — community bullish/bearish/neutral voting per token
- `/api/trades` — full whale transaction history, filterable
- `/api/whales/top-7day`, `/api/whales/leaderboard`, `/api/whales/patterns`
- `/api/news` (via EnhancedNews component) — aggregated crypto news with sentiment scoring
- `/api/coingecko/...` — market data, prices, token metadata

### Available Chart Components
- `LineChart.tsx` — generic line chart (Chart.js)
- `CandlestickChart.tsx` — OHLC candlestick
- Chart.js is registered with: CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend
- `framer-motion` for animations

### Design System
- Dark theme: `#0a0e17` background, cyan `#00e5ff` accent, green `#00e676`, red `#ff1744`, amber `#ffab00`
- Monospace font: JetBrains Mono for data, Inter for UI text
- Glass panel cards with backdrop blur
- Terminal-inspired aesthetic ("> SECTION_NAME" prompts with green arrows)
- Subtle CRT scanline overlay on background

---

## WHAT TO BUILD — DASHBOARD V2

### Goal
Transform the dashboard from a "data display" into an **actionable trading intelligence center**. Every section should answer one trader question: **"What should I pay attention to RIGHT NOW?"**

---

### 1. LIVE WHALE FEED (Real-Time Ticker)
**Trader question:** "What are whales doing right now?"

- Horizontal scrolling ticker at very top (below command bar, above KPI strip)
- Shows the last 5-10 whale transactions in real-time, auto-updating every 15 seconds
- Format: `🟢 BUY ETH $4.2M · whale_0x3f...a7 · 2m ago` or `🔴 SELL BTC $8.1M · Binance Cold Wallet · just now`
- Color-coded: green for buys, red for sells, amber for transfers
- Clicking a transaction opens the token page or whale profile
- Uses existing `/api/dashboard/summary` → `recent` array (already has 10 latest txs)
- **Free users see this** — it's the hook that makes them stay

### 2. MARKET PULSE CHART (24H Whale Volume Over Time)
**Trader question:** "Is whale activity increasing or decreasing?"

- Line/area chart showing hourly whale volume over last 24 hours
- Dual Y-axis: volume bars (left) + transaction count line (right)
- Data already exists: `timeSeries { labels[], volume[], count[] }` from summary API
- Overlay markers for significant events (any single tx > $10M)
- Color gradient fill: green when volume trending up, red when trending down
- Place it right after the KPI strip — it's the first visual context for the market
- **Free users see this** — visual hook

### 3. AI SIGNAL CARDS (Top Movers Right Now)
**Trader question:** "Which tokens have the strongest signals?"

- Grid of 3-4 cards showing tokens with strongest buy/sell signals right now
- Each card: token icon + name, signal (STRONG BUY / BUY / HOLD / SELL / STRONG SELL), confidence %, mini sparkline of signal strength over last 6h, current price + 24h change
- Fetch from `/api/signals` (latest per token, top 4 by absolute score)
- A "View All Signals" link goes to a dedicated signals page or expand view
- Color border: green gradient for buys, red for sells
- **Premium only** — this is high-value actionable alpha

### 4. BREAKING NEWS SIDEBAR / PANEL
**Trader question:** "Did anything happen I should know about?"

- Panel showing 5-8 most recent high-impact news articles
- Each item: headline, source, time ago, sentiment badge (BULLISH / BEARISH / NEUTRAL)
- Sorted by recency but weighted by impact (high-sentiment scores first)
- "Breaking" tag on articles < 1 hour old
- Source: new API endpoint `/api/news/latest?limit=8` or reuse existing news data
- Click-through to full article or `/news` page
- **Free users see top 3** — premium sees all 8

### 5. WHALE HEAT MAP (Which Tokens Are Whales Moving Into?)
**Trader question:** "Where is smart money flowing?"

- Tree map / heat map visualization of token flows
- Size = volume, Color = net flow direction (green = net inflow, red = net outflow)
- Data: `tokenLeaders` from summary API (already has netUsd, volume, txCount per token)
- Interactive: hover shows details, click goes to token page
- Alternate view: bubble chart where X = buy/sell ratio, Y = volume, size = unique whales
- **Free users see this** — visual and impressive, drives shareability

### 6. SMART MONEY CONSENSUS
**Trader question:** "Are whales overall bullish or bearish right now?"

- Large gauge / sentiment meter showing the overall market
- Data already exists: `marketSentiment { ratio, trend }` and `overall { buyCount, sellCount, buyVolume, sellVolume }`
- Visual: semi-circular gauge from "EXTREME FEAR" to "EXTREME GREED" based on buy/sell ratio
- Below the gauge: 3 quick stats — whale buy volume vs sell volume, momentum change (%), high-value tx count
- `riskMetrics` and `marketMomentum` data from summary API feed into this
- **Free users see this** — it's the "Crypto Fear & Greed Index" but based on actual whale data

### 7. TOP HIGH-VALUE TRANSACTIONS (Trophy Trades)
**Trader question:** "What were the biggest plays today?"

- Table or card list of the 5-10 largest whale transactions in last 24h
- Data already exists: `topHighValueTxs` from summary API
- Each row: time, token, side (BUY/SELL), USD value, chain, whale entity name (if famous), whale score
- Highlight famous whales with a badge/icon
- Sort by USD value descending
- **Free users see top 3** — premium sees all + whale identity

### 8. BLOCKCHAIN DISTRIBUTION (Where Are Whales Active?)
**Trader question:** "Which chains are seeing whale action?"

- Doughnut chart or horizontal stacked bar showing volume by blockchain
- Data already exists: `blockchainData { labels[], data[] }` from summary API
- Interactive: hover for exact numbers
- Below chart: quick stat cards per chain (Ethereum, Bitcoin, Solana, etc.)
- **Free users see this**

### 9. POSITION BUILDER / TRADE IDEAS PANEL (Premium Only)
**Trader question:** "How do I actually USE this data in my trades?"

- Panel that synthesizes all dashboard data into 2-3 actionable trade ideas
- Format: "🟢 ETH — Strong accumulation by 12 unique whales ($47M net inflow). Signal: BUY (82% confidence). Consider entries on dips to $X."
- Powered by existing signal engine data + whale flow data + news sentiment
- Could call an API endpoint that uses OpenAI/Claude to generate the synthesis
- Each idea has: token, direction, confidence, key data points, suggested action
- "Ask ORCA about this" button that opens the AI advisor pre-filled with context
- **Premium only** — this is the killer feature that justifies $7.99/mo

### 10. ALERT CONFIGURATION WIDGET
**Trader question:** "How do I get notified when whales move?"

- Small widget/panel for setting up quick alerts
- "Alert me when whales buy/sell [TOKEN] over $[AMOUNT]"
- Quick presets: "Alert on any tx > $5M", "Alert on BTC whale buys", "Alert on ETH sells > $1M"
- Ties into existing `/api/whale-alerts` system
- Shows count of currently active alerts
- **Premium only** — drives subscription retention

---

## LAYOUT RECOMMENDATION

```
┌─────────────────────────────────────────────────────────────────────────┐
│ COMMAND BAR (sticky)                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ ◉ LIVE WHALE FEED — scrolling ticker                                    │
├────────────────────────────────────────────┬────────────────────────────┤
│ KPI STRIP (4 cells)                        │ SMART MONEY CONSENSUS      │
│ Buy/Sell · Whales · Volume · Txns          │ Gauge + 3 quick stats      │
├────────────────────────────────────────────┴────────────────────────────┤
│ MARKET PULSE CHART (24H volume + count timeline)                        │
├────────────────────────────────────┬────────────────────────────────────┤
│ WHALE HEAT MAP                     │ BREAKING NEWS (5-8 items)          │
│ Token flow treemap                 │ Headline + sentiment + time ago    │
├────────────────────────────────────┴────────────────────────────────────┤
│ AI SIGNAL CARDS — 4 cards with strongest signals                        │
├────────────────────────────────────────────────────────────────────────-┤
│ [MY WATCHLIST — if has items]                                            │
├────────────────────────────────┬────────────────────────────────────────┤
│ NET INFLOWS (existing)         │ NET OUTFLOWS (existing)                │
├────────────────────────────────┴────────────────────────────────────────┤
│ TOP HIGH-VALUE TRANSACTIONS — trophy trades (largest plays today)        │
├────────────────────────────────┬────────────────────────────────────────┤
│ BUY PRESSURE (existing)        │ SELL PRESSURE (existing)               │
├────────────────────────────────┴────────────────────────────────────────┤
│ MOST TRADED TOKENS — table (existing, partially free)                   │
├────────────────────────────────────────────────────────────────────────-┤
│ BLOCKCHAIN DISTRIBUTION — doughnut chart                                │
├────────────────────────────────────────────────────────────────────────-┤
│ 🔒 POSITION BUILDER / TRADE IDEAS (premium)                            │
├────────────────────────────────────────────────────────────────────────-┤
│ 🔒 TOP WHALES — table (premium, existing)                              │
├────────────────────────────────────────────────────────────────────────-┤
│ 🔒 WHALE ALERTS (premium, existing)                                    │
├────────────────────────────────────────────────────────────────────────-┤
│ 🔒 ALERT CONFIGURATION WIDGET (premium)                                │
├────────────────────────────────────────────────────────────────────────-┤
│ SOCIAL PULSE (existing, free)                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## IMPLEMENTATION PRIORITY

### Phase A — Quick Wins (use existing API data, no new endpoints)
1. **Live Whale Feed ticker** — uses `recent` from summary API ✅
2. **Market Pulse Chart** — uses `timeSeries` from summary API ✅
3. **Smart Money Consensus gauge** — uses `marketSentiment` + `overall` + `riskMetrics` ✅
4. **Top High-Value Transactions** — uses `topHighValueTxs` from summary API ✅
5. **Blockchain Distribution chart** — uses `blockchainData` from summary API ✅

### Phase B — New API Calls (existing endpoints, new frontend)
6. **AI Signal Cards** — calls `/api/signals` (already built) ✅
7. **Breaking News Panel** — calls existing news endpoints ✅
8. **Whale Heat Map** — uses `tokenLeaders` data, needs treemap chart component

### Phase C — New Features (need new backend + frontend)
9. **Position Builder / Trade Ideas** — needs new API endpoint with AI synthesis
10. **Alert Configuration Widget** — needs new UI, wire to existing alert system

---

## TECHNICAL NOTES

### Data that is already fetched but NOT displayed on the dashboard:
- `marketSentiment` — fetched but unused in render
- `riskMetrics` — fetched but unused in render
- `marketMomentum` — fetched but unused in render
- `topHighValueTxs` — fetched but unused in render
- `blockchainData` — fetched but unused in render
- `whaleActivity` — fetched but unused in render

ALL of Phase A can be built without touching any API — the data is already being fetched in the Dashboard component's `useEffect`, stored in state, but never rendered. We just need to add the visual components.

### File to modify:
- `src/views/Dashboard.js` — main dashboard component (~1,289 lines)
- May need to extract into sub-components for maintainability
- New chart components in `components/charts/` as needed

### Design constraints:
- Must match existing terminal/hacker aesthetic
- Use same color palette: cyan (#00e5ff), green (#00e676), red (#ff1744), amber (#ffab00)
- Glass panels with backdrop-filter: blur(12px)
- Terminal prompts: `> SECTION_NAME` with green `>` prefix
- Animations via framer-motion (fadeUp, stagger)
- Mobile responsive (grid collapses to single column on <768px)
- Chart.js is already registered and available
- styled-components for all styling (no CSS modules, no Tailwind)

### Free vs Premium split for new sections:
| Section | Free | Premium |
|---|---|---|
| Live Whale Feed | ✅ Full | ✅ Full |
| Market Pulse Chart | ✅ Full | ✅ Full |
| Smart Money Consensus | ✅ Full | ✅ Full |
| Top High-Value Txs | Top 3 | All + whale identity |
| Blockchain Distribution | ✅ Full | ✅ Full |
| AI Signal Cards | ❌ Gated | ✅ Full |
| Breaking News | Top 3 | All 8 |
| Whale Heat Map | ✅ Full | ✅ Full |
| Position Builder | ❌ Gated | ✅ Full |
| Alert Config Widget | ❌ Gated | ✅ Full |
