# Grok (xAI) Integration — Implementation Prompt

> **Decision:** Replace OpenAI with Grok (xAI) as the primary AI engine for Sonar Tracker's real-time intelligence features. Grok's native X/Twitter access and real-time web search make it uniquely suited for a crypto whale intelligence platform where **breaking context matters more than generic reasoning**.

---

## WHY GROK OVER OPENAI (FOR THIS PRODUCT)

| Factor | OpenAI (GPT-4o) | Grok (xAI) | Winner |
|---|---|---|---|
| **Real-time news** | Training cutoff, no live data | Live web + DeepSearch | **Grok** |
| **Twitter/X data** | No access | Native X integration | **Grok** |
| **Crypto context** | Generic | Strong crypto/finance focus + X crypto community | **Grok** |
| **Speed** | Fast | Fast (comparable) | Tie |
| **Cost** | $5/$15 per 1M tokens (4o) | $2/$10 per 1M tokens (grok-3-mini) | **Grok** |
| **Structured output** | Excellent JSON mode | Good, improving | OpenAI |
| **Brand alignment** | Mainstream | Crypto-native, X ecosystem | **Grok** |

**Strategy:** Use Grok as primary for all real-time features. Keep a fallback to Claude/OpenAI for structured signal computation if needed.

---

## WHAT EXISTS TODAY (AI Features in Sonar)

### Current ORCA AI Advisor (`/app/ai-advisor/`)
- Chat interface where users ask about crypto markets
- Uses OpenAI API (GPT-4) via `/api/orca/` endpoints
- Has system prompts in `/app/lib/prompts.js`
- Premium-only (10 conversations/day)
- Context: can reference dashboard data, whale transactions

### Current Signal Engine (`/app/lib/signalEngine.js`)
- Deterministic 4-tier scoring (whale flow, price momentum, news sentiment, social)
- Runs every 15 minutes via cron
- Stores in `token_signals` table
- Does NOT use AI — pure algorithmic

### Current AI Content (`/scripts/`)
- `autonomous-trader.js` — likely uses AI for analysis
- Marketing scripts reference OpenAI/Claude for content generation

### Current News/Social Pipeline
- `social_posts` table — ingested from crypto influencers
- `social_ai_summaries` table — AI-generated topic briefs (BTC, ETH, SOL)
- Used by SocialPulse component on dashboard

---

## WHAT TO BUILD WITH GROK

### 1. ORCA V2 — Real-Time AI Advisor (Replace OpenAI → Grok)

**File:** `/api/orca/route.js` (or wherever the chat API lives)

**Changes:**
- Replace OpenAI SDK with xAI SDK (`@xai-org/sdk` or raw REST to `https://api.x.ai/v1/chat/completions`)
- Model: `grok-3` for complex analysis, `grok-3-mini` for quick responses
- xAI API is OpenAI-compatible — same `messages` format, just different base URL + API key

**New system prompt (leverage Grok's strengths):**
```
You are ORCA, the AI trading intelligence advisor for Sonar Tracker.

You have access to real-time whale transaction data from Sonar's database.
You can search the web and X/Twitter in real-time for the latest crypto news and sentiment.

When a user asks about a token:
1. Analyze the whale flow data provided in context
2. Search for breaking news and X posts about that token
3. Cross-reference whale movements with news catalysts
4. Provide actionable insight — not generic advice

Always cite specific data: "3 whale wallets accumulated $12M ETH in the last 4 hours, coinciding with [news event]."

You are direct, data-driven, and never hedge with generic disclaimers unless legally required.
Format: Use terminal-style formatting. Data first, opinion second.
```

**Key advantage:** When a user asks "Why did whales just dump SOL?", Grok can:
1. See the whale data you inject in context
2. Search X in real-time for SOL news
3. Find the actual catalyst (e.g., "Solana foundation announced X 2 hours ago")
4. Correlate and explain

OpenAI can only do step 1 and guess.

**API migration example:**
```javascript
// Before (OpenAI)
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
})

// After (Grok — drop-in compatible)
const response = await fetch('https://api.x.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'grok-3-mini-fast',  // or 'grok-3' for complex queries
    messages: [...],
    stream: true,  // for real-time streaming responses
  }),
})
```

**Environment variable:** Add `XAI_API_KEY` to `.env.local` and Vercel env vars.

---

### 2. REAL-TIME NEWS CORRELATION ENGINE (New Feature)

**New endpoint:** `/api/intelligence/correlate`

**Purpose:** When a whale makes a large move, automatically correlate it with recent news.

**Flow:**
1. Cron job detects whale transaction > $1M
2. Calls Grok with: "A whale just bought $4.2M worth of ETH. Search the latest news and X posts for Ethereum. What likely caused this move? Respond in JSON: { catalyst: string, confidence: number, sources: string[] }"
3. Store the correlation in a new `whale_correlations` table
4. Surface on dashboard: "🔥 3 whales bought $12M ETH — likely catalyzed by [Ethereum ETF inflow report]"

**Table schema:**
```sql
CREATE TABLE whale_correlations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_hash TEXT,
  token TEXT,
  catalyst TEXT,
  confidence FLOAT,
  sources JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**This is the killer feature** — no competitor does this. Nansen shows whale moves. Sonar shows whale moves AND explains WHY.

---

### 3. AI-POWERED SOCIAL SUMMARIES (Upgrade Existing)

**Current:** `social_ai_summaries` table has basic topic summaries.

**Upgrade:** Use Grok to generate hourly market intelligence briefs that:
- Summarize the top 5 X/Twitter conversations about crypto
- Identify which tokens are trending on X right now
- Cross-reference X sentiment with actual whale flow data
- Generate in terminal-style format matching Sonar's aesthetic

**New cron endpoint:** `/api/cron/social-intelligence`

```javascript
// Prompt for Grok
const prompt = `
You are Sonar Tracker's market intelligence engine.

Current whale data (last 4 hours):
${JSON.stringify(whaleFlowData)}

Generate a 3-paragraph market intelligence brief:
1. What whales are doing (based on the data above)
2. What X/Twitter is saying about crypto right now (search live)
3. Any divergences between whale behavior and public sentiment (this is the alpha)

Format as JSON: { headline: string, brief: string, sentiment: 'bullish'|'bearish'|'neutral', key_tokens: string[], confidence: number }
`
```

---

### 4. POSITION BUILDER / TRADE IDEAS (Dashboard V2 Feature)

This was planned in the Dashboard V2 prompt. With Grok, it becomes much more powerful:

**Endpoint:** `/api/intelligence/trade-ideas`

**Flow:**
1. Collect: top 5 whale flow tokens + their signals + latest news
2. Send to Grok: "Based on this whale data and current market conditions, generate 3 trade ideas"
3. Grok searches for real-time context (news, X posts, price action)
4. Returns structured trade ideas with reasoning

**Premium only** — this is the highest-value feature.

---

### 5. AUTOMATED CONTENT PIPELINE (Marketing Engine)

**Ties into the Marketing Plan Phase 3 (Content Engine).**

**New endpoint:** `/api/cron/content-generator`

Every time a whale transaction > $5M occurs:
1. Grok generates:
   - A tweet-ready alert (140 chars, with emoji + data)
   - A Telegram message (more detail + link to Sonar)
   - A one-paragraph newsletter item
2. Store in `content_queue` table
3. Auto-post to Telegram channel via Bot API
4. Queue tweets for approval or auto-post

**This automates 10-15 pieces of content per day** as the marketing plan describes.

---

## IMPLEMENTATION PRIORITY

### Phase 1 — Core Migration (Week 1)
- [ ] Sign up for xAI API at `console.x.ai`
- [ ] Add `XAI_API_KEY` to environment variables
- [ ] Replace OpenAI calls in ORCA advisor with Grok API (drop-in replacement)
- [ ] Update system prompts to leverage Grok's real-time capabilities
- [ ] Test: "Why are whales buying ETH?" should return real-time news context

### Phase 2 — Intelligence Features (Week 2)
- [ ] Build `/api/intelligence/correlate` endpoint
- [ ] Create `whale_correlations` table in Supabase
- [ ] Wire correlation data into Dashboard V2 Trophy Trades section
- [ ] Build Position Builder / Trade Ideas panel (premium)

### Phase 3 — Content Automation (Week 3)
- [ ] Build `/api/cron/content-generator` endpoint
- [ ] Create `content_queue` table
- [ ] Set up Telegram Bot API for auto-posting whale alerts
- [ ] Build tweet queue system (approve or auto-post)
- [ ] Upgrade social intelligence summaries with Grok

### Phase 4 — Advanced (Week 4+)
- [ ] Grok-powered chart pattern analysis (send chart data, get pattern labels)
- [ ] Multi-model routing: Grok for real-time context, Claude for deep reasoning
- [ ] User-specific AI briefings ("Your watchlist morning report")

---

## TECHNICAL SETUP

### xAI API (Grok)
```
Base URL: https://api.x.ai/v1
Auth: Bearer token (XAI_API_KEY)
Models:
  - grok-3          — Full reasoning, best quality ($3/$15 per 1M tokens)
  - grok-3-mini     — Fast, cheap, good for summaries ($0.30/$0.50 per 1M tokens)
  - grok-3-mini-fast — Fastest, cheapest ($0.10/$0.25 per 1M tokens)
Format: OpenAI-compatible (same SDK works, just change baseURL)
```

### Drop-in SDK Change
```javascript
// If using OpenAI SDK, just change the config:
import OpenAI from 'openai'

const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
})

// All existing code works as-is
const completion = await grok.chat.completions.create({
  model: 'grok-3-mini-fast',
  messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
})
```

### Cost Estimate (Monthly)
| Feature | Model | Est. Calls/Day | Est. Cost/Mo |
|---|---|---|---|
| ORCA Advisor | grok-3-mini | ~50 (premium users) | ~$5 |
| News Correlations | grok-3-mini-fast | ~100 (per large tx) | ~$3 |
| Social Summaries | grok-3-mini | ~24 (hourly) | ~$1 |
| Content Pipeline | grok-3-mini-fast | ~30 | ~$1 |
| Trade Ideas | grok-3 | ~20 (premium) | ~$3 |
| **Total** | | | **~$13/mo** |

Compare: OpenAI GPT-4o for same workload would be ~$40-60/mo.

---

## FILES TO MODIFY

| File | Change |
|---|---|
| `/app/lib/prompts.js` | Update system prompts for Grok's capabilities |
| `/app/api/orca/route.js` (find actual path) | Replace OpenAI client with Grok |
| `.env.local` | Add `XAI_API_KEY` |
| `vercel.json` or Vercel dashboard | Add `XAI_API_KEY` env var |
| `/app/api/intelligence/correlate/route.js` | **New** — whale correlation engine |
| `/app/api/intelligence/trade-ideas/route.js` | **New** — position builder |
| `/app/api/cron/content-generator/route.js` | **New** — content pipeline |
| `/supabase/migrations/` | **New** — `whale_correlations`, `content_queue` tables |
| `/scripts/` | Update any AI scripts to use Grok |
