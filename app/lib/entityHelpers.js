// Shared helpers for entity directory and entity detail pages.

export const CHAIN_DISPLAY_NAMES = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  solana: 'Solana',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  base: 'Base',
  xrp: 'XRP',
}

export const EXPLORER_URLS = {
  bitcoin: { name: 'Mempool.space', tx: (h) => `https://mempool.space/tx/${h}`, addr: (a) => `https://mempool.space/address/${a}` },
  ethereum: { name: 'Etherscan', tx: (h) => `https://etherscan.io/tx/${h}`, addr: (a) => `https://etherscan.io/address/${a}` },
  polygon: { name: 'Polygonscan', tx: (h) => `https://polygonscan.com/tx/${h}`, addr: (a) => `https://polygonscan.com/address/${a}` },
  arbitrum: { name: 'Arbiscan', tx: (h) => `https://arbiscan.io/tx/${h}`, addr: (a) => `https://arbiscan.io/address/${a}` },
  base: { name: 'Basescan', tx: (h) => `https://basescan.org/tx/${h}`, addr: (a) => `https://basescan.org/address/${a}` },
  solana: { name: 'Solscan', tx: (h) => `https://solscan.io/tx/${h}`, addr: (a) => `https://solscan.io/account/${a}` },
  xrp: { name: 'XRPL Explorer', tx: (h) => `https://livenet.xrpl.org/transactions/${h}`, addr: (a) => `https://livenet.xrpl.org/accounts/${a}` },
}

export const CLASSIFICATION_COLORS = {
  BUY: { color: '#2ecc71', bg: 'rgba(46, 204, 113, 0.15)', border: 'rgba(46, 204, 113, 0.4)' },
  SELL: { color: '#e74c3c', bg: 'rgba(231, 76, 60, 0.15)', border: 'rgba(231, 76, 60, 0.4)' },
  TRANSFER: { color: '#9aa7b8', bg: 'rgba(154, 167, 184, 0.12)', border: 'rgba(154, 167, 184, 0.35)' },
}

const NON_NARRATIVE_PREFIXES = [
  'Stage ',
  'Classification:',
  'Score:',
  'N/A',
  'Priority phase:',
  'Phase:',
  'Strategy:',
  'Scoring:',
  'Confidence:',
]

export function isNarrativeReasoning(text) {
  if (text === null || text === undefined) return false
  const t = String(text)
  if (t === '') return false
  if (t.trim().length <= 20) return false
  return !NON_NARRATIVE_PREFIXES.some((p) => t.startsWith(p))
}

export function chainDisplay(chain) {
  if (!chain) return 'Unknown'
  const key = String(chain).toLowerCase()
  return CHAIN_DISPLAY_NAMES[key] || (key.charAt(0).toUpperCase() + key.slice(1))
}

export function truncateAddress(addr) {
  if (!addr) return '—'
  const s = String(addr)
  if (s.length <= 12) return s
  return `${s.slice(0, 6)}…${s.slice(-4)}`
}

export function formatVolume(n) {
  const num = Number(n || 0)
  if (!Number.isFinite(num) || num === 0) return '$0'
  const abs = Math.abs(num)
  const sign = num < 0 ? '-' : ''
  const tiers = [
    { v: 1e12, s: 'T' },
    { v: 1e9, s: 'B' },
    { v: 1e6, s: 'M' },
    { v: 1e3, s: 'K' },
  ]
  for (const t of tiers) {
    if (abs >= t.v) {
      const scaled = abs / t.v
      const str = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, '')
      return `${sign}$${str}${t.s}`
    }
  }
  return `${sign}$${abs.toFixed(0)}`
}

export function relativeTime(date) {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const sec = Math.round(diff / 1000)
  if (sec < 60) return `${Math.max(sec, 0)}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo}mo ago`
  const yr = Math.round(day / 365)
  return `${yr}y ago`
}

export function absoluteTime(date) {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const mo = months[d.getUTCMonth()]
  const day = d.getUTCDate()
  const yr = d.getUTCFullYear()
  return `${mo} ${day}, ${yr}`
}

const EXCHANGE_KEYWORDS = ['Binance', 'Coinbase', 'OKX', 'Kraken', 'Bybit', 'Gate']
const MARKET_MAKER_KEYWORDS = ['Wintermute', 'Jump', 'GSR', 'Cumberland']
const PROTOCOL_KEYWORDS = ['CoW', 'Uniswap', 'Kyber', 'Meteora', 'Curve', 'Aave']

export function inferEntityType(name) {
  if (!name) return 'Entity'
  const s = String(name)
  if (EXCHANGE_KEYWORDS.some((k) => s.includes(k))) return 'Exchange'
  if (MARKET_MAKER_KEYWORDS.some((k) => s.includes(k))) return 'Market Maker'
  if (PROTOCOL_KEYWORDS.some((k) => s.includes(k))) return 'Protocol'
  return 'Entity'
}

const ENTITY_TYPE_COLORS = {
  Exchange: { color: '#f1c40f', bg: 'rgba(241, 196, 15, 0.12)', border: 'rgba(241, 196, 15, 0.35)' },
  'Market Maker': { color: '#9b59b6', bg: 'rgba(155, 89, 182, 0.14)', border: 'rgba(155, 89, 182, 0.4)' },
  Protocol: { color: '#36a6ba', bg: 'rgba(54, 166, 186, 0.15)', border: 'rgba(54, 166, 186, 0.4)' },
  Entity: { color: '#9aa7b8', bg: 'rgba(154, 167, 184, 0.12)', border: 'rgba(154, 167, 184, 0.35)' },
}

export function entityTypeStyle(type) {
  return ENTITY_TYPE_COLORS[type] || ENTITY_TYPE_COLORS.Entity
}

// Directory-level junk label filter. These strings are classification
// artifacts written into from_label/to_label at ingest time rather than
// real entity names, so we drop them from the directory.
export function isJunkEntityLabel(name) {
  if (!name) return true
  const s = String(name).trim()
  if (s === '') return true
  if (/^Top .*holder$/i.test(s)) return true
  if (s.startsWith('Whale (')) return true
  if (s.startsWith('Verified Whale')) return true
  return false
}

export function explorerAddressUrl(chain, address) {
  if (!chain || !address) return null
  const key = String(chain).toLowerCase()
  const ex = EXPLORER_URLS[key]
  if (!ex) return null
  return ex.addr(address)
}

// ─── Curated figure helpers ──────────────────────────────────────────────

const CATEGORY_COLORS = {
  person:     { color: '#36a6ba', bg: 'rgba(54, 166, 186, 0.15)', border: 'rgba(54, 166, 186, 0.4)' },
  company:    { color: '#f1c40f', bg: 'rgba(241, 196, 15, 0.12)', border: 'rgba(241, 196, 15, 0.35)' },
  government: { color: '#e74c3c', bg: 'rgba(231, 76, 60, 0.14)', border: 'rgba(231, 76, 60, 0.35)' },
  protocol:   { color: '#2ecc71', bg: 'rgba(46, 204, 113, 0.14)', border: 'rgba(46, 204, 113, 0.35)' },
  celebrity:  { color: '#9b59b6', bg: 'rgba(155, 89, 182, 0.14)', border: 'rgba(155, 89, 182, 0.4)' },
}

export function categoryStyle(category) {
  const key = String(category || '').toLowerCase()
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.person
}

export function categoryLabel(category) {
  const key = String(category || '').toLowerCase()
  if (!key) return 'Entity'
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export function entityInitials(displayName) {
  if (!displayName) return '?'
  const parts = String(displayName)
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
