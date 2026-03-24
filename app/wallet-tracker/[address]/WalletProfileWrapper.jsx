'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import WalletProfileHeader from '@/components/wallet-tracker/WalletProfileHeader'
import TransactionHistoryTable from '@/components/wallet-tracker/TransactionHistoryTable'
import CounterpartiesTable from '@/components/wallet-tracker/CounterpartiesTable'
import HoldingsTable from '@/components/wallet-tracker/HoldingsTable'
import WalletFlowGraph from '@/components/wallet-tracker/WalletFlowGraph'
import WatchlistModal from '@/components/wallet-tracker/WatchlistModal'
import AlertModal from '@/components/wallet-tracker/AlertModal'
import SonarLoader from '@/components/wallet-tracker/SonarLoader'
import ErrorBoundary from '@/components/wallet-tracker/ErrorBoundary'
import BackToTop from '@/components/BackToTop'
import { formatUsd, shortenAddress } from '@/lib/wallet-tracker'

const PageContainer = styled.div`
  min-height: 100vh;
  background: var(--background-dark);
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`

const Breadcrumbs = styled.nav`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
`

const BreadcrumbLink = styled(Link)`
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s;

  &:hover {
    color: var(--primary);
  }
`

const BreadcrumbCurrent = styled.span`
  color: var(--text-secondary);
  opacity: 0.7;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
`

const StatCard = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.25rem;
`

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.3rem;
`

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ $color }) => $color || 'var(--text-primary)'};

  @media (max-width: 768px) { font-size: 1.1rem; }
`

const TopTokensCard = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`

const TokenGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
`

const TokenChip = styled.div`
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  background: rgba(54, 166, 186, 0.1);
  color: var(--primary);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

export default function WalletProfileWrapper({ address }) {
  const [profile, setProfile] = useState(null)
  const [counterparties, setCounterparties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWatchlistModal, setShowWatchlistModal] = useState(false)
  const [showAlertModal, setShowAlertModal] = useState(false)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/wallet-tracker/${encodeURIComponent(address)}`)
      const json = await res.json()
      if (json.data) {
        setProfile(json.data)
      } else {
        // Unknown wallet — create a stub profile so the page still renders
        setProfile({ address, unknown: true })
      }
    } catch {
      setProfile({ address, unknown: true })
    } finally {
      setLoading(false)
    }
  }, [address])

  const fetchCounterparties = useCallback(async () => {
    try {
      const res = await fetch(`/api/wallet-tracker/${encodeURIComponent(address)}/counterparties`)
      const json = await res.json()
      setCounterparties(json.data || [])
    } catch {
      setCounterparties([])
    }
  }, [address])

  useEffect(() => {
    fetchProfile()
    fetchCounterparties()
  }, [fetchProfile, fetchCounterparties])

  if (loading) {
    return (
      <PageContainer>
        <Container>
          <SonarLoader text="Scanning wallet..." />
        </Container>
      </PageContainer>
    )
  }

  if (!profile) {
    return (
      <PageContainer>
        <Container>
          <Breadcrumbs>
            <BreadcrumbLink href="/wallet-tracker">Wallet Tracker</BreadcrumbLink>
            <span>&gt;</span>
            <BreadcrumbCurrent>{shortenAddress(address)}</BreadcrumbCurrent>
          </Breadcrumbs>
          <SonarLoader text="Loading..." compact />
        </Container>
      </PageContainer>
    )
  }

  const isUnknown = profile.unknown
  const topTokens = profile.top_tokens || []
  const pnlColor = profile.pnl_estimated_usd > 0 ? '#00d4aa' : profile.pnl_estimated_usd < 0 ? '#ff6b6b' : 'var(--text-primary)'
  const displayName = profile.entity_name || shortenAddress(address)

  return (
    <PageContainer>
      <Container>
        <Breadcrumbs>
          <BreadcrumbLink href="/wallet-tracker">Wallet Tracker</BreadcrumbLink>
          <span>&gt;</span>
          <BreadcrumbCurrent>{displayName}</BreadcrumbCurrent>
        </Breadcrumbs>

        <WalletProfileHeader
          profile={profile}
          onAddToWatchlist={() => setShowWatchlistModal(true)}
          onSetAlert={() => setShowAlertModal(true)}
        />

        {isUnknown ? (
          <div style={{
            background: 'var(--background-card)',
            borderRadius: '12px',
            padding: '2.5rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '0.75rem' }}>
              No tracked data for this wallet yet.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Add it to a watchlist or set an alert to start tracking.
            </p>
          </div>
        ) : (
          <>
            <StatsGrid>
              <StatCard>
                <StatLabel>Portfolio Value</StatLabel>
                <StatValue>{formatUsd(profile.portfolio_value_usd)}</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>Estimated PnL</StatLabel>
                <StatValue $color={pnlColor}>{formatUsd(profile.pnl_estimated_usd)}</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>30d Volume</StatLabel>
                <StatValue>{formatUsd(profile.total_volume_usd_30d)}</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>Transactions</StatLabel>
                <StatValue>{profile.tx_count ?? profile.tx_count_30d ?? '—'}</StatValue>
              </StatCard>
            </StatsGrid>

            {topTokens.length > 0 && (
              <TopTokensCard>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Top Tokens</h3>
                <TokenGrid>
                  {topTokens.map((t, i) => (
                    <TokenChip key={typeof t === 'string' ? t : t.symbol || i}>
                      {typeof t === 'string' ? t : `${t.symbol || '?'} ${t.usd_value ? formatUsd(t.usd_value) : ''}`}
                    </TokenChip>
                  ))}
                </TokenGrid>
              </TopTokensCard>
            )}

            <ErrorBoundary fallbackMessage="Failed to load holdings">
              <HoldingsTable address={address} />
            </ErrorBoundary>

            <ErrorBoundary fallbackMessage="Failed to load wallet flow graph">
              <WalletFlowGraph address={address} counterparties={counterparties} />
            </ErrorBoundary>

            <TwoCol>
              <ErrorBoundary fallbackMessage="Failed to load transaction history">
                <TransactionHistoryTable address={address} chain={profile.chain} />
              </ErrorBoundary>
              <ErrorBoundary fallbackMessage="Failed to load counterparties">
                <CounterpartiesTable data={counterparties} />
              </ErrorBoundary>
            </TwoCol>
          </>
        )}

        {showWatchlistModal && (
          <WatchlistModal
            address={address}
            chain={profile.chain}
            onClose={() => setShowWatchlistModal(false)}
          />
        )}
        {showAlertModal && (
          <AlertModal
            address={address}
            chain={profile.chain}
            onClose={() => setShowAlertModal(false)}
          />
        )}
        <BackToTop />
      </Container>
    </PageContainer>
  )
}
