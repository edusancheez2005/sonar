import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const customerId = String(body?.customerId || '').trim()
  if (!customerId) return NextResponse.json({ error: 'Missing customerId' }, { status: 400 })

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



