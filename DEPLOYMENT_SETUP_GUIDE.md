# 🚀 Complete Deployment & Setup Guide

## Part 1: Supabase SQL Setup

### Copy and paste this into Supabase SQL Editor:

```sql
-- ============================================
-- EXCHANGES TABLE FOR COINGECKO INTEGRATION
-- ============================================
-- This table stores exchange metadata for CEX/DEX classification
-- Run this entire script in your Supabase SQL Editor

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow public read access to exchanges" ON exchanges;
DROP POLICY IF EXISTS "Only service role can write exchanges" ON exchanges;

-- Create exchanges table
CREATE TABLE IF NOT EXISTS exchanges (
  id TEXT PRIMARY KEY, -- CoinGecko exchange id
  name TEXT NOT NULL,
  image TEXT,
  url TEXT,
  country TEXT,
  year_established INTEGER,
  centralized BOOLEAN DEFAULT true,
  trust_score_rank INTEGER,
  trade_volume_24h_btc NUMERIC,
  trade_volume_24h_btc_normalized NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  raw_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_exchanges_name ON exchanges(name);
CREATE INDEX IF NOT EXISTS idx_exchanges_centralized ON exchanges(centralized);
CREATE INDEX IF NOT EXISTS idx_exchanges_trust_score ON exchanges(trust_score_rank);
CREATE INDEX IF NOT EXISTS idx_exchanges_updated_at ON exchanges(updated_at);

-- Enable Row Level Security
ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access
CREATE POLICY "Allow public read access to exchanges"
  ON exchanges
  FOR SELECT
  USING (true);

-- Policy: Only service role can insert/update
CREATE POLICY "Only service role can write exchanges"
  ON exchanges
  FOR ALL
  USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON exchanges TO anon, authenticated;
GRANT ALL ON exchanges TO service_role;

-- Add comment
COMMENT ON TABLE exchanges IS 'CoinGecko exchange metadata for CEX/DEX classification and analytics';

-- Verify table was created
SELECT 
  'Exchanges table created successfully!' as status,
  COUNT(*) as current_rows
FROM exchanges;
```

### After running the SQL:
✅ You should see: "Exchanges table created successfully! Current rows: 0"  
✅ If you see an error, copy it and we'll fix it together

---

## Part 2: Vercel Cron Job Setup

### Option A: Automatic (Already Done ✅)

Your `vercel.json` already has the cron job configured:

```json
{
  "crons": [
    {
      "path": "/api/coingecko/exchanges-sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**This runs automatically every 6 hours after you deploy to Vercel!**

### Option B: Verify It's Working

1. **Go to Vercel Dashboard**:
   - Visit https://vercel.com/dashboard
   - Select your Sonar project
   - Go to **Settings** → **Cron Jobs**

2. **You should see**:
   ```
   Path: /api/coingecko/exchanges-sync
   Schedule: 0 */6 * * *
   Status: Active
   ```

3. **If not listed**, redeploy:
   ```bash
   git commit --allow-empty -m "Trigger Vercel redeploy"
   git push origin main
   ```

### Option C: Manually Trigger First Sync (Recommended)

After deploying, manually trigger the first sync to populate data immediately:

```bash
# Replace with your actual domain
curl https://sonartracker.io/api/coingecko/exchanges-sync

# Or use Vercel's domain
curl https://your-project.vercel.app/api/coingecko/exchanges-sync
```

**Expected Response**:
```json
{
  "success": true,
  "total": 300,
  "synced": 295,
  "failed": 5,
  "timestamp": "2026-01-31T..."
}
```

**Check Supabase**:
```sql
SELECT COUNT(*), 
       SUM(CASE WHEN centralized = true THEN 1 ELSE 0 END) as cex_count,
       SUM(CASE WHEN centralized = false THEN 1 ELSE 0 END) as dex_count
FROM exchanges;
```

You should see ~300 exchanges, with ~250 CEX and ~50 DEX.

---

## Part 3: Environment Variables Checklist

### Vercel Environment Variables

Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Add these if not already set:

```bash
# CoinGecko Pro API (NEW - REQUIRED)
COINGECKO_API_KEY=your_coingecko_api_key_here

# LunarCrush API (Already set ✅)
LUNARCRUSH_API_KEY=unxdj7pa1xdr5248gjygdp7rskmjwsn9xonvw1su

# Supabase (Already set ✅)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI (Already set ✅)
OPENAI_API_KEY=your_openai_key

# Stripe (Already set ✅)
STRIPE_SECRET_KEY=your_stripe_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Whale Alert (Already set ✅)
WHALE_ALERT_API_KEY=ioqSOvTlUjNwbpoK2MFXUxg7LuS1nJaL
```

**Important**: Make sure each variable is available in:
- ✅ Production
- ✅ Preview
- ✅ Development

---

## Part 4: Local Testing Before Deploy

### 1. Install Dependencies

```bash
npm install
```

**New dependencies added**:
- `chartjs-adapter-date-fns@^3.0.0`
- `chartjs-chart-financial@^0.2.0`
- `date-fns@^4.1.0`

### 2. Set Local Environment Variables

Create/update `.env.local`:

```bash
COINGECKO_API_KEY=your_coingecko_api_key_here
LUNARCRUSH_API_KEY=unxdj7pa1xdr5248gjygdp7rskmjwsn9xonvw1su
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# ... other vars
```

### 3. Run Development Server

```bash
npm run next:dev
```

### 4. Test These URLs

✅ **Trending Page**: http://localhost:3000/trending  
   - Should show trending coins with logos
   - Test timeframe filters (1h, 24h, 7d, 30d)

✅ **Token Page Charts**: http://localhost:3000/token/BTC  
   - Charts should load
   - Toggle between line/candlestick
   - Check all timeframes

✅ **Orca with Logo**: http://localhost:3000/ai-advisor  
   - Ask "Tell me about Bitcoin"
   - Token logo should appear
   - Check chart insights in response

✅ **Token Icon API**: http://localhost:3000/api/coingecko/token-image?symbol=BTC  
   - Should return JSON with `image_url`

✅ **Trending API**: http://localhost:3000/api/coingecko/trending?duration=24h  
   - Should return trending coins data

### 5. Check Console

Look for these success messages:
```
✅ Registry initialized with X symbols and Y coins
✅ LunarCrush coin data: Galaxy Score 49, Alt Rank 279
✅ CoinGecko API request successful
```

**If errors**:
- Check API keys are set correctly
- Verify internet connection
- Check rate limits on CoinGecko/LunarCrush dashboards

---

## Part 5: Deploy to Production

### 1. Commit All Changes

```bash
git add -A
git commit -m "feat: CoinGecko Pro integration - logos, charts, trending, Orca enhancements"
git push origin main
```

### 2. Vercel Auto-Deploys

Vercel will:
1. Build your project
2. Run type checks
3. Deploy to production
4. Activate cron jobs

**Monitor deployment**:
- Go to https://vercel.com/dashboard
- Click on your project
- Watch the "Deployments" tab

### 3. Verify Production Deployment

After deployment completes:

✅ **Visit Your Domain**: https://sonartracker.io/trending  
✅ **Test Orca**: Ask about a token, see logo + chart data  
✅ **Check Token Pages**: Visit `/token/BTC`, `/token/ETH`  
✅ **Mobile Test**: Open on phone, check responsiveness  

### 4. Trigger First Exchanges Sync

```bash
curl https://sonartracker.io/api/coingecko/exchanges-sync
```

**Wait 2-3 minutes** (it processes ~300 exchanges)

**Verify in Supabase**:
```sql
SELECT name, centralized, trust_score_rank 
FROM exchanges 
ORDER BY trust_score_rank 
LIMIT 10;
```

You should see top exchanges like Binance, Coinbase, Kraken.

---

## Part 6: Monitoring & Verification

### A. Check Cron Jobs Are Running

**Vercel Dashboard** → **Your Project** → **Logs**

Filter by: `/api/coingecko/exchanges-sync`

You should see logs every 6 hours:
```
✅ Sync complete: 295 synced, 5 failed
```

### B. Monitor API Usage

**CoinGecko**:
- Go to https://www.coingecko.com/en/api/pricing
- Check your usage dashboard
- Should be ~500-1000 calls/day

**LunarCrush**:
- Check your LunarCrush dashboard
- Should be ~200-500 calls/day

### C. User Acceptance Testing

**As a free user** (incognito mode):
- ✅ Can view trending page
- ✅ Can see charts on token pages
- ✅ Logos appear on all tokens
- ✅ Orca shows 1 free prompt

**As a premium user** (eduardo@sonartracker.io):
- ✅ Full Orca access (5 prompts/day)
- ✅ All dashboard data visible
- ✅ Export CSV works
- ✅ Charts show full data

---

## Part 7: Troubleshooting

### Issue: Charts Not Loading

**Symptom**: Blank area where chart should be  
**Fix**:
1. Check browser console for errors
2. Verify Chart.js dependencies installed: `npm list chart.js`
3. Clear browser cache: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
4. Check API endpoint manually: `/api/coingecko/market-chart?symbol=BTC&days=7`

### Issue: Logos Not Showing

**Symptom**: Letter fallbacks always shown  
**Fix**:
1. Check `/api/coingecko/token-image?symbol=BTC` returns 200
2. Verify `COINGECKO_API_KEY` is set in Vercel
3. Check Network tab in DevTools for 401/403 errors
4. Wait 60 seconds for coin registry to initialize

### Issue: Exchanges Table Empty

**Symptom**: `SELECT COUNT(*) FROM exchanges` returns 0  
**Fix**:
1. Manually trigger: `curl https://your-domain.com/api/coingecko/exchanges-sync`
2. Check Vercel logs for errors
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
4. Check RLS policies: `\d+ exchanges` in Supabase SQL editor

### Issue: Trending Page Error

**Symptom**: "Failed to load trending data"  
**Fix**:
1. Test API directly: `curl https://your-domain.com/api/coingecko/trending?duration=24h`
2. Check CoinGecko API key is valid
3. Verify you're not rate-limited (check CoinGecko dashboard)
4. Check browser console for CORS errors

---

## Part 8: Success Metrics

### Technical Metrics

- ✅ Page load time < 3 seconds
- ✅ Chart render time < 2 seconds
- ✅ API response time < 500ms
- ✅ Zero TypeScript errors in build
- ✅ Zero linter errors
- ✅ Mobile responsive (test on iPhone/Android)

### User Experience Metrics

- ✅ Logos visible on all token mentions
- ✅ Charts interactive and smooth
- ✅ Trending page loads fast
- ✅ Orca responses include chart insights
- ✅ All "Premium" branding (no "Pro")

### API Usage Metrics

- ✅ CoinGecko: < 5,000 calls/day
- ✅ LunarCrush: < 2,000 calls/day
- ✅ No 429 (rate limit) errors in logs
- ✅ Cache hit rate > 70%

---

## Part 9: Post-Deployment Checklist

**Immediately After Deploy**:
- [ ] Visit https://sonartracker.io/trending
- [ ] Check 3 different token pages
- [ ] Ask Orca about Bitcoin
- [ ] Manually trigger exchanges sync
- [ ] Verify Supabase has exchange data

**Within 24 Hours**:
- [ ] Check Vercel logs for cron job execution
- [ ] Monitor API usage dashboards
- [ ] Test on mobile devices
- [ ] Get feedback from 2-3 users
- [ ] Check Google Analytics (if integrated)

**Within 1 Week**:
- [ ] Review error logs in Vercel
- [ ] Optimize slow queries (if any)
- [ ] Adjust cache TTL values based on usage
- [ ] Consider A/B testing chart types

---

## 🎉 YOU'RE DONE!

Your CoinGecko Pro integration is now live with:
- 🖼️ Token logos everywhere
- 📊 Interactive charts on all token pages
- 🔥 Trending coins page
- 🤖 Orca AI with chart-based insights
- 📈 Exchanges database for classification
- ⚡ Fast, cached API responses

**Next Steps**: See `ADDITIONAL_COINGECKO_FEATURES.md` for enhancement ideas!

---

**Questions?** Check the logs first, then refer to troubleshooting section above.

**Need Help?** Review `COINGECKO_INTEGRATION_GUIDE.md` for detailed API documentation.
