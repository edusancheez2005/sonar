import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req) {
  console.log('=== CREATE CHECKOUT SESSION DEBUG ===')
  console.log('Environment check:', {
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set')
    return NextResponse.json({ error: 'Stripe is not configured. Please contact support.' }, { status: 503 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

  // Get user session from cookies
  const cookieStore = await cookies()
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
  const { data: { session } } = await supabase.auth.getSession()
  
  console.log('Session check:', { hasSession: !!session, hasUser: !!session?.user })
  
  if (!session?.user) {
    console.log('No session found in create-checkout-session')
    return NextResponse.json({ error: 'You must be logged in to subscribe' }, { status: 401 })
  }
  
  console.log('User authenticated:', session.user.email)

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

  console.log('Request details:', {
    priceId,
    userId,
    userEmail,
    successUrl,
    cancelUrl
  })

  if (!priceId) {
    console.error('No priceId provided')
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
    console.log('Checkout session created successfully:', session.id)
    return NextResponse.json({ id: session.id, url: session.url })
  } catch (err) {
    console.error('Stripe create session error:', err)
    console.error('Error details:', {
      message: err.message,
      type: err.type,
      code: err.code,
      statusCode: err.statusCode
    })
    return NextResponse.json({ 
      error: err.message || 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? err.type : undefined
    }, { status: 500 })
  }
}


