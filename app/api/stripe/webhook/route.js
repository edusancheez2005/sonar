import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { trackServer } from '@/lib/analytics/trackServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Subscription statuses that keep a user on the premium plan. 'trialing' is
// the free-trial window; 'past_due' is a grace period while Stripe retries a
// failed card so a hiccup doesn't instantly lock a paying user out.
const PREMIUM_STATUSES = new Set(['trialing', 'active', 'past_due'])

function idOf(v) {
  return typeof v === 'string' ? v : v && typeof v === 'object' && typeof v.id === 'string' ? v.id : null
}

/**
 * Funnel `paid` = the FIRST money actually collected on a subscription, once.
 * Written from checkout.session.completed (immediate charge) or invoice.paid
 * (trial conversion, delayed payment methods), whichever arrives first.
 * Never throws: a funnel problem must not fail the webhook and trigger retries.
 */
async function trackPaidOnce({ userId, subscriptionId, stage, amount, stripeEventId }) {
  try {
    if (!userId) return
    if (subscriptionId) {
      const { data, error } = await supabaseAdmin
        .from('funnel_events')
        .select('id')
        .eq('event', 'paid')
        .eq('props->>subscription_id', subscriptionId)
        .limit(1)
      if (error || (Array.isArray(data) && data.length > 0)) return
    }
    await trackServer(supabaseAdmin, {
      userId,
      event: 'paid',
      props: { stage, subscription_id: subscriptionId || null, amount: Number(amount || 0), stripe_event_id: stripeEventId || null },
      path: '/subscribe',
    })
  } catch {
    /* ignore */
  }
}

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
          // Funnel. Money taken now → `paid` (first charge). Otherwise this is
          // a checkout stage: a free trial, a delayed payment method (SEPA,
          // Bacs, ACH) or a 100%-off code. The first real charge arrives later
          // as invoice.paid. stripe_event_id is unique per event in
          // funnel_events, so a redelivered webhook cannot add a second row.
          const subId = idOf(subscriptionId)
          const chargedNow = session.payment_status === 'paid' && Number(session.amount_total || 0) > 0
          if (chargedNow) {
            await trackPaidOnce({ userId, subscriptionId: subId, stage: 'first_charge', amount: session.amount_total, stripeEventId: event.id })
          } else {
            let trialing = false
            try {
              if (subId) {
                const sub = await stripe.subscriptions.retrieve(subId)
                trialing = sub?.status === 'trialing' || !!sub?.trial_end
              }
            } catch { /* label falls back below */ }
            await trackServer(supabaseAdmin, {
              userId,
              event: 'checkout',
              props: {
                stage: trialing ? 'trial_started' : session.payment_status === 'unpaid' ? 'pending_payment' : 'no_charge',
                subscription_id: subId,
                stripe_event_id: event.id || null,
              },
              path: '/subscribe',
            })
          }
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

        // (trialing → active happens when the trial ENDS, about an hour before
        //  Stripe charges the card and even if the charge then fails, so it
        //  is not a revenue signal; invoice.paid below is.)
        break
      }
      case 'invoice.paid': {
        // The first real charge on a subscription: after a free trial, a
        // delayed payment method, or the first period of a no-trial plan.
        // Needs `invoice.paid` enabled on this webhook endpoint in Stripe.
        const inv = event.data.object
        const subId = idOf(inv.subscription) || idOf(inv.parent?.subscription_details?.subscription)
        if (!subId || !(Number(inv.amount_paid) > 0)) break
        let stage = null
        if (inv.billing_reason === 'subscription_create') {
          stage = 'first_charge'
        } else if (inv.billing_reason === 'subscription_cycle') {
          // Only the invoice that ends a free trial is a first payment; every
          // other cycle invoice is a renewal (including subscriptions that
          // existed before funnel_events did).
          try {
            const sub = await stripe.subscriptions.retrieve(subId)
            const lineStart = inv.lines?.data?.[0]?.period?.start
            if (sub?.trial_end && lineStart && Math.abs(Number(lineStart) - Number(sub.trial_end)) < 3600) stage = 'trial_converted'
          } catch { /* not provable → not counted */ }
        }
        if (!stage) break
        const meta = inv.subscription_details?.metadata || inv.parent?.subscription_details?.metadata || {}
        const userId = meta.supabase_user_id || (await resolveUserId(stripe, { customer: inv.customer, metadata: meta }))
        await trackPaidOnce({ userId, subscriptionId: subId, stage, amount: inv.amount_paid, stripeEventId: event.id })
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



