/**
 * Global test setup, loaded by every Vitest run.
 *
 * - Wires @testing-library/jest-dom matchers into Vitest's expect.
 * - Cleans up React Testing Library mounts between tests.
 * - Stubs browser APIs that jsdom does not implement but most of the
 *   Sonar UI assumes exist: matchMedia, IntersectionObserver,
 *   ResizeObserver. Keeps stubs no-op; tests that need real behaviour
 *   should override per-test with vi.spyOn or by providing a fresh
 *   implementation.
 */

import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// matchMedia ------------------------------------------------------------
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// IntersectionObserver --------------------------------------------------
if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  class IntersectionObserverStub {
    readonly root: Element | null = null
    readonly rootMargin: string = ''
    readonly thresholds: ReadonlyArray<number> = []
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    takeRecords = vi.fn(() => [])
  }
  ;(window as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    IntersectionObserverStub
  ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    IntersectionObserverStub
}

// ResizeObserver --------------------------------------------------------
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  class ResizeObserverStub {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }
  ;(window as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverStub
  ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverStub
}

// scrollTo --------------------------------------------------------------
// jsdom logs "Not implemented" warnings on window.scrollTo. Silence them
// by providing a no-op so component tests that animate scroll don't spam
// the test log.
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
}
