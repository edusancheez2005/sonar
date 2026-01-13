'use client'

import React, { useState } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'

const colors = {
  bgDark: '#0a1621',
  bgCard: '#0d2134',
  primary: '#36a6ba',
  secondary: '#1e3951',
  textPrimary: '#ffffff',
  textSecondary: '#a0b2c6',
  accent: '#9b59b6'
}

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 3rem 2rem;
`

const Logo = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  
  .icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }
  
  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin: 0;
  }
  
  p {
    font-size: 1.1rem;
    color: ${colors.textSecondary};
    margin-top: 0.5rem;
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin: 3rem 0;
`

const DataCard = styled(motion.div)`
  background: ${colors.bgCard};
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: ${colors.primary};
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(54, 166, 186, 0.2);
  }
  
  .icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    display: block;
  }
  
  h3 {
    font-size: 1.2rem;
    font-weight: 600;
    color: ${colors.primary};
    margin: 0 0 0.5rem 0;
  }
  
  p {
    font-size: 0.95rem;
    color: ${colors.textSecondary};
    line-height: 1.6;
    margin: 0;
  }
  
  .detail {
    font-size: 0.85rem;
    color: ${colors.textSecondary};
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(54, 166, 186, 0.1);
    display: none;
  }
  
  &:hover .detail {
    display: block;
  }
`

const Examples = styled.div`
  margin-top: 3rem;
  
  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: ${colors.textPrimary};
    margin-bottom: 1rem;
    text-align: center;
  }
  
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }
`

const ExampleButton = styled(motion.button)`
  background: rgba(54, 166, 186, 0.1);
  border: 1px solid rgba(54, 166, 186, 0.3);
  color: ${colors.textPrimary};
  padding: 1rem 1.5rem;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  
  &:hover {
    background: rgba(54, 166, 186, 0.2);
    border-color: ${colors.primary};
    transform: translateY(-2px);
  }
`

const HowItWorks = styled.div`
  margin-top: 3rem;
  padding: 2rem;
  background: rgba(54, 166, 186, 0.05);
  border: 1px solid rgba(54, 166, 186, 0.1);
  border-radius: 12px;
  
  h2 {
    font-size: 1.3rem;
    font-weight: 600;
    color: ${colors.primary};
    margin: 0 0 1.5rem 0;
  }
  
  .steps {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .step {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    
    .number {
      background: ${colors.primary};
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      flex-shrink: 0;
    }
    
    .content {
      flex: 1;
      
      h4 {
        font-size: 1rem;
        font-weight: 600;
        color: ${colors.textPrimary};
        margin: 0 0 0.25rem 0;
      }
      
      p {
        font-size: 0.9rem;
        color: ${colors.textSecondary};
        margin: 0;
        line-height: 1.5;
      }
    }
  }
`

export default function OrcaWelcome({ onExampleClick }) {
  const dataTypes = [
    {
      icon: '🐋',
      title: 'Whale Tracking',
      description: 'Real-time monitoring of large cryptocurrency transactions',
      detail: 'Track whale wallets moving millions in ERC-20 tokens. See buy/sell pressure from major holders.'
    },
    {
      icon: '📊',
      title: 'Sentiment Analysis',
      description: 'AI-powered sentiment from news and social media',
      detail: 'Our trained LLM analyzes thousands of articles to gauge market sentiment with 60% LLM + 40% provider weighting.'
    },
    {
      icon: '🌙',
      title: 'Social Intelligence',
      description: 'Community buzz and trending topics from LunarCrush',
      detail: 'Track social engagement, creator activity, and trending themes across crypto Twitter and Reddit.'
    },
    {
      icon: '💰',
      title: 'Price Data',
      description: 'Real-time price, volume, and market cap from CoinGecko',
      detail: '15-minute snapshots with 24h trends, ATH distance, and market cap rankings.'
    }
  ]

  const examples = [
    "What's happening with BTC?",
    "Should I invest in ETH?",
    "Tell me about SOL whale activity",
    "Analyze DOGE sentiment",
    "Compare BTC and ETH",
    "What's the best altcoin right now?"
  ]

  return (
    <Container>
      <Logo>
        <div className="icon">🐋</div>
        <h1>ORCA AI</h1>
        <p>Your AI-Powered Crypto Intelligence Assistant</p>
      </Logo>

      <Grid>
        {dataTypes.map((data, index) => (
          <DataCard
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <span className="icon">{data.icon}</span>
            <h3>{data.title}</h3>
            <p>{data.description}</p>
            <div className="detail">{data.detail}</div>
          </DataCard>
        ))}
      </Grid>

      <HowItWorks>
        <h2>⚡ How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="number">1</div>
            <div className="content">
              <h4>Ask Anything</h4>
              <p>Type your question about any cryptocurrency in plain English</p>
            </div>
          </div>
          <div className="step">
            <div className="number">2</div>
            <div className="content">
              <h4>ORCA Analyzes</h4>
              <p>Our AI combines whale data, sentiment scores, social buzz, and price action</p>
            </div>
          </div>
          <div className="step">
            <div className="number">3</div>
            <div className="content">
              <h4>Get Insights</h4>
              <p>Receive structured analysis with short-term and long-term perspectives</p>
            </div>
          </div>
        </div>
      </HowItWorks>

      <Examples>
        <h2>💡 Try asking:</h2>
        <div className="grid">
          {examples.map((example, index) => (
            <ExampleButton
              key={index}
              onClick={() => onExampleClick(example)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {example}
            </ExampleButton>
          ))}
        </div>
      </Examples>
    </Container>
  )
}

