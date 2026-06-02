import { describe, it, expect } from 'vitest'
import { loadRecentHistory } from '@/lib/orca/chat/loadRecentHistory'
import { trimTurnsForPrompt } from '@/lib/orca/chat/trimHistory'
import { formatHistoryForPrompt } from '@/lib/orca/chat/formatHistoryForPrompt'

/**
 * Integration: conversation lookback (2026-06-02 fix).
 * =============================================================================
 * The clients never send prior turns — the server is the single source of
 * truth. On every POST the route handler loads the last N turns from
 * `chat_history` (by session_id) and injects a PRIOR CONVERSATION TURNS block
 * into the writer prompt. This exercises the real load → trim → format seam the
 * route handler wires together so a follow-up like "what does that mean?"
 * resolves against the genuine prior turn instead of inventing a denial.
 *
 * Transcript under test (verbatim from the build prompt §6):
 *   USER: is 0x515b…33C8 a whale on bsc?
 *   ORCA: That wallet holds 4,200 BNB (~$2.6M) and has been net-accumulating…
 *   USER: what does that mean?            ← must reference the prior turn
 *
 * BEFORE the fix the prompt carried no history, so the writer denied any prior
 * context. AFTER the fix the formatted block contains the prior wallet answer,
 * giving the follow-up the context it needs.
 */

const USER = 'user-1234-abcd'
const SESSION = 'sess-tab-9'

const PRIOR_USER = 'is 0x515b…33C8 a whale on bsc?'
const PRIOR_ORCA =
  'That wallet holds 4,200 BNB (~$2.6M) and has been net-accumulating BNB over the past two weeks.'

/**
 * Mock supabase query builder matching the real chain the loader walks:
 * from().select('*').eq('user_id').eq('session_id').order().limit() → thenable.
 * Rows arrive newest → oldest (descending), as the real query returns them.
 */
function makeSupabase(rows: any[]) {
  const filters: Array<[string, any]> = []
  const chain: any = {
    select() { return chain },
    eq(col: string, val: any) { filters.push([col, val]); return chain },
    order() { return chain },
    limit() { return chain },
    then(resolve: any, reject: any) {
      return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
    },
  }
  return { sb: { from: () => chain }, filters }
}

describe('integration — copilot conversation lookback', () => {
  it('injects the prior wallet turn into the prompt so "what does that mean?" has context', async () => {
    const { sb } = makeSupabase([
      // newest → oldest; the loader reverses to chronological order.
      { question: PRIOR_USER, response: PRIOR_ORCA, timestamp: '2026-06-04T12:00:01Z' },
    ])

    const turns = await loadRecentHistory(sb as any, USER, SESSION)
    const trimmed = trimTurnsForPrompt(turns)
    const block = formatHistoryForPrompt(trimmed)

    // The follow-up writer prompt now carries the real prior exchange.
    expect(block).toContain('PRIOR CONVERSATION TURNS')
    expect(block).toContain(PRIOR_USER)
    expect(block).toContain('4,200 BNB')
    expect(block).toContain('net-accumulating')
  })

  it('filters strictly by the verified userId and session_id from the JWT', async () => {
    const { sb, filters } = makeSupabase([
      { question: PRIOR_USER, response: PRIOR_ORCA, timestamp: '2026-06-04T12:00:01Z' },
    ])
    await loadRecentHistory(sb as any, USER, SESSION)
    expect(filters).toContainEqual(['user_id', USER])
    expect(filters).toContainEqual(['session_id', SESSION])
  })

  it('without history the formatted block is empty (the pre-fix denial state)', async () => {
    const { sb } = makeSupabase([])
    const turns = await loadRecentHistory(sb as any, USER, SESSION)
    const block = formatHistoryForPrompt(trimTurnsForPrompt(turns))
    expect(block).toBe('')
  })
})
