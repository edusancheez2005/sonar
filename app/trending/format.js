// Number formats shared by the /trending panels.
export function fmtUsd(n, signed = false) {
  const v = Number(n) || 0
  const a = Math.abs(v)
  const s = signed ? (v > 0 ? '+' : v < 0 ? '−' : '') : ''
  const short = (x, d) => String(Number(x.toFixed(d)))
  if (a >= 1e9) return `${s}$${short(a / 1e9, 2)}B`
  if (a >= 1e6) return `${s}$${short(a / 1e6, a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2)}M`
  if (a >= 1e3) return `${s}$${short(a / 1e3, a >= 1e5 ? 0 : 1)}K`
  return `${s}$${Math.round(a)}`
}

export function fmtPrice(p) {
  const v = Number(p)
  if (!Number.isFinite(v) || v <= 0) return '—'
  if (v >= 1000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (v >= 1) return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `$${Number(v.toPrecision(3))}`
}

export function fmtPct(p) {
  const v = Number(p)
  if (!Number.isFinite(v)) return '—'
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
}
