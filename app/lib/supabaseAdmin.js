import 'server-only'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const supabaseAdmin = createClient(url, key, { auth: { persistSession: false } })

/**
 * Variant of supabaseAdmin that opts every PostgREST request out of the
 * Next.js fetch cache. Use this from CRON routes and any code path where
 * stale reads would corrupt downstream output (freshness gates,
 * compute-signals, evaluate-signals, fetch-prices, etc.).
 *
 * Why this exists separately: applying { cache: 'no-store' } to the GLOBAL
 * supabaseAdmin breaks static page generation — any route that reads from
 * Supabase at module init becomes "Dynamic server usage" and the build
 * times out. Routes that don't need millisecond-fresh reads should keep
 * using `supabaseAdmin` and let Next.js cache responses across requests.
 */
export const supabaseAdminFresh = createClient(url, key, {
  auth: { persistSession: false },
  global: { fetch: (input, opts = {}) => fetch(input, { ...opts, cache: 'no-store' }) },
})