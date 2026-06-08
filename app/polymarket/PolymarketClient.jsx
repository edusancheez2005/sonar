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
import { shortenAddress, formatUsd } from '@/lib/wallet-tracker'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import SonarLoader from '@/components/wallet-tracker/SonarLoader'
import { WhaleWalletCell } from '@/app/components/whale-terminal/WalletAddrActions'

const POLL_MS = 30000
const PAGE_SIZE = 25

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
    const leader = pairs.reduce((m1, x) => (x.pct > m1.pct ? x : m1), pairs[0])
    return { binary: false, leader }
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
  const name = pick(w, ['name', 'username', 'display_name', 'pseudonym'])
  const wallet = pick(w, ['proxy_wallet', 'proxyWallet', 'wallet', 'address'])
  if (name && !looksLikeAddress(name)) return name
  const addr = wallet || (looksLikeAddress(name) ? name : null)
  return addr ? shortenAddress(addr, 5) : 'Unknown whale'
}
function whaleWallet(w) {
  return pick(w, ['proxy_wallet', 'proxyWallet', 'wallet', 'address'])
}
function whaleDisplayName(w) {
  const name = pick(w, ['name', 'username', 'display_name', 'pseudonym'])
  if (name && !looksLikeAddress(name)) return name
  return null
}
function whaleTotal(w) {
  return Number(pick(w, ['total_amount', 'totalAmount', 'total', 'total_size', 'size'], 0))
}
function whaleMarkets(w) {
  return Number(pick(w, ['markets_count', 'num_markets', 'market_count', 'markets', 'n_markets'], 0))
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

// ── styled ───────────────────────────────────────────────────────────
const Grid = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 1.25rem;
  align-items: start;
  @media (max-width: 980px) { grid-template-columns: 1fr; }
`

const OddsBar = styled.div`
  display: flex;
  width: 120px;
  height: 14px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-family: ${FONT_MONO};
  .yes { background: rgba(0, 230, 118, 0.55); }
  .no { background: rgba(255, 23, 68, 0.5); }
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

const Chips = styled.div`
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
`

const Chip = styled.button`
  font-family: ${FONT_MONO};
  font-size: 0.66rem;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  letter-spacing: 0.6px;
  text-transform: uppercase;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
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
  border-radius: 4px;
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
  border-radius: 4px;
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

export default function PolymarketClient() {
  const [markets, setMarkets] = useState([])
  const [whales, setWhales] = useState([])
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
      const [mRes, wRes] = await Promise.all([
        fetch(`/api/polymarket/markets?${marketParams.toString()}`, { cache: 'no-store' }),
        fetch('/api/polymarket/whales?limit=100', { cache: 'no-store' }),
      ])
      if (!mRes.ok || !wRes.ok) throw new Error('fetch failed')
      const [mJson, wJson] = await Promise.all([mRes.json(), wRes.json()])
      setMarkets(Array.isArray(mJson.data) ? mJson.data : [])
      setWhales(Array.isArray(wJson.data) ? wJson.data : [])
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
    <WhaleTerminalShell title="WHALE_INTELLIGENCE // POLYMARKET" live={false}>
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
        <Grid>
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
                <Controls>
                  {categoryChips.length > 7 ? (
                    <SortWrap>
                      Category
                      <SortSelect
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                      >
                        {categoryChips.map((c) => (
                          <option key={c.id} value={c.id}>{c.label} ({c.count})</option>
                        ))}
                      </SortSelect>
                    </SortWrap>
                  ) : (
                    <Chips>
                      {categoryChips.map((c) => (
                        <Chip
                          key={c.id}
                          type="button"
                          $active={categoryFilter === c.id}
                          onClick={() => setCategoryFilter(c.id)}
                        >
                          {c.label}
                          <span className="count">{c.count}</span>
                        </Chip>
                      ))}
                    </Chips>
                  )}
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
              <DataTable>
                <table>
                  <thead>
                    <tr>
                      <th>Market</th>
                      <th>Cat</th>
                      <th>Yes / No</th>
                      <th className="right">24h Vol</th>
                      <th className="right">Whale Flow</th>
                      <th className="right">Whales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedMarkets.map((m, i) => {
                      const odds = marketOddsView(m)
                      const flow = marketWhaleFlow(m)
                      return (
                        <ClickRow
                          key={marketConditionId(m) || i}
                          onClick={() => onMarketClick(m)}
                          title="View whales in this market"
                        >
                          <td style={{ whiteSpace: 'normal', maxWidth: '320px', color: C.textPrimary }}>
                            <div>{marketQuestion(m)}</div>
                            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                              {fmtEndDate(marketEndDate(m)) ? (
                                <span style={{ fontSize: '0.62rem', color: C.textMuted, fontFamily: FONT_MONO }}>
                                  {fmtEndDate(marketEndDate(m))}
                                </span>
                              ) : null}
                              {polymarketUrl(marketSlug(m)) ? (
                                <ExtLink
                                  href={polymarketUrl(marketSlug(m))}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Open on Polymarket"
                                >
                                  Polymarket ↗
                                </ExtLink>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontFamily: FONT_MONO, fontSize: '0.6rem', letterSpacing: '0.5px', textTransform: 'uppercase', color: C.textMuted, whiteSpace: 'nowrap' }}>
                              {marketCategoryLabel(m)}
                            </span>
                          </td>
                          <td>
                            {!odds ? (
                              <span style={{ color: C.textMuted }}>—</span>
                            ) : odds.binary ? (
                              <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <OddsBar title={`${odds.a.label} ${fmtPct(odds.a.pct)} · ${odds.b.label} ${fmtPct(odds.b.pct)}`}>
                                  <span className="yes" style={{ width: `${odds.a.pct}%` }} />
                                  <span className="no" style={{ width: `${odds.b.pct}%` }} />
                                </OddsBar>
                                <span style={{ fontSize: '0.62rem', color: C.textMuted }}>
                                  {odds.a.label} {fmtPct(odds.a.pct)} · {odds.b.label} {fmtPct(odds.b.pct)}
                                </span>
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <OddsBar title={`${odds.leader.label} ${fmtPct(odds.leader.pct)} leading`}>
                                  <span className="yes" style={{ width: `${odds.leader.pct}%` }} />
                                  <span className="no" style={{ width: `${100 - odds.leader.pct}%` }} />
                                </OddsBar>
                                <span style={{ fontSize: '0.62rem', color: C.textMuted }}>
                                  {odds.leader.label} {fmtPct(odds.leader.pct)}
                                </span>
                              </span>
                            )}
                          </td>
                          <td className="right">{formatUsd(marketVolume24h(m))}</td>
                          <td
                            className="right"
                            style={{ fontWeight: 700, color: flow >= 0 ? C.green : C.red }}
                          >
                            {flow >= 0 ? '+' : ''}{formatUsd(flow)}
                          </td>
                          <td className="right">{fmtCount(marketWhaleCount(m))}</td>
                        </ClickRow>
                      )
                    })}
                  </tbody>
                </table>
              </DataTable>
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
        </Grid>
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
                            h.name && !looksLikeAddress(h.name)
                              ? h.name
                              : h.proxy_wallet
                                ? shortenAddress(h.proxy_wallet, 5)
                                : '—'
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
                                        toggleFollow(
                                          holderWallet,
                                          h.name && !looksLikeAddress(h.name) ? h.name : null
                                        )
                                      }
                                      title={holderFollowing ? 'Unfollow whale' : 'Follow whale'}
                                      aria-label={holderFollowing ? 'Unfollow whale' : 'Follow whale'}
                                    >
                                      {holderFollowing ? '★' : '☆'}
                                    </StarBtn>
                                  ) : null}
                                  <WhaleWalletCell
                                    wallet={holderWallet}
                                    displayName={
                                      h.name && !looksLikeAddress(h.name) ? h.name : null
                                    }
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
