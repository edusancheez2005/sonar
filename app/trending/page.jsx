'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styled, { keyframes } from 'styled-components'
import { motion } from 'framer-motion'
import TokenIcon from '@/components/TokenIcon'
import AuthGuard from '@/app/components/AuthGuard'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const MONO_FONT = "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace"
const SANS_FONT = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
const COLORS = {
  cyan: '#00e5ff', green: '#00e676', red: '#ff1744', amber: '#ffab00',
  textPrimary: '#e0e6ed', textMuted: '#5a6a7a',
  panelBg: 'rgba(13, 17, 28, 0.8)', borderSubtle: 'rgba(0, 229, 255, 0.08)',
}

const pulseGlow = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 4px #00e676; }
  50% { opacity: 0.4; box-shadow: 0 0 8px #00e676; }
`

const PageWrapper = styled.div`
  min-height: 100vh;
  background: #0a0e17;
  padding: 2rem;
  position: relative;
  &::before {
    content: '';
    position: fixed; inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 229, 255, 0.008) 2px, rgba(0, 229, 255, 0.008) 4px);
    pointer-events: none; z-index: 0;
  }
`

const Container = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`

const PageTitle = styled.div`
  display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;
  font-family: ${MONO_FONT}; flex-wrap: wrap;
`

const TitleText = styled.h1`
  font-family: ${MONO_FONT}; font-size: 0.9rem; font-weight: 700;
  color: ${COLORS.cyan}; letter-spacing: 1.5px; text-transform: uppercase; margin: 0;
  &::before { content: '> '; color: ${COLORS.green}; font-weight: 800; }
`

const LiveDot = styled.span`
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.7rem; font-weight: 600; color: ${COLORS.green};
  text-transform: uppercase; letter-spacing: 1px; font-family: ${MONO_FONT};
  &::before {
    content: ''; width: 7px; height: 7px; border-radius: 50%;
    background: ${COLORS.green}; animation: ${pulseGlow} 2s ease-in-out infinite;
  }
`

const FiltersBar = styled.div`
  display: flex; gap: 0.4rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center;
`

const FilterButton = styled.button`
  background: ${props => props.$active ? 'rgba(0, 229, 255, 0.15)' : 'transparent'};
  color: ${props => props.$active ? COLORS.cyan : COLORS.textMuted};
  border: 1px solid ${props => props.$active ? 'rgba(0, 229, 255, 0.3)' : COLORS.borderSubtle};
  border-radius: 4px; padding: 0.4rem 0.85rem; font-size: 0.75rem;
  font-weight: 600; font-family: ${MONO_FONT}; cursor: pointer;
  transition: all 0.15s ease;
  &:hover { border-color: rgba(0, 229, 255, 0.2); color: ${COLORS.textPrimary}; }
`

const Panel = styled.div`
  background: ${COLORS.panelBg}; backdrop-filter: blur(12px);
  border: 1px solid ${COLORS.borderSubtle}; border-radius: 8px;
  padding: 1.5rem; margin-bottom: 1.5rem;
`

const TerminalPrompt = styled.h2`
  font-family: ${MONO_FONT}; font-size: 0.85rem; font-weight: 700;
  color: ${COLORS.cyan}; letter-spacing: 1px; text-transform: uppercase;
  margin: 0 0 1.25rem 0; display: flex; align-items: center; gap: 0.5rem;
  &::before { content: '>'; color: ${COLORS.green}; font-weight: 800; }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
`

const CoinCard = styled(motion.div)`
  background: rgba(0, 229, 255, 0.02);
  border: 1px solid ${COLORS.borderSubtle};
  border-radius: 6px; padding: 1.25rem; cursor: pointer;
  transition: all 0.15s ease;
  &:hover { border-color: rgba(0, 229, 255, 0.15); background: rgba(0, 229, 255, 0.04); }
`

const CoinHeader = styled.div`
  display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;
`

const CoinInfo = styled.div`flex: 1;`

const CoinName = styled.div`
  font-size: 0.95rem; font-weight: 700; color: ${COLORS.textPrimary};
  font-family: ${SANS_FONT}; margin-bottom: 2px;
`

const CoinSymbol = styled.div`
  font-size: 0.75rem; color: ${COLORS.textMuted}; text-transform: uppercase;
  font-family: ${MONO_FONT}; letter-spacing: 0.5px;
`

const Rank = styled.div`
  background: rgba(0, 229, 255, 0.08); color: ${COLORS.cyan};
  padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.7rem;
  font-weight: 700; font-family: ${MONO_FONT};
  border: 1px solid rgba(0, 229, 255, 0.12);
`

const CoinMetrics = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;
`

const Metric = styled.div`display: flex; flex-direction: column; gap: 2px;`

const MetricLabel = styled.div`
  font-size: 0.6rem; color: ${COLORS.textMuted}; text-transform: uppercase;
  letter-spacing: 1.5px; font-family: ${SANS_FONT}; font-weight: 600;
`

const MetricValue = styled.div`
  font-size: 0.9rem; font-weight: 700; color: ${COLORS.textPrimary};
  font-family: ${MONO_FONT};
`

const ChangeValue = styled.div`
  font-size: 0.9rem; font-weight: 700; font-family: ${MONO_FONT};
  color: ${props => props.$positive ? COLORS.green : COLORS.red};
  text-shadow: 0 0 15px ${props => props.$positive ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 23, 68, 0.2)'};
`

const LoadingState = styled.div`
  display: flex; align-items: center; justify-content: center;
  min-height: 400px; color: ${COLORS.textMuted}; font-family: ${MONO_FONT}; font-size: 0.85rem;
`

const ErrorState = styled(LoadingState)`color: ${COLORS.red};`

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export default function TrendingPage() {
  const [trendingData, setTrendingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('24h')
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    async function checkPremium() {
      try {
        const sb = supabaseBrowser()
        const { data: { session } } = await sb.auth.getSession()
        if (session?.user) {
          const { data: profile } = await sb.from('profiles').select('plan').eq('id', session.user.id).single()
          setIsPremium(profile?.plan === 'premium' || profile?.plan === 'pro')
        }
      } catch {}
    }
    checkPremium()
  }, [])

  useEffect(() => {
    fetchTrendingData()
  }, [activeFilter])

  const fetchTrendingData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/coingecko/trending?duration=${activeFilter}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch trending data')
      }

      const data = await response.json()
      setTrendingData(data)
    } catch (err) {
      console.error('Trending fetch error:', err)
      setError('Failed to load trending data')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price) => {
    if (price === null || price === undefined) return 'N/A'
    if (price < 0.01) return `$${price.toFixed(6)}`
    if (price < 1) return `$${price.toFixed(4)}`
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatMarketCap = (mc) => {
    if (!mc) return 'N/A'
    if (mc >= 1e9) return `$${(mc / 1e9).toFixed(2)}B`
    if (mc >= 1e6) return `$${(mc / 1e6).toFixed(2)}M`
    if (mc >= 1e3) return `$${(mc / 1e3).toFixed(2)}K`
    return `$${mc.toFixed(2)}`
  }

  return (
    <AuthGuard>
      <PageWrapper>
        <Container>
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <PageTitle>
              <TitleText>TRENDING_COINS</TitleText>
              <LiveDot>LIVE</LiveDot>
            </PageTitle>
          </motion.div>

          <FiltersBar>
            <FilterButton $active={activeFilter === '1h'} onClick={() => setActiveFilter('1h')}>1H</FilterButton>
            <FilterButton $active={activeFilter === '24h'} onClick={() => setActiveFilter('24h')}>24H</FilterButton>
            <FilterButton $active={activeFilter === '7d'} onClick={() => setActiveFilter('7d')}>7D</FilterButton>
            <FilterButton $active={activeFilter === '30d'} onClick={() => setActiveFilter('30d')}>30D</FilterButton>
          </FiltersBar>

          {loading && <LoadingState>Loading trending coins...</LoadingState>}
          {error && <ErrorState>{error}</ErrorState>}

          {!loading && !error && trendingData && (
            <>
              {/* Trending Coins */}
              <Panel>
                <TerminalPrompt>TRENDING_NOW</TerminalPrompt>
                <Grid>
                  {trendingData.trending?.map((coin, idx) => (
                    <Link key={coin.id} href={isPremium || idx < 10 ? `/token/${coin.symbol}` : '/subscribe'} style={{ textDecoration: 'none', filter: !isPremium && idx >= 10 ? 'blur(5px)' : 'none', pointerEvents: !isPremium && idx >= 10 ? 'none' : 'auto', userSelect: !isPremium && idx >= 10 ? 'none' : 'auto' }}>
                      <CoinCard variants={fadeUp} initial="hidden" animate="visible">
                        <CoinHeader>
                          <TokenIcon symbol={coin.symbol} coingeckoId={coin.id} imageUrl={coin.large} size={36} />
                          <CoinInfo>
                            <CoinName>{coin.name}</CoinName>
                            <CoinSymbol>{coin.symbol}</CoinSymbol>
                          </CoinInfo>
                          {coin.market_cap_rank && <Rank>#{coin.market_cap_rank}</Rank>}
                        </CoinHeader>
                        <CoinMetrics>
                          <Metric>
                            <MetricLabel>Score</MetricLabel>
                            <MetricValue>{coin.score != null ? coin.score : 'N/A'}</MetricValue>
                          </Metric>
                        </CoinMetrics>
                      </CoinCard>
                    </Link>
                  ))}
                </Grid>
              </Panel>

              {/* Top Gainers */}
              {trendingData.top_gainers && trendingData.top_gainers.length > 0 && (
                <Panel>
                  <TerminalPrompt style={{ color: COLORS.green }}>TOP_GAINERS</TerminalPrompt>
                  <Grid>
                    {trendingData.top_gainers.slice(0, isPremium ? 12 : 10).map((coin, idx) => (
                      <Link key={coin.id} href={isPremium || idx < 10 ? `/token/${coin.symbol}` : '/subscribe'} style={{ textDecoration: 'none', filter: !isPremium && idx >= 10 ? 'blur(5px)' : 'none', pointerEvents: !isPremium && idx >= 10 ? 'none' : 'auto', userSelect: !isPremium && idx >= 10 ? 'none' : 'auto' }}>
                        <CoinCard variants={fadeUp} initial="hidden" animate="visible">
                          <CoinHeader>
                            <TokenIcon symbol={coin.symbol} coingeckoId={coin.id} imageUrl={coin.image} size={36} />
                            <CoinInfo>
                              <CoinName>{coin.name}</CoinName>
                              <CoinSymbol>{coin.symbol}</CoinSymbol>
                            </CoinInfo>
                            {coin.market_cap_rank && <Rank>#{coin.market_cap_rank}</Rank>}
                          </CoinHeader>
                          <CoinMetrics>
                            <Metric>
                              <MetricLabel>Price</MetricLabel>
                              <MetricValue>{formatPrice(coin.current_price)}</MetricValue>
                            </Metric>
                            <Metric>
                              <MetricLabel>{activeFilter} Change</MetricLabel>
                              <ChangeValue $positive={true}>+{coin.price_change_percentage?.toFixed(2)}%</ChangeValue>
                            </Metric>
                            <Metric>
                              <MetricLabel>Market Cap</MetricLabel>
                              <MetricValue>{formatMarketCap(coin.market_cap)}</MetricValue>
                            </Metric>
                            <Metric>
                              <MetricLabel>24h Volume</MetricLabel>
                              <MetricValue>{formatMarketCap(coin.total_volume)}</MetricValue>
                            </Metric>
                          </CoinMetrics>
                        </CoinCard>
                      </Link>
                    ))}
                  </Grid>
                </Panel>
              )}

              {/* Top Losers */}
              {trendingData.top_losers && trendingData.top_losers.length > 0 && (
                <Panel>
                  <TerminalPrompt style={{ color: COLORS.red }}>TOP_LOSERS</TerminalPrompt>
                  <Grid>
                    {trendingData.top_losers.slice(0, isPremium ? 12 : 10).map((coin, idx) => (
                      <Link key={coin.id} href={isPremium || idx < 10 ? `/token/${coin.symbol}` : '/subscribe'} style={{ textDecoration: 'none', filter: !isPremium && idx >= 10 ? 'blur(5px)' : 'none', pointerEvents: !isPremium && idx >= 10 ? 'none' : 'auto', userSelect: !isPremium && idx >= 10 ? 'none' : 'auto' }}>
                        <CoinCard variants={fadeUp} initial="hidden" animate="visible">
                          <CoinHeader>
                            <TokenIcon symbol={coin.symbol} coingeckoId={coin.id} imageUrl={coin.image} size={36} />
                            <CoinInfo>
                              <CoinName>{coin.name}</CoinName>
                              <CoinSymbol>{coin.symbol}</CoinSymbol>
                            </CoinInfo>
                            {coin.market_cap_rank && <Rank>#{coin.market_cap_rank}</Rank>}
                          </CoinHeader>
                          <CoinMetrics>
                            <Metric>
                              <MetricLabel>Price</MetricLabel>
                              <MetricValue>{formatPrice(coin.current_price)}</MetricValue>
                            </Metric>
                            <Metric>
                              <MetricLabel>{activeFilter} Change</MetricLabel>
                              <ChangeValue $positive={false}>{coin.price_change_percentage?.toFixed(2)}%</ChangeValue>
                            </Metric>
                            <Metric>
                              <MetricLabel>Market Cap</MetricLabel>
                              <MetricValue>{formatMarketCap(coin.market_cap)}</MetricValue>
                            </Metric>
                            <Metric>
                              <MetricLabel>24h Volume</MetricLabel>
                              <MetricValue>{formatMarketCap(coin.total_volume)}</MetricValue>
                            </Metric>
                          </CoinMetrics>
                        </CoinCard>
                      </Link>
                    ))}
                  </Grid>
                </Panel>
              )}

              {!isPremium && (
                <div style={{
                  textAlign: 'center', padding: '1.25rem', marginBottom: '1.5rem',
                  background: COLORS.panelBg, border: `1px solid ${COLORS.borderSubtle}`,
                  borderRadius: '8px', fontFamily: SANS_FONT,
                }}>
                  <div style={{ fontSize: '0.8rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
                    Showing top 10 per section. Premium shows all 12+ coins with full data.
                  </div>
                  <a href="/subscribe" style={{
                    display: 'inline-block', padding: '0.4rem 1rem', borderRadius: '4px',
                    background: 'linear-gradient(135deg, #00e5ff, #00b8d4)', color: '#0a0e17',
                    fontFamily: MONO_FONT, fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none',
                    letterSpacing: '0.5px',
                  }}>
                    UPGRADE →
                  </a>
                </div>
              )}
            </>
          )}
        </Container>
      </PageWrapper>
    </AuthGuard>
  )
}
