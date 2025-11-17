#!/usr/bin/env node

/**
 * Analyze Transaction Types
 * 
 * This script analyzes the last 24 hours of whale transactions
 * and breaks down what BUY, SELL, TRANSFER, and DEFI mean
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

async function analyzeTransactions() {
  console.log('🔍 ANALYZING WHALE TRANSACTION TYPES (LAST 24 HOURS)')
  console.log('='.repeat(80))
  console.log()

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Fetch last 24h of transactions
  const { data, error } = await supabase
    .from('whale_transactions')
    .select('*')
    .gte('timestamp', since24h)
    .order('timestamp', { ascending: false })

  if (error || !data) {
    console.error('❌ Error fetching data:', error)
    return
  }

  console.log(`📊 Total Transactions: ${data.length}`)
  console.log()

  // Count by classification
  const byClassification = {}
  for (const tx of data) {
    const c = tx.classification || 'NULL'
    byClassification[c] = (byClassification[c] || 0) + 1
  }

  console.log('📈 BREAKDOWN BY CLASSIFICATION:')
  console.log('-'.repeat(80))
  Object.entries(byClassification)
    .sort((a, b) => b[1] - a[1])
    .forEach(([classification, count]) => {
      const pct = ((count / data.length) * 100).toFixed(1)
      console.log(`  ${classification.padEnd(12)} ${count.toString().padStart(5)} transactions (${pct}%)`)
    })
  console.log()

  // Count by counterparty type
  const byCounterparty = {}
  for (const tx of data) {
    const c = tx.counterparty_type || 'NULL'
    byCounterparty[c] = (byCounterparty[c] || 0) + 1
  }

  console.log('🏢 BREAKDOWN BY COUNTERPARTY TYPE:')
  console.log('-'.repeat(80))
  Object.entries(byCounterparty)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const pct = ((count / data.length) * 100).toFixed(1)
      console.log(`  ${type.padEnd(12)} ${count.toString().padStart(5)} transactions (${pct}%)`)
    })
  console.log()

  // Show some examples of each type
  console.log('📋 EXAMPLE TRANSACTIONS:')
  console.log('-'.repeat(80))
  console.log()

  for (const classification of ['BUY', 'SELL', 'TRANSFER', 'DEFI']) {
    const examples = data.filter(tx => tx.classification === classification).slice(0, 3)
    
    if (examples.length > 0) {
      console.log(`🔹 ${classification} Examples:`)
      examples.forEach((tx, idx) => {
        console.log(`   [${idx + 1}] ${tx.token_symbol || 'N/A'} - $${Math.round(tx.usd_value || 0).toLocaleString()}`)
        console.log(`       From: ${tx.from_address?.slice(0, 10)}...${tx.from_address?.slice(-8)} (${tx.from_label || 'Unknown'})`)
        console.log(`       To:   ${tx.to_address?.slice(0, 10)}...${tx.to_address?.slice(-8)} (${tx.to_label || 'Unknown'})`)
        console.log(`       Whale: ${tx.whale_address?.slice(0, 10)}...${tx.whale_address?.slice(-8) || 'N/A'}`)
        console.log(`       Counterparty Type: ${tx.counterparty_type || 'N/A'}`)
        if (tx.reasoning) console.log(`       Reasoning: ${tx.reasoning.slice(0, 80)}...`)
        console.log()
      })
    }
  }

  console.log()
  console.log('📖 WHAT EACH TYPE MEANS:')
  console.log('='.repeat(80))
  console.log()
  
  console.log('🟢 BUY:')
  console.log('   - Whale is RECEIVING tokens (buying)')
  console.log('   - Token flows: Exchange/DEX → Whale')
  console.log('   - Money flows: Whale → Exchange/DEX')
  console.log('   - Counterparty: CEX or DEX')
  console.log('   - Example: Whale buys 1000 ETH from Binance')
  console.log()
  
  console.log('🔴 SELL:')
  console.log('   - Whale is SENDING tokens (selling)')
  console.log('   - Token flows: Whale → Exchange/DEX')
  console.log('   - Money flows: Exchange/DEX → Whale')
  console.log('   - Counterparty: CEX or DEX')
  console.log('   - Example: Whale sells 1000 ETH to Coinbase')
  console.log()
  
  console.log('🔵 TRANSFER:')
  console.log('   - Whale is moving tokens between wallets')
  console.log('   - Token flows: Whale Wallet A → Whale Wallet B')
  console.log('   - No actual buying or selling')
  console.log('   - Counterparty: Another wallet (not exchange)')
  console.log('   - Example: Whale moves ETH from cold wallet to hot wallet')
  console.log()
  
  console.log('🟡 DEFI:')
  console.log('   - Whale is interacting with DeFi protocols')
  console.log('   - Token flows: Whale ↔ Smart Contract')
  console.log('   - Could be: Staking, Lending, Liquidity Provision')
  console.log('   - Counterparty: DeFi Protocol (Uniswap, Aave, etc.)')
  console.log('   - Example: Whale deposits USDC into Aave lending pool')
  console.log()

  console.log()
  console.log('💡 FOR TRADING ANALYSIS:')
  console.log('='.repeat(80))
  console.log(`   ✅ Count BUY/SELL: ${(byClassification.BUY || 0) + (byClassification.SELL || 0)} transactions (${(((byClassification.BUY || 0) + (byClassification.SELL || 0)) / data.length * 100).toFixed(1)}%)`)
  console.log(`   ❌ Ignore TRANSFER: ${byClassification.TRANSFER || 0} transactions (${((byClassification.TRANSFER || 0) / data.length * 100).toFixed(1)}%)`)
  console.log(`   ❌ Ignore DEFI: ${byClassification.DEFI || 0} transactions (${((byClassification.DEFI || 0) / data.length * 100).toFixed(1)}%)`)
  console.log()
  console.log('   Why? TRANSFER and DEFI are not real market trades.')
  console.log('   Only BUY/SELL transactions affect token sentiment.')
  console.log()

  console.log('✅ Analysis complete!')
}

analyzeTransactions().catch(console.error)

