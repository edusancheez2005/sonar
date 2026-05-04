/**
 * NewsAgent — summarises pre-fetched news headlines into a NewsBrief.
 * Model: grok-4-fast-non-reasoning (summarisation, no math).
 */
import { runAgent } from './registry'
import { getAgentClient } from './ai-client'
import { NewsBriefSchema, type NewsBrief, type AgentRun } from './types'

const SYSTEM = `You are NewsAgent, a single-purpose summarisation assistant.
You receive a list of pre-fetched news headlines for one cryptocurrency ticker.
You output ONLY a JSON object matching this exact schema:

{
  "headlines": [{"title": string, "url": string (valid URL), "source": string, "published_at": string (ISO), "sentiment": "bullish" | "neutral" | "bearish"}],
  "narrative": string (2-3 sentences, max 600 chars, factual not predictive),
  "themes": string[] (max 5),
  "balance_check": {"bullish": int, "neutral": int, "bearish": int}
}

Hard rules:
- Use ONLY headlines provided in the input. Do not invent any.
- Keep urls EXACTLY as provided. If a url is missing or empty, omit that headline entirely.
- The "headlines" array MUST contain AT MOST 8 entries. If more headlines are provided in the input, pick the 8 most recent / impactful and DROP the rest.
- Sentiment is your factual classification of the headline tone, not a prediction.
- Never use words like "recommend", "buy", "sell", "target", "alpha", "edge", "pump", "dump".
- Output JSON only, no prose, no markdown fences.`

interface NewsInput {
  ticker: string
  headlines: Array<{
    title?: string | null
    url?: string | null
    source?: string | null
    published_at?: string | null
    sentiment_llm?: number | null
  }>
}

export async function runNewsAgent(input: NewsInput): Promise<AgentRun<NewsBrief>> {
  return runAgent({
    name: 'news',
    schema: NewsBriefSchema,
    exec: async (signal) => {
      const { client, miniModel } = getAgentClient()

      // Cap input at 8 to mirror the schema cap and shrink the prompt — keeps
      // the LLM's job mechanical (just classify, don't pick 8 from a long list).
      const cleaned = (input.headlines || [])
        .filter((h) => h && h.title && h.url)
        .slice(0, 8)
        .map((h) => ({
          title: String(h.title).slice(0, 200),
          url: String(h.url),
          source: (h.source || 'unknown').slice(0, 60),
          published_at: h.published_at || new Date().toISOString(),
          sentiment_score: typeof h.sentiment_llm === 'number' ? h.sentiment_llm : null,
        }))

      if (cleaned.length === 0) {
        // Synthesise an empty-but-valid brief without burning a call.
        const empty: NewsBrief = {
          headlines: [],
          narrative: `No recent news headlines available for ${input.ticker} in the current dataset.`,
          themes: [],
          balance_check: { bullish: 0, neutral: 0, bearish: 0 },
        }
        return { raw: JSON.stringify(empty), tokens_in: 0, tokens_out: 0 }
      }

      const userMsg = `Ticker: ${input.ticker}

Pre-fetched headlines (sentiment_score is on a -1..+1 scale; map >0.15 -> bullish, <-0.15 -> bearish, else neutral):
${JSON.stringify(cleaned, null, 2)}

Produce the NewsBrief JSON now.`

      const completion = await client.chat.completions.create(
        {
          model: miniModel,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: userMsg },
          ],
          temperature: 0.2,
          max_tokens: 1200,
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
