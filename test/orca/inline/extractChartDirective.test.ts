import { describe, it, expect } from 'vitest'
import { extractChartDirective, stripChartDirectives } from '@/components/orca/inline/parsers/extractChartDirective'

describe('extractChartDirective', () => {
  it('parses well-formed comment', () => {
    expect(extractChartDirective('hi <!-- orca:chart ticker=BTC tf=7d kind=price --> rest'))
      .toEqual({ ticker: 'BTC', tf: '7d', kind: 'price' })
  })
  it('rejects unknown tf', () => {
    expect(extractChartDirective('<!-- orca:chart ticker=BTC tf=14d kind=price -->')).toBeNull()
  })
  it('rejects unknown kind', () => {
    expect(extractChartDirective('<!-- orca:chart ticker=BTC tf=7d kind=lol -->')).toBeNull()
  })
  it('takes first when two are present', () => {
    const r = extractChartDirective('<!-- orca:chart ticker=ETH tf=24h kind=whale --><!-- orca:chart ticker=BTC tf=7d kind=price -->')
    expect(r?.ticker).toBe('ETH')
  })
  it('strips all directives', () => {
    const out = stripChartDirectives('a <!-- orca:chart ticker=BTC tf=7d kind=price --> b')
    expect(out).toBe('a  b')
  })
})
