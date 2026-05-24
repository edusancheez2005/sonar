'use client'
/**
 * CopilotPane \u2014 W5 §3.2 of ORCA_AGENTIC_REDESIGN_PROMPT.md
 * =============================================================================
 * Sticky right-column wrapper around PersonalCopilotPanel that adds:
 *   - A "context chip" header showing what ORCA is currently looking at
 *     (a ticker, a wallet, an article). Has an X to clear.
 *   - A slash-command palette above the input (/watchlist, /wallet,
 *     /explain, /news) that seeds the message draft so the user can edit
 *     before pressing send.
 *
 * The underlying PersonalCopilotPanel is unchanged; we drive it via the
 * existing `focusTicker`, `seedMessage`, and `onSeedConsumed` props
 * shipped in W1 + W4. This means all PersonalCopilotPanel tests stay
 * green and CopilotPane gets its own test surface.
 */
import { useState } from 'react'
import styled from 'styled-components'
import PersonalCopilotPanel from '@/components/orca/PersonalCopilotPanel'

const Outer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const ChipRow = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  min-height: 28px;
`

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.3);
  color: #00e5ff;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
`

const ChipLabel = styled.span`
  color: #6b7a8c;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
  font-size: 11px;
`

const ChipClose = styled.button`
  background: transparent;
  border: 0;
  color: #00e5ff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0 0 0 4px;
  &:hover { color: #fff; }
  &:focus-visible { outline: 2px solid #00e5ff; outline-offset: 2px; }
`

const Palette = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`

const SlashBtn = styled.button`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #8896a6;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 4px 10px;
  cursor: pointer;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  &:hover { color: #00e5ff; border-color: rgba(0, 229, 255, 0.35); }
  &:focus-visible { outline: 2px solid #00e5ff; outline-offset: 2px; }
`

const SLASH_COMMANDS = [
  { key: 'watchlist', label: '/watchlist', seed: 'show me my watchlist with today\u2019s moves' },
  { key: 'wallet', label: '/wallet', seed: 'what has the wallet 0x\u2026 been doing this week?' },
  { key: 'explain', label: '/explain', seed: 'explain why $TICKER moved today' },
  { key: 'news', label: '/news', seed: 'what news matters for my tickers today?' },
]

export default function CopilotPane({
  experienceLevel,
  tickers = [],
  focus = null,
  onClearFocus,
  client,
  fetchImpl,
}) {
  const [seed, setSeed] = useState('')
  const focusTicker = focus?.type === 'ticker' ? String(focus.value || '').toUpperCase() : ''

  return (
    <Outer data-testid="copilot-pane">
      <ChipRow aria-label="Current focus">
        {focus ? (
          <Chip data-testid="context-chip">
            <ChipLabel>Looking at:</ChipLabel>
            {focus.label || focus.value}
            <ChipClose
              type="button"
              aria-label="Clear focus"
              data-testid="context-chip-clear"
              onClick={() => onClearFocus && onClearFocus()}
            >
              \u00D7
            </ChipClose>
          </Chip>
        ) : (
          <Chip style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.06)', color: '#6b7a8c' }}>
            <ChipLabel>No focus pinned</ChipLabel>
          </Chip>
        )}
      </ChipRow>

      <Palette role="toolbar" aria-label="Slash commands">
        {SLASH_COMMANDS.map((c) => (
          <SlashBtn
            key={c.key}
            type="button"
            data-testid={`slash-${c.key}`}
            onClick={() => setSeed(c.seed)}
          >
            {c.label}
          </SlashBtn>
        ))}
      </Palette>

      <PersonalCopilotPanel
        experienceLevel={experienceLevel}
        tickers={tickers}
        client={client}
        fetchImpl={fetchImpl}
        focusTicker={focusTicker}
        seedMessage={seed}
        onSeedConsumed={() => setSeed('')}
      />
    </Outer>
  )
}
