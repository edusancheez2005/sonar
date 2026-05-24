/**
 * ORCA Personal Copilot — opening greetings
 * =============================================================================
 * Used by the Personal Dashboard copilot panel (§4.D Panel B) to seed the
 * first message. The tone is calibrated to the user's experience_level.
 *
 * Per the House Rules (§3.5.2) there are NO emojis. Per the compliance wall
 * (§3) these greetings are conversational only — no buy/sell/hold language,
 * no price targets, no recommendations.
 */

export type ExperienceLevel = 'new' | 'intermediate' | 'advanced'

export interface GreetingContext {
  experience: ExperienceLevel | null | undefined
  tickers: string[]
}

/**
 * Pick an opening message for the copilot panel.
 *
 * Behaviour:
 * - Unknown / null experience → falls back to the 'intermediate' tone.
 * - Empty watchlist → uses a neutral opener that nudges the user to add
 *   tickers without name-dropping any specific asset.
 * - Watchlist of 1+ tickers → references up to the first two tickers in
 *   the order they were supplied (deterministic; the UI controls order).
 */
export function pickCopilotGreeting(ctx: GreetingContext): string {
  const exp = normaliseExperience(ctx.experience)
  const tickers = (ctx.tickers ?? []).filter(isCleanTicker).slice(0, 2)

  if (tickers.length === 0) {
    switch (exp) {
      case 'new':
        return "I'm ORCA. Add a ticker on the left and I will explain what is moving it in plain English."
      case 'advanced':
        return 'No tickers tracked yet. Add one and I will surface whale flow, derivatives and news deltas.'
      case 'intermediate':
      default:
        return 'I am ORCA. Add a ticker to your watchlist and I will keep you posted on price, whale flow and news.'
    }
  }

  const lead = tickers[0]
  const second = tickers[1]

  switch (exp) {
    case 'new':
      return second
        ? `I am tracking ${lead} and ${second} for you. Want me to start with ${lead} in plain English?`
        : `I am tracking ${lead} for you. Want me to start with what is moving the price in plain English?`
    case 'advanced':
      return second
        ? `Watchlist active: ${lead}, ${second}. Ask me anything — price, whale flow, derivatives, news.`
        : `Watchlist active: ${lead}. Ask me for the whale flow, derivatives, or news cut.`
    case 'intermediate':
    default:
      return second
        ? `I am tracking ${lead} and ${second}. Want a recap of the last 24 hours?`
        : `I am tracking ${lead}. Want a recap of the last 24 hours?`
  }
}

function normaliseExperience(raw: GreetingContext['experience']): ExperienceLevel {
  if (raw === 'new' || raw === 'intermediate' || raw === 'advanced') return raw
  return 'intermediate'
}

function isCleanTicker(t: unknown): t is string {
  return typeof t === 'string' && /^[A-Z0-9._-]{1,12}$/.test(t)
}
