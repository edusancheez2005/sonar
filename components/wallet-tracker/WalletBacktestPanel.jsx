'use client'
import React, { useEffect, useMemo, useState } from 'react'

// WalletBacktestPanel
// "If you had copied <name> with $X starting <date>, you would have $Y."
// Embedded into figure + whale profile pages. Self-contained: handles
// its own loading, error, capital + date-range controls, and chart.

const CHAIN_OPTIONS = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'solana', label: 'Solana' },
]

const CAPITAL_PRESETS = [1000, 5000, 10000, 50000, 100000]

function formatUsd(n) {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function formatPct(n) {
  if (!Number.isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
}

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

// Inline SVG sparkline. Avoids pulling in a chart library for this
// surface; the panel must stay light because it loads on every figure
// + whale profile page.
function Sparkline({ curve, benchmarks, capital }) {
  const points = useMemo(() => (curve || []).filter((p) => Number.isFinite(p.equity_usd)), [curve])
  if (points.length < 2) return null

  const W = 600
  const H = 180
  const padL = 44
  const padR = 12
  const padT = 10
  const padB = 22

  const tsArr = points.map((p) => new Date(p.ts).getTime())
  const eqArr = points.map((p) => p.equity_usd)

  // Synthetic BTC-HODL line: linear from capital -> btc_hodl.final.
  // We don't get a per-day curve from the API today, so we draw a
  // straight line as a "what hodling would look like" reference.
  const btcEnd = benchmarks?.btc_hodl?.final_equity_usd ?? capital
  const ethEnd = benchmarks?.eth_hodl?.final_equity_usd ?? capital
  const allY = [...eqArr, capital, btcEnd, ethEnd]
  const yMin = Math.min(...allY)
  const yMax = Math.max(...allY)
  const yRange = yMax - yMin || 1
  const tMin = tsArr[0]
  const tMax = tsArr[tsArr.length - 1]
  const tRange = tMax - tMin || 1

  const x = (t) => padL + ((t - tMin) / tRange) * (W - padL - padR)
  const y = (v) => padT + (1 - (v - yMin) / yRange) * (H - padT - padB)

  const walletPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(new Date(p.ts).getTime()).toFixed(1)},${y(p.equity_usd).toFixed(1)}`)
    .join(' ')

  const btcPath = `M${x(tMin)},${y(capital)} L${x(tMax)},${y(btcEnd)}`
  const ethPath = `M${x(tMin)},${y(capital)} L${x(tMax)},${y(ethEnd)}`

  // Y-axis tick labels (3 ticks: min, mid, max).
  const ticks = [yMin, (yMin + yMax) / 2, yMax]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="Equity curve vs HODL benchmarks"
    >
      <rect x={0} y={0} width={W} height={H} fill="transparent" />
      {/* baseline */}
      <line x1={padL} y1={y(capital)} x2={W - padR} y2={y(capital)} stroke="rgba(54, 166, 186, 0.18)" strokeDasharray="4 4" />
      {/* benchmarks */}
      <path d={btcPath} stroke="#f7931a" strokeWidth={1.6} fill="none" strokeDasharray="3 3" opacity={0.75} />
      <path d={ethPath} stroke="#627eea" strokeWidth={1.6} fill="none" strokeDasharray="3 3" opacity={0.75} />
      {/* wallet equity */}
      <path d={walletPath} stroke="#36a6ba" strokeWidth={2.2} fill="none" />
      {/* y ticks */}
      {ticks.map((v, i) => (
        <g key={i}>
          <text x={padL - 6} y={y(v) + 3.5} fill="rgba(255,255,255,0.55)" fontSize={10} textAnchor="end">
            {formatUsd(v)}
          </text>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="rgba(54, 166, 186, 0.06)" />
        </g>
      ))}
      {/* x labels */}
      <text x={padL} y={H - 4} fill="rgba(255,255,255,0.55)" fontSize={10}>
        {new Date(tMin).toLocaleDateString()}
      </text>
      <text x={W - padR} y={H - 4} fill="rgba(255,255,255,0.55)" fontSize={10} textAnchor="end">
        {new Date(tMax).toLocaleDateString()}
      </text>
    </svg>
  )
}

export default function WalletBacktestPanel({ address, defaultChain = 'ethereum', autoRun = true }) {
  const [chain, setChain] = useState(defaultChain)
  const [capital, setCapital] = useState(10000)
  const [startDate, setStartDate] = useState(isoDaysAgo(90))
  const [endDate, setEndDate] = useState(isoToday())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [autoRan, setAutoRan] = useState(false)

  const runBacktest = async () => {
    if (!address) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        chain,
        capital: String(capital),
        start_date: startDate,
        end_date: endDate,
      })
      const url = `/api/wallet-backtest/${encodeURIComponent(address)}?${params.toString()}`
      const res = await fetch(url, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || `Request failed (${res.status})`)
        setData(null)
        return
      }
      setData(json)
    } catch (e) {
      setError(e?.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  // Auto-run once with defaults so the panel is useful at first paint.
  // Skipped when autoRun is false (e.g. wallets with no recorded activity,
  // like Polymarket proxy wallets) — the engine would hit Alchemy/CoinGecko
  // only to replay zero trades, leaving the panel spinning. Users can still
  // trigger it manually with the "Run backtest" button.
  useEffect(() => {
    if (autoRun && !autoRan && address) {
      setAutoRan(true)
      runBacktest()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, autoRun])

  const result = data?.result
  const benchmarks = data?.benchmarks
  const tradeCount = data?.trades_count ?? 0
  const finalEquity = result?.final_equity_usd
  const totalReturn = result?.total_return_pct
  const win = totalReturn > 0
  const beatBtc = totalReturn > (benchmarks?.btc_hodl?.total_return_pct ?? 0)
  const beatEth = totalReturn > (benchmarks?.eth_hodl?.total_return_pct ?? 0)
  // Data-quality guard: a wallet that "lost" >90% on <30 trades is almost
  // never a trader — it's a personal/founder wallet whose outgoing ETH
  // transfers (gifts, gas top-ups, contract deposits) get replayed as
  // SELLs against a blind starting cash position. Surfacing -99% as a
  // headline number is misleading; flag instead.
  const lowQuality = data && Number.isFinite(totalReturn) && (
    (totalReturn <= -90 && tradeCount < 30) ||
    tradeCount < 5
  )

  return (
    <section
      style={{
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.25)',
        borderRadius: '20px',
        padding: '1.5rem',
        margin: '1.5rem 0',
        color: 'var(--text-primary)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
            🔁 Copy-trade backtest
          </h3>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            Replays this wallet&apos;s trades to estimate copy-trader P&amp;L.
          </div>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: '320px', textAlign: 'right' }}>
          30bps fee assumed. Prices via CoinGecko. Tokens with no price history are marked to zero.
        </div>
      </div>

      {/* Controls */}
      <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem' }}>
        <label style={labelStyle}>
          Chain
          <select value={chain} onChange={(e) => setChain(e.target.value)} style={inputStyle}>
            {CHAIN_OPTIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Capital (USD)
          <input
            type="number"
            min={100}
            max={10000000}
            step={100}
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value) || 0)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Start date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          End date
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div style={{ marginTop: '0.55rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {CAPITAL_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setCapital(p)}
            style={presetStyle(capital === p)}
          >
            {formatUsd(p)}
          </button>
        ))}
        <button
          type="button"
          onClick={runBacktest}
          disabled={loading}
          style={{
            marginLeft: 'auto',
            padding: '0.5rem 1.1rem',
            background: '#36a6ba',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Running…' : '▶ Run backtest'}
        </button>
      </div>

      {error ? (
        <div role="alert" style={errorStyle}>{error}</div>
      ) : null}

      {/* Result */}
      {data && !error ? (
        <>
          {lowQuality ? (
            <div role="status" style={{ marginTop: '1rem', padding: '0.75rem 0.9rem', background: 'rgba(247, 147, 26, 0.10)', border: '1px solid rgba(247, 147, 26, 0.45)', borderRadius: '10px', color: '#f7c97a', fontSize: '0.85rem', lineHeight: 1.45 }}>
              ⚠ <strong>Backtest unreliable for this wallet.</strong>{' '}
              Only {tradeCount} trade{tradeCount === 1 ? '' : 's'} replayed. This wallet is mostly transfers
              (gas top-ups, ETH gifts, contract deposits) rather than market trades, so the copy-trade
              simulation is not meaningful. The numbers below are shown for transparency only.
            </div>
          ) : null}
          <div style={{ marginTop: '1.1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem' }}>
            <Stat
              label="Final equity"
              value={formatUsd(finalEquity)}
              sub={`from ${formatUsd(capital)}`}
              tone={win ? 'good' : 'bad'}
            />
            <Stat
              label="Total return"
              value={formatPct(totalReturn)}
              tone={win ? 'good' : 'bad'}
            />
            <Stat
              label="vs BTC HODL"
              value={formatPct((benchmarks?.btc_hodl?.total_return_pct ?? 0))}
              sub={beatBtc ? '✓ beat BTC' : '✗ underperformed BTC'}
              tone={beatBtc ? 'good' : 'bad'}
            />
            <Stat
              label="vs ETH HODL"
              value={formatPct((benchmarks?.eth_hodl?.total_return_pct ?? 0))}
              sub={beatEth ? '✓ beat ETH' : '✗ underperformed ETH'}
              tone={beatEth ? 'good' : 'bad'}
            />
            <Stat label="Trades replayed" value={String(tradeCount)} />
            <Stat label="Win rate" value={formatPct(result?.win_rate_pct)} sub="(closed positions)" />
            <Stat label="Max drawdown" value={formatPct(-(result?.max_drawdown_pct || 0))} tone="bad" />
            <Stat label="Sharpe (1y)" value={Number.isFinite(result?.sharpe) ? (result?.sharpe).toFixed(2) : '—'} />
          </div>

          {/* Equity chart */}
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(13, 33, 52, 0.6)', borderRadius: '12px', border: '1px solid rgba(54, 166, 186, 0.18)' }}>
            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              <Legend color="#36a6ba" label="Wallet (copy-trade)" solid />
              <Legend color="#f7931a" label="BTC HODL" />
              <Legend color="#627eea" label="ETH HODL" />
              <Legend color="rgba(54, 166, 186, 0.5)" label={`$${capital.toLocaleString()} starting capital`} dashed />
            </div>
            <Sparkline curve={data.equity_curve} benchmarks={benchmarks} capital={capital} />
          </div>

          {Array.isArray(data.warnings) && data.warnings.length > 0 ? (
            <div style={warnStyle} role="status">
              {data.warnings.map((w, i) => (
                <div key={i}>⚠ {w}</div>
              ))}
            </div>
          ) : null}

          <div style={{ marginTop: '0.6rem', fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
            {data.cache_hit ? 'cached' : `computed in ${data.computed_in_ms}ms`}
          </div>
        </>
      ) : null}

      {!data && !error && !loading ? (
        <div style={{ marginTop: '1rem', padding: '1.25rem', background: 'rgba(13, 33, 52, 0.5)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Configure capital and date range above, then run a backtest.
        </div>
      ) : null}
    </section>
  )
}

function Stat({ label, value, sub, tone }) {
  const color = tone === 'good' ? '#2ecc71' : tone === 'bad' ? '#e74c3c' : 'var(--text-primary)'
  return (
    <div
      style={{
        padding: '0.75rem 0.85rem',
        background: 'rgba(13, 33, 52, 0.7)',
        border: '1px solid rgba(54, 166, 186, 0.2)',
        borderRadius: '12px',
      }}
    >
      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ marginTop: '0.2rem', fontSize: '1.08rem', fontWeight: 800, color }}>
        {value}
      </div>
      {sub ? (
        <div style={{ marginTop: '0.1rem', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{sub}</div>
      ) : null}
    </div>
  )
}

function Legend({ color, label, solid, dashed }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <span
        aria-hidden="true"
        style={{
          width: '18px',
          height: '2px',
          background: solid ? color : 'transparent',
          borderTop: solid ? 'none' : `2px ${dashed ? 'dashed' : 'dashed'} ${color}`,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  )
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
}

const inputStyle = {
  padding: '0.5rem 0.65rem',
  background: 'rgba(13, 33, 52, 0.7)',
  border: '1px solid rgba(54, 166, 186, 0.3)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '0.88rem',
  outline: 'none',
}

function presetStyle(active) {
  return {
    padding: '0.35rem 0.7rem',
    background: active ? 'rgba(54, 166, 186, 0.22)' : 'rgba(54, 166, 186, 0.06)',
    border: `1px solid ${active ? '#36a6ba' : 'rgba(54, 166, 186, 0.2)'}`,
    borderRadius: '999px',
    color: active ? '#36a6ba' : 'var(--text-secondary)',
    fontWeight: active ? 700 : 500,
    fontSize: '0.78rem',
    cursor: 'pointer',
  }
}

const errorStyle = {
  marginTop: '0.85rem',
  padding: '0.75rem 0.9rem',
  background: 'rgba(231, 76, 60, 0.1)',
  border: '1px solid rgba(231, 76, 60, 0.4)',
  borderRadius: '10px',
  color: '#e74c3c',
  fontSize: '0.85rem',
}

const warnStyle = {
  marginTop: '0.7rem',
  padding: '0.6rem 0.85rem',
  background: 'rgba(241, 196, 15, 0.08)',
  border: '1px solid rgba(241, 196, 15, 0.35)',
  borderRadius: '10px',
  color: '#f1c40f',
  fontSize: '0.82rem',
}
