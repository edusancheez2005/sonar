import { describe, it, expect } from 'vitest'
import { matchFastPath } from '../../lib/orca/fast-paths'
import { FIRST_QUESTION } from '../../lib/onboarding/firstRun'

const names = (q: string, tickers: string[] = []) => matchFastPath(q, tickers)?.name ?? null
const tools = (q: string, tickers: string[] = []) => matchFastPath(q, tickers)?.calls.map((c) => c.tool) ?? null

describe('matchFastPath', () => {
  it('market-wide whale activity (the signup question + chips)', () => {
    const fp = matchFastPath(FIRST_QUESTION, [])
    expect(fp?.name).toBe('whale_summary')
    expect(fp?.calls).toEqual([{ tool: 'getTrendingWhales', args: { window: '24h' } }])
    expect(matchFastPath('What are the biggest whale moves this week?', [])?.calls[0].args).toEqual({ window: '7d' })
    expect(names('what are whales doing today?')).toBe('whale_summary')
  })

  it('ticker facets: news / price / social / derivatives / whale flows', () => {
    expect(names("What's the latest news on Bitcoin?", ['BTC'])).toBe('news_ticker')
    expect(tools("What's the latest news on Bitcoin?", ['BTC'])).toEqual(['getNews', 'getPrice'])
    expect(names('What is the price of ETH right now?', ['ETH'])).toBe('price_ticker')
    expect(names("What's the sentiment around Solana?", ['SOL'])).toBe('social_ticker')
    expect(names('Is ETH heavily leveraged right now?', ['ETH'])).toBe('deriv_ticker')
    expect(names('what are whales doing with ETH?', ['ETH'])).toBe('whale_ticker')
    expect(matchFastPath('what are whales doing with ETH?', ['ETH'])?.decision.tickers).toEqual(['ETH'])
  })

  it('market-wide news / social / largest transactions', () => {
    expect(names("what's the latest crypto news?")).toBe('news_market')
    expect(names('which tokens are hot by social momentum?')).toBe('social_market')
    expect(names('What are the biggest transactions today?')).toBe('largest_transactions')
    expect(tools('What are the biggest transactions today?')).toEqual(['getLargestTransactions'])
  })

  it('market overview → the three leaderboards', () => {
    expect(names("What's going on in crypto today?")).toBe('market_overview')
    expect(tools('give me a market update')).toEqual(['getTrendingWhales', 'getTrendingSocial', 'getTrendingNews'])
    expect(names("what's happening with BTC?", ['BTC'])).toBeNull()
  })

  it('"why did X move" gets price + news + whale flows', () => {
    expect(names('Why did BTC move today?', ['BTC'])).toBe('why_move')
    expect(tools('why is SOL down today?', ['SOL'])).toEqual(['getPrice', 'getNews', 'getWhaleFlows'])
  })

  it('leaves ambiguous, multi-facet, compare, macro-event, wallet and personal questions to the LLMs', () => {
    expect(names('Compare BTC and ETH whale flows', ['BTC'])).toBeNull()
    expect(names('how did the Fed decision affect Bitcoin?', ['BTC'])).toBeNull()
    expect(names('what is wallet 0xf977814e90da44bfa03b6295a0616a897441acec doing?')).toBeNull()
    expect(names('which whale is the most profitable this week?')).toBeNull()
    expect(names('what are solana whales doing today?')).toBeNull()
    expect(names('news and whale flows for BTC please', ['BTC'])).toBeNull()
    expect(names("what's in my watchlist?")).toBeNull()
    expect(names('Explain what a whale is in crypto')).toBeNull()
    expect(names('hello')).toBeNull()
    expect(names('price of BTC and ETH', ['BTC'])).toBeNull()
  })
})
