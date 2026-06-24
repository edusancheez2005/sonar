'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'

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
  const [errorTransient, setErrorTransient] = useState(false)
  const [autoRan, setAutoRan] = useState(false)
  const retryRef = useRef(0)

  const runBacktest = async () => {
    if (!address) return
    setLoading(true)
    setError(null)
    setErrorTransient(false)
    let scheduledRetry = false
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
        const transient = res.status === 429 || res.status === 503 || json?.rate_limited === true
        setData(null)
        // Auto-retry once on a transient upstream hiccup (rate limit) before
        // surfacing anything to the user — most clear within a few seconds.
        if (transient && retryRef.current < 1) {
          retryRef.current += 1
          setErrorTransient(true)
          setError(json?.error || 'The data provider is busy. Retrying…')
          scheduledRetry = true
          setTimeout(runBacktest, 4000)
          return
        }
        setErrorTransient(transient)
        setError(json?.error || `Request failed (${res.status})`)
        return
      }
      retryRef.current = 0
      setData(json)
    } catch (e) {
      setErrorTransient(false)
      setError(e?.message || 'Unexpected error')
    } finally {
      if (!scheduledRetry) setLoading(false)
    }
  }

  // Manual retry resets the auto-retry budget so a click always gets a
  // fresh attempt (and another automatic retry if it's still busy).
  const retryNow = () => {
    retryRef.current = 0
    runBacktest()
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
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(620px 220px at 100% 0%, rgba(34, 211, 238, 0.1), transparent 60%), linear-gradient(180deg, rgba(13, 33, 52, 0.72) 0%, rgba(8, 16, 25, 0.62) 100%)',
        border: '1px solid var(--neon-border)',
        borderRadius: '18px',
        padding: '1.5rem',
        margin: '1.5rem 0',
        color: 'var(--text-primary)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 14px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1.4px', fontWeight: 700, color: 'var(--neon-bright)', margin: 0 }}>
            <span aria-hidden="true" style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--neon-cyan)', boxShadow: '0 0 10px var(--neon-glow)' }} />
            Copy-trade backtest
          </h3>
          <div style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 700, marginTop: '0.5rem' }}>
            Replay this wallet&apos;s trades as if you&apos;d copied them
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
            Estimates a copy-trader&apos;s P&amp;L from on-chain history.
          </div>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: '300px', textAlign: 'right', lineHeight: 1.5 }}>
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
            padding: '0.55rem 1.3rem',
            background: loading ? 'rgba(34, 211, 238, 0.25)' : 'linear-gradient(135deg, #22d3ee, #36a6ba)',
            border: 'none',
            borderRadius: '10px',
            color: loading ? 'var(--text-secondary)' : '#04141b',
            fontWeight: 800,
            fontSize: '0.85rem',
            letterSpacing: '0.3px',
            cursor: loading ? 'wait' : 'pointer',
            boxShadow: loading ? 'none' : '0 6px 18px rgba(34, 211, 238, 0.3)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          {loading ? 'Running…' : '▶ Run backtest'}
        </button>
      </div>

      {error ? (
        <div role="alert" style={errorTransient ? transientStyle : errorStyle}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {errorTransient && loading ? (
              <span style={spinnerStyle} aria-hidden="true" />
            ) : (
              <span aria-hidden="true">{errorTransient ? '⏳' : '⚠'}</span>
            )}
            <span>{error}</span>
          </span>
          {!loading ? (
            <button type="button" onClick={retryNow} style={retryBtnStyle}>
              ↻ Retry
            </button>
          ) : null}
        </div>
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
          <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'rgba(6, 14, 22, 0.5)', borderRadius: '14px', border: '1px solid var(--neon-border)' }}>
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

      {loading && !data && !error ? (
        <div style={{ marginTop: '1rem', padding: '1.4rem', background: 'rgba(6, 14, 22, 0.5)', borderRadius: '14px', border: '1px solid var(--neon-border)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
          <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(34, 211, 238, 0.25)', borderTopColor: 'var(--neon-cyan)', display: 'inline-block', animation: 'sonar-spin 0.8s linear infinite' }} aria-hidden="true" />
          Replaying on-chain trades…
        </div>
      ) : null}

      {!data && !error && !loading ? (
        <div style={{ marginTop: '1rem', padding: '1.4rem', background: 'rgba(6, 14, 22, 0.5)', borderRadius: '14px', border: '1px solid var(--neon-border)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
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
        padding: '0.8rem 0.9rem',
        background: 'rgba(6, 14, 22, 0.55)',
        border: '1px solid var(--neon-border)',
        borderRadius: '14px',
      }}
    >
      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
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
  gap: '0.32rem',
  fontSize: '0.7rem',
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.7px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
}

const inputStyle = {
  padding: '0.55rem 0.7rem',
  background: 'rgba(6, 14, 22, 0.6)',
  border: '1px solid var(--neon-border)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  fontSize: '0.88rem',
  outline: 'none',
}

function presetStyle(active) {
  return {
    padding: '0.4rem 0.8rem',
    background: active ? 'rgba(34, 211, 238, 0.16)' : 'rgba(34, 211, 238, 0.05)',
    border: `1px solid ${active ? 'var(--neon-line)' : 'var(--neon-border)'}`,
    borderRadius: '999px',
    color: active ? 'var(--neon-bright)' : 'var(--text-secondary)',
    fontWeight: active ? 700 : 500,
    fontSize: '0.78rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }
}

const errorStyle = {
  marginTop: '0.85rem',
  padding: '0.7rem 0.9rem',
  background: 'rgba(231, 76, 60, 0.1)',
  border: '1px solid rgba(231, 76, 60, 0.4)',
  borderRadius: '10px',
  color: '#e74c3c',
  fontSize: '0.85rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  flexWrap: 'wrap',
}

const transientStyle = {
  ...errorStyle,
  background: 'rgba(247, 147, 26, 0.1)',
  border: '1px solid rgba(247, 147, 26, 0.4)',
  color: '#f7c97a',
}

const retryBtnStyle = {
  flexShrink: 0,
  padding: '0.35rem 0.8rem',
  background: 'rgba(34, 211, 238, 0.1)',
  border: '1px solid var(--neon-border)',
  borderRadius: '8px',
  color: 'var(--neon-bright)',
  fontSize: '0.8rem',
  fontWeight: 700,
  cursor: 'pointer',
}

const spinnerStyle = {
  width: '13px',
  height: '13px',
  borderRadius: '50%',
  border: '2px solid rgba(247, 201, 122, 0.3)',
  borderTopColor: '#f7c97a',
  display: 'inline-block',
  animation: 'sonar-spin 0.8s linear infinite',
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
