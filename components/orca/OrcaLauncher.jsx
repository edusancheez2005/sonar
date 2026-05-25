'use client'
/**
 * OrcaLauncher (v4 §4.3)
 * =============================================================================
 * Two things in one tiny component:
 *   1. Global keyboard handler — Cmd+K (Mac) / Ctrl+K (Win) opens the Drawer,
 *      Esc closes it. `?` shows a 4-line keyboard help overlay.
 *   2. Floating action button — bottom-right, 44x44 cyan-ringed circle that
 *      pops the Drawer on click.
 *
 * Lives in `app/layout.jsx`. Hides itself on routes where the launcher is
 * meaningless or distracting:
 *   - /auth/*       (signed-out flows)
 *   - /orca         (Studio is the launcher's bigger sibling)
 *   - signed-out marketing pages — handled by the host pages opting out via
 *     a `data-orca-launcher="off"` body attribute (v4 §4.3 leaves this as a
 *     host concern). The launcher only suppresses *itself* for the route
 *     allow-list; marketing-page opt-out is reserved for a later branch.
 *
 * Compliance:
 *   - No emojis (House Rules §3.5.2).
 *   - Keyboard handler ignores keystrokes while the user is typing in an
 *     input / textarea / contenteditable so Cmd+K doesn't fight native UX.
 *   - Pure styled-components; no images.
 */
import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import styled, { keyframes } from 'styled-components'
import { tokens } from '@/lib/ui/tokens'
import useOrcaContext from './useOrcaContext'
import { useOrcaDrawer } from './useOrcaDrawer'

// Routes where the launcher must not render at all.
const HIDDEN_PREFIXES = ['/auth', '/orca']

export function shouldRenderLauncher(pathname) {
  if (!pathname || typeof pathname !== 'string') return true
  const clean = pathname.split('?')[0].split('#')[0]
  return !HIDDEN_PREFIXES.some(
    (p) => clean === p || clean.startsWith(`${p}/`)
  )
}

/**
 * Returns true if the keydown event originated from an input-like element.
 * Pure — exported for testing.
 */
export function isTypingTarget(target) {
  if (!target || typeof target !== 'object') return false
  const tag = (target.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (target.isContentEditable) return true
  return false
}

/**
 * Returns true if this keydown is the open-launcher chord (Cmd+K / Ctrl+K).
 * Pure — exported for testing.
 */
export function isLauncherChord(e) {
  if (!e || typeof e.key !== 'string') return false
  if (e.key.toLowerCase() !== 'k') return false
  return Boolean(e.metaKey || e.ctrlKey)
}

const pulseRing = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(0, 229, 255, 0.45); }
  100% { box-shadow: 0 0 0 14px rgba(0, 229, 255, 0); }
`

const FloatBtn = styled.button`
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid ${tokens.surface.borderActive};
  background: ${tokens.accentDim};
  color: ${tokens.accent};
  font-weight: 700;
  letter-spacing: 0.05em;
  font-size: 13px;
  cursor: pointer;
  z-index: 9997;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform ${tokens.dur.fast}ms ${tokens.ease}, background ${tokens.dur.fast}ms ${tokens.ease};
  &:hover {
    transform: translateY(-1px);
    background: rgba(0, 229, 255, 0.22);
    animation: ${pulseRing} 1.4s ${tokens.ease} infinite;
  }
  &:focus-visible {
    outline: 2px solid ${tokens.accent};
    outline-offset: 3px;
  }
`

const HelpOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(7, 10, 18, 0.7);
  z-index: 9996;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

const HelpCard = styled.div`
  background: ${tokens.surface.panelHigh};
  border: 1px solid ${tokens.surface.border};
  border-radius: ${tokens.radius.lg}px;
  padding: ${tokens.pad.lg}px ${tokens.pad.xl}px;
  color: ${tokens.text};
  max-width: 320px;
  font-size: 13px;
  line-height: 1.7;
`

const KeyChord = styled.kbd`
  font-family: 'Geist Mono', ui-monospace, monospace;
  background: ${tokens.surface.panel};
  border: 1px solid ${tokens.surface.border};
  border-radius: ${tokens.radius.sm}px;
  padding: 1px 7px;
  color: ${tokens.accent};
  font-size: 11px;
  margin-right: 8px;
`

export default function OrcaLauncher() {
  const pathname = usePathname() || ''
  const { open, close, state, setFocus } = useOrcaDrawer()
  const routeFocus = useOrcaContext()
  const [helpOpen, setHelpOpen] = useState(false)

  // Keep the drawer's focus in sync with route changes (v4 §4.2 — route
  // changes do NOT close the drawer; instead the focus chip updates).
  useEffect(() => {
    if (state.open && routeFocus) {
      setFocus(routeFocus)
    }
  }, [routeFocus, state.open, setFocus])

  const handleOpen = useCallback(() => {
    open(routeFocus, '')
  }, [open, routeFocus])

  useEffect(() => {
    function onKey(e) {
      // Esc closes the help overlay first, then the drawer.
      if (e.key === 'Escape') {
        if (helpOpen) {
          setHelpOpen(false)
          return
        }
        if (state.open) {
          close()
        }
        return
      }
      // Ignore everything else while typing in a real input.
      if (isTypingTarget(e.target)) return

      if (isLauncherChord(e)) {
        e.preventDefault()
        if (state.open) close()
        else handleOpen()
        return
      }
      if (e.key === '?' && !state.open) {
        e.preventDefault()
        setHelpOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [state.open, helpOpen, close, handleOpen])

  if (!shouldRenderLauncher(pathname)) return null

  return (
    <>
      <FloatBtn
        type="button"
        onClick={handleOpen}
        aria-label="Open ORCA copilot (Ctrl+K)"
        data-testid="orca-launcher-fab"
      >
        K
      </FloatBtn>
      {helpOpen && (
        <HelpOverlay
          role="dialog"
          aria-label="Keyboard shortcuts"
          onClick={() => setHelpOpen(false)}
          data-testid="orca-launcher-help"
        >
          <HelpCard onClick={(e) => e.stopPropagation()}>
            <div><KeyChord>Ctrl K</KeyChord>Open / close ORCA</div>
            <div><KeyChord>Esc</KeyChord>Close ORCA</div>
            <div><KeyChord>/</KeyChord>Focus search</div>
            <div><KeyChord>?</KeyChord>Show this help</div>
          </HelpCard>
        </HelpOverlay>
      )}
    </>
  )
}
