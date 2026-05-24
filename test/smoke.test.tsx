/**
 * Smoke tests for the Vitest bootstrap (ORCA Copilot build, step 1).
 *
 * These exist purely to prove the test runner, jsdom environment,
 * jest-dom matchers, React Testing Library, and the `@/` path alias
 * all work end-to-end. Real feature tests live alongside the code they
 * cover in later steps.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

describe('vitest bootstrap', () => {
  it('runs basic assertions', () => {
    expect(1 + 1).toBe(2)
  })

  it('has the jsdom environment available', () => {
    expect(typeof window).toBe('object')
    expect(typeof document).toBe('object')
  })

  it('exposes jest-dom matchers on expect', () => {
    const el = document.createElement('div')
    el.textContent = 'hello'
    document.body.appendChild(el)
    expect(el).toBeInTheDocument()
    expect(el).toHaveTextContent('hello')
    document.body.removeChild(el)
  })

  it('renders a React component via Testing Library', () => {
    function Hello({ name }: { name: string }) {
      return <span data-testid="greeting">Hello {name}</span>
    }
    render(<Hello name="ORCA" />)
    expect(screen.getByTestId('greeting')).toHaveTextContent('Hello ORCA')
  })

  it('resolves the @/ path alias', async () => {
    // Importing tsconfig.json proves the alias survives through vite's
    // resolver. JSON imports are supported by vite out of the box.
    const tsconfig = await import('@/tsconfig.json')
    expect(tsconfig.default.compilerOptions.baseUrl).toBe('.')
  })

  it('provides stubbed browser APIs (matchMedia, observers)', () => {
    expect(typeof window.matchMedia).toBe('function')
    expect(typeof window.IntersectionObserver).toBe('function')
    expect(typeof window.ResizeObserver).toBe('function')
  })
})
