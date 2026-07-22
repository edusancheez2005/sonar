// Shared design tokens for the Whale Intelligence Terminal.
// Mirrors the palette used by the /statistics view (src/views/Statistics.js)
// so every whale-terminal surface looks identical without re-declaring a
// COLORS block per page.
import { FONT_SANS as BASE_SANS, FONT_MONO as BASE_MONO } from '@/src/styles/fontStacks'

// 2026-07-22 readability pass: the terminal surfaces previously set ALL text
// in the mono stack, which read as intimidating for new users (vs Nansen's
// sans-based UI). FONT_MONO keeps its export name so the ~15 consumer files
// don't need touching, but it now resolves to the sans stack. Use FONT_CODE
// for the rare spots that genuinely need fixed-width glyphs (raw addresses
// in copy-to-clipboard contexts, hex dumps).
export const FONT_SANS = BASE_SANS
export const FONT_MONO = BASE_SANS
export const FONT_CODE = BASE_MONO

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
