import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { getUserFromRequest } from '@/app/lib/walletAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }

  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

  let body
  try { body = await req.json() } catch { body = {} }

  // The customer id comes from our own records, never from the client
  const { data: subRow } = await supabaseAdmin
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const customerId = subRow?.stripe_customer_id
  if (!customerId) return NextResponse.json({ error: 'No subscription found' }, { status: 404 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  const returnUrl = body?.returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/profile`
  try {
    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe portal error', err)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
