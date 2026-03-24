'use client'
import React, { useState } from 'react'
import styled from 'styled-components'
import TagBadges from './TagBadges'
import SmartMoneyScore from './SmartMoneyScore'
import FollowButton from './FollowButton'
import { shortenAddress } from '@/lib/wallet-tracker'

const Header = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`

const TopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`

const AddressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`

const Address = styled.span`
  font-family: monospace;
  font-size: 1.1rem;
  color: var(--text-primary);
  word-break: break-all;
`

const CopyBtn = styled.button`
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--secondary);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
`

const ChainBadge = styled.span`
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  background: rgba(54, 166, 186, 0.15);
  color: var(--primary);
  text-transform: uppercase;
  font-weight: 600;
`

const EntityName = styled.div`
  font-size: 1rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
`

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
  }
`

const ActionBtn = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--primary);
  background: transparent;
  color: var(--primary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--primary);
    color: #0a1621;
  }
`

export default function WalletProfileHeader({ profile, onAddToWatchlist, onSetAlert }) {
  const [copied, setCopied] = useState(false)

  const copyAddress = () => {
    navigator.clipboard.writeText(profile.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Header>
      <TopRow>
        <div>
          <AddressRow>
            <Address>{shortenAddress(profile.address, 10)}</Address>
            <CopyBtn onClick={copyAddress}>{copied ? 'Copied!' : 'Copy'}</CopyBtn>
            {profile.chain && <ChainBadge>{profile.chain}</ChainBadge>}
            {profile.chains && profile.chains.map(c => <ChainBadge key={c}>{c}</ChainBadge>)}
          </AddressRow>
          {profile.entity_name && <EntityName>{profile.entity_name}</EntityName>}
          <MetaRow>
            {profile.smart_money_score != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Score:</span>
                <SmartMoneyScore score={profile.smart_money_score} />
              </div>
            )}
            <TagBadges tags={profile.tags} />
          </MetaRow>
        </div>
        <Actions>
          <FollowButton address={profile.address} />
          {onAddToWatchlist && (
            <ActionBtn onClick={onAddToWatchlist}>+ Watchlist</ActionBtn>
          )}
          {onSetAlert && (
            <ActionBtn onClick={onSetAlert}>Set Alert</ActionBtn>
          )}
        </Actions>
      </TopRow>
    </Header>
  )
}
