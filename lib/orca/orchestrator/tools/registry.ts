/**
 * Tool registry
 * =============================================================================
 * Centralised dispatch from ToolName to the executor function for that
 * tool. The orchestrator runner calls `executeTool(call, supabase)` and
 * never imports tool modules directly.
 */
import type { SupabaseLike, ToolCall, ToolName, ToolResult } from '../types'
import { run as runGetPrice } from './getPrice'
import { run as runGetWhaleFlows } from './getWhaleFlows'
import { run as runGetNews } from './getNews'
import { run as runGetSocial } from './getSocial'
import { run as runGetTrendingSocial } from './getTrendingSocial'
import { run as runExplainMacroFactor } from './explainMacroFactor'
import { run as runGetWalletActivity } from './getWalletActivity'
import { run as runGetArticleContext } from './getArticleContext'
import { run as runGetSignalContext } from './getSignalContext'
import { run as runFindTrackedWallets } from './findTrackedWallets'
import {
  runGetUserHoldings,
  runGetUserWatchlist,
  runGetOrcaMemory,
} from './userData'
import {
  runAddToWatchlist,
  runRemoveFromWatchlist,
  runSetUserAlert,
} from './writeTools'

export const READ_ONLY_TOOLS = new Set<ToolName>([
  'getPrice',
  'getWhaleFlows',
  'getNews',
  'getSocial',
  'getTrendingSocial',
  'getUserHoldings',
  'getUserWatchlist',
  'getSignalHistory',
  'explainMacroFactor',
  'getOrcaMemory',
  'getWalletActivity',
  'getArticleContext',
  'getSignalContext',
  'findTrackedWallets',
])

export async function executeTool(
  call: ToolCall,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  switch (call.tool) {
    case 'getPrice':
      return runGetPrice(call.args as any, supabase, now)
    case 'getWhaleFlows':
      return runGetWhaleFlows(call.args as any, supabase, now)
    case 'getNews':
      return runGetNews(call.args as any, supabase, now)
    case 'getSocial':
      return runGetSocial(call.args as any, supabase, now)
    case 'getTrendingSocial':
      return runGetTrendingSocial(call.args as any, supabase, now)
    case 'getUserHoldings':
      return runGetUserHoldings(call.args as any, supabase, now)
    case 'getUserWatchlist':
      return runGetUserWatchlist(call.args as any, supabase, now)
    case 'getOrcaMemory':
      return runGetOrcaMemory(call.args as any, supabase, now)
    case 'explainMacroFactor':
      return runExplainMacroFactor(call.args as any, supabase, now)
    case 'getWalletActivity':
      return runGetWalletActivity(call.args as any, supabase, now)
    case 'getArticleContext':
      return runGetArticleContext(call.args as any, supabase, now)
    case 'getSignalContext':
      return runGetSignalContext(call.args as any, supabase, now)
    case 'findTrackedWallets':
      return runFindTrackedWallets(call.args as any, supabase, now)
    case 'getSignalHistory':
      // Placeholder — will land with §4.F signal research.
      return {
        ok: false,
        data: null,
        source: 'signals',
        fetched_at: now().toISOString(),
        error: 'signals_pipeline_not_yet_wired',
      }
    case 'addToWatchlist':
      return runAddToWatchlist(call.args as any, supabase, now)
    case 'removeFromWatchlist':
      return runRemoveFromWatchlist(call.args as any, supabase, now)
    case 'setUserAlert':
      return runSetUserAlert(call.args, supabase, now)
    default: {
      const _exhaustive: never = call.tool
      return {
        ok: false,
        data: null,
        source: 'registry',
        fetched_at: now().toISOString(),
        error: `unknown_tool: ${String(_exhaustive)}`,
      }
    }
  }
}
