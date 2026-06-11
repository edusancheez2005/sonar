/**
 * Tool: getMacroFactors
 * =============================================================================
 * §5.1 of ORCA_NANSEN_LEVEL_COPILOT_PROMPT.md.
 *
 * Live macro factors affecting crypto this week, over the SHARED macro core
 * (`lib/social/macroFactors.ts`) that also powers `/api/social/macro`. ORCA and
 * the macro panel therefore read one source and one 12h cache.
 *
 * Read-only, never throws. On upstream failure returns
 * `{ ok:false, error:'macro_unavailable' }` so the renderer degrades to an
 * honest "live macro data is unavailable" line rather than fabricating.
 */
import { getMacroFactors } from '../../../social/macroFactors'
import type { ToolResult } from '../types'

export async function run(
  _args: unknown,
  _supabase: unknown,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  try {
    const result = await getMacroFactors()
    return {
      ok: true,
      data: {
        factors: result.factors,
        overall_sentiment: result.overall_sentiment,
        last_updated: result.last_updated,
        stale: result.stale,
      },
      source: 'macro_factors',
      fetched_at,
    }
  } catch {
    return {
      ok: false,
      data: null,
      source: 'macro_factors',
      fetched_at,
      error: 'macro_unavailable',
    }
  }
}
