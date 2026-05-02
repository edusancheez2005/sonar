import 'server-only'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const supabaseAdmin = createClient(url, key, {
  auth: { persistSession: false },
  // Disable Vercel/Next.js fetch cache — Supabase queries must always hit
  // the live DB, not a stale edge-cached PostgREST response.
  global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) },
})