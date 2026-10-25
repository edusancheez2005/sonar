'use client'
/**
 * Price movers · Binance: the biggest gainers and losers among the coins we
 * map to Binance, over a real 1 h, 24 h or 7 d rolling window.
 */
import React, { useEffect, useState } from 'react'
import TokenIcon from '@/components/TokenIcon'
import { T } from '@/lib/ui/tokens'
import { Card, CardHead, Note, Muted, Tabs, Table } from './primitives'

const WINDOWS = [['1h', '1H'], ['24h', '24H'], ['7d', '7D']]

function fmtPrice(p) {
  if (p >= 1000) return `$${p.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (p >= 1) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `$${Number(p.toPrecision(3))}`
}
function fmtVol(v) {
  const n = Number(v) || 0
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${Math.round(n / 1e6).toLocaleString('en-US')}M`
  return `$${Math.round(n / 1e3).toLocaleString('en-US')}K`
}

function List({ title, rows, windowLabel }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ padding: '8px 12px 4px', fontSize: 11.5, fontWeight: 600, color: T.muted }}>{title}</div>
      <Table>
        <thead>
          <tr>
            <th>Token</th>
            <th className="num">Price</th>
            <th className="num">{windowLabel}</th>
            <th className="num opt2">Volume ({windowLabel})</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.symbol}>
              <td>
                <a className="tok" href={`/token/${encodeURIComponent(r.symbol)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: T.ink }}>
                  <TokenIcon symbol={r.symbol} imageUrl={r.image} size={18} />
                  {r.symbol}
                </a>
              </td>
              <td className="num">{fmtPrice(r.price)}</td>
              <td className="num" style={{ color: r.change_pct > 0 ? T.posText : r.change_pct < 0 ? T.negText : T.muted }}>
                {r.change_pct > 0 ? '+' : ''}{r.change_pct.toFixed(2)}%
              </td>
              <td className="num opt2">{fmtVol(r.quote_volume)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

export default function MoversPanel() {
  const [win, setWin] = useState('24h')
  const [state, setState] = useState({ status: 'loading', data: null })

  useEffect(() => {
    const ctrl = new AbortController()
    setState((s) => ({ status: 'loading', data: s.data }))
    fetch(`/api/coingecko/trending?window=${win}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => setState({ status: 'ok', data }))
      .catch((e) => { if (e?.name !== 'AbortError') setState({ status: 'error', data: null }) })
    return () => ctrl.abort()
  }, [win])

  const label = WINDOWS.find(([k]) => k === win)?.[1] || '24H'
  const d = state.data
  return (
    <Card aria-labelledby="movers-title">
      <CardHead>
        <h2 id="movers-title">Price movers · Binance</h2>
        <div className="right">
          {d?.generated_at && <Muted>as of {new Date(d.generated_at).toISOString().slice(11, 16)} UTC</Muted>}
          <Tabs role="tablist" aria-label="Window">
            {WINDOWS.map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={win === k} onClick={() => setWin(k)}>{l}</button>
            ))}
          </Tabs>
        </div>
      </CardHead>
      {state.status === 'error' && !d ? (
        <Note>Price movers did not load. Binance may be slow; try another window.</Note>
      ) : !d ? (
        <Note>Loading…</Note>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', opacity: state.status === 'loading' ? 0.6 : 1 }}>
          <List title="Gainers" rows={d.gainers || []} windowLabel={label} />
          <List title="Losers" rows={d.losers || []} windowLabel={label} />
        </div>
      )}
    </Card>
  )
}
