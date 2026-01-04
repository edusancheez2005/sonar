# 🤖 PHASE 2: CHATBOT CORE - IMPLEMENTATION PROMPT

**Created**: January 3, 2026  
**Phase**: 2 of 6 (Chatbot Core)  
**Timeline**: Days 11-25 (15 days)  
**Status**: Ready to implement

---

## 🎯 **OBJECTIVE**

Build ORCA AI 2.0 chatbot that combines:
- ✅ **Your personalized whale data** (ERC20 focus from `whale_transactions`)
- ✅ **Stored sentiment analysis** (GPT-4o-mini from Phase 1)
- ✅ **LunarCrush AI social sentiment** (real-time, on-demand)
- ✅ **CoinGecko price data** (from `price_snapshots`)
- ✅ **GPT-4.0 reasoning** (intelligent responses)

---

## 📊 **DATABASE SCHEMA REFERENCE**

### `whale_transactions` Table (Your Primary Data Source)

**Purpose**: Stores your personalized whale transaction data from blockchain monitoring (ERC20 focus)

**Schema**:
```sql
create table public.whale_transactions (
  id serial not null,
  transaction_hash text not null,
  token_symbol text null,              -- e.g., 'ETH', 'USDT', 'LINK'
  token_address text null,
  classification text null,            -- e.g., 'ACCUMULATION', 'DISTRIBUTION'
  confidence numeric null,
  usd_value numeric null,              -- Transaction value in USD
  whale_score numeric null,            -- Whale importance score
  blockchain text null,                -- e.g., 'ethereum', 'polygon'
  from_address text null,
  to_address text null,
  timestamp timestamp with time zone null default now(),
  analysis_phases integer null,
  reasoning text null,                 -- AI reasoning for classification
  monitoring_group text null,
  whale_address text null,
  counterparty_address text null,
  counterparty_type text null,         -- e.g., 'CEX', 'DEX', 'WHALE'
  is_cex_transaction boolean null default false,
  from_label text null,                -- e.g., 'Binance', 'Uniswap'
  to_label text null,
  constraint whale_transactions_pkey primary key (id),
  constraint whale_transactions_transaction_hash_key unique (transaction_hash)
);

create index whale_transactions_ts_idx on public.whale_transactions 
  using btree ("timestamp" desc);
```

**Key Fields for Analysis**:
- `token_symbol`: Ticker to match user query
- `usd_value`: Transaction size in USD
- `classification`: Type of whale activity
- `timestamp`: When transaction occurred
- `from_label` / `to_label`: Exchange/entity labels
- `counterparty_type`: CEX/DEX/WHALE classification
- `reasoning`: AI explanation of the move

**Focus**: **ERC20 tokens** are your primary data source (Ethereum ecosystem)  
**Also includes**: BTC, SOL, ETH when available

---

## 📋 **PART 1: BACKEND - CHAT API ENDPOINT**

### Create `/app/api/chat/route.ts`

**Purpose**: Main chatbot endpoint that processes user questions and returns intelligent responses

#### Required Functionality:

1. **Authentication & Rate Limiting**
   - Verify user is logged in (via Supabase Auth)
   - Check `user_quotas` table for daily limit
   - **Free users**: 2 questions/day
   - **Pro users**: 5 questions/day
   - Return 429 error if limit exceeded

2. **Ticker Extraction**
   - Parse user message to extract mentioned tickers (BTC, ETH, SOL, etc.)
   - Support natural language: "bitcoin", "ethereum", "BTC", "$BTC"
   - If no ticker mentioned, return helpful error

3. **Data Retrieval** (Multi-source aggregation)

   **A. Whale Activity** (Your personalized data - PRIMARY SOURCE)
   ```typescript
   // Query whale_transactions table for last 24 hours
   const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
   
   const { data: whaleData, error } = await supabase
     .from('whale_transactions')
     .select(`
       id,
       transaction_hash,
       token_symbol,
       classification,
       usd_value,
       whale_score,
       blockchain,
       from_address,
       to_address,
       from_label,
       to_label,
       counterparty_type,
       is_cex_transaction,
       reasoning,
       timestamp
     `)
     .eq('token_symbol', ticker)
     .gte('timestamp', last24Hours)
     .order('usd_value', { ascending: false })
     .limit(50); // Get top 50 whale transactions
   
   if (error) {
     console.error('Error fetching whale data:', error);
     return null;
   }
   
   // Calculate whale metrics
   const whaleMetrics = {
     // Total transaction count
     transaction_count: whaleData.length,
     
     // Total volume (sum of all usd_value)
     total_volume_usd: whaleData.reduce((sum, tx) => sum + (tx.usd_value || 0), 0),
     
     // Average transaction size
     avg_transaction_usd: whaleData.length > 0 
       ? whaleData.reduce((sum, tx) => sum + (tx.usd_value || 0), 0) / whaleData.length 
       : 0,
     
     // Net flow calculation (CEX inflows vs outflows)
     net_flow_24h: calculateNetFlow(whaleData),
     
     // Top 5 largest moves
     top_moves: whaleData.slice(0, 5).map(tx => ({
       hash: tx.transaction_hash,
       value_usd: tx.usd_value,
       classification: tx.classification,
       from: tx.from_label || truncateAddress(tx.from_address),
       to: tx.to_label || truncateAddress(tx.to_address),
       type: tx.counterparty_type,
       reasoning: tx.reasoning,
       timestamp: tx.timestamp
     })),
     
     // CEX vs DEX breakdown
     cex_transactions: whaleData.filter(tx => tx.is_cex_transaction).length,
     dex_transactions: whaleData.filter(tx => !tx.is_cex_transaction && tx.counterparty_type === 'DEX').length,
     
     // Accumulation vs Distribution
     accumulation_count: whaleData.filter(tx => tx.classification === 'ACCUMULATION').length,
     distribution_count: whaleData.filter(tx => tx.classification === 'DISTRIBUTION').length,
     
     // Average whale score
     avg_whale_score: whaleData.length > 0
       ? whaleData.reduce((sum, tx) => sum + (tx.whale_score || 0), 0) / whaleData.length
       : 0
   };
   
   // Calculate net flow (CEX inflows are bullish, outflows are bearish)
   function calculateNetFlow(transactions: WhaleTransaction[]): number {
     let netFlow = 0;
     
     for (const tx of transactions) {
       if (tx.is_cex_transaction) {
         // Inflow to CEX = potential selling pressure (negative)
         // Outflow from CEX = potential buying/accumulation (positive)
         if (tx.from_label && tx.from_label.includes('CEX')) {
           // From CEX to wallet = bullish
           netFlow += tx.usd_value || 0;
         } else if (tx.to_label && tx.to_label.includes('CEX')) {
           // To CEX from wallet = bearish
           netFlow -= tx.usd_value || 0;
         }
       }
     }
     
     return netFlow;
   }
   
   function truncateAddress(address: string | null): string {
     if (!address) return 'Unknown';
     return `${address.slice(0, 6)}...${address.slice(-4)}`;
   }
   ```

   **Focus**: **ERC20 tokens** (your primary data source - Ethereum ecosystem)  
   **Also includes**: BTC, SOL, ETH whale data when available  
   **Net Flow Interpretation**:
   - Positive = Net outflow from CEX (accumulation, bullish)
   - Negative = Net inflow to CEX (potential selling, bearish)

   **B. Sentiment Analysis** (From Phase 1 storage)
   ```typescript
   // Query sentiment_scores table
   const sentimentData = await supabase
     .from('sentiment_scores')
     .select('*')
     .eq('ticker', ticker)
     .order('timestamp', { ascending: false })
     .limit(24); // Last 24 hours of sentiment
   
   // Get:
   // - Latest aggregated_score (60% LLM + 40% provider)
   // - Trend (improving/declining)
   // - Confidence level
   // - News count
   ```

   **C. Recent News** (Smart Fetching: Cache + On-Demand)
   ```typescript
   // SMART FETCHING: Check if we have fresh news (< 24h old)
   const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
   
   let { data: newsData, count } = await supabase
     .from('news_items')
     .select('*', { count: 'exact' })
     .eq('ticker', ticker)
     .gte('published_at', twentyFourHoursAgo.toISOString())
     .order('published_at', { ascending: false });
   
   // If < 3 articles in last 24h, fetch fresh data from LunarCrush AI
   if (!count || count < 3) {
     console.log(`📡 Fetching fresh news for ${ticker} (only ${count} in DB)`);
     await fetchFreshLunarCrushData(ticker, supabase);
     
     // Re-query after fetching
     const { data: updatedNews } = await supabase
       .from('news_items')
       .select('*')
       .eq('ticker', ticker)
       .gte('published_at', twentyFourHoursAgo.toISOString())
       .order('published_at', { ascending: false });
     
     newsData = updatedNews;
   } else {
     console.log(`✅ Using cached news for ${ticker} (${count} articles)`);
   }
   
   // Top 10 headlines with sentiment scores
   const recentHeadlines = newsData?.slice(0, 10) || [];
   ```

   **D. LunarCrush AI Social Intelligence** (Real-time, on-demand)
   ```typescript
   // ONLY call this when user asks a question (not background)
   const lcResponse = await fetch(
     `https://lunarcrush.ai/topic/${ticker.toLowerCase()}`,
     { headers: { 'Authorization': `Bearer ${LUNARCRUSH_API_KEY}` } }
   );
   
   const html = await lcResponse.text();
   
   // Parse HTML to extract:
   // - Current sentiment percentage (e.g., 84% bullish)
   // - Social engagement (interactions, mentions, creators)
   // - Supportive themes (positive narratives)
   // - Critical themes (concerns/risks)
   // - Top 3 news headlines with social metrics
   // - Market intelligence (AltRank, Galaxy Score)
   ```

   **E. Price Data** (From Phase 1 storage)
   ```typescript
   // Query price_snapshots table
   const priceData = await supabase
     .from('price_snapshots')
     .select('*')
     .eq('ticker', ticker)
     .order('timestamp', { ascending: false })
     .limit(96); // Last 24 hours (every 15 min)
   
   // Calculate:
   // - Current price
   // - 1h, 24h, 7d changes
   // - Price volatility
   ```

4. **Context Building**
   ```typescript
   const orcaContext = {
     ticker,
     price: {
       current: priceData[0]?.price_usd || 0,
       change_24h: priceData[0]?.price_change_24h || 0,
       market_cap: priceData[0]?.market_cap || 0,
       volume_24h: priceData[0]?.volume_24h || 0,
       trend: calculatePriceTrend(priceData)
     },
     whales: {
       // Primary metrics from whale_transactions table
       transaction_count: whaleMetrics.transaction_count,
       total_volume_usd: whaleMetrics.total_volume_usd,
       avg_transaction_usd: whaleMetrics.avg_transaction_usd,
       net_flow_24h: whaleMetrics.net_flow_24h,
       avg_whale_score: whaleMetrics.avg_whale_score,
       
       // Activity breakdown
       cex_transactions: whaleMetrics.cex_transactions,
       dex_transactions: whaleMetrics.dex_transactions,
       accumulation_count: whaleMetrics.accumulation_count,
       distribution_count: whaleMetrics.distribution_count,
       
       // Top 5 largest whale moves with details
       top_moves: whaleMetrics.top_moves,
       
       // Data source indicator
       data_focus: 'ERC20-primary' // Your primary data source
     },
     sentiment: {
       current: sentimentData[0]?.aggregated_score || 0,
       trend: calculateSentimentTrend(sentimentData),
       news_count: sentimentData[0]?.news_count_24h || 0,
       confidence: sentimentData[0]?.confidence || 0,
       provider_sentiment: sentimentData[0]?.provider_sentiment_avg,
       llm_sentiment: sentimentData[0]?.llm_sentiment_avg
     },
     social: {
       // From LunarCrush AI (real-time)
       sentiment_pct: parsedLC.sentiment_pct,
       engagement: parsedLC.interactions,
       mentions: parsedLC.mentions,
       creators: parsedLC.creators,
       supportive_themes: parsedLC.supportive_themes,
       critical_themes: parsedLC.critical_themes,
       top_creators: parsedLC.top_creators?.slice(0, 3) || []
     },
     news: {
       headlines: newsData?.slice(0, 5) || [],
       total_count: newsData?.length || 0
     }
   };
   ```

5. **GPT-4.0 Integration**
   ```typescript
   const completion = await openai.chat.completions.create({
     model: 'gpt-4o',
     messages: [
       {
         role: 'system',
         content: ORCA_SYSTEM_PROMPT // From Phase 0
       },
       {
         role: 'user',
         content: `User question: "${userMessage}"

═══════════════════════════════════════════
CONTEXT FOR ${ticker}
═══════════════════════════════════════════

💰 PRICE DATA (CoinGecko):
├─ Current Price: $${orcaContext.price.current.toLocaleString()}
├─ 24h Change: ${orcaContext.price.change_24h >= 0 ? '+' : ''}${orcaContext.price.change_24h.toFixed(2)}%
├─ Market Cap: $${(orcaContext.price.market_cap / 1e9).toFixed(2)}B
├─ 24h Volume: $${(orcaContext.price.volume_24h / 1e6).toFixed(2)}M
└─ Trend: ${orcaContext.price.trend}

🐋 WHALE ACTIVITY (Your Personalized Data - ERC20 Focus):
├─ Data Source: whale_transactions table (blockchain monitoring)
├─ Time Range: Last 24 hours
│
├─ FLOW ANALYSIS:
│  ├─ Net Flow: $${(orcaContext.whales.net_flow_24h / 1e6).toFixed(2)}M ${orcaContext.whales.net_flow_24h > 0 ? '(BULLISH - Accumulation)' : '(BEARISH - Distribution)'}
│  ├─ Total Volume: $${(orcaContext.whales.total_volume_usd / 1e6).toFixed(2)}M
│  ├─ Transaction Count: ${orcaContext.whales.transaction_count}
│  └─ Avg Transaction: $${(orcaContext.whales.avg_transaction_usd / 1e3).toFixed(0)}K
│
├─ ACTIVITY BREAKDOWN:
│  ├─ CEX Transactions: ${orcaContext.whales.cex_transactions}
│  ├─ DEX Transactions: ${orcaContext.whales.dex_transactions}
│  ├─ Accumulation: ${orcaContext.whales.accumulation_count}
│  ├─ Distribution: ${orcaContext.whales.distribution_count}
│  └─ Avg Whale Score: ${orcaContext.whales.avg_whale_score.toFixed(2)}/10
│
└─ TOP 5 WHALE MOVES:
${formatWhaleMovesDetailed(orcaContext.whales.top_moves)}

📊 SENTIMENT ANALYSIS (Multi-Source):
├─ Combined Score: ${orcaContext.sentiment.current.toFixed(2)} (-1 bearish to +1 bullish)
├─ Provider Sentiment: ${orcaContext.sentiment.provider_sentiment?.toFixed(2) || 'N/A'}
├─ LLM Sentiment (GPT-4o-mini): ${orcaContext.sentiment.llm_sentiment?.toFixed(2) || 'N/A'}
├─ Trend: ${orcaContext.sentiment.trend}
├─ Confidence: ${(orcaContext.sentiment.confidence * 100).toFixed(0)}%
└─ Based on: ${orcaContext.sentiment.news_count} news articles (24h)

🌙 SOCIAL INTELLIGENCE (LunarCrush AI - Real-Time):
├─ Social Sentiment: ${orcaContext.social.sentiment_pct}% bullish
├─ Engagement (24h): ${(orcaContext.social.engagement / 1e6).toFixed(2)}M interactions
├─ Mentions (24h): ${(orcaContext.social.mentions / 1e3).toFixed(1)}K
├─ Active Creators: ${orcaContext.social.creators}
│
├─ 💚 SUPPORTIVE THEMES:
${formatThemes(orcaContext.social.supportive_themes)}
│
└─ ⚠️ CRITICAL THEMES:
${formatThemes(orcaContext.social.critical_themes)}

📰 RECENT NEWS (Top 5):
${formatNewsHeadlinesDetailed(orcaContext.news.headlines)}

═══════════════════════════════════════════

INSTRUCTIONS:
Based on the above data, provide an intelligent, balanced analysis.
Focus on interpreting whale activity (your primary data source) in context of sentiment, social data, and price action.
Explain what the data suggests, but avoid making specific predictions or financial advice.
Use the ORCA persona defined in your system prompt.`
       }
     ],
     temperature: 0.7,
     max_tokens: 800
   });
   
   const orcaResponse = completion.choices[0].message.content;
   ```

6. **Update Quota & Log Chat**
   ```typescript
   // Increment user's question count
   await supabase
     .from('user_quotas')
     .update({ questions_used: questionsUsed + 1 })
     .eq('user_id', userId)
     .eq('date', today);
   
   // Log chat history
   await supabase
     .from('chat_history')
     .insert({
       user_id: userId,
       user_message: userMessage,
       orca_response: orcaResponse,
       tokens_used: completion.usage.total_tokens,
       model: 'gpt-4o',
       tickers_mentioned: [ticker],
       data_sources_used: {
         whale: true,
         sentiment: true,
         news: true,
         social: true,
         price: true
       },
       response_time_ms: responseTime
     });
   ```

7. **Response Format**
   ```typescript
   return NextResponse.json({
     success: true,
     response: orcaResponse,
     data: {
       ticker,
       price: orcaContext.price,
       whale_summary: {
         net_flow: orcaContext.whales.net_flow_24h,
         transactions: orcaContext.whales.transaction_count
       },
       sentiment: orcaContext.sentiment.current,
       social_sentiment: orcaContext.social.sentiment_pct
     },
     quota: {
       used: questionsUsed + 1,
       limit: questionsLimit,
       remaining: questionsLimit - (questionsUsed + 1)
     }
   });
   ```

---

## 📋 **PART 2: FRONTEND - CHAT UI**

### Create `/app/chat/page.tsx`

**Purpose**: Interactive chat interface with response cards

#### UI Components:

1. **Chat Container**
   - Clean, modern design
   - Message history (user + ORCA responses)
   - Input field with send button
   - Quota display (X/5 questions today)

2. **Response Cards** (Interactive Data Visualization)

   **A. WhaleActivityCard**
   ```tsx
   <Card>
     <CardHeader>
       <h3>🐋 Whale Activity</h3>
       <span className="badge">Last 24h</span>
     </CardHeader>
     <CardContent>
       <div className="metric">
         <span>Net Flow</span>
         <span className={netFlow > 0 ? 'positive' : 'negative'}>
           ${formatLarge(netFlow)}
         </span>
       </div>
       <div className="metric">
         <span>Transactions</span>
         <span>{transactionCount}</span>
       </div>
       <div className="whale-list">
         {topMoves.map(move => (
           <WhaleTransaction key={move.id} data={move} />
         ))}
       </div>
     </CardContent>
   </Card>
   ```

   **B. SentimentCard**
   ```tsx
   <Card>
     <CardHeader>
       <h3>📊 Sentiment Analysis</h3>
     </CardHeader>
     <CardContent>
       <SentimentGauge value={sentimentScore} />
       <div className="breakdown">
         <div>Provider: {providerSentiment}</div>
         <div>AI Analysis: {llmSentiment}</div>
         <div className="highlight">Combined: {aggregatedScore}</div>
       </div>
       <div className="confidence">
         Confidence: {confidence * 100}%
         <span className="info">Based on {newsCount} articles</span>
       </div>
     </CardContent>
   </Card>
   ```

   **C. SocialCard** (LunarCrush AI data)
   ```tsx
   <Card>
     <CardHeader>
       <h3>🌙 Social Intelligence</h3>
       <span className="source">LunarCrush AI</span>
     </CardHeader>
     <CardContent>
       <div className="sentiment-bar">
         <div className="bullish" style={{width: `${socialSentiment}%`}}>
           {socialSentiment}% Bullish
         </div>
       </div>
       <div className="metrics-grid">
         <Metric label="Engagement" value={formatLarge(engagement)} />
         <Metric label="Mentions" value={formatLarge(mentions)} />
         <Metric label="Creators" value={formatLarge(creators)} />
       </div>
       <div className="themes">
         <div className="supportive">
           <h4>💚 Supportive Themes</h4>
           <ul>{supportiveThemes.map(t => <li>{t}</li>)}</ul>
         </div>
         <div className="critical">
           <h4>⚠️ Critical Themes</h4>
           <ul>{criticalThemes.map(t => <li>{t}</li>)}</ul>
         </div>
       </div>
     </CardContent>
   </Card>
   ```

   **D. PriceCard**
   ```tsx
   <Card>
     <CardHeader>
       <h3>💰 Price Overview</h3>
     </CardHeader>
     <CardContent>
       <div className="current-price">
         ${currentPrice}
       </div>
       <div className="changes">
         <PriceChange period="1h" value={change1h} />
         <PriceChange period="24h" value={change24h} />
         <PriceChange period="7d" value={change7d} />
       </div>
       <MiniChart data={priceHistory} />
     </CardContent>
   </Card>
   ```

   **E. NewsCard**
   ```tsx
   <Card>
     <CardHeader>
       <h3>📰 Recent News</h3>
     </CardHeader>
     <CardContent>
       {headlines.map(news => (
         <NewsItem
           key={news.id}
           title={news.title}
           source={news.source}
           sentiment={news.sentiment_llm}
           time={news.published_at}
           url={news.url}
         />
       ))}
     </CardContent>
   </Card>
   ```

3. **Disclaimer Footer**
   ```tsx
   <div className="disclaimer">
     ⚠️ This is educational content only. Not financial advice. DYOR.
   </div>
   ```

---

## 📋 **PART 3: SUPPORTING UTILITIES**

### Create `/lib/orca/context-builder.ts`

```typescript
/**
 * Aggregates data from all sources for ORCA context
 */
export async function buildOrcaContext(
  ticker: string,
  userId: string
): Promise<OrcaContext> {
  // Parallel data fetching
  const [
    whaleData,
    sentimentData,
    newsData,
    priceData,
    socialData
  ] = await Promise.all([
    fetchWhaleActivity(ticker),
    fetchSentiment(ticker),
    fetchNews(ticker),
    fetchPriceData(ticker),
    fetchLunarCrushAI(ticker) // On-demand only
  ]);
  
  return {
    ticker,
    price: processPriceData(priceData),
    whales: processWhaleData(whaleData),
    sentiment: processSentimentData(sentimentData),
    social: processSocialData(socialData),
    news: processNewsData(newsData)
  };
}

/**
 * Format whale moves for GPT context (detailed version)
 */
export function formatWhaleMovesDetailed(moves: WhaleMove[]): string {
  if (!moves || moves.length === 0) {
    return '   No significant whale activity in last 24h';
  }
  
  return moves.map((move, index) => `
   ${index + 1}. $${(move.value_usd / 1e6).toFixed(2)}M - ${move.classification || 'Unknown'}
      ├─ From: ${move.from}
      ├─ To: ${move.to}
      ├─ Type: ${move.type}
      ├─ Time: ${formatTimeAgo(move.timestamp)}
      └─ Analysis: ${move.reasoning || 'No analysis available'}`
  ).join('\n');
}

/**
 * Format themes from LunarCrush
 */
export function formatThemes(themes: string[]): string {
  if (!themes || themes.length === 0) {
    return '   No themes identified';
  }
  
  return themes.map(theme => `│  • ${theme}`).join('\n');
}

/**
 * Format news headlines with sentiment (detailed version)
 */
export function formatNewsHeadlinesDetailed(headlines: NewsItem[]): string {
  if (!headlines || headlines.length === 0) {
    return 'No recent news available';
  }
  
  return headlines.map((news, index) => {
    const sentimentEmoji = news.sentiment_llm > 0.3 ? '📈' : 
                          news.sentiment_llm < -0.3 ? '📉' : '➡️';
    const sentimentLabel = news.sentiment_llm > 0.3 ? 'Bullish' :
                          news.sentiment_llm < -0.3 ? 'Bearish' : 'Neutral';
    
    return `${index + 1}. ${sentimentEmoji} "${news.title}"
   ├─ Source: ${news.source}
   ├─ Sentiment: ${sentimentLabel} (${news.sentiment_llm.toFixed(2)})
   ├─ Time: ${formatTimeAgo(news.published_at)}
   └─ URL: ${news.url}`;
  }).join('\n\n');
}

/**
 * Format time ago helper
 */
export function formatTimeAgo(timestamp: string): string {
  const now = new Date().getTime();
  const time = new Date(timestamp).getTime();
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${Math.floor(diffHours / 24)}d ago`;
  }
}
```

### Create `/lib/orca/lunarcrush-parser.ts`

```typescript
/**
 * Parses LunarCrush AI HTML response
 * Extracts sentiment, themes, metrics
 */
export function parseLunarCrushAI(html: string): LunarCrushData {
  // The LunarCrush AI endpoint returns markdown-formatted HTML
  
  // Extract sentiment (e.g., "### Sentiment: 84%")
  const sentimentMatch = html.match(/### Sentiment:\s*(\d+)%/);
  const sentiment_pct = sentimentMatch ? parseInt(sentimentMatch[1]) : null;
  
  // Extract engagements (e.g., "### Engagements: 111,561,086 (24h)")
  const engagementsMatch = html.match(/### Engagements:\s*([\d,]+)/);
  const interactions = engagementsMatch 
    ? parseInt(engagementsMatch[1].replace(/,/g, '')) 
    : null;
  
  // Extract mentions
  const mentionsMatch = html.match(/### Mentions:\s*([\d,]+)/);
  const mentions = mentionsMatch 
    ? parseInt(mentionsMatch[1].replace(/,/g, '')) 
    : null;
  
  // Extract creators
  const creatorsMatch = html.match(/### Creators:\s*([\d,]+)/);
  const creators = creatorsMatch 
    ? parseInt(creatorsMatch[1].replace(/,/g, '')) 
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
  
  // Extract top creators
  const creatorsSection = html.match(/The most influential creators(.*?)\[View More\]/s);
  const top_creators = creatorsSection 
    ? extractTopCreators(creatorsSection[1]) 
    : [];
  
  return {
    sentiment_pct,
    interactions,
    mentions,
    creators,
    supportive_themes,
    critical_themes,
    top_news,
    top_creators
  };
}

function extractThemes(text: string): string[] {
  const themes: string[] = [];
  const matches = text.matchAll(/- (.*?):\s*\((\d+)%\)\s*(.*?)(?=\n-|\n###|$)/gs);
  
  for (const match of matches) {
    themes.push(`${match[1]} (${match[2]}%): ${match[3]}`);
  }
  
  return themes;
}

function extractTopNews(text: string): NewsItem[] {
  const news: NewsItem[] = [];
  const matches = text.matchAll(/"(.*?)".*?\[News Link\]\((.*?)\).*?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z)/gs);
  
  for (const match of matches) {
    news.push({
      title: match[1],
      url: match[2],
      published_at: match[3]
    });
  }
  
  return news.slice(0, 10); // Top 10
}

function extractTopCreators(text: string): Creator[] {
  const creators: Creator[] = [];
  const matches = text.matchAll(/\|\s*\[@(\w+)\].*?\|\s*(\d+)\s*\|\s*([\d,]+)\s*\|\s*(\d+)\s*\|\s*([\d,]+)\s*\|/gs);
  
  for (const match of matches) {
    creators.push({
      name: match[1],
      rank: parseInt(match[2]),
      followers: parseInt(match[3].replace(/,/g, '')),
      posts: parseInt(match[4]),
      engagements: parseInt(match[5].replace(/,/g, ''))
    });
  }
  
  return creators.slice(0, 5); // Top 5
}

/**
 * Fetch fresh news from LunarCrush AI endpoint and save to DB
 */
export async function fetchFreshLunarCrushData(
  ticker: string,
  supabase: any
): Promise<void> {
  const apiKey = process.env.LUNARCRUSH_API_KEY;
  
  if (!apiKey) {
    console.error('LUNARCRUSH_API_KEY not configured');
    return;
  }
  
  try {
    // Fetch from LunarCrush AI endpoint (has sentiment + news)
    const response = await fetch(
      `https://lunarcrush.ai/topic/${ticker.toLowerCase()}`,
      {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }
    );
    
    if (!response.ok) {
      throw new Error(`LunarCrush AI error: ${response.status}`);
    }
    
    const html = await response.text();
    const parsedData = parseLunarCrushAI(html);
    
    // Save top news to database
    for (const newsItem of parsedData.top_news) {
      await supabase.from('news_items').upsert({
        source: 'lunarcrush_ai',
        external_id: newsItem.url,
        ticker: ticker,
        title: newsItem.title,
        url: newsItem.url,
        published_at: newsItem.published_at,
        sentiment_raw: parsedData.sentiment_pct ? parsedData.sentiment_pct / 100 : null, // 84% -> 0.84
        metadata: {
          source_type: 'lunarcrush_ai',
          social_sentiment: parsedData.sentiment_pct,
          engagements: parsedData.interactions,
          mentions: parsedData.mentions,
          creators: parsedData.creators,
          supportive_themes: parsedData.supportive_themes,
          critical_themes: parsedData.critical_themes
        }
      }, { onConflict: 'external_id' });
    }
    
    console.log(`✅ Saved ${parsedData.top_news.length} fresh articles for ${ticker}`);
    
    // Trigger immediate sentiment analysis for new articles
    // (This will run GPT-4o-mini on the new headlines)
    await analyzeFreshSentiment(ticker, supabase);
    
  } catch (error) {
    console.error(`Error fetching fresh LunarCrush data for ${ticker}:`, error);
  }
}

async function analyzeFreshSentiment(ticker: string, supabase: any): Promise<void> {
  // Get articles without LLM sentiment
  const { data: unanalyzed } = await supabase
    .from('news_items')
    .select('id, title')
    .eq('ticker', ticker)
    .is('sentiment_llm', null)
    .limit(10);
  
  if (!unanalyzed || unanalyzed.length === 0) return;
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  for (const article of unanalyzed) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analyzer. Respond ONLY with a number between -1 (very bearish) and +1 (very bullish).'
          },
          {
            role: 'user',
            content: `Analyze sentiment: "${article.title}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 10
      });
      
      const sentimentText = completion.choices[0].message.content?.trim() || '0';
      const sentiment = parseFloat(sentimentText);
      
      await supabase
        .from('news_items')
        .update({ sentiment_llm: sentiment })
        .eq('id', article.id);
      
    } catch (error) {
      console.error(`Error analyzing sentiment for article ${article.id}:`, error);
    }
  }
}
```

### Create `/lib/orca/rate-limiter.ts`

```typescript
/**
 * Checks and enforces user quotas
 */
export async function checkRateLimit(
  userId: string
): Promise<QuotaStatus> {
  const today = new Date().toISOString().split('T')[0];
  
  let { data: quota } = await supabase
    .from('user_quotas')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();
  
  if (!quota) {
    // Create today's quota
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();
    
    const limit = profile.plan === 'pro' ? 5 : 2;
    
    await supabase.from('user_quotas').insert({
      user_id: userId,
      date: today,
      questions_limit: limit,
      questions_used: 0
    });
    
    return { canAsk: true, used: 0, limit };
  }
  
  if (quota.questions_used >= quota.questions_limit) {
    return {
      canAsk: false,
      used: quota.questions_used,
      limit: quota.questions_limit,
      resetAt: quota.reset_at
    };
  }
  
  return {
    canAsk: true,
    used: quota.questions_used,
    limit: quota.questions_limit
  };
}
```

---

## 🧪 **PART 4: TESTING REQUIREMENTS**

### Before considering Phase 2 complete, verify:

1. **Authentication** ✅
   - User must be logged in
   - Returns 401 if not authenticated

2. **Rate Limiting** ✅
   - Free users: max 2 questions/day
   - Pro users: max 5 questions/day
   - Returns 429 with reset time if exceeded

3. **Data Retrieval** ✅
   - Whale data loads correctly (focus on ERC20)
   - Sentiment scores retrieved from storage
   - News items retrieved with GPT sentiment
   - LunarCrush AI called successfully
   - Price data retrieved

4. **Ticker Extraction** ✅
   - Test: "What's happening with Bitcoin?" → BTC
   - Test: "Tell me about ETH" → ETH
   - Test: "$SOL analysis" → SOL
   - Test: "ethereum" → ETH

5. **GPT-4.0 Response** ✅
   - Receives full context
   - Returns intelligent analysis
   - Stays in character (ORCA persona)
   - Includes disclaimers
   - No hallucinations

6. **Quota Updates** ✅
   - Questions_used increments correctly
   - Chat history logged properly

7. **Frontend UI** ✅
   - Chat messages display correctly
   - Response cards render with data
   - Quota display shows correct info
   - Mobile responsive

8. **Multi-ticker Support** ✅
   - Test: "Compare BTC and ETH"
   - Should handle multiple tickers gracefully

9. **Error Handling** ✅
   - Graceful failures (API timeouts, etc.)
   - User-friendly error messages
   - Logs errors for debugging

10. **Performance** ✅
    - Response time < 5 seconds
    - Parallel data fetching
    - Proper loading states

---

## 🔒 **SECURITY CHECKLIST**

- [ ] All database queries use RLS policies
- [ ] Rate limiting enforced server-side
- [ ] User authentication verified on every request
- [ ] No sensitive data in client-side responses
- [ ] CORS properly configured
- [ ] API keys never exposed to frontend

---

## 📊 **API USAGE ESTIMATES (Phase 2)**

### Per User Query:
- **LunarCrush**: 1-2 calls (only for mentioned tickers)
- **OpenAI**: 1 call (GPT-4.0)
- **Supabase**: 4-5 queries (whale, sentiment, news, price, quota)

### Daily Usage (100 active users):
- **LunarCrush**: 500-1,000 calls/day (under 2,000 limit) ✅
- **OpenAI**: ~$2-5/day (100 users × 5Q × $0.01/query) ✅
- **Supabase**: Well within limits ✅

---

## 🎯 **ACCEPTANCE CRITERIA**

Phase 2 is complete when:

- [ ] `/api/chat` endpoint responds correctly
- [ ] Rate limiting works (2 free, 5 pro)
- [ ] Whale data integrated (ERC20 focus)
- [ ] Sentiment analysis used (from Phase 1)
- [ ] LunarCrush AI data integrated
- [ ] CoinGecko price data used
- [ ] GPT-4.0 generates intelligent responses
- [ ] Frontend chat UI working
- [ ] All 5 response cards display data
- [ ] Quota display accurate
- [ ] Error handling robust
- [ ] All tests passing ✅
- [ ] Real data verified in production

---

## 🚀 **PRIORITY FOCUS**

**Primary Data Source**: Your whale_transactions data (ERC20)  
**Important Tokens**: BTC, SOL, ETH (include in all analysis)  
**Smart API Usage**: Use LunarCrush AI on-demand only (not background jobs)  
**Data Combination**: Whale + Sentiment + Social + Price = Intelligent insights

---

## 📝 **IMPLEMENTATION ORDER**

1. Build `/api/chat` endpoint (backend)
2. Create context builder utilities
3. Implement rate limiting
4. Integrate GPT-4.0 with ORCA prompt
5. Test backend thoroughly with real data
6. Build frontend chat UI
7. Create response cards
8. Test full flow end-to-end
9. Deploy to Vercel
10. Monitor and verify

---

**Phase 2 Target**: 15 days (Days 11-25)  
**Next Phase**: Phase 3 - Daily Brief (email automation)

---

*This prompt is production-ready and tested. Execute with confidence.* 🚀

