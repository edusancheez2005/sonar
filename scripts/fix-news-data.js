/**
 * Clear bad "Untitled" news and fetch fresh data
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixNewsData() {
  console.log('🧹 Clearing bad "Untitled" news...\n')
  
  // Delete all news with title "Untitled" or empty URLs
  const { data: deleted, error: deleteError } = await supabase
    .from('news_items')
    .delete()
    .or('title.eq.Untitled,url.is.null')
  
  if (deleteError) {
    console.error('❌ Error deleting:', deleteError)
  } else {
    console.log('✅ Cleared bad news entries')
  }
  
  console.log('\n📡 Fetching fresh news for ETH from LunarCrush AI...\n')
  
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
  const matches = newsText.matchAll(pattern)
  
  let savedCount = 0
  for (const match of matches) {
    const title = match[1].trim()
    const url = match[2].trim()
    const published_at = match[3]
    
    if (!title || !url || title === 'Untitled') continue
    
    const { error: insertError } = await supabase
      .from('news_items')
      .upsert({
        source: 'lunarcrush',
        external_id: url,
        ticker: 'ETH',
        title,
        url,
        published_at,
        sentiment_raw: sentiment_pct ? sentiment_pct / 100 : null
      }, {
        onConflict: 'external_id',
        ignoreDuplicates: false
      })
    
    if (!insertError) {
      savedCount++
      console.log(`✅ ${savedCount}. ${title.substring(0, 60)}...`)
    }
  }
  
  console.log(`\n🎉 Success! Saved ${savedCount} news articles with proper titles and URLs!`)
}

fixNewsData()

