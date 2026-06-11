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
  ratecut: 'A rate cut is a reduction in the central bank benchmark interest rate. Lower rates ease financial conditions and have historically been supportive for risk assets including crypto, though the effect depends on why rates were cut.',
  liquidity: 'Liquidity refers to how much cash-like capital is circulating in markets and how easily assets can be traded without moving the price. Expanding liquidity has historically been a tailwind for risk assets; contracting liquidity a headwind.',
  stablecoindepeg: 'A stablecoin depeg is when a token meant to track $1 (or another reference) trades meaningfully away from that value. It signals stress in the issuer or its reserves and can ripple into lending markets and trading pairs that rely on the peg.',
  gas: 'Gas is the fee paid to have a transaction processed on a blockchain such as Ethereum. It rises with network demand and falls when activity is light; persistently high gas can push activity onto cheaper layer-2 networks.',
  staking: 'Staking is locking tokens to help secure a proof-of-stake network in exchange for protocol rewards. It reduces freely circulating supply and ties a yield to network participation rather than to trading.',
  airdrop: 'An airdrop is a distribution of free tokens to a set of wallets, usually to reward early users or bootstrap a new network. Recipients often sell part of an airdrop, which can add short-term supply to the market.',
  restaking: 'Restaking lets already-staked assets be re-used to help secure additional protocols, layering extra rewards on top of base staking. It increases capital efficiency but also concentrates risk if an underlying validator is penalised.',
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

/**
 * True when at least one entity matches a known glossary term. Used by the
 * planner (§5.2) to decide whether to add the definitional tool alongside the
 * live `getMacroFactors` source. Mirrors the normalisation used by `run`.
 */
export function matchesMacroGlossary(entities: readonly unknown[] | undefined): boolean {
  if (!Array.isArray(entities)) return false
  for (const ent of entities) {
    if (typeof ent !== 'string') continue
    const k = ent.toLowerCase().replace(/[^a-z]/g, '')
    if (MACRO_GLOSSARY[k]) return true
  }
  return false
}
