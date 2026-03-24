'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { shortenAddress, formatUsd } from '@/lib/wallet-tracker'
import SonarLoader from './SonarLoader'

const Card = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
`

const Title = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
`

const RadarIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 229, 255, 0.12);
  color: #00e5ff;
  font-size: 0.7rem;
`

const Description = styled.p`
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: 1rem;
`

const MoverList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const MoverItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem;
  border-radius: 8px;
  border: 1px solid var(--secondary);
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--primary);
  }
`

const TokenBadge = styled.div`
  min-width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(54, 166, 186, 0.1);
  flex-shrink: 0;
`

const TokenSym = styled.span`
  font-weight: 800;
  font-size: 0.85rem;
  color: var(--primary);
`

const DaysLabel = styled.span`
  font-size: 0.6rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
`

const MoverInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const MoverTop = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
`

const WalletLink = styled(Link)`
  font-family: monospace;
  font-size: 0.82rem;
  color: var(--primary);

  &:hover {
    color: var(--text-primary);
  }
`

const EntityLabel = styled.span`
  font-size: 0.75rem;
  color: var(--text-secondary);
`

const ScorePill = styled.span`
  font-size: 0.65rem;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  font-weight: 600;
  background: ${({ $score }) => $score >= 0.7 ? 'rgba(0, 212, 170, 0.15)' : $score >= 0.4 ? 'rgba(255, 217, 61, 0.15)' : 'rgba(255,255,255,0.05)'};
  color: ${({ $score }) => $score >= 0.7 ? '#00d4aa' : $score >= 0.4 ? '#ffd93d' : 'var(--text-secondary)'};
`

const MoverMeta = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
`

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 0.2rem;
`

const MetaValue = styled.span`
  color: var(--text-primary);
  font-weight: 600;
`

export default function EarlyMoverRadar() {
  const [movers, setMovers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMovers = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet-tracker/early-movers?limit=10')
      const json = await res.json()
      setMovers(json.data || [])
    } catch {
      setMovers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMovers()
  }, [fetchMovers])

  return (
    <Card>
      <Header>
        <RadarIcon>◉</RadarIcon>
        <Title>Early Mover Radar</Title>
      </Header>
      <Description>
        Wallets that accumulated tokens days before a surge in whale buying activity.
        These wallets may have early access to information or strong conviction.
      </Description>

      {loading ? (
        <SonarLoader text="Scanning for early movers..." size={50} compact />
      ) : movers.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 0' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem' }}>No early movers detected this week</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem' }}>Wallets accumulating before whale surges will appear here</p>
        </div>
      ) : (
        <MoverList>
          {movers.map((m, i) => (
            <MoverItem key={i}>
              <TokenBadge>
                <TokenSym>{m.token}</TokenSym>
                <DaysLabel>{m.days_early}d early</DaysLabel>
              </TokenBadge>
              <MoverInfo>
                <MoverTop>
                  <WalletLink href={`/wallet-tracker/${encodeURIComponent(m.address)}`}>
                    {m.entity_name || shortenAddress(m.address, 4)}
                  </WalletLink>
                  {m.smart_money_score && <ScorePill $score={m.smart_money_score}>{Math.round(m.smart_money_score * 100)}</ScorePill>}
                </MoverTop>
                <MoverMeta>
                  <MetaItem>Invested <MetaValue>{formatUsd(m.total_invested)}</MetaValue></MetaItem>
                  <MetaItem>{m.buy_count} buys</MetaItem>
                  <MetaItem>Token 24h vol: <MetaValue>{formatUsd(m.token_recent_volume)}</MetaValue></MetaItem>
                </MoverMeta>
              </MoverInfo>
            </MoverItem>
          ))}
        </MoverList>
      )}
    </Card>
  )
}
