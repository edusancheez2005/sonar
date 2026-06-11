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
        overall_sentiment: result.overall_sentiment,
        last_updated: result.last_updated,
        stale: result.stale,
      },
      {
        headers: {
          'Cache-Control': result.stale
            ? 's-maxage=300'
            : 's-maxage=43200, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error: any) {
    console.error('Macro factors error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to fetch macro factors' }, { status: 500 })
  }
}
