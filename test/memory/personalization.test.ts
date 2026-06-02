import { describe, it, expect } from 'vitest'
import {
  buildPersonalizationBlock,
  loadPersonalizationContext,
  __internals,
} from '@/lib/orca/memory/personalization'

describe('buildPersonalizationBlock', () => {
  it('returns empty string when profile is null and no memories', () => {
    expect(buildPersonalizationBlock(null, [])).toBe('')
  })

  it('returns empty string when profile is empty and no memories', () => {
    expect(buildPersonalizationBlock({}, [])).toBe('')
  })

  it('includes the header guard, experience, horizon, risk, goal, and chains', () => {
    const out = buildPersonalizationBlock(
      {
        experience_level: 'intermediate',
        time_horizon: 'swing',
        risk_tolerance: 'balanced',
        primary_goal: 'research',
        preferred_chains: ['ethereum', 'solana', 'base'],
      },
      []
    )
    expect(out).toContain('USER PERSONALISATION')
    expect(out).toContain('do NOT relax the HARD RULES')
    expect(out).toContain('intermediate crypto user')
    expect(out).toContain('multi-day swing horizon')
    expect(out).toContain('balanced risk posture')
    expect(out).toContain('do research')
    expect(out).toContain('ethereum, solana, base')
    expect(out).toContain('absolute precedence')
  })

  it('renders memory facts as bullet list with cap of 8', () => {
    const memories = Array.from({ length: 12 }, (_, i) => ({
      fact: `User fact #${i + 1}`,
      confidence: 0.7,
    }))
    const out = buildPersonalizationBlock(null, memories)
    expect(out).toContain('Durable facts ORCA has learned')
    expect(out).toContain('- User fact #1')
    expect(out).toContain('- User fact #8')
    expect(out).not.toContain('- User fact #9')
  })

  it('skips memory entries without a string fact and trims whitespace', () => {
    const out = buildPersonalizationBlock(null, [
      { fact: '  legit fact  ' } as any,
      { fact: '' } as any,
      { fact: null } as any,
      { fact: 'second fact' } as any,
    ])
    expect(out).toContain('- legit fact')
    expect(out).toContain('- second fact')
    expect(out).not.toContain('- \n')
  })

  it('drops unknown enum values gracefully', () => {
    const out = buildPersonalizationBlock(
      {
        experience_level: 'wizard' as any,
        time_horizon: 'forever' as any,
        risk_tolerance: 'yolo' as any,
        primary_goal: 'gamble' as any,
      },
      []
    )
    // Unknown enums produce no lines → nothing to render → empty string.
    expect(out).toBe('')
  })

  it('caps inline fact length at 200 chars', () => {
    const long = 'a'.repeat(400)
    const out = buildPersonalizationBlock(null, [{ fact: long }])
    const line = out.split('\n').find((l) => l.startsWith('- ')) || ''
    expect(line.length).toBeLessThanOrEqual(2 + __internals.MAX_FACT_LEN_INLINE)
  })

  it('does NOT contain buy/sell/hold imperatives or price-target words', () => {
    const out = buildPersonalizationBlock(
      {
        experience_level: 'advanced',
        risk_tolerance: 'aggressive',
        time_horizon: 'long_term',
        primary_goal: 'trade',
      },
      [{ fact: 'User likes momentum signals' }]
    )
    // Spot-check the well-known forbidden verbs in the block prose. The
    // helper must remain neutral and additive — the ORCA_SYSTEM_PROMPT
    // hard rules are what enforce compliance, but the personalisation
    // block must never seed forbidden vocabulary.
    expect(out.toLowerCase()).not.toMatch(/\bbuy\b/)
    expect(out.toLowerCase()).not.toMatch(/\bsell\b/)
    expect(out.toLowerCase()).not.toMatch(/\bhold\b/)
    expect(out.toLowerCase()).not.toMatch(/price target/)
    expect(out.toLowerCase()).not.toMatch(/recommend/)
  })
})

describe('loadPersonalizationContext', () => {
  function makeSb(opts: {
    profile?: any
    memories?: any[]
    profileError?: boolean
    memoriesError?: boolean
  }) {
    return {
      from(table: string) {
        if (table === 'user_profile') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (opts.profileError) throw new Error('boom')
                  return { data: opts.profile ?? null }
                },
              }),
            }),
          }
        }
        if (table === 'orca_memory') {
          const result = opts.memoriesError
            ? Promise.reject(new Error('boom'))
            : Promise.resolve({ data: opts.memories ?? [] })
          const chain: any = {
            or: () => chain,
            order: () => chain,
            limit: () => chain,
            then: (resolve: any, reject: any) => result.then(resolve, reject),
          }
          return {
            select: () => ({
              eq: () => chain,
            }),
          }
        }
        throw new Error(`unexpected table ${table}`)
      },
    }
  }

  it('returns empty context for missing userId', async () => {
    const sb = makeSb({})
    const out = await loadPersonalizationContext(sb as any, '')
    expect(out).toEqual({ profile: null, memories: [], tickers: [], mutedTickers: [] })
  })

  it('returns profile + memories when supabase responds', async () => {
    const sb = makeSb({
      profile: { experience_level: 'advanced', preferred_chains: ['solana'] },
      memories: [
        { fact: 'User researches SOL L2s', confidence: 0.9, created_at: '2026-05-01T00:00:00Z' },
        { fact: 'User prefers 7d windows', confidence: 0.8 },
      ],
    })
    const out = await loadPersonalizationContext(sb as any, 'user-1')
    expect(out.profile?.experience_level).toBe('advanced')
    expect(out.memories).toHaveLength(2)
    expect(out.memories[0].fact).toBe('User researches SOL L2s')
  })

  it('swallows profile errors and still returns memories', async () => {
    const sb = makeSb({
      profileError: true,
      memories: [{ fact: 'kept' }],
    })
    const out = await loadPersonalizationContext(sb as any, 'user-1')
    expect(out.profile).toBeNull()
    expect(out.memories).toHaveLength(1)
  })

  it('swallows memory errors and still returns profile', async () => {
    const sb = makeSb({
      profile: { experience_level: 'new' },
      memoriesError: true,
    })
    const out = await loadPersonalizationContext(sb as any, 'user-1')
    expect(out.profile?.experience_level).toBe('new')
    expect(out.memories).toEqual([])
  })

  it('caps memories at 8 even if backend returns more', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ fact: `fact ${i}` }))
    const sb = makeSb({ memories: many })
    const out = await loadPersonalizationContext(sb as any, 'user-1')
    expect(out.memories).toHaveLength(8)
  })

  it('filters out memory rows without a usable fact', async () => {
    const sb = makeSb({
      memories: [
        { fact: 'real' },
        { fact: '' },
        { fact: null },
        {},
        { fact: 'real2' },
      ],
    })
    const out = await loadPersonalizationContext(sb as any, 'user-1')
    expect(out.memories.map((m) => m.fact)).toEqual(['real', 'real2'])
  })
})

describe('personalization — muted tickers', () => {
  function makeProfileSb(profile: any) {
    return {
      from(table: string) {
        if (table === 'user_profile') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile }) }) }),
          }
        }
        // orca_memory — resolve empty
        const chain: any = {
          or: () => chain,
          order: () => chain,
          limit: () => chain,
          then: (resolve: any) => Promise.resolve({ data: [] }).then(resolve),
        }
        return { select: () => ({ eq: () => chain }) }
      },
    }
  }

  const NOW = () => new Date('2026-06-04T12:00:00Z')

  it('surfaces muted tickers when the expiry is in the future', async () => {
    const sb = makeProfileSb({
      experience_level: 'intermediate',
      muted_tickers: ['btc', 'sol'],
      muted_tickers_until: '2026-06-05T12:00:00Z',
    })
    const ctx = await loadPersonalizationContext(sb as any, 'user-1', NOW)
    expect(ctx.mutedTickers).toEqual(['BTC', 'SOL'])
    const block = buildPersonalizationBlock(ctx.profile, ctx.memories, ctx.tickers, [], ctx.mutedTickers)
    expect(block).toContain('temporarily muted alerts for: BTC, SOL')
  })

  it('omits muted tickers (and the mute line) when the expiry is in the past', async () => {
    const sb = makeProfileSb({
      experience_level: 'intermediate',
      muted_tickers: ['btc'],
      muted_tickers_until: '2026-06-01T00:00:00Z',
    })
    const ctx = await loadPersonalizationContext(sb as any, 'user-1', NOW)
    expect(ctx.mutedTickers).toEqual([])
    const block = buildPersonalizationBlock(ctx.profile, ctx.memories, ctx.tickers, [], ctx.mutedTickers)
    expect(block).not.toContain('temporarily muted alerts')
  })
})

