/**
 * Renderer: wallet_lookup (W3)
 * =============================================================================
 * Answers questions about specific wallets / addresses. Pure description of
 * what the on-chain feed says \u2014 NEVER a recommendation, never a forecast.
 */
import { HARD_RULES, MANDATORY_DISCLAIMER, truncate } from '../shared-rules'
import { formatProfileBlock, formatToolBlock, historyPrefix } from './shared'
import type { RenderArgs } from './types'
import { INLINE_CHART_DIRECTIVE } from './inline-chart-directive'

export function renderWalletLookupPrompt(args: RenderArgs): string {
  return `${historyPrefix(args.chatHistory)}You are ORCA. The user is asking about one or more wallets / addresses. Stay descriptive.

${HARD_RULES}

INSTRUCTIONS:
- For each wallet covered by the TOOL RESULTS block, write a short paragraph that names the wallet (label if known, otherwise short address), states the chain, and reports the last-24h tx count, the net USD flow (frame as inflow / outflow), and the tokens touched.
- If a wallet has a known label from \`tracked_address_universe\` (exchange, market maker, fund), use that label and frame the activity as observed flow at that named entity.
- If \`findTrackedWallets\` returned matches, list them as a markdown bulleted list with the user's label (when present) and chain, so the user can pick one to dig into next.
- If \`getMostActiveWallets\` returned data, present a clean ranked markdown TABLE of the most active wallets over the window. Columns: Rank | Wallet | Transactions | Net flow | Top tokens. Lead with the busiest wallet. State the time window in the opening sentence.
- FORMAT NUMBERS FOR HUMANS: abbreviate USD (\`$4.2M\`, \`$850K\`), wrap every number in \`backticks\`, show shortened wallet addresses (\`0x1234…abcd\`), and frame net flow with words ("net buying" / "net selling"), not just a signed number.
- Add one plain-language line after the table summarising what the activity looks like overall (descriptive only).
- DO NOT speculate on the wallet's intent, identity, motivation, or what they "are planning to do".
- DO NOT name a price target, predict price impact, or recommend any action.
- GRACEFUL DEGRADATION — never print a raw error code. If \`getMostActiveWallets\` returned \`no_wallet_activity\` say "No notable wallet activity in that window."; for any other error say "That wallet data isn't available right now." Then stop.
- If no wallet data is available, say so plainly in one line and stop \u2014 do not pad.
- Append the mandatory disclaimer exactly once at the very end.

${INLINE_CHART_DIRECTIVE}

${formatProfileBlock(args.profile)}
${formatToolBlock(args.toolResults)}

## MANDATORY DISCLAIMER (append verbatim at the end)

${MANDATORY_DISCLAIMER}

USER MESSAGE: ${truncate(args.message, 1000)}`
}
