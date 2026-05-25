import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import SonarPulse from '@/components/orca/SonarPulse'

describe('SonarPulse', () => {
  it('renders with role status and a polite aria-live region', () => {
    render(<SonarPulse />)
    const el = screen.getByTestId('sonar-pulse')
    expect(el).toBeInTheDocument()
    expect(el.getAttribute('role')).toBe('status')
    expect(el.getAttribute('aria-live')).toBe('polite')
  })

  it('uses the provided label as the accessible name', () => {
    render(<SonarPulse label="Fetching whales" />)
    expect(screen.getByLabelText('Fetching whales')).toBeInTheDocument()
  })

  it('contains no emojis', () => {
    render(<SonarPulse />)
    const text = screen.getByTestId('sonar-pulse').textContent || ''
    expect(/\p{Extended_Pictographic}/u.test(text)).toBe(false)
  })
})
