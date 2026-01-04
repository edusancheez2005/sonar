/**
 * PHASE 1 - CRON JOB 2: LLM Sentiment Analysis
 * Schedule: Every 12 hours, offset by 30 minutes
 * Purpose: Run GPT-4o-mini on news headlines to generate sentiment_llm scores
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const BATCH_SIZE = 20 // Process 20 articles at a time

interface NewsItem {
  id: string
  title: string
  content?: string
  ticker: string
}

interface SentimentResult {
  id: string
  sentiment: number
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

    // Initialize clients
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Fetch news items without LLM sentiment from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: newsItems, error: fetchError } = await supabase
      .from('news_items')
      .select('id, title, content, ticker')
      .is('sentiment_llm', null)
      .gte('fetched_at', oneDayAgo)
      .order('fetched_at', { ascending: false })
      .limit(200) // Max 200 items per run

    if (fetchError) {
      throw new Error(`Failed to fetch news items: ${fetchError.message}`)
    }

    if (!newsItems || newsItems.length === 0) {
      console.log('✅ No news items to analyze')
      return NextResponse.json({
        success: true,
        analyzed: 0,
        message: 'No pending news items'
      })
    }

    console.log(`📊 Found ${newsItems.length} news items to analyze`)

    let totalAnalyzed = 0
    let totalUpdated = 0
    const errors: string[] = []

    // Process in batches
    for (let i = 0; i < newsItems.length; i += BATCH_SIZE) {
      const batch = newsItems.slice(i, i + BATCH_SIZE)
      
      try {
        const sentimentResults = await analyzeBatchSentiment(batch, openai)
        
        // Update database with sentiment scores
        for (const result of sentimentResults) {
          try {
            const { error: updateError } = await supabase
              .from('news_items')
              .update({ sentiment_llm: result.sentiment })
              .eq('id', result.id)

            if (updateError) {
              errors.push(`Failed to update ${result.id}: ${updateError.message}`)
            } else {
              totalUpdated++
            }
          } catch (updateErr) {
            errors.push(`Update error for ${result.id}: ${updateErr}`)
          }
        }

        totalAnalyzed += batch.length

        // Small delay between batches to avoid rate limits
        await delay(1000)

      } catch (batchError) {
        const errorMsg = `Batch analysis error: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    console.log(`✅ Sentiment analysis complete: ${totalUpdated} items updated (${totalAnalyzed} analyzed)`)
    
    if (errors.length > 0) {
      console.error(`⚠️ Encountered ${errors.length} errors:`, errors.slice(0, 5))
    }

    return NextResponse.json({
      success: true,
      analyzed: totalAnalyzed,
      updated: totalUpdated,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    })

  } catch (error) {
    console.error('Fatal error in sentiment analysis:', error)
    return NextResponse.json(
      { 
        error: 'Sentiment analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Analyze sentiment for a batch of news items using GPT-4o-mini
 */
async function analyzeBatchSentiment(
  items: NewsItem[],
  openai: OpenAI
): Promise<SentimentResult[]> {
  try {
    // Prepare headlines for analysis
    const headlinesList = items.map((item, index) => {
      const text = item.content?.slice(0, 200) || item.title
      return `${index + 1}. [${item.ticker}] ${text}`
    }).join('\n')

    const systemPrompt = `You are a cryptocurrency sentiment analyzer. Your task is to analyze news headlines and rate their sentiment on a scale from -1 (very bearish/negative) to +1 (very bullish/positive).

Consider:
- Positive indicators: "surge", "breakthrough", "adoption", "partnership", "all-time high", "bullish", "growth"
- Negative indicators: "crash", "scam", "hack", "lawsuit", "ban", "bearish", "decline", "plunge"
- Neutral: factual reporting without clear positive/negative implications

IMPORTANT: Respond ONLY with a valid JSON array. No explanations, no markdown, just raw JSON.`

    const userPrompt = `Analyze the sentiment of these crypto news headlines. Respond with ONLY a JSON array in this exact format:
[{"id": 1, "sentiment": 0.75}, {"id": 2, "sentiment": -0.3}, ...]

Headlines:
${headlinesList}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    })

    const responseText = completion.choices[0]?.message?.content?.trim()

    if (!responseText) {
      throw new Error('Empty response from OpenAI')
    }

    // Parse JSON response
    let parsedResults: Array<{ id: number; sentiment: number }>

    try {
      // Remove markdown code blocks if present
      const cleanJson = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      parsedResults = JSON.parse(cleanJson)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText)
      throw new Error('Invalid JSON response from OpenAI')
    }

    // Map results back to item IDs
    const results: SentimentResult[] = []

    for (const result of parsedResults) {
      const itemIndex = result.id - 1 // Convert 1-indexed to 0-indexed
      if (itemIndex >= 0 && itemIndex < items.length) {
        results.push({
          id: items[itemIndex].id,
          sentiment: Math.max(-1, Math.min(1, result.sentiment)) // Clamp to -1 to +1
        })
      }
    }

    return results

  } catch (error) {
    console.error('Batch sentiment analysis error:', error)
    
    // Fallback: assign neutral sentiment to all items
    return items.map(item => ({
      id: item.id,
      sentiment: 0
    }))
  }
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

