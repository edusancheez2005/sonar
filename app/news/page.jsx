import React from 'react'
import NewsTerminal from './NewsTerminal'
import AuthGuard from '@/app/components/AuthGuard'

export const metadata = {
  title: 'News Terminal — Real-Time Crypto Intelligence',
  description: 'Real-time crypto news, social sentiment, macro analysis, and key voices from world leaders and crypto influencers — all in one terminal.',
  alternates: { canonical: 'https://www.sonartracker.io/news' },
}

export default async function NewsPage() {
  // Server-side fetch: Prefer existing News API (NewsAPI.org) if available; fallback to CryptoPanic
  const CP_BASE = 'https://cryptopanic.com/api/developer/v2/posts/'
  const AUTH = process.env.CRYPTOPANIC_API_KEY || ''
  const NEWS_KEY = process.env.NEWS_API_KEY || ''
  let initialNews = []
  const TOKEN_ALLOW = ['BTC','ETH','XRP','USDT','USDC','BNB','SOL','ADA','DOGE','TRX','TON','MATIC','LINK','AVAX','DOT','LTC','ETC','SHIB','APT','ARB','OP','IMX','INJ','FET','PEPE','SUI','NEAR','ATOM','AAVE','UNI','CRV','SUSHI','DAI']
  const BLOCKED_DOMAINS = new Set(['pypi.org','ambcrypto.com'])
  const extractTokens = (text) => {
    if (!text) return []
    const upper = String(text).toUpperCase()
    const hits = new Set()
    for (const sym of TOKEN_ALLOW) {
      const re = new RegExp(`(^|[^A-Z0-9])${sym}([^A-Z0-9]|$)`, 'i')
      if (re.test(upper)) hits.add(sym)
    }
    return Array.from(hits).slice(0, 8).map(code => ({ code, title: '' }))
  }
  const domainBlocked = (urlStr) => {
    try {
      const u = new URL(urlStr)
      const host = (u.hostname || '').replace(/^www\./i, '').toLowerCase()
      return BLOCKED_DOMAINS.has(host)
    } catch {
      return false
    }
  }
  try {
    // 1) Try NewsAPI.org (Existing News API)
    if (NEWS_KEY) {
      try {
        const q = encodeURIComponent('(crypto OR bitcoin OR ethereum OR blockchain)')
        const newsUrl = `https://newsapi.org/v2/everything?language=en&sortBy=publishedAt&pageSize=50&q=${q}`
        const nres = await fetch(newsUrl, { cache: 'no-store', headers: { 'X-Api-Key': NEWS_KEY } })
        if (nres.ok) {
          const nj = await nres.json()
          const arts = Array.isArray(nj?.articles) ? nj.articles : []
          initialNews = arts.map((a, idx) => ({
            id: a.url || idx,
            title: a.title || '',
            description: a.description || a.content || '',
            published_at: a.publishedAt,
            source: a.source?.name || 'Unknown',
            url: a.url || '',
            image: a.urlToImage || '',
            instruments: extractTokens(`${a.title} ${a.description}`),
            kind: 'news',
          }))
          // Filter out items without tokens or blocked domains
          initialNews = initialNews.filter(it => it.url && it.instruments && it.instruments.length > 0 && !domainBlocked(it.url))
        }
      } catch {}
    }

    // 2) Fallback: CryptoPanic (public mode)
    // Primary request (match working curl: no size param)
    const url = `${CP_BASE}?auth_token=${AUTH}&public=true&regions=en`
    const res = await fetch(url, { cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      const items = Array.isArray(json?.results) ? json.results : []
      if (initialNews.length === 0 && items.length > 0) {
        initialNews = items.map((it) => ({
        id: it.id,
        title: it.title || '',
        description: it.description || '',
        published_at: it.published_at || it.created_at,
        source: it.source?.title || it.source?.domain || 'Unknown',
        url: it.original_url || it.url || (it.id ? `https://cryptopanic.com/news/${it.id}` : ''),
        image: it.image || '',
          instruments: (() => {
            if (Array.isArray(it.instruments) && it.instruments.length > 0) {
              return it.instruments.map(i => ({ code: (i.code || '').toUpperCase(), title: i.title || '' }))
            }
            return extractTokens(`${it.title} ${it.description}`)
          })(),
        kind: it.kind || 'news',
        }))
        initialNews = initialNews.filter(it => it.url && it.instruments && it.instruments.length > 0 && !domainBlocked(it.url))
      }

      // If empty, try fallback without region param
      if (initialNews.length === 0) {
        try {
          const res2 = await fetch(`${CP_BASE}?auth_token=${AUTH}&public=true`, { cache: 'no-store' })
          if (res2.ok) {
            const j2 = await res2.json()
            const items2 = Array.isArray(j2?.results) ? j2.results : []
            initialNews = items2.map((it) => ({
              id: it.id,
              title: it.title || '',
              description: it.description || '',
              published_at: it.published_at || it.created_at,
              source: it.source?.title || it.source?.domain || 'Unknown',
              url: it.original_url || it.url || (it.id ? `https://cryptopanic.com/news/${it.id}` : ''),
              image: it.image || '',
              instruments: (() => {
                if (Array.isArray(it.instruments) && it.instruments.length > 0) {
                  return it.instruments.map(i => ({ code: (i.code || '').toUpperCase(), title: i.title || '' }))
                }
                return extractTokens(`${it.title} ${it.description}`)
              })(),
              kind: it.kind || 'news',
            }))
            initialNews = initialNews.filter(it => it.url && it.instruments && it.instruments.length > 0 && !domainBlocked(it.url))
          }
        } catch {}
      }

      // CoinGecko enrichment: attach price_usd and change24h to instruments
      const symbols = new Set()
      for (const it of initialNews) {
        for (const ins of (it.instruments || [])) {
          const sym = String(ins.code || '').toUpperCase()
          if (sym && sym.length >= 2 && symbols.size < 50) symbols.add(sym)
        }
      }

      if (symbols.size > 0) {
        try {
          // Fetch all Binance 24hr tickers (single call, weight 80)
          const bnRes = await fetch('https://data-api.binance.vision/api/v3/ticker/24hr', { cache: 'no-store' })
          if (bnRes.ok) {
            const allTickers = await bnRes.json()
            const bySymbol = new Map()
            for (const t of allTickers) {
              if (t.symbol.endsWith('USDT')) {
                const sym = t.symbol.replace('USDT', '')
                bySymbol.set(sym, {
                  price_usd: parseFloat(t.lastPrice) || 0,
                  change24h: parseFloat(t.priceChangePercent) || 0,
                })
              }
            }

            // Enrich instruments in-place
            initialNews = initialNews.map((it) => {
              const enriched = (it.instruments || []).map((ins) => {
                const sym = String(ins.code || '').toUpperCase()
                const md = bySymbol.get(sym)
                return {
                  ...ins,
                  price_usd: md?.price_usd,
                  change24h: md?.change24h,
                }
              })
              return { ...it, instruments: enriched }
            })
          }
        } catch {}
      }
    }
  } catch {}

  return (
    <AuthGuard>
      <NewsTerminal initialNews={initialNews} />
    </AuthGuard>
  )
}
