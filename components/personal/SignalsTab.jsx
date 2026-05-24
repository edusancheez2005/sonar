'use client'
/**
 * SignalsTab \u2014 W4 §3.2.
 * =============================================================================
 * Thin wrapper around FilteredSignalsPanel so the personal dashboard can
 * mount it inside the tab pane without an extra card chrome. We keep the
 * existing data path (no signal-research-results reads, per §4.F).
 */
import styled from 'styled-components'
import FilteredSignalsPanel from './FilteredSignalsPanel'

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

export default function SignalsTab() {
  return (
    <Wrap data-testid="signals-tab" aria-labelledby="signals-tab-title">
      <FilteredSignalsPanel />
    </Wrap>
  )
}
