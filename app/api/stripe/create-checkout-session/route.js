import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

  // Get user session
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return NextResponse.json({ error: 'You must be logged in to subscribe' }, { status: 401 })
  }

  const userId = session.user.id
  const userEmail = session.user.email

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const priceId = String(body?.priceId || '').trim()
  const successUrl = body?.successUrl || `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard?checkout=success`
  const cancelUrl = body?.cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/subscribe?checkout=cancelled`

  if (!priceId) {
    return NextResponse.json({ error: 'Missing priceId' }, { status: 400 })
  }

  try {
    // Check if customer already exists
    let customerId
    const { data: existing } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (existing?.stripe_customer_id) {
      customerId = existing.stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      })
      customerId = customer.id

      // Store in database
      await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          email: userEmail,
          stripe_customer_id: customerId,
          subscription_status: 'pending',
        })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      metadata: { supabase_user_id: userId },
    })
    return NextResponse.json({ id: session.id, url: session.url })
  } catch (err) {
    console.error('Stripe create session error', err)
    return NextResponse.json({ error: err.message || 'Failed to create checkout session' }, { status: 500 })
  }
}


