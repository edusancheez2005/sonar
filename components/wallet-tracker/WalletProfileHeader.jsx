'use client'
import React, { useState } from 'react'
import styled from 'styled-components'
import TagBadges from './TagBadges'
import SmartMoneyScore from './SmartMoneyScore'
import FollowButton from './FollowButton'
import { shortenAddress } from '@/lib/wallet-tracker'

const Header = styled.div`
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(640px 200px at 0% 0%, rgba(34, 211, 238, 0.12), transparent 60%),
    linear-gradient(180deg, rgba(13, 33, 52, 0.78) 0%, rgba(8, 16, 25, 0.66) 100%);
  border: 1px solid var(--neon-border);
  border-radius: 18px;
  padding: 1.6rem 1.75rem;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--neon-glow), transparent);
  }

  @media (max-width: 768px) {
    padding: 1.25rem 1.15rem;
  }
`

const TopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
  flex-wrap: wrap;
`

const Identity = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  min-width: 0;
`

const Avatar = styled.div`
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: ${({ $g }) => $g};
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.35), transparent 55%);
  }

  @media (max-width: 768px) {
    width: 42px;
    height: 42px;
  }
`

const AddressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
`

const Address = styled.span`
  font-family: var(--font-mono);
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: 0.2px;
  color: var(--text-primary);
  word-break: break-all;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`

const CopyBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.28rem 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--neon-border);
  background: rgba(34, 211, 238, 0.05);
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.16s;

  &:hover {
    border-color: var(--neon-line);
    color: var(--neon-bright);
    background: rgba(34, 211, 238, 0.1);
  }
`

const ChainBadge = styled.span`
  font-size: 0.66rem;
  font-family: var(--font-mono);
  padding: 0.22rem 0.5rem;
  border-radius: 6px;
  background: rgba(34, 211, 238, 0.1);
  border: 1px solid var(--neon-border);
  color: var(--neon-bright);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  font-weight: 700;
`

const EntityName = styled.div`
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin-top: 0.45rem;
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.85rem;
  flex-wrap: wrap;
`

const ScorePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.3rem 0.7rem 0.3rem 0.6rem;
  border-radius: 999px;
  background: rgba(8, 16, 25, 0.55);
  border: 1px solid var(--neon-border);

  span.lbl {
    color: var(--text-secondary);
    font-size: 0.72rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }
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
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.95rem;
  border-radius: 10px;
  border: 1px solid var(--neon-border);
  background: rgba(34, 211, 238, 0.06);
  color: var(--neon-bright);
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.16s;

  &:hover {
    background: rgba(34, 211, 238, 0.14);
    border-color: var(--neon-line);
    transform: translateY(-1px);
  }
`

// Deterministic gradient avatar derived from the address — gives each
// wallet a recognizable visual identity without any network call.
function avatarGradient(address = '') {
  let h = 0
  for (let i = 0; i < address.length; i += 1) {
    h = (h * 31 + address.charCodeAt(i)) % 360
  }
  const h2 = (h + 48) % 360
  return `linear-gradient(135deg, hsl(${h} 75% 55%), hsl(${h2} 78% 42%))`
}

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
        <Identity>
          <Avatar $g={avatarGradient(profile.address)} aria-hidden="true" />
          <div style={{ minWidth: 0 }}>
            <AddressRow>
              <Address>{shortenAddress(profile.address, 10)}</Address>
              <CopyBtn onClick={copyAddress}>{copied ? '✓ Copied' : 'Copy'}</CopyBtn>
              {profile.chain && <ChainBadge>{profile.chain}</ChainBadge>}
              {profile.chains && profile.chains.map(c => <ChainBadge key={c}>{c}</ChainBadge>)}
            </AddressRow>
            {profile.entity_name && <EntityName>{profile.entity_name}</EntityName>}
            <MetaRow>
              {profile.smart_money_score != null && (
                <ScorePill>
                  <span className="lbl">Score</span>
                  <SmartMoneyScore score={profile.smart_money_score} />
                </ScorePill>
              )}
              <TagBadges tags={profile.tags} />
            </MetaRow>
          </div>
        </Identity>
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
