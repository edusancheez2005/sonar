'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { shortenAddress, formatUsd, timeAgo } from '@/lib/wallet-tracker'

async function getAuthHeaders() {
  const sb = supabaseBrowser()
  const { data } = await sb.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/* ─── styled-components ─── */

const Container = styled.div``

const InputSection = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: flex-end;
`

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: ${({ $flex }) => $flex || '0 0 auto'};
  min-width: ${({ $minW }) => $minW || '0'};
`

const Label = styled.label`
  font-size: 0.78rem;
  color: var(--text-secondary);
`

const AddressInput = styled.input`
  width: 100%;
  padding: 0.6rem 0.8rem;
  background: var(--background-card);
  border: 1px solid var(--secondary);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: monospace;
  outline: none;

  &:focus { border-color: var(--primary); }
  &::placeholder { color: var(--text-secondary); opacity: 0.5; }
`

const CapitalInput = styled.input`
  width: 100%;
  padding: 0.6rem 0.8rem;
  background: var(--background-card);
  border: 1px solid var(--secondary);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;

  &:focus { border-color: var(--primary); }
`

const DaysSelect = styled.select`
  padding: 0.6rem 0.8rem;
  background: var(--background-card);
  border: 1px solid var(--secondary);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;

  &:focus { border-color: var(--primary); }
`

const RunBtn = styled.button`
  padding: 0.6rem 1.5rem;
  background: var(--primary);
  color: #0a1621;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`

const QuickPick = styled.div`
  margin-top: 0.5rem;
`

const QuickSection = styled.div`
  margin-bottom: 0.5rem;
`

const QuickSectionHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0;
  transition: color 0.12s;

  &:hover { color: var(--primary); }
`

const Arrow = styled.span`
  font-size: 0.6rem;
  transition: transform 0.15s;
  transform: ${({ $open }) => $open ? 'rotate(180deg)' : 'rotate(0)'};
`

const QuickPickChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  max-height: 80px;
  overflow-y: auto;
  padding-left: 0.2rem;
  margin-top: 0.2rem;
`

const QuickChip = styled.button`
  padding: 0.2rem 0.5rem;
  border-radius: 5px;
  border: 1px solid var(--secondary);
  background: transparent;
  color: var(--primary);
  font-size: 0.7rem;
  font-family: monospace;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;

  &:hover {
    border-color: var(--primary);
    background: rgba(54, 166, 186, 0.08);
  }
`

const QuickChipLabel = styled.span`
  color: var(--text-primary);
  font-family: inherit;
  margin-right: 0.25rem;
`

const HeartIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="#00e5ff" stroke="#00e5ff" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

const EyeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

/* ─── Stats Cards ─── */

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`

const StatCard = styled.div`
  background: var(--background-card);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  border: 1px solid var(--secondary);
`

const StatCardLabel = styled.div`
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin-bottom: 0.3rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const StatCardValue = styled.div`
  font-size: 1.3rem;
  font-weight: 700;
  color: ${({ $color }) => $color || 'var(--text-primary)'};
`

/* ─── Equity Chart ─── */

const ChartContainer = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--secondary);
`

const ChartTitle = styled.h3`
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
`

/* ─── Trade Log ─── */

const TradeLogContainer = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid var(--secondary);
`

const TradeLogTitle = styled.h3`
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
`

const TradeTable = styled.div`
  max-height: 400px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: var(--secondary); border-radius: 3px; }
`

const TradeRow = styled.div`
  display: grid;
  grid-template-columns: 140px 100px 70px 1fr;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  align-items: center;
  font-size: 0.82rem;

  &:last-child { border-bottom: none; }

  @media (max-width: 600px) {
    grid-template-columns: 100px 80px 60px 1fr;
    gap: 0.5rem;
    font-size: 0.75rem;
  }
`

const TradeHeader = styled(TradeRow)`
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--secondary);
  position: sticky;
  top: 0;
  background: var(--background-card);
  z-index: 1;
`

const ActionBadge = styled.span`
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  background: ${({ $action }) => $action === 'BUY' ? 'rgba(54, 166, 186, 0.15)' : 'rgba(231, 76, 60, 0.15)'};
  color: ${({ $action }) => $action === 'BUY' ? '#36a6ba' : '#e74c3c'};
`

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  background: var(--background-card);
  border-radius: 12px;
`

const ErrorMsg = styled.div`
  text-align: center;
  padding: 1.5rem;
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.08);
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.85rem;
`

/* ─── Equity Curve SVG Chart ─── */

function EquityCurve({ data, startingCapital }) {
  if (!data || data.length < 2) {
    return (
      <ChartContainer>
        <ChartTitle>Equity Curve</ChartTitle>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
          Not enough data points to render chart.
        </div>
      </ChartContainer>
    )
  }

  const width = 800
  const height = 400
  const padTop = 30
  const padBottom = 50
  const padLeft = 70
  const padRight = 20

  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom

  const values = data.map(d => d.value)
  const minVal = Math.min(...values, startingCapital) * 0.98
  const maxVal = Math.max(...values, startingCapital) * 1.02
  const range = maxVal - minVal || 1

  const endVal = values[values.length - 1]
  const isPositive = endVal >= startingCapital
  const lineColor = isPositive ? '#36a6ba' : '#e74c3c'
  const gradientId = 'equity-gradient'

  const points = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * chartW
    const y = padTop + chartH - ((d.value - minVal) / range) * chartH
    return { x, y, date: d.date, value: d.value }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${padTop + chartH} L${points[0].x},${padTop + chartH} Z`

  // Y-axis labels (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = minVal + (range * i) / 4
    const y = padTop + chartH - (i / 4) * chartH
    return { val, y }
  })

  // X-axis labels (show ~6 dates)
  const step = Math.max(1, Math.floor(data.length / 6))
  const xTicks = data.filter((_, i) => i % step === 0 || i === data.length - 1).map((d, idx, arr) => {
    const origIdx = data.indexOf(d)
    const x = padLeft + (origIdx / (data.length - 1)) * chartW
    return { label: d.date.slice(5), x } // MM-DD
  })

  // Starting capital reference line
  const refY = padTop + chartH - ((startingCapital - minVal) / range) * chartH

  return (
    <ChartContainer>
      <ChartTitle>Equity Curve</ChartTitle>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', maxHeight: '400px' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <line key={i} x1={padLeft} y1={t.y} x2={width - padRight} y2={t.y}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}

        {/* Starting capital reference */}
        <line x1={padLeft} y1={refY} x2={width - padRight} y2={refY}
          stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="6,4" />
        <text x={padLeft - 5} y={refY + 4} textAnchor="end"
          fill="var(--text-secondary)" fontSize="10" fontFamily="monospace">
          Start
        </text>

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Y-axis labels */}
        {yTicks.map((t, i) => (
          <text key={i} x={padLeft - 8} y={t.y + 4} textAnchor="end"
            fill="var(--text-secondary)" fontSize="10" fontFamily="monospace">
            ${Math.round(t.val).toLocaleString()}
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map((t, i) => (
          <text key={i} x={t.x} y={height - 10} textAnchor="middle"
            fill="var(--text-secondary)" fontSize="10" fontFamily="monospace">
            {t.label}
          </text>
        ))}

        {/* Endpoint dot */}
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y}
          r="4" fill={lineColor} />
      </svg>
    </ChartContainer>
  )
}

/* ─── QuickPick Section ─── */

function QuickPickSection({ setter, followedWallets, watchlistGroups, openWatchlists, toggleWatchlist }) {
  const hasAny = followedWallets.length > 0 || watchlistGroups.length > 0
  if (!hasAny) return null

  return (
    <QuickPick>
      {followedWallets.length > 0 && (
        <QuickSection>
          <QuickSectionHeader as="div">
            <HeartIcon />
            <span>Following</span>
          </QuickSectionHeader>
          <QuickPickChips>
            {followedWallets.map(w => (
              <QuickChip key={`f-${w.address}`} onClick={() => setter(w.address)}>
                {w.label && <QuickChipLabel>{w.label}</QuickChipLabel>}
                {shortenAddress(w.address, 3)}
              </QuickChip>
            ))}
          </QuickPickChips>
        </QuickSection>
      )}
      {watchlistGroups.map(wl => (
        <QuickSection key={wl.id}>
          <QuickSectionHeader onClick={() => toggleWatchlist(wl.id)}>
            <EyeIcon />
            <span>{wl.name}</span>
            <Arrow $open={!!openWatchlists[wl.id]}>&#x25BC;</Arrow>
          </QuickSectionHeader>
          {openWatchlists[wl.id] && (
            <QuickPickChips>
              {wl.addresses.map(a => (
                <QuickChip key={`w-${a.address}`} onClick={() => setter(a.address)}>
                  {a.label && <QuickChipLabel>{a.label}</QuickChipLabel>}
                  {shortenAddress(a.address, 3)}
                </QuickChip>
              ))}
            </QuickPickChips>
          )}
        </QuickSection>
      ))}
    </QuickPick>
  )
}

/* ─── Main Component ─── */

const DAYS_OPTIONS = [7, 14, 30, 60, 90]

export default function BacktestTool() {
  const [address, setAddress] = useState('')
  const [startingCapital, setStartingCapital] = useState('10000')
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [followedWallets, setFollowedWallets] = useState([])
  const [watchlistGroups, setWatchlistGroups] = useState([])
  const [openWatchlists, setOpenWatchlists] = useState({})

  // Fetch followed wallets & watchlists for quick-pick
  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const auth = await getAuthHeaders()
        if (!auth.Authorization) return

        const fRes = await fetch('/api/wallet-tracker/follows', { headers: auth })
        if (fRes.ok) {
          const follows = await fRes.json()
          setFollowedWallets(follows.map(f => ({ address: f.address, label: f.nickname || null })))
        }

        const wlRes = await fetch('/api/wallet-watchlist', { headers: auth })
        if (wlRes.ok) {
          const { data: wls } = await wlRes.json()
          const groups = []
          for (const wl of wls || []) {
            const addrRes = await fetch(`/api/wallet-watchlist/${wl.id}/addresses`, { headers: auth })
            if (addrRes.ok) {
              const { data: addrs } = await addrRes.json()
              if (addrs && addrs.length > 0) {
                groups.push({
                  id: wl.id,
                  name: wl.name,
                  addresses: addrs.map(a => ({ address: a.address, label: a.custom_label || null })),
                })
              }
            }
          }
          setWatchlistGroups(groups)
        }
      } catch {
        // ignore
      }
    }
    fetchSaved()
  }, [])

  const toggleWatchlist = (id) => {
    setOpenWatchlists(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const runBacktest = async () => {
    const addr = address.trim()
    if (!addr) return
    const capital = Math.max(1, Number(startingCapital) || 10000)

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const params = new URLSearchParams({
        address: addr,
        starting_capital: String(capital),
        days: String(days),
      })
      const res = await fetch(`/api/wallet-tracker/backtest?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Request failed (${res.status})`)
      }
      const data = await res.json()
      setResult({ ...data, starting_capital: capital })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const pnlColor = useMemo(() => {
    if (!result) return 'var(--text-primary)'
    return result.total_pnl > 0 ? '#00d4aa' : result.total_pnl < 0 ? '#e74c3c' : 'var(--text-primary)'
  }, [result])

  return (
    <Container>
      {/* ─── Inputs ─── */}
      <InputSection>
        <FieldGroup $flex="1" $minW="240px">
          <Label>Wallet Address</Label>
          <AddressInput
            placeholder="Paste wallet address..."
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
          <QuickPickSection
            setter={setAddress}
            followedWallets={followedWallets}
            watchlistGroups={watchlistGroups}
            openWatchlists={openWatchlists}
            toggleWatchlist={toggleWatchlist}
          />
        </FieldGroup>
        <FieldGroup $minW="120px">
          <Label>Starting Capital ($)</Label>
          <CapitalInput
            type="number"
            min="1"
            step="1000"
            value={startingCapital}
            onChange={e => setStartingCapital(e.target.value)}
          />
        </FieldGroup>
        <FieldGroup $minW="90px">
          <Label>Period</Label>
          <DaysSelect value={days} onChange={e => setDays(Number(e.target.value))}>
            {DAYS_OPTIONS.map(d => (
              <option key={d} value={d}>{d} days</option>
            ))}
          </DaysSelect>
        </FieldGroup>
        <RunBtn onClick={runBacktest} disabled={loading || !address.trim()}>
          {loading ? 'Running...' : 'Run Backtest'}
        </RunBtn>
      </InputSection>

      {/* ─── Error ─── */}
      {error && <ErrorMsg>{error}</ErrorMsg>}

      {/* ─── Empty state ─── */}
      {!result && !loading && !error && (
        <EmptyState>
          Enter a wallet address and click Run Backtest to simulate trading performance.
        </EmptyState>
      )}

      {/* ─── Results ─── */}
      {result && (
        <>
          {/* Stats cards */}
          <StatsRow>
            <StatCard>
              <StatCardLabel>Total PnL</StatCardLabel>
              <StatCardValue $color={pnlColor}>{formatUsd(result.total_pnl)}</StatCardValue>
            </StatCard>
            <StatCard>
              <StatCardLabel>Return %</StatCardLabel>
              <StatCardValue $color={pnlColor}>{result.pnl_pct > 0 ? '+' : ''}{result.pnl_pct}%</StatCardValue>
            </StatCard>
            <StatCard>
              <StatCardLabel>Win Rate</StatCardLabel>
              <StatCardValue>{result.win_rate}%</StatCardValue>
            </StatCard>
            <StatCard>
              <StatCardLabel>Total Trades</StatCardLabel>
              <StatCardValue>{result.total_trades}</StatCardValue>
            </StatCard>
            <StatCard>
              <StatCardLabel>Best Trade</StatCardLabel>
              <StatCardValue $color="#00d4aa">{formatUsd(result.best_trade)}</StatCardValue>
            </StatCard>
            <StatCard>
              <StatCardLabel>Worst Trade</StatCardLabel>
              <StatCardValue $color="#e74c3c">{formatUsd(result.worst_trade)}</StatCardValue>
            </StatCard>
          </StatsRow>

          {/* Equity curve */}
          <EquityCurve data={result.equity_curve} startingCapital={result.starting_capital} />

          {/* Trade log */}
          <TradeLogContainer>
            <TradeLogTitle>Trade Log ({result.trades.length} trades)</TradeLogTitle>
            <TradeTable>
              <TradeHeader>
                <span>Time</span>
                <span>Token</span>
                <span>Action</span>
                <span>USD Value</span>
              </TradeHeader>
              {result.trades.map((t, i) => (
                <TradeRow key={i}>
                  <span style={{ color: 'var(--text-secondary)' }}>{timeAgo(t.timestamp)}</span>
                  <span style={{ fontWeight: 600 }}>{t.token || '—'}</span>
                  <span><ActionBadge $action={t.action}>{t.action}</ActionBadge></span>
                  <span>{formatUsd(t.usd_value)}</span>
                </TradeRow>
              ))}
              {result.trades.length === 0 && (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No trades found for this wallet in the selected period.
                </div>
              )}
            </TradeTable>
          </TradeLogContainer>
        </>
      )}
    </Container>
  )
}
