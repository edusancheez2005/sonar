# ✅ Comprehensive Testing Checklist - CoinGecko Integration

**Test Date**: __________  
**Tester**: __________  
**Environment**: [ ] Local [ ] Production

---

## 🎯 Part 1: Core Functionality Tests

### 1.1 Token Icons Display

| Location | Test | Status | Notes |
|----------|------|--------|-------|
| Dashboard whale table | Logos appear next to symbols | ☐ Pass ☐ Fail | |
| Statistics page | Logos in transaction tables | ☐ Pass ☐ Fail | |
| Token detail page | Logo in header | ☐ Pass ☐ Fail | |
| Trending page | All coins have logos | ☐ Pass ☐ Fail | |
| Orca AI response | Logo appears above data cards | ☐ Pass ☐ Fail | |
| Whale alerts | Logos next to transaction symbols | ☐ Pass ☐ Fail | |

**Fallback Test**: Try a fake symbol like "FAKECOIN123"
- ☐ Shows letter fallback avatar (not broken image)

---

### 1.2 Charts Functionality

| Chart Type | Test | Status | Notes |
|------------|------|--------|-------|
| Line Chart | Loads on BTC page | ☐ Pass ☐ Fail | |
| Line Chart | 24H timeframe works | ☐ Pass ☐ Fail | |
| Line Chart | 7D timeframe works | ☐ Pass ☐ Fail | |
| Line Chart | 30D timeframe works | ☐ Pass ☐ Fail | |
| Line Chart | 1Y timeframe works | ☐ Pass ☐ Fail | |
| Line Chart | MAX timeframe works | ☐ Pass ☐ Fail | |
| Line Chart | Hover tooltip shows price | ☐ Pass ☐ Fail | |
| Candlestick | Loads on ETH page | ☐ Pass ☐ Fail | |
| Candlestick | Shows OHLC in tooltip | ☐ Pass ☐ Fail | |
| Candlestick | Candles color-coded (green/red) | ☐ Pass ☐ Fail | |
| Both Charts | Tab switching works smoothly | ☐ Pass ☐ Fail | |
| Both Charts | Mobile responsive | ☐ Pass ☐ Fail | |

**Regression Test**: Check old token pages (without CoinGecko ID) still work
- ☐ Shows "No chart data available" gracefully (not error)

---

### 1.3 Trending Page

| Feature | Test | Status | Notes |
|---------|------|--------|-------|
| Page Load | Loads without errors | ☐ Pass ☐ Fail | |
| Trending Section | Shows trending coins with logos | ☐ Pass ☐ Fail | |
| Top Gainers | Shows gainers with % change | ☐ Pass ☐ Fail | |
| Top Gainers | Logos display correctly | ☐ Pass ☐ Fail | |
| Top Gainers | Green % shown for gainers | ☐ Pass ☐ Fail | |
| Top Losers | Shows losers with % change | ☐ Pass ☐ Fail | |
| Top Losers | Red % shown for losers | ☐ Pass ☐ Fail | |
| Filters | 1H filter works | ☐ Pass ☐ Fail | |
| Filters | 24H filter works (default) | ☐ Pass ☐ Fail | |
| Filters | 7D filter works | ☐ Pass ☐ Fail | |
| Filters | 30D filter works | ☐ Pass ☐ Fail | |
| Click-through | Clicking coin goes to token page | ☐ Pass ☐ Fail | |

---

### 1.4 Orca AI Enhancements

| Feature | Test | Status | Notes |
|---------|------|--------|-------|
| Token Logo | Shows logo in response header | ☐ Pass ☐ Fail | |
| Chart Insights | Response mentions "7-day trend" | ☐ Pass ☐ Fail | |
| Chart Insights | Response mentions "volatility" | ☐ Pass ☐ Fail | |
| Chart Insights | Response mentions "volume trend" | ☐ Pass ☐ Fail | |
| Price Data | Matches CoinGecko data | ☐ Pass ☐ Fail | |
| Follow-up | Ask "What about Ethereum?" | ☐ Pass ☐ Fail | |
| Follow-up | Shows Ethereum logo | ☐ Pass ☐ Fail | |

**Sample Questions**:
1. "Tell me about Bitcoin"
   - ☐ Logo appears
   - ☐ Chart insights in response
   - ☐ Price is accurate

2. "What's happening with SHIB?"
   - ☐ Logo appears
   - ☐ Social sentiment mentioned
   - ☐ Whale data (ERC-20) shown

---

### 1.5 API Endpoints

Test these directly in browser or Postman:

| Endpoint | URL | Expected | Status |
|----------|-----|----------|--------|
| Token Image | `/api/coingecko/token-image?symbol=BTC` | Returns `{ "id": "bitcoin", "image_url": "..." }` | ☐ Pass ☐ Fail |
| Market Chart | `/api/coingecko/market-chart?symbol=BTC&days=7` | Returns prices array | ☐ Pass ☐ Fail |
| OHLC | `/api/coingecko/ohlc?symbol=BTC&days=7` | Returns OHLC data | ☐ Pass ☐ Fail |
| Trending | `/api/coingecko/trending?duration=24h` | Returns trending, gainers, losers | ☐ Pass ☐ Fail |
| Exchanges (After manual trigger) | Check Supabase | ~300 rows in exchanges table | ☐ Pass ☐ Fail |

---

## 🎨 Part 2: UI/UX Quality Tests

### 2.1 Professional Appearance

| Aspect | Test | Status | Notes |
|--------|------|--------|-------|
| Logos | Sharp and clear (not pixelated) | ☐ Pass ☐ Fail | |
| Logos | Consistent size across UI | ☐ Pass ☐ Fail | |
| Charts | Smooth animations | ☐ Pass ☐ Fail | |
| Charts | Professional color scheme | ☐ Pass ☐ Fail | |
| Charts | Tooltips formatted correctly | ☐ Pass ☐ Fail | |
| Trending Cards | Hover effect works | ☐ Pass ☐ Fail | |
| Trending Cards | Uniform card heights | ☐ Pass ☐ Fail | |
| Overall | No emojis in data labels | ☐ Pass ☐ Fail | |
| Overall | Consistent "Premium" branding | ☐ Pass ☐ Fail | |

---

### 2.2 Mobile Responsiveness

**Test on iPhone/Android or Chrome DevTools mobile view**:

| Page | Test | Status | Notes |
|------|------|--------|-------|
| Trending | Cards stack vertically | ☐ Pass ☐ Fail | |
| Trending | Filters wrap properly | ☐ Pass ☐ Fail | |
| Token Page | Charts fit screen width | ☐ Pass ☐ Fail | |
| Token Page | Chart tabs don't overflow | ☐ Pass ☐ Fail | |
| Dashboard | Logos don't break layout | ☐ Pass ☐ Fail | |
| Orca | Logo+text fits on small screen | ☐ Pass ☐ Fail | |

---

### 2.3 Loading States

| Component | Test | Status | Notes |
|-----------|------|--------|-------|
| Charts | Shows "Loading chart..." | ☐ Pass ☐ Fail | |
| Trending | Shows loading state | ☐ Pass ☐ Fail | |
| Token Icons | Loads without layout shift | ☐ Pass ☐ Fail | |
| Orca | Step-by-step loading animation | ☐ Pass ☐ Fail | |

---

### 2.4 Error Handling

| Scenario | Test | Status | Notes |
|----------|------|--------|-------|
| Invalid symbol | Shows fallback avatar | ☐ Pass ☐ Fail | |
| Chart API fails | Shows error message (not blank) | ☐ Pass ☐ Fail | |
| Network timeout | Graceful error (not crash) | ☐ Pass ☐ Fail | |
| Rate limit hit | Shows helpful message | ☐ Pass ☐ Fail | |

**Manual Test**: Disconnect internet, reload page
- ☐ Shows error message (not infinite loading)

---

## ⚡ Part 3: Performance Tests

### 3.1 Page Load Times

**Use Chrome DevTools → Network tab**:

| Page | Metric | Target | Actual | Status |
|------|--------|--------|--------|--------|
| Trending | First Contentful Paint | < 1.5s | ___s | ☐ Pass ☐ Fail |
| Trending | Fully Loaded | < 3s | ___s | ☐ Pass ☐ Fail |
| Token (BTC) | First Contentful Paint | < 1.5s | ___s | ☐ Pass ☐ Fail |
| Token (BTC) | Chart Render | < 2s | ___s | ☐ Pass ☐ Fail |
| Dashboard | Initial Load | < 2s | ___s | ☐ Pass ☐ Fail |

---

### 3.2 Lighthouse Scores

**Run Chrome Lighthouse audit on Production**:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Performance | > 80 | ___ | ☐ Pass ☐ Fail |
| Accessibility | > 90 | ___ | ☐ Pass ☐ Fail |
| Best Practices | > 90 | ___ | ☐ Pass ☐ Fail |
| SEO | > 90 | ___ | ☐ Pass ☐ Fail |

---

### 3.3 API Response Times

**Check Vercel logs or use DevTools**:

| Endpoint | Target | Actual | Status |
|----------|--------|--------|--------|
| `/api/coingecko/token-image` | < 300ms | ___ms | ☐ Pass ☐ Fail |
| `/api/coingecko/market-chart` | < 500ms | ___ms | ☐ Pass ☐ Fail |
| `/api/coingecko/trending` | < 800ms | ___ms | ☐ Pass ☐ Fail |

---

## 🔒 Part 4: Security & Access Control Tests

### 4.1 Free vs Premium Features

**Test as FREE user (incognito mode)**:

| Feature | Expected Behavior | Status | Notes |
|---------|-------------------|--------|-------|
| Trending Page | Full access | ☐ Pass ☐ Fail | |
| Token Charts | Full access | ☐ Pass ☐ Fail | |
| Orca (1st prompt) | Works | ☐ Pass ☐ Fail | |
| Orca (2nd prompt) | Shows upgrade modal | ☐ Pass ☐ Fail | |
| Dashboard - Premium sections | Blurred/locked | ☐ Pass ☐ Fail | |
| CSV Export | Shows "Premium only" | ☐ Pass ☐ Fail | |

**Test as PREMIUM user (eduardo@sonartracker.io)**:

| Feature | Expected Behavior | Status | Notes |
|---------|-------------------|--------|-------|
| Orca (5 prompts) | All 5 work | ☐ Pass ☐ Fail | |
| Orca (6th prompt) | Shows daily limit reached | ☐ Pass ☐ Fail | |
| Dashboard | All sections visible | ☐ Pass ☐ Fail | |
| CSV Export | Works | ☐ Pass ☐ Fail | |

---

### 4.2 API Keys Security

| Check | Test | Status | Notes |
|-------|------|--------|-------|
| Client Code | API keys NOT in client bundle | ☐ Pass ☐ Fail | Check View Source |
| Network Tab | No API keys in URLs | ☐ Pass ☐ Fail | |
| .env File | Not committed to git | ☐ Pass ☐ Fail | Check `.gitignore` |

---

## 🗄️ Part 5: Database & Cron Tests

### 5.1 Exchanges Table

**Run in Supabase SQL Editor**:

```sql
-- Should return ~300 rows
SELECT COUNT(*) as total_exchanges FROM exchanges;

-- Should show top exchanges
SELECT name, centralized, trust_score_rank 
FROM exchanges 
WHERE trust_score_rank IS NOT NULL
ORDER BY trust_score_rank 
LIMIT 10;
```

| Test | Expected | Status | Notes |
|------|----------|--------|-------|
| Total rows | ~300 exchanges | ☐ Pass ☐ Fail | |
| Top exchange | Binance (rank 1-3) | ☐ Pass ☐ Fail | |
| CEX count | ~250 | ☐ Pass ☐ Fail | |
| DEX count | ~50 | ☐ Pass ☐ Fail | |
| RLS policies | Public read, service write | ☐ Pass ☐ Fail | |

---

### 5.2 Cron Jobs

**Check Vercel Dashboard → Settings → Cron Jobs**:

| Job | Schedule | Status | Last Run | Notes |
|-----|----------|--------|----------|-------|
| Exchanges Sync | `0 */6 * * *` (every 6h) | ☐ Active ☐ Inactive | _______ | |

**Check Vercel Logs**:
- ☐ Cron job executed successfully in last 6 hours
- ☐ No errors in logs
- ☐ Shows "synced: XXX" in output

---

## 📊 Part 6: Data Accuracy Tests

### 6.1 Price Data Consistency

**Pick 3 tokens (BTC, ETH, SHIB) and verify across pages**:

| Token | Source | Price | 24h Change | Match? |
|-------|--------|-------|-----------|--------|
| BTC | CoinGecko.com | $_____ | ___% | |
| BTC | Sonar Token Page | $_____ | ___% | ☐ Pass ☐ Fail |
| BTC | Sonar Orca | $_____ | ___% | ☐ Pass ☐ Fail |
| BTC | Trending Page | $_____ | ___% | ☐ Pass ☐ Fail |

**Tolerance**: ±1% (due to caching)

---

### 6.2 Chart Data Accuracy

**Compare chart on Sonar vs CoinGecko.com**:

| Token | Chart Type | Match? | Status | Notes |
|-------|------------|--------|--------|-------|
| BTC | 7D Line | Shape matches | ☐ Pass ☐ Fail | |
| ETH | 30D Line | Shape matches | ☐ Pass ☐ Fail | |
| BTC | 7D Candlestick | OHLC values match | ☐ Pass ☐ Fail | |

---

### 6.3 Whale Data Consistency

**Check whale metrics on token page vs Orca**:

| Token | Source | Net Flow | Buy Count | Match? |
|-------|--------|----------|-----------|--------|
| AXS | Token Page | $_____ | ___ | |
| AXS | Orca Response | $_____ | ___ | ☐ Pass ☐ Fail |

**Should be exactly the same** (both use same data source)

---

## 🚨 Part 7: Critical Issues Checklist

**Any of these = MUST FIX before launch**:

- [ ] Build errors
- [ ] TypeScript errors
- [ ] Linter errors
- [ ] Broken navigation
- [ ] Charts don't load at all
- [ ] API keys exposed in client
- [ ] Crashes on mobile
- [ ] Login/signup broken
- [ ] Payments broken
- [ ] Whale data completely missing

---

## 📈 Part 8: API Usage Monitoring

### 8.1 CoinGecko Usage

**Check CoinGecko Dashboard**:
- Daily calls used: ______ / 5,000
- Status: ☐ Normal ☐ Warning ☐ Over Limit

**If over 4,000 calls/day**:
- ☐ Increase cache TTL
- ☐ Upgrade to higher tier plan

---

### 8.2 LunarCrush Usage

**Check LunarCrush Dashboard**:
- Daily calls used: ______ / 2,000
- Status: ☐ Normal ☐ Warning ☐ Over Limit

---

## ✅ Final Sign-Off

### Tested By:
- **Name**: __________________
- **Date**: __________________
- **Environment**: Production / Staging / Local

### Overall Assessment:

| Category | Score | Notes |
|----------|-------|-------|
| Functionality | ☐ Pass ☐ Fail | |
| UI/UX Quality | ☐ Pass ☐ Fail | |
| Performance | ☐ Pass ☐ Fail | |
| Mobile | ☐ Pass ☐ Fail | |
| Security | ☐ Pass ☐ Fail | |
| Data Accuracy | ☐ Pass ☐ Fail | |

### Ready for Production?
- [ ] YES - All tests passed, ready to launch
- [ ] NO - Critical issues found (list below)

### Critical Issues (if any):
1. _______________________________
2. _______________________________
3. _______________________________

### Nice-to-Have Improvements:
1. _______________________________
2. _______________________________
3. _______________________________

---

## 📋 Post-Launch Monitoring (First 48 Hours)

- [ ] Check error rate in Vercel logs (target: < 1%)
- [ ] Monitor API usage (CoinGecko, LunarCrush)
- [ ] Review user feedback/bug reports
- [ ] Check page load times (target: < 3s)
- [ ] Verify cron jobs running (every 6 hours)
- [ ] Monitor conversion rate (free → premium)

---

**Save this checklist and run it before EVERY deployment!** 🚀
