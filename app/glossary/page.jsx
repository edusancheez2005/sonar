import React from 'react'
import styled from 'styled-components'
import AuthGuard from '@/app/components/AuthGuard'
import Link from 'next/link'

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 2rem;
  min-height: 100vh;
`

const Header = styled.div`
  background: linear-gradient(135deg, #0d2134 0%, #1a2f42 100%);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 20px;
  padding: 3rem;
  margin-bottom: 3rem;
  text-align: center;
`

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
`

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
`

const Section = styled.div`
  background: linear-gradient(135deg, rgba(13, 33, 52, 0.8) 0%, rgba(26, 47, 66, 0.6) 100%);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2.5rem;
  margin-bottom: 2rem;
`

const SectionTitle = styled.h2`
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  
  svg {
    width: 32px;
    height: 32px;
    fill: var(--primary);
  }
`

const TermCard = styled.div`
  background: rgba(13, 33, 52, 0.4);
  border: 1px solid rgba(54, 166, 186, 0.15);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`

const TermHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`

const TermBadge = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 48px;
  border-radius: 12px;
  font-size: 1.5rem;
  background: ${props => props.color || 'rgba(54, 166, 186, 0.2)'};
`

const TermTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
`

const TermDescription = styled.p`
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0 0 1rem 0;
`

const FlowDiagram = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(54, 166, 186, 0.1);
  border-radius: 8px;
  padding: 1rem;
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--primary);
  margin: 1rem 0;
`

const ExampleBox = styled.div`
  background: rgba(46, 204, 113, 0.1);
  border-left: 3px solid #2ecc71;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
  
  strong {
    color: #2ecc71;
  }
`

const StatBox = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
`

const StatCard = styled.div`
  background: rgba(13, 33, 52, 0.6);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
`

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: ${props => props.color || 'var(--primary)'};
  margin-bottom: 0.5rem;
`

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const InfoBox = styled.div`
  background: rgba(52, 152, 219, 0.1);
  border: 1px solid rgba(52, 152, 219, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  
  strong {
    color: #3498db;
  }
`

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
  margin-top: 2rem;
  transition: all 0.2s;
  
  &:hover {
    color: #2980b9;
    transform: translateX(-4px);
  }
  
  svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }
`

export default function GlossaryPage() {
  return (
    <AuthGuard>
      <Container>
        <Header>
          <Title>📖 Transaction Types Glossary</Title>
          <Subtitle>
            Understanding whale activity: What BUY, SELL, TRANSFER, and DEFI transactions mean
          </Subtitle>
        </Header>

        <InfoBox>
          <strong>💡 Quick Summary:</strong> Sonar tracks transactions $10,000+. Not all transactions are trades! 
          We classify each transaction to understand if it's a real buy/sell or just wallet movements.
        </InfoBox>

        <StatBox>
          <StatCard>
            <StatValue color="#2ecc71">~15%</StatValue>
            <StatLabel>BUY Transactions</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue color="#e74c3c">~20%</StatValue>
            <StatLabel>SELL Transactions</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue color="#95a5a6">~64%</StatValue>
            <StatLabel>TRANSFER (Ignore)</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue color="#f39c12">~1%</StatValue>
            <StatLabel>DEFI (Ignore)</StatLabel>
          </StatCard>
        </StatBox>

        <Section>
          <SectionTitle>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Trading Transactions (Count These!)
          </SectionTitle>

          <TermCard>
            <TermHeader>
              <TermBadge color="rgba(46, 204, 113, 0.2)">🟢</TermBadge>
              <TermTitle>BUY</TermTitle>
            </TermHeader>
            <TermDescription>
              A whale is <strong>receiving tokens</strong> from an exchange or DEX. They are buying/accumulating the token.
            </TermDescription>
            <FlowDiagram>
              Exchange/DEX → Whale 🐋<br/>
              Money ($) → Exchange/DEX
            </FlowDiagram>
            <ExampleBox>
              <strong>Example:</strong> Whale receives 1,000 ETH from Binance for $3,000,000 USDT
            </ExampleBox>
            <TermDescription style={{ marginTop: '1rem', fontSize: '0.95rem' }}>
              <strong>Why it matters:</strong> Indicates accumulation and bullish sentiment. When whales buy, it often signals confidence in the token.
            </TermDescription>
          </TermCard>

          <TermCard>
            <TermHeader>
              <TermBadge color="rgba(231, 76, 60, 0.2)">🔴</TermBadge>
              <TermTitle>SELL</TermTitle>
            </TermHeader>
            <TermDescription>
              A whale is <strong>sending tokens</strong> to an exchange or DEX. They are selling/distributing the token.
            </TermDescription>
            <FlowDiagram>
              Whale 🐋 → Exchange/DEX<br/>
              Money ($) → Whale
            </FlowDiagram>
            <ExampleBox>
              <strong>Example:</strong> Whale sends 1,000 ETH to Coinbase, receives $3,000,000 USDT
            </ExampleBox>
            <TermDescription style={{ marginTop: '1rem', fontSize: '0.95rem' }}>
              <strong>Why it matters:</strong> Indicates distribution and bearish sentiment. When whales sell, it can signal profit-taking or lack of confidence.
            </TermDescription>
          </TermCard>
        </Section>

        <Section>
          <SectionTitle>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            Non-Trading Transactions (Ignore These!)
          </SectionTitle>

          <TermCard>
            <TermHeader>
              <TermBadge color="rgba(149, 165, 166, 0.2)">🔵</TermBadge>
              <TermTitle>TRANSFER</TermTitle>
            </TermHeader>
            <TermDescription>
              A whale is <strong>moving tokens between their own wallets</strong>. No actual buying or selling is happening.
            </TermDescription>
            <FlowDiagram>
              Whale Wallet A 🐋 → Whale Wallet B 🐋<br/>
              (Same owner, different address)
            </FlowDiagram>
            <ExampleBox>
              <strong>Example:</strong> Whale moves 500 ETH from cold storage to hot wallet for trading
            </ExampleBox>
            <TermDescription style={{ marginTop: '1rem', fontSize: '0.95rem' }}>
              <strong>Why ignore it:</strong> This is like moving money between your checking and savings account. 
              The whale still owns the tokens - no market impact. <strong>~64% of all transactions are transfers!</strong>
            </TermDescription>
          </TermCard>

          <TermCard>
            <TermHeader>
              <TermBadge color="rgba(243, 156, 18, 0.2)">🟡</TermBadge>
              <TermTitle>DEFI</TermTitle>
            </TermHeader>
            <TermDescription>
              A whale is <strong>interacting with DeFi protocols</strong>. Could be staking, lending, or providing liquidity.
            </TermDescription>
            <FlowDiagram>
              Whale 🐋 ↔ DeFi Smart Contract 📜<br/>
              (Uniswap, Aave, Compound, etc.)
            </FlowDiagram>
            <ExampleBox>
              <strong>Example:</strong> Whale deposits 1,000,000 USDC into Aave lending pool to earn interest
            </ExampleBox>
            <TermDescription style={{ marginTop: '1rem', fontSize: '0.95rem' }}>
              <strong>Why ignore it:</strong> This is not a market trade. The tokens are locked in DeFi contracts, 
              not sold on the open market. No immediate price impact.
            </TermDescription>
          </TermCard>
        </Section>

        <Section>
          <SectionTitle>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            How We Use This for Sentiment Analysis
          </SectionTitle>

          <TermDescription style={{ fontSize: '1.05rem', marginBottom: '1.5rem' }}>
            Sonar calculates token sentiment by analyzing the <strong>ratio of BUY vs SELL</strong> transactions:
          </TermDescription>

          <FlowDiagram style={{ fontSize: '1rem', padding: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Bullish Sentiment:</strong> More BUYs than SELLs<br/>
              Example: 70% BUY, 30% SELL = Accumulation phase 🟢
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Bearish Sentiment:</strong> More SELLs than BUYs<br/>
              Example: 30% BUY, 70% SELL = Distribution phase 🔴
            </div>
            <div>
              <strong>Neutral:</strong> Balanced or stablecoin<br/>
              Example: 50% BUY, 50% SELL = No clear trend 🟡
            </div>
          </FlowDiagram>

          <InfoBox>
            <strong>📊 Real Data (Last 24h):</strong><br/>
            • Total tracked: 1,000 transactions<br/>
            • Real trades (BUY/SELL): 346 (34.6%)<br/>
            • Ignored (TRANSFER): 642 (64.2%)<br/>
            • Ignored (DEFI): 12 (1.2%)<br/>
            <br/>
            <strong>Without filtering out TRANSFER/DEFI, our sentiment would be meaningless!</strong>
          </InfoBox>
        </Section>

        <Section>
          <SectionTitle>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z"/>
            </svg>
            Frequently Asked Questions
          </SectionTitle>

          <TermCard>
            <TermTitle style={{ fontSize: '1.2rem' }}>Why don't you count TRANSFER transactions?</TermTitle>
            <TermDescription>
              Because they represent ~64% of all activity but have zero market impact. 
              Including them would dilute the signal and make sentiment analysis useless.
            </TermDescription>
          </TermCard>

          <TermCard>
            <TermTitle style={{ fontSize: '1.2rem' }}>How do you know if it's a BUY or SELL?</TermTitle>
            <TermDescription>
              We analyze the token flow direction and counterparty type:
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <li>If tokens flow <strong>FROM exchange TO whale</strong> = BUY</li>
                <li>If tokens flow <strong>FROM whale TO exchange</strong> = SELL</li>
                <li>If both addresses are EOAs (not exchanges) = TRANSFER</li>
              </ul>
            </TermDescription>
          </TermCard>

          <TermCard>
            <TermTitle style={{ fontSize: '1.2rem' }}>What's the minimum transaction size you track?</TermTitle>
            <TermDescription>
              We track transactions <strong>$10,000 USD or larger</strong>. Smaller transactions are typically retail 
              traders and don't reflect whale activity.
            </TermDescription>
          </TermCard>

          <TermCard>
            <TermTitle style={{ fontSize: '1.2rem' }}>Can whales fake transfers to manipulate sentiment?</TermTitle>
            <TermDescription>
              No, because we specifically filter OUT transfers. Only actual trades to/from exchanges (BUY/SELL) 
              affect sentiment calculations. Moving tokens between their own wallets has zero impact.
            </TermDescription>
          </TermCard>
        </Section>

        <BackLink href="/dashboard">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back to Dashboard
        </BackLink>
      </Container>
    </AuthGuard>
  )
}

