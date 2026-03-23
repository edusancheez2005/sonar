'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import { shortenAddress } from '@/lib/wallet-tracker'

const SearchContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 500px;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--background-card);
  border: 1px solid var(--secondary);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: var(--primary);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`

const Dropdown = styled.ul`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--background-card);
  border: 1px solid var(--secondary);
  border-radius: 8px;
  list-style: none;
  padding: 0.25rem;
  margin: 0;
  z-index: 200;
  max-height: 300px;
  overflow-y: auto;
`

const DropdownItem = styled.li`
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 6px;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`

const AddrText = styled.span`
  font-weight: 600;
  color: var(--text-primary);
  font-family: monospace;
  font-size: 0.9rem;
`

const EntityText = styled.span`
  color: var(--text-secondary);
  font-size: 0.85rem;
`

const ChainBadge = styled.span`
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: rgba(54, 166, 186, 0.15);
  color: var(--primary);
  text-transform: uppercase;
`

export default function WalletSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const timerRef = useRef(null)
  const containerRef = useRef(null)

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/wallet-tracker/search?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      setResults(json.data || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const onChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setShowDropdown(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(val.trim()), 300)
  }

  const onSelect = (address) => {
    setShowDropdown(false)
    setQuery('')
    router.push(`/wallet-tracker/${encodeURIComponent(address)}`)
  }

  const looksLikeAddress = (q) => {
    if (q.startsWith('0x') && q.length >= 10) return true   // EVM
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q)) return true // Solana/base58
    if (q.startsWith('r') && q.length >= 25) return true     // XRP
    if (q.startsWith('bc1') || q.startsWith('1') || q.startsWith('3')) return q.length >= 26 // BTC
    return false
  }

  const onSubmit = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (looksLikeAddress(q)) {
      onSelect(q)
    }
  }

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <SearchContainer ref={containerRef}>
      <form onSubmit={onSubmit}>
        <SearchInput
          placeholder="Search by wallet address or entity name..."
          value={query}
          onChange={onChange}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
        />
      </form>
      {showDropdown && results.length > 0 && (
        <Dropdown>
          {results.map((r) => (
            <DropdownItem key={r.address} onClick={() => onSelect(r.address)}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <AddrText>{shortenAddress(r.address, 8)}</AddrText>
                {r.entity_name && <EntityText>{r.entity_name}</EntityText>}
              </div>
              {r.chain && <ChainBadge>{r.chain}</ChainBadge>}
            </DropdownItem>
          ))}
        </Dropdown>
      )}
      {showDropdown && !loading && results.length === 0 && query.length >= 2 && (
        <Dropdown>
          {looksLikeAddress(query.trim()) ? (
            <DropdownItem onClick={() => onSelect(query.trim())}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <AddrText>{shortenAddress(query.trim(), 8)}</AddrText>
                <EntityText>View this wallet</EntityText>
              </div>
            </DropdownItem>
          ) : (
            <li style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No results found
            </li>
          )}
        </Dropdown>
      )}
    </SearchContainer>
  )
}
