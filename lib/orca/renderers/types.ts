/**
 * Shared types + helpers for renderer prompts.
 */
import type { ToolCall, ToolResult, UserProfileSnapshot } from '../orchestrator/types'
import type { RecentTurn } from '../chat/loadRecentHistory'

export interface RenderArgs {
  toolResults: Array<{ call: ToolCall; result: ToolResult }>
  profile: UserProfileSnapshot | null
  message: string
  /**
   * Prior conversation turns (oldest → newest), already trimmed for the
   * prompt budget. Renderers prepend formatHistoryForPrompt(chatHistory) so
   * the writer can resolve "that", "those", "you said", etc. Optional — an
   * empty/absent array produces no history block.
   */
  chatHistory?: RecentTurn[]
}
