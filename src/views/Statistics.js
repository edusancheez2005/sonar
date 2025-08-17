'use client'
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import PageHeader from '../components/PageHeader';
import Link from 'next/link'

const StatisticsContainer = styled.div`
  padding: 2rem; max-width: 1200px; margin: 0 auto;
`;

const Toolbar = styled.div`
  display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr 1fr auto; gap: 0.75rem; align-items: end; margin-bottom: 1rem;
  @media (max-width: 1100px) { grid-template-columns: 1fr 1fr; }
`;

const Field = styled.div`
  display: flex; flex-direction: column; gap: 0.35rem;
  label { color: var(--text-secondary); font-size: 0.8rem; padding-left: 0.5rem; }
`;

const PillInput = styled.input`
  background: linear-gradient(180deg, rgba(13,33,52,1) 0%, rgba(10,22,33,1) 100%);
  border: 1px solid var(--secondary);
  color: var(--text-primary);
  padding: 0.65rem 0.95rem;
  border-radius: 999px;
  outline: none;
  transition: border-color .15s ease, box-shadow .15s ease, background .2s ease;
  &::placeholder { color: var(--text-secondary); opacity: .6; }
  &:hover { border-color: var(--primary); }
  &:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(54,166,186,.15); }
`;

const PillSelect = styled.select`
  appearance: none; -webkit-appearance: none; -moz-appearance: none;
  background:
    linear-gradient(180deg, rgba(13,33,52,1) 0%, rgba(10,22,33,1) 100%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath fill='%23a0b2c6' d='M5.5 7l4.5 6 4.5-6z'/%3E%3C/svg%3E") no-repeat right 12px center / 20px;
  border: 1px solid var(--secondary);
  color: var(--text-primary);
  padding: 0.65rem 2.25rem 0.65rem 0.95rem;
  border-radius: 999px;
  outline: none;
  transition: border-color .15s ease, box-shadow .15s ease, background .2s ease;
  &:hover { border-color: var(--primary); }
  &:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(54,166,186,.15); }
  option { background: var(--background-dark); color: var(--text-primary); }
`;

const Button = styled.button`
  background: ${({ variant }) => variant === 'danger' ? 'transparent' : 'var(--primary)'};
  color: ${({ variant }) => variant === 'danger' ? 'var(--sell-color)' : '#fff'};
  border: 1px solid ${({ variant }) => variant === 'danger' ? 'var(--sell-color)' : 'var(--primary)'};
  padding: 0.6rem 1rem; border-radius: 999px; font-weight: 500;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  &:hover { transform: translateY(-2px); box-shadow: 0 7px 14px rgba(54, 166, 186, 0.3); }
`;

const Presets = styled.div`
  display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;
  button { background: var(--background-card); color: var(--text-secondary); border: 1px solid var(--secondary); border-radius: 999px; padding: 0.4rem 0.8rem; transition: all .15s ease; }
  button:hover { border-color: var(--primary); color: var(--text-primary); }
  button.active { background: var(--primary); color: #fff; border-color: var(--primary); }
`;

const Card = styled.div`
  background: var(--background-card); border-radius: 8px; padding: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
`;

const Table = styled.table`
  width: 100%; border-collapse: collapse; margin-top: 0.5rem; table-layout: fixed;
  th, td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--secondary); text-align: left; }
  th:nth-child(4), td:nth-child(4) { text-align: right; }
  th:nth-child(7), td:nth-child(7) { text-align: right; }
  td.usd { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
`;

const Badge = styled.span`
  display: inline-block; padding: 0.25rem 0.5rem; border-radius: 999px; font-weight: 500; font-size: 0.85rem;
  &.buy { color: var(--buy-color); background-color: rgba(54, 166, 186, 0.15); }
  &.sell { color: var(--sell-color); background-color: rgba(231, 76, 60, 0.15); }
  &.transfer { color: var(--transfer-color); background-color: rgba(52, 152, 219, 0.15); }
  &.defi { color: #ff8c00; background-color: rgba(255, 140, 0, 0.15); }
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

  useEffect(() => { fetchTrades(1) }, [])

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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <PageHeader title="Market" accentWord="Statistics" />
      </motion.div>
      
      <Card>
        <Presets>
          <button type="button" className={sinceHours===1?'active':''} onClick={()=>preset(1)}>1h</button>
          <button type="button" className={sinceHours===6?'active':''} onClick={()=>preset(6)}>6h</button>
          <button type="button" className={sinceHours===24?'active':''} onClick={()=>preset(24)}>24h</button>
          <button type="button" className={sinceHours===72?'active':''} onClick={()=>preset(72)}>3d</button>
          <button type="button" className={sinceHours===168?'active':''} onClick={()=>preset(168)}>7d</button>
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button type="button" variant="danger" onClick={reset}>Reset</Button>
          </div>
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
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <Button type="button" onClick={()=>fetchTrades(Math.max(1, page-1))}>Prev</Button>
                <Button type="button" onClick={()=>fetchTrades(page+1)}>Next</Button>
                <span style={{ color: 'var(--text-secondary)' }}>Page {page}</span>
            </div>
            </>
            )}
          </div>
      </Card>
    </StatisticsContainer>
  );
} 