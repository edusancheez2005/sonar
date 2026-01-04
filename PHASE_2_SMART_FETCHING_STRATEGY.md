# 🧠 PHASE 2: SMART NEWS & SENTIMENT FETCHING STRATEGY

**Created**: January 3, 2026  
**Purpose**: Optimize API usage by intelligently combining background jobs + on-demand fetching

---

## 🎯 **THE PROBLEM**

1. **LunarCrush News API** (`/news/v1`) provides news **without sentiment**
2. **LunarCrush AI endpoint** provides **sentiment + social intelligence** but we want to avoid calling it every 12 hours for 50 tickers (would hit rate limits)
3. We need **fresh data** for chatbot responses

## ✅ **THE SOLUTION: 2-Tier Architecture**

### **Tier 1: Background Jobs (Every 12 hours)** - Phase 1 ✅
- ✅ Fetch news headlines from LunarCrush + CryptoPanic
- ✅ Analyze sentiment with GPT-4o-mini
- ✅ Store in database
- ✅ Aggregate sentiment scores hourly

**Purpose**: Build up a baseline of news + sentiment analysis

### **Tier 2: On-Demand Fetching (When user asks)** - Phase 2 🚀
- 🚀 User asks: "What's happening with ETH?"
- 🚀 Chatbot checks database: Is there fresh news (< 24h old)?
- 🚀 **IF NO**: Query LunarCrush AI endpoint → Parse sentiment + social data → Save to DB
- 🚀 **IF YES**: Use cached data (saves API calls!)
- 🚀 Always call LunarCrush AI for real-time social metrics

---

## 📋 **IMPLEMENTATION: Phase 2 Chatbot Logic**

### **Step 1: Check Database for Fresh News**

```typescript
async function getNewsForTicker(ticker: string) {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const { data: recentNews, count } = await supabase
    .from('news_items')
    .select('*', { count: 'exact' })
    .eq('ticker', ticker)
    .gte('published_at', twentyFourHoursAgo.toISOString())
    .order('published_at', { ascending: false });
  
  // If we have less than 3 articles in last 24h, fetch fresh data
  if (!count || count < 3) {
    console.log(`📡 Fetching fresh news for ${ticker} (only ${count} articles in DB)`);
    await fetchFreshLunarCrushData(ticker);
    
    // Re-query after fetching
    const { data: updatedNews } = await supabase
      .from('news_items')
      .select('*')
      .eq('ticker', ticker)
      .gte('published_at', twentyFourHoursAgo.toISOString())
      .order('published_at', { ascending: false })
      .limit(10);
    
    return updatedNews || [];
  }
  
  console.log(`✅ Using cached news for ${ticker} (${count} articles)`);
  return recentNews || [];
}
```

### **Step 2: Fetch Fresh Data (On-Demand)**

```typescript
async function fetchFreshLunarCrushData(ticker: string) {
  const apiKey = process.env.LUNARCRUSH_API_KEY;
  
  // 1. Fetch from LunarCrush AI endpoint (has sentiment!)
  const aiResponse = await fetch(
    `https://lunarcrush.ai/topic/${ticker.toLowerCase()}`,
    {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    }
  );
  
  const html = await aiResponse.text();
  
  // 2. Parse the markdown-formatted response
  const parsedData = parseLunarCrushAI(html);
  
  // 3. Extract top news from the AI response
  const topNews = parsedData.top_news; // Has social metrics + sentiment
  
  // 4. Save to database
  for (const newsItem of topNews) {
    await supabase.from('news_items').insert({
      source: 'lunarcrush_ai',
      external_id: newsItem.url,
      ticker: ticker,
      title: newsItem.title,
      url: newsItem.url,
      published_at: newsItem.published_at,
      sentiment_raw: parsedData.sentiment_pct / 100, // Convert 84% to 0.84
      metadata: {
        source_type: 'lunarcrush_ai',
        social_engagements: newsItem.engagements,
        social_sentiment: parsedData.sentiment_pct,
        supportive_themes: parsedData.supportive_themes,
        critical_themes: parsedData.critical_themes
      }
    });
  }
  
  // 5. Trigger immediate GPT sentiment analysis for new articles
  await analyzeNewsSentiment(ticker);
  
  console.log(`✅ Saved ${topNews.length} fresh articles for ${ticker}`);
}
```

### **Step 3: Parse LunarCrush AI Response**

```typescript
function parseLunarCrushAI(html: string): LunarCrushAIData {
  // The LunarCrush AI endpoint returns markdown-formatted HTML
  
  // Extract sentiment (e.g., "### Sentiment: 84%")
  const sentimentMatch = html.match(/### Sentiment:\s*(\d+)%/);
  const sentiment_pct = sentimentMatch ? parseInt(sentimentMatch[1]) : null;
  
  // Extract engagements (e.g., "### Engagements: 111,561,086 (24h)")
  const engagementsMatch = html.match(/### Engagements:\s*([\d,]+)/);
  const engagements = engagementsMatch 
    ? parseInt(engagementsMatch[1].replace(/,/g, '')) 
    : null;
  
  // Extract supportive themes
  const supportiveSection = html.match(/Most Supportive Themes:(.*?)Most Critical Themes:/s);
  const supportive_themes = supportiveSection 
    ? extractThemes(supportiveSection[1]) 
    : [];
  
  // Extract critical themes
  const criticalSection = html.match(/Most Critical Themes:(.*?)(###|$)/s);
  const critical_themes = criticalSection 
    ? extractThemes(criticalSection[1]) 
    : [];
  
  // Extract top news
  const newsSection = html.match(/### Top .* News(.*?)(###|$)/s);
  const top_news = newsSection 
    ? extractTopNews(newsSection[1]) 
    : [];
  
  return {
    sentiment_pct,
    engagements,
    supportive_themes,
    critical_themes,
    top_news
  };
}

function extractThemes(text: string): string[] {
  // Parse markdown list items
  const themes: string[] = [];
  const matches = text.matchAll(/- (.*?):\s*\((\d+)%\)\s*(.*?)(?=\n-|\n###|$)/gs);
  
  for (const match of matches) {
    themes.push(`${match[1]} (${match[2]}%): ${match[3]}`);
  }
  
  return themes;
}

function extractTopNews(text: string): NewsItem[] {
  // Parse news items from markdown
  const news: NewsItem[] = [];
  const matches = text.matchAll(/"(.*?)".*?\[News Link\]\((.*?)\).*?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z)/gs);
  
  for (const match of matches) {
    news.push({
      title: match[1],
      url: match[2],
      published_at: match[3]
    });
  }
  
  return news;
}
```

### **Step 4: Chatbot Flow**

```typescript
export async function POST(request: Request) {
  const { message, userId } = await request.json();
  
  // 1. Extract ticker from message
  const ticker = extractTicker(message); // "ETH", "BTC", etc.
  
  // 2. Get news (smart fetching!)
  const news = await getNewsForTicker(ticker); // Uses cache or fetches fresh
  
  // 3. ALWAYS fetch real-time social data from LunarCrush AI
  const socialData = await fetchLunarCrushAI(ticker);
  
  // 4. Get whale data (your primary source - ERC20 focus)
  const whaleData = await getWhaleActivity(ticker);
  
  // 5. Get sentiment scores (from Phase 1 aggregation)
  const sentiment = await getSentimentScores(ticker);
  
  // 6. Get price data
  const priceData = await getPriceData(ticker);
  
  // 7. Build ORCA context
  const context = {
    ticker,
    news, // Fresh or cached
    social: socialData, // Always fresh
    whales: whaleData, // Your data
    sentiment, // Aggregated
    price: priceData
  };
  
  // 8. Call GPT-4.0
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: ORCA_SYSTEM_PROMPT },
      { role: 'user', content: buildContextMessage(context) }
    ]
  });
  
  return NextResponse.json({
    response: response.choices[0].message.content,
    data: context
  });
}
```

---

## 💰 **API USAGE OPTIMIZATION**

### **Background Jobs (Phase 1):**
- LunarCrush News API: 50 tickers × 2 calls/day = **100 calls/day** ✅
- CryptoPanic: 50 tickers × 2 calls/day = **100 calls/day** ✅
- Total: **200 calls/day background**

### **On-Demand (Phase 2):**
- LunarCrush AI: **Only when needed** (< 3 articles in 24h)
- Typical usage: ~10-20 calls/day (for less popular tokens)
- For popular tokens (BTC, ETH, SOL): **0 calls** (use cache!)

### **Estimated Monthly:**
- Background: 200 calls/day × 30 = **6,000 calls/month**
- On-demand: 20 calls/day × 30 = **600 calls/month**
- **Total: ~6,600 calls/month** (well under LunarCrush limit!)

---

## 🎯 **BENEFITS**

1. ✅ **Fresh data**: Always get recent news when user asks
2. ✅ **Save API calls**: Use cache for popular tokens
3. ✅ **Real-time social**: Always fetch social sentiment on-demand
4. ✅ **Provider sentiment**: Extract from LunarCrush AI (84% bullish)
5. ✅ **LLM sentiment**: Backup analysis with GPT-4o-mini
6. ✅ **Combined power**: 60% LLM + 40% provider sentiment

---

## 📋 **PHASE 2 TODO: Update Chatbot Implementation**

- [ ] Add `getNewsForTicker()` with smart fetching logic
- [ ] Add `fetchFreshLunarCrushData()` for on-demand fetching
- [ ] Add `parseLunarCrushAI()` to extract sentiment from AI endpoint
- [ ] Add `extractThemes()` and `extractTopNews()` helpers
- [ ] Always call LunarCrush AI for real-time social metrics
- [ ] Save fetched data to database for future cache hits
- [ ] Update ORCA context to include both cached + fresh data

---

## 🚀 **RESULT**

**Best of both worlds:**
- ✅ Background jobs build up baseline
- ✅ On-demand fetching ensures freshness
- ✅ Smart caching saves API calls
- ✅ Real-time social data always fresh
- ✅ Provider sentiment (LunarCrush) + LLM sentiment (GPT) = accurate analysis

**User gets**: Fresh, accurate, multi-source intelligence without burning through API limits! 🔥

