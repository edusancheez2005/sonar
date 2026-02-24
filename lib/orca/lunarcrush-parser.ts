/**
 * PHASE 2 - ORCA AI: LunarCrush AI Parser
 * Parses LunarCrush AI HTML responses and fetches fresh data on-demand
 */

import OpenAI from 'openai'

interface LunarCrushData {
  sentiment_pct: number | null
  interactions: number | null
  mentions: number | null
  creators: number | null
  supportive_themes: string[]
  critical_themes: string[]
  top_news: NewsItem[]
  top_creators: Creator[]
}

interface NewsItem {
  title: string
  url: string
  published_at: string
}

interface Creator {
  name: string
  rank: number
  followers: number
  posts: number
  engagements: number
}

/**
 * Parse LunarCrush AI HTML response
 * Extracts sentiment, themes, metrics from markdown-formatted HTML
 */
export function parseLunarCrushAI(html: string): LunarCrushData {
  // Extract sentiment (e.g., "### Sentiment: 84%")
  const sentimentMatch = html.match(/###\s*Sentiment:\s*(\d+)%/i)
  const sentiment_pct = sentimentMatch ? parseInt(sentimentMatch[1]) : null
  
  // Extract engagements (e.g., "### Engagements: 111,561,086 (24h)")
  const engagementsMatch = html.match(/###\s*Engagements:\s*([\d,]+)/i)
  const interactions = engagementsMatch 
    ? parseInt(engagementsMatch[1].replace(/,/g, '')) 
    : null
  
  // Extract mentions (e.g., "### Mentions: 169,821 (24h)")
  const mentionsMatch = html.match(/###\s*Mentions:\s*([\d,]+)/i)
  const mentions = mentionsMatch 
    ? parseInt(mentionsMatch[1].replace(/,/g, '')) 
    : null
  
  // Extract creators (e.g., "### Creators: 50,184 (24h)")
  const creatorsMatch = html.match(/###\s*Creators:\s*([\d,]+)/i)
  const creators = creatorsMatch 
    ? parseInt(creatorsMatch[1].replace(/,/g, '')) 
    : null
  
  // Extract supportive themes
  const supportiveSection = html.match(/Most Supportive Themes:([\s\S]*?)(?:Most Critical Themes:|###|$)/i)
  const supportive_themes = supportiveSection 
    ? extractThemes(supportiveSection[1]) 
    : []
  
  // Extract critical themes
  const criticalSection = html.match(/Most Critical Themes:([\s\S]*?)(?:###|$)/i)
  const critical_themes = criticalSection 
    ? extractThemes(criticalSection[1]) 
    : []
  
  // Extract top news
  const newsSection = html.match(/###\s*Top[\s\S]*?News[\s\S]*?\n([\s\S]*?)(?:###|$)/i)
  const top_news = newsSection 
    ? extractTopNews(newsSection[1]) 
    : []
  
  // Extract top creators
  const creatorsSection = html.match(/The most influential creators[\s\S]*?\n([\s\S]*?)(?:\[View More\]|###|$)/i)
  const top_creators = creatorsSection 
    ? extractTopCreators(creatorsSection[1]) 
    : []
  
  return {
    sentiment_pct,
    interactions,
    mentions,
    creators,
    supportive_themes,
    critical_themes,
    top_news,
    top_creators
  }
}

/**
 * Extract themes from text section
 */
function extractThemes(text: string): string[] {
  const themes: string[] = []
  
  // Match pattern: "- Theme Name: (XX%) Description"
  const matches = Array.from(text.matchAll(/-\s*([\s\S]*?):\s*\((\d+)%\)\s*([\s\S]*?)(?=\n-|\n\n|$)/g))
  
  for (const match of matches) {
    const themeName = match[1].trim()
    const percentage = match[2]
    const description = match[3].trim()
    
    themes.push(`${themeName} (${percentage}%): ${description}`)
  }
  
  return themes
}

/**
 * Extract top news items
 * Format:
 * "Title"  
 * [News Link](url) [@Creator](/path) timestamp followers, engagements
 */
function extractTopNews(text: string): NewsItem[] {
  const news: NewsItem[] = []
  
  // Match pattern across lines:
  // Line 1: "Title"
  // Line 2: [News Link](url) ... timestamp
  const matches = Array.from(text.matchAll(/"([^"]+)"\s+\[News Link\]\(([^)]+)\)[^\n]*?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z?)/g))
  
  for (const match of matches) {
    const title = match[1].trim()
    const url = match[2].trim()
    const timestamp = match[3]
    
    // Only add if we have a real title and URL
    if (title && url && title !== 'Untitled') {
      news.push({
        title,
        url,
        published_at: timestamp.includes('T') ? timestamp : `${timestamp}T00:00:00Z`
      })
    }
  }
  
  return news.slice(0, 10) // Top 10
}

/**
 * Extract top creators
 */
function extractTopCreators(text: string): Creator[] {
  const creators: Creator[] = []
  
  // Match pattern: | [@name]... | rank | followers | posts | engagements |
  const matches = Array.from(text.matchAll(/\|\s*\[@(\w+)\][\s\S]*?\|\s*(\d+)\s*\|\s*([\d,]+)\s*\|\s*(\d+)\s*\|\s*([\d,]+)\s*\|/g))
  
  for (const match of matches) {
    creators.push({
      name: match[1],
      rank: parseInt(match[2]),
      followers: parseInt(match[3].replace(/,/g, '')),
      posts: parseInt(match[4]),
      engagements: parseInt(match[5].replace(/,/g, ''))
    })
  }
  
  return creators.slice(0, 5) // Top 5
}

/**
 * Fetch fresh news from LunarCrush AI endpoint and save to DB
 * Called when < 3 articles found in database for a ticker
 */
export async function fetchFreshLunarCrushData(
  ticker: string,
  supabase: any
): Promise<void> {
  const apiKey = process.env.LUNARCRUSH_API_KEY
  
  if (!apiKey) {
    console.error('LUNARCRUSH_API_KEY not configured')
    return
  }
  
  try {
    console.log(`📡 Fetching fresh LunarCrush AI data for ${ticker}...`)
    
    // Fetch from LunarCrush AI endpoint
    const response = await fetch(
      `https://lunarcrush.ai/topic/${ticker.toLowerCase()}`,
      {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'text/html,text/markdown'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`LunarCrush AI error: ${response.status} ${response.statusText}`)
    }
    
    const html = await response.text()
    const parsedData = parseLunarCrushAI(html)
    
    console.log(`✅ Parsed LunarCrush data: ${parsedData.top_news.length} news items`)
    
    // Save top news to database
    let savedCount = 0
    for (const newsItem of parsedData.top_news) {
      try {
        // Check if article already exists by URL
        const { data: existing } = await supabase
          .from('news_items')
          .select('id')
          .eq('url', newsItem.url)
          .single()
        
        if (existing) {
          // Update existing article
          const { error } = await supabase
            .from('news_items')
            .update({
              title: newsItem.title,
              sentiment_raw: parsedData.sentiment_pct ? parsedData.sentiment_pct / 100 : null,
              metadata: {
                source_type: 'lunarcrush_ai',
                social_sentiment: parsedData.sentiment_pct,
                engagements: parsedData.interactions,
                mentions: parsedData.mentions,
                creators: parsedData.creators,
                supportive_themes: parsedData.supportive_themes,
                critical_themes: parsedData.critical_themes,
                fetched_at: new Date().toISOString()
              }
            })
            .eq('id', existing.id)
          
          if (!error) savedCount++
        } else {
          // Insert new article
          const { error } = await supabase
            .from('news_items')
            .insert({
              source: 'lunarcrush_ai',
              external_id: newsItem.url,
              ticker: ticker.toUpperCase(),
              title: newsItem.title,
              url: newsItem.url,
              published_at: newsItem.published_at,
              sentiment_raw: parsedData.sentiment_pct ? parsedData.sentiment_pct / 100 : null,
              metadata: {
                source_type: 'lunarcrush_ai',
                social_sentiment: parsedData.sentiment_pct,
                engagements: parsedData.interactions,
                mentions: parsedData.mentions,
                creators: parsedData.creators,
                supportive_themes: parsedData.supportive_themes,
                critical_themes: parsedData.critical_themes,
                fetched_at: new Date().toISOString()
              }
            })
          
          if (!error) savedCount++
        }
      } catch (insertError) {
        console.error(`Error saving news item:`, insertError)
      }
    }
    
    console.log(`✅ Saved ${savedCount}/${parsedData.top_news.length} fresh articles for ${ticker}`)
    
    // Trigger immediate sentiment analysis for new articles
    await analyzeFreshSentiment(ticker, supabase)
    
  } catch (error) {
    console.error(`Error fetching fresh LunarCrush data for ${ticker}:`, error)
  }
}

/**
 * Analyze sentiment for fresh news articles using GPT-4o-mini
 */
async function analyzeFreshSentiment(ticker: string, supabase: any): Promise<void> {
  try {
    // Get articles without LLM sentiment
    const { data: unanalyzed } = await supabase
      .from('news_items')
      .select('id, title')
      .eq('ticker', ticker.toUpperCase())
      .is('sentiment_llm', null)
      .limit(10)
    
    if (!unanalyzed || unanalyzed.length === 0) {
      console.log(`No unanalyzed articles for ${ticker}`)
      return
    }
    
    console.log(`🤖 Analyzing ${unanalyzed.length} articles with GPT-4o-mini...`)
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    let analyzedCount = 0
    for (const article of unanalyzed) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a sentiment analyzer. Respond ONLY with a number between -1 (very bearish) and +1 (very bullish). No explanations.'
            },
            {
              role: 'user',
              content: `Analyze sentiment: "${article.title}"`
            }
          ],
          temperature: 0.3,
          max_tokens: 10
        })
        
        const sentimentText = completion.choices[0].message.content?.trim() || '0'
        const sentiment = parseFloat(sentimentText)
        
        // Validate sentiment is in range
        const validSentiment = Math.max(-1, Math.min(1, sentiment))
        
        await supabase
          .from('news_items')
          .update({ sentiment_llm: validSentiment })
          .eq('id', article.id)
        
        analyzedCount++
      } catch (error) {
        console.error(`Error analyzing sentiment for article ${article.id}:`, error)
      }
    }
    
    console.log(`✅ Analyzed ${analyzedCount}/${unanalyzed.length} articles`)
    
  } catch (error) {
    console.error(`Error in analyzeFreshSentiment for ${ticker}:`, error)
  }
}

/**
 * Check if we need to fetch fresh data for a ticker
 * Returns true if < 3 articles in last 24h
 */
export async function needsFreshData(ticker: string, supabase: any): Promise<boolean> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { count } = await supabase
      .from('news_items')
      .select('*', { count: 'exact', head: true })
      .eq('ticker', ticker.toUpperCase())
      .gte('published_at', twentyFourHoursAgo)
    
    return (count ?? 0) < 3
  } catch (error) {
    console.error('Error checking if fresh data needed:', error)
    return false // Default to using cached data
  }
}

