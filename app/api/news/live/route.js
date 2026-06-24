import { NextResponse } from 'next/server'

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
    const payload = { articles: articles.slice(0, 80), updated: new Date().toISOString() }
    if (articles.length > 0) {
      cache = payload
      cacheAt = Date.now()
    }
    return NextResponse.json(articles.length > 0 ? payload : cache || payload)
  } catch {
    if (cache) return NextResponse.json(cache)
    return NextResponse.json({ articles: [], updated: new Date().toISOString() }, { status: 500 })
  }
}
