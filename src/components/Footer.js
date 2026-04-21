'use client'
/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import styled from 'styled-components';

const FooterContainer = styled.footer`
  background-color: var(--background-card);
  padding: 3rem 2rem 2rem;
  margin-top: 4rem;
  border-top: 1px solid rgba(54, 166, 186, 0.2);
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
  h3 { color: var(--text-primary); font-size: 1.2rem; margin-bottom: 1.5rem; position: relative; }
  h3:after { content: ''; position: absolute; left: 0; bottom: -0.5rem; width: 40px; height: 3px; background-color: var(--primary); }
  ul { list-style: none; padding: 0; margin: 0; }
  li { margin-bottom: 0.75rem; }
  a { color: var(--text-secondary); text-decoration: none; transition: color 0.2s ease; display: flex; align-items: center; }
  a:hover { color: var(--primary); }
  a svg { margin-right: 0.5rem; }
`;

const BrandColumn = styled(Column)`
  .brand { display: flex; align-items: center; margin-bottom: 1rem; }
  .brand img { height: 40px; margin-right: 1rem; }
  p { color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem; }
`;

const BottomBar = styled.div`
  max-width: 1200px; margin: 3rem auto 0; padding-top: 1.5rem; border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex; flex-direction: column; gap: 1rem;
  .row { display: flex; justify-content: space-between; align-items: center; }
  @media (max-width: 768px) { .row { flex-direction: column; gap: 1rem; text-align: center; } }
  p { color: var(--text-secondary); font-size: 0.9rem; margin: 0; }
  nav { display: flex; gap: 1.5rem; }
  nav a { color: var(--text-secondary); text-decoration: none; font-size: 0.9rem; transition: color 0.2s ease; }
  nav a:hover { color: var(--primary); }
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
          <p>&copy; 2026 Sonar. All rights reserved.</p>
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