/**
 * GET /api/dashboard/whale-whisper
 * Returns the latest Whale Whisper narrative for the dashboard.
 * Optional: ?count=5 to get multiple recent whispers.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const count = Math.min(parseInt(searchParams.get('count') || '1'), 10)

    const { data, error } = await supabaseAdmin
      .from('whale_whispers')
      .select('id, narrative, summary, market_bias, confidence, key_tokens, created_at')
      .order('created_at', { ascending: false })
      .limit(count)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        whisper: null,
        message: 'No whispers yet. First narrative generates within 4 hours.',
      })
    }

    if (count === 1) {
      return NextResponse.json({ whisper: data[0] })
    }

    return NextResponse.json({ whispers: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
