/**
 * Test LunarCrush /news API endpoint directly
 * Verify it returns data in the expected format
 */

require('dotenv').config({ path: '.env.local' })

async function testLunarCrushNews() {
  const LUNARCRUSH_KEY = process.env.LUNARCRUSH_API_KEY
  
  if (!LUNARCRUSH_KEY) {
    console.error('❌ LUNARCRUSH_API_KEY not found in .env.local')
    process.exit(1)
  }

  console.log('🧪 Testing LunarCrush News API\n')
  console.log('='.repeat(50))
  
  const tickers = ['bitcoin', 'ethereum', 'solana', 'dai']
  
  for (const ticker of tickers) {
    console.log(`\n📊 Testing ${ticker.toUpperCase()}...`)
    
    try {
      const url = `https://lunarcrush.com/api4/public/topic/${ticker}/news/v1`
      console.log(`  URL: ${url}`)
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${LUNARCRUSH_KEY}` }
      })
      
      console.log(`  Status: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        console.error(`  ❌ API Error`)
        continue
      }
      
      const result = await response.json()
      const articles = result.data || []
      
      console.log(`  ✅ Found ${articles.length} articles`)
      
      if (articles.length > 0) {
        const first = articles[0]
        console.log(`  📰 Sample Article:`)
        console.log(`     Title: "${first.post_title?.substring(0, 60)}..."`)
        console.log(`     URL: ${first.post_link}`)
        console.log(`     Published: ${new Date(first.post_created * 1000).toLocaleString()}`)
        console.log(`     Sentiment: ${first.post_sentiment} (1-5 scale)`)
        console.log(`     Source: ${first.creator_name}`)
        console.log(`     Interactions: ${first.interactions_24h}`)
      }
      
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`)
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('✅ Test complete!')
}

testLunarCrushNews()

