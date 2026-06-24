import { NextResponse } from 'next/server'
import OpenAI from 'openai'

/**
 * GET /api/news/live
 *
 * Real-time crypto news aggregated from publisher RSS feeds (Cointelegraph,
 * CoinDesk, Decrypt, CryptoSlate, Bitcoinist). This is the source of genuinely
 * fresh (<24h) titled stories for the breaking hero + feed — the Supabase
 * `news_items` ingestion lags and its recent rows are untitled LunarCrush
 * records, so it can't supply breaking news on its own.
 *
 * Returns articles in the same shape the client already uses, with extracted
 * token tags so the hero chart + token filters work. Server-cached ~5 min.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const FEEDS = [
  { source: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
  { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml' },
  { source: 'Decrypt', url: 'https://decrypt.co/feed' },
  { source: 'CryptoSlate', url: 'https://cryptoslate.com/feed/' },
  { source: 'Bitcoinist', url: 'https://bitcoinist.com/feed/' },
]

const TOKEN_ALLOW = ['BTC', 'ETH', 'XRP', 'USDT', 'USDC', 'BNB', 'SOL', 'ADA', 'DOGE', 'TRX', 'TON', 'MATIC', 'LINK', 'AVAX', 'DOT', 'LTC', 'ETC', 'SHIB', 'APT', 'ARB', 'OP', 'IMX', 'INJ', 'FET', 'PEPE', 'SUI', 'NEAR', 'ATOM', 'AAVE', 'UNI', 'CRV', 'SUSHI']
const TOKEN_NAMES = {
  BTC: ['bitcoin'], ETH: ['ethereum', 'ether'], XRP: ['xrp', 'ripple'], BNB: ['bnb', 'binance coin'],
  SOL: ['solana'], ADA: ['cardano'], DOGE: ['dogecoin'], TRX: ['tron'], TON: ['toncoin'],
  MATIC: ['polygon'], LINK: ['chainlink'], AVAX: ['avalanche'], DOT: ['polkadot'], LTC: ['litecoin'],
  SHIB: ['shiba inu'], APT: ['aptos'], ARB: ['arbitrum'], OP: ['optimism'], INJ: ['injective'],
  FET: ['fetch.ai', 'fetch ai'], PEPE: ['pepe'], SUI: ['sui network'], NEAR: ['near protocol'],
  ATOM: ['cosmos'], AAVE: ['aave'], UNI: ['uniswap'],
}

function extractTokens(text) {
  if (!text) return []
  const lower = text.toLowerCase()
  const hits = new Set()
  for (const sym of TOKEN_ALLOW) {
    const re = new RegExp(`(^|[^A-Z0-9])${sym}([^A-Z0-9]|$)`, 'i')
    if (re.test(text)) {
      hits.add(sym)
      continue
    }
    const names = TOKEN_NAMES[sym]
    if (names && names.some((n) => lower.includes(n))) hits.add(sym)
  }
  return Array.from(hits).slice(0, 6).map((code) => ({ code, title: '' }))
}

function decode(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&#8217;|&#x2019;/gi, '’')
    .replace(/&#8211;|&#x2013;/gi, '–')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tag(blk, name) {
  const m = blk.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? m[1] : ''
}

function getLink(blk) {
  let m = blk.match(/<link[^>]*>([\s\S]*?)<\/link>/i)
  if (m && m[1].trim()) return decode(m[1])
  m = blk.match(/<link[^>]*href=["']([^"']+)["']/i)
  if (m) return m[1]
  m = blk.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)
  if (m && /^https?:\/\//.test(m[1].trim())) return decode(m[1])
  return ''
}

function parseFeed(xml, source) {
  const items = xml.split(/<item[\s>]/i).slice(1)
  const out = []
  for (const blk of items.slice(0, 20)) {
    const title = decode(tag(blk, 'title'))
    const url = getLink(blk)
    const pub = tag(blk, 'pubDate') || tag(blk, 'dc:date') || tag(blk, 'published')
    const published_at = pub ? new Date(decode(pub)).toISOString() : null
    const description = decode(tag(blk, 'description') || tag(blk, 'summary')).slice(0, 400)
    if (!title || title.length < 8 || !url || !published_at || published_at === 'Invalid Date') continue
    out.push({ title, url, published_at, description, source })
  }
  return out
}

let cache = null
let cacheAt = 0
const TTL = 5 * 60 * 1000

// ORCA ranks the single most important "breaking" story among the freshest
// candidates — a judgment call a keyword heuristic can't make (event > analysis).
async function pickBreaking(candidates) {
  const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  let ai
  let model
  if (xaiKey) {
    ai = new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' })
    model = 'grok-3-fast'
  } else if (openaiKey) {
    ai = new OpenAI({ apiKey: openaiKey })
    model = 'gpt-4o-mini'
  } else {
    return null
  }
  const list = candidates.map((a, i) => `${i}. [${a.source}] ${a.title}`).join('\n')
  const system =
    "You are ORCA, Sonar's crypto news editor. From the numbered headlines, pick the SINGLE most " +
    'important, market-moving "breaking" story right now — the one a serious crypto trader most needs ' +
    'to see. Prefer hard market/macro events (Fed/rates, ETF flows or approvals, regulation/SEC, ' +
    'hacks/exploits, large liquidations, major price moves, exchange/treasury news) over routine ' +
    'price-analysis, opinion columns, recaps or explainers. Respond with ONLY compact JSON: ' +
    '{"index": <number>, "reason": "<max 12 words on why it is the top story>"}.'
  const user = `Headlines:\n${list}\n\nReturn the JSON now:`
  try {
    const c = await ai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      max_tokens: 120,
    })
    const txt = (c?.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim()
    const m = txt.match(/\{[\s\S]*\}/)
    if (!m) return null
    const parsed = JSON.parse(m[0])
    const idx = Number(parsed.index)
    if (!Number.isInteger(idx) || idx < 0 || idx >= candidates.length) return null
    return { url: candidates[idx].url, reason: String(parsed.reason || '').slice(0, 120) }
  } catch {
    return null
  }
}

export async function GET() {
  if (cache && Date.now() - cacheAt < TTL) {
    return NextResponse.json(cache)
  }
  try {
    const results = await Promise.all(
      FEEDS.map(async (f) => {
        try {
          const r = await fetch(f.url, { headers: { 'User-Agent': 'Mozilla/5.0 SonarNews/1.0' }, cache: 'no-store' })
          if (!r.ok) return []
          const xml = await r.text()
          return parseFeed(xml, f.source)
        } catch {
          return []
        }
      })
    )
    const seen = new Set()
    const articles = []
    for (const arr of results) {
      for (const a of arr) {
        if (!a.url || seen.has(a.url)) continue
        seen.add(a.url)
        articles.push({
          id: a.url,
          title: a.title,
          description: a.description,
          published_at: a.published_at,
          source: a.source,
          url: a.url,
          image: '',
          instruments: extractTokens(`${a.title} ${a.description}`),
          kind: 'news',
        })
      }
    }
    articles.sort((x, y) => new Date(y.published_at) - new Date(x.published_at))
    const top = articles.slice(0, 80)
    // ORCA picks the most important breaking story among the freshest candidates.
    try {
      const pick = await pickBreaking(top.slice(0, 14))
      if (pick) {
        const target = top.find((a) => a.url === pick.url)
        if (target) {
          target.orcaPick = true
          target.orcaReason = pick.reason
        }
      }
    } catch {
      /* non-fatal: client falls back to the heuristic */
    }
    const payload = { articles: top, updated: new Date().toISOString() }
    if (top.length > 0) {
      cache = payload
      cacheAt = Date.now()
    }
    return NextResponse.json(top.length > 0 ? payload : cache || payload)
  } catch {
    if (cache) return NextResponse.json(cache)
    return NextResponse.json({ articles: [], updated: new Date().toISOString() }, { status: 500 })
  }
}
