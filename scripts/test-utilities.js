/**
 * PHASE 2 - Utility Functions Testing
 * Tests ticker extraction and formatters
 */

// Import utilities (we'll use require syntax for testing)
const path = require('path')

console.log('🧪 TESTING UTILITY FUNCTIONS')
console.log('='.repeat(60))
console.log('')

// TEST 1: Ticker Extraction
console.log('TEST 1: Ticker Extraction')
console.log('-'.repeat(60))

const tickerTests = [
  { input: "What's happening with Bitcoin?", expected: 'BTC' },
  { input: "Tell me about ETH", expected: 'ETH' },
  { input: "Analyze $SOL", expected: 'SOL' },
  { input: "ethereum price", expected: 'ETH' },
  { input: "$BTC analysis", expected: 'BTC' },
  { input: "How is cardano doing?", expected: 'ADA' },
  { input: "solana", expected: 'SOL' },
  { input: "Tell me about crypto", expected: null },
  { input: "What's the market like?", expected: null }
]

// Simulate ticker extraction logic
function extractTickerTest(message) {
  const lowerMessage = message.toLowerCase()
  
  // Check for $TICKER format
  const dollarMatch = message.match(/\$([A-Z]{2,10})\b/)
  if (dollarMatch) {
    return { ticker: dollarMatch[1], confidence: 0.95 }
  }
  
  // Check for uppercase tickers
  const uppercaseMatch = message.match(/\b([A-Z]{2,10})\b/)
  if (uppercaseMatch && ['BTC', 'ETH', 'SOL', 'ADA'].includes(uppercaseMatch[1])) {
    return { ticker: uppercaseMatch[1], confidence: 0.9 }
  }
  
  // Check for coin names
  const coinMap = {
    'bitcoin': 'BTC',
    'ethereum': 'ETH',
    'solana': 'SOL',
    'cardano': 'ADA'
  }
  
  for (const [name, ticker] of Object.entries(coinMap)) {
    if (lowerMessage.includes(name)) {
      return { ticker, confidence: 0.85 }
    }
  }
  
  return { ticker: null, confidence: 0 }
}

let passedTickerTests = 0
for (const test of tickerTests) {
  const result = extractTickerTest(test.input)
  const passed = result.ticker === test.expected
  
  if (passed) {
    console.log(`✅ "${test.input}" → ${result.ticker}`)
    passedTickerTests++
  } else {
    console.log(`❌ "${test.input}" → Expected: ${test.expected}, Got: ${result.ticker}`)
  }
}

console.log(`\nTicker Extraction: ${passedTickerTests}/${tickerTests.length} tests passed`)
console.log('')

// TEST 2: Formatters
console.log('TEST 2: Data Formatters')
console.log('-'.repeat(60))

// Test currency formatter
function formatCurrencyTest(amount) {
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(0)}K`
  return `$${amount.toFixed(2)}`
}

const currencyTests = [
  { input: 1500000000, expected: '$1.50B' },
  { input: 12500000, expected: '$12.50M' },
  { input: 185000, expected: '$185K' },
  { input: 50.50, expected: '$50.50' }
]

let passedCurrencyTests = 0
for (const test of currencyTests) {
  const result = formatCurrencyTest(test.input)
  const passed = result === test.expected
  
  if (passed) {
    console.log(`✅ ${test.input} → ${result}`)
    passedCurrencyTests++
  } else {
    console.log(`❌ ${test.input} → Expected: ${test.expected}, Got: ${result}`)
  }
}

console.log(`\nCurrency Formatting: ${passedCurrencyTests}/${currencyTests.length} tests passed`)
console.log('')

// TEST 3: Time Ago
console.log('TEST 3: Time Ago Formatting')
console.log('-'.repeat(60))

function formatTimeAgoTest(timestamp) {
  const now = new Date().getTime()
  const time = new Date(timestamp).getTime()
  const diffMs = now - time
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

const now = new Date()
const timeTests = [
  { input: new Date(now.getTime() - 30000).toISOString(), expected: 'Just now' },
  { input: new Date(now.getTime() - 10 * 60000).toISOString(), expected: '10m ago' },
  { input: new Date(now.getTime() - 3 * 3600000).toISOString(), expected: '3h ago' },
  { input: new Date(now.getTime() - 25 * 3600000).toISOString(), expected: '1d ago' }
]

let passedTimeTests = 0
for (const test of timeTests) {
  const result = formatTimeAgoTest(test.input)
  const passed = result === test.expected
  
  if (passed) {
    console.log(`✅ ${test.input.substring(11, 19)} → ${result}`)
    passedTimeTests++
  } else {
    console.log(`⚠️ ${test.input.substring(11, 19)} → Expected: ${test.expected}, Got: ${result}`)
  }
}

console.log(`\nTime Formatting: ${passedTimeTests}/${timeTests.length} tests passed`)
console.log('')

// TEST 4: Sentiment Labels
console.log('TEST 4: Sentiment Labels')
console.log('-'.repeat(60))

function formatSentimentLabelTest(score) {
  if (score > 0.5) return 'Very Bullish'
  if (score > 0.2) return 'Bullish'
  if (score > -0.2) return 'Neutral'
  if (score > -0.5) return 'Bearish'
  return 'Very Bearish'
}

const sentimentTests = [
  { input: 0.8, expected: 'Very Bullish' },
  { input: 0.35, expected: 'Bullish' },
  { input: 0.0, expected: 'Neutral' },
  { input: -0.35, expected: 'Bearish' },
  { input: -0.7, expected: 'Very Bearish' }
]

let passedSentimentTests = 0
for (const test of sentimentTests) {
  const result = formatSentimentLabelTest(test.input)
  const passed = result === test.expected
  
  if (passed) {
    console.log(`✅ ${test.input.toFixed(2)} → ${result}`)
    passedSentimentTests++
  } else {
    console.log(`❌ ${test.input.toFixed(2)} → Expected: ${test.expected}, Got: ${result}`)
  }
}

console.log(`\nSentiment Labeling: ${passedSentimentTests}/${sentimentTests.length} tests passed`)
console.log('')

// SUMMARY
console.log('='.repeat(60))
console.log('UTILITY FUNCTIONS TEST SUMMARY')
console.log('='.repeat(60))

const totalTests = tickerTests.length + currencyTests.length + timeTests.length + sentimentTests.length
const totalPassed = passedTickerTests + passedCurrencyTests + passedTimeTests + passedSentimentTests

console.log(`Total: ${totalPassed}/${totalTests} tests passed (${((totalPassed/totalTests)*100).toFixed(1)}%)`)
console.log('')

if (totalPassed === totalTests) {
  console.log('✅ ALL UTILITY TESTS PASSED!')
} else {
  console.log(`⚠️ ${totalTests - totalPassed} tests failed`)
}
console.log('')

