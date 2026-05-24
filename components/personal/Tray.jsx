'use client'
/**
 * Tray \u2014 W5 §3.2 of ORCA_AGENTIC_REDESIGN_PROMPT.md
 * =============================================================================
 * Collapsible footer rail with three drawers:
 *   - trading  \u2014 mounts TradingComingSoon (locked surface per parent
 *                  doc §7.4).
 *   - memory   \u2014 link to /dashboard/personal/memory.
 *   - settings \u2014 placeholder text only (no live preference editor yet).
 *
 * Behaviour:
 *   - Buttons toggle a single open drawer (mutually exclusive).
 *   - ESC closes any open drawer.
 *   - Focus moves to the drawer on open (announced via role=region +
 *     aria-label).
 *
 * Compliance: never auto-opens; no marketing copy beyond what is already
 * locked in TradingComingSoon. No emojis.
 */
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import TradingComingSoon from '@/components/trading/TradingComingSoon'

const TrayBar = styled.div`
  margin-top: 18px;
  display: flex;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 14px;
`

const TrayBtn = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: ${(p) => (p.$active ? '#00e5ff' : '#8896a6')};
  border-color: ${(p) => (p.$active ? 'rgba(0, 229, 255, 0.4)' : 'rgba(255, 255, 255, 0.08)')};
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  &:hover { border-color: rgba(0, 229, 255, 0.4); color: #00e5ff; }
  &:focus-visible { outline: 2px solid #00e5ff; outline-offset: 2px; }
`

const Drawer = styled.div`
  margin-top: 12px;
  background: rgba(13, 20, 33, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 18px 20px;
  color: #e0e6ed;
`

const DrawerCopy = styled.p`
  margin: 0;
  font-size: 13px;
  color: #8896a6;
  line-height: 1.55;
`

const DRAWERS = [
  { key: 'trading', label: 'Trading' },
  { key: 'memory', label: 'Memory' },
  { key: 'settings', label: 'Settings' },
]

export default function Tray({ open, onChange }) {
  const drawerRef = useRef(null)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && open) {
        onChange && onChange(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onChange])

  useEffect(() => {
    if (open && drawerRef.current) {
      drawerRef.current.focus()
    }
  }, [open])

  function toggle(key) {
    if (!onChange) return
    onChange(open === key ? null : key)
  }

  return (
    <>
      <TrayBar role="toolbar" aria-label="Drawers" data-testid="tray">
        {DRAWERS.map((d) => (
          <TrayBtn
            key={d.key}
            type="button"
            $active={open === d.key}
            aria-expanded={open === d.key}
            aria-controls={`tray-drawer-${d.key}`}
            data-testid={`tray-${d.key}`}
            onClick={() => toggle(d.key)}
          >
            {d.label}
          </TrayBtn>
        ))}
      </TrayBar>

      {open === 'trading' && (
        <Drawer
          id="tray-drawer-trading"
          role="region"
          aria-label="Trading drawer"
          tabIndex={-1}
          ref={drawerRef}
          data-testid="tray-drawer-trading"
        >
          <TradingComingSoon variant="panel" />
        </Drawer>
      )}
      {open === 'memory' && (
        <Drawer
          id="tray-drawer-memory"
          role="region"
          aria-label="Memory drawer"
          tabIndex={-1}
          ref={drawerRef}
          data-testid="tray-drawer-memory"
        >
          <DrawerCopy>
            Manage the facts ORCA has saved about you at{' '}
            <Link href="/dashboard/personal/memory" style={{ color: '#00e5ff' }}>
              /dashboard/personal/memory
            </Link>
            . Delete any single fact or wipe the whole memory at any time.
          </DrawerCopy>
        </Drawer>
      )}
      {open === 'settings' && (
        <Drawer
          id="tray-drawer-settings"
          role="region"
          aria-label="Settings drawer"
          tabIndex={-1}
          ref={drawerRef}
          data-testid="tray-drawer-settings"
        >
          <DrawerCopy>
            Settings are managed from your onboarding flow today. A
            preference editor will land in the next iteration.
          </DrawerCopy>
        </Drawer>
      )}
    </>
  )
}
