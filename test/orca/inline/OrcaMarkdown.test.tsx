import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { OrcaMarkdown } from '@/components/orca/inline/OrcaMarkdown'

describe('OrcaMarkdown', () => {
  it('renders inline chart from directive', () => {
    const md = `**Data**\n\nPrice of BTC is \`$76,432\`.\n\n<!-- orca:chart ticker=BTC tf=7d kind=price -->\n\n**News and Market Impact**\n\n[Headline](https://example.com/x)\n`
    const { container, getByTestId, getAllByTestId } = render(<OrcaMarkdown>{md}</OrcaMarkdown>)
    expect(getByTestId('inline-chart')).toBeTruthy()
    expect(getAllByTestId('news-card').length).toBe(1)
    // no raw orca:chart text leaks
    expect(container.textContent || '').not.toContain('orca:chart')
  })

  it('renders no chips on a non-ticker answer', () => {
    const md = 'What is DeFi? It is a category of financial protocols.'
    const { container } = render(<OrcaMarkdown>{md}</OrcaMarkdown>)
    expect(container.querySelectorAll('button').length).toBe(0)
  })
})
