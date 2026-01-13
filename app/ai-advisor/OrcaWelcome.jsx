'use client'

import React from 'react'
import styled, { keyframes } from 'styled-components'
import { motion } from 'framer-motion'

const colors = {
  bgDark: '#0a1621',
  bgCard: '#0d2134',
  primary: '#36a6ba',
  textPrimary: '#ffffff',
  textSecondary: '#a0b2c6',
  textMuted: '#6b7d8f',
  borderLight: 'rgba(54, 166, 186, 0.15)',
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
  text-align: center;
`

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const LogoSection = styled(motion.div)`
  margin-bottom: 2rem;
`

const OrcaLogo = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
  filter: drop-shadow(0 4px 20px rgba(54, 166, 186, 0.3));
`

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${colors.textPrimary};
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
`

const Subtitle = styled.p`
  font-size: 1rem;
  color: ${colors.primary};
  font-weight: 500;
`

const DescriptionCard = styled(motion.div)`
  max-width: 640px;
  background: linear-gradient(135deg, ${colors.bgCard} 0%, rgba(13, 33, 52, 0.8) 100%);
  border: 1px solid ${colors.borderLight};
  border-radius: 16px;
  padding: 2rem 2.5rem;
  margin-bottom: 2.5rem;
`

const Description = styled.p`
  font-size: 1.05rem;
  color: ${colors.textSecondary};
  line-height: 1.8;
  margin: 0;
  
  strong {
    color: ${colors.textPrimary};
    font-weight: 600;
  }
  
  span.highlight {
    color: ${colors.primary};
  }
`

const Divider = styled.div`
  width: 50px;
  height: 2px;
  background: ${colors.primary};
  margin: 1.5rem auto;
  opacity: 0.5;
`

const Stats = styled.div`
  display: flex;
  justify-content: center;
  gap: 2.5rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${colors.borderLight};
`

const Stat = styled.div`
  text-align: center;
`

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${colors.primary};
  margin-bottom: 0.25rem;
`

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const ExamplesSection = styled(motion.div)`
  width: 100%;
  max-width: 700px;
`

const ExamplesTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
`

const ExamplesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`

const ExampleButton = styled.button`
  background: ${colors.bgCard};
  border: 1px solid ${colors.borderLight};
  border-radius: 10px;
  padding: 1rem 1.25rem;
  color: ${colors.textSecondary};
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(54, 166, 186, 0.08);
    border-color: ${colors.primary};
    color: ${colors.textPrimary};
    transform: translateY(-2px);
  }
`

const examples = [
  "Should I buy Bitcoin right now?",
  "What's the sentiment on Ethereum?",
  "Are whales accumulating Solana?",
  "Is PEPE a good investment?",
  "What does the news say about XRP?",
  "Give me your analysis on DOGE",
]

export default function OrcaWelcome({ onExampleClick }) {
  return (
    <Container>
      <LogoSection
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <OrcaLogo>ORCA</OrcaLogo>
        <Title>AI-Powered Crypto Intelligence</Title>
        <Subtitle>Your Personal Market Analyst</Subtitle>
      </LogoSection>
      
      <DescriptionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        <Description>
          ORCA is trained on <strong>proprietary sentiment models</strong> analyzing millions of news articles, 
          social media posts, and market signals in real-time. Our team tracks <span className="highlight">whale 
          transaction data</span> across major blockchains, combining on-chain analytics with 
          AI-driven sentiment scoring to give you <strong>institutional-grade insights</strong> that 
          were previously only available to professional trading desks.
        </Description>
        
        <Stats>
          <Stat>
            <StatValue>10M+</StatValue>
            <StatLabel>News Analyzed</StatLabel>
          </Stat>
          <Stat>
            <StatValue>Real-Time</StatValue>
            <StatLabel>Whale Tracking</StatLabel>
          </Stat>
          <Stat>
            <StatValue>50+</StatValue>
            <StatLabel>Tokens Covered</StatLabel>
          </Stat>
        </Stats>
      </DescriptionCard>
      
      <ExamplesSection
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <ExamplesTitle>Try Asking</ExamplesTitle>
        <ExamplesGrid>
          {examples.map((example, i) => (
            <ExampleButton
              key={i}
              onClick={() => onExampleClick?.(example)}
            >
              {example}
            </ExampleButton>
          ))}
        </ExamplesGrid>
      </ExamplesSection>
    </Container>
  )
}
