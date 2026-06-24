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
import WalletBacktestPanel from '@/components/wallet-tracker/WalletBacktestPanel'
import PolymarketWalletPanel from '@/components/wallet-tracker/PolymarketWalletPanel'
import BackToTop from '@/components/BackToTop'
import { formatUsd, shortenAddress } from '@/lib/wallet-tracker'

const PageContainer = styled.div`
  position: relative;
  min-height: 100vh;
  background:
    radial-gradient(1100px 520px at 12% -8%, rgba(34, 211, 238, 0.10), transparent 60%),
    radial-gradient(900px 480px at 100% 0%, rgba(54, 166, 186, 0.08), transparent 55%),
    var(--background-dark);
  padding: 2rem;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(34, 211, 238, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34, 211, 238, 0.035) 1px, transparent 1px);
    background-size: 44px 44px;
    mask-image: radial-gradient(900px 600px at 50% -5%, #000 0%, transparent 75%);
    -webkit-mask-image: radial-gradient(900px 600px at 50% -5%, #000 0%, transparent 75%);
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }
`

const Container = styled.div`
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
`

const Breadcrumbs = styled.nav`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.75rem;
  font-family: var(--font-mono);
  letter-spacing: 0.4px;
  color: var(--text-secondary);
  margin-bottom: 1.1rem;
`

const BreadcrumbLink = styled(Link)`
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s;

  &:hover {
    color: var(--neon-bright);
  }
`

const BreadcrumbCurrent = styled.span`
  color: var(--neon-bright);
  opacity: 0.85;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 0.9rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.7rem;
  }
`

// Frosted-glass tile shared by stat cards + the top-tokens panel.
const glassPanel = `
  position: relative;
  background:
    linear-gradient(180deg, rgba(13, 33, 52, 0.72) 0%, rgba(8, 16, 25, 0.62) 100%);
  border: 1px solid var(--neon-border);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04);
`

const StatCard = styled.div`
  ${glassPanel}
  padding: 1.1rem 1.15rem;
  overflow: hidden;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, ${({ $accent }) => $accent || 'var(--neon-cyan)'}, transparent);
    opacity: 0.7;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: var(--neon-line);
    box-shadow: 0 16px 38px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(34, 211, 238, 0.12);
  }
`

const StatHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`

const StatLabel = styled.div`
  font-size: 0.68rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.9px;
  color: var(--text-secondary);
`

const StatIcon = styled.div`
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  color: ${({ $accent }) => $accent || 'var(--neon-cyan)'};
  background: ${({ $accent }) => ($accent ? `${$accent}1a` : 'rgba(34, 211, 238, 0.12)')};
  border: 1px solid ${({ $accent }) => ($accent ? `${$accent}33` : 'rgba(34, 211, 238, 0.22)')};

  svg { width: 14px; height: 14px; }
`

const StatValue = styled.div`
  margin-top: 0.55rem;
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: ${({ $color }) => $color || 'var(--text-primary)'};

  @media (max-width: 768px) { font-size: 1.15rem; }
`

const TopTokensCard = styled.div`
  ${glassPanel}
  padding: 1.4rem 1.5rem;
  margin-bottom: 1.5rem;
`

const PanelLabel = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.74rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 1.4px;
  font-weight: 700;
  color: var(--neon-bright);
  margin: 0;

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--neon-cyan);
    box-shadow: 0 0 10px var(--neon-glow);
  }
`

const TokenGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
`

const TokenChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  background: rgba(34, 211, 238, 0.06);
  border: 1px solid var(--neon-border);
  color: var(--neon-bright);
  font-size: 0.83rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;

  &:hover {
    background: rgba(34, 211, 238, 0.12);
    border-color: var(--neon-line);
    transform: translateY(-1px);
  }
`

const TokenDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--neon-cyan);
  flex-shrink: 0;
`

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

// Compact inline icons for the stat tiles (no extra deps).
const STAT_ICONS = {
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
      <path d="M21 12a2 2 0 0 0-2-2h-4a2 2 0 0 0 0 4h4a2 2 0 0 0 2-2Z" />
    </svg>
  ),
  pnl: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  volume: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="20" x2="6" y2="12" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="18" y1="20" x2="18" y2="9" />
    </svg>
  ),
  tx: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  markets: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
    </svg>
  ),
}

const REALIZED_HINT =
  "Realized profit/loss on this wallet's tracked round-trip trades, priced at execution with FIFO cost basis and a 0.3% fee. Sells of inventory acquired before tracking (and tokens we can't price) are excluded — that's why it differs from raw buy/sell flow."

const InfoDot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  margin-left: 0.4rem;
  border-radius: 50%;
  border: 1px solid var(--neon-border);
  color: var(--text-secondary);
  font-size: 9px;
  font-style: normal;
  font-weight: 700;
  line-height: 1;
  cursor: help;
  vertical-align: middle;
`

function StatTile({ label, value, color, accent, icon, hint }) {
  return (
    <StatCard $accent={accent}>
      <StatHead>
        <StatLabel>
          {label}
          {hint ? <InfoDot title={hint}>i</InfoDot> : null}
        </StatLabel>
        {icon ? <StatIcon $accent={accent}>{STAT_ICONS[icon]}</StatIcon> : null}
      </StatHead>
      <StatValue $color={color}>{value}</StatValue>
    </StatCard>
  )
}

export default function WalletProfileWrapper({ address }) {
  const [profile, setProfile] = useState(null)
  const [counterparties, setCounterparties] = useState([])
  const [loading, setLoading] = useState(true)
  const [realizedPnl, setRealizedPnl] = useState(undefined) // undefined = loading
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

  // Compute the honest, price-aware realized PnL out-of-band so it never
  // blocks first paint. Only for tracked EVM wallets (the stored profile's
  // pnl_estimated_usd is the misleading net-flow figure we're replacing).
  useEffect(() => {
    if (!profile || profile.unknown || profile.source === 'polymarket') return
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return
    let cancelled = false
    setRealizedPnl(undefined)
    const chain = profile.chain || 'ethereum'
    fetch(`/api/wallet-tracker/${encodeURIComponent(address)}/realized-pnl?chain=${encodeURIComponent(chain)}`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setRealizedPnl(j) })
      .catch(() => { if (!cancelled) setRealizedPnl(null) })
    return () => { cancelled = true }
  }, [address, profile])

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
            <BreadcrumbLink href="/wallet-tracker">Whale Tracker</BreadcrumbLink>
            <span>&gt;</span>
            <BreadcrumbCurrent>{shortenAddress(address)}</BreadcrumbCurrent>
          </Breadcrumbs>
          <SonarLoader text="Loading..." compact />
        </Container>
      </PageContainer>
    )
  }

  const isUnknown = profile.unknown
  const isPolymarket = profile.source === 'polymarket'
  const isEvm = /^0x[a-fA-F0-9]{40}$/.test(address)
  const topTokens = profile.top_tokens || []
  const pnlColor = profile.pnl_estimated_usd > 0 ? '#00d4aa' : profile.pnl_estimated_usd < 0 ? '#ff6b6b' : 'var(--text-primary)'
  const displayName = profile.entity_name || shortenAddress(address)

  // Realized-PnL tile state (EVM tracked wallets).
  const realizedLoading = realizedPnl === undefined
  const realizedVal = realizedPnl && Number.isFinite(realizedPnl.realized_pnl_usd) ? realizedPnl.realized_pnl_usd : null
  const realizedDisplay = realizedLoading ? '…' : (realizedVal != null ? formatUsd(realizedVal) : '—')
  const realizedColor = realizedLoading
    ? 'var(--text-secondary)'
    : (realizedVal > 0 ? '#00d4aa' : realizedVal < 0 ? '#ff6b6b' : 'var(--text-primary)')
  const realizedAccent = realizedVal != null && realizedVal < 0 ? '#ff6b6b' : '#00d4aa'

  return (
    <PageContainer>
      <Container>
        <Breadcrumbs>
          <BreadcrumbLink href="/wallet-tracker">Whale Tracker</BreadcrumbLink>
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
            position: 'relative',
            background: 'linear-gradient(180deg, rgba(13, 33, 52, 0.72) 0%, rgba(8, 16, 25, 0.62) 100%)',
            border: '1px solid var(--neon-border)',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
            padding: '2.75rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}>
            <p style={{ color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '0.6rem', fontWeight: 600 }}>
              No tracked data for this wallet yet.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Add it to a watchlist or set an alert to start tracking.
            </p>
          </div>
        ) : isPolymarket ? (
          <>
            <StatsGrid>
              <StatTile label="Position Value" value={formatUsd(profile.portfolio_value_usd)} accent="#22d3ee" icon="wallet" />
              <StatTile label="Estimated PnL" value={formatUsd(profile.pnl_estimated_usd)} color={pnlColor} accent={profile.pnl_estimated_usd >= 0 ? '#00d4aa' : '#ff6b6b'} icon="pnl" />
              <StatTile label="Markets" value={profile.polymarket?.markets_count ?? '—'} accent="#9b59b6" icon="markets" />
              <StatTile label="Recent Trades" value={profile.tx_count ?? '—'} accent="#36a6ba" icon="tx" />
            </StatsGrid>

            <ErrorBoundary fallbackMessage="Failed to load Polymarket positions">
              <PolymarketWalletPanel polymarket={profile.polymarket} />
            </ErrorBoundary>
          </>
        ) : (
          <>
            <StatsGrid>
              <StatTile label="Portfolio Value" value={formatUsd(profile.portfolio_value_usd)} accent="#22d3ee" icon="wallet" />
              <StatTile label="Realized PnL" value={realizedDisplay} color={realizedColor} accent={realizedAccent} icon="pnl" hint={REALIZED_HINT} />
              <StatTile label="30d Volume" value={formatUsd(profile.total_volume_usd_30d)} accent="#36a6ba" icon="volume" />
              <StatTile label="Transactions" value={profile.tx_count ?? profile.tx_count_30d ?? '—'} accent="#7af8ff" icon="tx" />
            </StatsGrid>

            {topTokens.length > 0 && (
              <TopTokensCard>
                <PanelLabel>Top Tokens</PanelLabel>
                <TokenGrid>
                  {topTokens.map((t, i) => (
                    <TokenChip key={typeof t === 'string' ? t : t.symbol || i}>
                      <TokenDot />
                      {typeof t === 'string' ? t : `${t.symbol || '?'} ${t.usd_value ? formatUsd(t.usd_value) : ''}`}
                    </TokenChip>
                  ))}
                </TokenGrid>
              </TopTokensCard>
            )}

            {isEvm && (
              <ErrorBoundary fallbackMessage="Failed to load backtest">
                <WalletBacktestPanel address={address} defaultChain="ethereum" autoRun={(profile.tx_count ?? profile.tx_count_30d ?? 0) > 0} />
              </ErrorBoundary>
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
