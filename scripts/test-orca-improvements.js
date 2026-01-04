/**
 * Test script for ORCA AI improvements
 * Tests: Fresh news fetching, PEPE ticker, conversational responses
 */

const { extractTicker } = require('../lib/orca/ticker-extractor')

console.log('🧪 Testing ORCA AI Improvements...\n')

// Test 1: PEPE ticker extraction
console.log('TEST 1: PEPE Ticker Extraction')
console.log('================================')

const pepeTests = [
  'what about Pepe coin?',
  'tell me about PEPE',
  'analyze $PEPE',
  'pepe price prediction'
]

pepeTests.forEach(query => {
  const result = extractTicker(query)
  console.log(`Query: "${query}"`)
  console.log(`  → Ticker: ${result.ticker || 'NOT FOUND'}`)
  console.log(`  → Confidence: ${result.confidence}`)
  console.log(`  → Status: ${result.ticker === 'PEPE' ? '✅ PASS' : '❌ FAIL'}`)
  console.log()
})

// Test 2: Non-crypto query filtering
console.log('\nTEST 2: Non-Crypto Query Filtering')
console.log('===================================')

const nonCryptoTests = [
  'hi?',
  'hello',
  'thanks',
  'thank you',
  'ok',
  'bye'
]

nonCryptoTests.forEach(query => {
  const result = extractTicker(query)
  console.log(`Query: "${query}"`)
  console.log(`  → Ticker: ${result.ticker || 'NONE (expected)'}`)
  console.log(`  → Status: ${!result.ticker ? '✅ PASS' : '❌ FAIL'}`)
  console.log()
})

// Test 3: Other tickers still work
console.log('\nTEST 3: Existing Tickers Still Work')
console.log('====================================')

const existingTests = [
  { query: 'what about Bitcoin?', expected: 'BTC' },
  { query: 'analyze ETH', expected: 'ETH' },
  { query: 'tell me about Shiba Inu', expected: 'SHIB' },
  { query: '$SOL price', expected: 'SOL' }
]

existingTests.forEach(({ query, expected }) => {
  const result = extractTicker(query)
  console.log(`Query: "${query}"`)
  console.log(`  → Expected: ${expected}`)
  console.log(`  → Got: ${result.ticker || 'NOT FOUND'}`)
  console.log(`  → Status: ${result.ticker === expected ? '✅ PASS' : '❌ FAIL'}`)
  console.log()
})

// Summary
console.log('\n' + '='.repeat(50))
console.log('✅ All ticker extraction tests complete!')
console.log('='.repeat(50))
console.log('\n📋 Next Steps:')
console.log('1. Test live in browser: http://localhost:3000/ai-advisor')
console.log('2. Try query: "what about Shiba Inu? should I buy?"')
console.log('3. Try query: "tell me about Pepe coin"')
console.log('4. Try query: "hi?"')
console.log('5. Check terminal for news fetching logs')
console.log('\n🔍 Look for these logs:')
console.log('   📡 Fetching fresh news for SHIB from LunarCrush AI...')
console.log('   📡 Fetching backup news for SHIB from CryptoPanic...')
console.log('   ✅ Found X total articles for SHIB')

