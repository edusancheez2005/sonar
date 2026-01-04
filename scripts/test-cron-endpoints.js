/**
 * Phase 1 Cron Endpoints Test Script
 * Tests all 4 cron endpoints locally
 * Usage: node scripts/test-cron-endpoints.js
 */

const CRON_SECRET = 'dffe68424286373c3fd6fd52222701058c21e6b12921506c164d515776e2768b'
const BASE_URL = 'http://localhost:3000'

const endpoints = [
  { name: '1️⃣  News Ingestion', path: '/api/cron/ingest-news' },
  { name: '2️⃣  Sentiment Analysis', path: '/api/cron/analyze-sentiment' },
  { name: '3️⃣  Sentiment Aggregation', path: '/api/cron/aggregate-sentiment' },
  { name: '4️⃣  Price Snapshots', path: '/api/cron/fetch-prices' }
]

async function testEndpoint(name, path, withAuth = true) {
  console.log(`\n🧪 Testing: ${name}`)
  console.log(`Endpoint: ${BASE_URL}${path}`)
  console.log('')

  try {
    const headers = withAuth ? { 'Authorization': `Bearer ${CRON_SECRET}` } : {}
    
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ SUCCESS (HTTP ${response.status})`)
      console.log('Response:')
      console.log(JSON.stringify(data, null, 2))
    } else {
      console.log(`❌ FAILED (HTTP ${response.status})`)
      console.log('Response:')
      console.log(JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`)
  }

  console.log('\n---')
}

async function runTests() {
  console.log('🧪 Testing Phase 1 Cron Endpoints')
  console.log('==================================\n')

  // Test 0: Unauthorized request (should fail)
  console.log('Test 0: Unauthorized Request (should fail with 401)')
  await testEndpoint('Unauthorized Request', '/api/cron/ingest-news', false)

  // Test all endpoints with auth
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint.name, endpoint.path, true)
  }

  console.log('\n==================================')
  console.log('✅ All tests complete!\n')
  console.log('Next steps:')
  console.log('1. Check Supabase dashboard to verify data was inserted')
  console.log('2. Run SQL queries from PHASE_1_SETUP_GUIDE.md to verify data')
  console.log('3. Deploy to Vercel and verify cron jobs run on schedule\n')
}

// Run tests
runTests().catch(console.error)

