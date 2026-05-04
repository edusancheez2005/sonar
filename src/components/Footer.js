'use client'
/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import styled from 'styled-components';

const FooterContainer = styled.footer`
  background: rgba(6, 14, 22, 0.6);
  padding: 2.75rem 2rem 1.75rem;
  margin-top: 4rem;
  border-top: 1px solid rgba(34, 211, 238, 0.12);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.3), transparent);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 2rem 1rem 1.5rem;
  }
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 2rem;

  @media (max-width: 992px) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 576px) { grid-template-columns: 1fr; }
`;

const Column = styled.div`
  h3 {
    color: var(--text-primary);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    font-family: var(--font-mono);
    margin: 0 0 1.1rem 0;
    color: var(--neon-bright);
  }
  ul { list-style: none; padding: 0; margin: 0; }
  li { margin-bottom: 0.55rem; }
  a {
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 160ms ease;
    display: inline-flex;
    align-items: center;
    font-size: 0.88rem;
  }
  a:hover { color: var(--neon-bright); }
  a svg { margin-right: 0.5rem; }
`;

const BrandColumn = styled(Column)`
  .brand {
    display: flex;
    align-items: center;
    margin-bottom: 0.9rem;
  }
  .brand img {
    height: 36px;
    width: auto;
    max-width: 160px;
    object-fit: contain;
    display: block;
  }
  p {
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0 0 1rem 0;
    font-size: 0.88rem;
    max-width: 360px;
  }
`

const SocialRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;

  a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 9px;
    border: 1px solid rgba(34, 211, 238, 0.18);
    background: rgba(6, 14, 22, 0.6);
    color: var(--text-secondary);
    transition: color 160ms ease, border-color 160ms ease, background 160ms ease,
      transform 160ms ease;
  }
  a:hover {
    color: var(--neon-bright);
    border-color: rgba(34, 211, 238, 0.5);
    background: rgba(34, 211, 238, 0.08);
    transform: translateY(-1px);
  }
  a svg { margin: 0; display: block; }
`

const SOCIALS = [
  {
    href: 'https://x.com/sonartrackerio',
    label: 'Sonar on X (Twitter)',
    Icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
      </svg>
    ),
  },
  {
    href: 'https://instagram.com/sonartracker.io',
    label: 'Sonar on Instagram',
    Icon: () => (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

const BottomBar = styled.div`
  max-width: 1200px;
  margin: 2.25rem auto 0;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(34, 211, 238, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1rem;

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  @media (max-width: 768px) {
    .row { flex-direction: column; gap: 0.75rem; text-align: center; }
  }
  p {
    color: var(--text-secondary);
    font-size: 0.82rem;
    margin: 0;
    font-family: var(--font-mono);
  }
  nav {
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  nav a {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.82rem;
    transition: color 160ms ease;
  }
  nav a:hover { color: var(--neon-bright); }
`;

const Footer = () => {
  return (
    <FooterContainer>
      <FooterContent>
        <BrandColumn>
          <div className="brand">
            <img src="/logo2.png" alt="Sonar Logo" />
          </div>
          <p>
            Sonar provides real-time cryptocurrency transaction data and analytics 
            to help traders make informed decisions in the volatile crypto market.
          </p>
          <SocialRow>
            {SOCIALS.map(({ href, label, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
              >
                <Icon />
              </a>
            ))}
          </SocialRow>
        </BrandColumn>
        <Column>
          <h3>Platform</h3>
          <ul>
            <li><a href="/dashboard" title="Crypto tracker sonar dashboard for whale flows">Crypto Tracker Sonar Dashboard</a></li>
            <li><a href="/statistics" title="Real-time crypto whale transactions scanner">Real-Time Whale Transactions</a></li>
            <li><a href="/news" title="Crypto news aligned to whale market moves">Crypto News & Whale Moves</a></li>
            <li><a href="#" title="Sonar Tracker API for developers">Sonar Tracker API</a></li>
            <li><a href="#" title="Exchange integration for institutional users">Exchange Integration</a></li>
          </ul>
        </Column>
        <Column>
          <h3>Company</h3>
          <ul>
            <li><a href="/careers" title="Careers at Sonar Tracker">Careers</a></li>
            <li><a href="/press" title="Sonar press kit and media resources">Press Kit</a></li>
            <li><a href="/contact" title="Contact Sonar Tracker">Contact</a></li>
            
          </ul>
        </Column>
        <Column>
          <h3>Resources</h3>
          <ul>
            <li><a href="/help" title="Sonar Tracker help center">Help Center</a></li>
            <li><a href="/faq" title="Frequently asked questions">FAQ</a></li>
            <li><a href="/pricing" title="Pricing and subscription plans">Pricing</a></li>
            <li><a href="/terms" title="Terms of Service">Terms</a></li>
            <li><a href="/privacy" title="Privacy Policy">Privacy</a></li>
            <li><a href="/legal/data-removal-request" title="Request removal of personal data">Data Removal Request</a></li>
            <li><a href="/legal/dmca" title="DMCA copyright notice and counter-notice">DMCA</a></li>
          </ul>
        </Column>
      </FooterContent>
      <BottomBar>
        <div className="row">
          <p>&copy; 2025 Sonar. All rights reserved.</p>
          <nav>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/legal/data-removal-request">Data Removal</a>
            <a href="/legal/dmca">DMCA</a>
            <a href="/faq">FAQ</a>
          </nav>
        </div>
        {/* Persistent global disclaimer block. See LEGAL_AUDIT_2026-04-21.md
            §1.A findings A6, A7. Do not delete or shorten without legal sign-off. */}
        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', opacity: 0.65, textAlign: 'center', lineHeight: 1.6, maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto', marginTop: '1rem' }}>
          <strong>Not financial advice.</strong> Sonar Tracker provides on-chain data analysis and market intelligence for informational and educational purposes only. Nothing on this platform constitutes financial, investment, legal, tax or accounting advice, a recommendation to buy, sell or hold any cryptoasset or financial instrument, or a solicitation. Sonar Tracker is not authorised or regulated by the UK Financial Conduct Authority (FCA), the US Securities and Exchange Commission (SEC), the Commodity Futures Trading Commission (CFTC), the EU European Securities and Markets Authority (ESMA), or any other financial regulatory body, and is not a registered investment adviser or broker-dealer. <strong>Cryptoassets are high-risk and largely unregulated; you can lose all of the money you invest.</strong> Past performance and historical signals do not guarantee future results. Always conduct your own research and consult a qualified, licensed financial adviser before making any investment decision.
        </p>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.6, textAlign: 'center', lineHeight: 1.6, maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
          <strong>Eligibility.</strong> The Sonar Tracker service is intended for users aged 18 or over. The service is <strong>not</strong> available to, and may not be accessed by, persons located in or ordinarily resident in jurisdictions subject to comprehensive sanctions administered by the US Office of Foreign Assets Control (OFAC), HM Treasury (UK) or the EU, including but not limited to Cuba, Iran, North Korea, Syria, the Crimea, Donetsk and Luhansk regions of Ukraine, and any jurisdiction added to the consolidated sanctions lists from time to time. By using this site you represent and warrant that you are not such a person.
        </p>
      </BottomBar>
    </FooterContainer>
  );
};

export default Footer; 