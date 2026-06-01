// Decide whether an inline `code` span is a price, whale flow, sentiment
// value, or none. Pure — called for every <code> child of OrcaMarkdown.
//
// Inputs:
//   text:      the raw text inside the code span (e.g. "$76,432", "62", "+$1.01B")
//   paragraph: the full plain-text paragraph the span lives in
//   section:   the most recent section header text seen (or '')
//
// Output: { kind: 'price'|'whale'|'sentiment'|'none', value?: number, unit?: '$'|'%'|null }

const WHALE_TRIGGERS = /\b(whale|net\s*flow|inflow|outflow|accumulation|distribution)\b/i
const SENTIMENT_TRIGGERS = /\b(sentiment|galaxy\s*score|alt\s*rank|%\s*bullish|bullish\b|bearish\b)\b/i

function parseValue(raw) {
  // Strip $, %, +, -, commas, suffix letters (K/M/B/T)
  const s = String(raw).trim().replace(/[,\s]/g, '')
  const m = /^([+\-]?)\$?([0-9]*\.?[0-9]+)([kmbt%]?)/i.exec(s)
  if (!m) return null
  const sign = m[1] === '-' ? -1 : 1
  let n = parseFloat(m[2])
  const suf = m[3]?.toLowerCase()
  if (suf === 'k') n *= 1e3
  else if (suf === 'm') n *= 1e6
  else if (suf === 'b') n *= 1e9
  else if (suf === 't') n *= 1e12
  return sign * n
}

export function classifyCodeSpan(text, paragraph = '', section = '') {
  if (!text || typeof text !== 'string') return { kind: 'none' }
  const raw = text.trim()
  if (!raw) return { kind: 'none' }

  const hasDollar = /\$/.test(raw)
  const hasPct = /%/.test(raw)
  const isPureNumber = /^[+\-]?\$?[\d.,]+[kmbtKMBT]?%?$/.test(raw)
  if (!isPureNumber) return { kind: 'none' }

  const value = parseValue(raw)
  if (value === null || Number.isNaN(value)) return { kind: 'none' }

  // Whale: signed dollar amount AND paragraph mentions whale/flow/etc.
  if (hasDollar && WHALE_TRIGGERS.test(paragraph)) {
    return { kind: 'whale', value, unit: '$' }
  }

  // Price: dollar amount, no % suffix.
  if (hasDollar && !hasPct) {
    return { kind: 'price', value, unit: '$' }
  }

  // Sentiment: bare integer 0-100 next to sentiment/score wording.
  if (!hasDollar && !hasPct && Number.isFinite(value) && value >= 0 && value <= 100 &&
      Number.isInteger(value) && SENTIMENT_TRIGGERS.test(paragraph)) {
    return { kind: 'sentiment', value, unit: null }
  }

  return { kind: 'none' }
}
