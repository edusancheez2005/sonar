import { describe, it, expect } from 'vitest'
import { renderOverviewPrompt } from '@/lib/orca/renderers/overview'
import { renderPersonalPrompt } from '@/lib/orca/renderers/personal'
import { renderWalletLookupPrompt } from '@/lib/orca/renderers/wallet_lookup'
import { INLINE_CHART_DIRECTIVE } from '@/lib/orca/renderers/inline-chart-directive'

const baseArgs = { toolResults: [], profile: null, message: 'test' }

describe('inline chart directive injection', () => {
  it('overview includes the directive', () => {
    expect(renderOverviewPrompt(baseArgs)).toContain(INLINE_CHART_DIRECTIVE)
  })
  it('personal includes the directive', () => {
    expect(renderPersonalPrompt(baseArgs)).toContain(INLINE_CHART_DIRECTIVE)
  })
  it('wallet_lookup includes the directive', () => {
    expect(renderWalletLookupPrompt(baseArgs)).toContain(INLINE_CHART_DIRECTIVE)
  })
})
