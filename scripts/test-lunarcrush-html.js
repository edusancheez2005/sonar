/**
 * Fetch LunarCrush AI HTML to see actual format
 */

require('dotenv').config({ path: '.env.local' })

async function fetchSample() {
  const apiKey = process.env.LUNARCRUSH_API_KEY
  
  console.log('📡 Fetching LunarCrush AI HTML for ETH...\n')
  
  const response = await fetch('https://lunarcrush.ai/topic/ethereum', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'text/html,text/markdown'
    }
  })
  
  const html = await response.text()
  
  // Extract just the news section
  const newsMatch = html.match(/###\s*Top.*?News.*?\n(.*?)(?:###|$)/is)
  
  if (newsMatch) {
    console.log('📰 News Section Found:\n')
    console.log(newsMatch[1].substring(0, 2000)) // First 2000 chars
  } else {
    console.log('❌ No news section found')
    console.log('\n🔍 Full HTML (first 3000 chars):')
    console.log(html.substring(0, 3000))
  }
}

fetchSample()

