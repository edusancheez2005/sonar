import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { authenticateApiKey } from '@/app/lib/apiKeyAuth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data, error } = await supabaseAdmin
    .from('computed_signals')
    .select('*')
    .order('computed_at', { ascending: false })
    .limit(50)

  if (error) {
    // Table might not exist
    if (error.code === '42P01') {
      return NextResponse.json({ data: [], message: 'Signals not yet computed' })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}
