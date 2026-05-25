'use client'
/**
 * OrcaDrawer (Surface A)
 * =============================================================================
 * 420px right-edge slide-in. Header (title + Pin/Close buttons), body is the
 * shared <OrcaConversation variant="drawer" />. Esc closes; outside-click
 * closes unless pinned. Route changes do NOT close it — see useOrcaContext
 * which keeps the focus chip in sync inside the atom.
 *
 * See ORCA_UNIFIED_COPILOT_PROMPT_V4.md §4.2.
 *
 * Mounted ONCE in `app/layout.jsx`. Children should never render their own
 * OrcaDrawer; instead they call `useOrcaDrawer().open({focus, seed})`.
 *
 * No emojis. All visual tokens from `lib/ui/tokens`.
 */
import { useEffect, useRef } from 'react'
import styled, { keyframes } from 'styled-components'
import { tokens } from '@/lib/ui/tokens'
import OrcaConversation from './OrcaConversation'
import { useOrcaDrawer } from './useOrcaDrawer'

const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
`

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
  z-index: 9998;
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? 'auto' : 'none')};
  transition: opacity ${tokens.dur.base}ms ${tokens.ease};
`

const Panel = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: min(420px, 100vw);
  background: ${tokens.surface.base};
  border-left: 1px solid ${tokens.surface.border};
  box-shadow: -16px 0 48px rgba(0, 0, 0, 0.45);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  animation: ${slideIn} ${tokens.dur.base}ms ${tokens.ease};
  transform: ${(p) => (p.$open ? 'translateX(0)' : 'translateX(100%)')};
  transition: transform ${tokens.dur.base}ms ${tokens.ease};

  @media (max-width: 767px) {
    width: 100vw;
    border-left: none;
  }
`

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: ${tokens.pad.md}px ${tokens.pad.lg}px;
  border-bottom: 1px solid ${tokens.surface.border};
`

const Title = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: ${tokens.text};
`

const HeaderActions = styled.div`
  display: flex;
  gap: 6px;
`

const IconButton = styled.button`
  background: transparent;
  border: 1px solid ${tokens.surface.border};
  color: ${(p) => (p.$active ? tokens.accent : tokens.textMuted)};
  border-radius: ${tokens.radius.sm}px;
  padding: 5px 10px;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color ${tokens.dur.fast}ms ${tokens.ease}, border-color ${tokens.dur.fast}ms ${tokens.ease};
  &:hover { color: ${tokens.accent}; border-color: ${tokens.surface.borderActive}; }
`

const Body = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

export default function OrcaDrawer() {
  const { state, close, pin, unpin } = useOrcaDrawer()
  const panelRef = useRef(null)

  // Esc closes.
  useEffect(() => {
    if (!state.open) return
    function onKey(e) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [state.open, close])

  // Outside-click closes unless pinned.
  function onBackdropClick() {
    if (!state.pinned) close()
  }

  // While closed, still render the Panel (transform:translateX(100%)) so the
  // exit animation plays. Skip rendering only when never opened (saves DOM).
  // For simplicity we always mount once `state.open` has been true at least
  // once — gated by the hasOpened ref below.
  const hasOpened = useRef(false)
  if (state.open) hasOpened.current = true
  if (!hasOpened.current) return null

  return (
    <>
      <Backdrop $open={state.open} onClick={onBackdropClick} aria-hidden="true" />
      <Panel
        ref={panelRef}
        $open={state.open}
        role="dialog"
        aria-modal={state.pinned ? 'false' : 'true'}
        aria-label="ORCA copilot"
        data-testid="orca-drawer"
        data-open={state.open ? 'true' : 'false'}
      >
        <Header>
          <Title>ORCA</Title>
          <HeaderActions>
            <IconButton
              type="button"
              $active={state.pinned}
              onClick={state.pinned ? unpin : pin}
              data-testid="orca-drawer-pin"
              aria-pressed={state.pinned}
              aria-label={state.pinned ? 'Unpin drawer' : 'Pin drawer'}
            >
              {state.pinned ? 'Pinned' : 'Pin'}
            </IconButton>
            <IconButton
              type="button"
              onClick={close}
              data-testid="orca-drawer-close"
              aria-label="Close ORCA"
            >
              Close
            </IconButton>
          </HeaderActions>
        </Header>
        <Body>
          <OrcaConversation
            variant="drawer"
            focus={state.focus}
            initialDraft={state.seed || ''}
            sessionId={state.sessionId}
          />
        </Body>
      </Panel>
    </>
  )
}
