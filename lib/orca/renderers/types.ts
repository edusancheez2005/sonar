/**
 * Shared types + helpers for renderer prompts.
 */
import type { ToolCall, ToolResult, UserProfileSnapshot } from '../orchestrator/types'

export interface RenderArgs {
  toolResults: Array<{ call: ToolCall; result: ToolResult }>
  profile: UserProfileSnapshot | null
  message: string
}
