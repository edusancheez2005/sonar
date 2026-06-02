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
import SmartMoneyPanel from '@/components/wallet-tracker/SmartMoneyPanel'
import WhaleConsensus from '@/components/wallet-tracker/WhaleConsensus'
import WalletComparison from '@/components/wallet-tracker/WalletComparison'
import BacktestTool from '@/components/wallet-tracker/BacktestTool'
import SonarLoader from '@/components/wallet-tracker/SonarLoader'
import ErrorBoundary from '@/components/wallet-tracker/ErrorBoundary'
import BackToTop from '@/components/BackToTop'
import { ToastProvider } from '@/components/wallet-tracker/Toast'
import { SORT_OPTIONS, CHAINS } from '@/lib/wallet-tracker'

const TAB_TITLES = {
  leaderboard: 'Leaderboard | Whale Tracker | Sonar',
  following: 'Following | Whale Tracker | Sonar',
  pods: 'Pod Detection | Whale Tracker | Sonar',
  'early-movers': 'Early Movers | Whale Tracker | Sonar',
  compare: 'Compare | Whale Tracker | Sonar',
  backtest: 'Backtest | Whale Tracker | Sonar',
  consensus: 'Whale Consensus | Whale Tracker | Sonar',
}

const PageContainer = styled.div`
  padding: 0 0 2rem;
`

const Container = styled.div`
  width: 100%;
  /* Was 1400px — too tight for the 9-col leaderboard + 340px side panel.
     Lets the page breathe when the rail is collapsed (+172px) without
     introducing a horizontal scroll on standard 13"–16" laptops. */
  max-width: 1680px;
  margin: 0 auto;
  padding: 0 1.5rem;

  @media (min-width: 1280px) {
    padding: 0 2rem;
  }
  @media (max-width: 768px) {
    padding: 0 1rem;
  }
`

const SubSectionTitle = styled.h2`
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  font-family: var(--font-mono);
  text-transform: uppercase;
  margin: 1.75rem 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--neon-bright);
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
`

const Controls = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
  flex-wrap: wrap;
`

const Select = styled.select`
  padding: 0.55rem 0.75rem;
  background: rgba(6, 14, 22, 0.6);
  border: 1px solid rgba(34, 211, 238, 0.18);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
  cursor: pointer;
  transition: border-color 160ms ease;

  option {
    background: #060e16;
    color: var(--text-primary);
  }

  &:focus, &:hover {
    border-color: rgba(34, 211, 238, 0.4);
  }
`

const ExportBtn = styled.button`
  padding: 0.55rem 0.9rem;
  background: rgba(6, 14, 22, 0.6);
  border: 1px solid rgba(34, 211, 238, 0.18);
  border-radius: 8px;
  color: var(--neon-bright);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 160ms ease, background 160ms ease;

  &:hover {
    border-color: rgba(34, 211, 238, 0.4);
    background: rgba(34, 211, 238, 0.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const Layout = styled.div`
  display: grid;
  /* Side panel: 300px on mid widths, 340px on very wide. Prevents the
     leaderboard table from getting squeezed below the 9-column threshold
     where horizontal scroll kicks in. */
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 1rem;

  @media (min-width: 1500px) {
    grid-template-columns: minmax(0, 1fr) 340px;
  }
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const MainCard = styled.div`
  background: rgba(6, 14, 22, 0.6);
  border: 1px solid rgba(34, 211, 238, 0.12);
  border-radius: 10px;
  padding: 1rem 1.1rem;
  overflow: hidden;
`

const Tabs = styled.div`
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid rgba(34, 211, 238, 0.12);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;

  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  scrollbar-width: none;
`

const Tab = styled.button`
  padding: 0.6rem 0.9rem;
  background: none;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? 'var(--neon-cyan)' : 'transparent')};
  margin-bottom: -1px;
  color: ${({ $active }) => ($active ? 'var(--neon-bright)' : 'var(--text-secondary)')};
  font-size: 0.88rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  transition: color 160ms ease, border-color 160ms ease;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    color: var(--neon-bright);
  }

  @media (max-width: 768px) {
    padding: 0.55rem 0.8rem;
    font-size: 0.82rem;
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
    document.title = TAB_TITLES[activeTab] || 'Whale Tracker | Sonar'
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
        {/* Page title moved to WalletTrackerHub (SSR) so the hub owns the
            outer header; the wrapper now just renders its own sub-tabs
            (Leaderboard / Following / Pods / etc.) and content. */}
        {/* Cute whale icon archived to components/wallet-tracker/_archive/WhaleIcon.jsx */}
        <SubSectionTitle>
          <span>Whale research tools</span>
          <SonarPulse active />
        </SubSectionTitle>
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

                {/* Smart Money Mirror */}
                <SmartMoneyPanel />
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
