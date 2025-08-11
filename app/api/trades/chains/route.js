import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET(req) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }
  const { searchParams } = new URL(req.url)
  const sinceHours = Math.max(0, parseInt(searchParams.get('sinceHours') || '168', 10)) // default 7d
  let q = supabaseAdmin.from('whale_transactions').select('blockchain')
  if (sinceHours > 0) {
    const sinceIso = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString()
    q = q.gte('timestamp', sinceIso)
  }
  const { data, error } = await q.order('blockchain', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const chains = Array.from(new Set((data || []).map(r => r.blockchain).filter(Boolean)))
  return NextResponse.json({ data: chains })
} 