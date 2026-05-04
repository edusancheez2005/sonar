/**
 * WhaleAgent — aggregates whale_transactions + whale_alerts slice into a WhaleBrief.
 * Model: grok-3-mini (aggregation + classification).
 */
import { runAgent } from './registry'
import { getAgentClient } from './ai-client'
import { WhaleBriefSchema, type WhaleBrief, type AgentRun } from './types'

const SYSTEM = `You are WhaleAgent, a single-purpose on-chain flow summariser.
You receive aggregated whale stats from two independent sources (ERC-20 whale_transactions table and multi-chain Whale Alert API) for one ticker.
You output ONLY a JSON object matching this schema:

{
  "net_flow_usd_24h": number|null,
  "direction": "accumulation"|"distribution"|"mixed"|"no_data",
  "top_movements": [{"side": "in"|"out", "entity": string, "amount_usd": number, "time": string (ISO)}],
  "exchange_flow": {"in_usd": number|null, "out_usd": number|null},
  "confidence": "high"|"medium"|"low"|"none",
  "data_source": "whale_alerts"|"whale_transactions"|"both"|"none"
}

Hard rules:
- If BOTH sources are empty: direction="no_data", confidence="none", data_source="none", net_flow_usd_24h=null, top_movements=[].
- Compute direction from net_flow signal: > +0 -> accumulation, < -0 -> distribution, ratio in [0.4, 0.6] -> mixed.
- Confidence: "high" if both sources populated and agree; "medium" if one source with >=10 events; "low" if <10 events.
- Use ONLY values from the input. Never invent flows, addresses, or timestamps.
- Never advise the user; describe the data only.
- Output JSON only.`

interface WhaleInput {
  ticker: string
  whales: any
  whaleAlerts: any
}

export async function runWhaleAgent(input: WhaleInput): Promise<AgentRun<WhaleBrief>> {
  return runAgent({
    name: 'whale',
    schema: WhaleBriefSchema,
    exec: async (signal) => {
      const { client, smallModel } = getAgentClient()

      const w = input.whales || {}
      const a = input.whaleAlerts || {}

      const erc20Has = (w.transaction_count || 0) > 0 || (w.net_flow_24h || 0) !== 0
      const alertsHas = (a.recent_alerts?.length || 0) > 0

      // Short-circuit when both empty — no need to spend a call.
      if (!erc20Has && !alertsHas) {
        const empty: WhaleBrief = {
          net_flow_usd_24h: null,
          direction: 'no_data',
          top_movements: [],
          exchange_flow: { in_usd: null, out_usd: null },
          confidence: 'none',
          data_source: 'none',
        }
        return { raw: JSON.stringify(empty), tokens_in: 0, tokens_out: 0 }
      }

      const slim = {
        ticker: input.ticker,
        erc20: erc20Has
          ? {
              transaction_count: w.transaction_count ?? 0,
              total_volume_usd: w.total_volume_usd ?? 0,
              net_flow_24h: w.net_flow_24h ?? 0,
              buy_count: w.buy_count ?? 0,
              sell_count: w.sell_count ?? 0,
              buy_volume: w.buy_volume ?? 0,
              sell_volume: w.sell_volume ?? 0,
              cex_transactions: w.cex_transactions ?? 0,
              dex_transactions: w.dex_transactions ?? 0,
              top_moves: (w.top_moves || []).slice(0, 5).map((m: any) => ({
                side: (m.classification || '').toUpperCase() === 'BUY' ? 'in' : 'out',
                entity: m.from_label || m.to_label || 'unknown',
                amount_usd: Number(m.usd_value) || 0,
                time: m.timestamp || new Date().toISOString(),
              })),
            }
          : null,
        whale_alerts: alertsHas
          ? {
              total_volume_usd: a.total_volume_usd ?? 0,
              accumulation_signals: a.accumulation_signals ?? 0,
              distribution_signals: a.distribution_signals ?? 0,
              recent_alerts: (a.recent_alerts || []).slice(0, 10),
            }
          : null,
      }

      const userMsg = `Aggregated on-chain inputs:
${JSON.stringify(slim, null, 2)}

Produce the WhaleBrief JSON now. Pick data_source = "both" when both blocks are non-null.`

      const completion = await client.chat.completions.create(
        {
          model: smallModel,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: userMsg },
          ],
          temperature: 0.1,
          max_tokens: 900,
          response_format: { type: 'json_object' },
        },
        { signal }
      )

      const raw = completion.choices[0]?.message?.content || ''
      return {
        raw,
        tokens_in: completion.usage?.prompt_tokens || 0,
        tokens_out: completion.usage?.completion_tokens || 0,
      }
    },
  })
}
