# ORCA AI 2.0 - Configuration & Credentials Reference

## 🔐 Supabase Configuration

### Project Details
- **Project ID**: `fwbwfvqzomipoftgodof`
- **Project URL**: `https://fwbwfvqzomipoftgodof.supabase.co`
- **Plan**: Paid Pro ($25/month) - Upgraded Jan 3, 2026
- **Environment**: PRODUCTION

### API Keys
```bash
# Publishable Key
SUPABASE_PUBLISHABLE_KEY=your_supabase_key_here

# Secret Key
SUPABASE_SECRET_KEY=your_supabase_key_here

# Anon Key
SUPABASE_ANON_KEY=your_supabase_jwt_token_here

# Service Role Key (ADMIN ACCESS)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_jwt_token_here
```

### JWT Signing Keys
- **Current Key**: `DC14AD91-D784-41D0-9B96-A2C415C8DCC7` (Legacy HS256)
- **Standby Key**: `2C393A00-4F99-4ED6-A188-6358E1A9755A` (ECC P-256)

### Auth Redirect URLs
```
http://localhost:4000/auth/callback
https://sonartracker.io/auth/callback
https://sonartracker.io
http://localhost:3000/**
http://localhost:3000/auth/callback
https://sonartracker.io/**
```

---

## 🗄️ Existing Supabase Schema

### 1. `addresses` Table
**Purpose**: Track whale addresses across blockchains with labels and balances

```sql
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  blockchain TEXT NOT NULL,
  label TEXT,
  source TEXT,
  confidence DOUBLE PRECISION,
  last_seen_tx TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  address_type TEXT,
  signal_potential TEXT,
  balance_native NUMERIC,
  balance_usd NUMERIC,
  entity_name TEXT,
  last_balance_check TIMESTAMP,
  detection_method TEXT,
  analysis_tags JSONB,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(address, blockchain)
);

-- Indexes
CREATE INDEX idx_addresses_blockchain ON addresses(blockchain);
CREATE INDEX idx_addresses_type ON addresses(address_type);
CREATE INDEX idx_addresses_created_at ON addresses(created_at);
CREATE INDEX idx_addresses_lookup_optimized ON addresses(address, blockchain, address_type)
  WHERE address_type IN ('CEX', 'DEX', 'WHALE');
CREATE INDEX idx_addresses_whales_only ON addresses(address, blockchain)
  WHERE address_type = 'WHALE';
CREATE INDEX idx_addresses_entity ON addresses(entity_name)
  WHERE entity_name IS NOT NULL;
```

### 2. `whale_transactions` Table
**Purpose**: Store classified whale transaction data

```sql
CREATE TABLE public.whale_transactions (
  id SERIAL PRIMARY KEY,
  transaction_hash TEXT UNIQUE NOT NULL,
  token_symbol TEXT,
  token_address TEXT,
  classification TEXT,
  confidence NUMERIC,
  usd_value NUMERIC,
  whale_score NUMERIC,
  blockchain TEXT,
  from_address TEXT,
  to_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  analysis_phases INTEGER,
  reasoning TEXT,
  monitoring_group TEXT,
  whale_address TEXT,
  counterparty_address TEXT,
  counterparty_type TEXT,
  is_cex_transaction BOOLEAN DEFAULT false,
  from_label TEXT,
  to_label TEXT
);

-- Indexes
CREATE INDEX whale_transactions_ts_idx ON whale_transactions(timestamp DESC);
```

### 3. `profiles` Table
**Purpose**: User profiles with subscription plans

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Trigger
CREATE TRIGGER profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION set_updated_at();
```

### 4. `token_sentiment_votes` Table
**Purpose**: User sentiment votes on tokens

```sql
CREATE TABLE public.token_sentiment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  token_symbol TEXT NOT NULL,
  vote public.sentiment_type NOT NULL,
  voter_email TEXT,
  voter_fingerprint TEXT,
  comments TEXT,
  source TEXT DEFAULT 'token_page'
);
```

---

## 🤖 OpenAI Configuration

### API Credentials
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### Project Info
- **Project Name**: "Sonar Test"
- **Created**: Jan 2, 2026
- **Permissions**: All
- **Status**: Active

### Model Recommendations
**For Orca AI 2.0 use cases (trading analysis, news summarization, reasoning):**

| Model | Use Case | Cost | Rationale |
|-------|----------|------|-----------|
| `gpt-4o-mini` | Daily Brief generation, Q&A responses | ~$0.15/$0.60 per 1M tokens (in/out) | Best balance of cost & quality for high-volume queries |
| `gpt-4o` | Deep dive analysis (premium feature) | ~$2.50/$10 per 1M tokens | Superior reasoning for complex market analysis |
| `o1-mini` | Multi-step reasoning, strategy planning | ~$3/$12 per 1M tokens | Best for chain-of-thought trading logic |

**Recommended Architecture:**
- **80% of queries**: `gpt-4o-mini` (Q&A, daily briefs)
- **20% of queries**: `gpt-4o` (when user explicitly asks for "deep analysis")
- **Caching**: 60-second cache for identical queries

---

## 📰 CryptoPanic API (News Source)

### Authentication
```bash
CRYPTOPANIC_API_TOKEN=d79612ea75e8182db7ec32803e4ec0be87dca5ed
```

### API Details
- **Base URL**: `https://cryptopanic.com/api/developer/v2`
- **Tier**: DEVELOPER (Free)
- **Rate Limits**: 
  - Level 1: 2 requests/second
  - Level 2: 1,000 requests/month

### Key Endpoints

#### `/posts/` - Get News
```bash
GET https://cryptopanic.com/api/developer/v2/posts/?auth_token=d79612ea75e8182db7ec32803e4ec0be87dca5ed&currencies=BTC,ETH&public=true
```

**Available Filters:**
- `currencies`: BTC, ETH, SOL, etc.
- `filter`: rising, hot, bullish, bearish, important
- `kind`: news, media, all
- `regions`: en, de, es, fr, etc.
- `public`: true (for public mode)

**Response Structure:**
```json
{
  "next": "url",
  "previous": "url",
  "results": [
    {
      "id": 12345,
      "title": "Bitcoin reaches new high",
      "published_at": "2026-01-02T10:00:00Z",
      "kind": "news",
      "votes": {
        "positive": 45,
        "negative": 2,
        "important": 12
      },
      "instruments": [
        {
          "code": "BTC",
          "title": "Bitcoin",
          "price_in_usd": 89296
        }
      ]
    }
  ]
}
```

---

## 🌙 LunarCrush API (Social Sentiment & Analytics)

### Authentication
```bash
LUNARCRUSH_API_KEY=your_lunarcrush_api_key_here
```

### API Details
- **Base URL**: `https://lunarcrush.com/api4/public/`
- **SSE Stream**: `https://lunarcrush.ai/sse?key=your_lunarcrush_api_key_here`
- **Tier**: PAID (Individual Plan) - Make full use of advanced features
- **Integration**: Connected to Claude AI
- **Priority**: Primary source for news and sentiment data

### Key Endpoints

#### 1. Topic Creators
```bash
GET https://lunarcrush.com/api4/public/topic/{topic}/creators/v1
Authorization: Bearer your_lunarcrush_api_key_here
```

**Response:**
```json
{
  "data": [
    {
      "creator_id": "twitter::978566222282444800",
      "creator_name": "MEXC_Official",
      "creator_followers": 1665282,
      "creator_rank": 1,
      "interactions_24h": 2799506
    }
  ]
}
```

#### 2. Other Available Endpoints
- `/topic/:topic/news/v1` - Topic-specific news
- `/topic/:topic/posts/v1` - Social posts
- `/topic/:topic/time-series/v2` - Historical data
- `/coins/meta/v1` - Coin metadata
- `/coins/list/v2` - All coins
- `/coins/:coin/time-series/v1` - Price & sentiment over time

---

## 🎯 Orca AI 2.0 Requirements

### Target Audience
- **Intermediate/Beginner traders**
- **Focus**: Education + actionable insights

### Monetization
- **Free Tier**: Limited access
- **Pro Tier**: $7.99/month
  - 5 questions per day
  - 1 daily brief per day

### Blockchain Support
1. **ERC20** (Ethereum) - Full whale tracking + sentiment
2. **Solana** - Full whale tracking + sentiment  
3. **Bitcoin** - Sentiment & price only (no on-chain whale data initially)

### Data Requirements
**New tables needed:**
1. `news_items` - CryptoPanic + LunarCrush news
2. `sentiment_scores` - Aggregated sentiment by ticker
3. `price_snapshots` - CoinGecko price data
4. `chat_history` - User conversations
5. `daily_briefs` - Generated brief archive
6. `user_quotas` - Rate limiting (5Q/day, 1 brief/day)

---

## 📊 Cost Analysis

### Monthly P&L Estimate (at $7.99/month Pro plan)

**Assumptions:**
- 1 paid user
- 5 questions/day = 150 questions/month
- 1 daily brief/day = 30 briefs/month
- Average prompt: 4,000 tokens in, 800 tokens out

**LLM Costs (gpt-4o-mini):**
- Input: (150 + 30) × 4,000 tokens × $0.15/1M = **$0.11/month**
- Output: (150 + 30) × 800 tokens × $0.60/1M = **$0.09/month**
- **Total per user: ~$0.20/month**

**Revenue:**
- $7.99/month per user

**Profit Margin:**
- **$7.79 per user/month (97.5% margin)**

**Breakeven:**
- At even 1,000 paid users: $7,990 revenue - $200 LLM costs = **$7,790 profit/month**

---

## 💳 Stripe Configuration

### API Keys
```bash
# Publishable Key
STRIPE_PUBLISHABLE_KEY=pk_live_51SHsuJK8B21zF4WAKQOqIKEfG6ObJuClARwxPvcmzHcDUUVgM6F5IB46gdNH0gErHV9QfBzQrM2V8kfTA3cGpd7w00XqjmjRvS

# Secret Key (from previous config)
STRIPE_SECRET_KEY=[provided earlier - check secure storage]
```

### Products & Pricing
- **Product Name**: Sonar pro
- **Product ID**: `prod_TEMooYyi24aFsY`
- **Description**: "Pro features to see all the live trading data in the blockchain."

#### Active Price (Pro Plan)
- **Price ID**: `price_1Sl6v8K8B21zF4WABaN32ivN`
- **Amount**: **$7.99 USD per month**
- **Status**: Active (0 active subscriptions as of Jan 2, 2026)
- **Created**: Jan 2, 2026

#### Archived Prices
1. £5.00/month (`price_1SHu59K8B21zF4WAUQWkxPC0`) - "Sonar Premium" - Archived Oct 15, 2025
2. £2.00/month - Archived Oct 13, 2025

### Webhooks
```bash
# Webhook Signing Secret
STRIPE_WEBHOOK_SECRET=whsec_0fEeniMI7yO2sygzRFx830Y5sjyDWOy6
```

**Active Endpoint:**
- URL: `https://www.sonartracker.io/api/stripe/webhook`
- Status: Active
- Events: 8 events from account activity
- Error Rate: 0%

---

## 🪙 CoinGecko API (Price & Market Data)

### Authentication
```bash
COINGECKO_API_KEY=your_coingecko_api_key_here
```

### API Details
- **Plan**: Paid Monthly Basic
- **Rate Limit**: 250 requests per minute
- **Monthly Quota**: 100,000 API calls/month
- **Overage**: Disabled (calls stop when quota exceeded)
- **Last Used**: Dec 30, 2025

### Key Label
- **whale**: Primary API key for whale transaction tracking

### Use Cases
- Bitcoin price & historical data
- All token price snapshots
- Market cap, volume, 24h changes
- Price data for whale transaction valuations

---

## 📧 Resend API (Email Delivery)

### Authentication
```bash
RESEND_API_KEY=re_6QsgQLuT_FvNHrnHQkJx1Srsd9YBaN7Ji
```

### API Details
- **Domain**: `sonartracker.io` (needs verification)
- **From Address**: `noreply@sonartracker.io` (recommended) or `eduardo@sonartracker.io`
- **Use Case**: Daily brief emails to pro users

### Setup Required
1. **Add Domain in Resend Dashboard**: https://resend.com/domains
2. **Add DNS Records** (provided by Resend after domain setup):
   - SPF Record (TXT)
   - DKIM Record (TXT)
   - DMARC Record (TXT)
3. **Verify Domain**: Wait 10-30 minutes for DNS propagation
4. **Test**: Send test email from Resend dashboard

---

## ⏰ Vercel Cron Configuration

### Cron Authentication
```bash
# Generated Jan 3, 2026
CRON_SECRET=dffe68424286373c3fd6fd52222701058c21e6b12921506c164d515776e2768b
```

### Cron Jobs (Phase 1)
1. **News Ingestion**: Every 12 hours → `/api/cron/ingest-news`
2. **Sentiment Analysis**: Every 12 hours (offset 30min) → `/api/cron/analyze-sentiment`
3. **Sentiment Aggregation**: Every hour → `/api/cron/aggregate-sentiment`
4. **Price Snapshots**: Every 15 minutes → `/api/cron/fetch-prices`

### Vercel Setup
1. Add `CRON_SECRET` to Vercel environment variables
2. Push `vercel.json` to repository
3. Deploy to Vercel
4. Cron jobs will run automatically on schedule

---

---

## 🎯 CONFIRMED MVP SPECIFICATIONS (Jan 2, 2026)

### AI Model
- **Chatbot Model**: `gpt-4o` (GPT-4.0 full version) - for user Q&A and daily briefs
- **Sentiment Analysis Model**: `gpt-4o-mini` - for analyzing news headlines/content (cost-effective)
- **Fallback**: None for MVP
- **User Messaging**: "This AI specializes in ERC-20 tokens but can analyze any cryptocurrency via CoinGecko data"

### Token Coverage
- **Scope**: ANY cryptocurrency available on CoinGecko
- **Specialization**: ERC-20 (on-chain whale data available)
- **Also Supported**: Solana, Bitcoin (CoinGecko data only, no on-chain for now)

### Rate Limiting & Quotas
- **Free Tier**: 2 questions/day
- **Pro Tier ($7.99/month)**: 5 questions/day + 1 daily brief/day
- **Tracking**: By `user_id` from `profiles` table
- **Reset Time**: 00:00 GMT daily
- **Implementation**: Supabase table `user_quotas` with daily reset logic

### Data Ingestion Strategy
- **Whale Transactions**: Already running (existing pipeline, real-time)
- **News Ingestion**: Every 12 hours (for first month, to manage API limits)
  - **Primary Source**: LunarCrush (paid plan - make full use of advanced features)
  - **Secondary Source**: CryptoPanic (free tier, supplementary)
  - LunarCrush endpoints: `/topic/:topic/news/v1`, `/topic/:topic/posts/v1`, `/topic/:topic/creators/v1`
- **Price Snapshots**: Every 15 minutes (CoinGecko)
- **On User Query**: No real-time ingestion per query (scheduled only)

### Sentiment Analysis
- **Provider Sentiment**: LunarCrush (primary, paid plan) + CryptoPanic (supplementary)
- **LLM-Based Sentiment**: OpenAI GPT-4o-mini analysis of news headlines/content
- **Storage**: Both stored separately in `sentiment_scores` table for comparison/weighting
- **Aggregation**: Weighted average (60% LLM, 40% provider for MVP)

### Data Retention
- **Policy**: Indefinite (forever in Supabase)
- **Cleanup**: None for MVP
- **Rationale**: Historical data valuable for trend analysis

### Risk & Compliance
- **Posture**: Education-only with clear disclaimers
- **Messaging**: "Suggestions only, not financial advice"
- **Features**: Paper portfolio suggestions (no real trading integration)
- **Disclaimers**: 
  - Prominent on every AI response
  - Footer: "This is educational content only. Not financial advice. DYOR."
  - Legal page with full terms

### Response Format
- **Style**: Conversational text + Interactive cards
- **Components**: 
  - 📝 Text analysis (GPT-4.0 reasoning)
  - 🐋 Whale flow summary cards
  - 📊 Sentiment scores (visual gauge)
  - 📰 News headlines (latest 5-10 with sentiment tags)
  - 💡 Paper portfolio suggestions (if applicable)
  - ⚠️ Risk disclaimer footer
- **Card Types**:
  - Whale Activity Card (24h net flow, top whales)
  - Sentiment Card (aggregated score + breakdown)
  - News Card (headline, source, timestamp, sentiment)
  - Insight Card (GPT-4.0 reasoning summary)

### Caching Strategy
- **Policy**: NO caching - always generate fresh responses
- **Reasoning**: Real-time market data requires up-to-the-second accuracy
- **Cost Trade-off**: Accepted higher LLM costs for data freshness

### Additional Features (MVP Scope)
- ✅ **Daily Brief**: Email summary for pro users (1/day)
  - Format: Top 5 movers, whale highlights, sentiment snapshot
  - Delivery: Email via Resend API from `noreply@sonartracker.io` (6:00 AM GMT)
  - Storage: Archived in `daily_briefs` table
  - Tech: Resend (API key configured, domain verification pending)
- ✅ **Watchlist**: Users can save favorite tokens (up to 10 for free, 50 for pro)
  - Table: `user_watchlists`
  - Quick access from dashboard
- ✅ **Historical Queries**: Support "What did whales do last week?" style questions
  - GPT-4.0 parses time ranges from natural language
  - Backend fetches aggregated historical data
  - Example: "Show me BTC whale activity in the last 7 days"
- ✅ **Multi-language**: English only for MVP
  - Future: Spanish, Portuguese, French (Phase 2)

---

## ✅ Next Steps (DO NOT IMPLEMENT YET - PLAN ONLY)

1. ✅ Credentials saved
2. ✅ Stripe pricing configured ($7.99/month USD)
3. ✅ MVP specifications finalized
4. ⏳ Create comprehensive action plan (30/60/90-day roadmap)
5. ⏳ Update environment variables with new `STRIPE_PRICE_ID`
6. ⏳ Design Supabase table schemas (news, sentiment, chat, quotas, watchlists, briefs)
7. ⏳ Set up ingestion cron jobs (CryptoPanic + LunarCrush + CoinGecko)
8. ⏳ Build RAG chatbot backend (API routes, GPT-4.0 integration)
9. ⏳ Implement rate limiting (5 questions/day, 1 brief/day)
10. ⏳ Create daily brief generator + email delivery

---

**Last Updated**: January 2, 2026  
**Status**: Credentials complete, Stripe pricing configured, MVP specifications confirmed, ready for action plan

