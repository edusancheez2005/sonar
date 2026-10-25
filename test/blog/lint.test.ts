import { describe, it, expect } from 'vitest'
import { lintArticle, wordCount } from '@/lib/blog/lint'
import { TOPIC_POOL, INTERNAL_LINKS, nextTopic } from '@/lib/blog/topics'

const CLEAN = `
<h1>What is a crypto whale?</h1>
<p>In the 7 days to 25 Oct 2026, Sonar's Ethereum whale tape recorded 412 transfers over $1M.</p>
<h2>How whales show up on-chain</h2>
<p>A whale transfer is a large movement between two addresses. Exchanges also move funds between their own wallets, which is not buying or selling.</p>
<blockquote><p>Read a large transfer as context, not as a forecast.</p></blockquote>
<table><tr><th>Token</th><th>Transfers over $1M</th></tr><tr><td>USDT</td><td>120</td></tr></table>
<p>This article is for information only and is not financial advice.</p>
`

describe('lintArticle', () => {
  it('passes a compliant article', () => {
    const r = lintArticle(CLEAN)
    expect(r.reasons).toEqual([])
    expect(r.ok).toBe(true)
  })

  it('rejects an accuracy claim', () => {
    const r = lintArticle('<p>Sonar Tracker offers real-time updates with 99% accuracy.</p>')
    expect(r.ok).toBe(false)
    expect(r.reasons.join(' ')).toMatch(/accuracy/)
  })

  it('rejects a price next to Sonar', () => {
    const r = lintArticle('<p>Sonar Tracker starts at $199/mo for the full feature set.</p>')
    expect(r.ok).toBe(false)
    expect(r.reasons.join(' ')).toMatch(/price next to Sonar/)
  })

  it('rejects a price next to a competitor', () => {
    const r = lintArticle('<p>Nansen charges $150/month for its Pro plan.</p>')
    expect(r.ok).toBe(false)
    expect(r.reasons.join(' ')).toMatch(/price next to a competitor/)
  })

  it('rejects buy/sell signal wording', () => {
    expect(lintArticle('<p>Treat accumulation as a buy signal.</p>').ok).toBe(false)
    expect(lintArticle('<p>These sell signals fire early.</p>').ok).toBe(false)
  })

  it('rejects win rates, user counts and comparison angles', () => {
    expect(lintArticle('<p>The strategy produced a 67% win rate.</p>').ok).toBe(false)
    expect(lintArticle('<p>Over 700+ traders use the platform.</p>').ok).toBe(false)
    expect(lintArticle('<p>The best Nansen alternative for beginners.</p>').ok).toBe(false)
  })

  it('does not flag transfer sizes near a company name', () => {
    // A threshold or transfer amount is not a price.
    expect(lintArticle('<p>Whale Alert flagged a $250,000,000 USDT transfer from Binance.</p>').ok).toBe(true)
  })

  it('enforces a minimum length when asked', () => {
    const r = lintArticle(CLEAN, { minWords: 900 })
    expect(r.ok).toBe(false)
    expect(r.reasons.join(' ')).toMatch(/too short/)
    expect(wordCount(CLEAN)).toBeGreaterThan(40)
  })
})

describe('topic pool', () => {
  it('has unique slugs and at least 12 new topics', () => {
    const slugs = TOPIC_POOL.map((t) => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(TOPIC_POOL.filter((t) => t.kind === 'new').length).toBeGreaterThanOrEqual(12)
  })

  it('carries no comparison, alternative, ranking, accuracy or signal angle', () => {
    for (const t of TOPIC_POOL) {
      const s = `${t.slug} ${t.keyword} ${t.angle}`
      expect(s, t.slug).not.toMatch(/\b(?:vs|versus|alternative|compared|ranked|best|accuracy|signals?)\b/i)
    }
  })

  it('serves rewrites first and skips published slugs', () => {
    const first = nextTopic(new Set())
    expect(first.topic?.kind).toBe('rewrite')
    const all = new Set(TOPIC_POOL.map((t) => t.slug))
    expect(nextTopic(all)).toEqual({ topic: null, remaining: 0 })
  })

  it('links only to on-site paths, never to the comparison pages', () => {
    for (const l of INTERNAL_LINKS) {
      expect(l.url.startsWith('/')).toBe(true)
      expect(l.url).not.toMatch(/alternative|-2026$/)
    }
  })
})
