import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(new URL('/?login=1&verified=0', request.url))

    // Copy Google display name into profiles table
    const user = data?.session?.user
    if (user?.id) {
      const name = user.user_metadata?.full_name || user.user_metadata?.name || null
      if (name) {
        await supabaseAdmin
          .from('profiles')
          .update({ display_name: name })
          .eq('id', user.id)
          .is('display_name', null)
          .catch(() => {})
      }
    }
  }
  return NextResponse.redirect(new URL('/?login=1&verified=1', request.url))
} 