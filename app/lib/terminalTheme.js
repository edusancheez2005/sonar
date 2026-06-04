// Shared terminal design tokens for the Whale Intelligence Terminal.
// Mirrors the palette/fonts used by the /statistics view
// (src/views/Statistics.js) so every whale-terminal surface looks
// identical without re-declaring a COLORS block per page.
import { FONT_MONO, FONT_SANS } from '@/src/styles/fontStacks'

export { FONT_MONO, FONT_SANS }

export const TERMINAL_COLORS = {
  cyan: '#00e5ff',
  green: '#00e676',
  red: '#ff1744',
  amber: '#ffab00',
  textPrimary: '#e0e6ed',
  textMuted: '#5a6a7a',
  pageBg: '#0a0e17',
  panelBg: 'rgba(13, 17, 28, 0.8)',
  inputBg: 'rgba(10, 14, 23, 0.9)',
  borderSubtle: 'rgba(0, 229, 255, 0.08)',
}

// Convenience alias used by the styled primitives.
export const C = TERMINAL_COLORS
