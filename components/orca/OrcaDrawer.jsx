'use client'
/**
 * OrcaDrawer — Stage D (2026-05-26)
 * =============================================================================
 * Floating "Ask ORCA" pill, bottom-right of every authed surface, that
 * opens a right-side slide-in drawer hosting an embedded AskOrcaClient.
 * The drawer reuses the v1 /api/chat SSE endpoint AS IS, which means it
 * inherits Stage A intent routing, Stage B.2 Confirm/Cancel fast-writes,
 * Stage C suggested chips, and the ported chart/data card.
 *
 * Context auto-detection (Stage D contract):
 *   - `/token/<symbol>` (or `/tokens/`)  -> seeds ticker context
 *   - `/whale/<addr>`   (or `/whales/`, `/wallet-tracker/`) -> seeds wallet
 *   - anything else                       -> default chips
 *
 * Visibility:
 *   - Hidden on `/ai`, `/ai-advisor`, `/`, `/auth/*`, `/legal/*`,
 *     `/privacy/*`, `/terms/*`, `/subscribe/*` — see shouldShowDrawer().
 *   - Hidden when window width < 380 (would crowd the FeedbackWidget).
 *   - Kill switch: NEXT_PUBLIC_ORCA_DRAWER=false in env.
 *
 * Hard rules respected:
 *   - Additive only. No existing surface is modified or removed.
 *   - Single mount in app/components/ClientRoot.jsx; no per-page wiring.
 *   - Same SSE backend, same write-tools, same prompt.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import styled, { keyframes } from 'styled-components'
import AskOrcaClient from '@/app/ai/AskOrcaClient'
import { contextFromPath, shouldShowDrawer } from '@/lib/orca/contextFromPath'
import { FONT_SANS, FONT_MONO } from '@/src/styles/fontStacks'

const colors = {
  bgDark: '#0a0e17',
  bgPanel: 'rgba(12, 16, 26, 0.98)',
  primary: '#00e5ff',
  primaryDim: 'rgba(0, 229, 255, 0.18)',
  textPrimary: '#e0e6ed',
  textMuted: '#5a6a7a',
  borderLight: 'rgba(0, 229, 255, 0.18)',
}

const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0.4; }
  to   { transform: translateX(0); opacity: 1; }
`
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`

const Pill = styled.button`
  position: fixed;
  bottom: 1.25rem;
  right: 1.25rem;
  z-index: 950;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.05rem;
  background: linear-gradient(135deg, ${colors.primary} 0%, #00b8d4 100%);
  color: #0a0e17;
  border: none;
  border-radius: 999px;
  font-family: ${FONT_SANS};
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(0, 229, 255, 0.28), 0 0 0 1px rgba(0, 229, 255, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  &:hover { transform: translateY(-1px); box-shadow: 0 14px 36px rgba(0, 229, 255, 0.4); }
  &:focus-visible { outline: 2px solid #0a0e17; outline-offset: 2px; }

  @media (max-width: 600px) {
    bottom: 4.75rem; /* clear of the mobile feedback widget */
    padding: 0.6rem 0.9rem;
    font-size: 0.78rem;
  }
`

const PillIcon = styled.span`
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #0a0e17;
  box-shadow: 0 0 0 2px rgba(10, 14, 23, 0.4);
`

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
  animation: ${fadeIn} 0.15s ease;
`

const Panel = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(480px, 100vw);
  z-index: 1000;
  background: ${colors.bgPanel};
  border-left: 1px solid ${colors.borderLight};
  box-shadow: -20px 0 50px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  animation: ${slideIn} 0.22s cubic-bezier(0.22, 1, 0.36, 1);
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid ${colors.borderLight};
`

const Title = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`

const TitleMain = styled.span`
  font-family: ${FONT_MONO};
  font-size: 0.8rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${colors.primary};
  font-weight: 700;
`

const TitleSub = styled.span`
  font-family: ${FONT_SANS};
  font-size: 0.72rem;
  color: ${colors.textMuted};
`

const CloseBtn = styled.button`
  background: transparent;
  color: ${colors.textPrimary};
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  width: 32px;
  height: 32px;
  font-size: 1.05rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover { border-color: ${colors.primaryDim}; color: ${colors.primary}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 0.25rem;
`

export default function OrcaDrawer() {
  const pathname = usePathname()
  const enabled = process.env.NEXT_PUBLIC_ORCA_DRAWER !== 'false'
  const visible = enabled && shouldShowDrawer(pathname)
  const ctx = useMemo(() => contextFromPath(pathname), [pathname])
  const [open, setOpen] = useState(false)

  // Close on route change so the drawer doesn't leak stale context between pages.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // ESC to close.
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const close = useCallback(() => setOpen(false), [])

  if (!visible) return null

  const pillLabel = ctx.ticker
    ? `Ask ORCA about ${ctx.ticker}`
    : ctx.wallet
      ? 'Ask ORCA about this wallet'
      : 'Ask ORCA'

  const subtitle = ctx.ticker
    ? `$${ctx.ticker} \u00b7 from ${pathname || ''}`
    : ctx.wallet
      ? `wallet \u00b7 ${ctx.wallet.slice(0, 6)}\u2026${ctx.wallet.slice(-4)}`
      : 'Crypto AI copilot'

  return (
    <>
      {!open && (
        <Pill type="button" onClick={() => setOpen(true)} aria-label={pillLabel}>
          <PillIcon />
          {pillLabel}
        </Pill>
      )}
      {open && (
        <>
          <Backdrop onClick={close} />
          <Panel role="dialog" aria-label="Ask ORCA">
            <Header>
              <Title>
                <TitleMain>Ask ORCA</TitleMain>
                <TitleSub>{subtitle}</TitleSub>
              </Title>
              <CloseBtn type="button" onClick={close} aria-label="Close">{'\u00d7'}</CloseBtn>
            </Header>
            <Body>
              <AskOrcaClient
                embedded
                ticker={ctx.ticker || null}
                wallet={ctx.wallet || null}
              />
            </Body>
          </Panel>
        </>
      )}
    </>
  )
}
