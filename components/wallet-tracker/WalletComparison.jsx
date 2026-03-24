'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { shortenAddress, formatUsd, timeAgo } from '@/lib/wallet-tracker'
import SmartMoneyScore from './SmartMoneyScore'
import TagBadges from './TagBadges'
import Sparkline from './Sparkline'

async function getAuthHeaders() {
  const sb = supabaseBrowser()
  const { data } = await sb.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

const Container = styled.div``

const SearchRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`

const SearchBox = styled.div`
  flex: 1;
  min-width: 200px;
`

const SearchLabel = styled.label`
  display: block;
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-bottom: 0.3rem;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 0.6rem 0.8rem;
  background: var(--background-card);
  border: 1px solid var(--secondary);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: monospace;
  outline: none;

  &:focus { border-color: var(--primary); }
  &::placeholder { color: var(--text-secondary); opacity: 0.5; }
`

const CompareBtn = styled.button`
  align-self: flex-end;
  padding: 0.6rem 1.5rem;
  background: var(--primary);
  color: #0a1621;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const WalletCard = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid ${({ $color }) => $color || 'var(--secondary)'};
`

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
`

const WalletName = styled(Link)`
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-primary);
  text-decoration: none;
  &:hover { color: var(--primary); }
`

const WalletAddr = styled.div`
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
`

const SideLabel = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  background: ${({ $color }) => $color}22;
  color: ${({ $color }) => $color};
`

const StatsTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
`

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);

  &:last-child { border-bottom: none; }
`

const StatLabel = styled.span`
  font-size: 0.8rem;
  color: var(--text-secondary);
`

const StatValue = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ $color }) => $color || 'var(--text-primary)'};
`

const VsSection = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.25rem;
  margin-top: 1.5rem;
`

const VsTitle = styled.h4`
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
`

const VsBar = styled.div`
  margin-bottom: 0.75rem;
`

const VsBarLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
`

const VsBarOuter = styled.div`
  height: 10px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  display: flex;
`

const VsBarLeft = styled.div`
  height: 100%;
  background: #00e5ff;
  width: ${({ $pct }) => $pct}%;
  transition: width 0.3s;
`

const VsBarRight = styled.div`
  height: 100%;
  background: #ffd93d;
  width: ${({ $pct }) => $pct}%;
  transition: width 0.3s;
`

const TokenOverlap = styled.div`
  margin-top: 1rem;
`

const OverlapTitle = styled.h4`
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 600;
  margin-bottom: 0.5rem;
`

const TokenChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
`

const TokenChip = styled.span`
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $shared }) => $shared ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${({ $shared }) => $shared ? '#00e5ff' : 'var(--text-secondary)'};
`

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  background: var(--background-card);
  border-radius: 12px;
`

const QuickPick = styled.div`
  margin-top: 0.5rem;
`

const QuickSection = styled.div`
  margin-bottom: 0.5rem;
`

const QuickSectionHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0;
  transition: color 0.12s;

  &:hover { color: var(--primary); }
`

const HeartIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="#00e5ff" stroke="#00e5ff" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

const EyeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const Arrow = styled.span`
  font-size: 0.6rem;
  transition: transform 0.15s;
  transform: ${({ $open }) => $open ? 'rotate(180deg)' : 'rotate(0)'};
`

const QuickPickChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  max-height: 80px;
  overflow-y: auto;
  padding-left: 0.2rem;
  margin-top: 0.2rem;
`

const QuickChip = styled.button`
  padding: 0.2rem 0.5rem;
  border-radius: 5px;
  border: 1px solid var(--secondary);
  background: transparent;
  color: var(--primary);
  font-size: 0.7rem;
  font-family: monospace;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;

  &:hover {
    border-color: var(--primary);
    background: rgba(54, 166, 186, 0.08);
  }
`

const QuickChipLabel = styled.span`
  color: var(--text-primary);
  font-family: inherit;
  margin-right: 0.25rem;
`

function QuickPickSection({ setter, followedWallets, watchlistGroups, openWatchlists, toggleWatchlist, side }) {
  const hasAny = followedWallets.length > 0 || watchlistGroups.length > 0
  if (!hasAny) return null

  return (
    <QuickPick>
      {followedWallets.length > 0 && (
        <QuickSection>
          <QuickSectionHeader as="div">
            <HeartIcon />
            <span>Following</span>
          </QuickSectionHeader>
          <QuickPickChips>
            {followedWallets.map(w => (
              <QuickChip key={`${side}-f-${w.address}`} onClick={() => setter(w.address)}>
                {w.label && <QuickChipLabel>{w.label}</QuickChipLabel>}
                {shortenAddress(w.address, 3)}
              </QuickChip>
            ))}
          </QuickPickChips>
        </QuickSection>
      )}
      {watchlistGroups.map(wl => (
        <QuickSection key={wl.id}>
          <QuickSectionHeader onClick={() => toggleWatchlist(wl.id)}>
            <EyeIcon />
            <span>{wl.name}</span>
            <Arrow $open={!!openWatchlists[wl.id]}>▼</Arrow>
          </QuickSectionHeader>
          {openWatchlists[wl.id] && (
            <QuickPickChips>
              {wl.addresses.map(a => (
                <QuickChip key={`${side}-w-${a.address}`} onClick={() => setter(a.address)}>
                  {a.label && <QuickChipLabel>{a.label}</QuickChipLabel>}
                  {shortenAddress(a.address, 3)}
                </QuickChip>
              ))}
            </QuickPickChips>
          )}
        </QuickSection>
      ))}
    </QuickPick>
  )
}

const COLORS = { a: '#00e5ff', b: '#ffd93d' }

export default function WalletComparison() {
  const [addrA, setAddrA] = useState('')
  const [addrB, setAddrB] = useState('')
  const [profileA, setProfileA] = useState(null)
  const [profileB, setProfileB] = useState(null)
  const [holdingsA, setHoldingsA] = useState([])
  const [holdingsB, setHoldingsB] = useState([])
  const [sparkA, setSparkA] = useState(null)
  const [sparkB, setSparkB] = useState(null)
  const [loading, setLoading] = useState(false)
  const [compared, setCompared] = useState(false)
  const [followedWallets, setFollowedWallets] = useState([])
  const [watchlistGroups, setWatchlistGroups] = useState([])
  const [openWatchlists, setOpenWatchlists] = useState({})

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const auth = await getAuthHeaders()
        if (!auth.Authorization) return

        // Followed wallets
        const fRes = await fetch('/api/wallet-tracker/follows', { headers: auth })
        if (fRes.ok) {
          const follows = await fRes.json()
          setFollowedWallets(follows.map(f => ({ address: f.address, label: f.nickname || null })))
        }

        // Watchlists with addresses
        const wlRes = await fetch('/api/wallet-watchlist', { headers: auth })
        if (wlRes.ok) {
          const { data: wls } = await wlRes.json()
          const groups = []
          for (const wl of wls || []) {
            const addrRes = await fetch(`/api/wallet-watchlist/${wl.id}/addresses`, { headers: auth })
            if (addrRes.ok) {
              const { data: addrs } = await addrRes.json()
              if (addrs && addrs.length > 0) {
                groups.push({
                  id: wl.id,
                  name: wl.name,
                  addresses: addrs.map(a => ({ address: a.address, label: a.custom_label || null })),
                })
              }
            }
          }
          setWatchlistGroups(groups)
        }
      } catch {
        // ignore
      }
    }
    fetchSaved()
  }, [])

  const toggleWatchlist = (id) => {
    setOpenWatchlists(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const fetchWallet = async (address) => {
    const [profileRes, holdingsRes, sparkRes] = await Promise.all([
      fetch(`/api/wallet-tracker/${encodeURIComponent(address)}`),
      fetch(`/api/wallet-tracker/${encodeURIComponent(address)}/holdings`),
      fetch(`/api/wallet-tracker/sparklines?addresses=${encodeURIComponent(address)}`),
    ])
    const profile = (await profileRes.json()).data || null
    const holdings = (await holdingsRes.json()).data || []
    const sparkData = await sparkRes.json()
    return { profile, holdings, sparkline: sparkData[address] || null }
  }

  const compare = async () => {
    const a = addrA.trim()
    const b = addrB.trim()
    if (!a || !b) return
    setLoading(true)
    setCompared(false)
    try {
      const [dataA, dataB] = await Promise.all([fetchWallet(a), fetchWallet(b)])
      setProfileA(dataA.profile)
      setProfileB(dataB.profile)
      setHoldingsA(dataA.holdings)
      setHoldingsB(dataB.holdings)
      setSparkA(dataA.sparkline)
      setSparkB(dataB.sparkline)
      setCompared(true)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const renderCard = (profile, holdings, sparkline, color, label) => {
    if (!profile) return <WalletCard $color={color}><p style={{ color: 'var(--text-secondary)' }}>Wallet not found</p></WalletCard>

    const topTokens = (profile.top_tokens || holdings.slice(0, 5)).map(t => typeof t === 'string' ? t : t.symbol)

    return (
      <WalletCard $color={color}>
        <CardHeader>
          <div>
            <WalletName href={`/wallet-tracker/${encodeURIComponent(profile.address)}`}>
              {profile.entity_name || shortenAddress(profile.address, 6)}
            </WalletName>
            <WalletAddr>{shortenAddress(profile.address, 8)}</WalletAddr>
          </div>
          <SideLabel $color={color}>{label}</SideLabel>
        </CardHeader>

        <div style={{ marginBottom: '0.75rem' }}>
          <SmartMoneyScore score={profile.smart_money_score} />
        </div>
        <TagBadges tags={profile.tags} />

        {sparkline && (
          <div style={{ margin: '0.75rem 0' }}>
            <Sparkline data={sparkline} $width={200} $height={30} $color={color} />
          </div>
        )}

        <StatsTable>
          <StatRow>
            <StatLabel>30d Volume</StatLabel>
            <StatValue>{formatUsd(profile.total_volume_usd_30d)}</StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>Portfolio</StatLabel>
            <StatValue>{formatUsd(profile.portfolio_value_usd)}</StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>PnL</StatLabel>
            <StatValue $color={profile.pnl_estimated_usd > 0 ? '#00d4aa' : profile.pnl_estimated_usd < 0 ? '#ff6b6b' : undefined}>
              {formatUsd(profile.pnl_estimated_usd)}
            </StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>Transactions</StatLabel>
            <StatValue>{profile.tx_count_30d ?? profile.tx_count ?? '—'}</StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>Last Active</StatLabel>
            <StatValue>{timeAgo(profile.last_active)}</StatValue>
          </StatRow>
        </StatsTable>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Top tokens:</div>
        <TokenChips>
          {topTokens.map(t => <TokenChip key={t}>{t}</TokenChip>)}
        </TokenChips>
      </WalletCard>
    )
  }

  const renderVsMetrics = () => {
    if (!profileA || !profileB) return null

    const metrics = [
      { label: 'Smart Money Score', a: (profileA.smart_money_score || 0) * 100, b: (profileB.smart_money_score || 0) * 100, fmt: v => Math.round(v) },
      { label: '30d Volume', a: profileA.total_volume_usd_30d || 0, b: profileB.total_volume_usd_30d || 0, fmt: formatUsd },
      { label: 'Transaction Count', a: profileA.tx_count_30d || 0, b: profileB.tx_count_30d || 0, fmt: v => v },
    ]

    // Token overlap
    const tokensA = new Set((profileA.top_tokens || holdingsA.slice(0, 10)).map(t => typeof t === 'string' ? t : t.symbol))
    const tokensB = new Set((profileB.top_tokens || holdingsB.slice(0, 10)).map(t => typeof t === 'string' ? t : t.symbol))
    const shared = [...tokensA].filter(t => tokensB.has(t))
    const onlyA = [...tokensA].filter(t => !tokensB.has(t))
    const onlyB = [...tokensB].filter(t => !tokensA.has(t))

    return (
      <VsSection>
        <VsTitle>Head to Head</VsTitle>
        {metrics.map(m => {
          const total = m.a + m.b || 1
          const pctA = (m.a / total) * 100
          const pctB = (m.b / total) * 100
          return (
            <VsBar key={m.label}>
              <VsBarLabel>
                <span style={{ color: COLORS.a, fontWeight: 600, fontSize: '0.78rem' }}>{m.fmt(m.a)}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{m.label}</span>
                <span style={{ color: COLORS.b, fontWeight: 600, fontSize: '0.78rem' }}>{m.fmt(m.b)}</span>
              </VsBarLabel>
              <VsBarOuter>
                <VsBarLeft $pct={pctA} />
                <VsBarRight $pct={pctB} />
              </VsBarOuter>
            </VsBar>
          )
        })}

        <TokenOverlap>
          <OverlapTitle>Token Overlap</OverlapTitle>
          {shared.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Shared ({shared.length}):</span>
              <TokenChips style={{ marginTop: '0.25rem' }}>
                {shared.map(t => <TokenChip key={t} $shared>{t}</TokenChip>)}
              </TokenChips>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: COLORS.a }}>Only Wallet A ({onlyA.length}):</span>
              <TokenChips style={{ marginTop: '0.25rem' }}>
                {onlyA.map(t => <TokenChip key={t}>{t}</TokenChip>)}
                {onlyA.length === 0 && <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>None</span>}
              </TokenChips>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: COLORS.b }}>Only Wallet B ({onlyB.length}):</span>
              <TokenChips style={{ marginTop: '0.25rem' }}>
                {onlyB.map(t => <TokenChip key={t}>{t}</TokenChip>)}
                {onlyB.length === 0 && <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>None</span>}
              </TokenChips>
            </div>
          </div>
        </TokenOverlap>
      </VsSection>
    )
  }

  return (
    <Container>
      <SearchRow>
        <SearchBox>
          <SearchLabel>Wallet A</SearchLabel>
          <SearchInput
            placeholder="Paste address..."
            value={addrA}
            onChange={e => setAddrA(e.target.value)}
          />
          <QuickPickSection setter={setAddrA} followedWallets={followedWallets} watchlistGroups={watchlistGroups} openWatchlists={openWatchlists} toggleWatchlist={toggleWatchlist} side="a" />
        </SearchBox>
        <SearchBox>
          <SearchLabel>Wallet B</SearchLabel>
          <SearchInput
            placeholder="Paste address..."
            value={addrB}
            onChange={e => setAddrB(e.target.value)}
          />
          <QuickPickSection setter={setAddrB} followedWallets={followedWallets} watchlistGroups={watchlistGroups} openWatchlists={openWatchlists} toggleWatchlist={toggleWatchlist} side="b" />
        </SearchBox>
        <CompareBtn onClick={compare} disabled={loading || !addrA.trim() || !addrB.trim()}>
          {loading ? 'Comparing...' : 'Compare'}
        </CompareBtn>
      </SearchRow>

      {!compared && !loading && (
        <EmptyState>
          Paste two wallet addresses above and click Compare to see a side-by-side breakdown.
        </EmptyState>
      )}

      {compared && (
        <>
          <Grid>
            {renderCard(profileA, holdingsA, sparkA, COLORS.a, 'A')}
            {renderCard(profileB, holdingsB, sparkB, COLORS.b, 'B')}
          </Grid>
          {renderVsMetrics()}
        </>
      )}
    </Container>
  )
}
