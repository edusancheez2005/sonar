'use client'
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import dynamic from 'next/dynamic'

const TokenIcon = dynamic(() => import('@/components/TokenIcon'), { ssr: false })
import SonarLoader from '@/components/wallet-tracker/SonarLoader'
import { useLivePoll } from '@/components/live/useLivePoll'
import { HealthChip, healthOf } from '@/components/live/HealthChip'
import { mergeRows, roundDownIso } from '@/components/live/mergeRows'
import { FONT_MONO, FONT_SANS } from '@/src/styles/fontStacks'

const MONO_FONT = FONT_MONO
const SANS_FONT = FONT_SANS
const COLORS = {
  cyan: '#00e5ff', green: '#00e676', red: '#ff1744', amber: '#ffab00',
  textPrimary: '#e0e6ed', textMuted: '#5a6a7a',
  panelBg: 'rgba(13, 17, 28, 0.8)', borderSubtle: 'rgba(0, 229, 255, 0.08)',
}

const StatisticsContainer = styled.div`
  min-height: 100vh;
  background: #0a0e17;
  padding: 2rem;
  position: relative;
`;

const Container = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const PageTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  font-family: ${MONO_FONT};
  flex-wrap: wrap;
`

const TitleText = styled.h1`
  font-family: ${SANS_FONT};
  font-size: 1.15rem;
  font-weight: 600;
  color: ${COLORS.textPrimary};
  margin: 0;
`

const NewPill = styled.button`
  display: block;
  margin: 0 auto 0.6rem;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  border: 1px solid ${COLORS.cyan};
  background: rgba(0, 229, 255, 0.08);
  color: ${COLORS.cyan};
  font-family: ${MONO_FONT};
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
`

const Panel = styled.div`
  background: ${COLORS.panelBg};
  backdrop-filter: blur(12px);
  border: 1px solid ${COLORS.borderSubtle};
  border-radius: 8px;
  padding: 1.5rem;
`

const Toolbar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  label {
    color: ${COLORS.textMuted};
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-family: ${SANS_FONT};
    padding-left: 0.1rem;
  }
`;

const PillInput = styled.input`
  background: rgba(10, 14, 23, 0.9);
  border: 1px solid ${COLORS.borderSubtle};
  color: ${COLORS.textPrimary};
  padding: 0.55rem 0.75rem;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s ease;
  font-size: 0.85rem;
  font-family: ${MONO_FONT};
  height: 36px;
  &::placeholder { color: ${COLORS.textMuted}; opacity: 0.5; }
  &:focus { border-color: ${COLORS.cyan}; box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.08); }
`;

const PillSelect = styled.select`
  appearance: none;
  background: rgba(10, 14, 23, 0.9);
  border: 1px solid ${COLORS.borderSubtle};
  color: ${COLORS.textPrimary};
  padding: 0.55rem 2rem 0.55rem 0.75rem;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s ease;
  font-size: 0.85rem;
  font-family: ${MONO_FONT};
  height: 36px;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 20 20'%3E%3Cpath fill='%2300e5ff' d='M5.5 7l4.5 6 4.5-6z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  &:focus { border-color: ${COLORS.cyan}; box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.08); }
  option { background: #0a0e17; color: ${COLORS.textPrimary}; }
`;

const Presets = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
  align-items: center;
  justify-content: space-between;
  
  .preset-group {
    display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center;
  }
  
  button.preset {
    background: transparent;
    color: ${COLORS.textMuted};
    border: 1px solid ${COLORS.borderSubtle};
    border-radius: 4px;
    padding: 0.4rem 0.85rem;
    font-weight: 600;
    font-size: 0.8rem;
    font-family: ${MONO_FONT};
    cursor: pointer;
    transition: all 0.15s ease;
    
    &:hover { border-color: rgba(0, 229, 255, 0.2); color: ${COLORS.textPrimary}; }
    
    &.active {
      background: rgba(0, 229, 255, 0.15);
      color: ${COLORS.cyan};
      border-color: rgba(0, 229, 255, 0.3);
    }
  }
`;

const GhostButton = styled.button`
  background: transparent;
  color: ${props => props.$danger ? COLORS.red : COLORS.cyan};
  border: 1px solid ${props => props.$danger ? 'rgba(255, 23, 68, 0.2)' : COLORS.borderSubtle};
  border-radius: 4px;
  padding: 0.4rem 0.85rem;
  font-weight: 600;
  font-size: 0.8rem;
  font-family: ${MONO_FONT};
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex; align-items: center; gap: 0.4rem;
  
  &:hover { border-color: ${props => props.$danger ? 'rgba(255, 23, 68, 0.4)' : 'rgba(0, 229, 255, 0.3)'}; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  
  svg { width: 14px; height: 14px; }
`;

const DataTable = styled.div`
  width: 100%; overflow-x: auto;
  table { width: 100%; border-collapse: collapse; font-family: ${MONO_FONT}; }
  thead th {
    padding: 0.75rem 1rem; text-align: left; font-size: 0.72rem; font-weight: 600;
    color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 0.06em;
    border-bottom: 1px solid rgba(0, 229, 255, 0.06); background: rgba(0, 229, 255, 0.02);
    white-space: nowrap; font-family: ${SANS_FONT};
  }
  thead th.right { text-align: right; }
  tbody tr.is-new td { background: rgba(0, 229, 255, 0.07); }
  tbody tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    transition: background 0.15s ease; cursor: default;
  }
  tbody tr:hover { background: rgba(0, 229, 255, 0.04); }
  tbody td {
    padding: 0.75rem 1rem; font-size: 0.88rem; color: ${COLORS.textPrimary}; white-space: nowrap;
  }
  tbody td.right { text-align: right; }
  tbody td.muted { color: ${COLORS.textMuted}; }
  a { color: ${COLORS.cyan}; text-decoration: none; font-weight: 600; }
  a:hover { text-decoration: underline; }
`

const Badge = styled.span`
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.7rem;
  font-family: ${MONO_FONT};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &.buy { color: ${COLORS.green}; background: rgba(0, 230, 118, 0.08); border: 1px solid rgba(0, 230, 118, 0.12); }
  &.sell { color: ${COLORS.red}; background: rgba(255, 23, 68, 0.08); border: 1px solid rgba(255, 23, 68, 0.12); }
  &.transfer { color: ${COLORS.cyan}; background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.12); }
  &.defi { color: ${COLORS.amber}; background: rgba(255, 171, 0, 0.08); border: 1px solid rgba(255, 171, 0, 0.12); }
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${COLORS.borderSubtle};
  font-family: ${MONO_FONT};
  font-size: 0.8rem;
  color: ${COLORS.textMuted};
`;

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } }
}

// Statistics checks for new trades every 3 s (the since route is edge-cached
// for 2 s, so every check can see a new row); ages tick every second.
const STATS_POLL_MS = 3_000
const RESYNC_EVERY = 20 // a full page read (rows + exact count) once a minute

function ago(ts, nowMs) {
  const t = typeof ts === 'number' ? ts : Date.parse(ts)
  const s = Math.max(0, Math.round((nowMs - t) / 1000))
  if (!Number.isFinite(s)) return ''
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

function clock(ts) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const today = new Date().toDateString() === d.toDateString()
  return today ? time : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
}

const rowVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.2, delay: i * 0.03, ease: [0.25, 0.46, 0.45, 0.94] }
  })
}

export default function Statistics() {
  const [sinceHours, setSinceHours] = useState(24)
  const [minUsd, setMinUsd] = useState('')
  const [maxUsd, setMaxUsd] = useState('')
  const [token, setToken] = useState('')
  const [side, setSide] = useState('')
  const [chain, setChain] = useState('')
  const [chains, setChains] = useState([])
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [isPremium, setIsPremium] = useState(true) // All features unlocked
  const [whisperData, setWhisperData] = useState(null)

  // Whale Whisper drops open on every visit, half a second after it appears,
  // so it is obvious the panel can be hidden (Eduardo, 2026-10-25).
  const [whisperCollapsed, setWhisperCollapsed] = useState(true)
  const hasWhisper = Boolean(whisperData?.narrative)
  useEffect(() => {
    if (!hasWhisper) return
    const t = setTimeout(() => setWhisperCollapsed(false), 500)
    return () => clearTimeout(t)
  }, [hasWhisper])
  const toggleWhisper = () => setWhisperCollapsed((c) => !c)

  const debounceRef = useRef(null)
  const fetchSeqRef = useRef(0)
  const newestRef = useRef(null) // ms of the newest row seen, for `after`
  const hoverRef = useRef(false)
  const pollCountRef = useRef(0)
  const flashTimerRef = useRef(null)
  const [buffer, setBuffer] = useState([])
  const [flash, setFlash] = useState(new Set())
  const [now, setNow] = useState(() => Date.now())

  // Live updates every 3 s, paused while the tab is hidden: rows newer than
  // the newest one on screen, and every 20th poll (once a minute) the whole
  // page instead — a quiet resync of rows and the exact count.
  const live = useLivePoll((signal) => {
    pollCountRef.current += 1
    const params = filterParams()
    params.set('limit', '100')
    if (pollCountRef.current % RESYNC_EVERY === 0) {
      params.set('page', String(page))
      return fetch(`/api/trades?${params.toString()}`, { signal, cache: 'no-store' })
    }
    params.set('after', roundDownIso(newestRef.current ?? Date.now() - 10 * 60_000))
    return fetch(`/api/trades/since?${params.toString()}`, { signal })
  }, { intervalMs: STATS_POLL_MS })

  useEffect(() => {
    const body = live.data
    if (!body || loading) return
    bumpNewest(body.newest_ts)
    if (typeof body.page === 'number') {
      // Resync: never reorder rows under the pointer; the count is always safe.
      if (typeof body.count === 'number' || body.count === null) setTotal(body.count)
      if (body.page !== page || hoverRef.current) return
      const before = new Set(rows.map((r) => r.transaction_hash))
      setRows(body.data || [])
      setBuffer([])
      flashRows((body.data || []).map((r) => r.transaction_hash).filter((h) => !before.has(h)))
      return
    }
    const onScreen = new Set(rows.map((r) => r.transaction_hash))
    const incoming = (body.data || []).filter((r) => !onScreen.has(r.transaction_hash))
    if (!incoming.length && !(buffer.length && page === 1 && !hoverRef.current)) return
    if (page === 1 && !hoverRef.current) {
      const { rows: merged, newIds } = mergeRows(rows, [...buffer, ...incoming], 100)
      setRows(merged)
      setTotal((t) => (t == null ? t : t + newIds.length))
      setBuffer([])
      flashRows(newIds)
    } else {
      setBuffer((b) => mergeRows(b, incoming, 100).rows)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.data])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const health = healthOf({
    newestAt: newestRef.current,
    now: now + (live.offsetMs || 0),
    lastPollOkAt: live.lastFetchedAt,
    intervalMs: STATS_POLL_MS,
    consecutiveFailures: live.consecutiveFailures,
  })
  const prevFiltersRef = useRef({ token:'', side:'', chain:'', minUsd:'', maxUsd:'', sinceHours:24 })

  // Fetch Whale Whisper
  useEffect(() => {
    fetch('/api/dashboard/whale-whisper').then(r => r.json()).then(d => {
      if (d?.whisper) setWhisperData(d.whisper)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    async function loadChains() {
      const res = await fetch(`/api/trades/chains?sinceHours=168`, { cache: 'no-store' })
      const { data } = await res.json()
      setChains(data || [])
    }
    loadChains()
  }, [])

  function filterParams() {
    const params = new URLSearchParams()
    params.set('sinceHours', String(sinceHours))
    if (minUsd) params.set('minUsd', String(minUsd))
    if (maxUsd) params.set('maxUsd', String(maxUsd))
    if (token) params.set('token', token)
    if (side) params.set('side', side)
    if (chain) params.set('chain', chain)
    return params
  }

  // Full reads with the loader: first load, filter and page changes.
  async function fetchTrades(p = 1) {
    const seq = ++fetchSeqRef.current
    setLoading(true)
    const params = filterParams()
    params.set('page', String(p))
    params.set('limit', '100')
    try {
      const res = await fetch(`/api/trades?${params.toString()}`, { cache: 'no-store' })
      const json = await res.json()
      if (seq !== fetchSeqRef.current) return
      if (res.ok) {
        setRows(json.data || [])
        setTotal(typeof json.count === 'number' ? json.count : null)
        setPage(json.page || p)
        setBuffer([])
        bumpNewest(json.newest_ts)
      }
    } catch { /* keep the rows on screen */ }
    if (seq === fetchSeqRef.current) setLoading(false)
  }

  function bumpNewest(ts) {
    const t = ts ? Date.parse(ts) : NaN
    if (Number.isFinite(t) && (newestRef.current == null || t > newestRef.current)) newestRef.current = t
  }

  function flashRows(ids) {
    if (!ids.length) return
    setFlash(new Set(ids))
    clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setFlash(new Set()), 2000)
  }

  function showBuffered() {
    if (page !== 1) { fetchTrades(1); return }
    const { rows: merged, newIds } = mergeRows(rows, buffer, 100)
    setRows(merged)
    setTotal((t) => (t == null ? t : t + newIds.length))
    setBuffer([])
    flashRows(newIds)
  }

  async function exportToCSV() {
    // Check if user is premium
    if (false) { // All features now free
      alert('CSV Export is a premium feature. Please upgrade to Pro to export data.')
      window.location.href = '/subscribe'
      return
    }
    
    setExporting(true)
    try {
      // The first 100 rows of the current filters (one page of /api/trades).
      const params = new URLSearchParams()
      params.set('sinceHours', String(sinceHours))
      if (minUsd) params.set('minUsd', String(minUsd))
      if (maxUsd) params.set('maxUsd', String(maxUsd))
      if (token) params.set('token', token)
      if (side) params.set('side', side)
      if (chain) params.set('chain', chain)
      params.set('limit', '100')
      params.set('page', '1')
      
      const res = await fetch(`/api/trades?${params.toString()}`, { cache: 'no-store' })
      const json = await res.json()
      const data = json.data || []
      
      if (data.length === 0) {
        alert('No data to export with current filters')
        return
      }
      
      // Create CSV content
      const headers = ['Time', 'Token', 'Type', 'USD Value', 'Blockchain', 'Whale Score', 'From Address', 'Transaction Hash']
      const csvRows = [headers.join(',')]
      
      data.forEach(row => {
        const values = [
          `"${new Date(row.timestamp).toLocaleString()}"`,
          row.token_symbol || '',
          (row.classification || '').toUpperCase(),
          Number(row.usd_value || 0).toFixed(2),
          row.blockchain || '',
          row.whale_score || 0,
          row.from_address || '',
          row.transaction_hash || ''
        ]
        csvRows.push(values.join(','))
      })
      
      // Download CSV
      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      const filename = `sonar_whale_transactions_${new Date().toISOString().split('T')[0]}.csv`
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export CSV. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    const init = async () => {
    try {
      const params = new URLSearchParams(window.location.search)
      const qToken = params.get('token')
      const qSince = params.get('sinceHours')
      if (qToken) setToken(qToken.toUpperCase())
      if (qSince && !Number.isNaN(Number(qSince))) setSinceHours(Number(qSince))
    } catch {}
      
      // Check premium status
      try {
        const sb = supabaseBrowser()
        const { data: { session } } = await sb.auth.getSession()
        if (session?.user) {
          // Admin emails always get premium UX (no paywalls).
          const email = (session.user.email || '').toLowerCase().trim()
          const { isAdmin } = await import('@/app/lib/adminConfig')
          if (isAdmin(email)) {
            setIsPremium(true)
          } else {
            const { data: profile } = await sb
              .from('profiles')
              .select('plan')
              .eq('id', session.user.id)
              .single()
            const plan = profile?.plan
            setIsPremium(plan === 'premium' || plan === 'pro')
          }
        }
      } catch (err) {
        console.error('Error checking premium status:', err)
      }
    }
    init()
  }, [])

  // Debounced refetch on changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchTrades(1), 250)
    return () => clearTimeout(debounceRef.current)
  }, [token, side, chain, sinceHours, minUsd, maxUsd])

  const preset = (h) => { setSinceHours(h) }
  const reset = () => { setSinceHours(24); setMinUsd(''); setMaxUsd(''); setToken(''); setSide(''); setChain('') }
  
  return (
    <StatisticsContainer>
      <Container>
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <PageTitle>
          <TitleText>Market Statistics</TitleText>
          {newestRef.current != null && <HealthChip
            health={health}
            testId="statistics-health"
            title={`Newest trade matching your filters: ${new Date(newestRef.current).toISOString().slice(11, 19)} UTC`}
          />}
          {page > 1
            ? <span style={{ fontSize: '0.72rem', color: COLORS.textMuted }}>live updates paused on page {page}</span>
            : newestRef.current && <span style={{ fontSize: '0.75rem', color: COLORS.textMuted, fontFamily: MONO_FONT }} data-testid="statistics-newest">newest trade {ago(newestRef.current, now + (live.offsetMs || 0))}</span>}
        </PageTitle>
      </motion.div>

      {/* Whale Whisper — AI Market Narrative */}
      {whisperData?.narrative && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem', background: 'rgba(13, 17, 28, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0, 229, 255, 0.08)', borderRadius: '8px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: whisperData.market_bias === 'bullish' ? '#00e676' : whisperData.market_bias === 'bearish' ? '#ff1744' : '#00e5ff' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: whisperCollapsed ? 0 : '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              <span style={{ fontSize: '1.02rem', fontWeight: 600, color: '#e0e6ed' }}>Whale Whisper</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{
                padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
                fontFamily: MONO_FONT, letterSpacing: '0.5px', textTransform: 'uppercase',
                background: whisperData.market_bias === 'bullish' ? 'rgba(0,230,118,0.1)' : whisperData.market_bias === 'bearish' ? 'rgba(255,23,68,0.1)' : 'rgba(0,229,255,0.06)',
                color: whisperData.market_bias === 'bullish' ? '#00e676' : whisperData.market_bias === 'bearish' ? '#ff1744' : '#00e5ff',
                border: `1px solid ${whisperData.market_bias === 'bullish' ? 'rgba(0,230,118,0.2)' : whisperData.market_bias === 'bearish' ? 'rgba(255,23,68,0.2)' : 'rgba(0,229,255,0.1)'}`,
              }}>{whisperData.market_bias === 'bullish' ? 'NET INFLOW' : whisperData.market_bias === 'bearish' ? 'NET OUTFLOW' : 'BALANCED'}</span>
              <span style={{ fontSize: '0.72rem', color: '#5a6a7a', fontFamily: MONO_FONT }}>{whisperData.confidence}%</span>
              <span style={{ fontSize: '0.72rem', color: '#5a6a7a', fontFamily: MONO_FONT }} title={new Date(whisperData.created_at).toLocaleString()}>
                {new Date(whisperData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {ago(whisperData.created_at, now)}
              </span>
              <button
                type="button"
                aria-expanded={!whisperCollapsed}
                aria-label={whisperCollapsed ? 'Expand Whale Whisper' : 'Collapse Whale Whisper'}
                onClick={toggleWhisper}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0,
                  padding: '0.34rem 0.85rem', borderRadius: 999,
                  border: '1px solid rgba(0,229,255,0.3)', background: 'rgba(0,229,255,0.08)',
                  color: '#00e5ff', cursor: 'pointer', whiteSpace: 'nowrap',
                  fontSize: '0.78rem', fontWeight: 700, lineHeight: 1, fontFamily: SANS_FONT,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.16)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)' }}
              >
                {whisperCollapsed ? '▸ Show' : '▾ Hide'}
              </button>
            </div>
          </div>
          {/* Narrative with highlighted keywords and staggered paragraphs */}
          <AnimatePresence initial={false}>
          {!whisperCollapsed && <motion.div key="whisper-body"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }, opacity: { duration: 0.35 } }}
            style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: '0.875rem', lineHeight: 1.65, color: '#c0cad6' }}>
            {whisperData.narrative.split('\n\n').filter(Boolean).map((para, idx) => (
              <motion.p key={idx} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 + idx * 0.2 }}
                style={{ margin: idx > 0 ? '0.75rem 0 0' : 0, padding: '0.5rem 0.75rem', borderLeft: `2px solid ${idx === 0 ? 'rgba(0,229,255,0.3)' : idx === whisperData.narrative.split('\n\n').filter(Boolean).length - 1 ? (whisperData.market_bias === 'bullish' ? 'rgba(0,230,118,0.4)' : whisperData.market_bias === 'bearish' ? 'rgba(255,23,68,0.4)' : 'rgba(0,229,255,0.3)') : 'rgba(255,255,255,0.06)'}`, borderRadius: '0 4px 4px 0', background: idx === 0 ? 'rgba(0,229,255,0.02)' : 'transparent' }}
                dangerouslySetInnerHTML={{ __html: para
                  .replace(/(\$[\d,.]+[BKMTX]?)/g, '<span style="color:#00e5ff;font-weight:700">$1</span>')
                  .replace(/(\+[\d.]+%|-[\d.]+%)/g, (m) => `<span style="color:${m.startsWith('+') ? '#00e676' : '#ff1744'};font-weight:700">${m}</span>`)
                  .replace(/(STRONG BUY|BUY|SELL|STRONG SELL|NEUTRAL)/g, (m) => {
                    // Map raw DB-enum signal labels to neutral display labels.
                    // See LEGAL_AUDIT_2026-04-21.md — do NOT render BUY/SELL verbatim.
                    const displayMap = { 'STRONG BUY': 'STRONG INFLOW', 'BUY': 'INFLOW', 'NEUTRAL': 'NEUTRAL', 'SELL': 'OUTFLOW', 'STRONG SELL': 'STRONG OUTFLOW' }
                    const display = displayMap[m] || m
                    const c = display.includes('INFLOW') ? '#00e676' : display.includes('OUTFLOW') ? '#ff1744' : '#ffab00'
                    return `<span style="color:${c};font-weight:700;padding:0.1rem 0.3rem;border-radius:3px;background:${c}11;border:1px solid ${c}33;font-size:0.72rem">${display}</span>`
                  })
                  .replace(/\b(BTC|ETH|SOL|XRP|DOGE|ADA|PEPE|LINK|BNB|AVAX)\b/g, '<span style="color:#e0e6ed;font-weight:700">$1</span>')
                  .replace(/(BULLISH|BEARISH|NEUTRAL)/g, (m) => {
                    // Map directional adjectives to neutral flow labels.
                    const displayMap = { 'BULLISH': 'NET INFLOW', 'BEARISH': 'NET OUTFLOW', 'NEUTRAL': 'BALANCED' }
                    const display = displayMap[m] || m
                    const c = display === 'NET INFLOW' ? '#00e676' : display === 'NET OUTFLOW' ? '#ff1744' : '#ffab00'
                    return `<span style="color:${c};font-weight:800;letter-spacing:0.5px">${display}</span>`
                  })
                }} />
            ))}
          </div>
          {whisperData.summary && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(0,229,255,0.06)', fontSize: '0.8rem', color: '#8a9ab0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              {whisperData.summary}
            </motion.div>
          )}
          </motion.div>}
          </AnimatePresence>
        </motion.div>
      )}

      <Panel>
        <Presets>
          <div className="preset-group">
            <button type="button" className={`preset ${sinceHours===1?'active':''}`} onClick={()=>preset(1)}>1H</button>
            <button type="button" className={`preset ${sinceHours===6?'active':''}`} onClick={()=>preset(6)}>6H</button>
            <button type="button" className={`preset ${sinceHours===24?'active':''}`} onClick={()=>preset(24)}>24H</button>
            <button type="button" className={`preset ${sinceHours===72?'active':''}`} onClick={()=>preset(72)}>3D</button>
            <button type="button" className={`preset ${sinceHours===168?'active':''}`} onClick={()=>preset(168)}>7D</button>
            <GhostButton $danger type="button" onClick={reset}>RESET</GhostButton>
          </div>
          {isPremium && (
          <GhostButton
            type="button"
            onClick={exportToCSV}
            title="Exports the first 100 rows of the current filters"
            disabled={exporting || loading || rows.length === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exporting ? 'EXPORTING...' : 'EXPORT CSV'}
          </GhostButton>
          )}
        </Presets>

        <Toolbar>
          <Field>
            <label>Token</label>
            <PillInput placeholder="e.g. BTC" value={token} onChange={(e)=>setToken(e.target.value.toUpperCase())} />
          </Field>
          <Field>
            <label>Side</label>
            <PillSelect value={side} onChange={(e)=>setSide(e.target.value)}>
              <option value="">All</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
              <option value="transfer">Transfer</option>
            </PillSelect>
          </Field>
          <Field>
            <label>Chain</label>
            <PillSelect value={chain} onChange={(e)=>setChain(e.target.value)}>
              <option value="">All</option>
              {chains.map(c => (<option key={c} value={c}>{c}</option>))}
            </PillSelect>
          </Field>
          <Field>
            <label>Min USD</label>
            <PillInput type="number" min="0" placeholder="0" value={minUsd} onChange={(e)=>setMinUsd(e.target.value)} />
          </Field>
          <Field>
            <label>Max USD</label>
            <PillInput type="number" min="0" placeholder="Any" value={maxUsd} onChange={(e)=>setMaxUsd(e.target.value)} />
          </Field>
          <Field>
            <label>Since (hours)</label>
            <PillInput type="number" min="1" max="720" value={sinceHours} onChange={(e)=>setSinceHours(Math.min(Math.max(Number(e.target.value) || 1, 1), 720))} />
          </Field>
        </Toolbar>

        <div>
          {loading ? (
            <SonarLoader text="Scanning transactions..." size={60} compact />
          ) : (
            <>
              {buffer.length > 0 && (
                <NewPill type="button" onClick={showBuffered} data-testid="statistics-new-pill">
                  {buffer.length} new {buffer.length === 1 ? 'trade' : 'trades'} — show
                </NewPill>
              )}
              {live.consecutiveFailures >= 3 && (
                <div style={{ marginBottom: '0.6rem', fontSize: '0.78rem', color: COLORS.textMuted }}>
                  Live updates are not reaching us right now; the table shows the last rows we received.{' '}
                  <Link href={`/ai-advisor?q=${encodeURIComponent('What are the largest whale trades in the last hour?')}&send=1`} style={{ color: COLORS.cyan }}>Ask ORCA</Link>
                </div>
              )}
              <DataTable onMouseEnter={() => { hoverRef.current = true }} onMouseLeave={() => { hoverRef.current = false }}>
              <table>
              <thead>
                <tr>
                    <th>Time</th>
                    <th>Token</th>
                    <th>Side</th>
                    <th className="right">USD</th>
                    <th>Chain</th>
                    <th>Whale</th>
                    <th className="right">Score</th>
                </tr>
              </thead>
              <tbody>
                  {(isPremium ? rows : rows.slice(0, 50)).map((t, idx) => (
                    <motion.tr key={t.transaction_hash} custom={idx} variants={rowVariant} initial="hidden" animate="visible" className={flash.has(t.transaction_hash) ? 'is-new' : undefined}>
                      <td className="muted" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {clock(t.timestamp)}
                        <span style={{ marginLeft: '0.5rem', color: COLORS.cyan, opacity: 0.8 }}>{ago(t.timestamp, now + (live.offsetMs || 0))}</span>
                      </td>
                      <td>
                        <Link href={`/token/${encodeURIComponent(t.token_symbol || '-')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <TokenIcon symbol={t.token_symbol} size={18} />
                          {t.token_symbol || '-'}
                        </Link>
                      </td>
                      <td><Badge className={(t.classification||'').toLowerCase()}>{(t.classification||'-').toUpperCase()}</Badge></td>
                      <td className="right" style={{ fontWeight: 700, color: (t.classification||'').toLowerCase() === 'buy' ? COLORS.green : (t.classification||'').toLowerCase() === 'sell' ? COLORS.red : COLORS.textPrimary }}>
                        ${Math.round(Number(t.usd_value||0)).toLocaleString()}
                      </td>
                      <td className="muted">{t.blockchain}</td>
                      <td><Link href={`/whale/${encodeURIComponent(t.from_address || '-')}`}>{t.from_address?.slice(0,6)}…{t.from_address?.slice(-4)}</Link></td>
                      <td className="right" style={{ fontWeight: 600, color: COLORS.cyan }}>{t.whale_score ?? '-'}</td>
                    </motion.tr>
                  ))}
              </tbody>
              </table>
              </DataTable>
              {!isPremium && rows.length > 50 && (
                <div style={{
                  textAlign: 'center', padding: '1rem', marginTop: '0.5rem',
                  background: 'rgba(0, 229, 255, 0.03)', border: `1px solid ${COLORS.borderSubtle}`,
                  borderRadius: '4px', fontFamily: SANS_FONT, fontSize: '0.8rem', color: COLORS.textMuted
                }}>
                  Showing 50 of {total == null ? 'many' : total.toLocaleString()} transactions.
                  <a href="/subscribe" style={{ color: COLORS.cyan, marginLeft: '0.4rem', fontWeight: 600, textDecoration: 'underline' }}>
                    Upgrade for full data + CSV export
                  </a>
                </div>
              )}
              <Pagination>
                <GhostButton type="button" onClick={()=>fetchTrades(Math.max(1, page-1))}>← PREV</GhostButton>
                <span style={{ fontFamily: MONO_FONT }}>Page {page} · {total == null ? `first ${rows.length} rows` : `${total.toLocaleString()} txns`}</span>
                <GhostButton type="button" onClick={()=>fetchTrades(page+1)}>NEXT →</GhostButton>
              </Pagination>
            </>
            )}
          </div>
      </Panel>
      </Container>
    </StatisticsContainer>
  );
} 