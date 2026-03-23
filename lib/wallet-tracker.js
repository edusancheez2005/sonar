export const TAG_COLORS = {
  whale: { bg: 'rgba(54, 166, 186, 0.15)', color: '#36a6ba' },
  smart_money: { bg: 'rgba(0, 212, 170, 0.15)', color: '#00d4aa' },
  degen: { bg: 'rgba(255, 107, 107, 0.15)', color: '#ff6b6b' },
  accumulator: { bg: 'rgba(0, 200, 255, 0.15)', color: '#00c8ff' },
  distributor: { bg: 'rgba(255, 217, 61, 0.15)', color: '#ffd93d' },
  market_maker: { bg: 'rgba(139, 148, 158, 0.15)', color: '#8b949e' },
  institutional: { bg: 'rgba(200, 200, 220, 0.15)', color: '#c8c8dc' },
}

export const EXPLORERS = {
  ethereum: 'https://etherscan.io',
  bitcoin: 'https://mempool.space',
  solana: 'https://solscan.io',
  polygon: 'https://polygonscan.com',
  xrp: 'https://xrpscan.com',
}

export const SORT_OPTIONS = [
  { value: 'smart_money_score', label: 'Smart Money Score' },
  { value: 'total_volume_usd_30d', label: '30d Volume' },
  { value: 'portfolio_value_usd', label: 'Portfolio Value' },
  { value: 'pnl_estimated_usd', label: 'Estimated PnL' },
]

export const CHAINS = ['ethereum', 'bitcoin', 'solana', 'polygon', 'xrp']

export function getTxExplorerUrl(chain, txHash) {
  const base = EXPLORERS[chain]
  if (!base || !txHash) return null
  if (chain === 'bitcoin') return `${base}/tx/${txHash}`
  if (chain === 'solana') return `${base}/tx/${txHash}`
  if (chain === 'xrp') return `${base}/tx/${txHash}`
  return `${base}/tx/${txHash}`
}

export function shortenAddress(address, chars = 6) {
  if (!address) return ''
  if (address.length <= chars * 2 + 2) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatUsd(value) {
  if (value == null) return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  if (Math.abs(num) >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (Math.abs(num) >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  if (Math.abs(num) >= 1e3) return `$${(num / 1e3).toFixed(1)}K`
  return `$${num.toFixed(2)}`
}

export function timeAgo(timestamp) {
  if (!timestamp) return '—'
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
