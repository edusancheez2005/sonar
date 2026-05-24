/**
 * lib/ui/tokens.ts
 * =============================================================================
 * Single source of truth for the v4 ORCA visual language. Every new component
 * MUST import from here rather than inlining hex codes.
 *
 * See ORCA_UNIFIED_COPILOT_PROMPT_V4.md §2.1.
 */

export const tokens = {
  surface: {
    base: '#070a12',
    panel: 'rgba(13, 20, 33, 0.72)',
    panelHigh: 'rgba(18, 27, 43, 0.92)',
    border: 'rgba(255, 255, 255, 0.06)',
    borderActive: 'rgba(0, 229, 255, 0.45)',
  },
  accent: '#00e5ff',
  accentDim: 'rgba(0, 229, 255, 0.12)',
  ok: '#4ade80',
  warn: '#fbbf24',
  err: '#ff7a7a',
  text: '#e0e6ed',
  textMuted: '#8896a6',
  textLabel: '#6b7a8c',
  radius: { sm: 8, md: 12, lg: 16, pill: 999 } as const,
  pad:    { xs: 6, sm: 10, md: 14, lg: 20, xl: 28 } as const,
  ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
  dur:  { fast: 140, base: 220, slow: 360 } as const,
} as const

export type Tokens = typeof tokens
