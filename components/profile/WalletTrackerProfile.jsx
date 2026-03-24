'use client'
import React, { useEffect, useState, useCallback } from 'react'
import styled from 'styled-components'
import Link from 'next/link'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { shortenAddress, formatUsd, timeAgo } from '@/lib/wallet-tracker'

/* ------------------------------------------------------------------ */
/*  Auth helper                                                       */
/* ------------------------------------------------------------------ */
async function getAuthHeaders() {
  const sb = supabaseBrowser()
  const { data } = await sb.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/* ------------------------------------------------------------------ */
/*  Styled components                                                 */
/* ------------------------------------------------------------------ */

const Section = styled.section`
  background: var(--background-card, #0d2134);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(54, 166, 186, 0.35);
    box-shadow: 0 4px 24px rgba(54, 166, 186, 0.08);
  }
`

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #fff);
  display: flex;
  align-items: center;
  gap: 0.75rem;

  .count {
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.2rem 0.6rem;
    border-radius: 50px;
    background: rgba(54, 166, 186, 0.15);
    color: var(--primary, #36a6ba);
  }
`

const EmptyState = styled.p`
  margin: 0;
  padding: 1.5rem 0;
  text-align: center;
  color: var(--text-secondary, #a0b2c6);
  font-size: 0.9rem;
`

const LoadingText = styled.p`
  margin: 0;
  color: var(--text-secondary, #a0b2c6);
  font-size: 0.9rem;
`

/* Watchlist items */
const WatchlistItem = styled.div`
  background: var(--secondary, #1e3951);
  border: 1px solid rgba(54, 166, 186, 0.12);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: rgba(54, 166, 186, 0.3);
  }
`

const WatchlistHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-primary, #fff);

  .name {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--text-secondary, #a0b2c6);
    font-size: 0.85rem;
  }

  .chevron {
    transition: transform 0.2s ease;
    color: var(--text-secondary, #a0b2c6);
    &.open { transform: rotate(180deg); }
  }
`

const AddressList = styled.div`
  padding: 0 1rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`

const AddressRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  background: rgba(10, 22, 33, 0.5);
  font-size: 0.85rem;

  .addr {
    color: var(--primary, #36a6ba);
    font-family: monospace;
  }
  .label {
    color: var(--text-secondary, #a0b2c6);
    font-size: 0.8rem;
  }
`

/* Following grid */
const FollowGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
`

const FollowCard = styled.div`
  background: var(--secondary, #1e3951);
  border: 1px solid rgba(54, 166, 186, 0.12);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(54, 166, 186, 0.3);
    transform: translateY(-1px);
  }

  .nickname {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--text-primary, #fff);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .address {
    font-family: monospace;
    font-size: 0.8rem;
    color: var(--primary, #36a6ba);
  }

  .time {
    font-size: 0.75rem;
    color: var(--text-secondary, #a0b2c6);
  }
`

/* Alerts */
const AlertRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--secondary, #1e3951);
  border: 1px solid rgba(54, 166, 186, 0.12);
  border-radius: 10px;
  gap: 1rem;
  flex-wrap: wrap;

  .info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
    flex: 1;
  }

  .addr {
    font-family: monospace;
    font-size: 0.9rem;
    color: var(--primary, #36a6ba);
  }

  .details {
    font-size: 0.8rem;
    color: var(--text-secondary, #a0b2c6);
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .badge {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    background: rgba(54, 166, 186, 0.15);
    color: var(--primary, #36a6ba);
  }
`

const DeleteBtn = styled.button`
  background: rgba(231, 76, 60, 0.12);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: var(--sell-color, #e74c3c);
  border-radius: 8px;
  padding: 0.45rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(231, 76, 60, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

/* Chat cards */
const ChatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
`

const ChatCard = styled.a`
  display: block;
  text-decoration: none;
  background: var(--secondary, #1e3951);
  border: 1px solid rgba(54, 166, 186, 0.12);
  border-radius: 10px;
  padding: 1rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(54, 166, 186, 0.35);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(54, 166, 186, 0.1);
  }

  .title {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--text-primary, #fff);
    margin-bottom: 0.35rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .preview {
    font-size: 0.8rem;
    color: var(--text-secondary, #a0b2c6);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
    margin-bottom: 0.5rem;
  }

  .meta {
    font-size: 0.75rem;
    color: var(--text-secondary, #a0b2c6);
    opacity: 0.7;
    display: flex;
    justify-content: space-between;
  }
`

const FullWidthSection = styled(Section)`
  @media (min-width: 768px) {
    grid-column: 1 / -1;
  }
`

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function WatchlistItemRow({ wl }) {
  const [expanded, setExpanded] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [loaded, setLoaded] = useState(false)

  const loadAddresses = useCallback(async () => {
    if (loaded) return
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/wallet-watchlist/${wl.id}/addresses`, { headers })
      if (res.ok) {
        const { data } = await res.json()
        setAddresses(data || [])
      }
    } catch { /* ignore */ }
    setLoaded(true)
  }, [wl.id, loaded])

  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next) loadAddresses()
  }

  return (
    <WatchlistItem>
      <WatchlistHeader onClick={toggle}>
        <span className="name">{wl.name}</span>
        <span className="meta">
          <span>{wl.address_count} address{wl.address_count !== 1 ? 'es' : ''}</span>
          <svg className={`chevron${expanded ? ' open' : ''}`} width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </WatchlistHeader>
      {expanded && (
        <AddressList>
          {!loaded ? (
            <LoadingText>Loading...</LoadingText>
          ) : addresses.length === 0 ? (
            <EmptyState style={{ padding: '0.5rem 0' }}>No addresses in this watchlist.</EmptyState>
          ) : (
            addresses.map((a) => (
              <AddressRow key={a.id || a.address}>
                <span className="addr">{shortenAddress(a.address)}</span>
                {a.custom_label && <span className="label">{a.custom_label}</span>}
              </AddressRow>
            ))
          )}
        </AddressList>
      )}
    </WatchlistItem>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function WalletTrackerProfile() {
  const [watchlists, setWatchlists] = useState([])
  const [watchlistsLoading, setWatchlistsLoading] = useState(true)

  const [follows, setFollows] = useState([])
  const [followsLoading, setFollowsLoading] = useState(true)

  const [alerts, setAlerts] = useState([])
  const [alertsLoading, setAlertsLoading] = useState(true)

  const [chatSessions, setChatSessions] = useState([])
  const [chatsLoading, setChatsLoading] = useState(true)

  const [deletingId, setDeletingId] = useState(null)

  /* Fetch all data on mount */
  useEffect(() => {
    async function load() {
      const headers = await getAuthHeaders()
      const hasAuth = !!headers.Authorization

      // Watchlists (auth required)
      if (hasAuth) {
        fetch('/api/wallet-watchlist', { headers })
          .then(r => r.ok ? r.json() : null)
          .then(json => { if (json?.data) setWatchlists(json.data) })
          .catch(() => {})
          .finally(() => setWatchlistsLoading(false))
      } else {
        setWatchlistsLoading(false)
      }

      // Following (auth required)
      if (hasAuth) {
        fetch('/api/wallet-tracker/follows', { headers })
          .then(r => r.ok ? r.json() : null)
          .then(data => { if (Array.isArray(data)) setFollows(data) })
          .catch(() => {})
          .finally(() => setFollowsLoading(false))
      } else {
        setFollowsLoading(false)
      }

      // Alerts (no auth needed)
      fetch('/api/alerts')
        .then(r => r.ok ? r.json() : null)
        .then(json => { if (json?.data) setAlerts(json.data) })
        .catch(() => {})
        .finally(() => setAlertsLoading(false))

      // Chat sessions (auth required)
      if (hasAuth) {
        fetch('/api/chat/sessions', { headers })
          .then(r => r.ok ? r.json() : null)
          .then(json => {
            if (json?.sessions) setChatSessions(json.sessions.slice(0, 5))
          })
          .catch(() => {})
          .finally(() => setChatsLoading(false))
      } else {
        setChatsLoading(false)
      }
    }

    load()
  }, [])

  /* Delete alert */
  const deleteAlert = async (id) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAlerts(prev => prev.filter(a => a.id !== id))
      }
    } catch { /* ignore */ }
    setDeletingId(null)
  }

  return (
    <>
      {/* ---- My Watchlists ---- */}
      <Section>
        <SectionTitle>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          My Watchlists
          {!watchlistsLoading && <span className="count">{watchlists.length}</span>}
        </SectionTitle>
        {watchlistsLoading ? (
          <LoadingText>Loading watchlists...</LoadingText>
        ) : watchlists.length === 0 ? (
          <EmptyState>No watchlists yet. Create one from the Wallet Tracker.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {watchlists.map(wl => (
              <WatchlistItemRow key={wl.id} wl={wl} />
            ))}
          </div>
        )}
      </Section>

      {/* ---- Following ---- */}
      <Section>
        <SectionTitle>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Following
          {!followsLoading && <span className="count">{follows.length}</span>}
        </SectionTitle>
        {followsLoading ? (
          <LoadingText>Loading followed wallets...</LoadingText>
        ) : follows.length === 0 ? (
          <EmptyState>You are not following any wallets yet.</EmptyState>
        ) : (
          <FollowGrid>
            {follows.map(f => (
              <FollowCard key={f.address}>
                <span className="nickname">{f.nickname || 'Unnamed'}</span>
                <span className="address">{shortenAddress(f.address)}</span>
                <span className="time">Followed {timeAgo(f.followed_at)}</span>
              </FollowCard>
            ))}
          </FollowGrid>
        )}
      </Section>

      {/* ---- My Alerts ---- */}
      <FullWidthSection>
        <SectionTitle>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          My Alerts
          {!alertsLoading && <span className="count">{alerts.length}</span>}
        </SectionTitle>
        {alertsLoading ? (
          <LoadingText>Loading alerts...</LoadingText>
        ) : alerts.length === 0 ? (
          <EmptyState>No active alerts. Set one up on any wallet page.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {alerts.map(alert => (
              <AlertRow key={alert.id}>
                <div className="info">
                  <span className="addr">{shortenAddress(alert.address, 8)}</span>
                  <div className="details">
                    <span className="badge">{alert.alert_type}</span>
                    {alert.min_usd_value != null && (
                      <span>Min: {formatUsd(alert.min_usd_value)}</span>
                    )}
                    {alert.chain && <span>{alert.chain}</span>}
                  </div>
                </div>
                <DeleteBtn
                  onClick={() => deleteAlert(alert.id)}
                  disabled={deletingId === alert.id}
                >
                  {deletingId === alert.id ? 'Deleting...' : 'Delete'}
                </DeleteBtn>
              </AlertRow>
            ))}
          </div>
        )}
      </FullWidthSection>

      {/* ---- Recent ORCA Chats ---- */}
      <FullWidthSection>
        <SectionTitle>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Recent ORCA Chats
          {!chatsLoading && chatSessions.length > 0 && (
            <span className="count">{chatSessions.length}</span>
          )}
        </SectionTitle>
        {chatsLoading ? (
          <LoadingText>Loading chat history...</LoadingText>
        ) : chatSessions.length === 0 ? (
          <EmptyState>No recent chats. Start a conversation with ORCA!</EmptyState>
        ) : (
          <ChatGrid>
            {chatSessions.map(session => (
              <Link
                key={session.session_id}
                href={`/orca?session=${session.session_id}`}
                style={{ textDecoration: 'none' }}
              >
                <ChatCard as="div">
                  <div className="title">{session.title}</div>
                  <div className="preview">
                    {session.first_message || 'No preview available'}
                  </div>
                  <div className="meta">
                    <span>{session.message_count} msg{session.message_count !== 1 ? 's' : ''}</span>
                    <span>{timeAgo(session.last_activity)}</span>
                  </div>
                </ChatCard>
              </Link>
            ))}
          </ChatGrid>
        )}
      </FullWidthSection>
    </>
  )
}
