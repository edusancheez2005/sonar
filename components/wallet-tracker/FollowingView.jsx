'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { shortenAddress, formatUsd, timeAgo } from '@/lib/wallet-tracker'
import SonarLoader from './SonarLoader'
import Sparkline from './Sparkline'
import SmartMoneyScore from './SmartMoneyScore'
import TagBadges from './TagBadges'
import FollowButton from './FollowButton'

async function getAuthHeaders() {
  const sb = supabaseBrowser()
  const { data } = await sb.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

const Container = styled.div``

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`

const WalletCard = styled.div`
  background: var(--background-card);
  border: 1px solid var(--secondary);
  border-radius: 12px;
  padding: 1rem;
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--primary);
  }
`

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.6rem;
`

const CardIdentity = styled.div`
  flex: 1;
  min-width: 0;
`

const WalletName = styled(Link)`
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary);
  display: block;
  text-decoration: none;

  &:hover {
    color: var(--primary);
  }
`

const WalletAddr = styled.span`
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--text-secondary);
`

const CardSparkline = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
`

const SparkLabel = styled.span`
  font-size: 0.7rem;
  color: var(--text-secondary);
`

const NicknameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.15rem;
`

const NicknameInput = styled.input`
  background: transparent;
  border: none;
  border-bottom: 1px dashed var(--secondary);
  color: var(--text-secondary);
  font-size: 0.75rem;
  padding: 0.1rem 0;
  outline: none;
  width: 140px;

  &:focus {
    border-bottom-color: var(--primary);
    color: var(--text-primary);
  }

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.5;
  }
`

const NicknameSaved = styled.span`
  font-size: 0.65rem;
  color: #00d4aa;
  opacity: ${({ $show }) => $show ? 1 : 0};
  transition: opacity 0.3s;
`

const EditNickBtn = styled.button`
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.65rem;
  cursor: pointer;
  padding: 0;
  margin-left: 0.4rem;
  opacity: 0.6;

  &:hover {
    opacity: 1;
  }
`

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
`

const MetaChip = styled.span`
  font-size: 0.72rem;
  color: var(--text-secondary);
`

const MetaValue = styled.span`
  color: var(--text-primary);
  font-weight: 600;
`

const LastTrade = styled.div`
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--secondary);
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`

const TradeAction = styled.span`
  font-weight: 700;
  font-size: 0.72rem;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  background: ${({ $action }) => $action === 'BUY' ? 'rgba(54, 166, 186, 0.15)' : 'rgba(231, 76, 60, 0.15)'};
  color: ${({ $action }) => $action === 'BUY' ? 'var(--buy-color)' : 'var(--sell-color)'};
`

const FeedCard = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.25rem;
`

const FeedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 500px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: var(--secondary); border-radius: 2px; }
`

const FeedItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem;
  border-radius: 6px;

  &:hover { background: rgba(255, 255, 255, 0.02); }
`

const FeedAction = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 700;
  background: ${({ $type }) => $type === 'BUY' ? 'rgba(54, 166, 186, 0.15)' : 'rgba(231, 76, 60, 0.15)'};
  color: ${({ $type }) => $type === 'BUY' ? 'var(--buy-color)' : 'var(--sell-color)'};
`

const FeedInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const FeedTop = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  flex-wrap: wrap;
`

const FeedWallet = styled(Link)`
  font-family: monospace;
  font-size: 0.78rem;
  color: var(--primary);
  &:hover { color: var(--text-primary); }
`

const FeedToken = styled.span`
  font-weight: 700;
  color: var(--text-primary);
`

const FeedValue = styled.span`
  font-weight: 600;
  color: ${({ $type }) => $type === 'BUY' ? 'var(--buy-color)' : 'var(--sell-color)'};
`

const FeedTime = styled.span`
  font-size: 0.7rem;
  color: var(--text-secondary);
`

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
`

const EmptyTitle = styled.p`
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
`

const EmptyDesc = styled.p`
  font-size: 0.85rem;
`

export default function FollowingView() {
  const [wallets, setWallets] = useState([])
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [nicknames, setNicknames] = useState({})
  const [savedIndicator, setSavedIndicator] = useState({})
  const [editingNickname, setEditingNickname] = useState({})
  const nicknameTimers = React.useRef({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const auth = await getAuthHeaders()
      if (!auth.Authorization) {
        setAuthed(false)
        setLoading(false)
        return
      }
      setAuthed(true)
      const res = await fetch('/api/wallet-tracker/follows/feed?limit=30', { headers: auth })
      if (!res.ok) {
        setLoading(false)
        return
      }
      const json = await res.json()
      setWallets(json.wallets || [])
      setFeed(json.feed || [])
      const nicks = {}
      for (const w of json.wallets || []) {
        if (w.nickname) nicks[w.address] = w.nickname
      }
      setNicknames(prev => ({ ...prev, ...nicks }))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleNicknameChange = (address, value) => {
    setNicknames(prev => ({ ...prev, [address]: value }))
    clearTimeout(nicknameTimers.current[address])
    nicknameTimers.current[address] = setTimeout(async () => {
      const auth = await getAuthHeaders()
      if (!auth.Authorization) return
      await fetch(`/api/wallet-tracker/follows/${encodeURIComponent(address)}`, {
        method: 'PATCH',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: value || null }),
      })
      setSavedIndicator(prev => ({ ...prev, [address]: true }))
      setTimeout(() => setSavedIndicator(prev => ({ ...prev, [address]: false })), 1500)
    }, 800)
  }

  if (loading) {
    return <SonarLoader text="Loading following..." compact />
  }

  if (!authed) {
    return (
      <EmptyState>
        <EmptyTitle>Sign in to follow wallets</EmptyTitle>
        <EmptyDesc>Follow whale wallets to track their activity in a personalized feed.</EmptyDesc>
      </EmptyState>
    )
  }

  if (wallets.length === 0) {
    return (
      <EmptyState>
        <EmptyTitle>No followed wallets yet</EmptyTitle>
        <EmptyDesc>Click the heart icon on any wallet profile to start following. Their activity will appear here.</EmptyDesc>
      </EmptyState>
    )
  }

  return (
    <Container>
      <SectionTitle>Following ({wallets.length})</SectionTitle>
      <CardsGrid>
        {wallets.map(w => (
          <WalletCard key={w.address}>
            <CardTop>
              <CardIdentity>
                {nicknames[w.address] ? (
                  <>
                    <WalletName href={`/wallet-tracker/${encodeURIComponent(w.address)}`}>
                      {nicknames[w.address]}
                    </WalletName>
                    <WalletAddr>
                      {w.entity_name ? `${w.entity_name} · ` : ''}{shortenAddress(w.address, 6)}
                      <EditNickBtn onClick={(e) => { e.preventDefault(); setEditingNickname(prev => ({ ...prev, [w.address]: true })) }}>edit</EditNickBtn>
                    </WalletAddr>
                    {editingNickname[w.address] && (
                      <NicknameRow>
                        <NicknameInput
                          autoFocus
                          value={nicknames[w.address] || ''}
                          onChange={e => handleNicknameChange(w.address, e.target.value)}
                          onBlur={() => setEditingNickname(prev => ({ ...prev, [w.address]: false }))}
                          onKeyDown={e => e.key === 'Enter' && setEditingNickname(prev => ({ ...prev, [w.address]: false }))}
                        />
                        <NicknameSaved $show={!!savedIndicator[w.address]}>saved</NicknameSaved>
                      </NicknameRow>
                    )}
                  </>
                ) : (
                  <>
                    <WalletName href={`/wallet-tracker/${encodeURIComponent(w.address)}`}>
                      {w.entity_name || shortenAddress(w.address, 6)}
                    </WalletName>
                    {w.entity_name && <WalletAddr>{shortenAddress(w.address, 6)}</WalletAddr>}
                    <NicknameRow>
                      <NicknameInput
                        placeholder="+ Add nickname"
                        value=""
                        onChange={e => handleNicknameChange(w.address, e.target.value)}
                      />
                      <NicknameSaved $show={!!savedIndicator[w.address]}>saved</NicknameSaved>
                    </NicknameRow>
                  </>
                )}
              </CardIdentity>
              <FollowButton address={w.address} onToggle={fetchData} />
            </CardTop>

            <CardSparkline>
              <SparkLabel>7d</SparkLabel>
              <Sparkline data={w.sparkline} $width={120} $height={24} />
            </CardSparkline>

            <CardMeta>
              {w.smart_money_score != null && <SmartMoneyScore score={w.smart_money_score} />}
              {w.total_volume_usd_30d != null && (
                <MetaChip>Vol: <MetaValue>{formatUsd(w.total_volume_usd_30d)}</MetaValue></MetaChip>
              )}
              {w.last_active && <MetaChip>{timeAgo(w.last_active)}</MetaChip>}
            </CardMeta>

            <TagBadges tags={w.tags} />

            {w.last_trade && (
              <LastTrade>
                <TradeAction $action={w.last_trade.action}>{w.last_trade.action}</TradeAction>
                <FeedToken>{w.last_trade.token}</FeedToken>
                <span style={{ color: 'var(--text-secondary)' }}>{formatUsd(w.last_trade.usd_value)}</span>
                <FeedTime>{timeAgo(w.last_trade.timestamp)}</FeedTime>
              </LastTrade>
            )}
          </WalletCard>
        ))}
      </CardsGrid>

      <FeedCard>
        <SectionTitle>Activity Feed</SectionTitle>
        {feed.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No recent activity from followed wallets</p>
        ) : (
          <FeedList>
            {feed.map((tx, i) => {
              const type = (tx.classification || '').toUpperCase()
              return (
                <FeedItem key={tx.transaction_hash || i}>
                  <FeedAction $type={type}>{type === 'BUY' ? 'B' : 'S'}</FeedAction>
                  <FeedInfo>
                    <FeedTop>
                      <FeedWallet href={`/wallet-tracker/${encodeURIComponent(tx.whale_address)}`}>
                        {tx.entity_name || shortenAddress(tx.whale_address, 4)}
                      </FeedWallet>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        {type === 'BUY' ? 'bought' : 'sold'}
                      </span>
                      <FeedToken>{tx.token_symbol}</FeedToken>
                      <FeedValue $type={type}>{formatUsd(tx.usd_value)}</FeedValue>
                    </FeedTop>
                    <FeedTime>{timeAgo(tx.timestamp)} · {tx.blockchain}</FeedTime>
                  </FeedInfo>
                </FeedItem>
              )
            })}
          </FeedList>
        )}
      </FeedCard>
    </Container>
  )
}
