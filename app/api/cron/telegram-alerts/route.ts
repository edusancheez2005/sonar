import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CRON_SECRET = process.env.CRON_SECRET

const MIN_USD_VALUE = 500000
const LOOKBACK_MINUTES = 5

// Top 3 free-tier tokens
const FREE_TOKENS = ['BTC', 'ETH', 'SOL']

const EXPLORER_URLS: Record<string, string> = {
  ethereum: 'https://etherscan.io/tx/',
  bitcoin: 'https://mempool.space/tx/',
  solana: 'https://solscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  arbitrum: 'https://arbiscan.io/tx/',
  base: 'https://basescan.org/tx/',
}

function formatUsd(val: number): string {
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`
  return `$${val.toFixed(0)}`
}

function formatMessage(tx: {
  classification: string
  token_symbol: string
  usd_value: number
  whale_score?: number
  blockchain: string
  transaction_hash?: string
  timestamp: string
}): string {
  const emoji = tx.classification === 'BUY' ? '🟢' : '🔴'
  const side = tx.classification
  const token = tx.token_symbol
  const amount = formatUsd(tx.usd_value)
  const confidence = tx.whale_score ? (tx.whale_score / 100).toFixed(2) : 'N/A'
  const chain = tx.blockchain?.charAt(0).toUpperCase() + tx.blockchain?.slice(1)
  const explorer = EXPLORER_URLS[tx.blockchain] || ''
  const txLink = tx.transaction_hash && explorer
    ? `${explorer}${tx.transaction_hash}`
    : ''
  const ago = Math.round((Date.now() - new Date(tx.timestamp).getTime()) / 60000)

  let msg = `${emoji} WHALE ${side} · ${token}\n`
  msg += `💰 ${amount} · Confidence: ${confidence}\n`
  msg += `⛓ ${chain}\n`
  if (txLink) msg += `🔗 ${txLink}\n`
  msg += `⏱ ${ago} min ago`

  return msg
}

async function sendTelegramMessage(chatId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })
}

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 503 })
  }

  try {
    const since = new Date(Date.now() - LOOKBACK_MINUTES * 60 * 1000).toISOString()

    // Fetch qualifying whale transactions
    const { data: txs, error: txError } = await supabaseAdmin
      .from('all_whale_transactions')
      .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,whale_score')
      .in('classification', ['BUY', 'SELL'])
      .gte('usd_value', MIN_USD_VALUE)
      .gte('timestamp', since)
      .order('usd_value', { ascending: false })
      .limit(20)

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 })
    }

    if (!txs || txs.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No qualifying transactions' })
    }

    // Fetch subscribers
    const { data: subscribers, error: subError } = await supabaseAdmin
      .from('telegram_subscribers')
      .select('chat_id, tier')

    if (subError || !subscribers || subscribers.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No subscribers' })
    }

    let sentCount = 0

    for (const sub of subscribers) {
      const isPaid = sub.tier === 'premium' || sub.tier === 'pro'

      for (const tx of txs) {
        // Free tier: only top 3 tokens
        if (!isPaid && !FREE_TOKENS.includes(tx.token_symbol)) continue

        const message = formatMessage(tx)
        await sendTelegramMessage(sub.chat_id, message)
        sentCount++
      }
    }

    return NextResponse.json({ sent: sentCount, transactions: txs.length })
  } catch (err) {
    console.error('Telegram alerts error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
