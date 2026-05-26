'use client'
/**
 * PulseStrip \u2014 W4 §3.2 of ORCA_AGENTIC_REDESIGN_PROMPT.md
 * =============================================================================
 * Four compact tiles across the top of /dashboard/personal:
 *   1. Movers      \u2014 top tickers by abs(24h %) on the user's watchlist.
 *   2. Whales      \u2014 user tickers with non-flat whale net flow direction.
 *   3. News        \u2014 user tickers with a latest headline.
 *   4. Macro pin   \u2014 today's macro reminder (static, locked text).
 *
 * Data source: /api/personal/watchlist (already bearer-protected). We
 * refetch every 6 s so the strip feels live without hammering the API.
 *
 * Empty states: each tile owns its own. We never render a placeholder
 * row \u2014 if the source has nothing for that tile, the tile says so in
 * one sentence with the right CTA (which is always "ask ORCA" \u2014 we
 * never tell the user to buy or sell).
 */
import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const REFRESH_MS = 6000
const MOVERS_MAX = 3
const WHALES_MAX = 3
const NEWS_MAX = 2

const MONO = "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', ui-monospace, Menlo, Consolas, monospace"

const Strip = styled.section`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 18px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const Tile = styled.article`
  position: relative;
  background: linear-gradient(180deg, rgba(13,20,33,0.78) 0%, rgba(8,14,24,0.78) 100%);
  border: 1px solid rgba(0,229,255,0.10);
  border-radius: 4px;
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 118px;
  transition: border-color 140ms ease, transform 140ms ease;
  &:hover {
    border-color: rgba(0,229,255,0.35);
    transform: translateY(-1px);
  }
  &::before {
    content: '';
    position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
    background: linear-gradient(180deg, #00e5ff 0%, transparent 100%);
    opacity: 0.55;
  }
`

const TileLabel = styled.span`
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(0,229,255,0.75);
  font-family: ${MONO};
  font-weight: 600;
  &::before { content: '▸ '; opacity: 0.6; }
`

const TileBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #e0e6ed;
`

const MoverLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-variant-numeric: tabular-nums;
`

const Tkr = styled.span`
  font-weight: 700;
  color: #e0e6ed;
  font-family: ${MONO};
  letter-spacing: 0.04em;
`

const Pct = styled.span`
  color: ${(p) => (p.$v > 0 ? '#4ade80' : p.$v < 0 ? '#ff7a7a' : '#8896a6')};
  font-weight: 700;
  font-size: 12px;
  font-family: ${MONO};
  font-variant-numeric: tabular-nums;
`

const Pip = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) =>
    p.$d === 'up' ? '#4ade80'
    : p.$d === 'down' ? '#ff7a7a'
    : '#6b7a8c'};
`

const Headline = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: #8896a6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const Empty = styled.p`
  margin: 0;
  font-size: 12px;
  color: #8896a6;
  line-height: 1.45;
`

const MacroPin = styled.div`
  font-size: 12px;
  color: #cfd6df;
  line-height: 1.55;
  font-family: ${MONO};
  &::before { content: '$ '; color: rgba(0,229,255,0.55); font-weight: 700; }
`

function fmtPct(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '\u2014'
  const s = n >= 0 ? '+' : ''
  return `${s}${n.toFixed(2)}%`
}

export default function PulseStrip({ client, fetchImpl, macroText }) {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading')
  const [macroLive, setMacroLive] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const sb = client ?? supabaseBrowser()
    const doFetch = fetchImpl ?? fetch

    async function load() {
      try {
        const { data } = await sb.auth.getSession()
        const token = data?.session?.access_token
        if (!token) {
          if (!cancelled) setStatus('unauth')
          return
        }
        const res = await doFetch('/api/personal/watchlist', {
          headers: { authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          if (!cancelled) setStatus('error')
          return
        }
        const body = await res.json()
        if (cancelled) return
        const list = Array.isArray(body?.items) ? body.items : []
        setItems(list)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    load()
    timerRef.current = setInterval(load, REFRESH_MS)

    // Macro pin: pull live factors from /api/social/macro (Grok web-search
    // backed, 12h-cached). Gated on an authed session so unauth users do not
    // trigger network. Shows the first factor's title + summary.
    ;(async () => {
      try {
        const { data } = await sb.auth.getSession()
        if (!data?.session?.access_token) return
        const r = await doFetch('/api/social/macro')
        if (!r.ok) return
        const j = await r.json()
        const top = Array.isArray(j?.factors) ? j.factors[0] : null
        if (!top || cancelled) return
        const title = typeof top.title === 'string' ? top.title.trim() : ''
        const summary = typeof top.summary === 'string' ? top.summary.trim() : ''
        const text = title && summary ? `${title} \u2014 ${summary}` : (summary || title)
        if (text) setMacroLive(text)
      } catch { /* swallow */ }
    })()

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [client, fetchImpl])

  const movers = [...items]
    .filter((it) => Number.isFinite(it?.change_24h))
    .sort((a, b) => Math.abs(b.change_24h) - Math.abs(a.change_24h))
    .slice(0, MOVERS_MAX)

  const whales = items
    .filter((it) => it?.net_flow_direction && it.net_flow_direction !== 'flat')
    .slice(0, WHALES_MAX)

  const newsItems = items.filter((it) => it?.latest_headline).slice(0, NEWS_MAX)

  return (
    <Strip data-testid="pulse-strip" aria-label="Personal pulse">
      <Tile data-testid="pulse-tile-movers">
        <TileLabel>Watchlist movers</TileLabel>
        <TileBody>
          {status === 'loading' && <Empty>Loading.</Empty>}
          {status === 'unauth' && <Empty>Sign in to see your movers.</Empty>}
          {status === 'error' && <Empty>Could not load. Retry shortly.</Empty>}
          {status === 'ready' && movers.length === 0 && (
            <Empty>No movers on your list right now.</Empty>
          )}
          {status === 'ready' && movers.map((m) => (
            <MoverLine key={m.ticker}>
              <Tkr>{m.ticker}</Tkr>
              <Pct $v={m.change_24h}>{fmtPct(m.change_24h)}</Pct>
            </MoverLine>
          ))}
        </TileBody>
      </Tile>

      <Tile data-testid="pulse-tile-whales">
        <TileLabel>Whale flow on your tickers</TileLabel>
        <TileBody>
          {status === 'loading' && <Empty>Loading.</Empty>}
          {status === 'ready' && whales.length === 0 && (
            <Empty>No notable whale flow yet today.</Empty>
          )}
          {status === 'ready' && whales.map((w) => (
            <MoverLine key={w.ticker}>
              <Tkr>{w.ticker}</Tkr>
              <span><Pip $d={w.net_flow_direction} /> {w.net_flow_direction}</span>
            </MoverLine>
          ))}
        </TileBody>
      </Tile>

      <Tile data-testid="pulse-tile-news">
        <TileLabel>Articles ORCA flagged</TileLabel>
        <TileBody>
          {status === 'loading' && <Empty>Loading.</Empty>}
          {status === 'ready' && newsItems.length === 0 && (
            <Empty>Nothing newsworthy on your tickers.</Empty>
          )}
          {status === 'ready' && newsItems.map((n) => (
            <div key={n.ticker}>
              <Tkr>{n.ticker}</Tkr>
              <Headline>{n.latest_headline}</Headline>
            </div>
          ))}
        </TileBody>
      </Tile>

      <Tile data-testid="pulse-tile-macro">
        <TileLabel>Macro pin</TileLabel>
        <TileBody>
          <MacroPin>
            {macroText || macroLive ||
              'Macro backdrop unchanged \u2014 ask ORCA "what changed in macro today" for the latest read.'}
          </MacroPin>
        </TileBody>
      </Tile>
    </Strip>
  )
}
