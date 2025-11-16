#!/usr/bin/env node

/**
 * Test Script: Verify Whale BUY/SELL Classification Fix
 * 
 * This simulates the logic from app/whale/[address]/page.jsx
 * to verify that whales now show mixed BUY/SELL ratios
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testWhaleFix() {
  console.log('🧪 TESTING WHALE BUY/SELL CLASSIFICATION FIX')
  console.log('='.repeat(80))
  console.log()

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Get 5 random whale addresses
  const { data: whaleAddresses } = await supabase
    .from('whale_transactions')
    .select('whale_address')
    .gte('timestamp', since24h)
    .not('whale_address', 'is', null)
    .limit(100)

  if (!whaleAddresses || whaleAddresses.length === 0) {
    console.log('❌ No whale addresses found')
    return
  }

  // Get unique addresses
  const uniqueAddresses = [...new Set(whaleAddresses.map(r => r.whale_address))]
  const testAddresses = uniqueAddresses.slice(0, 5)

  console.log(`Testing ${testAddresses.length} whale addresses...\n`)

  for (const addr of testAddresses) {
    console.log(`🐋 Whale: ${addr.slice(0, 10)}...${addr.slice(-8)}`)
    console.log('-'.repeat(80))

    // Fetch transactions using OR query (same as fixed page.jsx)
    const { data, error } = await supabase
      .from('whale_transactions')
      .select('*')
      .or(`whale_address.eq.${addr},from_address.eq.${addr},to_address.eq.${addr}`)
      .gte('timestamp', since24h)
      .order('timestamp', { ascending: false })
      .limit(100)

    if (error || !data || data.length === 0) {
      console.log('  ❌ No data\n')
      continue
    }

    // Apply the NEW classification logic
    let buyVolume = 0
    let sellVolume = 0
    let buyCount = 0
    let sellCount = 0
    let skippedTransfer = 0
    let skippedDefi = 0
    let skippedOther = 0

    for (const r of data) {
      const usd = Number(r.usd_value || 0)
      if (usd === 0) continue

      const fromAddr = (r.from_address || '').toLowerCase()
      const toAddr = (r.to_address || '').toLowerCase()
      const whaleAddr = (r.whale_address || '').toLowerCase()
      const ourAddr = addr.toLowerCase()
      const storedClassification = (r.classification || '').toUpperCase()
      const counterpartyType = r.counterparty_type

      // Skip TRANSFER and DEFI
      if (storedClassification === 'TRANSFER') {
        skippedTransfer++
        continue
      }
      if (storedClassification === 'DEFI') {
        skippedDefi++
        continue
      }

      let isBuy = false
      let classification = 'UNKNOWN'

      // NEW LOGIC: Determine from token flow
      if (whaleAddr === ourAddr) {
        if (whaleAddr === toAddr) {
          isBuy = true
          classification = 'BUY'
        } else if (whaleAddr === fromAddr) {
          isBuy = false
          classification = 'SELL'
        } else {
          skippedOther++
          continue
        }
      } else if (toAddr === ourAddr) {
        isBuy = true
        classification = 'BUY'
      } else if (fromAddr === ourAddr) {
        isBuy = false
        classification = 'SELL'
      } else {
        skippedOther++
        continue
      }

      if (classification !== 'BUY' && classification !== 'SELL') {
        skippedOther++
        continue
      }

      if (counterpartyType && counterpartyType !== 'CEX' && counterpartyType !== 'DEX') {
        skippedOther++
        continue
      }

      // Count it
      if (isBuy) {
        buyVolume += usd
        buyCount++
      } else {
        sellVolume += usd
        sellCount++
      }
    }

    const totalCount = buyCount + sellCount
    const buyPct = totalCount > 0 ? Math.round((buyCount / totalCount) * 100) : 0
    const sellPct = 100 - buyPct

    console.log(`  📊 Results:`)
    console.log(`     Total transactions: ${data.length}`)
    console.log(`     Skipped (TRANSFER): ${skippedTransfer}`)
    console.log(`     Skipped (DEFI): ${skippedDefi}`)
    console.log(`     Skipped (Other): ${skippedOther}`)
    console.log(`     BUY count: ${buyCount}`)
    console.log(`     SELL count: ${sellCount}`)
    console.log(`     Buy/Sell Ratio: ${buyPct}%/${sellPct}%`)
    console.log(`     Buy Volume: $${Math.round(buyVolume).toLocaleString()}`)
    console.log(`     Sell Volume: $${Math.round(sellVolume).toLocaleString()}`)
    console.log(`     Net Flow: $${Math.round(buyVolume - sellVolume).toLocaleString()}`)
    
    // Check if it's realistic
    if (totalCount > 0 && buyCount > 0 && sellCount > 0) {
      console.log(`     ✅ PASS: Mixed BUY/SELL activity!`)
    } else if (totalCount > 0) {
      console.log(`     ⚠️  WARNING: Only ${buyCount > 0 ? 'BUYs' : 'SELLs'}`)
    } else {
      console.log(`     ❌ FAIL: No transactions`)
    }
    
    console.log()
  }

  console.log('✅ Test complete!')
}

testWhaleFix().catch(console.error)

