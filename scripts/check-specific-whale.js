#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

async function checkWhale() {
  const addr = '0xeae738c61ab357a0d08fc641583687d1ccdaac4f'
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  console.log(`Checking whale: ${addr}\n`)

  // Check using whale_address
  const { data: withWhaleAddr, count: whaleCount } = await supabase
    .from('whale_transactions')
    .select('*', { count: 'exact' })
    .eq('whale_address', addr)
    .gte('timestamp', since)

  console.log(`Transactions with whale_address = ${addr}: ${whaleCount}`)

  // Check using from_address or to_address
  const { data: withFromTo, count: fromToCount } = await supabase
    .from('whale_transactions')
    .select('*', { count: 'exact' })
    .or(`from_address.eq.${addr},to_address.eq.${addr}`)
    .gte('timestamp', since)

  console.log(`Transactions with from/to = ${addr}: ${fromToCount}`)

  console.log(`\nSample of 5 transactions where address appears:`)
  const sample = withFromTo.slice(0, 5)
  sample.forEach((tx, i) => {
    console.log(`\n${i + 1}. ${tx.token_symbol} ${tx.classification} $${Math.round(tx.usd_value)}`)
    console.log(`   whale_address: ${tx.whale_address || 'NULL'}`)
    console.log(`   from: ${tx.from_address}`)
    console.log(`   to: ${tx.to_address}`)
    console.log(`   counterparty_type: ${tx.counterparty_type || 'NULL'}`)
  })
}

checkWhale().catch(console.error)

