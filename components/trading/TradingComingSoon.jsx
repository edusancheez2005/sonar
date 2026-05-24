'use client'

/**
 * TradingComingSoon
 * =============================================================================
 * Static "automated trading is not live yet" surface (§4.H of
 * ORCA_COPILOT_BUILD_PROMPT.md).
 *
 * LOCKED DECISION §7.4: this PR ships as a static placeholder with NO email
 * capture. The waitlist form will land in a later PR once Saif gives a ship
 * window for the trading product. Do not add forms, inputs, or analytics
 * events that imply a live waitlist here.
 *
 * The disclaimer string is REQUIRED and must not be paraphrased. Any change
 * to it needs legal review (§4.H "DO NOT ship without legal review").
 */
import styled from 'styled-components'

export const TRADING_COMING_SOON_DISCLAIMER =
  'Sonar is currently a research and information tool only. We are not a broker, dealer, or investment adviser. The trading feature will be operated by a separately authorised entity subject to applicable financial regulation in your jurisdiction. Joining the waitlist does not create any account or obligation.'

export const TRADING_COMING_SOON_TITLE = 'Automated trading — coming soon'

export const TRADING_COMING_SOON_BODY =
  "We're building a way to act on Sonar signals directly — with full risk controls, KYC, and a per-trade confirmation step. It's not live yet. We'll open the waitlist once the launch window is confirmed."

export default function TradingComingSoon({ variant = 'page' }) {
  const isPanel = variant === 'panel'
  return (
    <Wrap data-testid="trading-coming-soon" $panel={isPanel}>
      <Title data-testid="trading-coming-soon-title" $panel={isPanel}>
        {TRADING_COMING_SOON_TITLE}
      </Title>
      <Body>{TRADING_COMING_SOON_BODY}</Body>
      <Disclaimer
        role="note"
        aria-label="Trading regulatory disclaimer"
        data-testid="trading-coming-soon-disclaimer"
      >
        {TRADING_COMING_SOON_DISCLAIMER}
      </Disclaimer>
      <Status data-testid="trading-coming-soon-status">
        Status: waitlist not yet open. Check back soon.
      </Status>
    </Wrap>
  )
}

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: ${(p) => (p.$panel ? '0' : '32px')};
  border-radius: ${(p) => (p.$panel ? '0' : '14px')};
  background: ${(p) => (p.$panel ? 'transparent' : 'rgba(13, 20, 33, 0.7)')};
  border: ${(p) => (p.$panel ? 'none' : '1px solid rgba(0, 229, 255, 0.12)')};
  color: #e0e6ed;
  max-width: ${(p) => (p.$panel ? '100%' : '720px')};
`

const Title = styled.h2`
  margin: ${(p) => (p.$panel ? '0' : '0')};
  font-size: ${(p) => (p.$panel ? '1rem' : '1.25rem')};
  color: #00e5ff;
  display: ${(p) => (p.$panel ? 'none' : 'block')};
`

const Body = styled.p`
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.55;
  color: #c5cbd6;
`

const Disclaimer = styled.p`
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: #8896a6;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.05);
`

const Status = styled.p`
  margin: 0;
  font-size: 0.8rem;
  color: #8896a6;
  font-style: italic;
`
