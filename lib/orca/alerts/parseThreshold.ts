/**
 * ORCA Alerts — threshold parser
 * =============================================================================
 * Pure, regex-led parsing of user threshold phrases for the chat fast-write
 * path (§7.1). No LLM. Returns at most one of { threshold_pct } /
 * { threshold_usd }, or null when nothing parses.
 *
 *   "5%", "5 percent", "5pct"   -> { threshold_pct: 5 }
 *   "$1M", "1 million", "1.5m"  -> { threshold_usd: 1500000 }
 *   "750k"                      -> { threshold_usd: 750000 }
 */

export interface ParsedThreshold {
  threshold_pct?: number
  threshold_usd?: number
}

const SUFFIX_MULTIPLIER: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
}

/**
 * Parse a percent threshold from free text. Matches `5%`, `5 percent`,
 * `5pct`, `5.5%`. Returns the positive magnitude or null.
 */
function parsePercent(text: string): number | null {
  const m = text.match(/(-?\d+(?:\.\d+)?)\s*(?:%|percent|pct)\b/i)
  if (!m) return null
  const n = Math.abs(parseFloat(m[1]))
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/**
 * Parse a USD threshold from free text. Matches `$1M`, `1 million`, `1.5m`,
 * `750k`, `$2,000,000`, `2 billion`. Returns an integer USD or null.
 */
function parseUsd(text: string): number | null {
  // Word-suffix form: "1 million", "1.5 billion", "750 thousand".
  const word = text.match(/\$?\s*(\d+(?:\.\d+)?)\s*(thousand|million|billion)\b/i)
  if (word) {
    const base = parseFloat(word[1])
    const mult =
      word[2].toLowerCase() === 'thousand'
        ? 1_000
        : word[2].toLowerCase() === 'million'
          ? 1_000_000
          : 1_000_000_000
    const v = Math.round(base * mult)
    return Number.isFinite(v) && v > 0 ? v : null
  }

  // Letter-suffix form: "1m", "1.5M", "750k", "$2B".
  const letter = text.match(/\$?\s*(\d+(?:\.\d+)?)\s*([kmb])\b/i)
  if (letter) {
    const base = parseFloat(letter[1])
    const mult = SUFFIX_MULTIPLIER[letter[2].toLowerCase()]
    const v = Math.round(base * mult)
    return Number.isFinite(v) && v > 0 ? v : null
  }

  // Plain dollar amount: "$2,000,000" / "$50000".
  const dollar = text.match(/\$\s*([\d,]+(?:\.\d+)?)/)
  if (dollar) {
    const v = Math.round(parseFloat(dollar[1].replace(/,/g, '')))
    return Number.isFinite(v) && v > 0 ? v : null
  }

  return null
}

/**
 * Parse a threshold of either shape from `text`. Percent takes precedence
 * when both a `%` token and a USD token are present (price moves are the
 * common case). Returns null when neither shape matches.
 */
export function parseThreshold(text: string): ParsedThreshold | null {
  if (typeof text !== 'string' || !text.trim()) return null
  const pct = parsePercent(text)
  if (pct !== null) return { threshold_pct: pct }
  const usd = parseUsd(text)
  if (usd !== null) return { threshold_usd: usd }
  return null
}
