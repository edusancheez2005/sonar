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
          </ul>
        </Column>
      </FooterContent>
      <BottomBar>
        <div className="row">
          <p>&copy; 2026 Sonar. All rights reserved.</p>
          <nav>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/faq">FAQ</a>
          </nav>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', opacity: 0.6, textAlign: 'center', lineHeight: 1.6, maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto', marginTop: '1rem' }}>
          Sonar Tracker provides on-chain data analysis and market intelligence for informational and educational purposes only. Nothing on this platform constitutes financial advice, investment recommendations, or a solicitation to buy, sell, or hold any cryptocurrency or financial instrument. Sonar is not authorised or regulated by the Financial Conduct Authority (FCA) or any other financial regulatory body. Cryptocurrency markets are highly volatile — you may lose some or all of your investment. Past performance of any signal, analysis, or data does not guarantee future results. Always conduct your own research and consult a qualified financial advisor before making investment decisions.
        </p>
      </BottomBar>
    </FooterContainer>
  );
};

export default Footer; 