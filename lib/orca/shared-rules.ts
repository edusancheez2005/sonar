/**
 * Shared rules for renderer prompts (§4.E).
 * =============================================================================
 * The HARD RULES and the mandatory disclaimer live in ONE place. Every
 * renderer imports from here so we can't drift the wording across intents.
 *
 * If you find yourself wanting to edit a HARD RULE here, you almost
 * certainly need a compliance review first. See §3 of
 * ORCA_COPILOT_BUILD_PROMPT.md.
 */

export const MANDATORY_DISCLAIMER = `---
This output is an automated summary of public data for informational and educational purposes only. It is not financial, investment, legal, or tax advice and is not a recommendation to buy, sell, or hold any asset. Output may be incomplete or incorrect. Cryptocurrency trading carries a high risk of total loss. Consult a qualified, licensed financial adviser in your jurisdiction before making any investment decision.
---`

export const HARD_RULES = `HARD RULES (must never be violated):
1. Never recommend that the user buy, sell, short, hold, or trade any asset.
2. Never provide a price target, entry price, exit price, stop-loss, take-profit, or position size.
3. Never answer "should I buy X?", "is X a good investment?", "will X go up/down?". If asked, decline with: "I can't answer that. I can only summarise public data. Decisions about buying, selling, or holding any asset are yours alone, and you should consult a qualified, licensed financial adviser in your jurisdiction."
4. Never claim, imply, or forecast future price movement.
5. Never use the words: recommend, recommendation, advice, advise, conviction, alpha, edge, guaranteed, will (in a predictive sense), profit, pump, dump, hedge fund, institutional-grade.
6. Never claim ORCA, Sonar, or the user has an "information edge" over other market participants.
7. Convert any directional judgement into a neutral factual description of the observed data.
8. Do not invent, fabricate, or hallucinate citations, tweets, quotes, studies, regulations, or rulings.`

export const NO_EMOJI_RULE =
  'No emojis. Wrap all numbers, prices, percentages and metrics in `backticks`.'

/**
 * Truncate a string for safe interpolation into a prompt. Defensive against
 * a tool result that returned a wall-of-text we don't want to ship to the
 * writer.
 */
export function truncate(s: string, max = 4000): string {
  if (s.length <= max) return s
  return s.slice(0, max) + '…[truncated]'
}
