/**
 * Clear bad news and insert fresh data (simpler version)
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixNewsData() {
  console.log('🧹 Step 1: Clearing ALL news for ETH...\n')
  
  const { error: deleteError } = await supabase
    .from('news_items')
    .delete()
    .eq('ticker', 'ETH')
  
  if (deleteError) {
    console.error('❌ Error deleting:', deleteError)
    return
  }
  
  console.log('✅ Cleared all ETH news\n')
  console.log('📡 Step 2: Fetching fresh news from LunarCrush AI...\n')
  
  const apiKey = process.env.LUNARCRUSH_API_KEY
  
  const response = await fetch('https://lunarcrush.ai/topic/ethereum', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'text/html,text/markdown'
    }
  })
  
  const html = await response.text()
  
  // Parse sentiment
  const sentimentMatch = html.match(/###\s*Sentiment:\s*(\d+)%/i)
  const sentiment_pct = sentimentMatch ? parseInt(sentimentMatch[1]) : null
  
  // Extract news
  const newsMatch = html.match(/###\s*Top.*?News.*?\n(.*?)(?:###|$)/is)
  
  if (!newsMatch) {
    console.log('❌ No news section found')
    return
  }
  
  const newsText = newsMatch[1]
  const pattern = /"([^"]+)"\s+\[News Link\]\(([^)]+)\)[^\n]*?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z?)/gs
  const matches = [...newsText.matchAll(pattern)]
  
  console.log(`Found ${matches.length} articles to save\n`)
  
  let savedCount = 0
  for (const match of matches) {
    const title = match[1].trim()
    const url = match[2].trim()
    const published_at = match[3]
    
    if (!title || !url || title === 'Untitled') {
      console.log(`⏭️  Skipping invalid article`)
      continue
    }
    
    // Simple insert (no upsert)
    const { error: insertError } = await supabase
      .from('news_items')
      .insert({
        source: 'lunarcrush',
        external_id: url, // Use URL as external ID
        ticker: 'ETH',
        title,
        url,
        published_at,
        sentiment_raw: sentiment_pct ? sentiment_pct / 100 : null
      })
    
    if (insertError) {
      console.log(`❌ Error saving: ${insertError.message}`)
    } else {
      savedCount++
      console.log(`✅ ${savedCount}. ${title.substring(0, 70)}...`)
    }
  }
  
  console.log(`\n🎉 Success! Saved ${savedCount}/${matches.length} articles!`)
}

fixNewsData()

