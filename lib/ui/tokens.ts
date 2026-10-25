/**
 * Semantic design tokens for the Personal terminal (2026-10-25, Prompt 2).
 * ONE set today — the dark terminal (app/lib/terminalTheme C) — with fixed
 * keys so a second look (graphite, daylight) can be added later without
 * touching components. Components in components/personal and components/ui
 * read colours from here, never as hex literals.
 *
 * Text contrast on `surface`: ink 15:1, body 11:1, muted 6.2:1. C.textMuted
 * (#5a6a7a, 3.4:1) is for hairlines and inactive marks only, never text.
 */
import { FONT_SANS, FONT_MONO } from '@/src/styles/fontStacks'

export const T = {
  bg: '#0a0e17',
  surface: 'rgba(13, 17, 28, 0.88)',
  surface2: 'rgba(255, 255, 255, 0.03)',
  ink: '#e8edf2',
  body: '#c4cfdb',
  muted: '#8896a6',
  faint: '#5a6a7a',
  accent: '#00e5ff',
  accentSoft: 'rgba(0, 229, 255, 0.08)',
  accentBorder: 'rgba(0, 229, 255, 0.22)',
  live: '#00e676',
  // Marks (bars, dots) vs text: the mark green/red are brighter than the
  // text green/red so small text stays legible.
  posMark: '#00e676',
  negMark: '#ff1744',
  neuMark: '#5a6a7a',
  posText: '#2ED88B',
  negText: '#FF5C4D',
  neuText: '#8896a6',
  posBg: 'rgba(0, 230, 118, 0.08)',
  negBg: 'rgba(255, 23, 68, 0.08)',
  warn: '#ffab00',
  warnBg: 'rgba(255, 171, 0, 0.08)',
  hairline: 'rgba(0, 229, 255, 0.08)',
  hairlineStrong: 'rgba(255, 255, 255, 0.08)',
  radius: { sm: '4px', md: '8px', pill: '999px' },
  font: { sans: FONT_SANS, mono: FONT_MONO },
} as const

export type Tokens = typeof T
export default T
