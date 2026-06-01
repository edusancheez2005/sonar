'use client'
import { createContext } from 'react'

// Carries per-paragraph parsing context + the surface-level callbacks
// (e.g. onOpenChart) down to child <code>/<a> overrides.
export const InlineDataCtx = createContext({
  paragraph: '',
  section: '',
  onOpenChart: null,
})
