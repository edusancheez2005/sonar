'use client'
/**
 * The main column of the Personal page: the newest unread alert as a card,
 * then one chronological list of followed-wallet moves and alert fires.
 */
import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import TokenIcon from '@/components/TokenIcon'
import { HealthChip, healthOf } from '@/components/live/HealthChip'
import { T } from '@/lib/ui/tokens'
import { Card, SecHead, Avatar, Muted, Num, Button, TextLink, fmtUsd, hhmmUtc, timeAgo, toneColor } from './ui'

const Tabs = styled.div`
  display: inline-flex;
  padding: 2px;
  border-radius: ${T.radius.md};
  border: 1px solid ${T.hairlineStrong};
  background: ${T.surface2};
`
const Tab = styled.button`
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  background: ${(p) => (p.$on ? T.accentSoft : 'transparent')};
  color: ${(p) => (p.$on ? T.ink : T.muted)};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  span { margin-left: 6px; font-family: ${T.font.mono}; font-weight: 500; color: ${T.muted}; }
`
const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`
const Item = styled.li`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  padding: 14px 0;
  border-top: 1px solid ${T.hairlineStrong};
  &:first-child { border-top: none; }
`
const Title = styled.div`
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: ${T.ink};
`
const Why = styled.div`
  margin-top: 3px;
  font-size: 13px;
  line-height: 1.45;
  color: ${T.body};
`
const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-top: 6px;
  font-size: 12px;
  color: ${T.muted};
`
const Amount = styled.div`
  font-family: ${T.font.mono};
  font-variant-numeric: tabular-nums;
  font-size: 14px;
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
`
const BellIcon = () => (
  <span aria-hidden style={{ width: 28, height: 28, borderRadius: T.radius.pill, border: `1px solid ${T.hairlineStrong}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: T.accent }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
  </span>
)

function askWallet(m) {
  const q = `What did ${m.wallet} do on-chain in the last 24 hours?`
  return `/ai-advisor?q=${encodeURIComponent(q)}&wallet=${encodeURIComponent(m.address)}&send=1`
}
function askAlert(n) {
  const q = `Explain this alert in plain English: ${n.title}`
  return `/ai-advisor?q=${encodeURIComponent(q)}${n.ticker && n.ticker !== '_ALL_' && !String(n.ticker).startsWith('0x') ? `&ticker=${encodeURIComponent(n.ticker)}` : ''}&send=1`
}

const KIND_LABEL = {
  wallet_activity: 'Wallet move', whale_flow: 'Whale net flow', price_move: 'Price move', news_high_impact: 'Headline',
  news_any: 'Headline', social_post: 'Social post', signal_flip: 'Signal change', whale_convergence: 'Several whales',
}

export function AlertFireCard({ notification, ruleText, onAdjust }) {
  if (!notification) return null
  return (
    <Card data-testid="personal-alert-card" style={{ borderColor: T.accentBorder, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <BellIcon />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 2 }}>Your alert fired · {KIND_LABEL[notification.kind] || 'Alert'}</div>
          <Title>{notification.title}</Title>
          {notification.body && <Why>{notification.body}</Why>}
          <Meta>
            <span>{hhmmUtc(notification.created_at)} · {timeAgo(notification.created_at)}</span>
            {ruleText && <span>Rule: {ruleText}</span>}
          </Meta>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Button as="a" href={askAlert(notification)} $primary data-testid="alert-card-ask">Why? Ask ORCA</Button>
            <Button type="button" onClick={onAdjust} data-testid="alert-card-adjust">Adjust rule</Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function Feed({ moves = [], notifications = [], tapeNewestAt, chainsLabel, pollOkAt, failures, now }) {
  const [tab, setTab] = useState('all')
  const items = useMemo(() => {
    const a = moves.map((m) => ({ type: 'move', at: m.at, m }))
    const b = notifications.map((n) => ({ type: 'alert', at: n.created_at, n }))
    return [...a, ...b].sort((x, y) => Date.parse(y.at) - Date.parse(x.at))
  }, [moves, notifications])
  const shown = items.filter((it) => tab === 'all' || (tab === 'wallets' ? it.type === 'move' : it.type === 'alert'))
  const health = healthOf({ newestAt: tapeNewestAt, now, lastPollOkAt: pollOkAt, intervalMs: 60_000, consecutiveFailures: failures })

  return (
    <Card data-testid="personal-feed">
      <SecHead
        title="Latest for you"
        count={`${items.length} in 24 h`}
        right={<HealthChip health={health} testId="tape-health" title={tapeNewestAt ? `Newest whale move ${hhmmUtc(tapeNewestAt)}` : 'No whale data in the last 24 h'} />}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <Tabs role="tablist" aria-label="Filter the feed">
          {[['all', 'All', items.length], ['wallets', 'Wallets', moves.length], ['alerts', 'Alerts', notifications.length]].map(([k, label, n]) => (
            <Tab key={k} role="tab" aria-selected={tab === k} $on={tab === k} onClick={() => setTab(k)} data-testid={`feed-tab-${k}`}>{label}<span>{n}</span></Tab>
          ))}
        </Tabs>
        {chainsLabel && <Muted style={{ fontSize: 12 }}>{chainsLabel}</Muted>}
      </div>
      {shown.length === 0 ? (
        <p style={{ margin: '18px 0 6px', fontSize: 13, color: T.muted }}>
          {tab === 'alerts' ? 'No alerts fired in the last 24 hours.' : 'No moves from the wallets you follow in the last 24 hours.'}
        </p>
      ) : (
        <List>
          {shown.slice(0, 40).map((it) => it.type === 'move' ? (
            <Item key={`m-${it.m.id}`} data-testid="feed-row">
              <Avatar src={it.m.avatar} name={it.m.wallet} size={32} />
              <div style={{ minWidth: 0 }}>
                <Title>{it.m.wallet} {it.m.direction === 'in' ? 'received' : 'sent'} {fmtUsd(it.m.usd)} of {it.m.token || 'tokens'}</Title>
                <Why>{it.m.why}</Why>
                <Meta>
                  {it.m.token && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><TokenIcon symbol={it.m.token} size={14} />{it.m.token}</span>}
                  <span style={{ textTransform: 'capitalize' }}>{it.m.chain}</span>
                  <span>{hhmmUtc(it.m.at)} · {timeAgo(it.m.at, now)}</span>
                  <TextLink href={askWallet(it.m)} style={{ fontSize: 12 }}>Ask ORCA about this</TextLink>
                </Meta>
              </div>
              <Amount style={{ color: toneColor(it.m.direction) }}>{it.m.direction === 'in' ? '+' : '-'}{fmtUsd(it.m.usd)}</Amount>
            </Item>
          ) : (
            <Item key={`a-${it.n.id}`} data-testid="feed-alert-row">
              <BellIcon />
              <div style={{ minWidth: 0 }}>
                <Title>{it.n.title}</Title>
                {it.n.body && <Why>{it.n.body}</Why>}
                <Meta>
                  <span>{KIND_LABEL[it.n.kind] || 'Alert'}</span>
                  <span>{hhmmUtc(it.n.created_at)} · {timeAgo(it.n.created_at, now)}</span>
                  <TextLink href={askAlert(it.n)} style={{ fontSize: 12 }}>Ask ORCA about this</TextLink>
                </Meta>
              </div>
              <Num style={{ fontSize: 12, color: T.muted }}>{it.n.read ? '' : 'New'}</Num>
            </Item>
          ))}
        </List>
      )}
    </Card>
  )
}
