'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import styled, { keyframes, css } from 'styled-components'
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'

/**
 * Public-facing reveal page for the Personalize feature. Marketing-grade —
 * scroll-driven progress bar, magnetic wallet tiles with brand colours,
 * sticky split section with a live-feeling dashboard mock, and a
 * timeline-style feature reveal. Mirrors Sonar's existing dark/cyan
 * aesthetic. No emojis. Wallet brand marks drawn inline as SVG so they
 * crisp-render at any size and tint cleanly with their brand colours.
 */

/* ─────────────────────────────────────────────────────────────────────────
 * Brand mark SVGs — recognisable silhouettes in canonical brand colours.
 * ──────────────────────────────────────────────────────────────────── */

function MarkMetaMask() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id="mm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F6851B" />
          <stop offset="100%" stopColor="#E2761B" />
        </linearGradient>
      </defs>
      <path
        d="M5 7l11 7-3-7H5zm30 0L24 14l3-7h8zM8 30l6-3-3-5-3 8zm24 0l-6-3 3-5 3 8zm-15-9l3-2 3 2-1.5 4h-3L17 21z"
        fill="url(#mm-g)"
        stroke="#763E1A"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <circle cx="13.5" cy="11.5" r="0.9" fill="#fff" />
      <circle cx="26.5" cy="11.5" r="0.9" fill="#fff" />
    </svg>
  )
}

function MarkWalletConnect() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <rect width="40" height="40" rx="10" fill="#3B99FC" />
      <path
        d="M11 16.6c4.9-4.8 12.9-4.8 17.8 0l.6.6-2.1 2-.6-.6c-3.4-3.3-9-3.3-12.4 0l-.7.7-2.1-2 .5-.7zM7.6 20l2.4 2.4 2.9-2.8 2.9 2.8 2.9-2.8 2.9 2.8 2.9-2.8L29.4 22 32 19.4l-2.4-2.4-3 2.9-2.8-2.9-3 2.9-2.8-2.9-3 2.9-2.8-2.9z"
        fill="#fff"
      />
    </svg>
  )
}

function MarkCoinbase() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <circle cx="20" cy="20" r="20" fill="#1652F0" />
      <rect x="14" y="14" width="12" height="12" rx="1.5" fill="#fff" />
    </svg>
  )
}

function MarkPhantom() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id="ph-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#534BB1" />
          <stop offset="100%" stopColor="#551BF9" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#ph-g)" />
      <path
        d="M9 19a11 11 0 0 1 22 0v6.5c0 1.7-1.3 2.3-2.4 1.1l-1.7-1.9c-.5-.6-1.4-.6-1.9 0l-1.4 1.5c-.5.6-1.4.6-1.9 0l-1.4-1.5c-.5-.6-1.4-.6-1.9 0l-1.7 1.9c-1.1 1.2-2.4.6-2.4-1.1z"
        fill="#fff"
      />
      <ellipse cx="16" cy="18" rx="1.3" ry="1.8" fill="#534BB1" />
      <ellipse cx="22" cy="18" rx="1.3" ry="1.8" fill="#534BB1" />
    </svg>
  )
}

function MarkTrust() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id="tw-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3375BB" />
          <stop offset="100%" stopColor="#0500FF" />
        </linearGradient>
      </defs>
      <path
        d="M20 4l13 4v9c0 9-5.7 14.5-13 19-7.3-4.5-13-10-13-19V8l13-4z"
        fill="url(#tw-g)"
      />
      <path d="M20 11v18c4.8-3.3 8-7 8-12.5V13l-8-2z" fill="#fff" opacity="0.95" />
    </svg>
  )
}

function MarkAddress() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <rect width="40" height="40" rx="10" fill="#0d2230" stroke="rgba(34,211,238,0.4)" />
      <rect x="9" y="13" width="22" height="14" rx="2" fill="none" stroke="#22d3ee" strokeWidth="1.6" />
      <path d="M13 18h12M13 22h8" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Layout primitives
 * ──────────────────────────────────────────────────────────────────── */

const orbDrift = keyframes`
  0%, 100% { transform: translate3d(-10%, -8%, 0) scale(1); }
  50%      { transform: translate3d(8%, 6%, 0) scale(1.08); }
`

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.55); }
  50%      { box-shadow: 0 0 0 8px rgba(34, 211, 238, 0); }
`

const Page = styled.div`
  position: relative;
  min-height: 100vh;
  background: #06101a;
  color: #e6edf7;
  overflow-x: hidden;
`

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(900px 600px at 80% -10%, rgba(34, 211, 238, 0.10), transparent 60%),
    radial-gradient(700px 500px at -10% 30%, rgba(124, 58, 237, 0.10), transparent 60%),
    linear-gradient(180deg, #06101a 0%, #060d15 100%);
`

const FloatingOrb = styled.div`
  position: fixed;
  top: -10%;
  left: 30%;
  width: 60vw;
  height: 60vw;
  max-width: 800px;
  max-height: 800px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(34, 211, 238, 0.18), transparent 60%);
  filter: blur(40px);
  animation: ${orbDrift} 18s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
`

const ScrollProgress = styled(motion.div)`
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, #22d3ee, #7c3aed);
  transform-origin: 0 50%;
  z-index: 100;
`

const Content = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1180px;
  margin: 0 auto;
  padding: 5.5rem 1.5rem 6rem;
`

const Hero = styled.section`
  min-height: 78vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 4rem 0 5rem;
`

const SoonPill = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  border: 1px solid rgba(34, 211, 238, 0.32);
  background: rgba(34, 211, 238, 0.08);
  color: #67e8f9;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  width: fit-content;
  margin-bottom: 1.5rem;
  &::before {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #22d3ee;
    animation: ${pulse} 2.4s ease-out infinite;
  }
`

const Headline = styled(motion.h1)`
  font-size: clamp(2.6rem, 6vw, 5rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  margin: 0 0 1.25rem;
  max-width: 14ch;
  background: linear-gradient(135deg, #ffffff 0%, #67e8f9 60%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const Lede = styled(motion.p)`
  font-size: clamp(1rem, 1.4vw, 1.2rem);
  line-height: 1.65;
  color: #9fb0c5;
  max-width: 58ch;
  margin: 0 0 2.5rem;
`

const HeroCtas = styled(motion.div)`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`

const PrimaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.85rem 1.4rem;
  border-radius: 10px;
  background: linear-gradient(135deg, #22d3ee 0%, #2dd4bf 100%);
  color: #061018;
  font-weight: 700;
  font-size: 0.95rem;
  text-decoration: none;
  letter-spacing: 0.01em;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(34, 211, 238, 0.28); }
`

const GhostLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.85rem 1.4rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.02);
  color: #cbd5e1;
  font-weight: 500;
  font-size: 0.95rem;
  text-decoration: none;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
  &:hover { border-color: rgba(34, 211, 238, 0.4); color: #fff; background: rgba(34, 211, 238, 0.05); }
`

const Section = styled.section`
  padding: 6rem 0;
  position: relative;
`

const Eyebrow = styled(motion.div)`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #22d3ee;
  margin-bottom: 0.85rem;
  &::before { content: '> '; color: #22c55e; }
`

const SectionTitle = styled(motion.h2)`
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  font-weight: 700;
  letter-spacing: -0.015em;
  color: #f1f5f9;
  margin: 0 0 1rem;
  max-width: 18ch;
`

const SectionLede = styled(motion.p)`
  color: #94a3b8;
  font-size: 1.02rem;
  line-height: 1.65;
  max-width: 60ch;
  margin: 0 0 2.5rem;
`

const WalletGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
`

const tileGlow = ({ $accent }) => css`
  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg, ${$accent}, transparent 60%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  &:hover::before { opacity: 1; }
  &:hover {
    border-color: transparent;
    background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
    transform: translateY(-3px);
    box-shadow: 0 18px 40px -18px ${$accent}55;
  }
`

const WalletTile = styled(motion.div)`
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.05rem 1.1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.025);
  cursor: not-allowed;
  transition: transform 0.25s ease, border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
  ${tileGlow}

  .mark {
    width: 44px; height: 44px;
    border-radius: 11px;
    flex-shrink: 0;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  }
  .meta { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
  .name { font-weight: 600; font-size: 1rem; color: #f1f5f9; }
  .sub { color: #94a3b8; font-size: 0.8rem; letter-spacing: 0.01em; }
  .pill {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.6rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #67e8f9;
    border: 1px solid rgba(34, 211, 238, 0.32);
    background: rgba(34, 211, 238, 0.08);
    padding: 0.2rem 0.45rem;
    border-radius: 6px;
    flex-shrink: 0;
  }
`

const StickySplit = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: start;
  @media (max-width: 900px) { grid-template-columns: 1fr; gap: 2rem; }
`

const StickyCopy = styled.div`
  position: sticky;
  top: 6rem;
  @media (max-width: 900px) { position: static; }
`

const Steps = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0;
  counter-reset: step;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`

const Step = styled(motion.li)`
  position: relative;
  padding: 1rem 1.1rem 1rem 3.4rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  counter-increment: step;
  &::before {
    content: counter(step, decimal-leading-zero);
    position: absolute;
    left: 1rem;
    top: 1rem;
    width: 1.8rem;
    height: 1.8rem;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: rgba(34, 211, 238, 0.1);
    border: 1px solid rgba(34, 211, 238, 0.32);
    color: #67e8f9;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.78rem;
    font-weight: 700;
  }
  h3 { margin: 0 0 0.3rem; color: #f1f5f9; font-size: 1.02rem; font-weight: 600; }
  p { margin: 0; color: #94a3b8; font-size: 0.9rem; line-height: 1.55; }
`

const MockFrame = styled(motion.div)`
  position: relative;
  border-radius: 18px;
  border: 1px solid rgba(34, 211, 238, 0.18);
  background: linear-gradient(180deg, rgba(13, 33, 52, 0.7), rgba(8, 18, 28, 0.85));
  backdrop-filter: blur(14px);
  padding: 1.1rem;
  box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(34, 211, 238, 0.05) inset;
  overflow: hidden;
`

const MockBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 0.85rem;
  .dot { width: 9px; height: 9px; border-radius: 50%; background: rgba(255, 255, 255, 0.15); }
  .url {
    margin-left: 0.6rem;
    flex: 1;
    height: 22px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.04);
    display: flex; align-items: center;
    padding: 0 0.6rem;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.7rem;
    color: #67e8f9;
    letter-spacing: 0.04em;
  }
`

const MockRow = styled(motion.div)`
  display: grid;
  grid-template-columns: 1.4rem 1fr auto auto;
  gap: 0.8rem;
  align-items: center;
  padding: 0.6rem 0.7rem;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.02);
  margin-bottom: 0.45rem;
  border: 1px solid transparent;
  transition: border-color 0.3s ease, background 0.3s ease;
  ${({ $highlight }) => $highlight && css`
    background: rgba(34, 211, 238, 0.06);
    border-color: rgba(34, 211, 238, 0.22);
  `}
  .sym {
    width: 1.4rem; height: 1.4rem; border-radius: 50%;
    background: linear-gradient(135deg, ${({ $c1 }) => $c1 || '#22d3ee'}, ${({ $c2 }) => $c2 || '#7c3aed'});
    box-shadow: 0 0 12px ${({ $c1 }) => $c1 || '#22d3ee'}55;
  }
  .name { font-weight: 600; color: #e6edf7; font-size: 0.86rem; display: inline-flex; align-items: center; }
  .price { font-family: 'JetBrains Mono', ui-monospace, monospace; color: #cbd5e1; font-size: 0.78rem; }
  .delta {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.74rem;
    padding: 0.15rem 0.45rem;
    border-radius: 5px;
  }
  .delta.up { color: #22c55e; background: rgba(34, 197, 94, 0.1); }
  .delta.dn { color: #f87171; background: rgba(248, 113, 113, 0.1); }
  .mine {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.15rem 0.4rem;
    border-radius: 5px;
    color: #67e8f9;
    border: 1px solid rgba(34, 211, 238, 0.32);
    background: rgba(34, 211, 238, 0.06);
    margin-left: 0.4rem;
  }
`

const MockToggle = styled.div`
  display: flex; gap: 0.35rem;
  margin-bottom: 0.85rem;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  span {
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: #94a3b8;
  }
  span.on { color: #22d3ee; background: rgba(34, 211, 238, 0.1); border-color: rgba(34, 211, 238, 0.32); }
`

const Timeline = styled.div`
  position: relative;
  padding-left: 2rem;
  &::before {
    content: '';
    position: absolute;
    left: 0.55rem; top: 0.4rem; bottom: 0.4rem;
    width: 1px;
    background: linear-gradient(180deg, transparent, rgba(34, 211, 238, 0.3), transparent);
  }
`

const TLItem = styled(motion.div)`
  position: relative;
  padding: 0.6rem 0 1.6rem;
  &::before {
    content: '';
    position: absolute;
    left: -1.7rem; top: 1rem;
    width: 11px; height: 11px;
    border-radius: 50%;
    background: #06101a;
    border: 2px solid #22d3ee;
    box-shadow: 0 0 12px rgba(34, 211, 238, 0.6);
  }
  h3 { margin: 0 0 0.4rem; color: #f1f5f9; font-size: 1.1rem; font-weight: 600; }
  p { margin: 0; color: #94a3b8; font-size: 0.94rem; line-height: 1.6; max-width: 60ch; }
`

const CTACard = styled(motion.div)`
  margin-top: 2rem;
  padding: 2.5rem;
  border-radius: 20px;
  border: 1px solid rgba(34, 211, 238, 0.22);
  background:
    radial-gradient(600px 200px at 80% 0%, rgba(34, 211, 238, 0.12), transparent 60%),
    linear-gradient(180deg, rgba(13, 33, 52, 0.8), rgba(8, 18, 28, 0.9));
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
  justify-content: space-between;
  h2 { margin: 0 0 0.3rem; font-size: 1.5rem; color: #f1f5f9; }
  p { margin: 0; color: #94a3b8; font-size: 0.95rem; max-width: 46ch; }
  .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
`

const FootNote = styled.p`
  margin-top: 1.5rem;
  color: #6b7a8c;
  font-size: 0.82rem;
  line-height: 1.6;
  font-style: italic;
  max-width: 72ch;
`

/* ─────────────────────────────────────────────────────────────────────────
 * Data
 * ──────────────────────────────────────────────────────────────────── */

const WALLETS = [
  { name: 'MetaMask', sub: 'Most popular EVM wallet', accent: '#F6851B', Mark: MarkMetaMask },
  { name: 'WalletConnect', sub: '500+ mobile wallets, one QR', accent: '#3B99FC', Mark: MarkWalletConnect },
  { name: 'Coinbase Wallet', sub: 'Self-custody, EVM + L2s', accent: '#1652F0', Mark: MarkCoinbase },
  { name: 'Phantom', sub: 'Native Solana experience', accent: '#7C3AED', Mark: MarkPhantom },
  { name: 'Trust Wallet', sub: 'Multi-chain mobile', accent: '#3375BB', Mark: MarkTrust },
  { name: 'Paste address', sub: 'Read-only, no signing required', accent: '#22D3EE', Mark: MarkAddress },
]

const STEPS = [
  { t: 'Pick a connector', d: 'Choose any wallet you already use. Every major EVM wallet plus Phantom on Solana.' },
  { t: 'Sign one message', d: 'A single Sign-In With Ethereum (SIWE) signature proves the address is yours. No transactions, no spend approvals.' },
  { t: 'Sonar reshapes itself', d: 'Your tokens jump to the top. Whale flow, signals and news for those tokens load first. The market view stays one click away.' },
]

const FEATURES = [
  { t: 'Your tokens, front and centre', d: 'Sonar pulls your wallet balances and pins them across every market view, so the signals you see first are the ones you actually care about.' },
  { t: 'Whale alerts you have skin in', d: 'Filtered accumulation, distribution and rotation alerts — but only for tokens you hold or watch. No firehose, no noise.' },
  { t: 'Read-only, by design', d: 'We never request transaction permissions. SIWE on EVM, memo-sign on Solana, public balances only. Your keys stay in your wallet.' },
  { t: 'Multi-wallet, multi-chain', d: 'Link several EVM and Solana addresses to one Sonar account. Switch between them or roll them up into a single combined view.' },
  { t: 'Auto-rebalanced watchlists', d: 'When your holdings change, your watchlists adapt. Sonar quietly reorders priority and surfaces new entrants worth your attention.' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

/* ─────────────────────────────────────────────────────────────────────────
 * Components
 * ──────────────────────────────────────────────────────────────────── */

function TiltTile({ wallet }) {
  const ref = useRef(null)
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const sx = useSpring(rx, { stiffness: 220, damping: 20 })
  const sy = useSpring(ry, { stiffness: 220, damping: 20 })

  const onMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    ry.set(px * 8)
    rx.set(-py * 8)
  }
  const onLeave = () => { rx.set(0); ry.set(0) }

  const { Mark, name, sub, accent } = wallet
  return (
    <WalletTile
      ref={ref}
      $accent={accent}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: sx, rotateY: sy, transformPerspective: 800 }}
      variants={fadeUp}
      title="Coming soon"
      aria-label={`${name} — coming soon`}
    >
      <span className="mark"><Mark /></span>
      <span className="meta">
        <span className="name">{name}</span>
        <span className="sub">{sub}</span>
      </span>
      <span className="pill">Soon</span>
    </WalletTile>
  )
}

function DashboardMock() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [40, -40])
  const rot = useTransform(scrollYProgress, [0, 1], [3, -3])

  const rows = [
    { sym: 'SOL',  name: 'Solana',    price: '$182.40', delta: '+4.2%',  up: true,  c1: '#22d3ee', c2: '#7c3aed', mine: true  },
    { sym: 'WIF',  name: 'dogwifhat', price: '$2.81',   delta: '+11.6%', up: true,  c1: '#fbbf24', c2: '#f472b6', mine: true  },
    { sym: 'ETH',  name: 'Ethereum',  price: '$3,940',  delta: '+0.9%',  up: true,  c1: '#a78bfa', c2: '#22d3ee', mine: true  },
    { sym: 'JUP',  name: 'Jupiter',   price: '$1.22',   delta: '−2.1%',  up: false, c1: '#34d399', c2: '#22d3ee', mine: false },
    { sym: 'BTC',  name: 'Bitcoin',   price: '$96,210', delta: '+0.3%',  up: true,  c1: '#fb923c', c2: '#fbbf24', mine: false },
  ]

  return (
    <MockFrame ref={ref} style={{ y, rotate: rot }}>
      <MockBar>
        <span className="dot" /><span className="dot" /><span className="dot" />
        <span className="url">sonartracker.io / dashboard</span>
      </MockBar>
      <MockToggle>
        <span>All markets</span>
        <span className="on">My tokens · 3</span>
      </MockToggle>
      {rows.map((r, i) => (
        <MockRow
          key={r.sym}
          $highlight={r.mine}
          $c1={r.c1}
          $c2={r.c2}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.4, delay: 0.05 * i }}
        >
          <span className="sym" />
          <span className="name">
            {r.name}
            {r.mine ? <span className="mine">Mine</span> : null}
          </span>
          <span className="price">{r.price}</span>
          <span className={`delta ${r.up ? 'up' : 'dn'}`}>{r.delta}</span>
        </MockRow>
      ))}
    </MockFrame>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Main
 * ──────────────────────────────────────────────────────────────────── */

export default function PersonalizePreview() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 20, restDelta: 0.001 })

  return (
    <Page>
      <Backdrop />
      <FloatingOrb />
      <ScrollProgress style={{ scaleX }} />

      <Content>
        <Hero>
          <SoonPill
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Coming soon · Closed beta
          </SoonPill>
          <Headline
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            Make Sonar yours.
          </Headline>
          <Lede
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Connect a wallet and Sonar reorders the entire product around the
            assets you actually hold — whale activity, sentiment, signals
            and news, ranked by what matters to <em>your</em> portfolio.
            We are polishing the connection flow with a small group of
            users first.
          </Lede>
          <HeroCtas
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <PrimaryLink href="/subscribe">Join the waitlist</PrimaryLink>
            <GhostLink href="/changelog">See what is shipping</GhostLink>
          </HeroCtas>
        </Hero>

        <Section>
          <Eyebrow initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-15% 0px' }} variants={fadeUp}>
            Wallet support at launch
          </Eyebrow>
          <SectionTitle initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-15% 0px' }} variants={fadeUp}>
            Connect the way you already trade.
          </SectionTitle>
          <SectionLede initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-15% 0px' }} variants={fadeUp}>
            Six ways to link a wallet. None ask for spend permissions —
            just a one-time signature so we can prove the address is yours,
            or a paste-only mode if you prefer to stay anonymous.
          </SectionLede>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-10% 0px' }}
            variants={stagger}
          >
            <WalletGrid>
              {WALLETS.map((w) => (
                <TiltTile key={w.name} wallet={w} />
              ))}
            </WalletGrid>
          </motion.div>
          <FootNote>
            We are testing each connector end-to-end before opening it up.
            Some wallet extensions currently confirm the signature in the
            popup but fail to complete the round-trip back to Sonar — we
            will not ship until that experience is rock-solid.
          </FootNote>
        </Section>

        <Section>
          <StickySplit>
            <StickyCopy>
              <Eyebrow initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-15% 0px' }} variants={fadeUp}>
                Three taps to a personal Sonar
              </Eyebrow>
              <SectionTitle initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-15% 0px' }} variants={fadeUp}>
                A dashboard that knows your bags.
              </SectionTitle>
              <SectionLede initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-15% 0px' }} variants={fadeUp}>
                Watch the panel beside this list change as you scroll. Your
                tokens float to the top, get a quiet "Mine" tag, and the
                entire feed re-prioritises around them.
              </SectionLede>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-10% 0px' }}
                variants={stagger}
              >
                <Steps>
                  {STEPS.map((s) => (
                    <Step key={s.t} variants={fadeUp}>
                      <h3>{s.t}</h3>
                      <p>{s.d}</p>
                    </Step>
                  ))}
                </Steps>
              </motion.div>
            </StickyCopy>
            <DashboardMock />
          </StickySplit>
        </Section>

        <Section>
          <Eyebrow initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-15% 0px' }} variants={fadeUp}>
            What you unlock
          </Eyebrow>
          <SectionTitle initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-15% 0px' }} variants={fadeUp}>
            Built for the way you actually trade.
          </SectionTitle>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-10% 0px' }}
            variants={stagger}
          >
            <Timeline>
              {FEATURES.map((f) => (
                <TLItem key={f.t} variants={fadeUp}>
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </TLItem>
              ))}
            </Timeline>
          </motion.div>
        </Section>

        <CTACard
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-15% 0px' }}
          variants={fadeUp}
        >
          <div>
            <h2>Get in early.</h2>
            <p>
              Personalize rolls out to Pro subscribers first. Upgrade now to
              be in the first cohort, or follow the changelog for a public
              launch date.
            </p>
          </div>
          <div className="actions">
            <PrimaryLink href="/subscribe">Upgrade to Pro</PrimaryLink>
            <GhostLink href="/changelog">View changelog</GhostLink>
            <GhostLink href="/community">Join community</GhostLink>
          </div>
        </CTACard>
      </Content>
    </Page>
  )
}
