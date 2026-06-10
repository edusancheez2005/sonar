'use client'
// Polymarket Whale Radar — section 3 of the Whale Intelligence Terminal.
// Two live panels (Top Markets by whale flow, Whale Leaderboard by size)
// plus a slide-in drill-down drawer. All data comes from server routes
// under /api/polymarket so the Supabase service role never ships to the
// client. Column access is defensive because the upstream Polymarket
// tables aren't owned by this repo.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import styled from 'styled-components'
import WhaleTerminalShell from '@/app/components/whale-terminal/WhaleTerminalShell'
import {
  Panel,
  PanelTitle,
  DataTable,
  GhostButton,
  Notice,
  ErrorNotice,
} from '@/app/components/whale-terminal/primitives'
import { C, FONT_MONO } from '@/app/lib/terminalTheme'
import { ProbLine } from '@/app/components/whale-terminal/charts'
import { shortenAddress, formatUsd } from '@/lib/wallet-tracker'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import SonarLoader from '@/components/wallet-tracker/SonarLoader'
import { WhaleWalletCell } from '@/app/components/whale-terminal/WalletAddrActions'

const POLL_MS = 30000
const PAGE_SIZE = 24 // divisible by 2/3/4 grid columns

// Public Polymarket market URL from a market slug.
export function polymarketUrl(slug) {
  if (!slug || typeof slug !== 'string') return null
  return `https://polymarket.com/event/${slug.trim()}`
}

// ── defensive field access ───────────────────────────────────────────
function pick(obj, keys, fallback = undefined) {
  if (!obj) return fallback
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]
  }
  return fallback
}

function marketQuestion(m) {
  return pick(m, ['question', 'title', 'market_question', 'name', 'slug'], 'Untitled market')
}
function marketConditionId(m) {
  return pick(m, ['condition_id', 'conditionId', 'id', 'market_id'])
}
function marketSlug(m) {
  return pick(m, ['slug', 'market_slug', 'event_slug'])
}
function marketVolume24h(m) {
  return Number(pick(m, ['volume_24h', 'volume_24hr', 'volume24hr', 'volume_24', 'volume24h', 'volume'], 0))
}
function marketWhaleFlow(m) {
  return Number(pick(m, ['whale_flow', 'whaleFlow', 'whale_flow_usd', 'net_whale_flow'], 0))
}
function marketWhaleCount(m) {
  return Number(pick(m, ['num_whales', 'whale_count', 'whales', 'n_whales', 'holders_count'], 0))
}
function marketLiquidity(m) {
  return Number(pick(m, ['liquidity', 'liquidity_usd', 'liquidityNum'], 0))
}

// Real category lives on the row now (cron-populated). Null/blank rows
// fall back to "Uncategorized" for display only.
function marketCategory(m) {
  const c = pick(m, ['category'])
  return c && typeof c === 'string' ? c : null
}
function marketCategoryLabel(m) {
  return marketCategory(m) || 'Uncategorized'
}
function marketCompetitive(m) {
  const v = Number(pick(m, ['competitive']))
  return Number.isFinite(v) ? v : null
}
function marketTags(m) {
  const t = parseArrayish(pick(m, ['tags']))
  return Array.isArray(t) ? t.map((x) => String(x).trim()).filter(Boolean) : []
}
function marketEndDate(m) {
  return pick(m, ['end_date', 'endDate', 'end', 'resolution_date'])
}
function fmtEndDate(s) {
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  const ds = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return d.getTime() < Date.now() ? `Ended ${ds}` : `Ends ${ds}`
}

// "Contested" = a genuinely two-sided market, not longshot spam (e.g. each
// "Will X win the World Cup?" priced at 2%). True when the cron's
// competitive score is high OR the leading outcome sits in 0.1–0.9.
function marketIsContested(m) {
  const comp = marketCompetitive(m)
  if (comp != null && comp >= 0.5) return true
  const prices = parseArrayish(pick(m, ['outcome_prices', 'outcomePrices', 'prices']))
  if (Array.isArray(prices) && prices.length) {
    const nums = prices.map(Number).filter(Number.isFinite)
    if (nums.length) {
      const mx = Math.max(...nums)
      if (mx >= 0.1 && mx <= 0.9) return true
    }
  }
  return false
}

// Server-side sort keys (must match SORT_COLUMNS in the markets route).
const SORT_OPTIONS = [
  { id: 'volume', label: '24h Volume' },
  { id: 'whale_flow', label: 'Whale Flow' },
  { id: 'competitive', label: 'Competitive' },
]

function parseArrayish(v) {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    try {
      const j = JSON.parse(v)
      return Array.isArray(j) ? j : null
    } catch {
      return v.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''))
    }
  }
  return null
}

function toPct(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return null
  return Math.max(0, Math.min(100, x <= 1 ? x * 100 : x))
}

// Resolve a market's odds using its outcome labels + prices. Returns
// either a binary { binary:true, a, b } (label/pct pairs, "a" is the
// leading/Yes side) or a multi { binary:false, leader } for markets
// with >2 outcomes. null when prices are unknowable.
function marketOddsView(m) {
  const labels = parseArrayish(pick(m, ['outcomes', 'outcome_labels'])) || []
  const prices = parseArrayish(pick(m, ['outcome_prices', 'outcomePrices', 'prices']))

  if (Array.isArray(prices) && prices.length >= 2) {
    const pairs = prices
      .map((p, i) => ({ label: labels[i] != null ? String(labels[i]) : `#${i + 1}`, pct: toPct(p) }))
      .filter((x) => x.pct != null)
    if (pairs.length === 0) return null
    if (pairs.length === 2) {
      return { binary: true, a: pairs[0], b: pairs[1] }
    }
    const sorted = [...pairs].sort((a, b) => b.pct - a.pct)
    return { binary: false, leader: sorted[0], pairs: sorted }
  }

  const yesCol = pick(m, ['yes_price', 'price_yes', 'yes'])
  const yesPct = toPct(yesCol)
  if (yesPct != null) {
    return {
      binary: true,
      a: { label: labels[0] || 'Yes', pct: yesPct },
      b: { label: labels[1] || 'No', pct: 100 - yesPct },
    }
  }
  return null
}

function fmtPct(p) {
  if (!Number.isFinite(p)) return '—'
  if (p > 0 && p < 1) return `${p.toFixed(2)}%`
  if (p < 10 || p > 90) return `${p.toFixed(1)}%`
  return `${Math.round(p)}%`
}

// A name is "address-like" when it's just the wallet (often with a
// Polymarket position suffix, e.g. 0xabc…-1779037126382). Those should be
// truncated like every other address on the site, not shown raw.
function looksLikeAddress(s) {
  return typeof s === 'string' && /^0x[a-fA-F0-9]{40}/.test(s.trim())
}
function whaleName(w) {
  const name = pick(w, ['arkham_entity', 'name', 'username', 'display_name', 'pseudonym'])
  const wallet = pick(w, ['proxy_wallet', 'proxyWallet', 'wallet', 'address'])
  if (name && !looksLikeAddress(name)) return name
  const addr = wallet || (looksLikeAddress(name) ? name : null)
  return addr ? shortenAddress(addr, 5) : 'Unknown whale'
}
function whaleWallet(w) {
  return pick(w, ['proxy_wallet', 'proxyWallet', 'wallet', 'address'])
}
function whaleDisplayName(w) {
  const name = pick(w, ['arkham_entity', 'name', 'username', 'display_name', 'pseudonym'])
  if (name && !looksLikeAddress(name)) return name
  return null
}
function whaleTotal(w) {
  return Number(pick(w, ['total_amount', 'totalAmount', 'total', 'total_size', 'size'], 0))
}
function whaleMarkets(w) {
  return Number(pick(w, ['markets_count', 'num_markets', 'market_count', 'markets', 'n_markets'], 0))
}

// Arkham-resolved name takes priority over the Polymarket pseudonym.
function holderRealName(h) {
  const name = pick(h, ['arkham_entity', 'name'])
  return name && !looksLikeAddress(name) ? name : null
}

function holderAmount(h) {
  return Number(pick(h, ['amount', 'size', 'usd', 'value'], 0))
}
function holderConditionId(h) {
  return pick(h, ['condition_id', 'conditionId', 'market_id'])
}
function holderSlug(h) {
  return pick(h, ['market_slug', 'slug', 'event_slug'])
}
function holderQuestion(h) {
  return pick(h, ['question', 'market_question', 'title'])
}
// outcome_index 0 -> first outcome (typically "Yes"), 1 -> "No".
function holderSide(h) {
  const idx = pick(h, ['outcome_index', 'outcomeIndex'])
  if (idx === 0 || idx === '0') return 'YES'
  if (idx === 1 || idx === '1') return 'NO'
  const out = pick(h, ['outcome'])
  return out ? String(out).toUpperCase() : null
}

// One-day price change of the leading outcome, when the cron captured it.
function marketDayChange(m) {
  const v = Number(pick(m, ['one_day_price_change', 'oneDayPriceChange']))
  return Number.isFinite(v) ? v : null
}

// Short uppercase category code for the card corner chip (FED/BTC-style).
const CAT_CODES = {
  politics: 'POL',
  crypto: 'CRY',
  sports: 'SPT',
  finance: 'FIN',
  geopolitics: 'GEO',
  tech: 'TEC',
  economy: 'ECO',
  business: 'BIZ',
  weather: 'WX',
  commodities: 'CMD',
}
function marketCatCode(m) {
  const c = marketCategory(m)
  if (!c) return '???'
  return CAT_CODES[c.toLowerCase()] || c.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase()
}

// ── styled ───────────────────────────────────────────────────────────
const BottomGrid = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 10px;
  align-items: start;
  margin-top: 10px;
  @media (max-width: 980px) { grid-template-columns: 1fr; }
`

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
  align-items: stretch;
`

const MCard = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${C.borderSubtle};
  background: rgba(10, 14, 23, 0.85);
  cursor: pointer;
  min-width: 0;
  transition: border-color 140ms ease, background 140ms ease;
  &:hover { border-color: rgba(0, 229, 255, 0.3); background: rgba(13, 18, 28, 0.95); }

  .head {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 0.65rem 0.75rem 0.35rem;
  }
  .code {
    flex-shrink: 0;
    padding: 0.14rem 0.4rem;
    border: 1px solid rgba(0, 229, 255, 0.25);
    color: ${C.cyan};
    font-family: ${FONT_MONO};
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 1px;
  }
  .q {
    flex: 1;
    min-width: 0;
    font-family: ${FONT_MONO};
    font-size: 0.74rem;
    font-weight: 600;
    line-height: 1.4;
    color: ${C.textPrimary};
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .pct {
    flex-shrink: 0;
    text-align: right;
    font-family: ${FONT_MONO};
    line-height: 1;
    .big { font-size: 1.25rem; font-weight: 800; }
    .big sub { font-size: 0.6rem; font-weight: 700; vertical-align: baseline; }
    .chg { display: block; margin-top: 3px; font-size: 0.56rem; font-weight: 700; letter-spacing: 0.5px; }
  }
  .spark { padding: 0.25rem 0.75rem 0; height: 48px; }
  .spark-empty {
    height: 48px;
    margin: 0.25rem 0.75rem 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: ${FONT_MONO};
    font-size: 0.54rem;
    letter-spacing: 1px;
    color: ${C.textMuted};
    opacity: 0.6;
  }
  .outcomes { padding: 0.45rem 0.75rem 0.1rem; display: flex; flex-direction: column; gap: 5px; }
  .orow {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: ${FONT_MONO};
    font-size: 0.68rem;
    .nm { flex: 1; min-width: 0; color: ${C.textPrimary}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pc { color: ${C.textPrimary}; font-weight: 700; }
  }
  .btns { display: flex; gap: 8px; padding: 0.55rem 0.75rem 0.65rem; margin-top: auto; }
  .foot {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0.4rem 0.75rem;
    border-top: 1px solid rgba(0, 229, 255, 0.06);
    font-family: ${FONT_MONO};
    font-size: 0.56rem;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: ${C.textMuted};
    white-space: nowrap;
    overflow: hidden;
    .flow { font-weight: 700; }
    .right { margin-left: auto; flex-shrink: 0; }
  }
`

const PriceBtn = styled.a`
  flex: 1;
  text-align: center;
  padding: 0.4rem 0.4rem;
  font-family: ${FONT_MONO};
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-decoration: none;
  border: 1px solid ${(p) => (p.$side === 'yes' ? 'rgba(0, 230, 118, 0.35)' : 'rgba(255, 23, 68, 0.35)')};
  color: ${(p) => (p.$side === 'yes' ? C.green : C.red)};
  background: ${(p) => (p.$side === 'yes' ? 'rgba(0, 230, 118, 0.07)' : 'rgba(255, 23, 68, 0.07)')};
  transition: background 140ms ease;
  &:hover { background: ${(p) => (p.$side === 'yes' ? 'rgba(0, 230, 118, 0.16)' : 'rgba(255, 23, 68, 0.16)')}; }
`

const MiniChip = styled.span`
  flex-shrink: 0;
  padding: 0.08rem 0.35rem;
  font-family: ${FONT_MONO};
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.6px;
  border: 1px solid ${(p) => (p.$side === 'yes' ? 'rgba(0, 230, 118, 0.35)' : 'rgba(255, 23, 68, 0.35)')};
  color: ${(p) => (p.$side === 'yes' ? C.green : C.red)};
`

// ── terminal category bar ────────────────────────────────────────────
const CatBar = styled.div`
  display: flex;
  align-items: stretch;
  border: 1px solid ${C.borderSubtle};
  background: rgba(10, 14, 23, 0.85);
  margin-bottom: 0.75rem;
  min-width: 0;

  .lead {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0 0.9rem;
    border-right: 1px solid ${C.borderSubtle};
    font-family: ${FONT_MONO};
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 1.4px;
    color: ${C.cyan};
    text-transform: uppercase;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .lead .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${C.green};
    animation: pm-pulse 2s ease-in-out infinite;
  }
  @keyframes pm-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
  nav {
    display: flex;
    flex: 1;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar { display: none; }
  }
  .meta {
    display: inline-flex;
    align-items: center;
    padding: 0 0.9rem;
    border-left: 1px solid ${C.borderSubtle};
    font-family: ${FONT_MONO};
    font-size: 0.58rem;
    color: ${C.textMuted};
    letter-spacing: 0.6px;
    white-space: nowrap;
    flex-shrink: 0;
    text-transform: uppercase;
    @media (max-width: 720px) { display: none; }
  }
`

const CatTab = styled.button`
  padding: 0.6rem 1rem;
  background: ${(p) => (p.$active ? 'rgba(0, 229, 255, 0.06)' : 'none')};
  border: none;
  border-right: 1px solid rgba(0, 229, 255, 0.05);
  box-shadow: ${(p) => (p.$active ? `inset 0 -2px 0 ${C.cyan}` : 'none')};
  color: ${(p) => (p.$active ? C.cyan : C.textMuted)};
  font-family: ${FONT_MONO};
  font-size: 0.62rem;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  letter-spacing: 1.2px;
  text-transform: uppercase;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  .count { opacity: 0.6; margin-left: 0.35rem; }
  &:hover { color: ${(p) => (p.$active ? C.cyan : C.textPrimary)}; }
`

const ClickRow = styled.tr`
  cursor: pointer !important;
`

const Pager = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid ${C.borderSubtle};
  font-family: ${FONT_MONO};
  .info { font-size: 0.68rem; color: ${C.textMuted}; letter-spacing: 0.4px; }
  .ctrls { display: inline-flex; align-items: center; gap: 0.6rem; }
  .page { font-size: 0.72rem; color: ${C.textPrimary}; min-width: 3.5rem; text-align: center; }
`

const ExtLink = styled.a`
  color: ${C.textMuted};
  text-decoration: none;
  font-size: 0.72rem;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  &:hover { color: ${C.cyan}; }
`

const StarBtn = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.15rem 0.3rem;
  font-size: 0.95rem;
  line-height: 1;
  color: ${(p) => (p.$on ? C.amber : C.textMuted)};
  transition: color 140ms ease, transform 120ms ease;
  &:hover { color: ${C.amber}; transform: scale(1.15); }
`

const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`

const Chip = styled.button`
  font-family: ${FONT_MONO};
  font-size: 0.66rem;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  letter-spacing: 0.6px;
  text-transform: uppercase;
  padding: 0.3rem 0.6rem;
  border-radius: 0;
  cursor: pointer;
  white-space: nowrap;
  color: ${(p) => (p.$active ? '#041018' : C.textMuted)};
  background: ${(p) => (p.$active ? C.cyan : 'transparent')};
  border: 1px solid ${(p) => (p.$active ? C.cyan : C.borderSubtle)};
  transition: color 140ms ease, background 140ms ease, border-color 140ms ease;
  &:hover { color: ${(p) => (p.$active ? '#041018' : C.textPrimary)}; border-color: rgba(0, 229, 255, 0.35); }
  .count { opacity: 0.7; margin-left: 0.3rem; }
`

const SortWrap = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-family: ${FONT_MONO};
  font-size: 0.64rem;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${C.textMuted};
`

const SortSelect = styled.select`
  font-family: ${FONT_MONO};
  font-size: 0.7rem;
  color: ${C.textPrimary};
  background: ${C.inputBg};
  border: 1px solid ${C.borderSubtle};
  border-radius: 0;
  padding: 0.32rem 0.5rem;
  cursor: pointer;
  outline: none;
  &:hover, &:focus { border-color: rgba(0, 229, 255, 0.35); }
  option { background: #0a0e17; color: ${C.textPrimary}; }
`

const Updated = styled.span`
  font-family: ${FONT_MONO};
  font-size: 0.66rem;
  color: ${C.textMuted};
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(3, 6, 12, 0.6);
  backdrop-filter: blur(2px);
  z-index: 1000;
`

const Drawer = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(460px, 92vw);
  background: #0a0e17;
  border-left: 1px solid ${C.borderSubtle};
  z-index: 1001;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.5);
`

const DrawerHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid ${C.borderSubtle};
  h3 {
    margin: 0; font-family: ${FONT_MONO}; font-size: 0.82rem; font-weight: 700;
    color: ${C.cyan}; letter-spacing: 0.6px; line-height: 1.35; word-break: break-word;
  }
  .sub { font-family: ${FONT_MONO}; font-size: 0.68rem; color: ${C.textMuted}; margin-top: 0.3rem; }
`

const CloseBtn = styled.button`
  background: transparent;
  border: 1px solid ${C.borderSubtle};
  color: ${C.textMuted};
  border-radius: 0;
  width: 28px; height: 28px;
  cursor: pointer;
  font-size: 1rem;
  flex-shrink: 0;
  &:hover { color: ${C.cyan}; border-color: rgba(0, 229, 255, 0.3); }
`

const DrawerBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem 2rem;
`

function fmtCount(n) {
  return Number.isFinite(n) && n > 0 ? n.toLocaleString() : '—'
}

// ── per-market probability sparkline ─────────────────────────────────
// Lazily fetched per card via /api/polymarket/history (server-cached
// proxy to Polymarket's public CLOB API). Client-side memo so paging
// back and forth never refetches.
const histCache = new Map()
function useProbHistory(cid) {
  const [pts, setPts] = useState(() => (cid && histCache.get(cid)) || null)
  useEffect(() => {
    if (!cid) return undefined
    if (histCache.has(cid)) {
      setPts(histCache.get(cid))
      return undefined
    }
    let cancelled = false
    fetch(`/api/polymarket/history?cid=${encodeURIComponent(cid)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const arr = j && Array.isArray(j.data) ? j.data : []
        histCache.set(cid, arr)
        if (!cancelled) setPts(arr)
      })
      .catch(() => {
        if (!cancelled) setPts([])
      })
    return () => {
      cancelled = true
    }
  }, [cid])
  return pts // null = loading, [] = no history
}

function fmtCents(pct) {
  if (!Number.isFinite(pct)) return '—'
  if (pct > 0 && pct < 1) return '<1¢'
  return `${Math.round(pct)}¢`
}

function MarketCard({ m, onOpen }) {
  const cid = marketConditionId(m)
  const odds = marketOddsView(m)
  const hist = useProbHistory(cid)
  const chg = marketDayChange(m)
  const url = polymarketUrl(marketSlug(m))
  const vol = marketVolume24h(m)
  const flow = marketWhaleFlow(m)
  const whales = marketWhaleCount(m)

  // Big number = YES probability for binary markets, leader for multis.
  const headPct = odds ? (odds.binary ? odds.a.pct : odds.leader.pct) : null
  const sparkDir =
    Array.isArray(hist) && hist.length >= 2 ? hist[hist.length - 1].p - hist[0].p : null
  const dir = chg != null ? chg : sparkDir
  const pctColor = dir == null ? C.cyan : dir >= 0 ? C.green : C.red

  return (
    <MCard onClick={() => onOpen(m)} title="View whale positioning in this market">
      <div className="head">
        <span className="code">{marketCatCode(m)}</span>
        <span className="q">{marketQuestion(m)}</span>
        {headPct != null ? (
          <span className="pct" style={{ color: pctColor }}>
            <span className="big">
              {Math.round(headPct)}
              <sub>%</sub>
            </span>
            {chg != null && chg !== 0 ? (
              <span className="chg">
                {chg > 0 ? '▲' : '▼'} {Math.abs(chg * 100).toFixed(1)}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      {hist === null ? (
        <div className="spark-empty">·· LOADING ··</div>
      ) : hist.length >= 2 ? (
        <div className="spark">
          <ProbLine data={hist.map((x) => x.p * 100)} width={300} height={44} fluid />
        </div>
      ) : (
        <div className="spark-empty">NO PRICE HISTORY</div>
      )}

      {odds && !odds.binary && Array.isArray(odds.pairs) ? (
        <div className="outcomes">
          {odds.pairs.slice(0, 3).map((o) => (
            <span className="orow" key={o.label}>
              <span className="nm" title={o.label}>{o.label}</span>
              <span className="pc">{fmtPct(o.pct)}</span>
              <MiniChip $side="yes">YES {fmtCents(o.pct)}</MiniChip>
            </span>
          ))}
        </div>
      ) : null}

      {odds && odds.binary ? (
        <div className="btns" onClick={(e) => e.stopPropagation()}>
          <PriceBtn
            $side="yes"
            href={url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            title={url ? 'Trade YES on Polymarket' : undefined}
          >
            {odds.a.label} {fmtCents(odds.a.pct)}
          </PriceBtn>
          <PriceBtn
            $side="no"
            href={url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            title={url ? 'Trade NO on Polymarket' : undefined}
          >
            {odds.b.label} {fmtCents(odds.b.pct)}
          </PriceBtn>
        </div>
      ) : (
        <div style={{ marginTop: 'auto' }} />
      )}

      <div className="foot">
        <span>{formatUsd(vol)} VOL</span>
        {whales > 0 ? <span>· {fmtCount(whales)} WHALES</span> : null}
        {flow !== 0 ? (
          <span className="flow" style={{ color: flow >= 0 ? C.green : C.red }}>
            · FLOW {flow >= 0 ? '+' : '−'}{formatUsd(Math.abs(flow))}
          </span>
        ) : null}
        <span className="right">{fmtEndDate(marketEndDate(m)) || ''}</span>
      </div>
    </MCard>
  )
}

export default function PolymarketClient() {
  const [markets, setMarkets] = useState([])
  const [whales, setWhales] = useState([])
  const [activity, setActivity] = useState([]) // live whale-trade tape (Arkham)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [drawer, setDrawer] = useState(null) // { kind, title, sub, rows, loading, error, filter }
  const [categories, setCategories] = useState([]) // [{ category, count }]
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [contestedOnly, setContestedOnly] = useState(false)
  const [whalesOnly, setWhalesOnly] = useState(false)
  const [sortKey, setSortKey] = useState('volume')
  const [page, setPage] = useState(1)
  const [isAuthed, setIsAuthed] = useState(false)
  const [followed, setFollowed] = useState(() => new Set()) // lowercased proxy_wallets
  const timerRef = useRef(null)
  const searchParams = useSearchParams()
  const deepOpenedRef = useRef(false)

  const authHeaders = useCallback(async () => {
    const sb = supabaseBrowser()
    const { data } = await sb.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : null
  }, [])

  // Track auth + load the user's followed whales.
  useEffect(() => {
    let cancelled = false
    const sb = supabaseBrowser()
    const loadFollows = async () => {
      try {
        const headers = await authHeaders()
        if (!headers) {
          if (!cancelled) {
            setIsAuthed(false)
            setFollowed(new Set())
          }
          return
        }
        if (!cancelled) setIsAuthed(true)
        const res = await fetch('/api/watchlist/polymarket', { headers, cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) {
          setFollowed(new Set((json.follows || []).map((f) => String(f.proxy_wallet).toLowerCase())))
        }
      } catch {
        /* silent */
      }
    }
    loadFollows()
    const { data: sub } = sb.auth.onAuthStateChange(() => loadFollows())
    return () => {
      cancelled = true
      sub?.subscription?.unsubscribe?.()
    }
  }, [authHeaders])

  const toggleFollow = useCallback(
    async (wallet, name) => {
      const key = String(wallet || '').toLowerCase()
      if (!key) return
      const headers = await authHeaders()
      if (!headers) {
        // Not signed in — send them to login, then back here.
        if (typeof window !== 'undefined') {
          window.location.href = `/login?redirect=${encodeURIComponent('/polymarket')}`
        }
        return
      }
      const wasFollowing = followed.has(key)
      // optimistic
      setFollowed((prev) => {
        const next = new Set(prev)
        if (wasFollowing) next.delete(key)
        else next.add(key)
        return next
      })
      try {
        const res = await fetch('/api/watchlist/polymarket', {
          method: wasFollowing ? 'DELETE' : 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ proxy_wallet: key, name: name || null }),
        })
        if (!res.ok) throw new Error('toggle failed')
      } catch {
        // revert
        setFollowed((prev) => {
          const next = new Set(prev)
          if (wasFollowing) next.add(key)
          else next.delete(key)
          return next
        })
      }
    },
    [authHeaders, followed]
  )

  // condition_id -> question, so the whale drill-down can show market
  // names instead of raw hex (holder rows only carry condition_id).
  const marketsById = useMemo(() => {
    const m = new Map()
    for (const mkt of markets) {
      const cid = marketConditionId(mkt)
      if (cid) m.set(cid, marketQuestion(mkt))
    }
    return m
  }, [markets])

  // Category pills/dropdown built from the real /categories endpoint so
  // counts span the whole table (not just the page of markets shown).
  const categoryChips = useMemo(() => {
    const total = categories.reduce((sum, c) => sum + (c.count || 0), 0)
    const present = categories.map((c) => ({ id: c.category, label: c.category, count: c.count }))
    return [{ id: 'all', label: 'All', count: total || markets.length }, ...present]
  }, [categories, markets.length])

  // Secondary sub-category filter: distinct tags within the markets that
  // came back for the current category (minus the top-level category names
  // themselves, which are noise as sub-filters).
  const tagOptions = useMemo(() => {
    const catNames = new Set(categories.map((c) => String(c.category).toLowerCase()))
    const counts = new Map()
    for (const m of markets) {
      for (const t of marketTags(m)) {
        if (catNames.has(t.toLowerCase())) continue
        counts.set(t, (counts.get(t) || 0) + 1)
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }))
  }, [markets, categories])

  // Client-side refinements on top of the server's category + sort.
  const visibleMarkets = useMemo(() => {
    let out = markets
    if (whalesOnly) out = out.filter((m) => marketWhaleCount(m) > 0)
    if (contestedOnly) out = out.filter(marketIsContested)
    if (tagFilter !== 'all') out = out.filter((m) => marketTags(m).includes(tagFilter))
    return out
  }, [markets, whalesOnly, contestedOnly, tagFilter])

  // Pagination over the filtered set (25/page). Clamp the page so it stays
  // valid as filters shrink the list.
  const totalPages = Math.max(1, Math.ceil(visibleMarkets.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedMarkets = useMemo(
    () => visibleMarkets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [visibleMarkets, currentPage]
  )

  // Reset to page 1 whenever the result set changes (category/sort/filters).
  useEffect(() => {
    setPage(1)
  }, [categoryFilter, sortKey, contestedOnly, whalesOnly, tagFilter])

  const load = useCallback(async (initial = false) => {
    if (initial) setStatus('loading')
    else setRefreshing(true)
    try {
      const marketParams = new URLSearchParams({ limit: '600', sort: sortKey })
      if (categoryFilter && categoryFilter !== 'all') marketParams.set('category', categoryFilter)
      const [mRes, wRes, aRes] = await Promise.all([
        fetch(`/api/polymarket/markets?${marketParams.toString()}`, { cache: 'no-store' }),
        fetch('/api/polymarket/whales?limit=100', { cache: 'no-store' }),
        // Live whale-activity tape; tolerate absence (table may be empty until
        // the Arkham Polymarket cron has run).
        fetch('/api/polymarket/activity?limit=40', { cache: 'no-store' }).catch(() => null),
      ])
      if (!mRes.ok || !wRes.ok) throw new Error('fetch failed')
      const [mJson, wJson] = await Promise.all([mRes.json(), wRes.json()])
      setMarkets(Array.isArray(mJson.data) ? mJson.data : [])
      setWhales(Array.isArray(wJson.data) ? wJson.data : [])
      if (aRes && aRes.ok) {
        const aJson = await aRes.json()
        setActivity(Array.isArray(aJson.data) ? aJson.data : [])
      }
      setStatus('ready')
      setLastUpdated(new Date())
    } catch {
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'))
    } finally {
      setRefreshing(false)
    }
  }, [categoryFilter, sortKey])

  // Load the category list once.
  useEffect(() => {
    let cancelled = false
    fetch('/api/polymarket/categories', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j && Array.isArray(j.data)) setCategories(j.data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // (Re)load markets+whales on mount and whenever the server-driven
  // category/sort changes; keep polling on the latest selection.
  useEffect(() => {
    load(markets.length === 0)
    timerRef.current = setInterval(() => load(false), POLL_MS)
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load])

  // A selected sub-category tag may not exist after switching category.
  useEffect(() => {
    if (tagFilter !== 'all' && !tagOptions.some((t) => t.tag === tagFilter)) {
      setTagFilter('all')
    }
  }, [tagOptions, tagFilter])

  const openDrawer = useCallback(async ({ kind, title, sub, wallet, url, filter }) => {
    setDrawer({ kind, title, sub, wallet, rows: [], loading: true, error: false, filter })
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error('fetch failed')
      const json = await res.json()
      setDrawer((d) =>
        d && d.title === title
          ? { ...d, rows: Array.isArray(json.data) ? json.data : [], loading: false }
          : d
      )
    } catch {
      setDrawer((d) => (d && d.title === title ? { ...d, loading: false, error: true } : d))
    }
  }, [])

  const onMarketClick = (m) => {
    const cid = marketConditionId(m)
    if (!cid) return
    openDrawer({
      kind: 'market',
      title: marketQuestion(m),
      sub: `Whales in this market · ${fmtCount(marketWhaleCount(m))} tracked`,
      url: `/api/polymarket/holders?condition_id=${encodeURIComponent(cid)}&limit=200`,
      filter: 'condition_id',
    })
  }

  const openWhaleByWallet = useCallback(
    (wallet, name, marketsCount) => {
      if (!wallet) return
      openDrawer({
        kind: 'whale',
        title: name || shortenAddress(wallet, 5),
        sub: marketsCount ? `${fmtCount(marketsCount)} markets` : null,
        wallet,
        url: `/api/polymarket/holders?proxy_wallet=${encodeURIComponent(wallet)}&limit=200`,
        filter: 'proxy_wallet',
      })
    },
    [openDrawer]
  )

  const onWhaleClick = (w) => {
    const wallet = whaleWallet(w)
    if (!wallet) return
    openWhaleByWallet(wallet, whaleName(w), whaleMarkets(w))
  }

  // Deep-open a whale drawer when arriving via ?whale=0x... (e.g. from the
  // Following tab). Runs once after the first data load.
  useEffect(() => {
    if (deepOpenedRef.current) return
    if (status !== 'ready') return
    const wallet = searchParams?.get('whale')
    if (wallet) {
      deepOpenedRef.current = true
      const match = whales.find(
        (w) => String(whaleWallet(w) || '').toLowerCase() === wallet.toLowerCase()
      )
      openWhaleByWallet(wallet, match ? whaleName(match) : null, match ? whaleMarkets(match) : 0)
    }
  }, [status, whales, searchParams, openWhaleByWallet])

  return (
    <WhaleTerminalShell
      title="WHALE_TERMINAL // POLYMARKET"
      live
      whaleAlert={false}
      statusSegments={[
        { k: 'MARKETS', v: markets.length.toLocaleString() },
        { k: 'WHALES', v: whales.length.toLocaleString() },
      ]}
    >
      {status === 'loading' ? (
        <Panel>
          <SonarLoader text="Scanning Polymarket whales…" size={60} compact />
        </Panel>
      ) : status === 'error' ? (
        <Panel>
          <ErrorNotice>
            <div>⚠ Unable to load Polymarket data.</div>
            <div style={{ marginTop: '0.75rem' }}>
              <GhostButton type="button" onClick={() => load(true)}>RETRY</GhostButton>
            </div>
          </ErrorNotice>
        </Panel>
      ) : (
        <>
          <Panel>
            <PanelTitle>
              <h2>Top Markets · {(SORT_OPTIONS.find((s) => s.id === sortKey) || SORT_OPTIONS[0]).label}</h2>
              <span style={{ display: 'inline-flex', gap: '0.6rem', alignItems: 'center' }}>
                <Updated>
                  {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
                </Updated>
                <GhostButton type="button" onClick={() => load(false)} disabled={refreshing}>
                  {refreshing ? 'SYNCING…' : 'REFRESH'}
                </GhostButton>
              </span>
            </PanelTitle>
            {markets.length === 0 ? (
              <Notice>No markets available yet.</Notice>
            ) : (
              <>
                <CatBar>
                  <span className="lead">
                    <span className="dot" aria-hidden />
                    Markets
                  </span>
                  <nav aria-label="Market categories">
                    {categoryChips.map((c) => (
                      <CatTab
                        key={c.id}
                        type="button"
                        $active={categoryFilter === c.id}
                        onClick={() => setCategoryFilter(c.id)}
                      >
                        {c.label}
                        <span className="count">{c.count}</span>
                      </CatTab>
                    ))}
                  </nav>
                  <span className="meta">
                    {visibleMarkets.length.toLocaleString()} MKTS ·{' '}
                    {formatUsd(visibleMarkets.reduce((s, m) => s + marketVolume24h(m), 0))} VOL
                  </span>
                </CatBar>
                <Controls>
                  <span style={{ display: 'inline-flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {tagOptions.length > 0 ? (
                      <SortWrap>
                        Tag
                        <SortSelect value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
                          <option value="all">All</option>
                          {tagOptions.map((t) => (
                            <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>
                          ))}
                        </SortSelect>
                      </SortWrap>
                    ) : null}
                    <Chip
                      type="button"
                      $active={whalesOnly}
                      onClick={() => setWhalesOnly((v) => !v)}
                      title="Hide markets with no tracked whale holders yet"
                    >
                      Whales only
                    </Chip>
                    <Chip
                      type="button"
                      $active={contestedOnly}
                      onClick={() => setContestedOnly((v) => !v)}
                      title="Show only genuinely two-sided markets (hides longshot spam)"
                    >
                      Contested only
                    </Chip>
                    <SortWrap>
                      Sort
                      <SortSelect value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                        {SORT_OPTIONS.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </SortSelect>
                    </SortWrap>
                  </span>
                </Controls>
                {visibleMarkets.length === 0 ? (
                  <Notice>
                    {whalesOnly || contestedOnly || tagFilter !== 'all'
                      ? 'No markets match these filters.'
                      : 'No markets in this category.'}
                  </Notice>
                ) : (
                  <CardsGrid>
                    {pagedMarkets.map((m, i) => (
                      <MarketCard key={marketConditionId(m) || i} m={m} onOpen={onMarketClick} />
                    ))}
                  </CardsGrid>
                )}
                {visibleMarkets.length > PAGE_SIZE ? (
                  <Pager>
                    <span className="info">
                      {(currentPage - 1) * PAGE_SIZE + 1}–
                      {Math.min(currentPage * PAGE_SIZE, visibleMarkets.length)} of{' '}
                      {visibleMarkets.length.toLocaleString()}
                    </span>
                    <span className="ctrls">
                      <GhostButton
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                      >
                        ‹ PREV
                      </GhostButton>
                      <span className="page">
                        {currentPage} / {totalPages}
                      </span>
                      <GhostButton
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                      >
                        NEXT ›
                      </GhostButton>
                    </span>
                  </Pager>
                ) : null}
              </>
            )}
          </Panel>

          <BottomGrid>
          <Panel>
            <PanelTitle>
              <h2>Whale Leaderboard</h2>
            </PanelTitle>
            {whales.length === 0 ? (
              <Notice>No whales tracked yet.</Notice>
            ) : (
              <DataTable>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Whale</th>
                      <th className="right">Total Size</th>
                      <th className="right">Markets</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {whales.map((w, i) => {
                      const wallet = whaleWallet(w)
                      const isFollowing = wallet && followed.has(String(wallet).toLowerCase())
                      return (
                        <ClickRow
                          key={wallet || i}
                          onClick={() => onWhaleClick(w)}
                          title="View this whale's markets"
                        >
                          <td className="muted">{i + 1}</td>
                          <td>
                            <WhaleWalletCell
                              wallet={wallet}
                              displayName={whaleDisplayName(w)}
                            />
                          </td>
                          <td className="right" style={{ fontWeight: 700 }}>{formatUsd(whaleTotal(w))}</td>
                          <td className="right">{fmtCount(whaleMarkets(w))}</td>
                          <td className="right">
                            <StarBtn
                              type="button"
                              $on={isFollowing}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleFollow(wallet, whaleName(w))
                              }}
                              title={isFollowing ? 'Unfollow whale' : 'Follow whale'}
                              aria-label={isFollowing ? 'Unfollow whale' : 'Follow whale'}
                            >
                              {isFollowing ? '★' : '☆'}
                            </StarBtn>
                          </td>
                        </ClickRow>
                      )
                    })}
                  </tbody>
                </table>
              </DataTable>
            )}
          </Panel>

          {activity.length > 0 ? (
            <Panel>
              <PanelTitle>
                <h2>Live Whale Activity</h2>
              </PanelTitle>
              <DataTable>
                <table>
                  <thead>
                    <tr>
                      <th>Whale</th>
                      <th>Side</th>
                      <th className="right">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((a, i) => {
                      const nm = holderRealName(a)
                      const wallet = whaleWallet(a)
                      const side = String(a.side || '').toUpperCase()
                      return (
                        <tr key={`${wallet || ''}-${a.ts || ''}-${i}`}>
                          <td>{nm || (wallet ? shortenAddress(wallet, 5) : '—')}</td>
                          <td>
                            <span
                              style={{
                                color: side === 'BUY' ? C.green : side === 'SELL' ? C.red : C.textMuted,
                                fontWeight: 700,
                                fontSize: '0.72rem',
                              }}
                            >
                              {side || '—'}
                            </span>
                          </td>
                          <td className="right" style={{ fontWeight: 700 }}>{formatUsd(Number(a.usd_value || a.size || 0))}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </DataTable>
            </Panel>
          ) : null}
          </BottomGrid>
        </>
      )}

      {drawer ? (
        <>
          <Overlay onClick={() => setDrawer(null)} />
          <Drawer role="dialog" aria-label="Polymarket drill-down">
            <DrawerHead>
              <div style={{ minWidth: 0 }}>
                <h3>{drawer.title}</h3>
                {drawer.kind === 'whale' && drawer.wallet ? (
                  <div style={{ marginTop: '0.35rem' }}>
                    <WhaleWalletCell
                      wallet={drawer.wallet}
                      displayName={
                        drawer.title !== shortenAddress(drawer.wallet, 5) ? drawer.title : null
                      }
                      compact
                    />
                  </div>
                ) : drawer.sub ? (
                  <div className="sub">{drawer.sub}</div>
                ) : null}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                {drawer.kind === 'whale' && drawer.wallet ? (
                  <StarBtn
                    type="button"
                    $on={followed.has(String(drawer.wallet).toLowerCase())}
                    onClick={() => toggleFollow(drawer.wallet, drawer.title)}
                    title={followed.has(String(drawer.wallet).toLowerCase()) ? 'Unfollow whale' : 'Follow whale'}
                    aria-label="Toggle follow"
                  >
                    {followed.has(String(drawer.wallet).toLowerCase()) ? '★' : '☆'}
                  </StarBtn>
                ) : null}
                <CloseBtn onClick={() => setDrawer(null)} aria-label="Close">×</CloseBtn>
              </div>
            </DrawerHead>
            <DrawerBody>
              {drawer.loading ? (
                <SonarLoader text="Loading…" size={48} compact />
              ) : drawer.error ? (
                <ErrorNotice>Unable to load drill-down.</ErrorNotice>
              ) : drawer.rows.length === 0 ? (
                <Notice>No holdings found.</Notice>
              ) : (
                <DataTable>
                  <table>
                    <thead>
                      <tr>
                        <th>{drawer.filter === 'proxy_wallet' ? 'Market' : 'Whale'}</th>
                        <th>Side</th>
                        <th className="right">Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drawer.rows.map((h, i) => {
                        const isMarketRow = drawer.filter === 'proxy_wallet'
                        let label
                        let href = null
                        if (isMarketRow) {
                          const cid = holderConditionId(h)
                          label =
                            holderQuestion(h) ||
                            (cid && marketsById.get(cid)) ||
                            (cid ? shortenAddress(cid, 6) : '—')
                          href = polymarketUrl(holderSlug(h))
                        } else {
                          label =
                            holderRealName(h) ||
                            (h.proxy_wallet ? shortenAddress(h.proxy_wallet, 5) : '—')
                        }
                        const side = holderSide(h)
                        const holderWallet = whaleWallet(h)
                        const holderFollowing =
                          holderWallet && followed.has(String(holderWallet).toLowerCase())
                        return (
                          <tr key={i}>
                            <td style={{ whiteSpace: 'normal', color: C.textPrimary }}>
                              {isMarketRow && href ? (
                                <ExtLink
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: C.textPrimary, fontSize: '0.8rem' }}
                                  title="Open on Polymarket"
                                >
                                  {label} <span style={{ color: C.textMuted }}>↗</span>
                                </ExtLink>
                              ) : (
                                // Whale row (market drill-down): follow + copy + analyze.
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  {holderWallet ? (
                                    <StarBtn
                                      type="button"
                                      $on={holderFollowing}
                                      onClick={() =>
                                        toggleFollow(holderWallet, holderRealName(h))
                                      }
                                      title={holderFollowing ? 'Unfollow whale' : 'Follow whale'}
                                      aria-label={holderFollowing ? 'Unfollow whale' : 'Follow whale'}
                                    >
                                      {holderFollowing ? '★' : '☆'}
                                    </StarBtn>
                                  ) : null}
                                  <WhaleWalletCell
                                    wallet={holderWallet}
                                    displayName={holderRealName(h)}
                                    compact
                                  />
                                </span>
                              )}
                            </td>
                            <td>
                              {side ? (
                                <span style={{ color: side === 'YES' ? C.green : side === 'NO' ? C.red : C.textMuted, fontWeight: 700, fontSize: '0.72rem' }}>
                                  {side}
                                </span>
                              ) : (
                                <span style={{ color: C.textMuted }}>—</span>
                              )}
                            </td>
                            <td className="right" style={{ fontWeight: 700 }}>{formatUsd(holderAmount(h))}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </DataTable>
              )}
            </DrawerBody>
          </Drawer>
        </>
      ) : null}
    </WhaleTerminalShell>
  )
}
