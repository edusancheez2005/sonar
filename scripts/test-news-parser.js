/**
 * Test the fixed news parser
 */

require('dotenv').config({ path: '.env.local' })

// Import the parser (will need to compile TypeScript)
async function testParser() {
  const apiKey = process.env.LUNARCRUSH_API_KEY
  
  console.log('📡 Fetching LunarCrush AI HTML for ETH...\n')
  
  const response = await fetch('https://lunarcrush.ai/topic/ethereum', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'text/html,text/markdown'
    }
  })
  
  const html = await response.text()
  
  // Extract news section
  const newsMatch = html.match(/###\s*Top.*?News.*?\n(.*?)(?:###|$)/is)
  
  if (!newsMatch) {
    console.log('❌ No news section found')
    return
  }
  
  const newsText = newsMatch[1]
  
  // Test the regex pattern
  const pattern = /"([^"]+)"\s+\[News Link\]\(([^)]+)\)[^\n]*?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z?)/gs
  const matches = newsText.matchAll(pattern)
  
  console.log('📰 Extracted News:\n')
  
  let count = 0
  for (const match of matches) {
    count++
    console.log(`${count}. "${match[1].trim()}"`)
    console.log(`   URL: ${match[2].trim()}`)
    console.log(`   Time: ${match[3]}`)
    console.log('')
  }
  
  console.log(`✅ Total: ${count} articles extracted`)
}

testParser()

