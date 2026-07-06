import { NextResponse } from 'next/server'
import { getWhaleLeaderboard } from '@/app/lib/leaderboardData'

// Heavy Supabase aggregation over all_whale_transactions; never static-gen.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const data = await getWhaleLeaderboard()
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
