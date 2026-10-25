/**
 * Smart-money activity per token over the last 24 h: BUY/SELL rows on the
 * whale tape from wallets Sonar scores as consistently early
 * (wallet_profiles.smart_money_score ≥ 0.4, the 200 highest). Used by the
 * /trending smart-money column and /api/wallet-tracker/trending-whales.
 * Wrapped symbols count as their coin (WBTC → BTC); BTC and ETH rows that
 * come from whale_alerts carry no wallet address, so majors are often empty.
 */
import { canonicalSymbol, symbolVariants } from '@/lib/wallet/symbol-aliases'

export const SMART_MONEY_MIN_SCORE = 0.4
const SMART_WALLETS = 200

export interface SmartMoneyStat {
  token: string
  buy_count: number
  sell_count: number
  buy_volume: number
  sell_volume: number
  net_flow: number
  top_buyers: { address: string; entity_name: string | null; volume: number }[]
}

type Client = { from: (table: string) => any }

function empty(token: string): SmartMoneyStat {
  return { token, buy_count: 0, sell_count: 0, buy_volume: 0, sell_volume: 0, net_flow: 0, top_buyers: [] }
}

export async function getSmartMoneyActivity(sb: Client, tokens: string[], now = Date.now()): Promise<SmartMoneyStat[]> {
  const wanted = [...new Set(tokens.map((t) => canonicalSymbol(t)).filter(Boolean) as string[])].slice(0, 50)
  if (wanted.length === 0) return []
  const { data: smartWallets, error: walletErr } = await sb
    .from('wallet_profiles')
    .select('address, entity_name, smart_money_score')
    .gte('smart_money_score', SMART_MONEY_MIN_SCORE)
    .order('smart_money_score', { ascending: false })
    .limit(SMART_WALLETS)
  if (walletErr) throw walletErr
  if (!smartWallets?.length) return wanted.map(empty)

  const walletMap = new Map<string, { entity_name: string | null }>(smartWallets.map((w: any) => [w.address, w]))
  const symbols = [...new Set(wanted.flatMap((t) => symbolVariants(t).length ? symbolVariants(t) : [t]))]
  const { data: txs, error: txErr } = await sb
    .from('all_whale_transactions')
    .select('whale_address, token_symbol, classification, usd_value, timestamp')
    .in('whale_address', [...walletMap.keys()])
    .in('classification', ['BUY', 'SELL'])
    .in('token_symbol', symbols)
    .gte('timestamp', new Date(now - 24 * 3_600_000).toISOString())
    .order('timestamp', { ascending: false })
    .limit(2000)
  if (txErr) throw txErr

  const stats = new Map(wanted.map((t) => [t, { ...empty(t), buyers: new Map<string, number>() }]))
  for (const tx of (txs || []) as any[]) {
    const stat = stats.get(canonicalSymbol(tx.token_symbol) || '')
    if (!stat) continue
    const vol = Number(tx.usd_value) || 0
    if (tx.classification === 'BUY') {
      stat.buy_count++
      stat.buy_volume += vol
      stat.net_flow += vol
      stat.buyers.set(tx.whale_address, (stat.buyers.get(tx.whale_address) || 0) + vol)
    } else {
      stat.sell_count++
      stat.sell_volume += vol
      stat.net_flow -= vol
    }
  }
  return wanted.map((t) => {
    const { buyers, ...s } = stats.get(t)!
    s.top_buyers = [...buyers.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([address, volume]) => ({ address, entity_name: walletMap.get(address)?.entity_name || null, volume }))
    return s
  })
}
