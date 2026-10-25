'use client'
/**
 * X sentiment · LunarCrush: coins ranked by LunarCrush's social metrics,
 * without stablecoins, wrapped tokens or micro-caps with a handful of posts
 * (lib/social/trendingCoins.ts applies the filters).
 */
import React, { useEffect, useState } from 'react'
import TokenIcon from '@/components/TokenIcon'
import { T } from '@/lib/ui/tokens'
import { Card, CardHead, Note, Muted, Tabs, Table } from './primitives'

const SORTS = [['galaxy_score', 'Galaxy score'], ['interactions_24h', 'Interactions']]

function fmtCount(n) {
  const v = Number(n) || 0
  return v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : String(v)
}

export default function SentimentPanel() {
  const [sort, setSort] = useState('galaxy_score')
  const [state, setState] = useState({ status: 'loading', data: null })

  useEffect(() => {
    const ctrl = new AbortController()
    setState((s) => ({ status: 'loading', data: s.data }))
    fetch(`/api/social/trending-coins?sort=${sort}&limit=10`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => setState({ status: 'ok', data }))
      .catch((e) => { if (e?.name !== 'AbortError') setState({ status: 'error', data: null }) })
    return () => ctrl.abort()
  }, [sort])

  const coins = state.data?.coins || []
  return (
    <Card aria-labelledby="sentiment-title">
      <CardHead>
        <h2 id="sentiment-title">X sentiment · LunarCrush</h2>
        <div className="right">
          {state.data?.generated_at && coins.length > 0 && <Muted>as of {new Date(state.data.generated_at).toISOString().slice(11, 16)} UTC</Muted>}
          <Tabs role="tablist" aria-label="Sort">
            {SORTS.map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={sort === k} onClick={() => setSort(k)}>{l}</button>
            ))}
          </Tabs>
        </div>
      </CardHead>
      {state.status === 'error' || (state.status === 'ok' && coins.length === 0) ? (
        <Note>X sentiment is not available right now.</Note>
      ) : !state.data ? (
        <Note>Loading…</Note>
      ) : (
        <Table style={{ opacity: state.status === 'loading' ? 0.6 : 1 }}>
          <thead>
            <tr>
              <th>Token</th>
              <th className="num">Galaxy score</th>
              <th className="num">Sentiment</th>
              <th className="num opt2">Interactions 24 h</th>
              <th className="num opt2">24 h</th>
            </tr>
          </thead>
          <tbody>
            {coins.map((c) => (
              <tr key={c.symbol}>
                <td>
                  <a className="tok" href={`/token/${encodeURIComponent(c.symbol)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: T.ink }}>
                    <TokenIcon symbol={c.symbol} imageUrl={c.logo} size={18} />
                    {c.symbol}
                  </a>
                </td>
                <td className="num">{c.galaxy_score != null ? Number(c.galaxy_score).toFixed(1) : '—'}</td>
                <td className="num">{c.sentiment != null ? `${Math.round(c.sentiment)}% positive` : '—'}</td>
                <td className="num opt2">{fmtCount(c.interactions_24h)}</td>
                <td className="num opt2" style={{ color: c.percent_change_24h > 0 ? T.posText : c.percent_change_24h < 0 ? T.negText : T.muted }}>
                  {c.percent_change_24h != null ? `${c.percent_change_24h > 0 ? '+' : ''}${Number(c.percent_change_24h).toFixed(2)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Note style={{ paddingTop: 10 }}>Social data from <a href="https://lunarcrush.com" target="_blank" rel="noopener noreferrer">LunarCrush</a>.</Note>
    </Card>
  )
}
