/**
 * Server-side mirror of the client-side telemetry helper. Kept here so
 * tests + server code can both import the same allowed-event list.
 */
export type InlineTileEvent =
  | 'chip_render'
  | 'chip_open'
  | 'chart_open'
  | 'news_explain'
  | 'chart_fallback'

export const INLINE_TILE_EVENTS: InlineTileEvent[] = [
  'chip_render',
  'chip_open',
  'chart_open',
  'news_explain',
  'chart_fallback',
]

export function isInlineTileEvent(s: string): s is InlineTileEvent {
  return (INLINE_TILE_EVENTS as string[]).includes(s)
}
