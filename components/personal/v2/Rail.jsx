'use client'
/**
 * The right rail of the Personal page: your coins, wallets you follow, your
 * alerts (set-up accounts) or today's market and the macro pin (new accounts).
 */
import React, { useState } from 'react'
import styled from 'styled-components'
import TokenIcon from '@/components/TokenIcon'
import { HealthChip, healthOf } from '@/components/live/HealthChip'
import { describeRule } from '@/lib/orca/alerts/presets'
import { T } from '@/lib/ui/tokens'
import { Card, SecHead, Avatar, Muted, Num, Button, Input, TextLink, Spark, fmtUsd, fmtPrice, fmtPct, hhmmUtc, timeAgo, toneColor } from './ui'

const Rows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`
const R = styled.li`
  padding: 10px 0;
  border-top: 1px solid ${T.hairlineStrong};
  &:first-child { border-top: none; padding-top: 0; }
`
const Line = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`
const Sym = styled.span`
  font-size: 13.5px;
  font-weight: 600;
  color: ${T.ink};
`
const Sub = styled.div`
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: ${T.muted};
`
const IconBtn = styled.button`
  border: none;
  background: none;
  color: ${T.muted};
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  padding: 2px 4px;
  &:hover { color: ${T.ink}; }
`

function askCoin(sym) {
  const q = `What did whales do with ${sym} in the last 24 hours, and what moved the price?`
  return `/ai-advisor?q=${encodeURIComponent(q)}&ticker=${encodeURIComponent(sym)}&send=1`
}

function changeTone(v) {
  const n = Number(v)
  return !Number.isFinite(n) ? 'flat' : n > 0 ? 'up' : n < 0 ? 'down' : 'flat'
}

export function CoinsCard({ tickers = [], onAdd, onRemove, busy }) {
  const [sym, setSym] = useState('')
  const [err, setErr] = useState(null)
  const valid = tickers.filter((t) => t.valid)
  const add = async (e) => {
    e.preventDefault()
    const s = sym.trim().toUpperCase()
    if (!s) return
    setErr(null)
    const r = await onAdd(s)
    if (r?.ok) setSym('')
    else setErr(r?.error || `We do not track ${s} yet.`)
  }
  return (
    <Card data-testid="rail-coins">
      <SecHead title="Your coins" count={valid.length} />
      {tickers.length === 0 && <p style={{ margin: '0 0 10px', fontSize: 13, color: T.muted }}>Add a coin to see its price and what whales did with it today.</p>}
      <Rows>
        {tickers.map((t) => (
          <R key={t.ticker} data-testid={`rail-coin-${t.ticker}`} style={t.valid ? undefined : { opacity: 0.6 }}>
            <Line>
              <TokenIcon symbol={t.ticker} size={18} />
              <Sym>{t.ticker}</Sym>
              {t.valid ? (
                <>
                  <Num style={{ fontSize: 13, color: T.ink }}>{fmtPrice(t.price)}</Num>
                  <Num style={{ fontSize: 12, color: toneColor(changeTone(t.change_24h)) }}>{fmtPct(t.change_24h)}</Num>
                  <span style={{ marginLeft: 'auto' }}><Spark points={t.spark} tone={changeTone(t.change_24h)} /></span>
                </>
              ) : (
                <Muted style={{ fontSize: 12, marginLeft: 'auto' }}>Not tracked</Muted>
              )}
              <IconBtn type="button" aria-label={`Remove ${t.ticker}`} onClick={() => onRemove(t.ticker)} disabled={busy}>×</IconBtn>
            </Line>
            {t.valid && (
              <Sub>
                {t.whale
                  ? <>Whales {t.whale.net >= 0 ? 'received' : 'sent'} <span style={{ color: toneColor(t.whale.tone) }}>{fmtUsd(Math.abs(t.whale.net))}</span> more than they {t.whale.net >= 0 ? 'sent' : 'received'} in 24 h{t.ticker === 'BTC' ? ' (WBTC on Ethereum)' : ''}</>
                  : 'No whale moves for this coin in the last 24 hours'}
                {' · '}
                <TextLink href={askCoin(t.ticker)} style={{ fontSize: 12 }}>Ask ORCA</TextLink>
              </Sub>
            )}
          </R>
        ))}
      </Rows>
      <form onSubmit={add} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Input value={sym} onChange={(e) => setSym(e.target.value)} placeholder="Add a coin, for example LINK" aria-label="Add a coin" data-testid="rail-coin-input" />
        <Button type="submit" disabled={!sym.trim() || busy}>Add</Button>
      </form>
      {err && <div role="alert" style={{ marginTop: 8, fontSize: 12.5, color: T.negText }}>{err}</div>}
    </Card>
  )
}

const WALLET_TH = { liveMs: 2 * 3_600_000, delayedMs: 6 * 3_600_000 }

export function WalletsCard({ wallets = [], now }) {
  const checked = wallets.map((w) => (w.last_checked_at ? Date.parse(w.last_checked_at) : NaN)).filter(Number.isFinite)
  const newest = checked.length ? Math.max(...checked) : null
  const health = healthOf({ newestAt: newest, now, thresholds: WALLET_TH })
  const notChecked = wallets.filter((w) => !w.last_checked_at || now - Date.parse(w.last_checked_at) > WALLET_TH.liveMs).length
  const anyMoves = wallets.some((w) => w.moves_24h > 0)
  return (
    <Card data-testid="rail-wallets">
      <SecHead title="Wallets you follow" count={wallets.length} right={wallets.length ? <HealthChip health={health} testId="wallets-health" title="Based on when we last checked these wallets" /> : null} />
      {wallets.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Follow a wallet from its page, or from the list on the left, to see its moves here.</p>
      ) : (
        <>
          <Rows>
            {wallets.map((w) => (
              <R key={w.key} data-testid="rail-wallet">
                <Line>
                  <Avatar src={w.avatar} name={w.name} size={28} />
                  <div style={{ minWidth: 0 }}>
                    <Sym style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</Sym>
                    <div style={{ fontSize: 12, color: T.muted }}>
                      {w.last_move
                        ? <>Last move {hhmmUtc(w.last_move.at)}: {w.last_move.direction === 'in' ? 'received' : 'sent'} {fmtUsd(w.last_move.usd)}{w.last_move.token ? ` ${w.last_move.token}` : ''}</>
                        : 'No moves in the last 24 hours'}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.muted }}>
                      {w.last_checked_at ? `Checked ${timeAgo(w.last_checked_at, now)}` : 'Not checked yet'}
                    </div>
                  </div>
                </Line>
              </R>
            ))}
          </Rows>
          {!anyMoves && (
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: T.muted }}>
              {notChecked === 0 ? 'All quiet: every wallet was checked in the last 2 hours.' : `No moves in the wallets we could check. ${notChecked} not checked in the last 2 hours.`}
            </p>
          )}
        </>
      )}
    </Card>
  )
}

// One phrasing per kind, shared with AlertPresets and the wallet page.
export const ruleText = describeRule

export function AlertsCard({ rules = [], names, onManage }) {
  const active = rules.filter((r) => r.enabled)
  return (
    <Card data-testid="rail-alerts">
      <SecHead title="Your alerts" count={active.length} right={<TextLink href="#alerts" onClick={(e) => { e.preventDefault(); onManage() }}>Manage</TextLink>} />
      {active.length > 0 ? (
        <Rows>
          {active.slice(0, 5).map((r) => (
            <R key={r.id} style={{ fontSize: 13, color: T.body }}>{ruleText(r, names)}</R>
          ))}
          {active.length > 5 && <R style={{ fontSize: 12, color: T.muted }}>and {active.length - 5} more</R>}
        </Rows>
      ) : (
        <>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: T.body }}>No alerts yet. Presets take two clicks.</p>
          <Button type="button" onClick={onManage} data-testid="rail-alerts-setup">Set up an alert</Button>
        </>
      )}
      <p style={{ margin: '10px 0 0', fontSize: 12, color: T.muted }}>Delivered to the bell; email if you turned it on in alert settings.</p>
    </Card>
  )
}

export function MarketCard({ rows = [], asOf, tapeNewestAt, now }) {
  const health = healthOf({ newestAt: tapeNewestAt, now })
  return (
    <Card data-testid="rail-market">
      <SecHead title="Market today" right={<>{asOf && <Muted style={{ fontSize: 12 }}>as of {hhmmUtc(asOf)}</Muted>}<HealthChip health={health} testId="market-health" /></>} />
      <Rows>
        {rows.map((m) => (
          <R key={m.ticker}>
            <Line>
              <TokenIcon symbol={m.ticker} size={18} />
              <Sym>{m.ticker}</Sym>
              <Num style={{ fontSize: 13, color: T.ink }}>{fmtPrice(m.price)}</Num>
              <Num style={{ fontSize: 12, color: toneColor(changeTone(m.change_24h)) }}>{fmtPct(m.change_24h)}</Num>
              <span style={{ marginLeft: 'auto' }}><Spark points={m.spark} tone={changeTone(m.change_24h)} /></span>
            </Line>
            {m.whale && <Sub style={{ color: m.whale.tone === 'flat' ? T.muted : T.body }}>{m.whale.text}</Sub>}
          </R>
        ))}
      </Rows>
    </Card>
  )
}

export function MacroCard({ macro }) {
  if (!macro?.top) return null
  const badge = macro.badge || 'neutral'
  const color = badge === 'bullish' ? T.posText : badge === 'bearish' ? T.negText : T.neuText
  const rule = macro.counts
    ? (badge === 'bearish' ? `${macro.counts.bearish} of ${macro.total} factors bearish` : badge === 'bullish' ? `${macro.counts.bullish} of ${macro.total} factors bullish` : `${macro.counts.bullish} bullish, ${macro.counts.bearish} bearish`)
    : ''
  return (
    <Card data-testid="rail-macro">
      <SecHead title="Macro" right={<span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color, border: `1px solid ${color}55`, borderRadius: T.radius.sm, padding: '2px 6px' }}>{badge.toUpperCase()}</span>} />
      <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{macro.top.title}</div>
      <div style={{ marginTop: 4, fontSize: 12.5, lineHeight: 1.45, color: T.body }}>{macro.top.summary}</div>
      <div style={{ marginTop: 8, fontSize: 12, color: T.muted }}>
        {rule}{macro.generated_at ? ` · updated ${hhmmUtc(macro.generated_at)}` : ''} · <TextLink href="/dashboard" style={{ fontSize: 12 }}>All factors</TextLink>
      </div>
    </Card>
  )
}
