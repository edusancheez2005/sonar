'use client'
// Whale Terminal — RESEARCH module.
// Command bar (trace any address / search entities), selected-whale
// PORTFOLIO candle chart (daily OHLC of cumulative net on-chain flow —
// clicking a leaderboard row reloads the chart for that wallet), dense
// whale leaderboard, and a right rail with live signals, buy/sell flow
// by chain and top movers. Everything is wired to real API routes — no
// synthetic data; panels degrade to NO DATA states.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import NextLink from 'next/link'
import styled from 'styled-components'
import { C, FONT_MONO, FONT_SANS } from '@/app/lib/terminalTheme'
import { TermPanel, Notice, ErrorNotice, GhostButton } from '@/app/components/whale-terminal/primitives'
import { CandleChart, AreaSpark, FlowBars, ScoreBar, ChartEmpty } from '@/app/components/whale-terminal/charts'
import { shortenAddress, formatUsd, timeAgo, TAG_COLORS } from '@/lib/wallet-tracker'
import { walletAnalysisHref } from '@/app/components/whale-terminal/WalletAddrActions'

const SIGNAL_POLL_MS = 30000
const LEADERBOARD_LIMIT = 50

const ADDRESS_RES = [
  /^0x[a-fA-F0-9]{40}$/, // EVM
  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, // Solana / Base58-ish
  /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{10,87}$/, // Bitcoin
]
const looksLikeAddress = (s) => ADDRESS_RES.some((re) => re.test(s))

// ── styled ───────────────────────────────────────────────────────────
const CommandWrap = styled.form`
  display: flex;
  align-items: center;
  border: 1px solid ${C.borderSubtle};
  background: rgba(10, 14, 23, 0.85);
  margin-bottom: 10px;
  position: relative;

  .prompt {
    padding: 0 0.6rem 0 0.8rem;
    font-family: ${FONT_MONO};
    font-size: 0.78rem;
    font-weight: 800;
    color: ${C.green};
  }
  .mode {
    font-family: ${FONT_MONO};
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 1.4px;
    color: ${C.cyan};
    text-transform: uppercase;
    white-space: nowrap;
  }
  .div { margin: 0 0.7rem; width: 1px; align-self: stretch; background: ${C.borderSubtle}; }
  input {
    flex: 1;
    min-width: 120px;
    padding: 0.62rem 0;
    background: transparent;
    border: none;
    outline: none;
    color: ${C.textPrimary};
    font-family: ${FONT_MONO};
    font-size: 0.8rem;
    caret-color: ${C.cyan};
    &::placeholder { color: ${C.textMuted}; opacity: 0.6; }
  }
  .trace {
    padding: 0.62rem 1.2rem;
    background: ${C.cyan};
    border: none;
    color: #041018;
    font-family: ${FONT_MONO};
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    cursor: pointer;
    flex-shrink: 0;
    &:hover { filter: brightness(1.1); }
  }
`

const SearchResults = styled.div`
  position: absolute;
  top: calc(100% + 1px);
  left: 0;
  right: 0;
  z-index: 30;
  background: #0a0e17;
  border: 1px solid rgba(0, 229, 255, 0.25);
  max-height: 320px;
  overflow-y: auto;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);

  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 0.5rem 0.8rem;
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(0, 229, 255, 0.05);
    cursor: pointer;
    text-align: left;
    font-family: ${FONT_MONO};
    &:hover { background: rgba(0, 229, 255, 0.06); }
    .addr { color: ${C.cyan}; font-size: 0.72rem; font-weight: 600; }
    .name { color: ${C.textPrimary}; font-size: 0.72rem; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chain { color: ${C.textMuted}; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.6px; }
  }
  .none { padding: 0.8rem; font-family: ${FONT_MONO}; font-size: 0.68rem; color: ${C.textMuted}; }
`

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 332px;
  gap: 10px;
  align-items: start;
  @media (max-width: 1180px) { grid-template-columns: 1fr; }
`

const Col = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`

const Th = styled.th`
  padding: 0.45rem 0.7rem;
  text-align: ${(p) => (p.$right ? 'right' : 'left')};
  font-family: ${FONT_MONO};
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${C.textMuted};
  border-bottom: 1px solid ${C.borderSubtle};
  background: rgba(2, 6, 12, 0.95);
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
`

const Td = styled.td`
  padding: 0.42rem 0.7rem;
  font-size: 0.72rem;
  white-space: nowrap;
  border-bottom: 1px solid rgba(255, 255, 255, 0.025);
  font-family: ${FONT_MONO};
`

const Tr = styled.tr`
  cursor: pointer;
  background: ${(p) => (p.$sel ? 'rgba(0, 229, 255, 0.07)' : 'transparent')};
  box-shadow: ${(p) => (p.$sel ? `inset 2px 0 0 ${C.cyan}` : 'none')};
  &:hover { background: ${(p) => (p.$sel ? 'rgba(0, 229, 255, 0.07)' : 'rgba(0, 229, 255, 0.035)')}; }
`

const TagChip = styled.span`
  display: inline-block;
  padding: 0.08rem 0.4rem;
  font-family: ${FONT_MONO};
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  white-space: nowrap;
`

const RangeTabs = styled.span`
  display: inline-flex;
  border: 1px solid ${C.borderSubtle};
`

const RangeTab = styled.button`
  padding: 0.18rem 0.55rem;
  background: ${(p) => (p.$on ? 'rgba(0, 229, 255, 0.1)' : 'transparent')};
  border: none;
  border-right: 1px solid ${C.borderSubtle};
  color: ${(p) => (p.$on ? C.cyan : C.textMuted)};
  font-family: ${FONT_MONO};
  font-size: 0.58rem;
  font-weight: ${(p) => (p.$on ? 700 : 500)};
  letter-spacing: 0.8px;
  cursor: pointer;
  &:last-child { border-right: none; }
  &:hover { color: ${C.cyan}; }
`

const StatRail = styled.div`
  display: flex;
  border-top: 1px solid ${C.borderSubtle};
  font-family: ${FONT_MONO};
  font-size: 0.62rem;
  flex-wrap: wrap;
  .seg {
    display: inline-flex;
    gap: 6px;
    padding: 0.4rem 0.9rem;
    border-right: 1px solid rgba(0, 229, 255, 0.05);
    .k { color: ${C.textMuted}; letter-spacing: 0.8px; }
    .v { color: ${C.textPrimary}; font-weight: 600; }
  }
  .open {
    margin-left: auto;
    padding: 0.4rem 0.9rem;
    color: ${C.cyan};
    text-decoration: none;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    &:hover { background: rgba(0, 229, 255, 0.06); }
  }
`

const WalletLink = styled(NextLink)`
  color: ${C.cyan};
  text-decoration: none;
  &:hover { text-decoration: underline; }
`

function Tag({ tag }) {
  const t = TAG_COLORS[tag] || { bg: 'rgba(255,255,255,0.05)', color: C.textMuted }
  return (
    <TagChip style={{ background: t.bg, color: t.color }}>{String(tag).replace(/_/g, ' ')}</TagChip>
  )
}

function fmtSigned(n) {
  if (!Number.isFinite(n)) return '—'
  const abs = formatUsd(Math.abs(n))
  if (abs === '—') return '$0'
  return `${n < 0 ? '−' : '+'}${abs}`
}

// ── command bar ──────────────────────────────────────────────────────
function CommandBar() {
  const router = useRouter()
  const [v, setV] = useState('')
  const [results, setResults] = useState(null) // null = closed
  const [searching, setSearching] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setResults(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const submit = async (e) => {
    e?.preventDefault?.()
    const q = v.trim()
    if (!q) return
    if (looksLikeAddress(q)) {
      router.push(walletAnalysisHref(q))
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/wallet-tracker/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
      const json = res.ok ? await res.json() : { data: [] }
      setResults(Array.isArray(json.data) ? json.data.slice(0, 12) : [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <CommandWrap onSubmit={submit} ref={boxRef}>
      <span className="prompt" aria-hidden>{'>'}</span>
      <span className="mode">research</span>
      <span className="div" aria-hidden />
      <input
        value={v}
        onChange={(e) => { setV(e.target.value); if (results) setResults(null) }}
        placeholder="paste address · entity · name — hit ⏎ to trace"
        aria-label="Research a wallet, entity or name"
        autoComplete="off"
        spellCheck={false}
      />
      <button className="trace" type="submit" disabled={searching}>
        {searching ? 'Scanning…' : 'Trace'}
      </button>
      {results !== null ? (
        <SearchResults role="listbox">
          {results.length === 0 ? (
            <div className="none">NO MATCHES — PASTE A FULL ADDRESS TO TRACE IT DIRECTLY</div>
          ) : (
            results.map((r) => (
              <button
                key={r.address}
                type="button"
                className="row"
                onClick={() => router.push(walletAnalysisHref(r.address))}
              >
                <span className="addr">{shortenAddress(r.address, 6)}</span>
                <span className="name">{r.entity_name || '—'}</span>
                <span className="chain">{r.chain || ''}</span>
              </button>
            ))
          )}
        </SearchResults>
      ) : null}
    </CommandWrap>
  )
}

// ── selected-wallet portfolio candles ────────────────────────────────
function usePortfolioCandles(address, days) {
  const [state, setState] = useState({ status: 'idle', candles: null, netFlow: null })

  useEffect(() => {
    if (!address) {
      setState({ status: 'idle', candles: null, netFlow: null })
      return undefined
    }
    let cancelled = false
    setState({ status: 'loading', candles: null, netFlow: null })
    fetch(`/api/wallet-tracker/${encodeURIComponent(address)}/candles?days=${days}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('candles failed'))))
      .then((j) => {
        if (cancelled) return
        setState({
          status: 'ready',
          candles: Array.isArray(j.data) ? j.data : [],
          netFlow: Number.isFinite(Number(j.net_flow_usd)) ? Number(j.net_flow_usd) : null,
        })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', candles: null, netFlow: null })
      })
    return () => {
      cancelled = true
    }
  }, [address, days])

  return state
}

function PortfolioPanel({ sel, walletsLoading }) {
  const [days, setDays] = useState(90)
  const { status, candles, netFlow } = usePortfolioCandles(sel?.address, days)
  const selPnl = sel ? Number(sel.pnl_estimated_usd) : null

  const label = sel
    ? `Portfolio · ${sel.entity_name || shortenAddress(sel.address, 6)}`
    : 'Portfolio'

  return (
    <TermPanel
      label={label}
      meta={
        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <span>{days}D · 1D CANDLES · NET FLOW USD · LOG</span>
          <RangeTabs>
            {[30, 90, 180].map((d) => (
              <RangeTab key={d} $on={d === days} onClick={() => setDays(d)} type="button">{d}D</RangeTab>
            ))}
          </RangeTabs>
        </span>
      }
      live={!!sel}
    >
      {!sel ? (
        <ChartEmpty height={300} label={walletsLoading ? 'LOADING…' : 'SELECT A WALLET FROM THE LEADERBOARD'} />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.6rem 0.8rem 0.2rem', flexWrap: 'wrap', minWidth: 0 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: '0.86rem', fontWeight: 700, color: C.cyan }}>
              {shortenAddress(sel.address, 8)}
            </span>
            {sel.entity_name ? (
              <span style={{ fontFamily: FONT_SANS, fontSize: '0.78rem', color: C.textPrimary, opacity: 0.85, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }} title={sel.entity_name}>
                {sel.entity_name}
              </span>
            ) : null}
            <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(Array.isArray(sel.tags) ? sel.tags : []).slice(0, 3).map((t) => <Tag key={t} tag={t} />)}
            </span>
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 12, fontFamily: FONT_MONO }}>
              {netFlow != null ? (
                <span
                  title={`Cumulative net on-chain USD flow over the last ${days} days. Not a holdings valuation.`}
                  style={{ fontSize: '1.3rem', fontWeight: 800, color: netFlow >= 0 ? C.green : C.red }}
                >
                  {fmtSigned(netFlow)}
                </span>
              ) : null}
              {Number.isFinite(selPnl) && selPnl !== 0 ? (
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: selPnl > 0 ? C.green : C.red, whiteSpace: 'nowrap' }}>
                  {selPnl > 0 ? '▲' : '▼'} {fmtSigned(selPnl).replace(/^[+−]/, '')} est pnl
                </span>
              ) : null}
            </span>
          </div>

          {status === 'error' ? (
            <ChartEmpty height={296} label="FLOW DATA UNAVAILABLE" />
          ) : status !== 'ready' ? (
            <ChartEmpty height={296} label="REPLAYING ON-CHAIN FLOW…" />
          ) : candles.length < 2 ? (
            <ChartEmpty height={296} label={`NO PRICED ACTIVITY IN THE LAST ${days} DAYS`} />
          ) : (
            <CandleChart ohlc={candles} height={296} />
          )}

          <StatRail>
            {[
              ['30D VOL', formatUsd(sel.total_volume_usd_30d)],
              ['TX 30D', sel.tx_count_30d ?? '—'],
              ['SCORE', sel.smart_money_score != null ? `${Math.round(sel.smart_money_score * 100)}` : '—'],
              ['CHAIN', (sel.chain || '—').toUpperCase()],
              ['LAST ACTIVE', sel.last_active ? timeAgo(sel.last_active) : '—'],
            ].map(([k, v]) => (
              <span key={k} className="seg">
                <span className="k">{k}</span>
                <span className="v">{v}</span>
              </span>
            ))}
            <NextLink className="open" href={walletAnalysisHref(sel.address)} prefetch={false}>
              Full profile ›
            </NextLink>
          </StatRail>
        </>
      )}
    </TermPanel>
  )
}

// ── live signals feed ────────────────────────────────────────────────
function LiveSignals({ signals }) {
  if (!signals) return <Notice style={{ border: 'none' }}>LOADING FEED…</Notice>
  if (signals.length === 0) return <Notice style={{ border: 'none' }}>NO SIGNALS YET</Notice>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 384, overflowY: 'auto' }}>
      {signals.slice(0, 24).map((s, i) => {
        const buy = s.classification === 'BUY'
        const who = s.entity_name || shortenAddress(s.whale_address, 5)
        return (
          <div
            key={`${s.transaction_hash || s.whale_address}-${i}`}
            className={s._fresh ? 'sig-fresh' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0.42rem 0.7rem',
              borderBottom: '1px solid rgba(0, 229, 255, 0.04)',
              fontFamily: FONT_MONO,
              minWidth: 0,
            }}
          >
            <span style={{ width: 32, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.5px', color: buy ? C.green : C.red, flexShrink: 0 }}>
              {buy ? 'BUY' : 'SELL'}
            </span>
            <WalletLink
              href={walletAnalysisHref(s.whale_address)}
              prefetch={false}
              style={{ flex: 1, minWidth: 0, fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={`${who} — open profile`}
            >
              {who}
            </WalletLink>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: C.textPrimary, flexShrink: 0 }}>
              {s.token_symbol || '—'}
            </span>
            <span style={{ width: 60, textAlign: 'right', fontSize: '0.68rem', fontWeight: 600, color: buy ? C.green : C.red, flexShrink: 0 }}>
              {formatUsd(s.usd_value)}
            </span>
            <span style={{ width: 38, textAlign: 'right', fontSize: '0.58rem', color: C.textMuted, flexShrink: 0 }}>
              {timeAgo(s.timestamp).replace(' ago', '')}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── leaderboard ──────────────────────────────────────────────────────
function WhaleTable({ rows, sparks, selected, onSelect }) {
  return (
    <div style={{ overflow: 'auto', maxHeight: 420 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <Th>#</Th>
            <Th>Wallet</Th>
            <Th>Chain</Th>
            <Th>Score</Th>
            <Th $right>30d Vol</Th>
            <Th $right>Est PnL</Th>
            <Th $right>Tx 30d</Th>
            <Th>Tags</Th>
            <Th>7d</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.map((w, i) => {
            const sel = selected && selected.address === w.address
            const pnl = Number(w.pnl_estimated_usd)
            const spark = sparks ? sparks[w.address] : null
            return (
              <Tr key={w.address} $sel={sel} onClick={() => onSelect(w)}>
                <Td style={{ color: C.textMuted }}>{String(i + 1).padStart(2, '0')}</Td>
                <Td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ color: C.cyan, fontWeight: 600 }}>{shortenAddress(w.address, 5)}</span>
                  {w.entity_name ? (
                    <span style={{ color: C.textMuted, marginLeft: 8, fontSize: '0.64rem' }} title={w.entity_name}>
                      {w.entity_name.length > 26 ? `${w.entity_name.slice(0, 25)}…` : w.entity_name}
                    </span>
                  ) : null}
                </Td>
                <Td style={{ color: C.textMuted, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.6px' }}>
                  {w.chain || '—'}
                </Td>
                <Td><ScoreBar score={w.smart_money_score} /></Td>
                <Td style={{ textAlign: 'right' }}>{formatUsd(w.total_volume_usd_30d)}</Td>
                <Td style={{ textAlign: 'right', fontWeight: 700, color: !Number.isFinite(pnl) || pnl === 0 ? C.textMuted : pnl > 0 ? C.green : C.red }}>
                  {Number.isFinite(pnl) && pnl !== 0 ? fmtSigned(pnl) : '—'}
                </Td>
                <Td style={{ textAlign: 'right', color: C.textMuted }}>{w.tx_count_30d ?? '—'}</Td>
                <Td>
                  <span style={{ display: 'flex', gap: 4 }}>
                    {(Array.isArray(w.tags) ? w.tags : []).slice(0, 2).map((t) => <Tag key={t} tag={t} />)}
                  </span>
                </Td>
                <Td>
                  {spark && spark.some((v) => v > 0) ? (
                    <AreaSpark data={spark} width={70} height={18} />
                  ) : (
                    <span style={{ color: C.textMuted, fontSize: '0.6rem' }}>·</span>
                  )}
                </Td>
                <Td onClick={(e) => e.stopPropagation()}>
                  <WalletLink
                    href={walletAnalysisHref(w.address)}
                    prefetch={false}
                    style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}
                  >
                    Trace ›
                  </WalletLink>
                </Td>
              </Tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── module root ──────────────────────────────────────────────────────
export default function ResearchTerminal() {
  const [wallets, setWallets] = useState(null) // null=loading, []=empty
  const [total, setTotal] = useState(0)
  const [walletsError, setWalletsError] = useState(false)
  const [signals, setSignals] = useState(null)
  const [sparks, setSparks] = useState(null)
  const [sel, setSel] = useState(null)
  const seenTxRef = useRef(new Set())

  const loadWallets = useCallback(async () => {
    try {
      const res = await fetch(`/api/wallet-tracker?limit=${LEADERBOARD_LIMIT}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('leaderboard failed')
      const json = await res.json()
      const rows = Array.isArray(json.data) ? json.data : []
      setWallets(rows)
      setTotal(Number(json.total) || rows.length)
      setWalletsError(false)
      setSel((prev) => prev || rows[0] || null)
      if (rows.length > 0) {
        const addrs = rows.map((w) => w.address).join(',')
        fetch(`/api/wallet-tracker/sparklines?addresses=${encodeURIComponent(addrs)}`, { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => { if (j && typeof j === 'object') setSparks(j) })
          .catch(() => {})
      }
    } catch {
      setWalletsError(true)
      setWallets((prev) => prev || [])
    }
  }, [])

  const loadSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet-tracker/signals?limit=60', { cache: 'no-store' })
      if (!res.ok) throw new Error('signals failed')
      const json = await res.json()
      const rows = Array.isArray(json.data) ? json.data : []
      const seen = seenTxRef.current
      const marked = rows.map((r) => {
        const key = r.transaction_hash || `${r.whale_address}-${r.timestamp}`
        const fresh = seen.size > 0 && !seen.has(key)
        return { ...r, _fresh: fresh }
      })
      rows.forEach((r) => seen.add(r.transaction_hash || `${r.whale_address}-${r.timestamp}`))
      setSignals(marked)
    } catch {
      setSignals((prev) => prev || [])
    }
  }, [])

  useEffect(() => {
    loadWallets()
    loadSignals()
    const id = setInterval(loadSignals, SIGNAL_POLL_MS)
    return () => clearInterval(id)
  }, [loadWallets, loadSignals])

  // Buy/sell flow per chain from the live signal window.
  const flowRows = useMemo(() => {
    const rows = signals || []
    const map = new Map()
    for (const s of rows) {
      const chain = (s.blockchain || 'other').toLowerCase()
      const rec = map.get(chain) || { label: chain, inflow: 0, outflow: 0 }
      const usd = Math.abs(Number(s.usd_value) || 0)
      if (s.classification === 'BUY') rec.inflow += usd
      else rec.outflow += usd
      map.set(chain, rec)
    }
    return [...map.values()].sort((a, b) => b.inflow + b.outflow - (a.inflow + a.outflow)).slice(0, 6)
  }, [signals])

  const movers = useMemo(() => {
    const rows = wallets || []
    return [...rows]
      .filter((w) => Number.isFinite(Number(w.pnl_estimated_usd)) && Number(w.pnl_estimated_usd) !== 0)
      .sort((a, b) => Math.abs(Number(b.pnl_estimated_usd)) - Math.abs(Number(a.pnl_estimated_usd)))
      .slice(0, 5)
  }, [wallets])

  return (
    <div>
      <CommandBar />

      <MainGrid>
        <Col>
          <PortfolioPanel sel={sel} walletsLoading={wallets === null} />

          <TermPanel
            label="Whale leaderboard"
            meta={`top ${Math.min(LEADERBOARD_LIMIT, (wallets || []).length)} of ${total ? total.toLocaleString() : '…'} · by smart-money score · click to load`}
            live
          >
            {wallets === null ? (
              <Notice style={{ border: 'none' }}>SCANNING WALLETS…</Notice>
            ) : walletsError && wallets.length === 0 ? (
              <ErrorNotice style={{ border: 'none' }}>
                LEADERBOARD UNAVAILABLE
                <div style={{ marginTop: '0.6rem' }}>
                  <GhostButton type="button" onClick={loadWallets}>RETRY</GhostButton>
                </div>
              </ErrorNotice>
            ) : wallets.length === 0 ? (
              <Notice style={{ border: 'none' }}>NO TRACKED WALLETS YET</Notice>
            ) : (
              <WhaleTable rows={wallets} sparks={sparks} selected={sel} onSelect={setSel} />
            )}
          </TermPanel>
        </Col>

        <Col>
          <TermPanel label="Live signals" meta="auto · 30s" live>
            <LiveSignals signals={signals} />
          </TermPanel>

          <TermPanel
            label="Buy / sell flow"
            meta={signals && signals.length > 0 ? `last ${signals.length} signals · by chain` : 'by chain'}
            bodyStyle={{ padding: '0.7rem 0.8rem' }}
          >
            <FlowBars rows={flowRows} />
          </TermPanel>

          <TermPanel label="Top movers · est pnl">
            {movers.length === 0 ? (
              <Notice style={{ border: 'none' }}>
                {wallets === null ? 'LOADING…' : 'NO PNL DATA YET'}
              </Notice>
            ) : (
              <div>
                {movers.map((w) => {
                  const pnl = Number(w.pnl_estimated_usd)
                  const spark = sparks ? sparks[w.address] : null
                  return (
                    <div
                      key={w.address}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.42rem 0.7rem', borderBottom: '1px solid rgba(0, 229, 255, 0.04)', fontFamily: FONT_MONO, cursor: 'pointer', minWidth: 0 }}
                      onClick={() => setSel(w)}
                      title="Load in portfolio panel"
                    >
                      <span style={{ flex: 1, minWidth: 0, fontSize: '0.68rem', color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {w.entity_name || shortenAddress(w.address, 5)}
                      </span>
                      {spark && spark.some((v) => v > 0) ? <AreaSpark data={spark} width={66} height={18} /> : null}
                      <span style={{ width: 64, textAlign: 'right', fontSize: '0.68rem', fontWeight: 700, color: pnl >= 0 ? C.green : C.red, flexShrink: 0 }}>
                        {fmtSigned(pnl)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </TermPanel>
        </Col>
      </MainGrid>

      <style>{`
        .sig-fresh { animation: sig-in 0.4s ease-out; }
        @keyframes sig-in {
          from { background: rgba(0, 229, 255, 0.12); opacity: 0; transform: translateY(-4px); }
          to { background: transparent; opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}
