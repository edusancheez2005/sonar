/**
 * Check what news data is actually in the database
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkNewsData() {
  console.log('📰 Checking news data for ETH...\n')
  
  const { data, error } = await supabase
    .from('news_items')
    .select('title, url, source, published_at')
    .eq('ticker', 'ETH')
    .order('published_at', { ascending: false })
    .limit(5)
  
  if (error) {
    console.error('❌ Error:', error)
    return
  }
  
  console.log(`Found ${data.length} articles:\n`)
  
  data.forEach((article, i) => {
    console.log(`${i + 1}. Title: "${article.title || 'EMPTY'}"`)
    console.log(`   URL: ${article.url || 'EMPTY'}`)
    console.log(`   Source: ${article.source}`)
    console.log(`   Published: ${article.published_at}`)
    console.log('')
  })
}

checkNewsData()

