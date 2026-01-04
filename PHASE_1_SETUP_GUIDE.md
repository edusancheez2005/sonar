# 🏗️ PHASE 1 SETUP & TESTING GUIDE

**Created**: Jan 3, 2026  
**Status**: Ready for deployment

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Create Environment Variables File

Create `.env.local` in your project root with the following:

```bash
# =================================
# ORCA AI 2.0 - Phase 1 Environment Variables
# =================================

# Supabase (Database & Auth)
NEXT_PUBLIC_SUPABASE_URL=https://fwbwfvqzomipoftgodof.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_jwt_token_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_jwt_token_here

# OpenAI (AI Models)
OPENAI_API_KEY=your_openai_api_key_here

# Stripe (Payment Processing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51SHsuJK8B21zF4WAKQOqIKEfG6ObJuClARwxPvcmzHcDUUVgM6F5IB46gdNH0gErHV9QfBzQrM2V8kfTA3cGpd7w00XqjmjRvS
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_PRICE_ID=price_1Sl6v8K8B21zF4WABaN32ivN
STRIPE_PRODUCT_ID=prod_TEMooYyi24aFsY
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# CryptoPanic (News Provider)
CRYPTOPANIC_API_TOKEN=your_cryptopanic_api_token_here

# LunarCrush (Social Sentiment & News - PAID PLAN)
LUNARCRUSH_API_KEY=your_lunarcrush_api_key_here

# CoinGecko (Price & Market Data - PAID BASIC PLAN)
COINGECKO_API_KEY=your_coingecko_api_key_here

# Resend (Email Delivery)
RESEND_API_KEY=your_resend_api_key_here

# Vercel Cron Authentication
CRON_SECRET=dffe68424286373c3fd6fd52222701058c21e6b12921506c164d515776e2768b
```

### 2. Run Supabase Migration

Execute the SQL migration to create all 7 tables:

```bash
# Option A: Via Supabase Dashboard
# 1. Go to https://supabase.com/dashboard/project/fwbwfvqzomipoftgodof/sql
# 2. Copy contents of supabase/migrations/20260103_phase1_orca_tables.sql
# 3. Paste into SQL Editor and click "Run"

# Option B: Via Supabase CLI (if installed)
supabase db push
```

**Verify tables were created:**
- Go to Supabase Dashboard → Table Editor
- You should see 7 new tables: `news_items`, `sentiment_scores`, `price_snapshots`, `user_quotas`, `chat_history`, `daily_briefs`, `user_watchlists`

### 3. Install Dependencies

Make sure you have the OpenAI SDK installed:

```bash
npm install openai
```

### 4. Deploy to Vercel

```bash
# Commit changes
git add .
git commit -m "Phase 1: Add database tables and cron jobs"
git push

# Deploy (if not auto-deploying)
vercel --prod
```

### 5. Add Environment Variables to Vercel

Go to your Vercel project settings:
1. Navigate to: https://vercel.com/your-username/sonar/settings/environment-variables
2. Add ALL environment variables from `.env.local` above
3. **IMPORTANT**: Make sure to add `CRON_SECRET`
4. Redeploy after adding variables

---

## 🧪 TESTING PHASE 1

### Test 1: News Ingestion

**Manual Test (Local)**:
```bash
# Start dev server
npm run dev

# In another terminal, test the endpoint
curl -X GET "http://localhost:3000/api/cron/ingest-news" \
  -H "Authorization: Bearer dffe68424286373c3fd6fd52222701058c21e6b12921506c164d515776e2768b"
```

**Expected Result**:
```json
{
  "success": true,
  "totalInserted": 50,
  "totalFetched": 100,
  "tickers": 50
}
```

**Verify in Supabase**:
```sql
SELECT COUNT(*) FROM news_items;
SELECT ticker, COUNT(*) as count FROM news_items GROUP BY ticker ORDER BY count DESC LIMIT 10;
```

---

### Test 2: Sentiment Analysis

**Manual Test**:
```bash
curl -X GET "http://localhost:3000/api/cron/analyze-sentiment" \
  -H "Authorization: Bearer dffe68424286373c3fd6fd52222701058c21e6b12921506c164d515776e2768b"
```

**Expected Result**:
```json
{
  "success": true,
  "analyzed": 100,
  "updated": 95
}
```

**Verify in Supabase**:
```sql
SELECT COUNT(*) FROM news_items WHERE sentiment_llm IS NOT NULL;
SELECT ticker, AVG(sentiment_llm) as avg_sentiment 
FROM news_items 
WHERE sentiment_llm IS NOT NULL 
GROUP BY ticker 
ORDER BY avg_sentiment DESC 
LIMIT 10;
```

---

### Test 3: Sentiment Aggregation

**Manual Test**:
```bash
curl -X GET "http://localhost:3000/api/cron/aggregate-sentiment" \
  -H "Authorization: Bearer dffe68424286373c3fd6fd52222701058c21e6b12921506c164d515776e2768b"
```

**Expected Result**:
```json
{
  "success": true,
  "aggregated": 25,
  "tickers": 25
}
```

**Verify in Supabase**:
```sql
SELECT * FROM sentiment_scores ORDER BY timestamp DESC LIMIT 10;
SELECT ticker, aggregated_score, news_count_24h, confidence 
FROM sentiment_scores 
ORDER BY timestamp DESC 
LIMIT 20;
```

---

### Test 4: Price Snapshots

**Manual Test**:
```bash
curl -X GET "http://localhost:3000/api/cron/fetch-prices" \
  -H "Authorization: Bearer dffe68424286373c3fd6fd52222701058c21e6b12921506c164d515776e2768b"
```

**Expected Result**:
```json
{
  "success": true,
  "inserted": 50,
  "tokens": 50
}
```

**Verify in Supabase**:
```sql
SELECT COUNT(*) FROM price_snapshots;
SELECT ticker, price_usd, price_change_24h, timestamp 
FROM price_snapshots 
ORDER BY timestamp DESC 
LIMIT 20;
```

---

## ✅ ACCEPTANCE CRITERIA VERIFICATION

Run this checklist to confirm Phase 1 is complete:

- [ ] **SQL Migration**: All 7 tables exist in Supabase
  - `news_items`
  - `sentiment_scores`
  - `price_snapshots`
  - `user_quotas`
  - `chat_history`
  - `daily_briefs`
  - `user_watchlists`

- [ ] **RLS Policies**: All tables have Row Level Security enabled
  ```sql
  SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
  ```

- [ ] **Cron Jobs**: All 4 API routes respond successfully
  - `/api/cron/ingest-news` → Returns success
  - `/api/cron/analyze-sentiment` → Returns success
  - `/api/cron/aggregate-sentiment` → Returns success
  - `/api/cron/fetch-prices` → Returns success

- [ ] **Data Flow**: Data is being ingested and processed
  - News articles in `news_items` table
  - Sentiment scores populated by GPT-4o-mini
  - Aggregated sentiment in `sentiment_scores`
  - Price data in `price_snapshots`

- [ ] **Authentication**: Cron endpoints reject unauthorized requests
  ```bash
  # This should return 401 Unauthorized
  curl -X GET "http://localhost:3000/api/cron/ingest-news"
  ```

- [ ] **Vercel Deployment**: Cron jobs are scheduled
  - Check Vercel dashboard → Cron Jobs tab
  - Confirm 4 cron jobs are listed with correct schedules

- [ ] **Error Handling**: No unhandled errors in logs
  - Check Vercel logs for any errors
  - Check Supabase logs for any failed queries

---

## 📊 EXPECTED DATA AFTER 24 HOURS

After Phase 1 runs for 24 hours, you should see:

### News Items
- **~500-1000 articles** (2 ingestions × 50 tickers × ~10 articles each)
- All articles have `sentiment_llm` scores

### Sentiment Scores
- **~24 records per ticker** (hourly aggregation)
- Aggregated scores showing trends over time

### Price Snapshots
- **~96 records per ticker** (every 15 minutes = 96 per day)
- Real-time price tracking

### Example Query (Market Overview)
```sql
-- Get latest sentiment and price for top tokens
SELECT 
  s.ticker,
  s.aggregated_score,
  s.news_count_24h,
  s.confidence,
  p.price_usd,
  p.price_change_24h
FROM sentiment_scores s
JOIN price_snapshots p ON s.ticker = p.ticker
WHERE s.timestamp > NOW() - INTERVAL '1 hour'
  AND p.timestamp > NOW() - INTERVAL '15 minutes'
ORDER BY s.news_count_24h DESC
LIMIT 10;
```

---

## 🚨 TROUBLESHOOTING

### Issue: Cron jobs not running on Vercel
**Solution**: 
1. Verify `vercel.json` is committed to git
2. Check Vercel dashboard → Cron Jobs tab
3. Ensure `CRON_SECRET` is added to Vercel environment variables
4. Redeploy project

### Issue: News ingestion returns 401 from APIs
**Solution**:
1. Verify API keys in environment variables
2. Check API rate limits (LunarCrush, CryptoPanic, CoinGecko)
3. Review API logs in respective dashboards

### Issue: Sentiment analysis not populating
**Solution**:
1. Check OpenAI API key is valid
2. Verify OpenAI account has credits
3. Check Vercel logs for OpenAI API errors
4. Ensure news items exist before running sentiment analysis

### Issue: Duplicate key violations
**Solution**: This is expected behavior. The `UNIQUE` constraints prevent duplicate entries. The cron jobs handle this gracefully.

---

## 🎯 NEXT STEPS (PHASE 2)

Once Phase 1 is verified and running:
1. ✅ All 7 tables created and populated
2. ✅ All 4 cron jobs running on schedule
3. ✅ Data flowing correctly into database

You're ready to proceed to **Phase 2: Chatbot Core** which includes:
- Building `/api/chat` endpoint
- GPT-4.0 integration with ORCA system prompt
- Frontend chat UI
- Interactive response cards
- Rate limiting enforcement

---

**Last Updated**: Jan 3, 2026  
**Status**: Phase 1 implementation complete, ready for testing

