'use client'
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import WalletSearch from '@/components/wallet-tracker/WalletSearch'
import LeaderboardTable from '@/components/wallet-tracker/LeaderboardTable'
import WatchlistPanel from '@/components/wallet-tracker/WatchlistPanel'
import CopyTradesFeed from '@/components/wallet-tracker/CopyTradesFeed'
import InfoGuide from '@/components/wallet-tracker/InfoGuide'
import { SORT_OPTIONS, CHAINS } from '@/lib/wallet-tracker'

const PageContainer = styled.div`
  min-height: 100vh;
  background: var(--background-dark);
  padding: 2rem;
`

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`

const PageTitle = styled.h1`
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: linear-gradient(135deg, #00e5ff, #36a6ba, #00d4aa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const WhaleIcon = () => (
  <svg width="30" height="30" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M52 28c0-11-9-20-20-20S12 17 12 28c0 4.5 1.5 8.6 4 12l-4 8h8c3.5 2.5 7.6 4 12 4s8.5-1.5 12-4h8l-4-8c2.5-3.4 4-7.5 4-12z" fill="url(#wg)" />
    <circle cx="24" cy="26" r="3" fill="#0a1621" />
    <circle cx="24.5" cy="25.5" r="1" fill="#fff" />
    <path d="M14 36c4 3 8 4.5 12 4.5" stroke="#0a1621" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    <path d="M48 18c2-4 6-6 10-5-2 3-5 6-10 5z" fill="url(#wg2)" opacity="0.7" />
    <defs>
      <linearGradient id="wg" x1="12" y1="8" x2="52" y2="52">
        <stop stopColor="#00e5ff" />
        <stop offset="1" stopColor="#00d4aa" />
      </linearGradient>
      <linearGradient id="wg2" x1="48" y1="13" x2="58" y2="18">
        <stop stopColor="#00e5ff" />
        <stop offset="1" stopColor="#36a6ba" />
      </linearGradient>
    </defs>
  </svg>
)

const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`

const Controls = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
  flex-wrap: wrap;
`

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  background: var(--background-card);
  border: 1px solid var(--secondary);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;

  &:focus {
    border-color: var(--primary);
  }
`

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1.5rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const MainCard = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.5rem;
  overflow: hidden;
`

export default function WalletTrackerWrapper() {
  const [wallets, setWallets] = useState([])
  const [sortBy, setSortBy] = useState('smart_money_score')
  const [sortAsc, setSortAsc] = useState(false)
  const [chain, setChain] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort_by: sortBy, sort_asc: sortAsc ? '1' : '0', limit: String(limit), page: String(page) })
      if (chain) params.set('chain', chain)
      const res = await fetch(`/api/wallet-tracker?${params}`)
      const json = await res.json()
      setWallets(json.data || [])
      setTotal(json.total || 0)
      setTotalPages(json.total_pages || 1)
    } catch {
      setWallets([])
    } finally {
      setLoading(false)
    }
  }, [sortBy, sortAsc, chain, page, limit])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const handleSortChange = (newSort) => {
    if (newSort === sortBy) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(newSort)
      setSortAsc(false)
    }
    setPage(1)
  }

  const handleChainChange = (newChain) => {
    setChain(newChain)
    setPage(1)
  }

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit)
    setPage(1)
  }

  return (
    <PageContainer>
      <Container>
        <PageTitle><WhaleIcon />Whale Wallet Tracker</PageTitle>
        <TopBar>
          <WalletSearch />
          <Controls>
            <Select value={sortBy} onChange={e => { setSortBy(e.target.value); setSortAsc(false); setPage(1) }}>
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
            <Select value={chain} onChange={e => handleChainChange(e.target.value)}>
              <option value="">All Chains</option>
              {CHAINS.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </Select>
          </Controls>
        </TopBar>
        <Layout>
          <MainCard>
            {loading ? (
              <p style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>Loading leaderboard...</p>
            ) : (
              <LeaderboardTable
                data={wallets}
                sortBy={sortBy}
                sortAsc={sortAsc}
                onSortChange={handleSortChange}
                page={page}
                totalPages={totalPages}
                total={total}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={handleLimitChange}
              />
            )}
          </MainCard>
          <div>
            <CopyTradesFeed />
            <div style={{ marginTop: '1rem' }}><WatchlistPanel /></div>
            <InfoGuide />
          </div>
        </Layout>
      </Container>
    </PageContainer>
  )
}
