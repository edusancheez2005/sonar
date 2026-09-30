/**
 * Explainer fast path (2026-09-30).
 * =============================================================================
 * "Explain what a whale is", "what does net inflow mean?", "what is a
 * stablecoin?" — definitional questions with no ticker. They used to take
 * 19-22s: LLM router → planner ("no tool needed") → deterministic fallback ran
 * three leaderboards anyway → flagship writer. One low-effort flagship call
 * with a compact prompt answers in ~3-5s. Data questions (anything with a
 * ticker, a time window or an activity/price/news word) are excluded so they
 * keep their data paths.
 */
import { HARD_RULES } from './shared-rules'

const EXPLAINER_RE =
  /^\s*(?:hey|hi|ok|okay|so|please|pls|can you|could you|quick question[,:]?)?\s*(?:explain|what (?:is|are|does|do|'s|s)\b|whats\b|define|how (?:does|do|is|are)\b|meaning of|tell me what|eli5)/i
const DATA_ASK_RE =
  /\b(doing|done|today|now|right now|latest|this week|last|past|24h|current(?:ly)?|price|volume|buying|selling|bought|sold|moves?|moving|activity|trending|hot|top|biggest|largest|news|headlines?|sentiment|happening|going on|update|recap|rank|leaderboard|my |portfolio|watchlist|should i|will|predict|sonar|orca)\b/i
const CRYPTO_CONCEPT_RE =
  /\b(crypto|whale|whales|blockchain|on-?chain|wallet|token|coin|stablecoin|defi|dex|cex|exchange|gas|staking|stake|liquidity|inflow|outflow|net flow|market cap|fdv|tvl|airdrop|halving|mining|validator|smart contract|nft|layer ?[12]|l1|l2|rollup|bridge|memecoin|altcoin|bitcoin|ethereum|solana|funding rate|open interest|leverage|liquidation|perp|derivatives|yield|apy|apr|slippage|mev|oracle|galaxy score|alt ?rank|accumulation|distribution|smart money|cold wallet|hot wallet|seed phrase|private key|custod\w*|etf|dominance|volatility|drawdown)\b/i

/** True for a definitional crypto question with no ticker and no data ask. */
export function isExplainerQuestion(message: string, hasTicker: boolean): boolean {
  if (hasTicker) return false
  const m = String(message || '').trim()
  if (m.length < 8 || m.length > 200) return false
  if (!EXPLAINER_RE.test(m)) return false
  if (DATA_ASK_RE.test(m)) return false
  return CRYPTO_CONCEPT_RE.test(m)
}

export const EXPLAINER_SYSTEM_PROMPT = `${HARD_RULES}

You are ORCA, Sonar's crypto research assistant. The user is asking what a crypto concept means. Explain it in plain English for someone new to crypto:
- At most two short paragraphs (under 140 words total).
- One concrete example with realistic numbers.
- Define any jargon you use in a few words.
- Finish with ONE sentence on where to see this on Sonar (the whale transaction feed and leaderboards, the token pages, the Trending page, or by asking ORCA).
- Never give advice, predictions or price targets, and never tell the user what to buy, sell or hold.`
