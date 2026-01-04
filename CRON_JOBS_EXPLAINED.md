# ⏰ CRON JOBS - How They Work

## 🚨 **IMPORTANT: Cron Jobs Don't Run Locally!**

**Vercel Cron Jobs ONLY run when deployed to Vercel.**

They will **NOT** run on `localhost` - you must deploy to production.

---

## 📋 **YOUR CRON JOBS**

### **1. News Ingestion** (`/api/cron/ingest-news`)
- **Schedule**: Every 12 hours
- **What**: Fetches news from LunarCrush + CryptoPanic
- **Tickers**: BTC, ETH, SOL, BNB, XRP, ADA, DOGE, MATIC, DOT, SHIB

### **2. Sentiment Analysis** (`/api/cron/analyze-sentiment`)
- **Schedule**: Every 12 hours (offset 6h from news)
- **What**: GPT-4o-mini analyzes news sentiment (-1 to +1)

### **3. Sentiment Aggregation** (`/api/cron/aggregate-sentiment`)
- **Schedule**: Every hour
- **What**: Combines LLM + provider sentiment (60/40 weight)

### **4. Price Snapshots** (`/api/cron/fetch-prices`)
- **Schedule**: Every 15 minutes
- **What**: Fetches current prices from CoinGecko

---

## 🏠 **FOR LOCAL DEVELOPMENT**

### **Option 1: Manual News Script** (Recommended)

Run this to populate news locally:

```bash
cd /Users/edusanchez/Desktop/sonar
node scripts/manual-news-ingest.js
```

This will:
- Fetch news for 10 top tickers
- Insert 100-150 articles
- Show summary per ticker

---

### **Option 2: Deploy to Vercel** (Automatic)

Once deployed, cron jobs run automatically:

```bash
git add .
git commit -m "feat: ORCA AI Phase 2 complete"
git push origin main
```

Vercel will:
- Auto-deploy on push
- Start running cron jobs on schedule
- No manual intervention needed

---

## 🔧 **VERCEL CONFIGURATION**

Your `vercel.json` is already configured:

```json
{
  "crons": [
    {
      "path": "/api/cron/ingest-news",
      "schedule": "0 */12 * * *"  // Every 12 hours
    },
    {
      "path": "/api/cron/analyze-sentiment",
      "schedule": "0 6,18 * * *"  // 6am & 6pm UTC
    },
    {
      "path": "/api/cron/aggregate-sentiment",
      "schedule": "0 * * * *"  // Every hour
    },
    {
      "path": "/api/cron/fetch-prices",
      "schedule": "*/15 * * * *"  // Every 15 minutes
    }
  ]
}
```

---

## ✅ **VERIFICATION**

### **After Deploying to Vercel**:

1. **Check Vercel Dashboard**:
   - Go to your project → "Deployments"
   - Click on latest deployment
   - Scroll to "Cron Jobs" section
   - Should show all 4 cron jobs

2. **Check Logs**:
   - Go to "Logs" tab in Vercel
   - Filter by "cron"
   - Should see cron execution logs

3. **Check Database**:
   - Go to Supabase dashboard
   - Check `news_items` table
   - Should see new articles every 12h

---

## 🐛 **TROUBLESHOOTING**

### **Cron Jobs Not Running**:

1. **Verify Environment Variables in Vercel**:
   - `CRON_SECRET`
   - `LUNARCRUSH_API_KEY`
   - `CRYPTOPANIC_API_TOKEN`
   - `COINGECKO_API_KEY`
   - `OPENAI_API_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **Manually Trigger Cron** (for testing):
```bash
curl -X GET "https://sonartracker.io/api/cron/ingest-news" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

3. **Check Vercel Logs**:
   - Look for errors in cron execution
   - Common issues: API rate limits, timeout errors

---

## 🎯 **RECOMMENDED WORKFLOW**

### **During Development** (Local):
```bash
# Populate news manually when needed
node scripts/manual-news-ingest.js

# Test ORCA chat
# Visit http://localhost:3000/ai-advisor
# Articles will show from manual fetch
```

### **In Production** (Vercel):
```bash
# Deploy
git push origin main

# Cron jobs run automatically:
# - News every 12h
# - Sentiment analysis every 12h
# - Aggregation every hour
# - Prices every 15 min
```

---

## 📊 **EXPECTED BEHAVIOR**

### **First 24 Hours After Deploy**:
- **Hour 0**: First news fetch (0 articles initially)
- **Hour 12**: Second news fetch (~100 articles)
- **Hour 6/18**: Sentiment analysis runs
- **Every hour**: Sentiment aggregation
- **Every 15min**: Price updates

### **After 24 Hours**:
- **News**: 200-300 articles across 10 tickers
- **Sentiment**: Most articles analyzed
- **Prices**: 96 snapshots per ticker (24h × 4/hour)

---

## 🔥 **RIGHT NOW: FIX & TEST**

### **Step 1: Run Manual Script**
```bash
cd /Users/edusanchez/Desktop/sonar
node scripts/manual-news-ingest.js
```

### **Step 2: Restart Server**
```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
rm -rf .next
npm run next:dev
```

### **Step 3: Test**
- Visit: http://localhost:3000/ai-advisor
- Ask: "Should I invest in SOL?"
- **Expected**: News articles should appear!

---

## 📈 **MONITORING**

Once deployed, monitor:

1. **Vercel Cron Logs**: Check execution success/failure
2. **Supabase Table Sizes**: 
   - `news_items` should grow
   - `sentiment_scores` should grow
   - `price_snapshots` should grow
3. **API Costs**:
   - OpenAI usage
   - LunarCrush rate limits
   - CryptoPanic monthly quota

---

## 💡 **PRO TIP**

For local development, create a script to run ALL jobs at once:

```bash
# scripts/run-all-crons.sh
node scripts/manual-news-ingest.js
# Add more cron simulations as needed
```

---

**Summary**:
- ❌ **Cron jobs DON'T run on localhost**
- ✅ **Use manual script for local dev**
- ✅ **Deploy to Vercel for automatic crons**
- ✅ **I just fixed the manual script - run it now!**

---

**Run this now**:
```bash
cd /Users/edusanchez/Desktop/sonar
node scripts/manual-news-ingest.js
```

Then test at: **http://localhost:3000/ai-advisor** 🐋

