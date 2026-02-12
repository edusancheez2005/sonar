'use client'

import React from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'

const MONO_FONT = "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace"
const SANS_FONT = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
const COLORS = {
  cyan: '#00e5ff', green: '#00e676', textPrimary: '#e0e6ed',
  textMuted: '#5a6a7a', panelBg: 'rgba(13, 17, 28, 0.8)',
  borderSubtle: 'rgba(0, 229, 255, 0.08)',
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

const LogoSection = styled(motion.div)`
  margin-bottom: 2rem;
`

const OrcaLogo = styled.div`
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  color: ${COLORS.cyan};
  margin-bottom: 0.75rem;
  text-shadow: 0 0 30px rgba(0, 229, 255, 0.3);
  font-family: ${MONO_FONT};
`

const Title = styled.h1`
  font-size: 1.4rem;
  font-weight: 600;
  color: ${COLORS.textPrimary};
  margin-bottom: 0.4rem;
  font-family: ${SANS_FONT};
`

const Subtitle = styled.p`
  font-size: 0.85rem;
  color: ${COLORS.textMuted};
  font-family: ${MONO_FONT};
  letter-spacing: 0.5px;
`

const DescriptionCard = styled(motion.div)`
  max-width: 640px;
  background: ${COLORS.panelBg};
  backdrop-filter: blur(12px);
  border: 1px solid ${COLORS.borderSubtle};
  border-radius: 8px;
  padding: 2rem 2.5rem;
  margin-bottom: 2.5rem;
`

const Description = styled.p`
  font-size: 0.95rem;
  color: ${COLORS.textMuted};
  line-height: 1.8;
  margin: 0;
  font-family: ${SANS_FONT};
  
  strong { color: ${COLORS.textPrimary}; font-weight: 600; }
  span.highlight { color: ${COLORS.cyan}; }
`

const Stats = styled.div`
  display: flex;
  justify-content: center;
  gap: 2.5rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${COLORS.borderSubtle};
`

const Stat = styled.div`text-align: center;`

const StatValue = styled.div`
  font-size: 1.15rem;
  font-weight: 700;
  color: ${COLORS.cyan};
  margin-bottom: 0.25rem;
  font-family: ${MONO_FONT};
  text-shadow: 0 0 15px rgba(0, 229, 255, 0.2);
`

const StatLabel = styled.div`
  font-size: 0.65rem;
  color: ${COLORS.textMuted};
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-family: ${SANS_FONT};
  font-weight: 600;
`

const ExamplesSection = styled(motion.div)`
  width: 100%;
  max-width: 700px;
`

const ExamplesTitle = styled.h3`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${COLORS.textMuted};
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 1rem;
  font-family: ${SANS_FONT};
`

const ExamplesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`

const ExampleButton = styled.button`
  background: rgba(0, 229, 255, 0.04);
  border: 1px solid ${COLORS.borderSubtle};
  border-radius: 6px;
  padding: 0.85rem 1rem;
  color: ${COLORS.textMuted};
  font-size: 0.85rem;
  font-family: ${MONO_FONT};
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover {
    background: rgba(0, 229, 255, 0.08);
    border-color: rgba(0, 229, 255, 0.2);
    color: ${COLORS.textPrimary};
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
        transition={{ duration: 0.5 }}
      >
        <OrcaLogo>ORCA</OrcaLogo>
        <Title>AI-Powered Crypto Intelligence</Title>
        <Subtitle>// your personal market analyst</Subtitle>
      </LogoSection>
      
      <DescriptionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
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
        transition={{ duration: 0.5, delay: 0.2 }}
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
