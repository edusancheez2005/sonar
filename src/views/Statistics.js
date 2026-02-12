'use client'
import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import Link from 'next/link'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import dynamic from 'next/dynamic'

const TokenIcon = dynamic(() => import('@/components/TokenIcon'), { ssr: false })

const MONO_FONT = "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace"
const SANS_FONT = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
const COLORS = {
  cyan: '#00e5ff', green: '#00e676', red: '#ff1744', amber: '#ffab00',
  textPrimary: '#e0e6ed', textMuted: '#5a6a7a',
  panelBg: 'rgba(13, 17, 28, 0.8)', borderSubtle: 'rgba(0, 229, 255, 0.08)',
}

const pulseGlow = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 4px #00e676; }
  50% { opacity: 0.4; box-shadow: 0 0 8px #00e676, 0 0 16px rgba(0, 230, 118, 0.3); }
`

const StatisticsContainer = styled.div`
  min-height: 100vh;
  background: #0a0e17;
  padding: 2rem;
  position: relative;

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 229, 255, 0.008) 2px, rgba(0, 229, 255, 0.008) 4px);
    pointer-events: none;
    z-index: 0;
  }
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
  font-family: ${MONO_FONT};
  font-size: 0.9rem;
  font-weight: 700;
  color: ${COLORS.cyan};
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin: 0;
  &::before { content: '> '; color: ${COLORS.green}; font-weight: 800; }
`

const LiveDot = styled.span`
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.7rem; font-weight: 600; color: ${COLORS.green};
  text-transform: uppercase; letter-spacing: 1px; font-family: ${MONO_FONT};
  &::before {
    content: ''; width: 7px; height: 7px; border-radius: 50%;
    background: ${COLORS.green}; animation: ${pulseGlow} 2s ease-in-out infinite;
  }
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
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 1.5px;
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
    font-size: 0.75rem;
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
  font-size: 0.75rem;
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
    padding: 0.75rem 1rem; text-align: left; font-size: 0.7rem; font-weight: 600;
    color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 1px;
    border-bottom: 1px solid rgba(0, 229, 255, 0.06); background: rgba(0, 229, 255, 0.02);
    white-space: nowrap; font-family: ${SANS_FONT};
  }
  thead th.right { text-align: right; }
  tbody tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    transition: background 0.15s ease; cursor: default;
  }
  tbody tr:hover { background: rgba(0, 229, 255, 0.04); }
  tbody td {
    padding: 0.65rem 1rem; font-size: 0.8rem; color: ${COLORS.textPrimary}; white-space: nowrap;
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
  const [isPremium, setIsPremium] = useState(false)

  const debounceRef = useRef(null)
  const prevFiltersRef = useRef({ token:'', side:'', chain:'', minUsd:'', maxUsd:'', sinceHours:24 })

  useEffect(() => {
    async function loadChains() {
      const res = await fetch(`/api/trades/chains?sinceHours=168`, { cache: 'no-store' })
      const { data } = await res.json()
      setChains(data || [])
    }
    loadChains()
  }, [])

  async function fetchTrades(p = 1) {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('sinceHours', String(sinceHours))
    if (minUsd) params.set('minUsd', String(minUsd))
    if (maxUsd) params.set('maxUsd', String(maxUsd))
    if (token) params.set('token', token)
    if (side) params.set('side', side)
    if (chain) params.set('chain', chain)
    params.set('page', String(p))
    params.set('limit', '200')
    const res = await fetch(`/api/trades?${params.toString()}`, { cache: 'no-store' })
    const json = await res.json()
    if (res.ok) { setRows(json.data || []); setTotal(json.count || 0); setPage(json.page || p) }
    setLoading(false)
  }

  async function exportToCSV() {
    // Check if user is premium
    if (!isPremium) {
      alert('CSV Export is a premium feature. Please upgrade to Pro to export data.')
      window.location.href = '/subscribe'
      return
    }
    
    setExporting(true)
    try {
      // Fetch up to 10,000 records for export
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
      const csvContent = csvRows.join('\\n')
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
          const { data: profile } = await sb
            .from('profiles')
            .select('plan')
            .eq('id', session.user.id)
            .single()
          setIsPremium(profile?.plan === 'premium')
        }
      } catch (err) {
        console.error('Error checking premium status:', err)
      }
      
    fetchTrades(1)
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
          <TitleText>MARKET_STATISTICS</TitleText>
          <LiveDot>LIVE</LiveDot>
        </PageTitle>
      </motion.div>

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
            disabled={exporting || loading || rows.length === 0}
            title="Export CSV"
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
            <PillInput type="number" min="0" value={sinceHours} onChange={(e)=>setSinceHours(Number(e.target.value))} />
          </Field>
        </Toolbar>

        <div>
          {loading ? (
            <motion.p
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ color: COLORS.textMuted, fontFamily: MONO_FONT, fontSize: '0.85rem', padding: '2rem', textAlign: 'center' }}
            >
              Loading transactions...
            </motion.p>
          ) : (
            <>
              <DataTable>
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
                  {(isPremium ? rows : rows.slice(0, 25)).map((t, idx) => (
                    <motion.tr key={t.transaction_hash} custom={idx} variants={rowVariant} initial="hidden" animate="visible">
                      <td className="muted" style={{ fontSize: '0.75rem' }}>{new Date(t.timestamp).toLocaleString()}</td>
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
              {!isPremium && rows.length > 25 && (
                <div style={{
                  textAlign: 'center', padding: '1rem', marginTop: '0.5rem',
                  background: 'rgba(0, 229, 255, 0.03)', border: `1px solid ${COLORS.borderSubtle}`,
                  borderRadius: '4px', fontFamily: SANS_FONT, fontSize: '0.8rem', color: COLORS.textMuted
                }}>
                  Showing 25 of {total.toLocaleString()} transactions.
                  <a href="/subscribe" style={{ color: COLORS.cyan, marginLeft: '0.4rem', fontWeight: 600, textDecoration: 'underline' }}>
                    Upgrade for full data + CSV export
                  </a>
                </div>
              )}
              <Pagination>
                <GhostButton type="button" onClick={()=>fetchTrades(Math.max(1, page-1))}>← PREV</GhostButton>
                <span style={{ fontFamily: MONO_FONT }}>Page {page} · {total.toLocaleString()} txns</span>
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