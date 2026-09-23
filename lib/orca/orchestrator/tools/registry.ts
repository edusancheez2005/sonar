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
import { run as runGetTrendingWhales } from './getTrendingWhales'
import { run as runGetNews } from './getNews'
import { run as runGetTrendingNews } from './getTrendingNews'
import { run as runGetSocial } from './getSocial'
import { run as runGetTrendingSocial } from './getTrendingSocial'
import { run as runExplainMacroFactor } from './explainMacroFactor'
import { run as runGetMacroFactors } from './getMacroFactors'
import { run as runGetWalletActivity } from './getWalletActivity'
import { run as runGetMostActiveWallets } from './getMostActiveWallets'
import { run as runGetTopPerformingWallets } from './getTopPerformingWallets'
import { run as runGetLargestTransactions } from './getLargestTransactions'
import { run as runGetDerivatives } from './getDerivatives'
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
  'getTrendingWhales',
  'getNews',
  'getTrendingNews',
  'getSocial',
  'getTrendingSocial',
  'getUserHoldings',
  'getUserWatchlist',
  'getSignalHistory',
  'explainMacroFactor',
  'getMacroFactors',
  'getOrcaMemory',
  'getWalletActivity',
  'getMostActiveWallets',
  'getTopPerformingWallets',
  'getLargestTransactions',
  'getDerivatives',
  'getArticleContext',
  'getSignalContext',
  'findTrackedWallets',
])

// Latency guard (2026-09-21): tool batches run under Promise.all, so the turn
// waits for the SLOWEST member — and a hung Supabase/upstream call used to
// ride all the way to the ~60s platform kill. Every tool now races a hard
// timeout; the writer already degrades gracefully on ok:false results.
// Override via ORCA_TOOL_TIMEOUT_MS.
// 10s (was 6s on 2026-09-21 for a few hours): getMostActiveWallets' RPC
// legitimately runs 6-8s and the 6s cap turned "most profitable wallet"
// into a dead-end answer the same evening it shipped.
const TOOL_TIMEOUT_MS = Number(process.env.ORCA_TOOL_TIMEOUT_MS) || 10_000

export async function executeTool(
  call: ToolCall,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      executeToolInner(call, supabase, now),
      new Promise<ToolResult>((resolve) => {
        timer = setTimeout(
          () =>
            resolve({
              ok: false,
              data: null,
              source: 'timeout',
              fetched_at: now().toISOString(),
              error: `tool_timeout:${call.tool} (${TOOL_TIMEOUT_MS}ms)`,
            }),
          TOOL_TIMEOUT_MS
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function executeToolInner(
  call: ToolCall,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  switch (call.tool) {
    case 'getPrice':
      return runGetPrice(call.args as any, supabase, now)
    case 'getWhaleFlows':
      return runGetWhaleFlows(call.args as any, supabase, now)
    case 'getTrendingWhales':
      return runGetTrendingWhales(call.args as any, supabase, now)
    case 'getNews':
      return runGetNews(call.args as any, supabase, now)
    case 'getTrendingNews':
      return runGetTrendingNews(call.args as any, supabase, now)
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
    case 'getMacroFactors':
      return runGetMacroFactors(call.args as any, supabase, now)
    case 'getWalletActivity':
      return runGetWalletActivity(call.args as any, supabase, now)
    case 'getMostActiveWallets':
      return runGetMostActiveWallets(call.args as any, supabase, now)
    case 'getTopPerformingWallets':
      return runGetTopPerformingWallets(call.args as any, supabase, now)
    case 'getLargestTransactions':
      return runGetLargestTransactions(call.args as any, supabase, now)
    case 'getDerivatives':
      return runGetDerivatives(call.args as any, supabase, now)
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
