'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import styled, { keyframes, css } from 'styled-components'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'

/**
 * Changelog page — release-note timeline with scroll-driven progress rail,
 * sticky version sidebar, animated entry cards. Mirrors /personalize so the
 * two pages feel like one product narrative. No emojis. Real Sonar releases
 * (placeholder content the user can edit) grouped by quarter.
 */

const orbDrift = keyframes`
  0%, 100% { transform: translate3d(-10%, -8%, 0) scale(1); }
  50%      { transform: translate3d(8%, 6%, 0) scale(1.08); }
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
  background: radial-gradient(circle at 30% 30%, rgba(124, 58, 237, 0.16), transparent 60%);
  filter: blur(40px);
  animation: ${orbDrift} 22s ease-in-out infinite;
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

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55); }
  50%      { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
`

const LivePill = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  border: 1px solid rgba(34, 197, 94, 0.32);
  background: rgba(34, 197, 94, 0.08);
  color: #4ade80;
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
    background: #22c55e;
    animation: ${pulse} 2.4s ease-out infinite;
  }
`

const Hero = styled.section`
  padding: 4rem 0 5rem;
`

const Headline = styled(motion.h1)`
  font-size: clamp(2.4rem, 5.5vw, 4.6rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  margin: 0 0 1.25rem;
  max-width: 16ch;
  background: linear-gradient(135deg, #ffffff 0%, #67e8f9 60%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const Lede = styled(motion.p)`
  font-size: clamp(1rem, 1.4vw, 1.18rem);
  line-height: 1.65;
  color: #9fb0c5;
  max-width: 60ch;
  margin: 0;
`

const Layout = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 4rem;
  margin-top: 3rem;
  align-items: start;
  @media (max-width: 900px) { grid-template-columns: 1fr; gap: 1.5rem; }
`

const Sidebar = styled.aside`
  position: sticky;
  top: 5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  @media (max-width: 900px) {
    position: static;
    flex-direction: row;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
  }
`

const SideLink = styled.a`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.7rem;
  border-radius: 8px;
  color: #94a3b8;
  text-decoration: none;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  border: 1px solid transparent;
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  white-space: nowrap;
  &:hover {
    color: #67e8f9;
    background: rgba(34, 211, 238, 0.06);
    border-color: rgba(34, 211, 238, 0.18);
  }
  .dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: ${({ $accent }) => $accent || '#22d3ee'};
    box-shadow: 0 0 8px ${({ $accent }) => $accent || '#22d3ee'};
  }
`

const Stream = styled.div`
  position: relative;
  padding-left: 2.2rem;
  &::before {
    content: '';
    position: absolute;
    left: 0.6rem; top: 0.4rem; bottom: 0.4rem;
    width: 1px;
    background: linear-gradient(
      180deg,
      transparent,
      rgba(34, 211, 238, 0.25) 5%,
      rgba(124, 58, 237, 0.25) 95%,
      transparent
    );
  }
`

const Group = styled.section`
  margin-bottom: 3rem;
  scroll-margin-top: 5rem;
`

const GroupLabel = styled(motion.div)`
  position: relative;
  margin-bottom: 1rem;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #22d3ee;
  padding-left: 0.2rem;
  &::before {
    content: '';
    position: absolute;
    left: -1.85rem; top: 0.4rem;
    width: 13px; height: 13px;
    border-radius: 50%;
    background: #06101a;
    border: 2px solid #22d3ee;
    box-shadow: 0 0 12px rgba(34, 211, 238, 0.6);
  }
`

const Entry = styled(motion.article)`
  position: relative;
  padding: 1.4rem 1.5rem;
  margin-bottom: 1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: linear-gradient(180deg, rgba(13, 33, 52, 0.55), rgba(8, 18, 28, 0.7));
  backdrop-filter: blur(10px);
  transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
  &:hover {
    border-color: rgba(34, 211, 238, 0.28);
    transform: translateY(-2px);
    box-shadow: 0 18px 40px -22px rgba(34, 211, 238, 0.25);
  }
`

const EntryHead = styled.header`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.7rem;
`

const Version = styled.span`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  font-weight: 700;
  color: #f1f5f9;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
`

const DateText = styled.span`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.74rem;
  color: #6b7a8c;
  letter-spacing: 0.02em;
`

const TAG_STYLES = {
  new:      { fg: '#4ade80', bg: 'rgba(34, 197, 94, 0.12)',  bd: 'rgba(34, 197, 94, 0.32)' },
  improved: { fg: '#67e8f9', bg: 'rgba(34, 211, 238, 0.12)', bd: 'rgba(34, 211, 238, 0.32)' },
  fixed:    { fg: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)', bd: 'rgba(245, 158, 11, 0.32)' },
  beta:     { fg: '#a78bfa', bg: 'rgba(124, 58, 237, 0.12)', bd: 'rgba(124, 58, 237, 0.32)' },
}

const Tag = styled.span`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 5px;
  ${({ $kind }) => {
    const s = TAG_STYLES[$kind] || TAG_STYLES.improved
    return css`
      color: ${s.fg};
      background: ${s.bg};
      border: 1px solid ${s.bd};
    `
  }}
`

const Title = styled.h3`
  margin: 0 0 0.35rem;
  font-size: 1.12rem;
  font-weight: 600;
  color: #f1f5f9;
  letter-spacing: -0.005em;
`

const Body = styled.p`
  margin: 0 0 0.6rem;
  color: #94a3b8;
  font-size: 0.94rem;
  line-height: 1.6;
`

const BulletList = styled.ul`
  margin: 0.4rem 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`

const Bullet = styled.li`
  position: relative;
  padding-left: 1.1rem;
  color: #cbd5e1;
  font-size: 0.9rem;
  line-height: 1.55;
  &::before {
    content: '';
    position: absolute;
    left: 0; top: 0.55rem;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: rgba(34, 211, 238, 0.6);
  }
`

const CTACard = styled(motion.div)`
  margin-top: 4rem;
  padding: 2.2rem;
  border-radius: 18px;
  border: 1px solid rgba(34, 211, 238, 0.22);
  background:
    radial-gradient(600px 200px at 80% 0%, rgba(34, 211, 238, 0.12), transparent 60%),
    linear-gradient(180deg, rgba(13, 33, 52, 0.8), rgba(8, 18, 28, 0.9));
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
  justify-content: space-between;
  h2 { margin: 0 0 0.3rem; font-size: 1.4rem; color: #f1f5f9; }
  p { margin: 0; color: #94a3b8; font-size: 0.95rem; max-width: 50ch; }
  .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
`

const PrimaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.3rem;
  border-radius: 10px;
  background: linear-gradient(135deg, #22d3ee 0%, #2dd4bf 100%);
  color: #061018;
  font-weight: 700;
  font-size: 0.92rem;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(34, 211, 238, 0.28); }
`

const GhostLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.3rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.02);
  color: #cbd5e1;
  font-weight: 500;
  font-size: 0.92rem;
  text-decoration: none;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
  &:hover { border-color: rgba(34, 211, 238, 0.4); color: #fff; background: rgba(34, 211, 238, 0.05); }
`

/* ─────────────────────────────────────────────────────────────────────────
 * Release data — edit this list as you ship.
 * Tags: 'new' | 'improved' | 'fixed' | 'beta'
 * ──────────────────────────────────────────────────────────────────── */

const RELEASES = [
  {
    quarter: 'Q2 2026',
    accent: '#22d3ee',
    items: [
      {
        version: 'v2.4',
        date: 'May 2026',
        tag: 'beta',
        title: 'Personalize — closed beta',
        body: 'Connect a wallet and Sonar reorders the dashboard around the assets you actually hold. Whale flow, signals and news, ranked by your portfolio.',
        bullets: [
          'Six wallet connectors planned at launch (MetaMask, WalletConnect, Coinbase, Phantom, Trust, paste-only)',
          'Sign-In With Ethereum (SIWE) for EVM, memo-sign for Solana',
          'Read-only by design — no transaction permissions ever requested',
        ],
      },
      {
        version: 'v2.3',
        date: 'April 2026',
        tag: 'new',
        title: 'Orca AI 2.0',
        body: 'A rebuilt advisor with a sharper model, longer context window and a panel that explains every recommendation in plain English.',
        bullets: [
          'New "Why this signal?" inline reasoning',
          'Multi-token comparisons in a single prompt',
          'Streaming responses with stop / regenerate controls',
        ],
      },
      {
        version: 'v2.2',
        date: 'April 2026',
        tag: 'improved',
        title: 'Faster whale alerts',
        body: 'End-to-end alert latency cut from ~45s to under 8s on the most active chains. New ingestion pipeline on Ethereum, Solana and Base.',
      },
    ],
  },
  {
    quarter: 'Q1 2026',
    accent: '#a78bfa',
    items: [
      {
        version: 'v2.1',
        date: 'March 2026',
        tag: 'new',
        title: 'Multi-chain analytics rollup',
        body: 'A single view that aggregates whale activity, sentiment and flows across Ethereum, Solana, Base, Arbitrum and Optimism.',
        bullets: [
          'Cross-chain net inflow / outflow tiles',
          'Per-chain breakdown with one-click drill-in',
          'Saved presets for power users',
        ],
      },
      {
        version: 'v2.0',
        date: 'February 2026',
        tag: 'new',
        title: 'Dashboard v2',
        body: 'Ground-up redesign of the home dashboard. Higher information density, calmer colour story, faster initial paint.',
      },
      {
        version: 'v1.9',
        date: 'January 2026',
        tag: 'improved',
        title: 'Signal accuracy calibration',
        body: 'Recalibrated the buy/sell signal model on six months of live performance data. Per-tier precision is now surfaced in the Statistics page.',
      },
      {
        version: 'v1.8',
        date: 'January 2026',
        tag: 'fixed',
        title: 'Watchlist sync reliability',
        body: 'Fixed a race condition that occasionally dropped watchlist edits when made from two devices within a few seconds of each other.',
      },
    ],
  },
  {
    quarter: 'Q4 2025',
    accent: '#34d399',
    items: [
      {
        version: 'v1.7',
        date: 'December 2025',
        tag: 'new',
        title: 'Sentiment & news pipeline',
        body: 'Aggregated market sentiment from social, news and on-chain signals, scored per token and surfaced alongside price.',
      },
      {
        version: 'v1.6',
        date: 'November 2025',
        tag: 'new',
        title: 'Token deep-dive pages',
        body: 'A dedicated page per token with whale flow, holder distribution, smart-money labels and a curated news feed.',
      },
      {
        version: 'v1.5',
        date: 'October 2025',
        tag: 'improved',
        title: 'Mobile layout pass',
        body: 'Reworked the dashboard, whales feed and statistics views for one-handed use on mobile. Charts now respect safe-area insets.',
      },
    ],
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

function slug(quarter) {
  return quarter.toLowerCase().replace(/\s+/g, '-')
}

export default function ChangelogClient() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 20, restDelta: 0.001 })

  return (
    <Page>
      <Backdrop />
      <FloatingOrb />
      <ScrollProgress style={{ scaleX }} />

      <Content>
        <Hero>
          <LivePill
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Live · Updated weekly
          </LivePill>
          <Headline
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            What is shipping on Sonar.
          </Headline>
          <Lede
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Every release, every fix, every new connector — in chronological
            order. Scroll to follow the trail. The greens are new features,
            cyan is improvements, amber is fixes, violet is what is in beta.
          </Lede>
        </Hero>

        <Layout>
          <Sidebar>
            {RELEASES.map((r) => (
              <SideLink key={r.quarter} href={`#${slug(r.quarter)}`} $accent={r.accent}>
                <span className="dot" />
                {r.quarter}
              </SideLink>
            ))}
          </Sidebar>

          <Stream>
            {RELEASES.map((group) => (
              <Group key={group.quarter} id={slug(group.quarter)}>
                <GroupLabel
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-15% 0px' }}
                  variants={fadeUp}
                >
                  {group.quarter}
                </GroupLabel>
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-10% 0px' }}
                  variants={stagger}
                >
                  {group.items.map((it) => (
                    <Entry key={it.version + it.title} variants={fadeUp}>
                      <EntryHead>
                        <Version>{it.version}</Version>
                        <Tag $kind={it.tag}>{it.tag}</Tag>
                        <DateText>{it.date}</DateText>
                      </EntryHead>
                      <Title>{it.title}</Title>
                      {it.body ? <Body>{it.body}</Body> : null}
                      {it.bullets && it.bullets.length > 0 ? (
                        <BulletList>
                          {it.bullets.map((b, i) => (
                            <Bullet key={i}>{b}</Bullet>
                          ))}
                        </BulletList>
                      ) : null}
                    </Entry>
                  ))}
                </motion.div>
              </Group>
            ))}

            <CTACard
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-15% 0px' }}
              variants={fadeUp}
            >
              <div>
                <h2>Want to shape what ships next?</h2>
                <p>
                  Pro subscribers get early access to every closed beta, and a
                  direct line to the team via the community channel.
                </p>
              </div>
              <div className="actions">
                <PrimaryLink href="/subscribe">Upgrade to Pro</PrimaryLink>
                <GhostLink href="/personalize">Preview Personalize</GhostLink>
                <GhostLink href="/community">Join community</GhostLink>
              </div>
            </CTACard>
          </Stream>
        </Layout>
      </Content>
    </Page>
  )
}
