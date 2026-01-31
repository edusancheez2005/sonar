'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import TokenIcon from '@/components/TokenIcon'
import AuthGuard from '@/app/components/AuthGuard'

const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1621 0%, #0f1922 50%, #0a1621 100%);
  padding: 2rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(54, 166, 186, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(46, 204, 113, 0.06) 0%, transparent 50%);
    pointer-events: none;
  }
`

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`

const Header = styled.div`
  margin-bottom: 2rem;
`

const Title = styled.h1`
  font-size: 3rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`

const Subtitle = styled.p`
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin: 0;
`

const FiltersBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  align-items: center;
`

const FilterButton = styled.button<{ $active: boolean }>`
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid ${props => props.$active ? '#667eea' : 'rgba(255, 255, 255, 0.2)'};
  background: ${props => props.$active ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$active ? '#667eea' : 'rgba(255, 255, 255, 0.8)'};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(102, 126, 234, 0.15);
    border-color: #667eea;
  }
`

const FilterLabel = styled.span`
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
`

const SectionTitle = styled.h2`
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0 0 1.5rem 0;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 12px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`

const CoinCard = styled(motion.div)`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-4px);
    border-color: var(--primary);
    box-shadow: 0 12px 40px rgba(54, 166, 186, 0.3);
  }
`

const CoinHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1rem;
`

const CoinInfo = styled.div`
  flex: 1;
`

const CoinName = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
`

const CoinSymbol = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-transform: uppercase;
`

const Rank = styled.div`
  background: rgba(102, 126, 234, 0.2);
  color: #667eea;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
`

const CoinMetrics = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const Metric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const MetricLabel = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const MetricValue = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
`

const ChangeValue = styled.div<{ $positive: boolean }>`
  font-size: 1rem;
  font-weight: 700;
  color: ${props => props.$positive ? '#2ecc71' : '#e74c3c'};
`

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: var(--text-secondary);
  font-size: 1.1rem;
`

const ErrorState = styled(LoadingState)`
  color: #ef4444;
`

export default function TrendingPage() {
  const [trendingData, setTrendingData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('24h')

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

  const formatPrice = (price: number) => {
    if (price === null || price === undefined) return 'N/A'
    if (price < 0.01) return `$${price.toFixed(6)}`
    if (price < 1) return `$${price.toFixed(4)}`
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatMarketCap = (mc: number) => {
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
          <Header>
            <Title>Trending Coins</Title>
            <Subtitle>Discover what's hot in crypto right now</Subtitle>
          </Header>

          <FiltersBar>
            <FilterLabel>Timeframe:</FilterLabel>
            <FilterButton $active={activeFilter === '1h'} onClick={() => setActiveFilter('1h')}>
              1 Hour
            </FilterButton>
            <FilterButton $active={activeFilter === '24h'} onClick={() => setActiveFilter('24h')}>
              24 Hours
            </FilterButton>
            <FilterButton $active={activeFilter === '7d'} onClick={() => setActiveFilter('7d')}>
              7 Days
            </FilterButton>
            <FilterButton $active={activeFilter === '30d'} onClick={() => setActiveFilter('30d')}>
              30 Days
            </FilterButton>
          </FiltersBar>

          {loading && <LoadingState>Loading trending coins...</LoadingState>}
          {error && <ErrorState>{error}</ErrorState>}

          {!loading && !error && trendingData && (
            <>
              {/* Trending Coins */}
              <SectionTitle>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                </svg>
                Trending Now
              </SectionTitle>
              <Grid>
                {trendingData.trending?.map((coin: any) => (
                  <Link 
                    key={coin.id} 
                    href={`/token/${coin.symbol}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <CoinCard
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CoinHeader>
                        <TokenIcon 
                          symbol={coin.symbol}
                          coingeckoId={coin.id}
                          imageUrl={coin.large}
                          size={48}
                        />
                        <CoinInfo>
                          <CoinName>{coin.name}</CoinName>
                          <CoinSymbol>{coin.symbol}</CoinSymbol>
                        </CoinInfo>
                        {coin.market_cap_rank && (
                          <Rank>#{coin.market_cap_rank}</Rank>
                        )}
                      </CoinHeader>
                      <CoinMetrics>
                        <Metric>
                          <MetricLabel>Score</MetricLabel>
                          <MetricValue>{coin.score || 'N/A'}</MetricValue>
                        </Metric>
                      </CoinMetrics>
                    </CoinCard>
                  </Link>
                ))}
              </Grid>

              {/* Top Gainers */}
              {trendingData.top_gainers && trendingData.top_gainers.length > 0 && (
                <>
                  <SectionTitle>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" fill="#2ecc71"/>
                    </svg>
                    <span style={{ color: '#2ecc71' }}>Top Gainers</span>
                  </SectionTitle>
                  <Grid>
                    {trendingData.top_gainers.slice(0, 12).map((coin: any) => (
                      <Link 
                        key={coin.id} 
                        href={`/token/${coin.symbol}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <CoinCard
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <CoinHeader>
                            <TokenIcon 
                              symbol={coin.symbol}
                              coingeckoId={coin.id}
                              imageUrl={coin.image}
                              size={48}
                            />
                            <CoinInfo>
                              <CoinName>{coin.name}</CoinName>
                              <CoinSymbol>{coin.symbol}</CoinSymbol>
                            </CoinInfo>
                            {coin.market_cap_rank && (
                              <Rank>#{coin.market_cap_rank}</Rank>
                            )}
                          </CoinHeader>
                          <CoinMetrics>
                            <Metric>
                              <MetricLabel>Price</MetricLabel>
                              <MetricValue>{formatPrice(coin.current_price)}</MetricValue>
                            </Metric>
                            <Metric>
                              <MetricLabel>{activeFilter} Change</MetricLabel>
                              <ChangeValue $positive={true}>
                                +{coin.price_change_percentage?.toFixed(2)}%
                              </ChangeValue>
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
                </>
              )}

              {/* Top Losers */}
              {trendingData.top_losers && trendingData.top_losers.length > 0 && (
                <>
                  <SectionTitle>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z" fill="#e74c3c"/>
                    </svg>
                    <span style={{ color: '#e74c3c' }}>Top Losers</span>
                  </SectionTitle>
                  <Grid>
                    {trendingData.top_losers.slice(0, 12).map((coin: any) => (
                      <Link 
                        key={coin.id} 
                        href={`/token/${coin.symbol}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <CoinCard
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <CoinHeader>
                            <TokenIcon 
                              symbol={coin.symbol}
                              coingeckoId={coin.id}
                              imageUrl={coin.image}
                              size={48}
                            />
                            <CoinInfo>
                              <CoinName>{coin.name}</CoinName>
                              <CoinSymbol>{coin.symbol}</CoinSymbol>
                            </CoinInfo>
                            {coin.market_cap_rank && (
                              <Rank>#{coin.market_cap_rank}</Rank>
                            )}
                          </CoinHeader>
                          <CoinMetrics>
                            <Metric>
                              <MetricLabel>Price</MetricLabel>
                              <MetricValue>{formatPrice(coin.current_price)}</MetricValue>
                            </Metric>
                            <Metric>
                              <MetricLabel>{activeFilter} Change</MetricLabel>
                              <ChangeValue $positive={false}>
                                {coin.price_change_percentage?.toFixed(2)}%
                              </ChangeValue>
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
                </>
              )}
            </>
          )}
        </Container>
      </PageWrapper>
    </AuthGuard>
  )
}
