import { describe, it, expect, afterEach } from 'vitest'
import {
  fetchEntityLabels,
  applyLabel,
  entityLabelsEnabled,
} from '@/lib/orca/orchestrator/tools/entityLabels'

function stubSupabase(rows: any[]) {
  const chain: any = {
    select() { return chain },
    in() { return chain },
    then(resolve: any) { resolve({ data: rows }) },
  }
  return { from: () => chain }
}

afterEach(() => {
  delete process.env.ORCA_ENTITY_LABELS
})

describe('entityLabels (§7)', () => {
  it('joins label + cohort from tracked_address_universe, keyed by both casings', async () => {
    const sb = stubSupabase([
      { address: '0xAbc', arkham_entity_name: 'Binance', arkham_entity_type: 'cex', arkham_label: 'Cold Wallet 2' },
    ])
    const map = await fetchEntityLabels(sb as any, ['0xAbc'])
    expect(map.get('0xAbc')?.label).toBe('Binance — Cold Wallet 2')
    expect(map.get('0xAbc')?.cohort).toBe('cex')
    expect(map.get('0xabc')?.label).toBe('Binance — Cold Wallet 2')
  })

  it('uses just the entity name when label is absent or equal', async () => {
    const sb = stubSupabase([
      { address: '0xDef', arkham_entity_name: 'Kraken', arkham_entity_type: 'cex', arkham_label: 'Kraken' },
    ])
    const map = await fetchEntityLabels(sb as any, ['0xDef'])
    expect(map.get('0xDef')?.label).toBe('Kraken')
  })

  it('returns an empty map when the flag is OFF', async () => {
    process.env.ORCA_ENTITY_LABELS = 'false'
    expect(entityLabelsEnabled()).toBe(false)
    const sb = stubSupabase([{ address: '0xAbc', arkham_entity_name: 'Binance' }])
    const map = await fetchEntityLabels(sb as any, ['0xAbc'])
    expect(map.size).toBe(0)
  })

  it('never fabricates: an address with no row gets no label', async () => {
    const sb = stubSupabase([])
    const map = await fetchEntityLabels(sb as any, ['0xUnknown'])
    expect(map.size).toBe(0)
  })

  it('applyLabel attaches label/cohort by address, leaves unknowns bare', async () => {
    const sb = stubSupabase([{ address: '0xAbc', arkham_entity_name: 'Coinbase', arkham_entity_type: 'cex' }])
    const map = await fetchEntityLabels(sb as any, ['0xAbc'])
    const labelled = applyLabel({ address: '0xAbc', rank: 1 }, map)
    expect((labelled as any).label).toBe('Coinbase')
    expect((labelled as any).cohort).toBe('cex')
    const bare = applyLabel({ address: '0xNope', rank: 2 }, map)
    expect((bare as any).label).toBeUndefined()
  })
})
