/**
 * Funnel events — the single list both the client helper and the server
 * writers validate against. Keep in sync with the CHECK constraint in
 * supabase/migrations/20261003_funnel_events.sql.
 *
 *   signup         account created (props.method: email | google | wallet)
 *   welcome_choice first-run dialog choice (props.choice)
 *   follow         a wallet/entity follow (props.source, slug, address)
 *   alert_set      an alert rule created (props.kind, source)
 *   orca_question  a question sent to ORCA (props.source, chars)
 *   paywall_view   a premium gate or the subscribe page shown (props.feature)
 *   checkout       Stripe checkout session created (props.price_id)
 *   paid           checkout.session.completed from Stripe
 */
export const FUNNEL_EVENTS = Object.freeze([
  'signup',
  'welcome_choice',
  'follow',
  'alert_set',
  'orca_question',
  'paywall_view',
  'checkout',
  'paid',
])

const SET = new Set(FUNNEL_EVENTS)

export function isFunnelEvent(name) {
  return typeof name === 'string' && SET.has(name)
}

/** Props are small context, never payloads: flat, ≤ 2 KB serialised. */
export const MAX_PROPS_BYTES = 2048

export function sanitiseProps(props) {
  if (!props || typeof props !== 'object' || Array.isArray(props)) return {}
  const out = {}
  for (const [k, v] of Object.entries(props)) {
    if (typeof k !== 'string' || k.length > 40) continue
    if (v === null || typeof v === 'boolean' || typeof v === 'number') { out[k] = v; continue }
    if (typeof v === 'string') { out[k] = v.slice(0, 200); continue }
    // nested objects/arrays are dropped — keep the table queryable
  }
  let json = JSON.stringify(out)
  if (json.length > MAX_PROPS_BYTES) return { _truncated: true }
  return out
}
