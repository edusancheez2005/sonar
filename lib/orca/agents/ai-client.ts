/**
 * Tiny shared helper — same logic as getAIClient() in app/api/chat/route.ts.
 * Duplicated here to keep the v2 slice purely additive (Hard Constraint:
 * "no UI changes / no edits to /api/chat").
 */
import OpenAI from 'openai'

export interface AIClient {
  client: OpenAI
  /** Used only by the synthesiser. */
  reasoningModel: string
  /** Cheap summarisation model. */
  miniModel: string
  /** Numeric / classification model. */
  smallModel: string
  provider: 'grok' | 'openai'
}

export function getAgentClient(): AIClient {
  const xaiKey = process.env.XAI_API_KEY
  if (xaiKey) {
    return {
      client: new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' }),
      reasoningModel: 'grok-4-fast-reasoning',
      miniModel: 'grok-4-fast-non-reasoning',
      smallModel: 'grok-3-mini',
      provider: 'grok',
    }
  }
  return {
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    reasoningModel: 'gpt-4.1',
    miniModel: 'gpt-4.1-mini',
    smallModel: 'gpt-4.1-mini',
    provider: 'openai',
  }
}
