import { describe, it, expect } from 'vitest'
import {
  STANDARD_DISCLAIMER,
  applyGuardrails,
  ensureSingleDisclaimer,
} from '@/lib/orca/orchestrator/guardrails'
import { MANDATORY_DISCLAIMER } from '@/lib/orca/shared-rules'

describe('ensureSingleDisclaimer', () => {
  it('appends the disclaimer when absent', () => {
    const out = ensureSingleDisclaimer('BTC is at $60k.')
    expect(out.endsWith(STANDARD_DISCLAIMER)).toBe(true)
  })

  it('does not double up when already present', () => {
    const text = `BTC is at $60k.\n\n${STANDARD_DISCLAIMER}`
    const out = ensureSingleDisclaimer(text)
    const occurrences = out.split(STANDARD_DISCLAIMER).length - 1
    expect(occurrences).toBe(1)
  })

  it('dedupes when the model output the disclaimer twice', () => {
    const text = `BTC is at $60k.\n\n${STANDARD_DISCLAIMER}\n\n${STANDARD_DISCLAIMER}`
    const out = ensureSingleDisclaimer(text)
    expect(out.split(STANDARD_DISCLAIMER).length - 1).toBe(1)
  })

  it('collapses a long mandatory disclaimer + a trailing short one into a single long disclaimer', () => {
    const text = `Wallet activity summary.\n\n${MANDATORY_DISCLAIMER}\n\n${STANDARD_DISCLAIMER}`
    const out = ensureSingleDisclaimer(text)
    // Exactly one long disclaimer, and no leftover short one.
    expect(out.split('This output is an automated summary').length - 1).toBe(1)
    expect(out.includes(STANDARD_DISCLAIMER)).toBe(false)
    expect(out.endsWith(MANDATORY_DISCLAIMER)).toBe(true)
  })
})

describe('applyGuardrails', () => {
  it('passes through a clean assertion and adds the disclaimer', () => {
    const out = applyGuardrails('Whales bought 12k ETH today.')
    expect(out.declined).toBe(false)
    expect(out.violations).toEqual([])
    expect(out.text).toContain(STANDARD_DISCLAIMER)
  })

  it('declines on first-person recommendation', () => {
    const out = applyGuardrails('You should buy BTC now.')
    expect(out.declined).toBe(true)
    expect(out.violations).toContain('forbidden_verb')
  })

  it('declines on a price prediction claim', () => {
    const out = applyGuardrails('BTC will hit 100k by Friday.')
    expect(out.declined).toBe(true)
  })

  it('does not flag a news headline that merely contains "buy"', () => {
    const out = applyGuardrails(
      'Whales bought 12k ETH today, according to public data.'
    )
    expect(out.declined).toBe(false)
  })

  it('declines on empty output', () => {
    const out = applyGuardrails('')
    expect(out.declined).toBe(true)
    expect(out.violations).toContain('empty_draft')
  })
})
