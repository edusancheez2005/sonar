/**
 * PHASE 2 - Comprehensive Testing Script
 * Tests all chat functionality
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://fwbwfvqzomipoftgodof.supabase.co'
// Load from environment variables
require('dotenv').config({ path: '.env.local' })
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testPhase2() {
  console.log('🧪 PHASE 2 - COMPREHENSIVE TESTING')
  console.log('=' .repeat(60))
  console.log('')
  
  // TEST 1: Health Check
  console.log('TEST 1: Chat Endpoint Health Check')
  console.log('-'.repeat(60))
  try {
    const response = await fetch('http://localhost:3000/api/chat')
    const data = await response.json()
    console.log('✅ GET /api/chat:', data.status)
    console.log('   Message:', data.message)
  } catch (error) {
    console.log('❌ Health check failed:', error.message)
    return
  }
  console.log('')
  
  // TEST 2: Authentication Required
  console.log('TEST 2: Authentication Check')
  console.log('-'.repeat(60))
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Test' })
    })
    const data = await response.json()
    
    if (response.status === 401) {
      console.log('✅ Correctly returns 401 without auth token')
      console.log('   Error:', data.error)
    } else {
      console.log('⚠️ Expected 401, got:', response.status)
    }
  } catch (error) {
    console.log('❌ Auth test failed:', error.message)
  }
  console.log('')
  
  // TEST 3: Get a valid session
  console.log('TEST 3: Getting Auth Session')
  console.log('-'.repeat(60))
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (!session) {
    console.log('⚠️ No active session found')
    console.log('   Please log in at: http://localhost:3000/auth/signin')
    console.log('   Then run this test again')
    console.log('')
    console.log('TESTS PAUSED - Need authentication')
    return
  }
  
  console.log('✅ Active session found')
  console.log('   User:', session.user.email)
  console.log('   Token:', session.access_token.substring(0, 20) + '...')
  console.log('')
  
  const authToken = session.access_token
  
  // TEST 4: Ticker Extraction - Valid
  console.log('TEST 4: Ticker Extraction (Valid)')
  console.log('-'.repeat(60))
  
  const validQueries = [
    "What's happening with Bitcoin?",
    "Tell me about ETH",
    "Analyze $SOL",
    "ethereum"
  ]
  
  for (const query of validQueries) {
    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ message: query })
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log(`✅ "${query}"`)
        console.log(`   Ticker: ${data.ticker}`)
        console.log(`   Response length: ${data.response.length} chars`)
        console.log(`   Quota: ${data.quota.used}/${data.quota.limit}`)
        
        // Verify data structure
        if (data.data && data.data.whale_summary) {
          console.log(`   Whale txs: ${data.data.whale_summary.transactions}`)
          console.log(`   Net flow: $${(data.data.whale_summary.net_flow / 1e6).toFixed(2)}M`)
        }
        
        // Wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 2000))
      } else {
        console.log(`⚠️ "${query}" - ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.log(`❌ "${query}" - ${error.message}`)
    }
  }
  console.log('')
  
  // TEST 5: Ticker Extraction - Invalid
  console.log('TEST 5: Ticker Extraction (Invalid)')
  console.log('-'.repeat(60))
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ message: 'Tell me about crypto' })
    })
    
    const data = await response.json()
    
    if (data.error && data.error === 'Ticker not found') {
      console.log('✅ Correctly detects missing ticker')
      console.log('   Message:', data.message)
    } else {
      console.log('⚠️ Expected ticker error, got:', data)
    }
  } catch (error) {
    console.log('❌ Invalid ticker test failed:', error.message)
  }
  console.log('')
  
  // TEST 6: Data Fetching Verification
  console.log('TEST 6: Data Source Verification')
  console.log('-'.repeat(60))
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ message: 'What is happening with BTC?' })
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      console.log('✅ Data sources verified:')
      console.log('   Price:', data.data.price ? '✓' : '✗', 
                  data.data.price ? `$${data.data.price.current.toLocaleString()}` : '')
      console.log('   Whale:', data.data.whale_summary ? '✓' : '✗',
                  data.data.whale_summary ? `${data.data.whale_summary.transactions} txs` : '')
      console.log('   Sentiment:', data.data.sentiment ? '✓' : '✗',
                  data.data.sentiment ? `${data.data.sentiment.score.toFixed(2)}` : '')
      console.log('   Social:', data.data.social ? '✓' : '✗',
                  data.data.social ? `${data.data.social.sentiment_pct}%` : '')
      console.log('   News:', data.data.news_headlines ? '✓' : '✗',
                  data.data.news_headlines ? `${data.data.news_headlines.length} articles` : '')
    } else {
      console.log('⚠️ Data verification failed')
    }
  } catch (error) {
    console.log('❌ Data verification failed:', error.message)
  }
  console.log('')
  
  // TEST 7: Rate Limiting
  console.log('TEST 7: Rate Limiting (Checking current quota)')
  console.log('-'.repeat(60))
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ message: 'Quick test of ETH' })
    })
    
    const data = await response.json()
    
    if (data.quota) {
      console.log('✅ Quota tracking working')
      console.log('   Used:', data.quota.used)
      console.log('   Limit:', data.quota.limit)
      console.log('   Remaining:', data.quota.remaining)
      console.log('   Plan:', data.quota.plan || 'free')
      
      if (data.quota.remaining === 0) {
        console.log('⚠️ Rate limit reached - this is expected behavior')
      }
    }
  } catch (error) {
    console.log('❌ Rate limit test failed:', error.message)
  }
  console.log('')
  
  // TEST 8: Chat History Logging
  console.log('TEST 8: Chat History Logging')
  console.log('-'.repeat(60))
  try {
    const supabaseService = createClient(
      SUPABASE_URL,
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3YndmdnF6b21pcG9mdGdvZG9mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzkyNzczMywiZXhwIjoyMDYzNTAzNzMzfQ.L2e_VICxQ_aumt8KmvJaClwK4W2rQLA1QZ3EfvdVYXM'
    )
    
    const { data: chatHistory, error } = await supabaseService
      .from('chat_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (!error && chatHistory) {
      console.log('✅ Chat history table accessible')
      console.log(`   Recent chats: ${chatHistory.length}`)
      if (chatHistory.length > 0) {
        console.log(`   Latest: "${chatHistory[0].user_message.substring(0, 50)}..."`)
        console.log(`   Model: ${chatHistory[0].model}`)
        console.log(`   Tokens: ${chatHistory[0].tokens_used}`)
      }
    } else {
      console.log('⚠️ Chat history check failed:', error?.message)
    }
  } catch (error) {
    console.log('❌ Chat history test failed:', error.message)
  }
  console.log('')
  
  // SUMMARY
  console.log('=' .repeat(60))
  console.log('🎉 PHASE 2 TESTING COMPLETE')
  console.log('=' .repeat(60))
  console.log('')
  console.log('Next steps:')
  console.log('1. Visit http://localhost:3000/chat in your browser')
  console.log('2. Try asking questions about different cryptocurrencies')
  console.log('3. Verify the 5 response cards display correctly')
  console.log('4. Check that quota updates after each question')
  console.log('')
}

testPhase2().catch(console.error)

