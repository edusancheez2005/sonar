import { describe, it, expect } from 'vitest'
import { matchFastPath } from '../../lib/orca/fast-paths'
import { FIRST_QUESTION } from '../../lib/onboarding/firstRun'

describe('matchFastPath — whale_summary', () => {
  it('matches the signup first question and the default chips', () => {
    const fp = matchFastPath(FIRST_QUESTION, false)
    expect(fp?.name).toBe('whale_summary')
    expect(fp?.decision.intent).toBe('data_query')
    expect(fp?.calls).toEqual([{ tool: 'getTrendingWhales', args: { window: '24h' } }])
    expect(matchFastPath('What are the biggest whale moves this week?', false)?.calls[0].args).toEqual({ window: '7d' })
    expect(matchFastPath('what are whales doing today?', false)?.calls[0].args).toEqual({ window: '24h' })
    expect(matchFastPath('Are whales buying or selling right now?', false)?.name).toBe('whale_summary')
  })

  it('leaves ticker, wallet, entity and chain questions to the LLMs', () => {
    expect(matchFastPath('Are whales buying or selling Bitcoin right now?', true)).toBeNull()
    expect(matchFastPath('what are whales doing with ETH?', false)).toBeNull()
    expect(matchFastPath('what is wallet 0xf977814e90da44bfa03b6295a0616a897441acec doing?', false)).toBeNull()
    expect(matchFastPath('which whale is the most profitable this week?', false)).toBeNull()
    expect(matchFastPath('what are the largest whale transactions today?', false)).toBeNull()
    expect(matchFastPath('what are solana whales doing today?', false)).toBeNull()
    expect(matchFastPath('what is vitalik doing?', false)).toBeNull()
    expect(matchFastPath('hello', false)).toBeNull()
  })
})
