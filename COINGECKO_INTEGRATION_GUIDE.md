# CoinGecko Pro Integration Guide

## Overview
This guide covers the comprehensive CoinGecko Pro integration for Sonar, including coin logos, charts, trending data, and exchanges database.

## Prerequisites
- **CoinGecko Pro API Key** ($35/month plan)
- **Supabase Project** with admin access
- **Vercel Deployment** (or similar)

---

## 1. Environment Variables

Add these to your `.env.local` (development) and Vercel Environment Variables (production):

```bash
# CoinGecko Pro API
COINGECKO_API_KEY=your_coingecko_api_key_here

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Other existing variables...
```

---

## 2. Database Setup

### A) Create Exchanges Table

Run this SQL in your Supabase SQL Editor:

```sql
-- File: supabase_exchanges_table.sql
-- See the file in the project root for the complete schema
```

Or simply execute:
```bash
# In Supabase Dashboard → SQL Editor → New Query → Paste contents of supabase_exchanges_table.sql
```

---

## 3. Install Dependencies

Run the following to install required packages for charts:

```bash
npm install chartjs-adapter-date-fns@^3.0.0 chartjs-chart-financial@^0.2.0 date-fns@^4.1.0
```

These are already added to `package.json`, so a simple `npm install` will work.

---

## 4. Vercel Cron Jobs

The `vercel.json` has been updated to include:

```json
{
  "path": "/api/coingecko/exchanges-sync",
  "schedule": "0 */6 * * *"
}
```

This syncs exchanges data every 6 hours. No additional configuration needed if deploying to Vercel.

---

## 5. Features Implemented

### ✅ Core Infrastructure
- **CoinGecko Pro API Client** (`lib/coingecko/client.ts`)
  - Centralized fetch wrapper
  - In-memory caching with configurable TTL
  - Automatic retries with exponential backoff
  - Rate limit safety

- **Coin Registry** (`lib/coingecko/coin-registry.ts`)
  - Symbol → CoinGecko ID mapping
  - Collision resolution (prefers highest market cap)
  - Contract address lookup support
  - Auto-refresh every hour

### ✅ UI Components
- **TokenIcon Component** (`components/TokenIcon.tsx`)
  - Displays coin logos everywhere
  - Fallback letter avatar
  - Lazy loads images via API
  - Next.js Image optimization

- **Line Chart** (`components/charts/LineChart.tsx`)
  - Interactive price charts
  - Multiple timeframes (24h, 7d, 30d, 90d, 1y, max)
  - Tooltips with formatted values
  - Responsive design

- **Candlestick Chart** (`components/charts/CandlestickChart.tsx`)
  - OHLC data visualization
  - Color-coded candles (green/red)
  - Multiple timeframes
  - Hover tooltips

### ✅ Pages
- **Token Detail Page** (`app/token/[symbol]/TokenDetailClient.jsx`)
  - Now includes both chart types
  - Tab switching between line/candlestick
  - Integrated with existing whale data

- **Trending Page** (`app/trending/page.jsx`)
  - Trending coins section
  - Top gainers (with logos)
  - Top losers (with logos)
  - Timeframe filters (1h, 24h, 7d, 30d)
  - Click-through to token pages

### ✅ API Routes
- `/api/coingecko/token-image` - Get coin logo URL
- `/api/coingecko/market-chart` - Line chart data
- `/api/coingecko/ohlc` - Candlestick data
- `/api/coingecko/trending` - Trending + gainers/losers
- `/api/coingecko/exchanges-sync` - Cron job for exchanges

### ✅ Database
- **Exchanges Table** in Supabase
  - Stores all CoinGecko exchanges
  - Tracks centralized vs decentralized
  - Used for improved whale transaction classification

---

## 6. Usage

### Displaying Token Logos
```jsx
import TokenIcon from '@/components/TokenIcon'

<TokenIcon 
  symbol="BTC" 
  size={32}
/>

// With CoinGecko ID (more reliable)
<TokenIcon 
  symbol="BTC" 
  coingeckoId="bitcoin"
  size={32}
/>
```

### Fetching Market Data (Server-side)
```typescript
import { getCoinById, getSimplePrice, getMarketChart } from '@/lib/coingecko/client'

// Get detailed coin data
const bitcoinData = await getCoinById('bitcoin', { market_data: true })

// Get simple price for multiple coins
const prices = await getSimplePrice(['bitcoin', 'ethereum'], {
  include_market_cap: true,
  include_24hr_vol: true,
  include_24hr_change: true,
})

// Get chart data
const chartData = await getMarketChart('bitcoin', 7, 'daily')
```

### Using Coin Registry
```typescript
import { coinRegistry } from '@/lib/coingecko/coin-registry'

// Resolve symbol to full metadata
const btcMetadata = await coinRegistry.resolve('BTC')
// Returns: { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', image_url: '...', ... }

// Get by CoinGecko ID
const ethMetadata = await coinRegistry.getById('ethereum')
```

---

## 7. Rate Limits & Caching

### CoinGecko Pro Limits
- **500 calls/minute**
- **5,000 calls/month** (depends on plan)

### Our Caching Strategy
- **Coin List**: 1 hour cache
- **Coin Details**: 2 minutes cache
- **Simple Price**: 1 minute cache
- **Charts**: 5 minutes cache
- **Exchanges**: 6 hours sync interval

This keeps API usage well within limits while providing fresh data.

---

## 8. Next Steps (TODO)

### High Priority
1. **Integrate CoinGecko data into Orca AI**
   - Update `lib/orca/context-builder.ts` to fetch market chart summaries
   - Include volatility metrics from CoinGecko
   - Add trend analysis (derived from chart data)

2. **Replace all token text with TokenIcon**
   - Dashboard whale transaction tables
   - Statistics page
   - Whale alerts
   - News cards (where tokens are mentioned)
   - Search results

3. **Add logos to Orca UI responses**
   - Show token logo in chat header
   - Display logo next to price/metrics in responses

### Medium Priority
4. **Remove remaining emojis**
   - Replace with SVG icons or remove entirely
   - Ensure consistent icon usage

5. **Verify "Premium" branding**
   - Search and replace any remaining "Pro" references

### Optional Enhancements
- Add historical snapshots view (using `/coins/{id}/history`)
- Integrate exchange data into whale classification algorithm
- Add more chart types (volume bars, RSI, etc.)
- Build a "Compare Tokens" page

---

## 9. Testing

### Manual Testing Checklist
- [ ] Token logos appear on Dashboard
- [ ] Token logos appear on Statistics page
- [ ] Token logos appear on Token detail pages
- [ ] Charts load correctly on token pages
- [ ] Trending page displays data
- [ ] Top gainers/losers show correct %
- [ ] Exchanges table is populated
- [ ] Orca AI references correct price data
- [ ] No broken images (fallback works)
- [ ] Mobile responsive

### API Testing
```bash
# Test token image API
curl "http://localhost:3000/api/coingecko/token-image?symbol=BTC"

# Test market chart API
curl "http://localhost:3000/api/coingecko/market-chart?symbol=BTC&days=7"

# Test trending API
curl "http://localhost:3000/api/coingecko/trending?duration=24h"
```

---

## 10. Troubleshooting

### Issue: "COINGECKO_API_KEY not set" warning
**Solution**: Add the environment variable to `.env.local` and restart the dev server.

### Issue: Charts not loading / blank
**Solution**: 
1. Check browser console for errors
2. Ensure `chartjs-chart-financial` is installed
3. Try clearing browser cache

### Issue: Logos not showing
**Solution**:
1. Check if CoinGecko API is responding (check Network tab)
2. Verify symbol → CoinGecko ID mapping is correct
3. Fallback letter avatar should always show

### Issue: Exchanges table empty
**Solution**:
1. Manually trigger sync: `curl https://your-domain.com/api/coingecko/exchanges-sync`
2. Check Vercel logs for cron job execution
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is set

### Issue: Rate limit errors
**Solution**:
1. Check CoinGecko dashboard for usage
2. Increase cache TTL values in `lib/coingecko/client.ts`
3. Consider upgrading CoinGecko plan if needed

---

## 11. Deployment Steps

1. **Push code to GitHub**
```bash
git add -A
git commit -m "feat: CoinGecko Pro integration - logos, charts, trending"
git push origin main
```

2. **Add environment variable to Vercel**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `COINGECKO_API_KEY` with your API key
   - Available in all environments (Production, Preview, Development)

3. **Run database migration**
   - Go to Supabase Dashboard → SQL Editor
   - Execute `supabase_exchanges_table.sql`

4. **Redeploy**
   - Vercel will auto-deploy on git push
   - Or manually: Deployments → Redeploy

5. **Verify cron jobs**
   - Check Vercel → Your Project → Cron Jobs
   - Should see exchanges-sync scheduled

6. **Smoke test**
   - Visit `/trending` - should load data
   - Visit any token page - charts should render
   - Check Dashboard - logos should appear

---

## 12. Maintenance

### Weekly
- Monitor CoinGecko API usage in their dashboard
- Check Vercel logs for any failed cron jobs

### Monthly
- Review and optimize cache TTL values based on usage patterns
- Update coin registry if new major tokens are added

### As Needed
- Refresh exchanges data manually if CoinGecko adds new exchanges
- Update CoinGecko ID mappings for renamed/rebranded tokens

---

## Support

For issues related to:
- **CoinGecko API**: https://support.coingecko.com
- **Supabase**: https://supabase.com/docs
- **Chart.js**: https://www.chartjs.org/docs

---

## Summary

This integration provides:
- ✅ Professional coin logos everywhere
- ✅ Interactive price charts on every token page
- ✅ Trending coins/gainers/losers page
- ✅ Centralized coin metadata registry
- ✅ Exchanges database for improved classification
- ✅ Cached, rate-limit-safe API client
- ✅ Ready for Orca AI integration

**Estimated API Usage**: ~2,000-3,000 calls/month with current caching strategy (well under 5k limit)
