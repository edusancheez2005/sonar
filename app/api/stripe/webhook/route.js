import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse('Stripe not configured', { status: 503 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

  const signature = req.headers.get('stripe-signature')
  const rawBody = await req.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message)
    return new NextResponse('Bad signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.supabase_user_id
        const customerId = session.customer
        const subscriptionId = session.subscription

        if (userId) {
          // Update profiles table to set plan to 'premium'
          await supabaseAdmin
            .from('profiles')
            .update({
              plan: 'premium',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

          console.log(`✅ Subscription activated for user ${userId} - plan set to premium`)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const customerId = subscription.customer
        const status = subscription.status // active, past_due, canceled, etc.
        
        // Get user ID from customer metadata
        const customer = await stripe.customers.retrieve(customerId)
        const userId = customer.metadata?.supabase_user_id

        if (userId) {
          const plan = (status === 'active') ? 'premium' : 'free'
          
          await supabaseAdmin
            .from('profiles')
            .update({
              plan: plan,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

          console.log(`✅ Subscription ${status} for user ${userId} - plan set to ${plan}`)
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer
        
        // Get user ID from customer metadata
        const customer = await stripe.customers.retrieve(customerId)
        const userId = customer.metadata?.supabase_user_id

        if (userId) {
          await supabaseAdmin
            .from('profiles')
            .update({
              plan: 'free',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

          console.log(`❌ Subscription canceled for user ${userId} - plan set to free`)
        }
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('Webhook handler error', err)
    return new NextResponse('Webhook error', { status: 500 })
  }

  return NextResponse.json({ received: true })
}



