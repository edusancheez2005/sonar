import { describe, it, expect } from 'vitest'
import { scrubToolNames, applyGuardrails } from '../../lib/orca/orchestrator/guardrails'

describe('scrubToolNames', () => {
  it('drops parenthetical tool mentions', () => {
    expect(scrubToolNames('Whale activity in the last 24 hours (getTrendingWhales data):'))
      .toBe('Whale activity in the last 24 hours:')
    expect(scrubToolNames('Net flows (from getWhaleFlows) show buying.')).toBe('Net flows show buying.')
  })
  it('rewrites bare tool names into plain words', () => {
    expect(scrubToolNames('According to getLargestTransactions, QNT led.')).toBe("According to Sonar's data, QNT led.")
    expect(scrubToolNames('findTrackedWallets returned 3 rows')).toBe("Sonar's data returned 3 rows")
  })
  it('leaves ordinary text alone', () => {
    const s = 'Whales net bought `$1.68B` of BTC. Get the details below.'
    expect(scrubToolNames(s)).toBe(s)
  })
  it('is applied by applyGuardrails on the happy path', () => {
    const out = applyGuardrails('Largest moves (getLargestTransactions data): QNT buy of `$10.9M`.')
    expect(out.declined).toBe(false)
    expect(out.text).not.toMatch(/getLargestTransactions/)
    expect(out.text).toMatch(/^Largest moves: QNT buy/)
  })
})
