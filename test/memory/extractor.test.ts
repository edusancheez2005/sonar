import { describe, expect, it, vi } from 'vitest'
import {
  detectSensitive,
  extractMemoryFacts,
  buildExtractorUserPrompt,
  __internals,
} from '../../lib/orca/memory/extractor'
import type { SupabaseLike } from '../../lib/orca/orchestrator/types'

const NOW = new Date('2026-06-01T12:00:00Z')
const fixedNow = () => NOW

function mkSupabase(opts: {
  countToday?: number
  insertImpl?: (rows: any[]) => any
  insertCapture?: { rows?: any[] }
}): SupabaseLike {
  return {
    from: (table: string) => {
      if (table !== 'orca_memory') throw new Error(`unexpected table ${table}`)
      return {
        // SELECT count head:true
        select: (_cols: string, _opts?: any) => ({
          eq: (_col: string, _val: any) => ({
            gte: (_col2: string, _val2: any) => Promise.resolve({ count: opts.countToday ?? 0 }),
          }),
        }),
        // INSERT
        insert: (rows: any[]) => {
          if (opts.insertCapture) opts.insertCapture.rows = rows
          if (opts.insertImpl) return opts.insertImpl(rows)
          return Promise.resolve({ data: rows, error: null })
        },
      }
    },
  }
}

describe('detectSensitive', () => {
  const cases: Array<[string, string]> = [
    ['ETH address', 'send to 0x1234567890abcdef1234567890abcdef12345678'],
    ['email', 'ping me at alice@example.com'],
    ['dollar', 'I bought ETH at $3200'],
    ['USD suffix', 'I deposited 500 USD'],
    ['phone', 'call +1 415 555 0123 today'],
    ['SSN', 'SSN is 123-45-6789'],
    ['API key sk-', 'my key sk-ABCDEFGHIJKLMNOP1234'],
    ['JWT', 'token eyJabcdefghijklmnopqrst.aaa.bbb'],
    ['BTC address', 'send to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'],
  ]
  for (const [name, text] of cases) {
    it(`flags ${name}`, () => {
      expect(detectSensitive(text).detected).toBe(true)
    })
  }

  it('does NOT flag clean text', () => {
    expect(detectSensitive('I prefer long-term horizons and Solana DeFi.').detected).toBe(false)
    expect(detectSensitive('what is ETH doing this week?').detected).toBe(false)
  })
})

describe('buildExtractorUserPrompt', () => {
  it('truncates very long input', () => {
    const big = 'x'.repeat(10000)
    const out = buildExtractorUserPrompt(big, big)
    expect(out.length).toBeLessThan(10000)
  })
})

describe('extractMemoryFacts', () => {
  it('skips with pii_detected when the user message contains a wallet address', async () => {
    const captured: { rows?: any[] } = {}
    const model = { extractCall: vi.fn().mockResolvedValue('{"facts":[]}') }
    const sb = mkSupabase({ insertCapture: captured })
    const res = await extractMemoryFacts({
      userId: 'u1',
      userMessage: 'My wallet is 0x1234567890abcdef1234567890abcdef12345678',
      orcaResponse: 'I do not store wallet addresses.',
      supabase: sb,
      model,
      now: fixedNow,
    })
    expect(res.inserted).toBe(0)
    expect(res.skipped_reason).toBe('pii_detected')
    expect(model.extractCall).not.toHaveBeenCalled()
    expect(captured.rows).toBeUndefined()
  })

  it('skips when daily cap is reached', async () => {
    const sb = mkSupabase({ countToday: __internals.MAX_FACTS_PER_USER_DAY })
    const res = await extractMemoryFacts({
      userId: 'u1',
      userMessage: 'I prefer long horizons',
      orcaResponse: 'noted',
      supabase: sb,
      model: { extractCall: vi.fn().mockResolvedValue('{"facts":[]}') },
      now: fixedNow,
    })
    expect(res.inserted).toBe(0)
    expect(res.skipped_reason).toBe('daily_cap_reached')
  })

  it('returns model_returned_no_facts when the model emits an empty list', async () => {
    const sb = mkSupabase({})
    const res = await extractMemoryFacts({
      userId: 'u1',
      userMessage: 'random question',
      orcaResponse: 'BTC is up',
      supabase: sb,
      model: { extractCall: vi.fn().mockResolvedValue('{"facts":[]}') },
      now: fixedNow,
    })
    expect(res.inserted).toBe(0)
    expect(res.skipped_reason).toBe('model_returned_no_facts')
  })

  it('returns model_parse_error on malformed JSON', async () => {
    const sb = mkSupabase({})
    const res = await extractMemoryFacts({
      userId: 'u1',
      userMessage: 'tell me about SOL',
      orcaResponse: '...',
      supabase: sb,
      model: { extractCall: vi.fn().mockResolvedValue('not json at all') },
      now: fixedNow,
    })
    expect(res.skipped_reason).toBe('model_parse_error')
  })

  it('inserts paraphrased facts with expires_at = now + 90d', async () => {
    const captured: { rows?: any[] } = {}
    const sb = mkSupabase({ insertCapture: captured })
    const res = await extractMemoryFacts({
      userId: 'u1',
      userMessage: 'Tell me more about Solana L2s; I am long-term focused.',
      orcaResponse: 'Sure — here is what is happening.',
      supabase: sb,
      model: {
        extractCall: vi.fn().mockResolvedValue(JSON.stringify({
          facts: [
            { fact: 'User is researching Solana L2s', confidence: 0.8 },
            { fact: 'User prefers long-term horizons', confidence: 0.7 },
          ],
        })),
      },
      now: fixedNow,
    })
    expect(res.inserted).toBe(2)
    expect(captured.rows).toHaveLength(2)
    expect(captured.rows![0].user_id).toBe('u1')
    expect(captured.rows![0].fact).toMatch(/User is researching/)
    expect(captured.rows![0].confidence).toBeCloseTo(0.8)
    const exp = new Date(captured.rows![0].expires_at).getTime()
    const expected = NOW.getTime() + __internals.DEFAULT_TTL_MS
    expect(Math.abs(exp - expected)).toBeLessThan(1000)
  })

  it('strips fenced code blocks before parsing', async () => {
    const sb = mkSupabase({})
    const res = await extractMemoryFacts({
      userId: 'u1',
      userMessage: 'I focus on memecoins on Base.',
      orcaResponse: 'noted',
      supabase: sb,
      model: {
        extractCall: vi.fn().mockResolvedValue('```json\n{"facts":[{"fact":"User trades memecoins on Base","confidence":0.6}]}\n```'),
      },
      now: fixedNow,
    })
    expect(res.inserted).toBe(1)
  })

  it('clamps confidence to [0,1] and truncates fact length', async () => {
    const captured: { rows?: any[] } = {}
    const sb = mkSupabase({ insertCapture: captured })
    const longFact = 'User loves '.padEnd(500, 'X')
    await extractMemoryFacts({
      userId: 'u1',
      userMessage: 'tell me about X',
      orcaResponse: 'ok',
      supabase: sb,
      model: {
        extractCall: vi.fn().mockResolvedValue(JSON.stringify({
          facts: [
            { fact: longFact, confidence: 9.9 },
            { fact: 'OK', confidence: -1 },
          ],
        })),
      },
      now: fixedNow,
    })
    expect(captured.rows![0].confidence).toBe(1)
    expect(captured.rows![0].fact.length).toBe(__internals.MAX_FACT_LENGTH)
    expect(captured.rows![1].confidence).toBe(0)
  })

  it('rejects facts that quote the user verbatim', async () => {
    const sb = mkSupabase({})
    const userMsg = 'I am specifically researching solana liquid staking protocols this quarter'
    const res = await extractMemoryFacts({
      userId: 'u1',
      userMessage: userMsg,
      orcaResponse: 'ok',
      supabase: sb,
      model: {
        extractCall: vi.fn().mockResolvedValue(JSON.stringify({
          facts: [{ fact: userMsg, confidence: 0.9 }],
        })),
      },
      now: fixedNow,
    })
    expect(res.inserted).toBe(0)
    expect(res.skipped_reason).toBe('pii_detected')
  })

  it('respects the remaining daily cap when inserting', async () => {
    const captured: { rows?: any[] } = {}
    const sb = mkSupabase({
      countToday: __internals.MAX_FACTS_PER_USER_DAY - 1,
      insertCapture: captured,
    })
    await extractMemoryFacts({
      userId: 'u1',
      userMessage: 'long-term thinking',
      orcaResponse: 'ok',
      supabase: sb,
      model: {
        extractCall: vi.fn().mockResolvedValue(JSON.stringify({
          facts: [
            { fact: 'Fact A', confidence: 0.5 },
            { fact: 'Fact B', confidence: 0.5 },
            { fact: 'Fact C', confidence: 0.5 },
          ],
        })),
      },
      now: fixedNow,
    })
    expect(captured.rows).toHaveLength(1)
  })

  it('returns insert_error when the supabase insert returns an error', async () => {
    const sb = mkSupabase({
      insertImpl: () => Promise.resolve({ data: null, error: { message: 'rls denied' } }),
    })
    const res = await extractMemoryFacts({
      userId: 'u1',
      userMessage: 'long-term thinking',
      orcaResponse: 'ok',
      supabase: sb,
      model: {
        extractCall: vi.fn().mockResolvedValue('{"facts":[{"fact":"User prefers long horizons","confidence":0.5}]}'),
      },
      now: fixedNow,
    })
    expect(res.skipped_reason).toBe('insert_error')
  })
})
