#!/usr/bin/env node

/**
 * Quick check to see if whale_address column is populated
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

async function checkData() {
  console.log('Checking whale_address data population...\n')

  // Check total transactions
  const { count: totalCount } = await supabase
    .from('whale_transactions')
    .select('*', { count: 'exact', head: true })

  console.log(`Total transactions in database: ${totalCount}`)

  // Check transactions with whale_address
  const { count: withWhaleAddress } = await supabase
    .from('whale_transactions')
    .select('*', { count: 'exact', head: true })
    .not('whale_address', 'is', null)

  console.log(`Transactions with whale_address: ${withWhaleAddress}`)
  console.log(`Percentage populated: ${((withWhaleAddress / totalCount) * 100).toFixed(1)}%\n`)

  // Check last 24h specifically
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  const { count: total24h } = await supabase
    .from('whale_transactions')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', since)

  const { count: with24h } = await supabase
    .from('whale_transactions')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', since)
    .not('whale_address', 'is', null)

  console.log(`Last 24h transactions: ${total24h}`)
  console.log(`Last 24h with whale_address: ${with24h}`)
  console.log(`24h percentage populated: ${total24h > 0 ? ((with24h / total24h) * 100).toFixed(1) : 0}%\n`)

  // Sample some recent records
  const { data: sample } = await supabase
    .from('whale_transactions')
    .select('timestamp, token_symbol, whale_address, from_address, to_address')
    .order('timestamp', { ascending: false })
    .limit(5)

  console.log('Recent 5 transactions:')
  console.log('─'.repeat(80))
  sample.forEach((tx, i) => {
    console.log(`${i + 1}. ${tx.timestamp} - ${tx.token_symbol}`)
    console.log(`   whale_address: ${tx.whale_address || 'NULL'}`)
    console.log(`   from_address:  ${tx.from_address}`)
    console.log(`   to_address:    ${tx.to_address}`)
  })

  if (withWhaleAddress === 0) {
    console.log('\n❌ PROBLEM: No transactions have whale_address populated!')
    console.log('   You need to run the migration script on the backend to populate this column.')
  } else if (with24h === 0) {
    console.log('\n⚠️  WARNING: No recent (24h) transactions have whale_address!')
    console.log('   The monitor may not be populating the column for new transactions.')
  } else {
    console.log('\n✅ Data looks good!')
  }
}

checkData().catch(console.error)

