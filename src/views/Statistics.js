'use client'
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import PageHeader from '../components/PageHeader';
import Link from 'next/link'

const StatisticsContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1621 0%, #0f1922 50%, #0a1621 100%);
  padding: 2rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(54, 166, 186, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(46, 204, 113, 0.06) 0%, transparent 50%);
    pointer-events: none;
  }
`;

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const Toolbar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  label {
    color: var(--primary);
    font-size: 0.85rem;
    font-weight: 600;
    padding-left: 0.25rem;
  }
`;

const PillInput = styled.input`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  color: var(--text-primary);
  padding: 0.75rem 1rem;
  border-radius: 12px;
  outline: none;
  transition: all 0.3s ease;
  font-size: 0.95rem;
  
  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
  }
  
  &:hover {
    border-color: rgba(54, 166, 186, 0.4);
  }
  
  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(54, 166, 186, 0.15);
  }
`;

const PillSelect = styled.select`
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  color: var(--text-primary);
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  border-radius: 12px;
  outline: none;
  transition: all 0.3s ease;
  font-size: 0.95rem;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath fill='%2336a6ba' d='M5.5 7l4.5 6 4.5-6z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 20px;
  
  &:hover {
    border-color: rgba(54, 166, 186, 0.4);
  }
  
  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(54, 166, 186, 0.15);
  }
  
  option {
    background: rgba(13, 33, 52, 1);
    color: var(--text-primary);
  }
`;

const Button = styled.button`
  background: ${({ variant }) => 
    variant === 'danger' ? 'rgba(231, 76, 60, 0.15)' : 
    'linear-gradient(135deg, #36a6ba 0%, #2ecc71 100%)'};
  color: ${({ variant }) => variant === 'danger' ? '#e74c3c' : 'white'};
  border: 1px solid ${({ variant }) => 
    variant === 'danger' ? 'rgba(231, 76, 60, 0.4)' : 
    'var(--primary)'};
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${({ variant }) => 
    variant === 'danger' ? 'none' : 
    '0 4px 12px rgba(54, 166, 186, 0.3)'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ variant }) => 
      variant === 'danger' ? '0 4px 12px rgba(231, 76, 60, 0.3)' : 
      '0 8px 16px rgba(54, 166, 186, 0.4)'};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const Presets = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
  
  button {
    background: rgba(30, 57, 81, 0.4);
    color: var(--text-secondary);
    border: 1px solid rgba(54, 166, 186, 0.2);
    border-radius: 8px;
    padding: 0.6rem 1.2rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      border-color: rgba(54, 166, 186, 0.4);
      color: var(--text-primary);
      transform: translateY(-2px);
    }
    
    &.active {
      background: var(--primary);
      color: #0a1621;
      border-color: var(--primary);
      box-shadow: 0 4px 12px rgba(54, 166, 186, 0.3);
    }
  }
`;

const ExportButton = styled(motion.button)`
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(46, 204, 113, 0.4);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const Card = styled.div`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 0.5rem;
  margin-top: 1rem;
  
  thead tr {
    background: rgba(30, 57, 81, 0.6);
  }
  
  th {
    padding: 1rem;
    text-align: left;
    font-weight: 700;
    color: var(--primary);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border: none;
    
    &:first-child {
      border-top-left-radius: 8px;
      border-bottom-left-radius: 8px;
    }
    
    &:last-child {
      border-top-right-radius: 8px;
      border-bottom-right-radius: 8px;
    }
    
    &:nth-child(4),
    &:nth-child(7) {
      text-align: right;
    }
  }
  
  tbody tr {
    background: rgba(30, 57, 81, 0.3);
    transition: all 0.3s ease;
    
    &:hover {
      background: rgba(54, 166, 186, 0.1);
      transform: translateX(4px);
    }
  }
  
  td {
    padding: 1rem;
    color: var(--text-secondary);
    border: none;
    
    &:first-child {
      border-top-left-radius: 8px;
      border-bottom-left-radius: 8px;
    }
    
    &:last-child {
      border-top-right-radius: 8px;
      border-bottom-right-radius: 8px;
    }
    
    &:nth-child(4),
    &:nth-child(7) {
      text-align: right;
    }
    
    &.usd {
      font-variant-numeric: tabular-nums;
      font-feature-settings: 'tnum' 1;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-weight: 600;
      color: var(--text-primary);
    }
  }
  
  a {
    color: var(--primary);
    text-decoration: none;
    transition: color 0.3s ease;
    font-weight: 600;
    
    &:hover {
      color: #5dd5ed;
    }
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  
  &.buy {
    color: #2ecc71;
    background: rgba(46, 204, 113, 0.2);
    border: 1px solid rgba(46, 204, 113, 0.4);
  }
  
  &.sell {
    color: #e74c3c;
    background: rgba(231, 76, 60, 0.2);
    border: 1px solid rgba(231, 76, 60, 0.4);
  }
  
  &.transfer {
    color: #3498db;
    background: rgba(52, 152, 219, 0.2);
    border: 1px solid rgba(52, 152, 219, 0.4);
  }
  
  &.defi {
    color: #f39c12;
    background: rgba(243, 156, 18, 0.2);
    border: 1px solid rgba(243, 156, 18, 0.4);
  }
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(54, 166, 186, 0.2);
  
  span {
    color: var(--text-secondary);
    font-weight: 600;
  }
`;

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
    try {
      const params = new URLSearchParams(window.location.search)
      const qToken = params.get('token')
      const qSince = params.get('sinceHours')
      if (qToken) setToken(qToken.toUpperCase())
      if (qSince && !Number.isNaN(Number(qSince))) setSinceHours(Number(qSince))
    } catch {}
    fetchTrades(1)
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <PageHeader title="Market" accentWord="Statistics" />
      </motion.div>
      
      <Card>
        <Presets>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className={sinceHours===1?'active':''} onClick={()=>preset(1)}>1h</button>
            <button type="button" className={sinceHours===6?'active':''} onClick={()=>preset(6)}>6h</button>
            <button type="button" className={sinceHours===24?'active':''} onClick={()=>preset(24)}>24h</button>
            <button type="button" className={sinceHours===72?'active':''} onClick={()=>preset(72)}>3d</button>
            <button type="button" className={sinceHours===168?'active':''} onClick={()=>preset(168)}>7d</button>
            <Button type="button" variant="danger" onClick={reset}>Reset All Filters</Button>
          </div>
          <ExportButton 
            onClick={exportToCSV} 
            disabled={exporting || loading || rows.length === 0}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </ExportButton>
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
            <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
          ) : (
            <>
              <Table>
              <thead>
                <tr>
                    <th>Time</th>
                    <th>Token</th>
                    <th>Side</th>
                    <th>USD</th>
                    <th>Chain</th>
                    <th>Whale</th>
                    <th>Score</th>
                </tr>
              </thead>
              <tbody>
                  {rows.map(t => (
                    <tr key={t.transaction_hash}>
                      <td>{new Date(t.timestamp).toLocaleString()}</td>
                      <td><Link href={`/token/${encodeURIComponent(t.token_symbol || '-')}`}>{t.token_symbol || '-'}</Link></td>
                      <td><Badge className={(t.classification||'').toLowerCase()}>{t.classification||'-'}</Badge></td>
                      <td className="usd">${Math.round(Number(t.usd_value||0)).toLocaleString()}</td>
                      <td>{t.blockchain}</td>
                      <td><Link href={`/whale/${encodeURIComponent(t.from_address || '-')}`}>{t.from_address?.slice(0,6)}…{t.from_address?.slice(-4)}</Link></td>
                      <td className="usd">{t.whale_score ?? '-'}</td>
                </tr>
                ))}
              </tbody>
              </Table>
              <Pagination>
                <Button type="button" onClick={()=>fetchTrades(Math.max(1, page-1))}>← Previous</Button>
                <Button type="button" onClick={()=>fetchTrades(page+1)}>Next →</Button>
                <span>Page {page} • Total: {total.toLocaleString()} transactions</span>
              </Pagination>
            </>
            )}
          </div>
      </Card>
      </Container>
    </StatisticsContainer>
  );
} 