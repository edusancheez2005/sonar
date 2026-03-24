'use client'
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import WalletSearch from '@/components/wallet-tracker/WalletSearch'
import LeaderboardTable from '@/components/wallet-tracker/LeaderboardTable'
import WatchlistPanel from '@/components/wallet-tracker/WatchlistPanel'
import CopyTradesFeed from '@/components/wallet-tracker/CopyTradesFeed'
import PodDetection from '@/components/wallet-tracker/PodDetection'
import EarlyMoverRadar from '@/components/wallet-tracker/EarlyMoverRadar'
import FollowingView from '@/components/wallet-tracker/FollowingView'
import SonarPulse from '@/components/wallet-tracker/SonarPulse'
import InfoGuide from '@/components/wallet-tracker/InfoGuide'
import WhaleConsensus from '@/components/wallet-tracker/WhaleConsensus'
import WalletComparison from '@/components/wallet-tracker/WalletComparison'
import BacktestTool from '@/components/wallet-tracker/BacktestTool'
import SonarLoader from '@/components/wallet-tracker/SonarLoader'
import ErrorBoundary from '@/components/wallet-tracker/ErrorBoundary'
import BackToTop from '@/components/BackToTop'
import { ToastProvider } from '@/components/wallet-tracker/Toast'
import { SORT_OPTIONS, CHAINS } from '@/lib/wallet-tracker'

const TAB_TITLES = {
  leaderboard: 'Leaderboard | Wallet Tracker | Sonar',
  following: 'Following | Wallet Tracker | Sonar',
  pods: 'Pod Detection | Wallet Tracker | Sonar',
  'early-movers': 'Early Movers | Wallet Tracker | Sonar',
  compare: 'Compare | Wallet Tracker | Sonar',
  backtest: 'Backtest | Wallet Tracker | Sonar',
  consensus: 'Whale Consensus | Wallet Tracker | Sonar',
}

const PageContainer = styled.div`
  min-height: 100vh;
  background: var(--background-dark);
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
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

const ExportBtn = styled.button`
  padding: 0.5rem 0.75rem;
  background: var(--background-card);
  border: 1px solid var(--secondary);
  border-radius: 6px;
  color: var(--primary);
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover {
    border-color: var(--primary);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

const Tabs = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--secondary);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  scrollbar-width: none;
`

const Tab = styled.button`
  padding: 0.7rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid ${({ $active }) => $active ? 'var(--primary)' : 'transparent'};
  margin-bottom: -2px;
  color: ${({ $active }) => $active ? 'var(--primary)' : 'var(--text-secondary)'};
  font-size: 0.95rem;
  font-weight: ${({ $active }) => $active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    color: var(--primary);
  }

  @media (max-width: 768px) {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
  }
`


export default function WalletTrackerWrapper() {
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [wallets, setWallets] = useState([])
  const [sortBy, setSortBy] = useState('smart_money_score')
  const [sortAsc, setSortAsc] = useState(false)
  const [chain, setChain] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [exporting, setExporting] = useState(false)

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

  useEffect(() => {
    document.title = TAB_TITLES[activeTab] || 'Wallet Tracker | Sonar'
  }, [activeTab])

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

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const allWallets = []
      const perPage = 100
      const maxPages = 10 // up to 1000 wallets

      for (let p = 1; p <= maxPages; p++) {
        const params = new URLSearchParams({ sort_by: sortBy, sort_asc: sortAsc ? '1' : '0', limit: String(perPage), page: String(p) })
        if (chain) params.set('chain', chain)
        const res = await fetch(`/api/wallet-tracker?${params}`)
        const json = await res.json()
        const rows = json.data || []
        allWallets.push(...rows)
        if (rows.length < perPage || allWallets.length >= (json.total || 0)) break
      }

      const escapeCSV = (val) => {
        const str = String(val ?? '')
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      const headers = ['Rank', 'Address', 'Entity Name', 'Chain', 'Score', '30d Volume', 'Portfolio Value', 'PnL', 'Tags', 'Last Active']
      const csvRows = [headers.join(',')]

      allWallets.forEach((w, i) => {
        const tags = Array.isArray(w.tags) ? w.tags.join('; ') : (w.tags || '')
        csvRows.push([
          i + 1,
          escapeCSV(w.address),
          escapeCSV(w.entity_name || ''),
          escapeCSV(w.chain || ''),
          w.smart_money_score ?? '',
          w.total_volume_usd_30d ?? '',
          w.portfolio_value_usd ?? '',
          w.pnl_estimated_usd ?? '',
          escapeCSV(tags),
          escapeCSV(w.last_active || '')
        ].join(','))
      })

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `whale-leaderboard-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // silently fail
    } finally {
      setExporting(false)
    }
  }

  return (
    <ToastProvider>
    <PageContainer>
      <Container>
        <PageTitle><WhaleIcon />Whale Wallet Tracker <SonarPulse active /></PageTitle>
        <Tabs>
          <Tab $active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')}>Leaderboard</Tab>
          <Tab $active={activeTab === 'following'} onClick={() => setActiveTab('following')}>Following</Tab>
          <Tab $active={activeTab === 'pods'} onClick={() => setActiveTab('pods')}>Pod Detection</Tab>
          <Tab $active={activeTab === 'early-movers'} onClick={() => setActiveTab('early-movers')}>Early Movers</Tab>
          <Tab $active={activeTab === 'compare'} onClick={() => setActiveTab('compare')}>Compare</Tab>
          <Tab $active={activeTab === 'backtest'} onClick={() => setActiveTab('backtest')}>Backtest</Tab>
          <Tab $active={activeTab === 'consensus'} onClick={() => setActiveTab('consensus')}>Whale Consensus</Tab>
        </Tabs>

        {activeTab === 'leaderboard' && (
          <>
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
                <ExportBtn onClick={handleExportCSV} disabled={exporting}>
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </ExportBtn>
              </Controls>
            </TopBar>
            <Layout>
              <MainCard>
                {loading ? (
                  <SonarLoader text="Scanning wallets..." compact />
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
                <ErrorBoundary fallbackMessage="Failed to load copy trades feed">
                  <CopyTradesFeed />
                </ErrorBoundary>
                <div style={{ marginTop: '1rem' }}>
                  <ErrorBoundary fallbackMessage="Failed to load watchlists">
                    <WatchlistPanel />
                  </ErrorBoundary>
                </div>
                <InfoGuide />
              </div>
            </Layout>
          </>
        )}

        {activeTab === 'following' && (
          <FollowingView />
        )}

        {activeTab === 'pods' && (
          <ErrorBoundary fallbackMessage="Failed to load pod detection">
            <PodDetection />
          </ErrorBoundary>
        )}

        {activeTab === 'early-movers' && (
          <ErrorBoundary fallbackMessage="Failed to load early mover radar">
            <EarlyMoverRadar />
          </ErrorBoundary>
        )}

        {activeTab === 'compare' && (
          <WalletComparison />
        )}

        {activeTab === 'backtest' && (
          <BacktestTool />
        )}

        {activeTab === 'consensus' && (
          <ErrorBoundary fallbackMessage="Failed to load whale consensus">
            <WhaleConsensus />
          </ErrorBoundary>
        )}
        <BackToTop />
      </Container>
    </PageContainer>
    </ToastProvider>
  )
}
