import 'server-only'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import type { BacktestChain, CexRoutingInfo } from '../wallet-backtest/types'

// Detects "market-maker / exchange-routing" wallets — addresses whose tracked
// on-chain activity is dominated by deposits to / withdrawals from a CEX hot
// wallet rather than directional DEX trades. For these wallets the BUY/SELL
// labels are really CEX flow direction (deposit ⇒ "sell", withdrawal ⇒ "buy"),
// so a copy-trade backtest is not meaningful and should carry a clear caveat.

const CEX_PATTERNS: Array<{ re: RegExp; name: string }> = [
  { re: /binance/i, name: 'Binance' },
  { re: /coinbase/i, name: 'Coinbase' },
  { re: /\bokx\b|okex/i, name: 'OKX' },
  { re: /kraken/i, name: 'Kraken' },
  { re: /bybit/i, name: 'Bybit' },
  { re: /kucoin/i, name: 'KuCoin' },
  { re: /bitfinex/i, name: 'Bitfinex' },
  { re: /bitget/i, name: 'Bitget' },
  { re: /\bmexc\b/i, name: 'MEXC' },
  { re: /huobi|\bhtx\b/i, name: 'HTX' },
  { re: /gate\.?io/i, name: 'Gate' },
  { re: /crypto\.com/i, name: 'Crypto.com' },
  { re: /gemini/i, name: 'Gemini' },
  { re: /robinhood/i, name: 'Robinhood' },
]

// Resolve a CEX brand from a label, else a generic exchange marker, else null.
function cexNameFromLabel(label: string | null | undefined): string | null {
  if (!label) return null
  for (const p of CEX_PATTERNS) if (p.re.test(label)) return p.name
  if (/hot wallet|\bcex\b|exchange deposit|exchange withdrawal/i.test(label)) return 'an exchange'
  return null
}

const EMPTY: CexRoutingInfo = {
  is_cex_router: false,
  venue: null,
  top_counterparty_pct: 0,
  sell_to_cex_pct: 0,
  deposits_usd: 0,
  withdrawals_usd: 0,
}

export async function detectCexRouting(address: string, _chain: BacktestChain): Promise<CexRoutingInfo> {
  try {
    const { data, error } = await supabaseAdmin
      .from('all_whale_transactions')
      .select('classification, usd_value, counterparty_address, from_label, to_label')
      .eq('whale_address', address)
      .order('timestamp', { ascending: false })
      .limit(3000)

    if (error || !data || data.length === 0) return EMPTY

    let totalVol = 0
    let totalSell = 0
    let depositsUsd = 0 // SELL routed into a CEX
    let withdrawalsUsd = 0 // BUY sourced from a CEX
    const cpVol = new Map<string, { vol: number; cexName: string | null }>()
    const cexVolByName = new Map<string, number>()

    for (const r of data as any[]) {
      const v = Number(r.usd_value) || 0
      if (v <= 0) continue
      const cls = String(r.classification || '').toUpperCase()
      totalVol += v
      if (cls === 'SELL') totalSell += v

      // On a SELL the wallet sends TO the counterparty; on a BUY it receives FROM it.
      const cpLabel = cls === 'SELL' ? r.to_label : cls === 'BUY' ? r.from_label : r.to_label || r.from_label
      const cexName = cexNameFromLabel(cpLabel) || cexNameFromLabel(r.from_label) || cexNameFromLabel(r.to_label)
      if (cexName) {
        cexVolByName.set(cexName, (cexVolByName.get(cexName) || 0) + v)
        if (cls === 'SELL') depositsUsd += v
        else if (cls === 'BUY') withdrawalsUsd += v
      }

      const cpKey = r.counterparty_address || cpLabel || 'unknown'
      const cur = cpVol.get(cpKey) || { vol: 0, cexName: null }
      cur.vol += v
      if (!cur.cexName && cexName) cur.cexName = cexName
      cpVol.set(cpKey, cur)
    }

    if (totalVol <= 0) return EMPTY

    // Single most-used counterparty by volume.
    let topVol = 0
    let topCexName: string | null = null
    for (const info of cpVol.values()) {
      if (info.vol > topVol) {
        topVol = info.vol
        topCexName = info.cexName
      }
    }
    // Dominant CEX brand across all exchange-labelled flow.
    let venueName: string | null = null
    let venueVol = 0
    for (const [n, vv] of cexVolByName) {
      if (n !== 'an exchange' && vv > venueVol) {
        venueVol = vv
        venueName = n
      }
    }

    const topPct = topVol / totalVol
    const sellToCexPct = totalSell > 0 ? depositsUsd / totalSell : 0

    // Flag when the dominant counterparty is a CEX and concentrates flow, OR
    // most sell volume is deposited into exchanges.
    const is_cex_router = (topCexName != null && topPct >= 0.6) || sellToCexPct >= 0.7

    return {
      is_cex_router,
      venue: is_cex_router ? venueName || topCexName || 'an exchange' : null,
      top_counterparty_pct: Math.round(topPct * 1000) / 10,
      sell_to_cex_pct: Math.round(sellToCexPct * 1000) / 10,
      deposits_usd: Math.round(depositsUsd),
      withdrawals_usd: Math.round(withdrawalsUsd),
    }
  } catch {
    return EMPTY
  }
}
