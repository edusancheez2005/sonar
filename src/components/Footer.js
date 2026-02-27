'use client'
/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

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
  .brand img { height: 48px; margin-right: 1rem; }
  .brand h2 { color: var(--primary); font-size: 2rem; margin: 0; }
  p { color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem; }
`;

const SocialLinks = styled.div`
  display: flex; gap: 1rem; margin-top: 1.5rem;
`;

const SocialIcon = styled(motion.a)`
  display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%;
  background-color: rgba(54, 166, 186, 0.1); color: var(--text-secondary); transition: all 0.2s ease;
  &:hover { background-color: var(--primary); color: white; transform: translateY(-3px); }
  svg { width: 18px; height: 18px; }
`;

const BottomBar = styled.div`
  max-width: 1200px; margin: 3rem auto 0; padding-top: 1.5rem; border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex; justify-content: space-between; align-items: center;
  @media (max-width: 768px) { flex-direction: column; gap: 1rem; text-align: center; }
  p { color: var(--text-secondary); font-size: 0.9rem; margin: 0; }
  nav { display: flex; gap: 1.5rem; }
  nav a { color: var(--text-secondary); text-decoration: none; font-size: 0.9rem; transition: color 0.2s ease; }
  nav a:hover { color: var(--primary); }
`;

const TwitterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path d="M22 4.01c-1 .49-1.98.689-3 .99-1.121-1.265-2.783-1.335-4.38-.737S11.977 6.323 12 8v1c-3.245.083-6.135-1.395-8-4 0 0-4.182 7.433 4 11-1.872 1.247-3.739 2.088-6 2 3.308 1.803 6.913 2.423 10.034 1.517 3.58-1.04 6.522-3.723 7.651-7.742a13.84 13.84 0 0 0 .497-3.753C20.18 7.773 21.692 5.25 22 4.009z" />
  </svg>
);
const LinkedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
  </svg>
);
const GithubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);
const TelegramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
  </svg>
);

const Footer = () => {
  return (
    <FooterContainer>
      <FooterContent>
        <BrandColumn>
          <div className="brand">
            <img src="/logo.svg" alt="Sonar Logo" />
            <h2>Sonar</h2>
          </div>
          <p>
            Sonar provides real-time cryptocurrency transaction data and analytics 
            to help traders make informed decisions in the volatile crypto market.
          </p>
          <SocialLinks>
            <SocialIcon href="https://twitter.com" target="_blank" rel="noopener noreferrer" whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }}>
              <TwitterIcon />
            </SocialIcon>
            <SocialIcon href="https://linkedin.com" target="_blank" rel="noopener noreferrer" whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }}>
              <LinkedInIcon />
            </SocialIcon>
            <SocialIcon href="https://github.com" target="_blank" rel="noopener noreferrer" whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }}>
              <GithubIcon />
            </SocialIcon>
            <SocialIcon href="https://telegram.org" target="_blank" rel="noopener noreferrer" whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }}>
              <TelegramIcon />
            </SocialIcon>
          </SocialLinks>
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
            <li><a href="/community" title="Join the Sonar community">Community</a></li>
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
        <p>&copy; 2025 Sonar. All rights reserved.</p>
        <nav>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="/faq">FAQ</a>
        </nav>
      </BottomBar>
    </FooterContainer>
  );
};

export default Footer; 