/**
 * Macro Factors API — REAL DATA EDITION
 *
 * Thin wrapper over the shared macro core (`lib/social/macroFactors.ts`). Both
 * this route and the ORCA `getMacroFactors` tool call that core, so the macro
 * panel and ORCA share ONE source and ONE 12h cache (no self-HTTP from inside a
 * serverless function). See §5.1 of ORCA_NANSEN_LEVEL_COPILOT_PROMPT.md.
 *
 * The core uses the xAI Responses API (`/v1/responses`) with the `web_search`
 * tool — the NEW supported endpoint for live web search — and seeds the prompt
 * with the freshest news_items headlines to prevent fabrication.
 */

import { NextResponse } from 'next/server'
import { getMacroFactors } from '@/lib/social/macroFactors'

export const dynamic = 'force-dynamic'


export async function GET() {
  try {
    const result = await getMacroFactors()
    return NextResponse.json(
      {
        factors: result.factors,
        // Derived from the factors (lib/social/macroFactors deriveOverall):
        // the side with more factors wins when it leads by 2 or more.
        overall_sentiment: result.overall_sentiment,
        llm_overall_sentiment: result.llm_overall_sentiment ?? null,
        derived_from: result.derived_from ?? 'factors',
        counts: result.counts ?? null,
        rule: 'Badge = the side with more factors when it leads by 2 or more; otherwise neutral.',
        visible_count: 3,
        generated_at: result.generated_at ?? null,
        last_updated: result.last_updated,
        market: result.market ?? null,
        stale: result.stale,
      },
      {
        // 5 minutes at the edge (it was 12 h, so a new generation could take
        // half a day to show). The function reads one cached row per request.
        headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
      }
    )
  } catch (error: any) {
    console.error('Macro factors error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to fetch macro factors' }, { status: 500 })
  }
}
