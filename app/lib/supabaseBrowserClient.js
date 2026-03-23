'use client'
import { createClient } from '@supabase/supabase-js'

let client = null

export const supabaseBrowser = () => {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  client = createClient(url, key)
  return client
}
