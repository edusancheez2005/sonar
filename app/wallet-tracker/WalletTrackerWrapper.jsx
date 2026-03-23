'use client'
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import WalletSearch from '@/components/wallet-tracker/WalletSearch'
import LeaderboardTable from '@/components/wallet-tracker/LeaderboardTable'
import WatchlistPanel from '@/components/wallet-tracker/WatchlistPanel'
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
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
`

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
  grid-template-columns: 1fr 300px;
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
  const [chain, setChain] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort_by: sortBy, limit: '50' })
      if (chain) params.set('chain', chain)
      const res = await fetch(`/api/wallet-tracker?${params}`)
      const json = await res.json()
      setWallets(json.data || [])
    } catch {
      setWallets([])
    } finally {
      setLoading(false)
    }
  }, [sortBy, chain])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  return (
    <PageContainer>
      <Container>
        <PageTitle>Whale Wallet Tracker</PageTitle>
        <TopBar>
          <WalletSearch />
          <Controls>
            <Select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
            <Select value={chain} onChange={e => setChain(e.target.value)}>
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
              <LeaderboardTable data={wallets} sortBy={sortBy} onSortChange={setSortBy} />
            )}
          </MainCard>
          <WatchlistPanel />
        </Layout>
      </Container>
    </PageContainer>
  )
}
