# ORCA AI 2.0 - Implementation Action Plan

**Created**: January 2, 2026  
**Status**: Planning Phase  
**Target**: Production-ready chatbot with monetization

---

## 📋 EXECUTIVE SUMMARY

This document outlines the complete implementation roadmap for Orca AI 2.0, a GPT-4.0-powered chatbot that helps intermediate/beginner traders make informed crypto investment decisions by analyzing whale movements, news sentiment, and market data.

**Key Metrics:**
- **MVP Timeline**: 30 days
- **Full Features**: 60-90 days
- **Monetization**: $7.99/month pro tier (live)
- **Target Margin**: 97%+ (LLM costs ~$0.20/user/month)

---

## 🎯 PHASE 0: PRE-IMPLEMENTATION CHECKLIST

**Status**: ⏳ In Progress

### 0.1 Environment Configuration
- [ ] Update `.env.local` with new Stripe Price ID (`price_1Sl6v8K8B21zF4WABaN32ivN`)
- [ ] Update `.env.local` with Stripe Product ID (`prod_TEMooYyi24aFsY`)
- [ ] Search codebase for old Stripe Price ID (`price_1SHu59K8B21zF4WAUQWkxPC0`) and replace
- [ ] Verify all API keys are in `.env.local`:
  - `OPENAI_API_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRYPTOPANIC_API_TOKEN`
  - `LUNARCRUSH_API_KEY`
  - `COINGECKO_API_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_PRICE_ID` (NEW)
  - `STRIPE_PRODUCT_ID` (NEW)

### 0.2 Stripe Dashboard Setup
- [ ] Set `price_1Sl6v8K8B21zF4WABaN32ivN` as **Default** price in Stripe dashboard
- [ ] Confirm no active subscriptions on old pricing (£5.00/month)
- [ ] Test checkout flow with new $7.99/month pricing

### 0.3 Documentation Review
- [x] All API credentials stored in `ORCA_AI_CONFIG.md`
- [x] MVP specifications documented
- [ ] Architecture diagrams created (optional)

---

## 🏗️ PHASE 1: FOUNDATION (Days 1-10)

**Goal**: Set up database schema, data ingestion pipelines, and core infrastructure

### 1.1 Database Schema Design & Creation

#### New Tables to Create

##### A. `news_items`
**Purpose**: Store news from CryptoPanic + LunarCrush

```sql
CREATE TABLE news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,           -- API provider's ID
  ticker TEXT NOT NULL,                        -- BTC, ETH, SOL, etc.
  title TEXT NOT NULL,
  body TEXT,                                    -- Full article content (if available)
  url TEXT,
  source TEXT NOT NULL,                        -- 'cryptopanic', 'lunarcrush'
  source_domain TEXT,                          -- 'coindesk.com', 'cointelegraph.com'
  provider_sentiment FLOAT,                    -- Raw sentiment from provider (-1 to +1)
  llm_sentiment FLOAT,                         -- GPT-4.0 analyzed sentiment (-1 to +1)
  llm_reasoning TEXT,                          -- GPT-4.0's explanation
  published_at TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  votes_positive INT DEFAULT 0,
  votes_negative INT DEFAULT 0,
  votes_important INT DEFAULT 0,
  metadata JSONB                               -- Additional provider-specific data
);

CREATE INDEX idx_news_ticker_time ON news_items(ticker, published_at DESC);
CREATE INDEX idx_news_published_at ON news_items(published_at DESC);
CREATE INDEX idx_news_source ON news_items(source);
CREATE INDEX idx_news_sentiment ON news_items(llm_sentiment) WHERE llm_sentiment IS NOT NULL;
```

##### B. `sentiment_scores`
**Purpose**: Aggregated sentiment by ticker & timeframe

```sql
CREATE TABLE sentiment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  timeframe TEXT NOT NULL,                     -- '1h', '24h', '7d', '30d'
  provider_sentiment_avg FLOAT,                -- Avg from CryptoPanic/LunarCrush
  llm_sentiment_avg FLOAT,                     -- Avg from GPT-4.0 analysis
  aggregated_score FLOAT NOT NULL,             -- Weighted: 60% LLM, 40% provider
  news_count INT DEFAULT 0,
  social_sentiment_avg FLOAT,                  -- LunarCrush social data
  social_volume INT,
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ticker, timeframe, computed_at)
);

CREATE INDEX idx_sentiment_ticker_timeframe ON sentiment_scores(ticker, timeframe, computed_at DESC);
```

##### C. `price_snapshots`
**Purpose**: CoinGecko price data for analysis

```sql
CREATE TABLE price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  coingecko_id TEXT NOT NULL,                  -- 'bitcoin', 'ethereum', etc.
  price_usd FLOAT NOT NULL,
  market_cap FLOAT,
  volume_24h FLOAT,
  price_change_1h FLOAT,
  price_change_24h FLOAT,
  price_change_7d FLOAT,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_price_ticker_time ON price_snapshots(ticker, fetched_at DESC);
CREATE INDEX idx_price_fetched_at ON price_snapshots(fetched_at DESC);
```

##### D. `user_quotas`
**Purpose**: Track daily question/brief limits

```sql
CREATE TABLE user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quota_date DATE NOT NULL DEFAULT CURRENT_DATE,
  questions_used INT DEFAULT 0,
  questions_limit INT NOT NULL,                -- 2 for free, 5 for pro
  briefs_sent INT DEFAULT 0,
  briefs_limit INT NOT NULL,                   -- 0 for free, 1 for pro
  last_question_at TIMESTAMPTZ,
  last_brief_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, quota_date)
);

CREATE INDEX idx_quotas_user_date ON user_quotas(user_id, quota_date DESC);
```

##### E. `chat_history`
**Purpose**: Store user conversations with Orca AI

```sql
CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,                    -- Group messages by conversation
  role TEXT NOT NULL,                          -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  ticker TEXT,                                 -- Extracted ticker (if any)
  data_snapshot JSONB,                         -- Whale/sentiment/news data used
  tokens_used INT,
  cost_usd FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_user_session ON chat_history(user_id, session_id, created_at);
CREATE INDEX idx_chat_created_at ON chat_history(created_at DESC);
```

##### F. `daily_briefs`
**Purpose**: Archive generated daily briefs

```sql
CREATE TABLE daily_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brief_date DATE NOT NULL,
  content TEXT NOT NULL,                       -- Formatted HTML/Markdown
  tickers_covered TEXT[],                      -- Array of tickers analyzed
  whale_highlights JSONB,
  sentiment_snapshot JSONB,
  top_movers JSONB,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, brief_date)
);

CREATE INDEX idx_briefs_user_date ON daily_briefs(user_id, brief_date DESC);
CREATE INDEX idx_briefs_sent_at ON daily_briefs(sent_at DESC) WHERE sent_at IS NOT NULL;
```

##### G. `user_watchlists`
**Purpose**: User-saved favorite tokens

```sql
CREATE TABLE user_watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  coingecko_id TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  UNIQUE(user_id, ticker)
);

CREATE INDEX idx_watchlist_user ON user_watchlists(user_id, added_at DESC);
```

**Tasks:**
- [ ] Create all 7 tables in Supabase (via SQL editor or migration script)
- [ ] Test table creation with sample inserts
- [ ] Set up Row-Level Security (RLS) policies for user-specific tables
- [ ] Document table relationships

---

### 1.2 Data Ingestion Cron Jobs

#### A. News Ingestion (Every 6 Hours)
**Source**: CryptoPanic + LunarCrush  
**Schedule**: `0 */6 * * *` (00:00, 06:00, 12:00, 18:00 GMT)

**Flow:**
1. Fetch news from CryptoPanic `/posts/` for top 50 tickers
2. Fetch news from LunarCrush `/topic/:topic/news/v1` for same tickers
3. Deduplicate by URL/external_id
4. Insert into `news_items` (provider_sentiment only)
5. Queue for LLM sentiment analysis (batch process)

**Implementation Options:**
- Vercel Cron (recommended, already integrated)
- Supabase Edge Functions + pg_cron
- External service (Render Cron, Railway, Fly.io)

**Tasks:**
- [ ] Create API route `/api/cron/ingest-news`
- [ ] Implement CryptoPanic fetcher function
- [ ] Implement LunarCrush fetcher function
- [ ] Add deduplication logic
- [ ] Test with 5-10 tickers first
- [ ] Set up cron trigger (Vercel Cron)
- [ ] Add error logging & monitoring

#### B. LLM Sentiment Analysis (Every 6 Hours, Offset +30min)
**Schedule**: `30 */6 * * *` (00:30, 06:30, 12:30, 18:30 GMT)

**Flow:**
1. Fetch `news_items` where `llm_sentiment IS NULL`
2. Batch into groups of 20 (rate limit management)
3. Send to GPT-4.0 for sentiment analysis
4. Update `llm_sentiment` and `llm_reasoning` fields

**GPT-4.0 Prompt Template:**
```
Analyze the following crypto news headline and assign a sentiment score:
- Score: -1.0 (very bearish) to +1.0 (very bullish)
- Provide brief reasoning (max 50 words)

Headline: "{title}"
Source: {source_domain}
Ticker: {ticker}

Response format:
{
  "sentiment": 0.75,
  "reasoning": "Positive institutional adoption news, major exchange listing"
}
```

**Tasks:**
- [ ] Create API route `/api/cron/analyze-sentiment`
- [ ] Implement GPT-4.0 batch processor
- [ ] Add retry logic for failed analyses
- [ ] Test with 50 news items
- [ ] Set up cron trigger
- [ ] Monitor token usage

#### C. Sentiment Aggregation (Every 1 Hour)
**Schedule**: `0 * * * *` (hourly)

**Flow:**
1. For each active ticker (user watchlists + top 50):
   - Calculate avg `llm_sentiment` for 1h, 24h, 7d, 30d
   - Calculate avg `provider_sentiment` for same periods
   - Compute weighted `aggregated_score` (60% LLM, 40% provider)
2. Insert into `sentiment_scores` table

**Tasks:**
- [ ] Create API route `/api/cron/aggregate-sentiment`
- [ ] Write SQL aggregation queries
- [ ] Test aggregation accuracy
- [ ] Set up cron trigger

#### D. Price Snapshot (Every 15 Minutes)
**Source**: CoinGecko  
**Schedule**: `*/15 * * * *`

**Flow:**
1. Fetch price data for all tracked tickers (watchlists + top 50)
2. Insert into `price_snapshots`
3. Respect CoinGecko rate limit (250 req/min)

**Tasks:**
- [ ] Create API route `/api/cron/ingest-prices`
- [ ] Implement CoinGecko price fetcher
- [ ] Add rate limiting logic
- [ ] Test with 20 tickers
- [ ] Set up cron trigger

**Deliverables for Phase 1:**
- ✅ 7 new Supabase tables created
- ✅ 4 cron jobs running smoothly
- ✅ Data flowing into `news_items`, `sentiment_scores`, `price_snapshots`
- ✅ Error monitoring in place

---

## 🤖 PHASE 2: CHATBOT CORE (Days 11-25)

**Goal**: Build the conversational AI that answers user questions with real-time data

### 2.1 Chat API Endpoint

**Endpoint**: `POST /api/chat`

**Request Body:**
```json
{
  "message": "What's happening with SOL?",
  "sessionId": "uuid",
  "userId": "uuid"
}
```

**Response Body:**
```json
{
  "response": {
    "text": "Solana is showing bullish momentum...",
    "cards": [
      {
        "type": "whale_activity",
        "data": { "netFlow24h": 13500000, "inflowUsd": 15900000, "outflowUsd": 2400000 }
      },
      {
        "type": "sentiment",
        "data": { "score": 0.68, "newsPositive": 12, "newsNegative": 3 }
      },
      {
        "type": "news",
        "data": [ { "title": "...", "sentiment": 0.7, "source": "..." } ]
      }
    ]
  },
  "quotaRemaining": 3,
  "disclaimer": "This is educational content only. Not financial advice."
}
```

### 2.2 Core Chat Flow

```
User sends message
      ↓
Check user quota (user_quotas table)
      ↓ (if quota OK)
Parse message (extract tickers, intent)
      ↓
Retrieve data:
  - whale_transactions (last 24h for ticker)
  - sentiment_scores (1h, 24h for ticker)
  - news_items (last 20 items for ticker)
  - price_snapshots (current + 24h ago)
      ↓
Build context JSON:
  {
    "ticker": "SOL",
    "whale_data": {...},
    "sentiment_data": {...},
    "news_data": [...],
    "price_data": {...}
  }
      ↓
Send to GPT-4.0 with system prompt
      ↓
Parse GPT-4.0 response
      ↓
Format response (text + cards)
      ↓
Save to chat_history
      ↓
Increment user_quotas.questions_used
      ↓
Return to user
```

### 2.3 GPT-4.0 System Prompt

```
You are Orca AI, an expert crypto market analyst helping traders make informed decisions.

Your specialty is ERC-20 tokens, but you can analyze any cryptocurrency using CoinGecko data.

You have access to:
- Real-time whale transaction data (addresses moving >$100k)
- News sentiment scores (from CryptoPanic, LunarCrush, and our LLM analysis)
- Price data and market metrics
- Historical trends

When answering:
1. Be conversational but professional
2. Cite specific data points (e.g., "$13.5M net whale inflow in 24h")
3. Explain WHY the data matters (e.g., "This suggests institutional accumulation")
4. Provide balanced analysis (bullish + bearish factors)
5. Always end with: "This is educational content only. Not financial advice. DYOR."

If asked about paper portfolio suggestions:
- Be specific (e.g., "Consider adding SOL to your watchlist for momentum plays")
- Explain the rationale based on data
- Emphasize risk management

Current data snapshot:
{data_snapshot}

User question: {user_message}
```

### 2.4 Rate Limiting Logic

**Check Before Each Query:**
```javascript
// Pseudo-code
async function checkQuota(userId) {
  const today = new Date().toISOString().split('T')[0]; // GMT date
  const userProfile = await getProfile(userId);
  
  const quota = await db.user_quotas.findOrCreate({
    user_id: userId,
    quota_date: today,
    questions_limit: userProfile.plan === 'pro' ? 5 : 2,
    briefs_limit: userProfile.plan === 'pro' ? 1 : 0
  });
  
  if (quota.questions_used >= quota.questions_limit) {
    throw new Error('Daily question limit reached. Upgrade to Pro for more questions!');
  }
  
  return quota;
}

async function incrementQuota(userId) {
  await db.user_quotas.increment('questions_used', {
    where: { user_id: userId, quota_date: today }
  });
}
```

**Tasks:**
- [ ] Create `/api/chat` endpoint
- [ ] Implement ticker extraction (regex + GPT-4.0 fallback)
- [ ] Build data retrieval functions (whale, sentiment, news, price)
- [ ] Create context JSON builder
- [ ] Integrate GPT-4.0 API
- [ ] Implement response parser
- [ ] Build card formatter (whale, sentiment, news)
- [ ] Add rate limiting checks
- [ ] Save chat history
- [ ] Add error handling (API failures, rate limits, etc.)
- [ ] Test with 20+ diverse questions

---

### 2.5 Frontend Chat UI

**Components to Build:**

1. **ChatContainer** - Main chat interface
   - Message list (scrollable)
   - Input box with send button
   - Quota display (e.g., "3/5 questions remaining today")

2. **MessageBubble** - Individual message
   - User messages (right-aligned, blue)
   - AI messages (left-aligned, gray)
   - Timestamp

3. **DataCard** - Interactive data visualizations
   - WhaleActivityCard (net flow, top transactions)
   - SentimentCard (gauge + breakdown)
   - NewsCard (headline, source, sentiment badge)
   - InsightCard (GPT-4.0 key takeaways)

4. **DisclaimerFooter** - Legal disclaimer
   - Always visible at bottom of AI responses
   - Link to full terms

**Tasks:**
- [ ] Design chat UI mockup (Figma optional)
- [ ] Build ChatContainer component
- [ ] Build MessageBubble component
- [ ] Build WhaleActivityCard component
- [ ] Build SentimentCard component
- [ ] Build NewsCard component
- [ ] Build InsightCard component
- [ ] Build DisclaimerFooter component
- [ ] Add loading states (typing indicator)
- [ ] Add error states (quota exceeded, API error)
- [ ] Integrate with `/api/chat` endpoint
- [ ] Test on mobile + desktop

**Deliverables for Phase 2:**
- ✅ `/api/chat` endpoint functional
- ✅ GPT-4.0 integration working
- ✅ Rate limiting enforced
- ✅ Chat UI live on dashboard
- ✅ Data cards rendering correctly
- ✅ Users can ask questions and get AI responses

---

## 📧 PHASE 3: DAILY BRIEF (Days 26-35)

**Goal**: Automated email summaries for pro users (1/day)

### 3.1 Brief Generation Logic

**Schedule**: 06:00 GMT daily  
**Cron**: `0 6 * * *`

**Flow:**
1. Get all users where `plan = 'pro'`
2. For each user:
   - Get their watchlist (or default to top 10 by market cap)
   - Aggregate data:
     - Top 5 movers (24h % change)
     - Whale highlights (biggest flows)
     - Sentiment snapshot (avg across watchlist)
     - Top 3 news items (by importance)
   - Send to GPT-4.0 for brief generation
   - Save to `daily_briefs` table
   - Send email via Resend API

### 3.2 GPT-4.0 Brief Prompt

```
Generate a concise daily crypto brief (300-400 words) for a trader.

Focus on:
1. Top 5 price movers in their watchlist (with % changes)
2. Notable whale activity (large inflows/outflows)
3. Sentiment shifts (which tokens are trending bullish/bearish)
4. Key news headlines (max 3)

Tone: Professional but approachable. Use bullet points and emojis sparingly.
Format: HTML for email.

Data:
{watchlist_data}

End with: "Stay informed, trade smart. This is educational content only."
```

### 3.3 Email Template

**Subject**: `Your Daily Crypto Brief - ${date}`

**HTML Body:**
- Header with logo
- Greeting: "Good morning, {user_name}!"
- Brief content (GPT-4.0 generated)
- CTA: "View Full Analysis" → Link to dashboard
- Footer with unsubscribe link + legal disclaimer

### 3.4 Resend API Integration

**Setup:**
- [ ] Install `resend` npm package
- [ ] Get Resend API key (sign up at resend.com)
- [ ] Verify domain (sonartracker.io)
- [ ] Create email template in Resend dashboard

**Send Email Code:**
```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Orca AI <orca@sonartracker.io>',
  to: user.email,
  subject: `Your Daily Crypto Brief - ${formattedDate}`,
  html: briefHtml
});
```

**Tasks:**
- [ ] Create `/api/cron/generate-briefs` endpoint
- [ ] Implement watchlist fetcher
- [ ] Build data aggregator for briefs
- [ ] Create GPT-4.0 brief generator
- [ ] Design email HTML template
- [ ] Set up Resend account + domain verification
- [ ] Integrate Resend API
- [ ] Test email delivery (sandbox mode)
- [ ] Save briefs to `daily_briefs` table
- [ ] Implement unsubscribe logic
- [ ] Set up cron trigger (06:00 GMT)
- [ ] Monitor delivery rates

**Deliverables for Phase 3:**
- ✅ Daily briefs generating at 06:00 GMT
- ✅ Emails delivered via Resend
- ✅ HTML template looks professional
- ✅ Briefs saved in database
- ✅ Unsubscribe option working

---

## 👤 PHASE 4: USER FEATURES (Days 36-50)

**Goal**: Watchlist management, historical queries, quota display

### 4.1 Watchlist Management

**API Endpoints:**
- `GET /api/watchlist` - Get user's saved tickers
- `POST /api/watchlist` - Add ticker to watchlist
  ```json
  { "ticker": "SOL", "coingecko_id": "solana" }
  ```
- `DELETE /api/watchlist/:ticker` - Remove ticker

**Frontend UI:**
- Dashboard section: "My Watchlist"
- Grid of ticker cards (price, 24h change, sentiment gauge)
- "Add Ticker" button → modal with search
- Remove icon on hover

**Limits:**
- Free: 10 tickers max
- Pro: 50 tickers max

**Tasks:**
- [ ] Create watchlist API routes
- [ ] Build WatchlistCard component
- [ ] Build AddTickerModal component
- [ ] Add ticker search (CoinGecko API)
- [ ] Implement watchlist limit checks
- [ ] Add to dashboard
- [ ] Test add/remove flow

---

### 4.2 Historical Queries

**Examples:**
- "What did whales do with BTC last week?"
- "Show me ETH sentiment over the past 30 days"
- "How has SOL price changed since December?"

**Implementation:**
- GPT-4.0 parses time range from user message
- Backend fetches historical data:
  - `whale_transactions` (filter by timestamp)
  - `sentiment_scores` (use precomputed 7d, 30d)
  - `price_snapshots` (fetch range)
- GPT-4.0 analyzes trends over time

**Enhanced Prompt Addition:**
```
If the user asks about historical data:
1. Identify the time range (e.g., "last week" = 7 days)
2. Analyze trends over that period
3. Highlight significant changes (price swings, whale accumulation phases, sentiment shifts)
4. Compare to current data
```

**Tasks:**
- [ ] Add time range parsing to chat endpoint
- [ ] Implement historical data fetchers
- [ ] Update GPT-4.0 prompt for time-based queries
- [ ] Test with diverse time range questions

---

### 4.3 Quota Display

**UI Locations:**
1. **Chat Interface**: Below input box
   - "3/5 questions remaining today"
   - Link to upgrade if free user
2. **Dashboard Header**: Badge icon
   - Shows remaining quota
   - Tooltip with reset time (00:00 GMT)
3. **Settings Page**: Full quota breakdown
   - Questions used today
   - Briefs sent this month
   - Upgrade CTA if free

**Tasks:**
- [ ] Create `/api/quota` endpoint (returns current usage)
- [ ] Build QuotaBadge component
- [ ] Add quota display to chat UI
- [ ] Add quota display to dashboard header
- [ ] Create quota settings page
- [ ] Add upgrade CTA for free users

---

### 4.4 User Settings Page

**Sections:**
1. **Profile**
   - Display name (editable)
   - Email (read-only)
   - Plan badge (Free/Pro)
2. **Daily Brief Preferences** (Pro only)
   - Enable/disable daily brief
   - Delivery time (coming in Phase 2)
3. **Watchlist** (embedded or link)
4. **Billing**
   - Current plan
   - Upgrade/Cancel buttons → Stripe Customer Portal
5. **Usage Stats**
   - Questions asked this month (chart)
   - Briefs received
   - Most queried tickers

**Tasks:**
- [ ] Create settings page UI
- [ ] Implement profile update endpoint
- [ ] Add brief preferences toggle
- [ ] Integrate Stripe Customer Portal link
- [ ] Build usage stats visualizations
- [ ] Test all settings flows

**Deliverables for Phase 4:**
- ✅ Watchlist fully functional
- ✅ Historical queries working
- ✅ Quota display on all relevant pages
- ✅ Settings page live
- ✅ Stripe billing integration complete

---

## 🚀 PHASE 5: POLISH & LAUNCH (Days 51-60)

**Goal**: Testing, optimization, legal compliance, marketing prep

### 5.1 Testing & QA

**Test Cases:**
- [ ] Free user can ask 2 questions/day, then blocked
- [ ] Pro user can ask 5 questions/day + receive 1 daily brief
- [ ] Quota resets at 00:00 GMT
- [ ] Watchlist limits enforced (10 free, 50 pro)
- [ ] Chat responses include accurate data (spot-check 20 queries)
- [ ] Historical queries return correct time ranges
- [ ] Daily brief emails deliver successfully
- [ ] Stripe upgrade/downgrade flow works
- [ ] Stripe webhook updates user plan in DB
- [ ] Mobile responsive (chat UI, watchlist, settings)
- [ ] Error handling (API failures, rate limits, network issues)

**Load Testing:**
- [ ] Simulate 50 concurrent chat requests
- [ ] Simulate 100 daily brief generations
- [ ] Check database performance (query times <500ms)
- [ ] Check API rate limits (CoinGecko, OpenAI, CryptoPanic, LunarCrush)

---

### 5.2 Legal & Compliance

**Required Pages:**
- [ ] **Terms of Service**
  - No financial advice disclaimer
  - User data usage
  - Subscription terms (refund policy, cancellation)
- [ ] **Privacy Policy**
  - Data collection (chat history, watchlists)
  - Third-party services (Stripe, Resend, Supabase)
  - User rights (GDPR compliance if EU users)
- [ ] **Disclaimer Page**
  - Investment risks
  - No guarantees on accuracy
  - Not licensed financial advisors

**In-App Disclaimers:**
- [ ] Footer on every AI response
- [ ] Modal on first chat (one-time acknowledgment)
- [ ] Footer on daily brief emails

---

### 5.3 Performance Optimization

**Backend:**
- [ ] Add database indexes (already in schema)
- [ ] Optimize SQL queries (use EXPLAIN ANALYZE)
- [ ] Cache frequently accessed data (e.g., top 50 tickers metadata)
- [ ] Batch GPT-4.0 requests where possible
- [ ] Monitor API costs (set up alerts for >$50/day spend)

**Frontend:**
- [ ] Lazy load chat history (pagination)
- [ ] Optimize image sizes (if any)
- [ ] Minimize bundle size (check with webpack-bundle-analyzer)
- [ ] Add service worker for offline support (optional)

---

### 5.4 Monitoring & Logging

**Set Up:**
- [ ] Error tracking (Sentry or similar)
- [ ] API monitoring (Vercel Analytics or Datadog)
- [ ] Cost tracking dashboard (OpenAI, CoinGecko, Resend)
- [ ] User analytics (PostHog or Mixpanel)
  - Track: signups, upgrades, questions asked, briefs opened
- [ ] Cron job monitoring (health checks + alerts)

---

### 5.5 Marketing & Launch Prep

**Pre-Launch Checklist:**
- [ ] Create demo video (1-2 min showing chat + daily brief)
- [ ] Write launch blog post (on sonartracker.io/blog)
- [ ] Prepare social media posts (Twitter, Reddit r/CryptoCurrency)
- [ ] Set up Product Hunt page (optional)
- [ ] Email existing users (if any) about new feature
- [ ] Create FAQ page (common questions about Orca AI)

**Soft Launch:**
- [ ] Invite 10-20 beta testers
- [ ] Collect feedback (Google Form or Typeform)
- [ ] Fix critical bugs
- [ ] Iterate on prompt engineering (improve GPT-4.0 responses)

**Public Launch:**
- [ ] Announce on Twitter/X
- [ ] Post on Reddit (r/CryptoCurrency, r/CryptoMarkets)
- [ ] Post on Product Hunt (optional)
- [ ] Send email to mailing list (if any)
- [ ] Monitor signups + support requests

**Deliverables for Phase 5:**
- ✅ All tests passed
- ✅ Legal pages live
- ✅ Performance optimized
- ✅ Monitoring set up
- ✅ Marketing materials ready
- ✅ Public launch executed

---

## 📅 PHASE 6: POST-LAUNCH (Days 61-90)

**Goal**: Iterate based on feedback, add advanced features

### 6.1 Feedback Collection & Iteration

**Metrics to Track:**
- Daily active users (DAU)
- Conversion rate (free → pro)
- Questions per user per day (avg)
- Daily brief open rate
- Churn rate (pro users canceling)
- Most queried tickers
- Average GPT-4.0 response quality (manual review)

**Iterate:**
- [ ] Improve GPT-4.0 prompts based on user feedback
- [ ] Add more data sources (if needed)
- [ ] Fix bugs reported by users
- [ ] Optimize cron job timing (if API limits hit)

---

### 6.2 Advanced Features (Optional for 60-90 Days)

**Potential Additions:**
1. **Multi-Asset Comparisons**
   - "Compare BTC vs ETH whale activity"
   - Side-by-side data cards
2. **Alerts & Notifications**
   - "Alert me when SOL whale inflow >$10M"
   - Push notifications (web + email)
3. **Paper Portfolio Tracker**
   - Users can simulate trades
   - Track P&L over time
   - AI suggestions based on portfolio
4. **Advanced Historical Charts**
   - Interactive charts (TradingView-style)
   - Overlay whale flows on price charts
5. **Voice Input** (optional, experimental)
   - Ask questions via voice (Web Speech API)
6. **Mobile App** (long-term)
   - React Native or PWA

---

## 🎯 SUCCESS METRICS

### MVP Success (Day 30)
- ✅ 7 new database tables created
- ✅ 4 cron jobs running (news, sentiment, prices, aggregation)
- ✅ Chat endpoint functional with GPT-4.0 integration
- ✅ Rate limiting enforced (2 free, 5 pro)
- ✅ Chat UI live on dashboard
- ✅ At least 5 beta users testing

### Launch Success (Day 60)
- ✅ Daily briefs sending to pro users
- ✅ Watchlist + historical queries working
- ✅ Legal pages published
- ✅ 50+ signups
- ✅ 10+ paid subscribers ($79.90 MRR)
- ✅ <2% error rate on chat responses
- ✅ 90%+ email delivery rate

### Growth Success (Day 90)
- ✅ 200+ signups
- ✅ 25+ paid subscribers ($199.75 MRR)
- ✅ <1% churn rate
- ✅ 4.0+ star average feedback
- ✅ Featured on 1+ crypto blog/newsletter
- ✅ 2-3 advanced features shipped

---

## 💰 COST PROJECTIONS

### Monthly Operating Costs (at 100 users, 20 paid)

| Service | Usage | Cost |
|---------|-------|------|
| **OpenAI GPT-4.0** | ~3,600 questions + 600 briefs<br>~18M tokens total | ~$45-60 |
| **CoinGecko API** | 100k calls/month (included) | $0 (paid plan) |
| **CryptoPanic API** | 1,000 calls/month (included) | $0 (free tier) |
| **LunarCrush API** | Varies by plan | ~$29-49 |
| **Resend Emails** | 600 briefs/month | $0 (3k free) |
| **Supabase** | Overages? | ~$0-25 |
| **Vercel Hosting** | Hobby/Pro plan | $0-20 |
| **Total** | | **~$74-154/month** |

**Revenue at 20 Paid Users:**
- 20 × $7.99 = **$159.80/month**

**Profit Margin:**
- $159.80 - $154 = **$5.80/month** (breakeven)
- At 50 paid users: $399.50 - $200 = **$199.50 profit** (50% margin)
- At 100 paid users: $799 - $300 = **$499 profit** (62% margin)

**Scalability:**
- Costs grow sublinearly (caching, optimization)
- Revenue grows linearly with users
- Target: 100 paid users = **$500-600 profit/month**

---

## 🚨 RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **OpenAI API costs spike** | High | Set up cost alerts, implement caching, fallback to gpt-4o-mini |
| **CoinGecko rate limit hit** | Medium | Increase ingestion interval, upgrade plan if needed |
| **Poor GPT-4.0 response quality** | High | Extensive prompt engineering, A/B test prompts, collect feedback |
| **Low conversion (free→pro)** | High | Improve daily brief value, add more pro features, A/B test pricing |
| **Legal issues (financial advice)** | Critical | Strong disclaimers, consult lawyer, terms of service |
| **Data ingestion failures** | Medium | Retry logic, error monitoring, fallback data sources |
| **User churn (pro cancels)** | Medium | Collect exit feedback, improve features, monthly check-ins |

---

## ✅ IMMEDIATE NEXT STEPS (You Choose When to Start)

### Pre-Coding Checklist
1. [ ] Update `.env.local` with new Stripe Price ID
2. [ ] Search codebase for old Stripe Price ID and replace
3. [ ] Set new price as "Default" in Stripe dashboard
4. [ ] Review this action plan and approve phases

### First Development Sprint (Days 1-5)
1. [ ] Create 7 Supabase tables (1.1)
2. [ ] Set up Vercel Cron configuration
3. [ ] Build news ingestion cron (`/api/cron/ingest-news`)
4. [ ] Test with 5 tickers (BTC, ETH, SOL, BNB, XRP)
5. [ ] Verify data flowing into `news_items` table

---

## 📞 DECISION POINTS

Before proceeding, confirm:

1. **Are you happy with this 60-day plan?**
2. **Any phases you want to prioritize/deprioritize?**
3. **Should I start with Phase 0 (environment setup)?**
4. **Any features you want to add/remove?**

Once you give the green light, I'll:
1. Update your environment variables
2. Create the Supabase table schemas
3. Start building the first cron job (news ingestion)

**Let me know when you're ready to begin! 🚀**

