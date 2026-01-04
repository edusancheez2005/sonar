# 🌙 LunarCrush AI Integration Plan

**Created**: Jan 3, 2026  
**API Limit**: 2,000 calls/day  
**Current Usage**: Minimal (news ingestion only)

---

## 🎯 **LunarCrush AI Endpoint Discovery**

The user discovered an AMAZING endpoint that provides way more data than we're currently using:

```
https://lunarcrush.ai/topic/:topic
```

**Authorization**: `Bearer unxdj7pa1xdr5248gjygdp7rskmjwsn9xonvw1su`

---

## 📊 **What This Endpoint Provides:**

### Rich Data Available:
1. **Price Data**: Current price, 24h change, 7d, 30d, 1y changes
2. **Social Metrics**:
   - Engagements (111M+ for Bitcoin!)
   - Mentions (169K+ for Bitcoin)
   - Creators (50K+ for Bitcoin)
   - Sentiment (84% bullish for Bitcoin)
3. **Market Intelligence**:
   - AltRank (#279 for Bitcoin)
   - Galaxy Score (49.50)
   - Social Dominance (16.30%)
   - Market Dominance (58.60%)
4. **Network Breakdown**:
   - Reddit, X (Twitter), News, TikTok, YouTube
   - Individual engagement/mention counts per network
5. **Top News**: Real-time news with engagement metrics
6. **Top Social Posts**: Trending posts by engagement
7. **Top Creators**: Most influential accounts mentioning the token
8. **Supportive vs Critical Themes**: Categorized sentiment analysis
9. **Time Series Data**: Links to raw TSV data for charts

---

## 🚨 **Current Implementation (Too Basic!)**

**What we're doing NOW:**
- Using `/api4/public/topic/{topic}/news/v1` endpoint
- Only getting basic news articles
- **Missing** all the rich social/market intelligence!

**API Calls Per Day (Current):**
- News Ingestion: 50 tickers × 2 sources (LunarCrush + CryptoPanic) = **100 calls per 12 hours** = **200 calls/day**
- **Usage**: 10% of daily limit ✅

---

## 💡 **RECOMMENDED STRATEGY**

### Phase 1 (Current): Keep It Simple ✅
- **News Ingestion**: Use basic `/news/v1` endpoint (current implementation)
- **Frequency**: Every 12 hours
- **Cost**: 200 calls/day (10% of limit)
- **Why**: We don't need real-time social data every 12 hours for background ingestion

### Phase 2 (Future - Chatbot): Use AI Endpoint 🚀
When building the chatbot (Phase 2), use the AI endpoint for:

**On-Demand Query** (User asks about a specific token):
```typescript
// Example: User asks "What's happening with Bitcoin?"
const response = await fetch('https://lunarcrush.ai/topic/bitcoin', {
  headers: { 'Authorization': `Bearer ${LUNARCRUSH_API_KEY}` }
})
```

**What to extract for chatbot context:**
1. **Current Sentiment**: 84% bullish/bearish
2. **Top News Headlines**: Latest 5-10 articles
3. **Social Metrics**: Engagement trends, mention volume
4. **Supportive/Critical Themes**: Key narratives
5. **Top Creators**: Who's talking about it
6. **Price Context**: Recent price changes

**API Cost**:
- **Pro users**: 5 questions/day × average 1-2 tickers per query = **5-10 calls/day per user**
- **Free users**: 2 questions/day × 1-2 tickers = **2-4 calls/day per user**
- **100 users**: ~500-1,000 calls/day
- **Still under 2,000/day limit!** ✅

---

## 📈 **Optimal Usage Pattern**

### Background Jobs (Phase 1 - Current):
| Job | Endpoint | Frequency | Daily Calls |
|-----|----------|-----------|-------------|
| News Ingestion | `/topic/{topic}/news/v1` | Every 12h | 200 |
| Sentiment Aggregation | N/A (use stored data) | Every hour | 0 |
| Price Snapshots | CoinGecko (not LunarCrush) | Every 15min | 0 |

**Total Phase 1**: **200 calls/day** (10% of limit)

### Chatbot Queries (Phase 2 - Future):
| Feature | Endpoint | When | Est. Calls |
|---------|----------|------|------------|
| User Q&A | `lunarcrush.ai/topic/:topic` | On demand | 500-1,000/day |
| Daily Brief | `lunarcrush.ai/topic/:topic` | 6:00 AM GMT | 50-100/day |

**Total Phase 2**: **550-1,100 calls/day** (~50% of limit)

**Combined Total**: **750-1,300 calls/day** (under 2,000 limit!) ✅

---

## 🎯 **Phase 2 Implementation Plan**

When building the chatbot (`/api/chat`), integrate LunarCrush AI like this:

### 1. **Chatbot Context Builder**
```typescript
async function buildOrcaContext(ticker: string) {
  // Fetch rich LunarCrush data
  const lcData = await fetch(`https://lunarcrush.ai/topic/${ticker.toLowerCase()}`, {
    headers: { 'Authorization': `Bearer ${process.env.LUNARCRUSH_API_KEY}` }
  })
  
  const html = await lcData.text()
  
  // Parse HTML to extract:
  // - Current price & changes
  // - Sentiment score
  // - Top 5 news headlines
  // - Supportive/Critical themes
  // - Social metrics (engagements, mentions, creators)
  
  // Combine with Supabase data:
  // - Whale transactions (last 24h)
  // - Aggregated sentiment scores
  // - Price snapshots
  
  return richContext
}
```

### 2. **ORCA System Prompt Enhancement**
Feed this context to GPT-4.0:
```
Context for ${ticker}:
- Price: $89,931 (24h: +0.72%, 7d: +2.78%)
- Sentiment: 84% bullish (up from 75% last week)
- Social Engagement: 111M interactions (24h)
- Top Theme (Supportive): "Bitcoin Price Surge and Institutional Interest" (40%)
- Top Theme (Critical): "Market Volatility and Risk Management" (60%)
- Whale Activity (last 24h): 3 large inflows ($50M+), 1 outflow ($20M)
- Latest News: "Bitcoin surges past $90,000 amid geopolitical tensions..."
```

### 3. **Rate Limiting**
```typescript
// Track LunarCrush API usage
const dailyUsage = await redis.get('lunarcrush:daily_calls')
if (dailyUsage > 1800) {
  // Approaching limit - use cached data
  return getCachedLunarCrushData(ticker)
}
```

---

## 🔄 **Migration Strategy**

### NOW (Phase 1):
- ✅ Keep using `/news/v1` endpoint for background ingestion
- ✅ No changes needed
- ✅ Under 10% of API limit

### LATER (Phase 2 - Chatbot):
- 🚀 Add `lunarcrush.ai/topic/:topic` for real-time context
- 🚀 Parse HTML response (it's markdown-formatted)
- 🚀 Combine with whale data + sentiment scores
- 🚀 Feed to GPT-4.0 for intelligent responses

---

## 💰 **Cost Analysis**

### LunarCrush Paid Plan:
- **Limit**: 2,000 calls/day
- **Current Usage**: 200/day (10%)
- **Phase 2 Projected**: 750-1,300/day (40-65%)
- **Headroom**: Still 35-60% buffer ✅

### Why This Works:
1. **Background jobs** use basic endpoints (cheap)
2. **Chatbot queries** use rich AI endpoint (expensive but on-demand)
3. **Rate limiting** enforced (5Q/day pro, 2Q/day free)
4. **Caching** can reduce calls further

---

## ✅ **CONCLUSION**

**Current Phase 1 implementation is PERFECT for now:**
- Using basic news endpoint
- Under 10% of API limit
- Getting the data we need

**For Phase 2 (chatbot), we'll upgrade to:**
- LunarCrush AI endpoint for rich context
- Still under 65% of API limit
- Way more intelligent responses

**No changes needed right now!** 🎉

---

## 📝 **Action Items**

### Immediate (Phase 1):
- [x] Keep current implementation
- [x] Document LunarCrush AI endpoint for future
- [ ] Monitor API usage in production

### Future (Phase 2):
- [ ] Implement HTML parser for `lunarcrush.ai/topic/:topic`
- [ ] Build context aggregator (LunarCrush + Whale + Sentiment)
- [ ] Add rate limiting for LunarCrush calls
- [ ] Cache responses (5-minute TTL)
- [ ] Feed rich context to GPT-4.0

---

**Status**: Phase 1 API usage is efficient and under control. LunarCrush AI endpoint documented for Phase 2 chatbot integration.

**Next Review**: After Phase 2 chatbot implementation

---

*Last Updated: January 3, 2026*

