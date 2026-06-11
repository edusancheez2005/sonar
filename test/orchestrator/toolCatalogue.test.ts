import { describe, it, expect } from 'vitest'
import {
  TOOL_CATALOGUE,
  TOOL_CATALOGUE_NAMES,
  CATALOGUE_PER_TICKER_TOOLS,
  catalogueForPrompt,
} from '@/lib/orca/orchestrator/toolCatalogue'
import { READ_ONLY_TOOLS } from '@/lib/orca/orchestrator/tools/registry'

const WRITE_TOOLS = ['addToWatchlist', 'removeFromWatchlist', 'setUserAlert']

describe('toolCatalogue', () => {
  it('every catalogue entry is a READ-ONLY tool', () => {
    for (const spec of TOOL_CATALOGUE) {
      expect(READ_ONLY_TOOLS.has(spec.name)).toBe(true)
    }
  })

  it('contains NO write tool (writes are physically unrepresentable in a plan)', () => {
    const names = TOOL_CATALOGUE.map((t) => t.name)
    for (const w of WRITE_TOOLS) {
      expect(names).not.toContain(w)
    }
  })

  it('has no duplicate tool names', () => {
    const names = TOOL_CATALOGUE.map((t) => t.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('TOOL_CATALOGUE_NAMES matches the catalogue', () => {
    expect(TOOL_CATALOGUE_NAMES.size).toBe(TOOL_CATALOGUE.length)
    for (const spec of TOOL_CATALOGUE) expect(TOOL_CATALOGUE_NAMES.has(spec.name)).toBe(true)
  })

  it('per-ticker tools are all in the catalogue', () => {
    for (const t of CATALOGUE_PER_TICKER_TOOLS) {
      expect(TOOL_CATALOGUE_NAMES.has(t)).toBe(true)
    }
  })

  it('catalogueForPrompt renders every tool name', () => {
    const prompt = catalogueForPrompt()
    for (const spec of TOOL_CATALOGUE) {
      expect(prompt).toContain(spec.name)
    }
    // market-wide + cost hints are present
    expect(prompt).toMatch(/market-wide/)
    expect(prompt).toMatch(/per-ticker/)
  })
})
