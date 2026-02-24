/**
 * PHASE 1 - CRON JOB 3: Sentiment Aggregation
 * Schedule: Every hour
 * Purpose: Calculate hourly aggregated sentiment scores by ticker
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface NewsAggregation {
  ticker: string
  provider_sentiment_avg: number | null
  llm_sentiment_avg: number | null
  news_count: number
  provider_sentiment_count: number
  llm_sentiment_count: number
  positive_count: number
  negative_count: number
  neutral_count: number
}

export async function GET(request: Request) {
  try {
    // Authenticate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    )

    // Get news items from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: newsItems, error: fetchError } = await supabase
      .from('news_items')
      .select('ticker, sentiment_raw, sentiment_llm')
      .gte('fetched_at', oneDayAgo)

    if (fetchError) {
      throw new Error(`Failed to fetch news items: ${fetchError.message}`)
    }

    if (!newsItems || newsItems.length === 0) {
      console.log('✅ No news items to aggregate')
      return NextResponse.json({
        success: true,
        aggregated: 0,
        message: 'No news items in last 24 hours'
      })
    }

    // Group by ticker and calculate aggregates
    const aggregations = aggregateByTicker(newsItems)

    console.log(`📊 Aggregating sentiment for ${aggregations.length} tickers`)

    let totalInserted = 0
    const errors: string[] = []

    // Insert aggregated scores
    for (const agg of aggregations) {
      try {
        // Calculate weighted aggregated score (60% LLM + 40% provider)
        let aggregatedScore: number | null = null
        
        if (agg.llm_sentiment_avg !== null && agg.provider_sentiment_avg !== null) {
          aggregatedScore = (agg.llm_sentiment_avg * 0.6) + (agg.provider_sentiment_avg * 0.4)
        } else if (agg.llm_sentiment_avg !== null) {
          aggregatedScore = agg.llm_sentiment_avg
        } else if (agg.provider_sentiment_avg !== null) {
          aggregatedScore = agg.provider_sentiment_avg
        }

        // Calculate confidence based on sample size
        // More articles = higher confidence, max out at 10 articles
        const confidence = Math.min(agg.news_count / 10, 1.0)

        const { error: insertError } = await supabase
          .from('sentiment_scores')
          .insert({
            ticker: agg.ticker,
            timestamp: new Date().toISOString(),
            provider_sentiment_avg: agg.provider_sentiment_avg,
            llm_sentiment_avg: agg.llm_sentiment_avg,
            aggregated_score: aggregatedScore,
            news_count_24h: agg.news_count,
            positive_count: agg.positive_count,
            negative_count: agg.negative_count,
            neutral_count: agg.neutral_count,
            confidence: confidence
          })

        if (insertError) {
          // Ignore duplicate key errors (already aggregated this hour)
          if (!insertError.message.includes('duplicate key')) {
            errors.push(`Failed to insert ${agg.ticker}: ${insertError.message}`)
          }
        } else {
          totalInserted++
        }

      } catch (insertErr) {
        errors.push(`Insert error for ${agg.ticker}: ${insertErr}`)
      }
    }

    console.log(`✅ Sentiment aggregation complete: ${totalInserted} tickers inserted`)
    
    if (errors.length > 0) {
      console.error(`⚠️ Encountered ${errors.length} errors:`, errors.slice(0, 5))
    }

    return NextResponse.json({
      success: true,
      aggregated: totalInserted,
      tickers: aggregations.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    })

  } catch (error) {
    console.error('Fatal error in sentiment aggregation:', error)
    return NextResponse.json(
      { 
        error: 'Sentiment aggregation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Aggregate news items by ticker
 */
function aggregateByTicker(newsItems: any[]): NewsAggregation[] {
  const tickerMap = new Map<string, NewsAggregation>()

  for (const item of newsItems) {
    const ticker = item.ticker

    if (!tickerMap.has(ticker)) {
      tickerMap.set(ticker, {
        ticker,
        provider_sentiment_avg: null,
        llm_sentiment_avg: null,
        news_count: 0,
        provider_sentiment_count: 0,
        llm_sentiment_count: 0,
        positive_count: 0,
        negative_count: 0,
        neutral_count: 0
      })
    }

    const agg = tickerMap.get(ticker)!

    // Count news items
    agg.news_count++

    // Aggregate provider sentiment
    if (item.sentiment_raw !== null && typeof item.sentiment_raw === 'number') {
      agg.provider_sentiment_count++
      if (agg.provider_sentiment_avg === null) {
        agg.provider_sentiment_avg = item.sentiment_raw
      } else {
        // Running average using provider-specific count
        agg.provider_sentiment_avg = 
          (agg.provider_sentiment_avg * (agg.provider_sentiment_count - 1) + item.sentiment_raw) / agg.provider_sentiment_count
      }
    }

    // Aggregate LLM sentiment
    if (item.sentiment_llm !== null && typeof item.sentiment_llm === 'number') {
      agg.llm_sentiment_count++
      if (agg.llm_sentiment_avg === null) {
        agg.llm_sentiment_avg = item.sentiment_llm
      } else {
        // Running average using llm-specific count
        agg.llm_sentiment_avg = 
          (agg.llm_sentiment_avg * (agg.llm_sentiment_count - 1) + item.sentiment_llm) / agg.llm_sentiment_count
      }

      // Categorize sentiment
      if (item.sentiment_llm > 0.2) {
        agg.positive_count++
      } else if (item.sentiment_llm < -0.2) {
        agg.negative_count++
      } else {
        agg.neutral_count++
      }
    }
  }

  return Array.from(tickerMap.values())
}

