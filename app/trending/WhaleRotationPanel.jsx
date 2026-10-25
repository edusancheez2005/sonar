'use client'
/**
 * The /trending hero, rendered on the server with the data from
 * lib/trending/whaleRotation.ts: the five largest whale inflows and outflows
 * of the last 24 h with the dashboard's net-flow figures. Each row links to
 * the token page, prefills an ORCA question and offers an alert.
 */
import React, { useEffect, useState } from 'react'
import TokenIcon from '@/components/TokenIcon'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { T } from '@/lib/ui/tokens'
import { Card, CardHead, Note, Chip, Muted, Table } from './primitives'

function fmtUsd(n, signed = false) {
  const v = Number(n) || 0
  const a = Math.abs(v)
  const s = signed ? (v > 0 ? '+' : v < 0 ? '−' : '') : ''
  const short = (x, d) => String(Number(x.toFixed(d)))
  if (a >= 1e9) return `${s}$${short(a / 1e9, 2)}B`
  if (a >= 1e6) return `${s}$${short(a / 1e6, a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2)}M`
  if (a >= 1e3) return `${s}$${short(a / 1e3, a >= 1e5 ? 0 : 1)}K`
  return `${s}$${Math.round(a)}`
}

function fmtPrice(p) {
  if (p >= 1000) return `$${p.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (p >= 1) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `$${Number(p.toPrecision(3))}`
}

const toneColor = (tone) => (tone === 'in' ? T.posText : tone === 'out' ? T.negText : T.neuText)
const pctColor = (v) => (v > 0 ? T.posText : v < 0 ? T.negText : T.muted)

function askOrca(sym) {
  return `/ai-advisor?q=${encodeURIComponent(`What did whales do with ${sym} in the last 24 hours?`)}`
}

// Logged-out visitors get the sign-up entry; signed-in users go to their alert settings.
function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    let cancelled = false
    supabaseBrowser().auth.getSession()
      .then(({ data }) => { if (!cancelled) setSignedIn(!!data?.session) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  return signedIn
}

function Row({ r, signedIn }) {
  const alertHref = signedIn ? `/dashboard/personal?tab=alerts&token=${encodeURIComponent(r.symbol)}` : '/?signup=1'
  const alertTitle = signedIn
    ? `Set an alert for whale net flow on ${r.symbol}`
    : `Create a free account to get alerted when whales move into ${r.symbol}`
  const smartTitle = 'Wallets Sonar scores as consistently early (score ≥ 0.4), buys · sells in 24 h'
  return (
    <tr data-testid="whale-rotation-row">
      <td>
        <a className="tok" href={`/token/${encodeURIComponent(r.symbol)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: T.ink, fontWeight: 600 }}>
          <TokenIcon symbol={r.symbol} size={20} />
          {r.symbol}
        </a>
      </td>
      <td className="num" style={{ color: toneColor(r.tone), fontWeight: 600 }}>{fmtUsd(r.netUsd, true)}</td>
      <td className="num opt2">{r.buyCount} buys · {r.sellCount} sells</td>
      <td className="num opt">{r.uniqueWhales}</td>
      <td className="num opt">{r.price != null ? fmtPrice(r.price) : ''}</td>
      <td className="num opt" style={{ color: r.change24h != null ? pctColor(r.change24h) : undefined }}>
        {r.change24h != null ? `${r.change24h > 0 ? '+' : ''}${r.change24h.toFixed(2)}%` : ''}
      </td>
      <td className="num opt" title={r.smart && (r.smart.buys || r.smart.sells) ? smartTitle : 'No wallet-scored rows for this token'}>
        {r.smart && (r.smart.buys || r.smart.sells) ? `${r.smart.buys} · ${r.smart.sells}` : '—'}
      </td>
      <td className="num opt">
        {r.posts24h != null ? (
          <span title="Posts on X in 24 h (vs the 24 h before), from the topics Sonar ingests">
            {r.posts24h} <Muted>({r.postsDelta >= 0 ? '+' : '−'}{Math.abs(r.postsDelta)})</Muted>
          </span>
        ) : ''}
      </td>
      <td style={{ textAlign: 'right' }}>
        <a className="act" href={askOrca(r.symbol)}>Ask ORCA</a>
        <span style={{ color: T.faint, margin: '0 6px' }}>·</span>
        <a className="act" href={alertHref} title={alertTitle}>{signedIn ? 'Alert me' : 'Get alerts'}</a>
      </td>
    </tr>
  )
}

export default function WhaleRotationPanel({ rotation }) {
  const signedIn = useSignedIn()
  if (!rotation || (rotation.inflows.length === 0 && rotation.outflows.length === 0)) {
    return (
      <Card>
        <CardHead><h2>Whale rotation · last 24 h</h2></CardHead>
        <Note>Whale flow did not load. The <a href="/dashboard">dashboard</a> and <a href="/statistics">whale trades</a> show the same tape.</Note>
      </Card>
    )
  }
  // First sentence in view; the exclusions behind a disclosure.
  const cut = rotation.definition.indexOf('). ')
  const first = cut > 0 ? rotation.definition.slice(0, cut + 2) : rotation.definition
  const rest = cut > 0 ? rotation.definition.slice(cut + 3) : ''
  const asOf = new Date(rotation.generated_at).toISOString().slice(11, 16)
  return (
    <Card aria-labelledby="whale-rotation-title">
      <CardHead>
        <h2 id="whale-rotation-title">Whale rotation · last 24 h</h2>
        <Chip title="Chains with whale data right now">{rotation.chains_label}</Chip>
        <div className="right"><Muted>as of {asOf} UTC</Muted></div>
      </CardHead>
      <Note>
        {first}{' '}
        {rest && (
          <details style={{ display: 'inline' }}>
            <summary style={{ display: 'inline' }}>What is excluded</summary>
            <div style={{ marginTop: 6 }}>{rest}</div>
          </details>
        )}
      </Note>
      <div style={{ overflowX: 'auto' }}>
        <Table>
          <thead>
            <tr>
              <th>Token</th>
              <th className="num">Net 24 h</th>
              <th className="num opt2">Whale trades</th>
              <th className="num opt">Whales</th>
              <th className="num opt">Price</th>
              <th className="num opt">24 h</th>
              <th className="num opt" title="Buys · sells by wallets Sonar scores as consistently early (score ≥ 0.4)">Smart money</th>
              <th className="num opt">X posts</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rotation.inflows.length > 0 && <tr className="group"><td colSpan={9}>Whales moved in</td></tr>}
            {rotation.inflows.map((r) => <Row key={`in-${r.symbol}`} r={r} signedIn={signedIn} />)}
            {rotation.outflows.length > 0 && <tr className="group"><td colSpan={9}>Whales moved out</td></tr>}
            {rotation.outflows.map((r) => <Row key={`out-${r.symbol}`} r={r} signedIn={signedIn} />)}
          </tbody>
        </Table>
      </div>
    </Card>
  )
}
