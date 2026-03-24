'use client'
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { formatUsd } from '@/lib/wallet-tracker'

const Card = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`

const Title = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
`

const TimeSelect = styled.select`
  padding: 0.3rem 0.5rem;
  background: var(--background-dark);
  border: 1px solid var(--secondary);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.75rem;
  outline: none;
`

const Description = styled.p`
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: 1rem;
`

const SmartCount = styled.span`
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  display: block;
`

const TokenList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`

const TokenRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--secondary);
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--primary);
  }
`

const TokenName = styled.span`
  font-weight: 800;
  font-size: 1rem;
  color: var(--text-primary);
  min-width: 55px;
`

const SentimentBadge = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  background: ${({ $sentiment }) =>
    $sentiment === 'accumulating' ? 'rgba(0, 212, 170, 0.15)' :
    $sentiment === 'distributing' ? 'rgba(231, 76, 60, 0.15)' :
    'rgba(255, 217, 61, 0.15)'};
  color: ${({ $sentiment }) =>
    $sentiment === 'accumulating' ? '#00d4aa' :
    $sentiment === 'distributing' ? '#e74c3c' :
    '#ffd93d'};
`

const BarContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 100px;
`

const BarOuter = styled.div`
  height: 8px;
  border-radius: 4px;
  background: rgba(231, 76, 60, 0.25);
  overflow: hidden;
  display: flex;
`

const BuyBar = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #00d4aa, #36a6ba);
  width: ${({ $pct }) => $pct}%;
  border-radius: 4px 0 0 4px;
  transition: width 0.3s;
`

const BarLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
`

const BuyLabel = styled.span`
  color: #00d4aa;
  font-weight: 600;
`

const SellLabel = styled.span`
  color: #e74c3c;
  font-weight: 600;
`

const WalletCount = styled.div`
  text-align: right;
  min-width: 50px;
`

const CountNum = styled.span`
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
`

const CountLabel = styled.div`
  font-size: 0.6rem;
  color: var(--text-secondary);
`

const NetFlow = styled.div`
  text-align: right;
  min-width: 70px;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ $positive }) => $positive ? '#00d4aa' : '#e74c3c'};
`

export default function WhaleConsensus() {
  const [data, setData] = useState([])
  const [smartCount, setSmartCount] = useState(0)
  const [hours, setHours] = useState(24)
  const [loading, setLoading] = useState(true)

  const fetchConsensus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/wallet-tracker/consensus?hours=${hours}`)
      const json = await res.json()
      setData(json.data || [])
      setSmartCount(json.smart_wallet_count || 0)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [hours])

  useEffect(() => {
    fetchConsensus()
  }, [fetchConsensus])

  return (
    <Card>
      <Header>
        <Title>Whale Consensus</Title>
        <TimeSelect value={hours} onChange={e => setHours(Number(e.target.value))}>
          <option value={6}>6h</option>
          <option value={24}>24h</option>
          <option value={72}>3d</option>
          <option value={168}>7d</option>
        </TimeSelect>
      </Header>
      <Description>
        What smart money wallets agree on. Shows buy vs sell pressure per token across {smartCount || '...'} tracked wallets.
      </Description>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Analyzing consensus...</p>
      ) : data.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No consensus data in this period</p>
      ) : (
        <TokenList>
          {data.map(t => (
            <TokenRow key={t.token}>
              <TokenName>{t.token}</TokenName>
              <SentimentBadge $sentiment={t.sentiment}>{t.sentiment}</SentimentBadge>
              <BarContainer>
                <BarOuter>
                  <BuyBar $pct={t.buy_pct} />
                </BarOuter>
                <BarLabels>
                  <BuyLabel>{t.buy_wallets} buying</BuyLabel>
                  <SellLabel>{t.sell_wallets} selling</SellLabel>
                </BarLabels>
              </BarContainer>
              <WalletCount>
                <CountNum>{t.total_wallets}</CountNum>
                <CountLabel>wallets</CountLabel>
              </WalletCount>
              <NetFlow $positive={t.net_flow >= 0}>
                {t.net_flow >= 0 ? '+' : ''}{formatUsd(t.net_flow)}
              </NetFlow>
            </TokenRow>
          ))}
        </TokenList>
      )}
    </Card>
  )
}
