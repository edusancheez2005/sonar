import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Subscription statuses that keep a user on the premium plan. 'trialing' is
// the free-trial window; 'past_due' is a grace period while Stripe retries a
// failed card so a hiccup doesn't instantly lock a paying user out.
const PREMIUM_STATUSES = new Set(['trialing', 'active', 'past_due'])

async function resolveUserId(stripe, subscription) {
  if (subscription.metadata?.supabase_user_id) return subscription.metadata.supabase_user_id
  try {
    const customer = await stripe.customers.retrieve(subscription.customer)
    if (!customer.deleted && customer.metadata?.supabase_user_id) {
      return customer.metadata.supabase_user_id
    }
  } catch (err) {
    console.error('Could not retrieve customer for subscription', subscription.id, err.message)
  }
  const { data } = await supabaseAdmin
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', subscription.customer)
    .maybeSingle()
  return data?.user_id || null
}

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

          // Persist the ids only — status/trial fields belong to the
          // customer.subscription.* events, so arrival order doesn't matter.
          await supabaseAdmin
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              stripe_customer_id: customerId || null,
              stripe_subscription_id: subscriptionId || null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })

          console.log(`✅ Subscription activated for user ${userId} - plan set to premium`)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const userId = await resolveUserId(stripe, subscription)
        if (!userId) {
          console.log(`Subscription event ${event.type} with no resolvable user, skipping`)
          break
        }

        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status
        // Newer Stripe API versions expose current_period_end on the item
        const periodEnd = subscription.current_period_end
          ?? subscription.items?.data?.[0]?.current_period_end
          ?? null

        await supabaseAdmin
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: subscription.customer,
            stripe_subscription_id: subscription.id,
            status,
            price_id: subscription.items?.data?.[0]?.price?.id ?? null,
            cancel_at_period_end: !!subscription.cancel_at_period_end,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            // Permanent one-trial-per-account memory; row survives deletion
            ...(subscription.trial_end ? { trial_used: true } : {}),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })

        const plan = PREMIUM_STATUSES.has(status) ? 'premium' : 'free'
        await supabaseAdmin
          .from('profiles')
          .update({
            plan,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        console.log(`✅ Subscription ${status} for user ${userId} - plan set to ${plan}`)
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



