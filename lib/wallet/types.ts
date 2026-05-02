export type Chain =
  | 'ethereum'
  | 'solana'
  | 'polygon'
  | 'arbitrum'
  | 'base'
  | 'optimism'
  | 'bitcoin'

export interface Holding {
  symbol: string
  name: string
  contract: string | null
  balance: string         // decimal string
  decimals: number
  price_usd: number | null
  value_usd: number       // 0 if price unknown
  logo: string | null
}

export const STABLECOINS = new Set([
  'USDT','USDC','DAI','BUSD','TUSD','USDP','GUSD','USDD','FRAX','LUSD','USDK','USDN','FEI','TRIBE','CUSD','PYUSD','SUSD','USDE',
])
