'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { shortenAddress } from '@/lib/wallet-tracker'

const Panel = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.25rem;
`

const PanelTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const CreateRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`

const Input = styled.input`
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: var(--background-dark);
  border: 1px solid var(--secondary);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;

  &:focus {
    border-color: var(--primary);
  }
`

const SmallBtn = styled.button`
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--primary);
  background: transparent;
  color: var(--primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    background: var(--primary);
    color: #0a1621;
  }
`

const DeleteBtn = styled.button`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--sell-color);
  background: transparent;
  color: var(--sell-color);
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(231, 76, 60, 0.15);
  }
`

const WatchlistItem = styled.div`
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--secondary);

  &:last-child {
    border-bottom: none;
  }
`

const WatchlistHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;

  &:hover {
    color: var(--primary);
  }
`

const WatchlistName = styled.span`
  font-weight: 600;
  font-size: 0.9rem;
`

const Count = styled.span`
  color: var(--text-secondary);
  font-size: 0.8rem;
`

const AddressList = styled.div`
  padding-top: 0.5rem;
  padding-left: 0.5rem;
`

const AddressItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0;
  font-size: 0.8rem;
`

export default function WatchlistPanel() {
  const [watchlists, setWatchlists] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [addresses, setAddresses] = useState({})
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchWatchlists = useCallback(async () => {
    try {
      const res = await fetch('/api/watchlist')
      const json = await res.json()
      setWatchlists(json.data || [])
      if (json.error) console.error('Watchlist fetch error:', json.error)
    } catch (err) {
      console.error('Watchlist fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWatchlists()
  }, [fetchWatchlists])

  const createWatchlist = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`Failed to create watchlist: ${err.error || res.statusText}`)
        return
      }
      setNewName('')
      fetchWatchlists()
    } catch (err) {
      alert(`Failed to create watchlist: ${err.message}`)
    }
  }

  const deleteWatchlist = async (id) => {
    try {
      await fetch(`/api/watchlist/${id}`, { method: 'DELETE' })
      fetchWatchlists()
    } catch {
      // ignore
    }
  }

  const toggleExpand = async (id) => {
    if (expanded === id) {
      setExpanded(null)
      return
    }
    setExpanded(id)
    if (!addresses[id]) {
      try {
        const res = await fetch(`/api/watchlist/${id}/addresses`)
        const json = await res.json()
        setAddresses(prev => ({ ...prev, [id]: json.data || [] }))
      } catch {
        // ignore
      }
    }
  }

  const removeAddress = async (watchlistId, address) => {
    try {
      await fetch(`/api/watchlist/${watchlistId}/addresses/${encodeURIComponent(address)}`, { method: 'DELETE' })
      setAddresses(prev => ({
        ...prev,
        [watchlistId]: (prev[watchlistId] || []).filter(a => a.address !== address),
      }))
      fetchWatchlists()
    } catch {
      // ignore
    }
  }

  return (
    <Panel>
      <PanelTitle>Watchlists</PanelTitle>
      <CreateRow>
        <Input
          placeholder="New watchlist name..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createWatchlist()}
        />
        <SmallBtn onClick={createWatchlist}>Create</SmallBtn>
      </CreateRow>
      {loading && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading...</p>}
      {watchlists.map(wl => (
        <WatchlistItem key={wl.id}>
          <WatchlistHeader onClick={() => toggleExpand(wl.id)}>
            <div>
              <WatchlistName>{wl.name}</WatchlistName>
              <Count> ({wl.address_count})</Count>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {expanded === wl.id ? '▲' : '▼'}
              </span>
              <DeleteBtn onClick={(e) => { e.stopPropagation(); deleteWatchlist(wl.id); }}>
                Remove
              </DeleteBtn>
            </div>
          </WatchlistHeader>
          {expanded === wl.id && (
            <AddressList>
              {(addresses[wl.id] || []).length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No addresses yet</p>
              ) : (
                (addresses[wl.id] || []).map(a => (
                  <AddressItem key={a.address}>
                    <Link href={`/wallet-tracker/${encodeURIComponent(a.address)}`}
                      style={{ fontFamily: 'monospace', color: 'var(--primary)', fontSize: '0.8rem' }}>
                      {a.custom_label || shortenAddress(a.address)}
                    </Link>
                    <DeleteBtn onClick={() => removeAddress(wl.id, a.address)}>×</DeleteBtn>
                  </AddressItem>
                ))
              )}
            </AddressList>
          )}
        </WatchlistItem>
      ))}
      {!loading && watchlists.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No watchlists yet. Create one above.</p>
      )}
    </Panel>
  )
}
