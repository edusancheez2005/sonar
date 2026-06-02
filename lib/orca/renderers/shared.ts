/**
 * Shared formatters for renderer prompts.
 */
import { truncate } from '../shared-rules'
import { formatHistoryForPrompt } from '../chat/formatHistoryForPrompt'
import type { RecentTurn } from '../chat/loadRecentHistory'
import type { ToolCall, ToolResult, UserProfileSnapshot } from '../orchestrator/types'

/**
 * Prior-conversation block to prepend to a renderer prompt. Returns '' when
 * there is no history (so callers can `${historyPrefix(args.chatHistory)}` at
 * the top of a template without leaving stray blank lines — the trailing
 * newlines are only emitted when there is content).
 */
export function historyPrefix(chatHistory?: RecentTurn[]): string {
  const block = formatHistoryForPrompt(chatHistory ?? [])
  return block ? `${block}\n\n` : ''
}

export function formatProfileBlock(profile: UserProfileSnapshot | null): string {
  if (!profile) {
    return 'USER PROFILE: anonymous (use neutral intermediate tone).'
  }
  const chains = Array.isArray(profile.preferred_chains) ? profile.preferred_chains.join(',') : 'unknown'
  return `USER PROFILE:
- experience: ${profile.experience_level ?? 'unknown'}
- primary_goal: ${profile.primary_goal ?? 'unknown'}
- risk_tolerance: ${profile.risk_tolerance ?? 'unknown'}
- time_horizon: ${profile.time_horizon ?? 'unknown'}
- preferred_chains: ${chains}`
}

export function formatToolBlock(
  toolResults: Array<{ call: ToolCall; result: ToolResult }>
): string {
  if (toolResults.length === 0) return 'TOOL RESULTS: (no tools were run)\n'
  const sections = toolResults.map(({ call, result }) => {
    const head = `# tool=${call.tool} ok=${result.ok} source=${result.source}`
    const args = `args=${truncate(JSON.stringify(call.args), 500)}`
    const body = result.ok
      ? `data=${truncate(JSON.stringify(result.data), 4000)}`
      : `error=${result.error ?? 'unknown'}`
    return `${head}\n${args}\n${body}`
  })
  return `TOOL RESULTS:\n${sections.join('\n\n')}\n`
}
