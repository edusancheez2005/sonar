/**
 * Synthesiser — the ONLY agent that uses grok-4-fast-reasoning and streams.
 * Reuses ORCA_SYSTEM_PROMPT verbatim from lib/orca/system-prompt.ts.
 *
 * Returns a callback-driven streamer. The orchestrator calls onDelta(text)
 * for each token chunk and gets back the final {full_text, tokens_in, tokens_out}.
 */
import { getAgentClient } from './ai-client'
import { ORCA_SYSTEM_PROMPT } from '../system-prompt'
import type { NewsBrief, QuantBrief, WhaleBrief } from './types'

interface SynthInput {
  ticker: string
  message: string
  news: NewsBrief | null
  quant: QuantBrief | null
  whale: WhaleBrief | null
}

interface SynthResult {
  full_text: string
  tokens_in: number
  tokens_out: number
  ok: boolean
  error?: string
}

function buildContextBlock(input: SynthInput): string {
  const parts: string[] = []
  parts.push(`# CONTEXT BLOCK (for ticker ${input.ticker})\n`)
  parts.push(`User question: ${input.message}\n`)

  parts.push('## NewsBrief')
  if (input.news) {
    parts.push('```json')
    parts.push(JSON.stringify(input.news, null, 2))
    parts.push('```')
  } else {
    parts.push('_NewsAgent failed or produced no brief — no news data available._')
  }

  parts.push('\n## QuantBrief')
  if (input.quant) {
    parts.push('```json')
    parts.push(JSON.stringify(input.quant, null, 2))
    parts.push('```')
  } else {
    parts.push('_QuantAgent failed or produced no brief — no price/quant data available._')
  }

  parts.push('\n## WhaleBrief')
  if (input.whale) {
    parts.push('```json')
    parts.push(JSON.stringify(input.whale, null, 2))
    parts.push('```')
  } else {
    parts.push('_WhaleAgent failed or produced no brief — on-chain whale data not available._')
  }

  parts.push(
    '\n## SYNTHESISER INSTRUCTIONS\n' +
      '- Every claim in your response MUST trace back to a value above. Do not invent figures, headlines, urls, or whale movements.\n' +
      '- If a brief is missing or empty, explicitly note that the corresponding data is unavailable. Never fabricate to fill the gap.\n' +
      '- Follow the response format and the mandatory disclaimer in the system prompt exactly.\n' +
      '- Quote headline urls verbatim from NewsBrief.headlines[*].url.'
  )

  return parts.join('\n')
}

export async function runSynthesiser(
  input: SynthInput,
  onDelta: (delta: string) => void
): Promise<SynthResult> {
  const started = Date.now()
  const { client, reasoningModel } = getAgentClient()
  const userBlock = buildContextBlock(input)
  let full = ''
  let tokens_in = 0
  let tokens_out = 0

  try {
    const stream = await client.chat.completions.create({
      model: reasoningModel,
      messages: [
        { role: 'system', content: ORCA_SYSTEM_PROMPT },
        { role: 'user', content: userBlock },
      ],
      temperature: 0.6,
      max_tokens: 6000,
      stream: true,
      stream_options: { include_usage: true },
    })

    for await (const chunk of stream as any) {
      const delta: string | undefined = chunk?.choices?.[0]?.delta?.content
      if (delta) {
        full += delta
        onDelta(delta)
      }
      if (chunk?.usage) {
        tokens_in = chunk.usage.prompt_tokens || tokens_in
        tokens_out = chunk.usage.completion_tokens || tokens_out
      }
    }

    console.log(
      `[orca-v2] agent=synth ok=true latency_ms=${Date.now() - started} tokens_in=${tokens_in} tokens_out=${tokens_out} chars=${full.length}`
    )
    return { full_text: full, tokens_in, tokens_out, ok: true }
  } catch (e: any) {
    const error = e?.message || 'unknown error'
    console.error(`[orca-v2] agent=synth ok=false error=${error}`)
    return { full_text: full, tokens_in, tokens_out, ok: false, error }
  }
}
