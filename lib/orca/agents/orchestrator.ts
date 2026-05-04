/**
 * ORCA v2 orchestrator — wires the three sub-agents + synthesiser together.
 *
 * Strategy: call buildOrcaContext ONCE (this already fans out to all the
 * underlying data sources in parallel), then split the result into per-agent
 * inputs and dispatch the three classifier/summary agents via Promise.allSettled.
 * Pass the resulting briefs (some may be null) to the synthesiser.
 */
import { buildOrcaContext } from '../context-builder'
import { runNewsAgent } from './news-agent'
import { runQuantAgent } from './quant-agent'
import { runWhaleAgent } from './whale-agent'
import { runSynthesiser } from './synth-agent'
import type { AgentRun, PipelineTelemetry, SSEEvent } from './types'

interface OrchestratorArgs {
  ticker: string
  userId: string
  message: string
  send: (event: SSEEvent) => void
}

export async function runOrcaPipeline({
  ticker,
  userId,
  message,
  send,
}: OrchestratorArgs): Promise<{ telemetry: PipelineTelemetry; synthOk: boolean }> {
  const t0 = Date.now()
  send({ type: 'status', step: 'start', message: `Analyzing ${ticker}…` })

  // 1) Pre-fetch all raw data once (this already parallelises internally).
  send({ type: 'status', step: 'context', message: 'Fetching raw data sources' })
  const context = await buildOrcaContext(ticker, userId)

  // 2) Dispatch the three classifier agents in parallel.
  const newsHeadlines = (context?.news?.headlines || []) as any[]
  const newsPromise = runNewsAgent({ ticker, headlines: newsHeadlines })
  const quantPromise = runQuantAgent({
    ticker,
    price: context?.price,
    coingecko: context?.coingecko,
  })
  const whalePromise = runWhaleAgent({
    ticker,
    whales: context?.whales,
    whaleAlerts: context?.whaleAlerts,
  })

  const [newsRes, quantRes, whaleRes] = (await Promise.allSettled([
    newsPromise,
    quantPromise,
    whalePromise,
  ])) as Array<PromiseSettledResult<AgentRun<any>>>

  const newsRun: AgentRun<any> =
    newsRes.status === 'fulfilled'
      ? newsRes.value
      : { agent: 'news', ok: false, brief: null, latency_ms: 0, tokens_in: 0, tokens_out: 0, error: String(newsRes.reason), from_cache: false }
  const quantRun: AgentRun<any> =
    quantRes.status === 'fulfilled'
      ? quantRes.value
      : { agent: 'quant', ok: false, brief: null, latency_ms: 0, tokens_in: 0, tokens_out: 0, error: String(quantRes.reason), from_cache: false }
  const whaleRun: AgentRun<any> =
    whaleRes.status === 'fulfilled'
      ? whaleRes.value
      : { agent: 'whale', ok: false, brief: null, latency_ms: 0, tokens_in: 0, tokens_out: 0, error: String(whaleRes.reason), from_cache: false }

  for (const r of [newsRun, quantRun, whaleRun]) {
    send({
      type: 'status',
      step: `agent:${r.agent}`,
      latency_ms: r.latency_ms,
      ok: r.ok,
      detail: r.error,
    })
  }

  // 3) Synthesiser — the only streaming step.
  send({ type: 'status', step: 'synthesising', message: 'Synthesising final response' })
  const synth = await runSynthesiser(
    {
      ticker,
      message,
      news: newsRun.brief,
      quant: quantRun.brief,
      whale: whaleRun.brief,
    },
    (delta) => send({ type: 'token', delta })
  )

  const telemetry: PipelineTelemetry = {
    ticker,
    total_latency_ms: Date.now() - t0,
    total_tokens_in: newsRun.tokens_in + quantRun.tokens_in + whaleRun.tokens_in + synth.tokens_in,
    total_tokens_out: newsRun.tokens_out + quantRun.tokens_out + whaleRun.tokens_out + synth.tokens_out,
    synth_chars: synth.full_text.length,
    agents: [newsRun, quantRun, whaleRun, {
      agent: 'synth',
      ok: synth.ok,
      latency_ms: 0, // captured inside synth log; not part of AgentRun for synth
      tokens_in: synth.tokens_in,
      tokens_out: synth.tokens_out,
      error: synth.error,
      from_cache: false,
    } as any],
  }

  return { telemetry, synthOk: synth.ok }
}
