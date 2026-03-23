import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET(req) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address') || null

  let query = supabaseAdmin
    .from('wallet_alerts')
    .select('*')
    .order('created_at', { ascending: false })

  if (address) {
    query = query.eq('address', address)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}

export async function POST(req) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { address, chain, alert_type, min_usd_value, notify_telegram, telegram_chat_id } = body
  if (!address || typeof address !== 'string') {
    return NextResponse.json({ error: 'address is required' }, { status: 400 })
  }
  if (!alert_type || typeof alert_type !== 'string') {
    return NextResponse.json({ error: 'alert_type is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('wallet_alerts')
    .insert({
      address: address.trim(),
      chain: chain || null,
      alert_type,
      min_usd_value: min_usd_value != null ? Number(min_usd_value) : null,
      notify_telegram: !!notify_telegram,
      telegram_chat_id: telegram_chat_id || null,
    })
    .select()
    .single()

  if (error) {
    // Handle check constraint violations with a user-friendly message
    if (error.code === '23514') {
      return NextResponse.json(
        { error: 'Invalid alert_type. Run the migration in supabase/migrations/20260323_fix_wallet_alerts_constraint.sql to fix.' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
