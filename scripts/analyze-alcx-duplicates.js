#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeALCX() {
  console.log('🔍 ANALYZING ALCX TRANSACTIONS FOR DUPLICATES')
  console.log('='.repeat(80))
  console.log()

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  const { data, error } = await supabase
    .from('whale_transactions')
    .select('*')
    .eq('token_symbol', 'ALCX')
    .gte('timestamp', since24h)
    .order('timestamp', { ascending: false })
    .limit(100)
  
  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`📊 Total ALCX Transactions (Last 24h): ${data?.length || 0}`)
  console.log()
  
  if (!data || data.length === 0) {
    console.log('❌ No ALCX transactions found in the last 24 hours')
    return
  }

  // Group by similar characteristics
  const grouped = {}
  
  data.forEach((tx) => {
    // Create a key based on from/to/value to find duplicates
    const key = `${tx.from_address}-${tx.to_address}-${Math.round(tx.usd_value)}`
    
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(tx)
  })
  
  console.log('🔍 DUPLICATE ANALYSIS:')
  console.log('-'.repeat(80))
  console.log()
  
  let duplicateGroups = 0
  let totalDuplicates = 0
  
  Object.entries(grouped).forEach(([key, txs]) => {
    if (txs.length > 1) {
      duplicateGroups++
      totalDuplicates += txs.length - 1
      
      console.log(`❌ DUPLICATE GROUP #${duplicateGroups} (${txs.length} identical transactions):`)
      console.log(`   Value: $${Math.round(txs[0].usd_value || 0).toLocaleString()}`)
      console.log(`   From: ${txs[0].from_address?.slice(0,10)}... (${txs[0].from_label || 'Unknown'})`)
      console.log(`   To: ${txs[0].to_address?.slice(0,10)}... (${txs[0].to_label || 'Unknown'})`)
      console.log(`   Whale: ${txs[0].whale_address?.slice(0,10)}...`)
      console.log(`   Classification: ${txs[0].classification}`)
      console.log(`   Counterparty Type: ${txs[0].counterparty_type}`)
      console.log()
      console.log('   Individual Records:')
      txs.forEach((tx, i) => {
        console.log(`     [${i+1}] ${tx.timestamp}`)
        console.log(`         TX Hash: ${tx.transaction_hash?.slice(0,16)}...`)
        console.log(`         ID: ${tx.id}`)
      })
      console.log()
    }
  })
  
  const uniqueCount = Object.keys(grouped).length
  const totalCount = data.length
  
  console.log()
  console.log('📈 SUMMARY:')
  console.log('='.repeat(80))
  console.log(`   Total transactions in DB: ${totalCount}`)
  console.log(`   Unique transactions: ${uniqueCount}`)
  console.log(`   Duplicate groups: ${duplicateGroups}`)
  console.log(`   Total duplicate entries: ${totalDuplicates}`)
  console.log(`   Duplication rate: ${((totalDuplicates / totalCount) * 100).toFixed(1)}%`)
  console.log()
  
  // Show classification breakdown
  const byClass = {}
  data.forEach(tx => {
    const c = tx.classification || 'NULL'
    byClass[c] = (byClass[c] || 0) + 1
  })
  
  console.log('📊 CLASSIFICATION BREAKDOWN (Including Duplicates):')
  console.log('-'.repeat(80))
  Object.entries(byClass).forEach(([c, count]) => {
    console.log(`   ${c}: ${count}`)
  })
  console.log()
  
  // Show what it should be without duplicates
  const uniqueTxs = Object.values(grouped).map(arr => arr[0])
  const uniqueByClass = {}
  uniqueTxs.forEach(tx => {
    const c = tx.classification || 'NULL'
    uniqueByClass[c] = (uniqueByClass[c] || 0) + 1
  })
  
  console.log('📊 CLASSIFICATION BREAKDOWN (After Removing Duplicates):')
  console.log('-'.repeat(80))
  Object.entries(uniqueByClass).forEach(([c, count]) => {
    console.log(`   ${c}: ${count}`)
  })
  console.log()
  
  if (duplicateGroups > 0) {
    console.log('⚠️  WARNING: Duplicates detected!')
    console.log('This means the same transaction is counted multiple times,')
    console.log('which inflates BUY/SELL counts and skews sentiment analysis.')
    console.log()
    console.log('Possible causes:')
    console.log('  1. Backend monitor inserting same transaction multiple times')
    console.log('  2. No UNIQUE constraint on transaction_hash')
    console.log('  3. Race conditions during ingestion')
  } else {
    console.log('✅ No duplicates found! Data quality is good.')
  }
}

analyzeALCX().catch(console.error)

