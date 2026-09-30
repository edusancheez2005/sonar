import { describe, it, expect } from 'vitest'
import { isExplainerQuestion } from '../../lib/orca/explainer'

describe('isExplainerQuestion', () => {
  it('matches definitional crypto questions with no ticker', () => {
    expect(isExplainerQuestion('Explain what a whale is in crypto', false)).toBe(true)
    expect(isExplainerQuestion('what does net inflow mean?', false)).toBe(true)
    expect(isExplainerQuestion('What is a stablecoin?', false)).toBe(true)
    expect(isExplainerQuestion('how does staking work', false)).toBe(true)
    expect(isExplainerQuestion('eli5 open interest', false)).toBe(true)
  })
  it('leaves data, ticker, personal and Sonar questions alone', () => {
    expect(isExplainerQuestion('what are whales doing today?', false)).toBe(false)
    expect(isExplainerQuestion("what's happening in crypto?", false)).toBe(false)
    expect(isExplainerQuestion('what is the price of ETH?', true)).toBe(false)
    expect(isExplainerQuestion('what is in my watchlist?', false)).toBe(false)
    expect(isExplainerQuestion('what can sonar do?', false)).toBe(false)
    expect(isExplainerQuestion('what should i buy?', false)).toBe(false)
    expect(isExplainerQuestion('hello', false)).toBe(false)
    expect(isExplainerQuestion('what is the weather like', false)).toBe(false)
  })
})
