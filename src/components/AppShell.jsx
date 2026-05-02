'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import NextLink from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { FONT_SANS } from '@/src/styles/fontStacks'
import Footer from '@/src/components/Footer'
import TokenSearchField from '@/src/components/nav/TokenSearchField'
import { isWalletTrackerPath } from '@/src/components/nav/navUtils'

/** Neon cyan chrome — aligned with landing V2Hero / HeroTitle gradients */
const S = {
  accent: 'var(--neon-cyan)',
  accentBright: 'var(--neon-bright)',
  accentSoft: 'var(--neon-fill-strong)',
  accentLine: 'var(--neon-line)',
  border: 'var(--neon-border)',
  railBg: 'rgba(6, 12, 20, 0.94)',
  headerBg: 'rgba(4, 10, 16, 0.94)',
  muted: 'rgba(160, 210, 220, 0.68)',
}

const RAIL_COLLAPSED_KEY = 'sonar-shell-rail-collapsed'
const MQ_NARROW = 'max-width: 900px'
const MQ_NARROW_QUERY = `(max-width: 900px)`

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100dvh;
  min-height: 100vh;
  max-height: 100dvh;
  overflow: hidden;
  background:
    radial-gradient(1000px 520px at 12% -10%, rgba(34, 211, 238, 0.12), transparent 55%),
    radial-gradient(800px 480px at 100% 100%, rgba(14, 116, 144, 0.14), transparent 55%),
    linear-gradient(180deg, var(--shell-deep-a) 0%, var(--shell-deep-b) 50%, var(--shell-deep-a) 100%);
`

const ChromeHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  flex-shrink: 0;
  padding: 0.4rem 1rem 0.55rem 1.1rem;
  border-bottom: 1px solid ${S.border};
  background: ${S.headerBg};
  backdrop-filter: blur(14px);
  font-family: ${FONT_SANS};
  box-shadow: 0 0 24px rgba(34, 211, 238, 0.06);
  position: relative;
  z-index: 200;
  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.35), transparent);
    opacity: 0.5;
    pointer-events: none;
  }
`

const LogoMark = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  a {
    display: flex;
    align-items: center;
    line-height: 0;
  }
  img {
    height: 34px;
    width: auto;
    max-width: 180px;
    object-fit: contain;
    display: block;
    transform: translateY(-1px);
  }
  @media (min-width: 901px) {
    img {
      height: 38px;
    }
  }
`

const HeaderCenter = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
  align-items: center;
`

const HeaderSearchWrap = styled.div`
  width: 100%;
  max-width: min(440px, 92vw);
  min-width: 0;
  position: relative;
  z-index: 210;
`

const HeaderEnd = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-left: auto;
`

const MobileMenuBtn = styled.button`
  display: none;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 9px;
  border: 1px solid ${S.accentLine};
  background: rgba(6, 14, 22, 0.75);
  color: var(--neon-bright);
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  align-items: center;
  justify-content: center;
  @media (${MQ_NARROW}) {
    display: inline-flex;
  }
`

const BodyRow = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: stretch;
`

const SidebarBackdrop = styled.button`
  display: none;
  @media (${MQ_NARROW}) {
    display: ${({ $open }) => ($open ? 'block' : 'none')};
    position: fixed;
    inset: 0;
    z-index: 90;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    cursor: pointer;
  }
`

/**
 * Nansen-style rail.
 *
 * Desktop: the rail is ALWAYS `position: absolute` (out of flex flow) so its
 * `position` never changes between states. Only `width` transitions, and the
 * `MainColumn` reserves space via a `margin-left` that animates with the
 * SAME duration + easing as the rail. This eliminates the "jump" you used to
 * get when pinning the menu open (which previously flipped position from
 * absolute → relative instantly).
 *
 * Mobile: standard fixed drawer using transform.
 */
const Sidebar = styled.aside`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  font-family: ${FONT_SANS};
  border-right: 1px solid ${S.border};
  background: ${S.railBg};
  backdrop-filter: blur(16px);
  overflow: hidden;

  @media (min-width: 901px) {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    padding: 0.85rem 0.6rem 1rem;
    z-index: 120;
    will-change: width;
    transition:
      width 320ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 240ms ease;

    width: ${({ $expanded, $peek }) => ($expanded || $peek ? '236px' : '64px')};
    box-shadow: ${({ $expanded, $peek }) =>
      $expanded
        ? 'inset -1px 0 0 rgba(34, 211, 238, 0.06), 4px 0 32px rgba(0, 0, 0, 0.2)'
        : $peek
          ? '12px 0 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(34, 211, 238, 0.12)'
          : '4px 0 24px rgba(0, 0, 0, 0.25)'};
  }

  @media (${MQ_NARROW}) {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(268px, 88vw);
    padding: 0.85rem 0.6rem 1rem;
    z-index: 100;
    transform: translateX(${({ $open }) => ($open ? '0' : '-100%')});
    box-shadow: ${({ $open }) =>
      $open ? '10px 0 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(34, 211, 238, 0.12)' : 'none'};
    transition: transform 0.22s ease;
  }
`

const NavStack = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  padding: 0.15rem 0;
`

const SidebarFooter = styled.div`
  margin-top: auto;
  flex-shrink: 0;
  padding-top: 0.75rem;
  border-top: 1px solid ${S.border};
  display: flex;
  flex-direction: column;
`

/**
 * Generic sidebar footer row (icon + label + optional badge) used by the
 * Settings, Logout, and Telegram entries. Padding/gap match ShellRailItem so
 * the icon column aligns with nav icons in both collapsed and expanded states.
 *
 * Variants:
 *   $tone="danger"   → uses warm red on hover (Logout).
 *   $disabled        → not-allowed cursor + dimmed (Telegram coming soon).
 */
const FooterRow = styled.button`
  display: none;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  margin: 0 0 0.2rem;
  padding: 0.5rem 0.55rem;
  justify-content: flex-start;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ $tone }) => ($tone === 'danger' ? 'rgba(245, 165, 165, 0.78)' : S.muted)};
  font-family: ${FONT_SANS};
  font-size: 0.82rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.78 : 1)};
  text-decoration: none;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, opacity 0.18s ease;
  &:hover {
    color: ${({ $tone }) => ($tone === 'danger' ? '#ffb4b4' : 'var(--neon-bright)')};
    background: ${({ $tone }) =>
      $tone === 'danger' ? 'rgba(231, 76, 60, 0.08)' : 'rgba(34, 211, 238, 0.06)'};
    border-color: ${({ $tone }) =>
      $tone === 'danger' ? 'rgba(231, 76, 60, 0.18)' : 'rgba(34, 211, 238, 0.1)'};
    opacity: 1;
  }
  @media (min-width: 901px) {
    display: flex;
  }
  .fr-icon {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: inherit;
    opacity: 0.9;
  }
  .fr-label {
    flex: 1;
    min-width: 0;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fr-badge {
    flex-shrink: 0;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.12rem 0.36rem;
    border-radius: 6px;
    border: 1px solid rgba(34, 211, 238, 0.28);
    color: var(--neon-bright);
    background: rgba(34, 211, 238, 0.08);
  }
`

/**
 * Nansen-style bottom bar: Collapse / Expand menu + shortcut.
 * Padding/gap match ShellRailItem so the chevron icon sits at the same X as
 * nav icons in BOTH collapsed and expanded states.
 */
const CollapseRailRow = styled.button`
  display: none;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  margin: 0;
  padding: 0.5rem 0.55rem;
  justify-content: flex-start;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: ${S.muted};
  font-family: ${FONT_SANS};
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  &:hover {
    color: var(--neon-bright);
    background: rgba(34, 211, 238, 0.06);
    border-color: rgba(34, 211, 238, 0.1);
  }
  @media (min-width: 901px) {
    display: flex;
  }
  .cr-icon {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: inherit;
    opacity: 0.9;
  }
  .cr-label {
    flex: 1;
    min-width: 0;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cr-kbd {
    flex-shrink: 0;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 0.1rem 0.32rem;
    border-radius: 6px;
    border: 1px solid ${S.accentLine};
    color: var(--neon-bright);
    background: rgba(4, 12, 20, 0.85);
    box-shadow: 0 0 10px rgba(34, 211, 238, 0.1);
  }
`

const MainColumn = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  position: relative;

  @media (min-width: 901px) {
    /**
     * Mirrors the rail's width transition exactly so the page slides in
     * sync with the menu opening/closing. No position flips here either,
     * just margin animation.
     */
    margin-left: ${({ $expanded }) => ($expanded ? '236px' : '64px')};
    transition: margin-left 320ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: margin-left;
  }
  @media (${MQ_NARROW}) {
    margin-left: 0;
  }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background-image:
      linear-gradient(rgba(34, 211, 238, 0.034) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34, 211, 238, 0.034) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(900px 70% at 50% 0%, black, transparent 85%);
    opacity: 0.55;
  }
  > footer {
    position: relative;
    z-index: 2;
    flex-shrink: 0;
  }
`

/**
 * MainInner uses `flex: 1 0 auto` so it:
 *   - GROWS to fill MainColumn when content is short (lets chat-style pages
 *     like Orca that use `height: 100%` resolve to a real height).
 *   - NEVER shrinks below its content size, so tall pages (min-height: 100vh)
 *     keep their full height and MainColumn naturally scrolls. Without this,
 *     tall content collapses behind the Footer (which sits in the same
 *     flex-column with z-index: 2) and only the footer is visible.
 */
const MainInner = styled.main`
  flex: 1 0 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
`

const ShellRailItem = styled(motion.div)`
  width: 100%;
  a {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    justify-content: flex-start;
    padding: 0.5rem 0.55rem;
    min-height: 40px;
    border-radius: 10px;
    text-decoration: none;
    font-size: 0.92rem;
    font-weight: ${({ $active }) => ($active ? 600 : 400)};
    letter-spacing: 0.02em;
    color: ${({ $active }) => ($active ? 'var(--neon-bright)' : S.muted)};
    background: ${({ $active }) => ($active ? 'var(--neon-fill)' : 'transparent')};
    border: 1px solid ${({ $active }) => ($active ? 'rgba(34, 211, 238, 0.18)' : 'transparent')};
    box-shadow: ${({ $active, $collapsed }) =>
      $active && $collapsed
        ? '0 0 0 1px rgba(34, 211, 238, 0.18) inset, 0 0 14px rgba(34, 211, 238, 0.18)'
        : $active
          ? '0 0 0 1px rgba(34, 211, 238, 0.06) inset'
          : 'none'};
    transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease,
      box-shadow 0.18s ease;

    .ico {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
      color: inherit;
      filter: ${({ $active, $collapsed }) =>
        $active && $collapsed
          ? 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.55))'
          : 'none'};
      transition: filter 0.18s ease;
    }

    .ico svg {
      width: 20px;
      height: 20px;
      display: block;
    }

    .lab {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .badge {
      flex-shrink: 0;
      font-size: 0.58rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.12rem 0.36rem;
      border-radius: 6px;
      border: 1px solid rgba(34, 211, 238, 0.28);
      color: var(--neon-bright);
      background: rgba(34, 211, 238, 0.08);
    }

    &:hover {
      color: var(--neon-bright);
      background: ${({ $active }) =>
        $active ? 'rgba(34, 211, 238, 0.18)' : 'rgba(34, 211, 238, 0.06)'};
      border-color: ${({ $active }) =>
        $active ? 'rgba(34, 211, 238, 0.32)' : 'rgba(34, 211, 238, 0.1)'};
    }
  }
`

/**
 * Coming-soon rail entry (e.g. Mobile app). Mirrors the Telegram FooterRow
 * pattern visually — slight opacity dim, cyan hover restore, identical
 * "SOON" badge — but lives in the main rail next to real nav items.
 */
const DisabledRailRow = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  justify-content: flex-start;
  padding: 0.5rem 0.55rem;
  min-height: 40px;
  border-radius: 10px;
  font-size: 0.92rem;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: ${S.muted};
  background: transparent;
  border: 1px solid transparent;
  cursor: not-allowed;
  user-select: none;
  opacity: 0.78;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, opacity 0.18s ease;

  &:hover {
    color: var(--neon-bright);
    background: rgba(34, 211, 238, 0.06);
    border-color: rgba(34, 211, 238, 0.1);
    opacity: 1;
  }

  .ico {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 0;
    color: inherit;
    opacity: 0.9;
  }
  .ico svg { width: 20px; height: 20px; display: block; }

  .lab {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .badge {
    flex-shrink: 0;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.12rem 0.36rem;
    border-radius: 6px;
    border: 1px solid rgba(34, 211, 238, 0.28);
    color: var(--neon-bright);
    background: rgba(34, 211, 238, 0.08);
  }
`

const itemVariants = { hidden: { opacity: 0, x: -5 }, visible: { opacity: 1, x: 0 } }

/** Token mark — outer ring with a centered diamond, à la Nansen "Tokens". */
function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8.2 15.8 12 12 15.8 8.2 12Z" fill="currentColor" />
    </svg>
  )
}
function IconChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19h16M7 15v-5m5 5V8m5 7V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
/** Minimal whale / fluke — line icon to match the rest of the rail */
function IconWhale() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12c1.2-3.2 4-5 8-5 3.2 0 5.8 1.6 6.5 4 .4 1.4.3 2.9-.2 4.2M19 10l2.5-2M19 14l2.5 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 16c1.2 1.6 3 2.5 5.2 2.5 1.4 0 2.6-.4 3.6-1.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
function IconTrending() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 16l4-4 4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 8h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconNews() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6h9v12H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 6h3a2 2 0 0 1 2 2v3h-5V6Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 11h5M8 14h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IconSpark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v3M12 18v3M4.2 12H7M17 12h2.8M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M6.3 17.7l2.1-2.1M15.6 8.4l2.1-2.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
function IconTag() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 10.5V6a2 2 0 0 1 2-2h4.5L20 13l-5 5L4 10.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="8.5" cy="7.5" r="1" fill="currentColor" />
    </svg>
  )
}
function IconHelp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 4.3-1.7 2.5 2.5 0 0 1-2 4.2H12v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  )
}

/** Personalize — user silhouette with a small spark, signalling tailored UX. */
function IconPersonalize() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.8 19c.6-3.1 3.2-5 6.2-5s5.6 1.9 6.2 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 4l.8 2 2 .8-2 .8L18 9.6l-.8-2-2-.8 2-.8L18 4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

const APP_LINKS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    match: (p) => p === '/dashboard' || p?.startsWith('/dashboard/'),
    Icon: IconDashboard,
  },
  {
    href: '/statistics',
    label: 'Statistics',
    match: (p) => p === '/statistics' || p?.startsWith('/statistics/'),
    Icon: IconChart,
  },
  {
    href: '/wallet-tracker',
    label: 'Whales',
    match: (p) => isWalletTrackerPath(p),
    Icon: IconWhale,
  },
  {
    href: '/trending',
    label: 'Trending',
    match: (p) => p === '/trending' || p?.startsWith('/trending/'),
    Icon: IconTrending,
  },
  {
    href: '/news',
    label: 'News',
    match: (p) => p === '/news' || p?.startsWith('/news/'),
    Icon: IconNews,
  },
  {
    href: '/ai-advisor',
    label: 'Orca AI 2.0',
    match: (p) => p === '/ai-advisor' || p?.startsWith('/ai-advisor/'),
    Icon: IconSpark,
  },
  {
    href: '/personalize',
    label: 'Personalize',
    match: (p) => p === '/personalize' || p?.startsWith('/personalize/'),
    Icon: IconPersonalize,
    soon: true,
  },
]

const FOOTER_LINKS = [
  {
    href: '/subscribe',
    label: 'Pricing',
    match: (p) => p === '/subscribe' || p?.startsWith('/subscribe/'),
    Icon: IconTag,
  },
  {
    href: '/help',
    label: 'Help',
    match: (p) => p === '/help' || p?.startsWith('/help/'),
    Icon: IconHelp,
  },
]

/** Double sparkle / stars — line-art, matches the rail. */
function IconStars() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 4l1.4 3.6L19 9l-3.6 1.4L14 14l-1.4-3.6L9 9l3.6-1.4L14 4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 13l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4L4.2 16.3l2.4-.9.9-2.4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Speech bubble — for the sidebar Feedback row. */
function IconFeedback() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5V14a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4a.6.6 0 0 1-1-.46V16.5A2.5 2.5 0 0 1 4 14V6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 9.5h7.6M8.2 12h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconGear() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 12H4m0 0 3-3m-3 3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconTelegram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21.5 4.2 18.6 19.4c-.2 1-.8 1.2-1.6.7l-4.4-3.3-2.1 2c-.2.2-.4.4-.9.4l.3-4.5 8.2-7.4c.4-.3-.1-.5-.6-.2L7.4 12.7 3 11.4c-1-.3-1-1 .2-1.5L20 3.3c.8-.3 1.6.2 1.5 1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconDoubleChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 7l-5 5 5 5M17 7l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconDoubleChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M13 7l5 5-5 5M7 7l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function AppShell({ children, onLogout }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [isNarrow, setIsNarrow] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [railPeek, setRailPeek] = useState(false)
  const railPeekLeaveTimer = useRef(null)

  const readCollapsed = useCallback(() => {
    try {
      return localStorage.getItem(RAIL_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    setRailCollapsed(readCollapsed())
    const sb = supabaseBrowser()
    sb.auth.getSession().then(({ data }) => setSession(data.session || null))
    sb.auth.getUser().then(({ data }) => setUser(data?.user || null))
    const { data: sub } = sb.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      setUser(sess?.user || null)
    })
    return () => sub?.subscription?.unsubscribe?.()
  }, [readCollapsed])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const mq = window.matchMedia(MQ_NARROW_QUERY)
    const sync = () => setIsNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!railCollapsed) setRailPeek(false)
  }, [railCollapsed])

  useEffect(() => {
    if (isNarrow) setRailPeek(false)
  }, [isNarrow])

  const clearRailPeekLeaveTimer = useCallback(() => {
    if (railPeekLeaveTimer.current) {
      clearTimeout(railPeekLeaveTimer.current)
      railPeekLeaveTimer.current = null
    }
  }, [])

  const scheduleCloseRailPeek = useCallback(() => {
    if (!isNarrow && railCollapsed) {
      clearRailPeekLeaveTimer()
      railPeekLeaveTimer.current = setTimeout(() => setRailPeek(false), 180)
    }
  }, [isNarrow, railCollapsed, clearRailPeekLeaveTimer])

  const scheduleOpenRailPeek = useCallback(() => {
    if (!isNarrow && railCollapsed) {
      clearRailPeekLeaveTimer()
      railPeekLeaveTimer.current = setTimeout(() => setRailPeek(true), 60)
    }
  }, [isNarrow, railCollapsed, clearRailPeekLeaveTimer])

  const toggleRail = useCallback(() => {
    setRailPeek(false)
    clearRailPeekLeaveTimer()
    setRailCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(RAIL_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [clearRailPeekLeaveTimer])

  /** Nansen-style: ⌘B / Ctrl+B toggles the rail (desktop only); ignored in inputs. */
  useEffect(() => {
    const onKey = (e) => {
      if (isNarrow) return
      if (!e.metaKey && !e.ctrlKey) return
      if (e.key.toLowerCase() !== 'b') return
      const t = e.target
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return
      if (t && typeof t === 'object' && 'isContentEditable' in t && t.isContentEditable) return
      e.preventDefault()
      toggleRail()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isNarrow, toggleRail])

  useEffect(() => () => clearRailPeekLeaveTimer(), [clearRailPeekLeaveTimer])

  if (!mounted) return null

  const isAuthenticated = !!(session || user)
  const showCollapsedRail = !isNarrow && railCollapsed
  const railIconOnly = showCollapsedRail && !railPeek
  const sidebarOpenMobile = drawerOpen

  const kbdSidebar =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? '⌘B' : 'Ctrl+B'

  const handleLogout = async () => {
    try {
      await supabaseBrowser().auth.signOut()
    } catch {
      /* ignore */
    }
    if (onLogout) onLogout()
    router.push('/')
  }

  /**
   * Nansen-style: while peeking the collapsed rail, clicking the expand
   * button pins the rail open (uncollapses), instead of closing the peek.
   * Otherwise, just toggles collapsed/expanded.
   */
  const onCollapseBarClick = () => {
    if (showCollapsedRail) {
      setRailPeek(false)
      clearRailPeekLeaveTimer()
      setRailCollapsed(false)
      try {
        localStorage.setItem(RAIL_COLLAPSED_KEY, '0')
      } catch {
        /* ignore */
      }
      return
    }
    toggleRail()
  }

  return (
    <Shell>
      <ChromeHeader>
        <LogoMark>
          <NextLink href="/">
            <img src="/logo2.png" alt="Sonar" />
          </NextLink>
        </LogoMark>
        <HeaderCenter>
          <HeaderSearchWrap>
            <TokenSearchField tone="shell" />
          </HeaderSearchWrap>
        </HeaderCenter>
        <HeaderEnd>
          <MobileMenuBtn type="button" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
            ☰
          </MobileMenuBtn>
        </HeaderEnd>
      </ChromeHeader>

      <BodyRow>
        <SidebarBackdrop type="button" aria-label="Close menu" $open={sidebarOpenMobile} onClick={() => setDrawerOpen(false)} />
        <Sidebar
          $expanded={!isNarrow && !railCollapsed}
          $peek={!isNarrow && railCollapsed && railPeek}
          $open={sidebarOpenMobile}
          onMouseEnter={scheduleOpenRailPeek}
          onMouseLeave={scheduleCloseRailPeek}
        >
          <NavStack>
            {APP_LINKS.map(({ href, label, match, Icon, soon }) => (
              <ShellRailItem
                key={href}
                $active={match(pathname)}
                $collapsed={railIconOnly}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <NextLink
                  href={href}
                  aria-label={soon ? `${label} — preview` : label}
                  title={railIconOnly ? (soon ? `${label} — preview` : label) : undefined}
                  onClick={() => setDrawerOpen(false)}
                >
                  <span className="ico" aria-hidden>
                    <Icon />
                  </span>
                  {!railIconOnly ? <span className="lab">{label}</span> : null}
                  {!railIconOnly && soon ? <span className="badge">Soon</span> : null}
                </NextLink>
              </ShellRailItem>
            ))}
            <DisabledRailRow
              title={railIconOnly ? 'Mobile app — coming soon' : 'Coming soon'}
              aria-label="Mobile app — coming soon"
            >
              <span className="ico" aria-hidden>
                <IconStars />
              </span>
              {!railIconOnly ? (
                <>
                  <span className="lab">Mobile app</span>
                  <span className="badge">Soon</span>
                </>
              ) : null}
            </DisabledRailRow>
          </NavStack>
          <SidebarFooter>
            <FooterRow
              type="button"
              $disabled
              aria-disabled="true"
              title="Telegram access — coming soon"
              aria-label="Telegram access — coming soon"
              onClick={(e) => e.preventDefault()}
            >
              <span className="fr-icon" aria-hidden>
                <IconTelegram />
              </span>
              {!railIconOnly ? (
                <>
                  <span className="fr-label">Telegram access</span>
                  <span className="fr-badge">Soon</span>
                </>
              ) : null}
            </FooterRow>
            {FOOTER_LINKS.map(({ href, label, Icon }) => (
              <FooterRow
                key={href}
                as={NextLink}
                href={href}
                title={railIconOnly ? label : undefined}
                aria-label={label}
                onClick={() => setDrawerOpen(false)}
              >
                <span className="fr-icon" aria-hidden>
                  <Icon />
                </span>
                {!railIconOnly ? <span className="fr-label">{label}</span> : null}
              </FooterRow>
            ))}
            <FooterRow
              type="button"
              title={railIconOnly ? 'Feedback' : undefined}
              aria-label="Feedback"
              onClick={() => {
                setDrawerOpen(false)
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('sonar:feedback:open'))
                }
              }}
            >
              <span className="fr-icon" aria-hidden>
                <IconFeedback />
              </span>
              {!railIconOnly ? <span className="fr-label">Feedback</span> : null}
            </FooterRow>
            {isAuthenticated ? (
              <>
                <FooterRow
                  as={NextLink}
                  href="/profile"
                  title={railIconOnly ? 'Settings' : undefined}
                  aria-label="Settings"
                  onClick={() => setDrawerOpen(false)}
                >
                  <span className="fr-icon" aria-hidden>
                    <IconGear />
                  </span>
                  {!railIconOnly ? <span className="fr-label">Settings</span> : null}
                </FooterRow>
                <FooterRow
                  type="button"
                  $tone="danger"
                  title={railIconOnly ? 'Logout' : undefined}
                  aria-label="Logout"
                  onClick={handleLogout}
                >
                  <span className="fr-icon" aria-hidden>
                    <IconLogout />
                  </span>
                  {!railIconOnly ? <span className="fr-label">Logout</span> : null}
                </FooterRow>
              </>
            ) : null}
            <CollapseRailRow
              type="button"
              aria-expanded={!isNarrow ? !railCollapsed : undefined}
              aria-keyshortcuts="Meta+B Control+B"
              aria-label={
                showCollapsedRail
                  ? `Expand menu (${kbdSidebar})`
                  : `Collapse menu (${kbdSidebar})`
              }
              title={
                showCollapsedRail
                  ? `Expand menu (${kbdSidebar})`
                  : `Collapse menu (${kbdSidebar})`
              }
              onClick={onCollapseBarClick}
            >
              <span className="cr-icon" aria-hidden>
                {showCollapsedRail ? (
                  <IconDoubleChevronRight />
                ) : (
                  <IconDoubleChevronLeft />
                )}
              </span>
              {!railIconOnly ? (
                <>
                  <span className="cr-label">
                    {showCollapsedRail ? 'Expand menu' : 'Collapse menu'}
                  </span>
                  <span className="cr-kbd">{kbdSidebar}</span>
                </>
              ) : null}
            </CollapseRailRow>
          </SidebarFooter>
        </Sidebar>
        <MainColumn $expanded={!isNarrow && !railCollapsed}>
          <MainInner>{children}</MainInner>
          <Footer />
        </MainColumn>
      </BodyRow>
    </Shell>
  )
}
