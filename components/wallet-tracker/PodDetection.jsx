'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { shortenAddress, formatUsd, timeAgo } from '@/lib/wallet-tracker'

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

const PodIcon = styled.span`
  font-size: 1.1rem;
`

const Description = styled.p`
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: 1rem;
`

const PodList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const PodItem = styled.div`
  border: 1px solid var(--secondary);
  border-radius: 10px;
  padding: 1rem;
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--primary);
  }
`

const PodTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
`

const TokenAction = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`

const TokenName = styled.span`
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-primary);
`

const ActionBadge = styled.span`
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  background: ${({ $action }) => $action === 'BUY' ? 'rgba(54, 166, 186, 0.15)' : 'rgba(231, 76, 60, 0.15)'};
  color: ${({ $action }) => $action === 'BUY' ? 'var(--buy-color)' : 'var(--sell-color)'};
`

const PodStats = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
`

const Stat = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

const StatValue = styled.span`
  color: var(--text-primary);
  font-weight: 600;
`

const WalletRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
  font-size: 0.8rem;
`

const WalletLink = styled(Link)`
  font-family: monospace;
  color: var(--primary);
  font-size: 0.78rem;

  &:hover {
    color: var(--text-primary);
  }
`

const WalletVol = styled.span`
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin-left: auto;
`

export default function PodDetection() {
  const [pods, setPods] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  const fetchPods = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet-tracker/pods?limit=8')
      const json = await res.json()
      setPods(json.data || [])
    } catch {
      setPods([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPods()
  }, [fetchPods])

  return (
    <Card>
      <Header>
        <PodIcon>🐋</PodIcon>
        <Title>Pod Detection</Title>
      </Header>
      <Description>
        Wallets that traded the same token in the same direction within a 4-hour window.
        Coordinated activity may indicate insider groups or institutional coordination.
      </Description>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Scanning for pods...</p>
      ) : pods.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No coordinated activity detected this week</p>
      ) : (
        <PodList>
          {pods.map((pod, i) => (
            <PodItem key={i}>
              <PodTop>
                <TokenAction>
                  <TokenName>{pod.token}</TokenName>
                  <ActionBadge $action={pod.action}>{pod.action}</ActionBadge>
                </TokenAction>
                <PodStats>
                  <Stat><StatValue>{pod.wallet_count}</StatValue> wallets</Stat>
                  <Stat><StatValue>{formatUsd(pod.total_volume)}</StatValue> total</Stat>
                </PodStats>
              </PodTop>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                {timeAgo(pod.window_start)}
              </div>
              <div
                style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary)' }}
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                {expanded === i ? '▲ Hide wallets' : `▼ Show ${pod.wallet_count} wallets`}
              </div>
              {expanded === i && (
                <div style={{ marginTop: '0.4rem' }}>
                  {pod.wallets.map(w => (
                    <WalletRow key={w.address}>
                      <WalletLink href={`/wallet-tracker/${encodeURIComponent(w.address)}`}>
                        {w.entity_name || shortenAddress(w.address, 4)}
                      </WalletLink>
                      <WalletVol>{formatUsd(w.volume)}</WalletVol>
                    </WalletRow>
                  ))}
                  {pod.wallet_count > 5 && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      +{pod.wallet_count - 5} more wallets
                    </p>
                  )}
                </div>
              )}
            </PodItem>
          ))}
        </PodList>
      )}
    </Card>
  )
}
