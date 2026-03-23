'use client'
import React, { useState } from 'react'
import styled from 'styled-components'
import { TAG_COLORS } from '@/lib/wallet-tracker'

const Panel = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.25rem;
  margin-top: 1rem;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
`

const Title = styled.h3`
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const InfoIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(54, 166, 186, 0.15);
  color: var(--primary);
  font-size: 0.7rem;
  font-weight: 700;
`

const Arrow = styled.span`
  font-size: 0.8rem;
  color: var(--text-secondary);
`

const Content = styled.div`
  margin-top: 1rem;
`

const Section = styled.div`
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`

const SectionTitle = styled.h4`
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 0.5rem 0;
`

const TagRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`

const TagBadge = styled.span`
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`

const TagDesc = styled.span`
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.4;
`

const ScoreRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
`

const ScoreDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const ScoreRange = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
  min-width: 50px;
`

const ScoreDesc = styled.span`
  font-size: 0.75rem;
  color: var(--text-secondary);
`

const FactorList = styled.div`
  margin-top: 0.5rem;
  padding-left: 0.25rem;
`

const Factor = styled.div`
  font-size: 0.73rem;
  color: var(--text-secondary);
  line-height: 1.5;
  padding-left: 0.75rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.5em;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--secondary);
  }
`

const TAG_INFO = [
  { key: 'whale', label: 'Top 0.1% by volume' },
  { key: 'smart_money', label: 'High win rate, good timing' },
  { key: 'degen', label: 'High-risk, high-frequency' },
  { key: 'accumulator', label: 'Steadily buying & holding' },
  { key: 'distributor', label: 'Actively selling holdings' },
  { key: 'market_maker', label: 'Two-sided liquidity provider' },
  { key: 'institutional', label: 'Fund-level structured activity' },
]

export default function InfoGuide() {
  const [expanded, setExpanded] = useState(false)

  return (
    <Panel>
      <Header onClick={() => setExpanded(!expanded)}>
        <Title>
          <InfoIcon>?</InfoIcon>
          Guide
        </Title>
        <Arrow>{expanded ? '▲' : '▼'}</Arrow>
      </Header>
      {expanded && (
        <Content>
          <Section>
            <SectionTitle>Wallet Tags</SectionTitle>
            {TAG_INFO.map(({ key, label }) => {
              const style = TAG_COLORS[key] || { bg: 'rgba(255,255,255,0.1)', color: '#fff' }
              return (
                <TagRow key={key}>
                  <TagBadge $bg={style.bg} $color={style.color}>
                    {key.replace(/_/g, ' ')}
                  </TagBadge>
                  <TagDesc>{label}</TagDesc>
                </TagRow>
              )
            })}
          </Section>

          <Section>
            <SectionTitle>Smart Money Score</SectionTitle>
            <ScoreRow>
              <ScoreDot $color="#00d4aa" />
              <ScoreRange $color="#00d4aa">70-100</ScoreRange>
              <ScoreDesc>High — consistently profitable</ScoreDesc>
            </ScoreRow>
            <ScoreRow>
              <ScoreDot $color="#ffd93d" />
              <ScoreRange $color="#ffd93d">40-69</ScoreRange>
              <ScoreDesc>Medium — mixed track record</ScoreDesc>
            </ScoreRow>
            <ScoreRow>
              <ScoreDot $color="#ff6b6b" />
              <ScoreRange $color="#ff6b6b">0-39</ScoreRange>
              <ScoreDesc>Low — poor timing or losses</ScoreDesc>
            </ScoreRow>
            <FactorList>
              <Factor>Win rate & PnL consistency</Factor>
              <Factor>Buy/sell timing accuracy</Factor>
              <Factor>Volume & trade frequency</Factor>
              <Factor>Portfolio diversification</Factor>
            </FactorList>
          </Section>
        </Content>
      )}
    </Panel>
  )
}
