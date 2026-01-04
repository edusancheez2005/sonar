/**
 * Give unlimited ORCA access to specific email
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function giveUnlimitedAccess(email) {
  console.log(`🔑 Giving unlimited ORCA access to: ${email}\n`)
  
  try {
    // Step 1: Find user by email in profiles table
    console.log('📧 Looking up user in profiles...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single()
    
    if (profileError || !profile) {
      console.error('❌ User not found:', profileError?.message || 'No user with this email')
      console.log('\n💡 Tip: Make sure the user has logged in at least once to create their profile.')
      return
    }
    
    const userId = profile.id
    console.log(`✅ Found user: ${userId}`)
    console.log(`   Email: ${profile.email}`)
    
    // Step 2: Update profile to "unlimited" plan
    console.log('\n📝 Updating profile to unlimited plan...')
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ plan: 'unlimited' })
      .eq('id', userId)
    
    if (updateProfileError) {
      console.error('❌ Error updating profile:', updateProfileError.message)
      return
    }
    
    console.log('✅ Profile updated to unlimited plan')
    
    // Step 3: Update or create today's quota with very high limit
    const today = new Date().toISOString().split('T')[0]
    
    console.log('\n📊 Setting unlimited quota for today...')
    const { error: quotaError } = await supabase
      .from('user_quotas')
      .upsert({
        user_id: userId,
        date: today,
        questions_limit: 999999,
        questions_used: 0,
        reset_at: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString()
      }, {
        onConflict: 'user_id,date'
      })
    
    if (quotaError) {
      console.error('❌ Error setting quota:', quotaError.message)
      return
    }
    
    console.log('✅ Quota set to 999,999 questions/day')
    
    // Step 4: Verify
    console.log('\n🔍 Verifying changes...')
    
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single()
    
    const { data: quota } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()
    
    console.log('\n✅ SUCCESS! Unlimited access granted:')
    console.log(`   Email: ${email}`)
    console.log(`   User ID: ${userId}`)
    console.log(`   Plan: ${updatedProfile?.plan || 'N/A'}`)
    console.log(`   Daily Limit: ${quota?.questions_limit || 'N/A'}`)
    console.log(`   Questions Used Today: ${quota?.questions_used || 0}`)
    console.log(`   Remaining: ${(quota?.questions_limit || 0) - (quota?.questions_used || 0)}`)
    console.log('\n🎉 You can now ask ORCA unlimited questions!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run for your email
giveUnlimitedAccess('edusanchez@gmail.com')

