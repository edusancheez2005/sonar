import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { checkRate } from '@/app/lib/rateLimit'
import { sendWaitlistConfirmation } from '@/app/lib/email'

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  if (!checkRate(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = String(body?.email || '').trim().toLowerCase()
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('emails')
    .insert([{ email, ip }])
    .select()
    .single()

  if (error) {
    if (String(error.message).toLowerCase().includes('duplicate')) {
      return NextResponse.json({ ok: true, message: 'Already subscribed' })
    }
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }

  // Send confirmation email
  try {
    await sendWaitlistConfirmation(email)
    console.log(`✅ Orca waitlist confirmation email sent to: ${email}`)
  } catch (emailError) {
    console.error(`❌ Failed to send confirmation email to ${email}:`, emailError)
    // Don't fail the subscription if email fails
  }

  console.log(`📝 New Orca waitlist subscription: ${email}`)

  return NextResponse.json({
    ok: true,
    message: 'Subscribed to Orca waitlist! Check your email for confirmation.',
    id: data?.id
  })
} 