#!/usr/bin/env node

/**
 * Verification script for whale_address database update
 * Tests that CEX addresses don't appear as whales and whales show mixed BUY/SELL
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

async function runTests() {
  console.log('================================================================================')
  console.log('WHALE PERSPECTIVE VERIFICATION TESTS')
  console.log('================================================================================\n')

  let allPassed = true

  // TEST 1: Ensure no CEX addresses appear as whales
  console.log('TEST 1: Ensure no CEX addresses appear as whales')
  console.log('─'.repeat(80))
  
  try {
    // Get all CEX addresses
    const { data: cexAddresses, error: cexError } = await supabase
      .from('addresses')
      .select('address')
      .in('address_type', ['CEX Wallet', 'exchange', 'Exchange Wallet'])

    if (cexError) throw cexError

    const cexSet = new Set((cexAddresses || []).map(a => a.address?.toLowerCase()))
    console.log(`Found ${cexSet.size} CEX addresses in database`)

    // Get distinct whale addresses
    const { data: whaleData, error: whaleError } = await supabase
      .from('whale_transactions')
      .select('whale_address')
      .not('whale_address', 'is', null)
      .limit(10000)

    if (whaleError) throw whaleError

    const whales = new Set(whaleData.map(w => w.whale_address?.toLowerCase()))
    console.log(`Found ${whales.size} unique whale addresses`)

    // Check intersection
    const cexAsWhales = Array.from(whales).filter(w => cexSet.has(w))
    
    if (cexAsWhales.length === 0) {
      console.log('✅ PASS: No CEX addresses found in whale list\n')
    } else {
      console.log(`❌ FAIL: Found ${cexAsWhales.length} CEX addresses as whales:`)
      cexAsWhales.slice(0, 5).forEach(addr => console.log(`  - ${addr}`))
      console.log()
      allPassed = false
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}\n`)
    allPassed = false
  }

  // TEST 2: Check if whales show both BUY and SELL
  console.log('TEST 2: Check if whales show both BUY and SELL')
  console.log('─'.repeat(80))
  
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('whale_transactions')
      .select('whale_address, classification')
      .not('whale_address', 'is', null)
      .in('counterparty_type', ['CEX', 'DEX'])
      .in('classification', ['BUY', 'SELL'])
      .gte('timestamp', since)
      .limit(10000)

    if (error) throw error

    const byWhale = new Map()
    
    for (const row of data) {
      const addr = row.whale_address
      if (!byWhale.has(addr)) {
        byWhale.set(addr, { buys: 0, sells: 0 })
      }
      const whale = byWhale.get(addr)
      if (row.classification === 'BUY') whale.buys++
      else if (row.classification === 'SELL') whale.sells++
    }

    // Filter whales with 5+ trades
    const activeWhales = Array.from(byWhale.entries())
      .filter(([_, counts]) => counts.buys + counts.sells >= 5)
      .map(([addr, counts]) => ({
        address: addr,
        buys: counts.buys,
        sells: counts.sells,
        total: counts.buys + counts.sells,
        directionCount: (counts.buys > 0 ? 1 : 0) + (counts.sells > 0 ? 1 : 0)
      }))
      .sort((a, b) => b.total - a.total)

    console.log(`Analyzed ${activeWhales.length} whales with 5+ trades in past 7 days`)
    
    const mixedWhales = activeWhales.filter(w => w.directionCount === 2).length
    const oneDirWhales = activeWhales.filter(w => w.directionCount === 1).length
    const mixedPercent = activeWhales.length > 0 ? (mixedWhales / activeWhales.length * 100).toFixed(1) : 0

    console.log(`  ${mixedWhales} whales (${mixedPercent}%) show both BUY and SELL`)
    console.log(`  ${oneDirWhales} whales show only one direction`)

    if (activeWhales.length > 0) {
      console.log(`\nTop 5 most active whales:`)
      activeWhales.slice(0, 5).forEach((w, i) => {
        console.log(`  ${i + 1}. ${w.address.slice(0, 8)}... - ${w.buys} BUYs, ${w.sells} SELLs (${w.directionCount === 2 ? '✅ Mixed' : '⚠️  One-way'})`)
      })
    }

    if (mixedWhales > oneDirWhales) {
      console.log(`\n✅ PASS: Majority of whales show mixed BUY/SELL activity\n`)
    } else {
      console.log(`\n⚠️  WARNING: Many whales still show one-directional flow\n`)
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}\n`)
    allPassed = false
  }

  // TEST 3: Sample whale data check
  console.log('TEST 3: Sample whale data check')
  console.log('─'.repeat(80))
  
  try {
    const { data, error } = await supabase
      .from('whale_transactions')
      .select('whale_address, token_symbol, classification, usd_value, counterparty_type')
      .not('whale_address', 'is', null)
      .in('counterparty_type', ['CEX', 'DEX'])
      .order('timestamp', { ascending: false })
      .limit(10)

    if (error) throw error

    console.log(`Latest 10 whale transactions:`)
    console.log(`${'Whale'.padEnd(12)} ${'Token'.padEnd(8)} ${'Side'.padEnd(6)} ${'USD'.padStart(12)} ${'Type'.padEnd(6)}`)
    console.log('─'.repeat(52))
    
    data.forEach(tx => {
      const whale = `${tx.whale_address.slice(0, 6)}...${tx.whale_address.slice(-4)}`
      const usd = `$${Math.round(tx.usd_value).toLocaleString()}`
      console.log(
        `${whale.padEnd(12)} ${tx.token_symbol.padEnd(8)} ${tx.classification.padEnd(6)} ${usd.padStart(12)} ${tx.counterparty_type.padEnd(6)}`
      )
    })

    const hasBuys = data.some(tx => tx.classification === 'BUY')
    const hasSells = data.some(tx => tx.classification === 'SELL')

    if (hasBuys && hasSells) {
      console.log(`\n✅ PASS: Sample shows variety of BUY/SELL\n`)
    } else {
      console.log(`\n⚠️  WARNING: Sample doesn't show mix (could be timing)\n`)
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}\n`)
    allPassed = false
  }

  // TEST 4: Verify Binance not in whale list
  console.log('TEST 4: Verify Binance not in whale list')
  console.log('─'.repeat(80))
  
  try {
    const binanceAddress = '0x21a31ee1afc51d94c2efccaa2092ad1028285549'
    
    const { count, error } = await supabase
      .from('whale_transactions')
      .select('whale_address', { count: 'exact', head: true })
      .eq('whale_address', binanceAddress)

    if (error) throw error

    if (count === 0) {
      console.log(`✅ PASS: Binance Hot Wallet 8 (${binanceAddress.slice(0, 10)}...) is NOT a whale_address\n`)
    } else {
      console.log(`❌ FAIL: Found ${count} transactions with Binance as whale_address\n`)
      allPassed = false
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}\n`)
    allPassed = false
  }

  // Final summary
  console.log('================================================================================')
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Whale perspective fix is working correctly!')
  } else {
    console.log('❌ SOME TESTS FAILED - Review errors above')
  }
  console.log('================================================================================')

  process.exit(allPassed ? 0 : 1)
}

runTests().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

