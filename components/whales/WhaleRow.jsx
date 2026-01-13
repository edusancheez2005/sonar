'use client'

import React, { useState } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'

const colors = {
  bgDark: '#0a0f19',
  bgCard: '#0f1622',
  primary: '#3f92ff',
  secondary: '#16c784',
  textPrimary: '#e1e8f0',
  textSecondary: '#8aa7bf',
  borderLight: '#1f2a3a',
  sentimentBull: '#16c784',
  sentimentBear: '#ed4c5c',
}

const Row = styled(motion.div)`
  background: ${colors.bgCard};
  border: 1px solid ${colors.borderLight};
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  transition: all 0.2s ease;
  cursor: pointer;
  margin-bottom: 1rem;
  
  &:hover {
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.45);
    transform: translateY(-1px);
    border-color: ${colors.primary};
  }
`

const MainContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 1rem;
  }
`

const AddressSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
`

const Address = styled.div`
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: ${colors.textPrimary};
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const CopyButton = styled.button`
  background: transparent;
  border: none;
  color: ${colors.textSecondary};
  font-size: 0.875rem;
  padding: 0.25rem;
  cursor: pointer;
  transition: color 0.2s ease;
  
  &:hover {
    color: ${colors.primary};
  }
`

const TokenLogos = styled.div`
  display: flex;
  gap: 0.25rem;
  margin-left: 0.5rem;
`

const TokenLogo = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${colors.bgDark};
  padding: 2px;
  border: 1px solid ${colors.borderLight};
`

const StatsSection = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`

const NetFlow = styled.div`
  text-align: right;
`

const FlowLabel = styled.div`
  font-size: 0.7rem;
  color: ${colors.textSecondary};
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const FlowAmount = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${props => props.$positive ? colors.sentimentBull : colors.sentimentBear};
`

const RatioSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const RatioBar = styled.div`
  width: 80px;
  height: 6px;
  background: ${colors.borderLight};
  border-radius: 3px;
  overflow: hidden;
  display: flex;
`

const BuyBar = styled.div`
  background: ${colors.sentimentBull};
  width: ${props => props.$percent}%;
  transition: width 0.3s ease;
`

const SellBar = styled.div`
  background: ${colors.sentimentBear};
  width: ${props => props.$percent}%;
  transition: width 0.3s ease;
`

const RatioText = styled.div`
  font-size: 0.8rem;
  color: ${colors.textSecondary};
  font-weight: 500;
`

const SparklineContainer = styled.div`
  width: 100px;
  height: 32px;
`

const SparklineSvg = styled.svg`
  width: 100%;
  height: 100%;
  
  path {
    stroke: ${props => props.$positive ? colors.sentimentBull : colors.sentimentBear};
    stroke-width: 2;
    fill: none;
  }
`

const ExpandedDetails = styled(motion.div)`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${colors.borderLight};
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const DetailLabel = styled.div`
  font-size: 0.75rem;
  color: ${colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const DetailValue = styled.div`
  font-size: 0.95rem;
  color: ${colors.textPrimary};
  font-weight: 600;
`

export default function WhaleRow({ whale }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const copyAddress = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(whale.address)
  }

  const generateSparkline = (data = []) => {
    if (!data || data.length === 0) return ''
    const width = 100
    const height = 32
    const step = width / (data.length - 1 || 1)
    
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    
    return data.map((val, i) => {
      const x = i * step
      const y = height - ((val - min) / range) * height
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`
    }).join(' ')
  }

  const buyPercent = whale.totalTransactions > 0 
    ? Math.round((whale.buys / whale.totalTransactions) * 100)
    : 50
  const sellPercent = 100 - buyPercent

  return (
    <Row
      onClick={() => setIsExpanded(!isExpanded)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <MainContent>
        <AddressSection>
          <Address>
            {whale.ens || `${whale.address.slice(0, 6)}...${whale.address.slice(-4)}`}
            <CopyButton onClick={copyAddress} title="Copy address">
              📋
            </CopyButton>
          </Address>
          {whale.tokens && whale.tokens.length > 0 && (
            <TokenLogos>
              {whale.tokens.slice(0, 5).map((token, i) => (
                <TokenLogo 
                  key={i}
                  src={token.logo || `https://via.placeholder.com/24?text=${token.symbol}`}
                  alt={token.symbol}
                  title={token.symbol}
                  onError={(e) => {
                    e.target.src = `https://via.placeholder.com/24?text=${token.symbol}`
                  }}
                />
              ))}
            </TokenLogos>
          )}
        </AddressSection>

        <StatsSection>
          <NetFlow>
            <FlowLabel>Net Flow (24h)</FlowLabel>
            <FlowAmount $positive={whale.netFlow >= 0}>
              {whale.netFlow >= 0 ? '+' : ''}${(Math.abs(whale.netFlow) / 1e6).toFixed(2)}M
            </FlowAmount>
          </NetFlow>

          <RatioSection>
            <RatioBar>
              <BuyBar $percent={buyPercent} />
              <SellBar $percent={sellPercent} />
            </RatioBar>
            <RatioText>
              {buyPercent}/{sellPercent}
            </RatioText>
          </RatioSection>

          {whale.flowTrend && whale.flowTrend.length > 0 && (
            <SparklineContainer>
              <SparklineSvg 
                viewBox="0 0 100 32" 
                preserveAspectRatio="none"
                $positive={whale.flowTrend[whale.flowTrend.length - 1] >= whale.flowTrend[0]}
              >
                <path d={generateSparkline(whale.flowTrend)} />
              </SparklineSvg>
            </SparklineContainer>
          )}
        </StatsSection>
      </MainContent>

      <AnimatePresence>
        {isExpanded && (
          <ExpandedDetails
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DetailItem>
              <DetailLabel>Total Buys</DetailLabel>
              <DetailValue style={{ color: colors.sentimentBull }}>
                {whale.buys} transactions
              </DetailValue>
            </DetailItem>
            <DetailItem>
              <DetailLabel>Total Sells</DetailLabel>
              <DetailValue style={{ color: colors.sentimentBear }}>
                {whale.sells} transactions
              </DetailValue>
            </DetailItem>
            <DetailItem>
              <DetailLabel>Total Volume</DetailLabel>
              <DetailValue>
                ${(whale.totalVolume / 1e6).toFixed(2)}M
              </DetailValue>
            </DetailItem>
            <DetailItem>
              <DetailLabel>Last Activity</DetailLabel>
              <DetailValue>
                {whale.lastActivity || 'N/A'}
              </DetailValue>
            </DetailItem>
          </ExpandedDetails>
        )}
      </AnimatePresence>
    </Row>
  )
}

