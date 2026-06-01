// Parse <!-- orca:chart ticker=BTC tf=7d kind=price --> comments.
// Returns first valid directive or null. Tolerates whitespace + quoting.

const TF_OK = new Set(['24h', '7d', '30d'])
const KIND_OK = new Set(['price', 'whale', 'sentiment'])
const DIRECTIVE_RE = /<!--\s*orca:chart\s+([^>]*?)-->/i

function parseAttrs(s) {
  const out = {}
  const re = /(\w+)\s*=\s*"?([\w]+)"?/g
  let m
  while ((m = re.exec(s)) !== null) {
    out[m[1].toLowerCase()] = m[2]
  }
  return out
}

export function extractChartDirective(text) {
  if (!text || typeof text !== 'string') return null
  const m = DIRECTIVE_RE.exec(text)
  if (!m) return null
  const attrs = parseAttrs(m[1])
  const ticker = attrs.ticker ? attrs.ticker.toUpperCase() : null
  const tf = attrs.tf
  const kind = attrs.kind
  if (!ticker || !TF_OK.has(tf) || !KIND_OK.has(kind)) return null
  return { ticker, tf, kind }
}

export function stripChartDirectives(text) {
  if (!text || typeof text !== 'string') return text
  return text.replace(/<!--\s*orca:chart\s+[^>]*?-->/gi, '')
}
