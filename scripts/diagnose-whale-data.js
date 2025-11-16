#!/usr/bin/env node

/**
 * Diagnostic Script: Analyze Whale Address Data Quality
 * 
 * This script examines the whale_transactions table to understand:
 * 1. How many transactions have whale_address populated
 * 2. Distribution of BUY vs SELL classifications
 * 3. Whether whale_address is biased towards BUYs or SELLs
 * 4. Sample transactions for manual inspection
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnoseWhaleData() {
  console.log('🔍 WHALE DATA QUALITY DIAGNOSTIC')
  console.log('=' .repeat(80))
  console.log()

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Test 1: Overall stats
  console.log('📊 TEST 1: Overall Transaction Stats (Last 24h)')
  console.log('-'.repeat(80))
  
  const { data: all24h, error: err1 } = await supabase
    .from('whale_transactions')
    .select('whale_address, classification, from_address, to_address')
    .gte('timestamp', since24h)
  
  if (err1) {
    console.error('Error:', err1)
    return
  }

  const totalTx = all24h.length
  const withWhaleAddr = all24h.filter(r => r.whale_address).length
  const withoutWhaleAddr = totalTx - withWhaleAddr

  console.log(`Total Transactions: ${totalTx}`)
  console.log(`With whale_address: ${withWhaleAddr} (${((withWhaleAddr/totalTx)*100).toFixed(1)}%)`)
  console.log(`Without whale_address: ${withoutWhaleAddr} (${((withoutWhaleAddr/totalTx)*100).toFixed(1)}%)`)
  console.log()

  // Test 2: Classification distribution
  console.log('📊 TEST 2: Classification Distribution')
  console.log('-'.repeat(80))
  
  const classifications = {}
  all24h.forEach(r => {
    const c = r.classification || 'NULL'
    classifications[c] = (classifications[c] || 0) + 1
  })

  Object.entries(classifications)
    .sort((a, b) => b[1] - a[1])
    .forEach(([classification, count]) => {
      console.log(`${classification}: ${count} (${((count/totalTx)*100).toFixed(1)}%)`)
    })
  console.log()

  // Test 3: Whale address bias check
  console.log('📊 TEST 3: Whale Address vs Classification (Bias Check)')
  console.log('-'.repeat(80))
  
  const withWhaleAddrTx = all24h.filter(r => r.whale_address)
  const whaleAddrByClass = {}
  withWhaleAddrTx.forEach(r => {
    const c = r.classification || 'NULL'
    whaleAddrByClass[c] = (whaleAddrByClass[c] || 0) + 1
  })

  console.log('When whale_address IS populated:')
  Object.entries(whaleAddrByClass)
    .sort((a, b) => b[1] - a[1])
    .forEach(([classification, count]) => {
      console.log(`  ${classification}: ${count} (${((count/withWhaleAddr)*100).toFixed(1)}%)`)
    })
  console.log()

  // Test 4: Sample specific whale
  console.log('📊 TEST 4: Sample Whale Analysis (Pick a random whale)')
  console.log('-'.repeat(80))
  
  const { data: whales7d } = await supabase
    .from('whale_transactions')
    .select('whale_address')
    .gte('timestamp', since7d)
    .not('whale_address', 'is', null)
    .limit(100)
  
  if (whales7d && whales7d.length > 0) {
    // Get a random whale address
    const randomWhale = whales7d[Math.floor(Math.random() * whales7d.length)].whale_address
    console.log(`Analyzing whale: ${randomWhale.slice(0, 10)}...${randomWhale.slice(-8)}`)
    console.log()

    // Query all transactions for this whale
    const { data: whaleTx } = await supabase
      .from('whale_transactions')
      .select('*')
      .or(`whale_address.eq.${randomWhale},from_address.eq.${randomWhale},to_address.eq.${randomWhale}`)
      .gte('timestamp', since7d)
      .order('timestamp', { ascending: false })
      .limit(20)

    if (whaleTx && whaleTx.length > 0) {
      console.log(`Found ${whaleTx.length} transactions`)
      console.log()

      let buys = 0
      let sells = 0
      let other = 0

      whaleTx.forEach((tx, idx) => {
        if (idx < 10) { // Show first 10
          const isWhaleAddr = tx.whale_address === randomWhale
          const isFrom = tx.from_address === randomWhale
          const isTo = tx.to_address === randomWhale
          const role = isWhaleAddr ? 'whale_addr' : isFrom ? 'from' : isTo ? 'to' : 'unknown'
          
          console.log(`[${idx + 1}] ${tx.classification || 'NULL'} | ${role} | ${tx.token_symbol} | $${Math.round(tx.usd_value || 0).toLocaleString()}`)
        }

        if (tx.classification === 'BUY') buys++
        else if (tx.classification === 'SELL') sells++
        else other++
      })

      console.log()
      console.log(`BUY: ${buys}, SELL: ${sells}, Other: ${other}`)
      console.log(`Buy/Sell Ratio: ${buys}/${sells}`)
    }
  }
  console.log()

  // Test 5: Check if whale_address matches from/to patterns
  console.log('📊 TEST 5: Whale Address Position Analysis')
  console.log('-'.repeat(80))
  
  const sampleWithWhale = all24h.filter(r => r.whale_address).slice(0, 100)
  let whaleIsFrom = 0
  let whaleIsTo = 0
  let whaleIsNeither = 0

  sampleWithWhale.forEach(r => {
    if (r.whale_address === r.from_address) whaleIsFrom++
    else if (r.whale_address === r.to_address) whaleIsTo++
    else whaleIsNeither++
  })

  console.log('When whale_address is populated:')
  console.log(`  whale_address = from_address: ${whaleIsFrom} (${((whaleIsFrom/sampleWithWhale.length)*100).toFixed(1)}%)`)
  console.log(`  whale_address = to_address: ${whaleIsTo} (${((whaleIsTo/sampleWithWhale.length)*100).toFixed(1)}%)`)
  console.log(`  whale_address = neither: ${whaleIsNeither} (${((whaleIsNeither/sampleWithWhale.length)*100).toFixed(1)}%)`)
  console.log()

  console.log('✅ Diagnostic complete!')
}

diagnoseWhaleData().catch(console.error)

