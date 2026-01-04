/**
 * Generate a secure random CRON_SECRET for authenticating cron jobs
 * Usage: node scripts/generate-cron-secret.js
 */

const crypto = require('crypto')

// Generate a 32-byte random hex string
const cronSecret = crypto.randomBytes(32).toString('hex')

console.log('\n🔐 Generated CRON_SECRET:\n')
console.log(cronSecret)
console.log('\n📋 Add this to your .env.local file:\n')
console.log(`CRON_SECRET=${cronSecret}`)
console.log('\n⚠️  IMPORTANT: Also add this to your Vercel project environment variables:')
console.log('   1. Go to https://vercel.com/your-project/settings/environment-variables')
console.log('   2. Add CRON_SECRET with the value above')
console.log('   3. Redeploy your project\n')

