'use client'
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import WalletProfileHeader from '@/components/wallet-tracker/WalletProfileHeader'
import TransactionHistoryTable from '@/components/wallet-tracker/TransactionHistoryTable'
import CounterpartiesTable from '@/components/wallet-tracker/CounterpartiesTable'
import WatchlistModal from '@/components/wallet-tracker/WatchlistModal'
import AlertModal from '@/components/wallet-tracker/AlertModal'
import { formatUsd } from '@/lib/wallet-tracker'

const PageContainer = styled.div`
  min-height: 100vh;
  background: var(--background-dark);
  padding: 2rem;
`

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`

const BackLink = styled.a`
  display: inline-block;
  color: var(--primary);
  font-size: 0.9rem;
  margin-bottom: 1rem;
  cursor: pointer;

  &:hover {
    color: var(--text-primary);
  }
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
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
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '4rem' }}>Loading wallet profile...</p>
        </Container>
      </PageContainer>
    )
  }

  if (!profile) {
    return (
      <PageContainer>
        <Container>
          <BackLink href="/wallet-tracker">&larr; Back to Tracker</BackLink>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '4rem' }}>Loading...</p>
        </Container>
      </PageContainer>
    )
  }

  const isUnknown = profile.unknown
  const topTokens = profile.top_tokens || []
  const pnlColor = profile.pnl_estimated_usd > 0 ? '#00d4aa' : profile.pnl_estimated_usd < 0 ? '#ff6b6b' : 'var(--text-primary)'

  return (
    <PageContainer>
      <Container>
        <BackLink href="/wallet-tracker">&larr; Back to Tracker</BackLink>

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

            <TwoCol>
              <TransactionHistoryTable address={address} chain={profile.chain} />
              <CounterpartiesTable data={counterparties} />
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
      </Container>
    </PageContainer>
  )
}
