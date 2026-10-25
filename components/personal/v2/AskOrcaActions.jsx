'use client'
/**
 * "Tell ORCA": everything on this page can also be done by asking ORCA
 * (lib/orca/orchestrator/fastWrites.ts). Each chip opens the ORCA drawer and
 * sends the command; ORCA answers with a Confirm card and the page refreshes
 * when it runs. Without the drawer, it opens /ai-advisor with the command.
 */
import React from 'react'
import styled from 'styled-components'
import { T } from '@/lib/ui/tokens'
import { Card, SecHead } from './ui'

const COMMANDS = [
  'Follow Wintermute',
  'Add LINK to my watchlist',
  'Alert me when ETH moves 5%',
  'Send me a test alert',
]

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`
const Chip = styled.button`
  height: 30px;
  padding: 0 10px;
  border-radius: ${T.radius.pill};
  border: 1px solid ${T.hairlineStrong};
  background: transparent;
  color: ${T.body};
  font-size: 12.5px;
  cursor: pointer;
  &:hover { border-color: ${T.accent}; color: ${T.ink}; }
  &:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; }
  &::before { content: '“'; color: ${T.muted}; }
  &::after { content: '”'; color: ${T.muted}; }
`

export function openOrcaWith(q) {
  const detail = { q, send: true, handled: false }
  try { window.dispatchEvent(new CustomEvent('orca:open', { detail })) } catch { /* ignore */ }
  if (!detail.handled) window.location.href = `/ai-advisor?q=${encodeURIComponent(q)}&send=1`
}

export default function AskOrcaActions({ compact = false }) {
  const chips = (
    <Chips>
      {COMMANDS.map((c) => (
        <Chip key={c} type="button" onClick={() => openOrcaWith(c)} data-testid="orca-command">{c}</Chip>
      ))}
    </Chips>
  )
  if (compact) {
    return (
      <div style={{ marginTop: 12 }}>
        <p style={{ margin: '0 0 8px', fontSize: 12.5, color: T.muted }}>Or just tell ORCA, for example:</p>
        {chips}
      </div>
    )
  }
  return (
    <Card data-testid="rail-orca-actions">
      <SecHead title="Tell ORCA" />
      <p style={{ margin: '0 0 10px', fontSize: 13, color: T.body }}>
        Everything on this page works by asking ORCA too: follow wallets, add coins, set or remove alerts, mute a coin.
      </p>
      {chips}
    </Card>
  )
}
