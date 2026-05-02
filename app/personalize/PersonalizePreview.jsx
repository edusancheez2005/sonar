'use client'

import React from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { motion } from 'framer-motion'

/**
 * Public-facing preview of the Personalize feature. Shown to every signed-in
 * user EXCEPT admins. The real wallet-connection flow is currently rough
 * around the edges (the WalletConnect/MetaMask handshake confirms in the
 * extension but does not always finish the SIWE round-trip), so we are
 * keeping the UI in a polished "Coming soon" state until that is solid.
 *
 * Design intent: feel like a product reveal, not a feature flag. Mirror the
 * Press / Careers page chrome (dark gradient, cyan accents, framer-motion
 * stagger) so users recognise it as Sonar.
 */

const Page = styled.div`
  min-height: 100vh;
  background: radial-gradient(1200px 600px at 50% -10%, rgba(34, 211, 238, 0.08), transparent 60%),
    linear-gradient(135deg, #0a1621 0%, #0f1922 50%, #0a1621 100%);
  position: relative;
`

const Content = styled.div`
  max-width: 1080px;
  margin: 0 auto;
  padding: 6rem 1.5rem 5rem;
  position: relative;
  z-index: 1;
`

const SoonPill = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(34, 211, 238, 0.32);
  background: rgba(34, 211, 238, 0.08);
  color: var(--neon-bright, #22d3ee);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 1.25rem;
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--neon-bright, #22d3ee);
    box-shadow: 0 0 8px currentColor;
  }
`

const Title = styled(motion.h1)`
  font-size: clamp(2.2rem, 4vw, 3.4rem);
  font-weight: 700;
  line-height: 1.05;
  margin: 0 0 1rem;
  background: linear-gradient(135deg, #ffffff 0%, var(--neon-bright, #22d3ee) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const Lede = styled(motion.p)`
  font-size: 1.1rem;
  line-height: 1.65;
  color: #b6c2d2;
  max-width: 620px;
  margin: 0 0 2.5rem;
`

const PreviewCard = styled(motion.section)`
  background: linear-gradient(180deg, rgba(13, 33, 52, 0.65), rgba(10, 22, 33, 0.85));
  border: 1px solid rgba(34, 211, 238, 0.18);
  border-radius: 18px;
  padding: 2rem;
  backdrop-filter: blur(14px);
  margin-bottom: 1.75rem;
`

const SectionLabel = styled.div`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--neon-bright, #22d3ee);
  margin-bottom: 0.85rem;
  &::before { content: '> '; color: #22c55e; }
`

const SectionTitle = styled.h2`
  font-size: 1.45rem;
  font-weight: 600;
  color: #e6edf7;
  margin: 0 0 0.75rem;
`

const SectionBody = styled.p`
  color: #94a3b8;
  font-size: 0.98rem;
  line-height: 1.6;
  margin: 0 0 1.5rem;
`

const WalletGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.85rem;
`

const WalletTile = styled.button`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.95rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.025);
  color: #e6edf7;
  text-align: left;
  cursor: not-allowed;
  font-family: inherit;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
  position: relative;
  &:hover {
    border-color: rgba(34, 211, 238, 0.28);
    background: rgba(34, 211, 238, 0.05);
  }
  .mark {
    width: 36px;
    height: 36px;
    border-radius: 9px;
    display: grid;
    place-items: center;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: var(--neon-bright, #22d3ee);
    flex-shrink: 0;
  }
  .meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .name { font-weight: 600; font-size: 0.95rem; }
  .sub { color: #94a3b8; font-size: 0.78rem; letter-spacing: 0.02em; }
  .pill {
    margin-left: auto;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--neon-bright, #22d3ee);
    border: 1px solid rgba(34, 211, 238, 0.28);
    background: rgba(34, 211, 238, 0.06);
    padding: 0.18rem 0.42rem;
    border-radius: 6px;
  }
`

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
`

const FeatureItem = styled.div`
  padding: 1.1rem 1.15rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  h3 {
    margin: 0 0 0.4rem;
    font-size: 0.98rem;
    color: #e6edf7;
    font-weight: 600;
  }
  p {
    margin: 0;
    font-size: 0.86rem;
    color: #94a3b8;
    line-height: 1.55;
  }
`

const NotifyRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-top: 0.5rem;
`

const PrimaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.25rem;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.95) 0%, rgba(45, 212, 191, 0.95) 100%);
  color: #061018;
  font-weight: 600;
  font-size: 0.92rem;
  text-decoration: none;
  letter-spacing: 0.01em;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(34, 211, 238, 0.25);
  }
`

const GhostLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.25rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: #cbd5e1;
  font-weight: 500;
  font-size: 0.92rem;
  text-decoration: none;
  transition: border-color 0.18s ease, color 0.18s ease;
  &:hover {
    border-color: rgba(34, 211, 238, 0.32);
    color: #e6edf7;
  }
`

const FootNote = styled.p`
  color: #6b7a8c;
  font-size: 0.8rem;
  line-height: 1.55;
  margin: 1.5rem 0 0;
  font-style: italic;
`

function MarkMetaMask() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 5l8 5-2-5H3zm18 0l-8 5 2-5h6zM5 18l4-2-2-3-2 5zm14 0l-4-2 2-3 2 5zm-9-6l2-1 2 1-1 3h-2l-1-3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
function MarkWalletConnect() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5.5 9.5c3.6-3.5 9.4-3.5 13 0l.5.5-2 1.9-.5-.5c-2.5-2.4-6.5-2.4-9 0l-.5.5L5 10l.5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M3.5 13l2 1.9 2.4-2.3 2.4 2.3 2.4-2.3 2.4 2.3 2.4-2.3 2 1.9-4.4 4.2-2.4-2.3-2.4 2.3-2.4-2.3L5.9 17z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
function MarkPhantom() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12a8 8 0 0 1 16 0v4c0 1.5-1 2-1.8 1l-1.4-1.7c-.4-.5-1.1-.5-1.5 0l-1 1.2c-.4.5-1.1.5-1.5 0l-1-1.2c-.4-.5-1.1-.5-1.5 0L8.8 17c-.8 1-1.8.5-1.8-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="10" cy="11" r="0.9" fill="currentColor" />
      <circle cx="14" cy="11" r="0.9" fill="currentColor" />
    </svg>
  )
}
function MarkCoinbase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
function MarkAddress() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="6.5" width="17" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 10h7M7 13h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

const WALLETS = [
  { name: 'MetaMask', sub: 'EVM \u2014 most popular', Mark: MarkMetaMask },
  { name: 'WalletConnect', sub: '500+ mobile wallets', Mark: MarkWalletConnect },
  { name: 'Coinbase Wallet', sub: 'EVM \u2014 self-custody', Mark: MarkCoinbase },
  { name: 'Phantom', sub: 'Solana \u2014 native', Mark: MarkPhantom },
  { name: 'Paste address', sub: 'Read-only, no signing', Mark: MarkAddress },
]

const FEATURES = [
  {
    title: 'Your tokens, front and centre',
    body: 'Sonar pulls the assets in your connected wallet and pins them to the top of every market view, so the signals you see first are the ones you actually care about.',
  },
  {
    title: 'Whale flow you have skin in',
    body: 'Get filtered alerts for accumulation, distribution and rotation \u2014 but only on the tokens you hold (or are watching), not the whole market firehose.',
  },
  {
    title: 'Read-only by default',
    body: 'We never request transaction permissions. Connections are sign-in-with-Ethereum (SIWE) or Solana memo-signed; we read public on-chain balances only.',
  },
  {
    title: 'Multi-wallet, multi-chain',
    body: 'Link several EVM and Solana addresses to a single Sonar account. Switch between them, or roll them up into one combined view.',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
}

export default function PersonalizePreview() {
  return (
    <Page>
      <Content>
        <SoonPill
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Coming soon · Closed beta
        </SoonPill>
        <Title
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          Make Sonar yours.
        </Title>
        <Lede
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.08 }}
        >
          Connect a wallet and Sonar reorders the entire product around the
          assets you hold — whale activity, sentiment, signals and news,
          filtered to what matters to <em>your</em> portfolio. We are polishing
          the connection flow with a small group of users first.
        </Lede>

        <PreviewCard
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.16 }}
        >
          <SectionLabel>Wallet support at launch</SectionLabel>
          <SectionTitle>Connect the way you already trade</SectionTitle>
          <SectionBody>
            Five ways to link a wallet. None of them ask for spend permissions
            — just a one-time signature so we can prove the address is
            yours, or a paste-only mode if you prefer to stay anonymous.
          </SectionBody>
          <WalletGrid>
            {WALLETS.map(({ name, sub, Mark }) => (
              <WalletTile
                key={name}
                type="button"
                disabled
                aria-label={`${name} \u2014 coming soon`}
                title="Coming soon"
              >
                <span className="mark"><Mark /></span>
                <span className="meta">
                  <span className="name">{name}</span>
                  <span className="sub">{sub}</span>
                </span>
                <span className="pill">Soon</span>
              </WalletTile>
            ))}
          </WalletGrid>
          <FootNote>
            We are testing each connector end-to-end before opening it up. Some
            wallet extensions currently confirm the signature in the popup but
            fail to complete the round-trip back to Sonar — we will not
            ship the feature until that experience is rock-solid.
          </FootNote>
        </PreviewCard>

        <PreviewCard
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.24 }}
        >
          <SectionLabel>What you get</SectionLabel>
          <SectionTitle>A dashboard that knows your bags</SectionTitle>
          <FeatureGrid>
            {FEATURES.map((f) => (
              <FeatureItem key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </FeatureItem>
            ))}
          </FeatureGrid>
        </PreviewCard>

        <PreviewCard
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.32 }}
        >
          <SectionLabel>Get notified</SectionLabel>
          <SectionTitle>Want early access?</SectionTitle>
          <SectionBody>
            Personalize is rolling out gradually to Pro subscribers first. Keep
            an eye on the changelog — or join the waitlist via the
            community channel.
          </SectionBody>
          <NotifyRow>
            <PrimaryLink href="/subscribe">Upgrade to Pro</PrimaryLink>
            <GhostLink href="/changelog">View changelog</GhostLink>
            <GhostLink href="/community">Join the community</GhostLink>
          </NotifyRow>
        </PreviewCard>
      </Content>
    </Page>
  )
}
