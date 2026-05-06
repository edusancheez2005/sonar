'use client'

/**
 * /frontier — Solana-Native Intelligence
 *
 * Arkham-grade dark layout. Four panels:
 *   1) Hero strip: 4 numeric tiles + sparklines (live, 15s poll)
 *   2) SOL Whale Pulse: live SPL transfer table, entity-attributed
 *   3) Rotating Into Solana: bridge-inflow cards w/ ORCA notes
 *   4) Accuracy proof strip: BUY/SELL accuracy + circuit-breaker state
 *
 * Every fetch sends the admin token (if present in localStorage) as
 * `x-sonar-admin` so the API gate accepts admin-bypass sessions; real
 * authed users pass via the supabase cookie automatically.
 */
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styled, { keyframes } from 'styled-components'
import { FONT_MONO } from '@/src/styles/fontStacks'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

// ─── PALETTE (matches src/views/Dashboard.js) ───────────────────────────────
const COLORS = {
  cyan: '#00e5ff',
  green: '#00e676',
  red: '#ff1744',
  magenta: '#ff2d95',
  amber: '#ffab00',
  textPrimary: '#e0e6ed',
  textMuted: '#5a6a7a',
  panelBg: 'rgba(13, 17, 28, 0.85)',
  borderSubtle: 'rgba(0, 229, 255, 0.10)',
  divider: 'rgba(255, 255, 255, 0.04)',
}

const pulseDot = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 6px ${COLORS.green}; }
  50% { opacity: 0.45; box-shadow: 0 0 12px ${COLORS.green}, 0 0 20px rgba(0,230,118,0.35); }
`

// ─── LAYOUT ─────────────────────────────────────────────────────────────────
const Shell = styled.div`
  min-height: 100vh;
  background: #0a0e17;
  color: ${COLORS.textPrimary};
  position: relative;
  &::before {
    content: '';
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 2px,
      rgba(0,229,255,0.008) 2px, rgba(0,229,255,0.008) 4px
    );
  }
`

const Container = styled.div`
  position: relative; z-index: 1;
  max-width: 1440px; margin: 0 auto;
  padding: 1.5rem 2rem 5rem;
  @media (max-width: 768px) { padding: 1rem 1rem 3rem; }
`

const HeaderBar = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1.75rem; gap: 1rem; flex-wrap: wrap;
`

const Title = styled.h1`
  font-family: ${FONT_MONO};
  font-size: 1.65rem; font-weight: 700; letter-spacing: 1px;
  margin: 0; color: ${COLORS.textPrimary};
  text-transform: uppercase;
  small {
    color: ${COLORS.cyan}; font-size: 0.75rem; margin-left: 0.6rem;
    letter-spacing: 2px; vertical-align: middle;
  }
`

const Subtle = styled.div`
  font-family: ${FONT_MONO}; font-size: 0.7rem; color: ${COLORS.textMuted};
  letter-spacing: 1px; text-transform: uppercase;
  display: flex; align-items: center; gap: 0.5rem;
`

const LiveDot = styled.span`
  width: 8px; height: 8px; border-radius: 50%;
  background: ${COLORS.green}; display: inline-block;
  animation: ${pulseDot} 2s ease-in-out infinite;
`

const BackLink = styled(Link)`
  color: ${COLORS.textMuted}; font-family: ${FONT_MONO}; font-size: 0.7rem;
  letter-spacing: 1px; text-decoration: none; text-transform: uppercase;
  &:hover { color: ${COLORS.cyan}; }
`

// ─── PANEL ──────────────────────────────────────────────────────────────────
const Panel = styled.section`
  background: ${COLORS.panelBg};
  border: 1px solid ${COLORS.borderSubtle};
  border-radius: 6px;
  margin-bottom: 1.5rem;
  overflow: hidden;
`

const PanelHead = styled.div`
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid ${COLORS.divider};
  display: flex; align-items: center; justify-content: space-between;
  font-family: ${FONT_MONO}; font-size: 0.72rem; letter-spacing: 1.5px;
  color: ${COLORS.textMuted}; text-transform: uppercase;
`

const PanelBody = styled.div`
  padding: 1rem 1.1rem;
`

// ─── TILES ──────────────────────────────────────────────────────────────────
const TileGrid = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;
  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 540px)  { grid-template-columns: 1fr; }
`

const Tile = styled.div`
  background: ${COLORS.panelBg};
  border: 1px solid ${COLORS.borderSubtle};
  border-radius: 6px;
  padding: 1rem 1.1rem;
  display: flex; flex-direction: column; gap: 0.5rem;
`

const TileLabel = styled.div`
  font-family: ${FONT_MONO}; font-size: 0.65rem; letter-spacing: 1.5px;
  color: ${COLORS.textMuted}; text-transform: uppercase;
`

const TileValue = styled.div`
  font-family: ${FONT_MONO}; font-size: 1.7rem; font-weight: 700;
  color: ${(p) => p.$color || COLORS.textPrimary};
  line-height: 1.05;
  text-shadow: 0 0 18px ${(p) => (p.$color || COLORS.cyan) + '33'};
`

const TileSparkWrap = styled.div`
  height: 26px; margin-top: 0.25rem;
`

// ─── TABLE ──────────────────────────────────────────────────────────────────
const TableWrap = styled.div`
  max-height: 540px; overflow-y: auto;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.15); border-radius: 3px; }
`

const Table = styled.table`
  width: 100%; border-collapse: collapse; font-family: ${FONT_MONO};
  thead th {
    position: sticky; top: 0; background: rgba(13,17,28,0.95);
    text-align: left; font-size: 0.62rem; font-weight: 600;
    color: ${COLORS.textMuted}; padding: 0.6rem 0.9rem;
    letter-spacing: 1.5px; text-transform: uppercase;
    border-bottom: 1px solid ${COLORS.divider};
  }
  tbody td {
    padding: 0.55rem 0.9rem; font-size: 0.78rem;
    border-bottom: 1px solid ${COLORS.divider};
    color: ${COLORS.textPrimary};
  }
  tbody tr:hover td { background: rgba(0,229,255,0.04); }
`

const DirBadge = styled.span`
  display: inline-block; padding: 0.1rem 0.45rem; border-radius: 3px;
  font-size: 0.65rem; font-weight: 700; letter-spacing: 1px;
  background: ${(p) => (p.$dir === 'in' ? 'rgba(0,229,255,0.12)' : 'rgba(255,45,149,0.12)')};
  color: ${(p) => (p.$dir === 'in' ? COLORS.cyan : COLORS.magenta)};
  border: 1px solid ${(p) => (p.$dir === 'in' ? 'rgba(0,229,255,0.3)' : 'rgba(255,45,149,0.3)')};
`

const Chips = styled.div`
  display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.75rem;
`

const Chip = styled.button`
  font-family: ${FONT_MONO}; font-size: 0.65rem; letter-spacing: 1px;
  background: ${(p) => (p.$active ? 'rgba(0,229,255,0.15)' : 'transparent')};
  color: ${(p) => (p.$active ? COLORS.cyan : COLORS.textMuted)};
  border: 1px solid ${(p) => (p.$active ? 'rgba(0,229,255,0.35)' : COLORS.borderSubtle)};
  padding: 0.25rem 0.65rem; border-radius: 3px;
  cursor: pointer; text-transform: uppercase;
  &:hover { color: ${COLORS.cyan}; border-color: rgba(0,229,255,0.3); }
`

// Small inline pill rendered next to an entity name to identify its type
// (cex / dex / fund / …). Visually separated so 'Coinbase' and 'cex'
// don't run together as 'Coinbasecex'.
const EntityChip = styled.span`
  display: inline-block; margin-left: 0.45rem;
  font-family: ${FONT_MONO}; font-size: 0.55rem; font-weight: 700;
  letter-spacing: 1px; text-transform: uppercase;
  padding: 0.05rem 0.35rem; border-radius: 2px;
  background: rgba(0, 229, 255, 0.08);
  color: ${COLORS.cyan};
  border: 1px solid rgba(0, 229, 255, 0.2);
  vertical-align: middle;
`

// ─── TOP MOVERS ─────────────────────────────────────────────────────────────
const MoverGrid = styled.div`
  display: flex; flex-direction: column; gap: 0.65rem;
`
const MoverRow = styled.div`
  display: grid; grid-template-columns: 1.4fr 2fr 1fr; gap: 1rem;
  align-items: center; padding: 0.75rem 0.9rem;
  background: rgba(0, 229, 255, 0.025);
  border: 1px solid ${COLORS.borderSubtle};
  border-radius: 5px;
  @media (max-width: 768px) { grid-template-columns: 1fr; gap: 0.5rem; }
`
const MoverLeft = styled.div`
  display: flex; align-items: center; flex-wrap: wrap;
  font-family: ${FONT_MONO};
`
const MoverName = styled.span`
  font-size: 0.95rem; font-weight: 700; color: ${COLORS.textPrimary};
`
const MoverBars = styled.div`
  display: grid; grid-template-columns: 90px 1fr; gap: 0.4rem 0.6rem;
  align-items: center; font-family: ${FONT_MONO}; font-size: 0.65rem;
`
const MoverBarLabel = styled.span`
  color: ${COLORS.textMuted}; letter-spacing: 0.5px; text-align: right;
`
const MoverBarTrack = styled.div`
  height: 8px; background: rgba(255,255,255,0.04); border-radius: 2px;
  overflow: hidden;
`
const MoverBarFill = styled.div`
  height: 100%; border-radius: 2px;
  transition: width 0.6s ease;
`
const MoverNet = styled.div`
  display: flex; flex-direction: column; gap: 0.1rem; text-align: right;
  font-family: ${FONT_MONO};
  .lbl { font-size: 0.55rem; color: ${COLORS.textMuted}; letter-spacing: 1.5px; text-transform: uppercase; }
  .val { font-size: 1.05rem; font-weight: 700;
         color: ${(p) => (p.$pos ? COLORS.green : COLORS.red)};
         text-shadow: 0 0 12px ${(p) => (p.$pos ? COLORS.green : COLORS.red) + '33'}; }
  .tag { font-size: 0.55rem; letter-spacing: 1.5px; text-transform: uppercase;
         color: ${(p) => (p.$pos ? COLORS.green : COLORS.red)}; opacity: 0.75; }
`

// ─── BRIDGE CARDS ───────────────────────────────────────────────────────────
const CardGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;
  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 640px)  { grid-template-columns: 1fr; }
`

const Card = styled.div`
  background: rgba(0,229,255,0.03);
  border: 1px solid ${COLORS.borderSubtle};
  border-radius: 6px;
  padding: 0.9rem 1rem;
  display: flex; flex-direction: column; gap: 0.45rem;
  font-family: ${FONT_MONO};
`

const CardHead = styled.div`
  font-size: 0.65rem; letter-spacing: 1.5px; color: ${COLORS.cyan};
  text-transform: uppercase;
`
const CardEntity = styled.div`
  font-size: 0.95rem; font-weight: 700; color: ${COLORS.textPrimary};
`
const CardMeta = styled.div`
  font-size: 0.68rem; color: ${COLORS.textMuted}; letter-spacing: 0.5px;
`
const CardAmount = styled.div`
  font-size: 1.25rem; font-weight: 700; color: ${COLORS.green};
  margin: 0.15rem 0 0.25rem;
`
const CardOrca = styled.p`
  font-size: 0.74rem; color: ${COLORS.textPrimary};
  font-family: var(--font-sans, inherit);
  line-height: 1.4; margin: 0; opacity: 0.92;
`
const CardActions = styled.div`
  display: flex; gap: 0.5rem; margin-top: 0.4rem;
  a {
    color: ${COLORS.cyan}; font-size: 0.65rem; letter-spacing: 1px;
    text-transform: uppercase; text-decoration: none;
    border: 1px solid ${COLORS.borderSubtle}; padding: 0.2rem 0.5rem; border-radius: 3px;
    &:hover { background: rgba(0,229,255,0.1); }
  }
`

// ─── ACCURACY STRIP ─────────────────────────────────────────────────────────
const AccuracyStrip = styled.div`
  background: ${COLORS.panelBg};
  border: 1px solid ${COLORS.borderSubtle};
  border-radius: 6px;
  padding: 0.85rem 1.1rem;
  font-family: ${FONT_MONO}; font-size: 0.78rem;
  display: flex; flex-wrap: wrap; gap: 1.5rem;
  align-items: center;
  span.label { color: ${COLORS.textMuted}; letter-spacing: 1px; text-transform: uppercase; font-size: 0.68rem; }
  span.val { color: ${COLORS.textPrimary}; }
  span.good { color: ${COLORS.green}; }
  span.bad  { color: ${COLORS.red}; }
`

const EmptyState = styled.div`
  font-family: ${FONT_MONO}; font-size: 0.78rem;
  color: ${COLORS.textMuted}; padding: 2rem 1rem; text-align: center;
  letter-spacing: 0.5px;
`

// ─── HELPERS ────────────────────────────────────────────────────────────────
const usdFmt0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usdFmt2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
const numFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

function fmtUsd(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  const v = Number(n)
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 10_000) return `$${(v / 1_000).toFixed(1)}k`
  return Math.abs(v) >= 1000 ? usdFmt0.format(v) : usdFmt2.format(v)
}
function fmtAmount(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  const v = Number(n)
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 10_000) return `${(v / 1_000).toFixed(1)}k`
  if (Math.abs(v) >= 1) return v.toFixed(2)
  if (Math.abs(v) >= 0.01) return v.toFixed(3)
  return v.toExponential(1)
}
function fmtNum(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return numFmt.format(Number(n))
}
function relTime(iso) {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'
  const d = Date.now() - t
  if (d < 0) return 'just now'
  const m = Math.floor(d / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
function shortAddr(a) {
  if (!a || a.length < 12) return a || '—'
  return `${a.slice(0, 4)}…${a.slice(-4)}`
}

// Tiny inline SVG sparkline. No deps. `values` is oldest→newest.
function Spark({ values, color = COLORS.cyan, height = 26 }) {
  if (!values || values.length === 0) return <svg width="100%" height={height} />
  const w = 200
  const h = height
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = w / Math.max(1, values.length - 1)
  const pts = values
    .map((v, i) => {
      const x = i * step
      const y = h - ((v - min) / span) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" opacity="0.85" />
    </svg>
  )
}

function authHeaders(jwt) {
  const h = {}
  if (jwt) h['Authorization'] = `Bearer ${jwt}`
  if (typeof window === 'undefined') return h
  try {
    const tok = window.localStorage.getItem('adminLogin')
    if (tok && tok.length > 10) h['x-sonar-admin'] = tok
  } catch {}
  return h
}

function useSupabaseJwt() {
  const [jwt, setJwt] = useState(null)
  useEffect(() => {
    let cancelled = false
    const sb = supabaseBrowser()
    sb.auth.getSession().then(({ data }) => {
      if (!cancelled) setJwt(data?.session?.access_token || null)
    }).catch(() => {})
    const { data: sub } = sb.auth.onAuthStateChange((_evt, session) => {
      if (!cancelled) setJwt(session?.access_token || null)
    })
    return () => { cancelled = true; sub?.subscription?.unsubscribe?.() }
  }, [])
  return jwt
}

function useLivePoll(url, intervalMs, jwt) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let cancelled = false
    let timer
    const tick = async () => {
      try {
        const r = await fetch(url, { headers: authHeaders(jwt), cache: 'no-store', credentials: 'include' })
        if (!r.ok) throw new Error(`${r.status}`)
        const j = await r.json()
        if (!cancelled) {
          setData(j)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e))
      } finally {
        if (!cancelled) timer = setTimeout(tick, intervalMs)
      }
    }
    tick()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, intervalMs, jwt])
  return { data, error }
}

// ─── CHIPS DEFINITIONS ──────────────────────────────────────────────────────
const TYPE_CHIPS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'cex', label: 'CEX', match: (t) => /cex|custodian/i.test(t || '') },
  { key: 'dex', label: 'DEX', match: (t) => /dex/i.test(t || '') },
  { key: 'mm',  label: 'Market Maker', match: (t) => /derivatives|mm|market.?maker/i.test(t || '') },
  { key: 'fund', label: 'Fund', match: (t) => /fund/i.test(t || '') },
]

// ─── MAIN ──────────────────────────────────────────────────────────────────
export default function FrontierClient() {
  const jwt = useSupabaseJwt()
  const { data: pulse } = useLivePoll('/api/frontier/pulse', 15000, jwt)
  const { data: bridges } = useLivePoll('/api/frontier/bridges', 30000, jwt)
  const { data: accuracy } = useLivePoll('/api/frontier/accuracy', 60000, jwt)
  const [filter, setFilter] = useState('all')
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const tiles = pulse?.tiles
  const transfers = pulse?.transfers || []
  const mode = pulse?.status?.mode || 'ingesting'

  const filtered = useMemo(() => {
    const chip = TYPE_CHIPS.find((c) => c.key === filter) || TYPE_CHIPS[0]
    return transfers.filter((t) => chip.match(t.entityType))
  }, [transfers, filter])

  const lastUpd = pulse?.generatedAt ? new Date(pulse.generatedAt) : null

  return (
    <Shell>
      <Container>
        {/* Header */}
        <HeaderBar>
          <div>
            <Title>
              Frontier <small>SOLANA INTELLIGENCE · LIVE</small>
            </Title>
            <Subtle style={{ marginTop: '0.4rem' }}>
              <LiveDot /> {mode === 'live' ? 'Polling Solana mainnet' : 'Solana ingestion warming up'}
              <span style={{ color: COLORS.textMuted }}>
                · last update {lastUpd ? lastUpd.toUTCString().split(' ')[4] : '—'} UTC
              </span>
              <span style={{ color: COLORS.textMuted }}>· auto refresh 15s</span>
              {/* re-render every second to keep relative times moving */}
              <span style={{ display: 'none' }}>{now}</span>
            </Subtle>
          </div>
          <BackLink href="/dashboard">← BACK TO DASHBOARD</BackLink>
        </HeaderBar>

        {/* 1. Hero tiles */}
        <TileGrid>
          <Tile>
            <TileLabel>Tracked SOL Entities</TileLabel>
            <TileValue $color={COLORS.cyan}>{fmtNum(tiles?.trackedEntities)}</TileValue>
            <TileSparkWrap />
          </Tile>
          <Tile>
            <TileLabel>SPL Transfers · 24h</TileLabel>
            <TileValue>{fmtNum(tiles?.transfers24h)}</TileValue>
            <TileSparkWrap><Spark values={tiles?.sparkTransfers || []} color={COLORS.cyan} /></TileSparkWrap>
          </Tile>
          <Tile>
            <TileLabel>Net Entity Flow · 24h</TileLabel>
            <TileValue $color={(tiles?.netFlowUsd24h || 0) >= 0 ? COLORS.green : COLORS.red}>
              {fmtUsd(tiles?.netFlowUsd24h)}
            </TileValue>
            <TileSparkWrap>
              <Spark
                values={tiles?.sparkNetFlow || []}
                color={(tiles?.netFlowUsd24h || 0) >= 0 ? COLORS.green : COLORS.red}
              />
            </TileSparkWrap>
          </Tile>
          <Tile>
            <TileLabel>Bridge Inflows → SOL · 24h</TileLabel>
            <TileValue $color={COLORS.amber}>{fmtNum(tiles?.bridgeIns24h)}</TileValue>
            <TileSparkWrap />
          </Tile>
        </TileGrid>

        {/* 1b. Top Movers (24h) — aggregated entity flow */}
        <Panel>
          <PanelHead>
            <span>📊 Top Movers · 24h · ranked by absolute USD net flow</span>
            <span style={{ color: COLORS.textMuted }}>
              {(pulse?.topMovers || []).length} entities · stable dust filtered
            </span>
          </PanelHead>
          <PanelBody>
            {(pulse?.topMovers || []).length === 0 ? (
              <EmptyState>
                Not enough priced flow yet — most entities are moving small or unpriced tokens this hour.
              </EmptyState>
            ) : (
              <MoverGrid>
                {pulse.topMovers.map((m) => {
                  const isAccum = m.netUsd >= 0
                  return (
                    <MoverRow key={m.entity}>
                      <MoverLeft>
                        <MoverName>{m.entity}</MoverName>
                        {m.entityType && <EntityChip>{m.entityType}</EntityChip>}
                      </MoverLeft>
                      <MoverBars>
                        <MoverBarLabel>IN {fmtUsd(m.inUsd)}</MoverBarLabel>
                        <MoverBarTrack>
                          <MoverBarFill
                            style={{
                              width: `${Math.min(100, (m.inUsd / Math.max(m.inUsd, m.outUsd, 1)) * 100)}%`,
                              background: COLORS.cyan,
                            }}
                          />
                        </MoverBarTrack>
                        <MoverBarLabel>OUT {fmtUsd(m.outUsd)}</MoverBarLabel>
                        <MoverBarTrack>
                          <MoverBarFill
                            style={{
                              width: `${Math.min(100, (m.outUsd / Math.max(m.inUsd, m.outUsd, 1)) * 100)}%`,
                              background: COLORS.magenta,
                            }}
                          />
                        </MoverBarTrack>
                      </MoverBars>
                      <MoverNet $pos={isAccum}>
                        <span className="lbl">NET</span>
                        <span className="val">{isAccum ? '+' : '−'}{fmtUsd(Math.abs(m.netUsd))}</span>
                        <span className="tag">{isAccum ? 'ACCUMULATING' : 'DISTRIBUTING'}</span>
                      </MoverNet>
                    </MoverRow>
                  )
                })}
              </MoverGrid>
            )}
          </PanelBody>
        </Panel>

        {/* 2. SOL Whale Pulse */}
        <Panel>
          <PanelHead>
            <span>SOL Whale Pulse · entity-attributed SPL transfers</span>
            <span style={{ color: COLORS.textMuted }}>
              {filtered.length} rows · {relTime(pulse?.generatedAt)}
            </span>
          </PanelHead>
          <PanelBody>
            <Chips>
              {TYPE_CHIPS.map((c) => (
                <Chip key={c.key} $active={filter === c.key} onClick={() => setFilter(c.key)}>
                  {c.label}
                </Chip>
              ))}
            </Chips>
            {filtered.length === 0 ? (
              <EmptyState>
                {mode === 'ingesting'
                  ? 'Solana ingestion pipeline live — first transfers landing within the hour.'
                  : 'No transfers match this filter.'}
              </EmptyState>
            ) : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Entity</th>
                      <th>Dir</th>
                      <th>Token</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'right' }}>USD</th>
                      <th>Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => (
                      <tr key={t.id}>
                        <td title={t.time}>{relTime(t.time)}</td>
                        <td>
                          <Link
                            href={`/whale/${encodeURIComponent(t.address)}`}
                            style={{ color: COLORS.textPrimary, textDecoration: 'none' }}
                          >
                            {t.entity || shortAddr(t.address)}
                          </Link>
                          {t.entityType && <EntityChip>{t.entityType}</EntityChip>}
                        </td>
                        <td>
                          <DirBadge $dir={t.direction}>
                            {t.direction === 'in' ? 'IN ▲' : 'OUT ▼'}
                          </DirBadge>
                        </td>
                        <td>{t.token || '—'}</td>
                        <td style={{ textAlign: 'right' }}>{fmtAmount(t.amount)}</td>
                        <td style={{ textAlign: 'right', color: t.amountUsd >= 100000 ? COLORS.amber : COLORS.textPrimary, fontWeight: t.amountUsd >= 100000 ? 700 : 400 }}>{fmtUsd(t.amountUsd)}</td>
                        <td>
                          <a
                            href={`https://solscan.io/tx/${t.txHash}`}
                            target="_blank" rel="noreferrer"
                            style={{ color: COLORS.cyan, textDecoration: 'none' }}
                          >
                            {shortAddr(t.txHash)}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </PanelBody>
        </Panel>

        {/* 3. Rotating Into Solana */}
        <Panel>
          <PanelHead>
            <span>🌉 Rotating Into Solana · large external inflows · last 24h</span>
            <span style={{ color: COLORS.textMuted }}>
              {(bridges?.events || []).length} events · ≥${(bridges?.minEventUsd || 5000).toLocaleString()} · refresh 30s
            </span>
          </PanelHead>
          <PanelBody>
            {(bridges?.events || []).length === 0 ? (
              <EmptyState>
                No external inflows above the dust floor in the last 24h. Quiet markets.
              </EmptyState>
            ) : (
              <CardGrid>
                {bridges.events.map((e) => (
                  <Card key={e.id}>
                    <CardHead>via {e.bridge} · {relTime(e.time)}</CardHead>
                    <CardEntity>{e.entity || shortAddr(e.address)}</CardEntity>
                    <CardMeta>{e.entityType || ''}{e.label ? ` · ${e.label}` : ''}</CardMeta>
                    <CardAmount>
                      +{fmtUsd(e.amountUsd)} {e.token ? <span style={{ color: COLORS.textMuted, fontSize: '0.85rem', fontWeight: 500 }}>{e.token}</span> : null}
                    </CardAmount>
                    <CardOrca>ORCA · {e.orca}</CardOrca>
                    <CardActions>
                      <a href={`https://solscan.io/tx/${e.txHash}`} target="_blank" rel="noreferrer">View tx</a>
                      <Link href={`/whale/${encodeURIComponent(e.address)}`}>Watch entity</Link>
                    </CardActions>
                  </Card>
                ))}
              </CardGrid>
            )}
          </PanelBody>
        </Panel>

        {/* 4. Accuracy proof strip */}
        <AccuracyStrip>
          <span className="label">Sonar Engine Accuracy · 24h</span>
          <span>
            BUY{' '}
            <span className={accuracy?.buy?.pct != null ? (accuracy.buy.pct >= 50 ? 'good' : 'bad') : 'val'}>
              {accuracy?.buy?.pct != null ? `${accuracy.buy.pct.toFixed(1)}%` : '—'}
            </span>{' '}
            <span style={{ color: COLORS.textMuted }}>(n={accuracy?.buy?.n ?? 0})</span>
          </span>
          <span>
            SELL{' '}
            <span className={accuracy?.sell?.pct != null ? (accuracy.sell.pct >= 50 ? 'good' : 'bad') : 'val'}>
              {accuracy?.sell?.pct != null ? `${accuracy.sell.pct.toFixed(1)}%` : '—'}
            </span>{' '}
            <span style={{ color: COLORS.textMuted }}>(n={accuracy?.sell?.n ?? 0})</span>
          </span>
          <span className="label">Circuit Breaker</span>
          <span className={accuracy?.breakerState === 'all_active' ? 'good' : accuracy?.breakerState === 'tripped' ? 'bad' : 'val'}>
            {accuracy?.breakerState === 'all_active'
              ? 'ALL ACTIVE'
              : accuracy?.breakerState === 'tripped'
              ? 'TRIPPED'
              : 'UNKNOWN'}
          </span>
          <span className="label">Watchdog</span>
          <span className="val">{relTime(accuracy?.watchdogLastTick)}</span>
        </AccuracyStrip>
      </Container>
    </Shell>
  )
}
