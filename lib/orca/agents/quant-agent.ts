/**
 * QuantAgent — turns price/derivatives slice of OrcaContext into a QuantBrief.
 * Model: grok-3-mini (numeric reasoning, cheap).
 */
import { runAgent } from './registry'
import { getAgentClient } from './ai-client'
import { QuantBriefSchema, type QuantBrief, type AgentRun } from './types'

const SYSTEM = `You are QuantAgent, a single-purpose numeric-summary assistant.
You receive pre-computed price + chart + derivatives fields for one ticker and
output ONLY a JSON object matching this schema:

{
  "price": {"usd": number, "change_24h_pct": number|null, "change_7d_pct": number|null},
  "structure": {"trend": "up"|"down"|"range"|"unknown", "volatility_regime": "low"|"elevated"|"high"|"unknown"},
  "derivatives": {"funding_8h_pct": number|null, "oi_change_24h_pct": number|null},
  "tech_signals": string[] (max 6, factual descriptions like "above 200d SMA", "RSI 62"),
  "anomalies": string[] (max 4, factual e.g. "volume +180% vs 30d avg")
}

Hard rules:
- Use ONLY values present in the input. If a field is missing, set the corresponding output to null/"unknown" and do NOT invent a number.
- volatility_regime: map provided 7d volatility (% std dev) -> low <2, elevated 2-5, high >5. If absent -> "unknown".
- trend: derive from change_7d_pct (>5 up, <-5 down, else range). If 7d change absent -> "unknown".
- Never use predictive or advisory language ("buy", "sell", "target", "will", "alpha", "edge").
- Output JSON only, no prose, no fences.`

interface QuantInput {
  ticker: string
  price: any
  coingecko: any
}

export async function runQuantAgent(input: QuantInput): Promise<AgentRun<QuantBrief>> {
  return runAgent({
    name: 'quant',
    schema: QuantBriefSchema,
    exec: async (signal) => {
      const { client, smallModel } = getAgentClient()

      const slim = {
        ticker: input.ticker,
        price_usd: input.price?.current ?? null,
        change_24h_pct: input.price?.change_24h ?? null,
        change_7d_pct: input.coingecko?.market_data_enriched?.price_change_7d ?? null,
        change_30d_pct: input.coingecko?.market_data_enriched?.price_change_30d ?? null,
        volatility_7d: input.coingecko?.volatility_7d ?? null,
        volume_trend: input.coingecko?.volume_trend ?? null,
        trend_7d: input.coingecko?.trend_7d ?? null,
        trend_30d: input.coingecko?.trend_30d ?? null,
        volume_24h: input.price?.volume_24h ?? null,
        market_cap: input.price?.market_cap ?? null,
        ath_distance_pct: input.price?.ath_distance ?? null,
        // derivatives — currently unavailable in OrcaContext; pass null so QuantAgent reports null.
        funding_8h_pct: null,
        oi_change_24h_pct: null,
      }

      const userMsg = `Pre-fetched numeric data:
${JSON.stringify(slim, null, 2)}

Produce the QuantBrief JSON now.`

      const completion = await client.chat.completions.create(
        {
          model: smallModel,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: userMsg },
          ],
          temperature: 0.1,
          max_tokens: 800,
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
