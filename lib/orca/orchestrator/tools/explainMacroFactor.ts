/**
 * Tool: explainMacroFactor
 * =============================================================================
 * Pure-knowledge tool — no API call. Returns a short explanatory blurb for
 * a macro factor mentioned in the user's question (e.g. "CPI", "FOMC",
 * "ETF flows"). The actual writer prompt will weave this into prose; the
 * tool just supplies the canonical one-paragraph context so the writer
 * doesn't hallucinate definitions.
 */
import type { ToolResult } from '../types'

interface ExplainArgs {
  entities?: unknown
}

const MACRO_GLOSSARY: Record<string, string> = {
  cpi: 'CPI (Consumer Price Index) is a monthly US inflation print. Higher than expected readings have historically tightened liquidity and weighed on crypto risk assets in the short term.',
  fomc: 'The FOMC (Federal Open Market Committee) sets the US benchmark interest rate. Hawkish guidance compresses risk-asset valuations; dovish guidance has the opposite effect.',
  etf: 'Spot crypto ETFs are vehicles that let traditional investors get exposure without holding the underlying. Net inflows / outflows are tracked daily and often used as a flow-of-funds proxy.',
  halving: 'A Bitcoin halving cuts the block subsidy in half, reducing new BTC issuance. Historically associated with multi-month price cycles, though causation is debated.',
  unlock: 'A token unlock is the scheduled release of previously vested tokens to insiders or the foundation. Large unlocks expand free float and often correlate with downward price pressure around the unlock date.',
}

export async function run(
  args: ExplainArgs,
  _supabase: unknown,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const entities = Array.isArray(args.entities)
    ? (args.entities as unknown[]).filter((x): x is string => typeof x === 'string')
    : []
  const matches: Array<{ key: string; explanation: string }> = []
  for (const ent of entities) {
    const k = ent.toLowerCase().replace(/[^a-z]/g, '')
    if (MACRO_GLOSSARY[k]) matches.push({ key: k, explanation: MACRO_GLOSSARY[k] })
  }
  return {
    ok: true,
    data: { matches },
    source: 'macro_glossary',
    fetched_at,
  }
}
