'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styled, { keyframes } from 'styled-components'
import { motion } from 'framer-motion'
import TokenIcon from '@/components/TokenIcon'
import AuthGuard from '@/app/components/AuthGuard'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import SonarLoader from '@/components/wallet-tracker/SonarLoader'
import { FONT_SANS, FONT_MONO } from '@/src/styles/fontStacks'
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
  font-family: ${FONT_MONO}; flex-wrap: wrap;
`

const TitleText = styled.h1`
  font-family: ${FONT_MONO}; font-size: 0.9rem; font-weight: 700;
  color: ${COLORS.cyan}; letter-spacing: 1.5px; text-transform: uppercase; margin: 0;
  &::before { content: '> '; color: ${COLORS.green}; font-weight: 800; }
`

const LiveDot = styled.span`
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.7rem; font-weight: 600; color: ${COLORS.green};
  text-transform: uppercase; letter-spacing: 1px; font-family: ${FONT_MONO};
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
  font-weight: 600; font-family: ${FONT_MONO}; cursor: pointer;
  transition: all 0.15s ease;
  &:hover { border-color: rgba(0, 229, 255, 0.2); color: ${COLORS.textPrimary}; }
`

const Panel = styled.div`
  background: ${COLORS.panelBg}; backdrop-filter: blur(12px);
  border: 1px solid ${COLORS.borderSubtle}; border-radius: 8px;
  padding: 1.5rem; margin-bottom: 1.5rem;
`

const TerminalPrompt = styled.h2`
  font-family: ${FONT_MONO}; font-size: 0.85rem; font-weight: 700;
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
  font-family: ${FONT_SANS}; margin-bottom: 2px;
`

const CoinSymbol = styled.div`
  font-size: 0.75rem; color: ${COLORS.textMuted}; text-transform: uppercase;
  font-family: ${FONT_MONO}; letter-spacing: 0.5px;
`

const Rank = styled.div`
  background: rgba(0, 229, 255, 0.08); color: ${COLORS.cyan};
  padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.7rem;
  font-weight: 700; font-family: ${FONT_MONO};
  border: 1px solid rgba(0, 229, 255, 0.12);
`

const CoinMetrics = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;
`

const Metric = styled.div`display: flex; flex-direction: column; gap: 2px;`

const MetricLabel = styled.div`
  font-size: 0.6rem; color: ${COLORS.textMuted}; text-transform: uppercase;
  letter-spacing: 1.5px; font-family: ${FONT_SANS}; font-weight: 600;
`

const MetricValue = styled.div`
  font-size: 0.9rem; font-weight: 700; color: ${COLORS.textPrimary};
  font-family: ${FONT_MONO};
`

const ChangeValue = styled.div`
  font-size: 0.9rem; font-weight: 700; font-family: ${FONT_MONO};
  color: ${props => props.$positive ? COLORS.green : COLORS.red};
  text-shadow: 0 0 15px ${props => props.$positive ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 23, 68, 0.2)'};
`

const LoadingState = styled.div`
  display: flex; align-items: center; justify-content: center;
  min-height: 400px; color: ${COLORS.textMuted}; font-family: ${FONT_MONO}; font-size: 0.85rem;
`

const ErrorState = styled(LoadingState)`color: ${COLORS.red};`

const WhaleBadge = styled.div`
  display: inline-flex; align-items: center; gap: 0.3rem;
  font-size: 0.65rem; font-weight: 700; font-family: ${FONT_MONO};
  padding: 0.2rem 0.5rem; border-radius: 4px; margin-top: 0.6rem;
  color: ${props => props.$bullish ? COLORS.green : COLORS.red};
  background: ${props => props.$bullish ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 23, 68, 0.08)'};
  border: 1px solid ${props => props.$bullish ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 23, 68, 0.15)'};
  letter-spacing: 0.3px;
`

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export default function TrendingPage() {
  const [trendingData, setTrendingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('24h')
  const [isPremium, setIsPremium] = useState(true) // All features unlocked
  const [whaleData, setWhaleData] = useState({}) // symbol -> whale stats
  // Category social trending (LunarCrush)
  const [activeCategory, setActiveCategory] = useState('defi')
  const [categoryTopics, setCategoryTopics] = useState([])
  const [categoryLoading, setCategoryLoading] = useState(false)

  // X / social-sentiment ranked coins (LunarCrush /coins/list)
  const [sentimentSort, setSentimentSort] = useState('galaxy_score')
  const [sentimentCoins, setSentimentCoins] = useState([])
  const [sentimentLoading, setSentimentLoading] = useState(false)
  const [sentimentStatus, setSentimentStatus] = useState(null) // {status, message?, stale_reason?}
  const [categoryStatus, setCategoryStatus] = useState(null)

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

  // Fetch LunarCrush category topics
  useEffect(() => {
    async function fetchCategory() {
      setCategoryLoading(true)
      try {
        const res = await fetch(`/api/social/category?category=${activeCategory}&limit=20`)
        if (res.ok) {
          const json = await res.json()
          setCategoryTopics(json.topics || [])
          setCategoryStatus({ status: json.status, message: json.message, stale_reason: json.stale_reason })
        }
      } catch (err) {
        console.error('Category fetch error:', err)
        setCategoryStatus({ status: 'upstream_error', message: err?.message || 'fetch failed' })
      } finally {
        setCategoryLoading(false)
      }
    }
    fetchCategory()
  }, [activeCategory])

  // Fetch top coins ranked by social sentiment / galaxy-score / etc.
  useEffect(() => {
    let cancelled = false
    async function fetchSentiment() {
      setSentimentLoading(true)
      try {
        const res = await fetch(`/api/social/trending-coins?sort=${sentimentSort}&limit=20`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          setSentimentCoins(json.coins || [])
          setSentimentStatus({
            status: json.status,
            message: json.message,
            stale_reason: json.stale_reason,
            stale_age_seconds: json.stale_age_seconds,
          })
        }
      } catch (err) {
        console.error('Sentiment fetch error:', err)
        if (!cancelled) {
          setSentimentCoins([])
          setSentimentStatus({ status: 'upstream_error', message: err?.message || 'fetch failed' })
        }
      } finally {
        if (!cancelled) setSentimentLoading(false)
      }
    }
    fetchSentiment()
    return () => { cancelled = true }
  }, [sentimentSort])

  const SOCIAL_CATEGORIES = [
    { key: 'defi', label: 'DeFi' },
    { key: 'memecoins', label: 'Memes' },
    { key: 'layer-1', label: 'L1' },
    { key: 'layer-2', label: 'L2' },
    { key: 'nfts', label: 'NFTs' },
    { key: 'gaming', label: 'Gaming' },
    { key: 'ai', label: 'AI' },
  ]

  const SENTIMENT_SORTS = [
    { key: 'galaxy_score',     label: 'Galaxy Score',  hint: 'Holistic health (price + social + sentiment)' },
    { key: 'alt_rank',         label: 'AltRank',       hint: 'Strongest social momentum vs market cap' },
    { key: 'interactions_24h', label: 'X Activity',    hint: 'Likes + reposts + comments + views (24h)' },
    { key: 'sentiment',        label: 'Bullish %',     hint: '% of social posts that are positive' },
    { key: 'social_dominance', label: 'Mindshare',     hint: '% of crypto-wide social mentions' },
  ]

  const formatInteractions = (n) => {
    if (!n) return '0'
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
    return String(n)
  }

  // Fetch whale activity for trending tokens after trending data loads
  useEffect(() => {
    if (!trendingData) return
    const allCoins = [
      ...(trendingData.trending || []),
      ...(trendingData.top_gainers || []),
      ...(trendingData.top_losers || []),
    ]
    const symbols = [...new Set(allCoins.map(c => c.symbol?.toUpperCase()).filter(Boolean))]
    if (symbols.length === 0) return

    async function fetchWhaleActivity() {
      try {
        const res = await fetch(`/api/wallet-tracker/trending-whales?tokens=${symbols.join(',')}`)
        if (!res.ok) return
        const json = await res.json()
        const map = {}
        for (const item of json.data || []) {
          map[item.token] = item
        }
        setWhaleData(map)
      } catch {}
    }
    fetchWhaleActivity()
  }, [trendingData])

  const getWhaleBadge = (symbol) => {
    const stats = whaleData[(symbol || '').toUpperCase()]
    if (!stats) return null
    const total = stats.buy_count + stats.sell_count
    if (total === 0) return null
    const bullish = stats.buy_count >= stats.sell_count
    const count = bullish ? stats.buy_count : stats.sell_count
    const label = bullish ? `${count} whale${count !== 1 ? 's' : ''} buying` : `${count} whale${count !== 1 ? 's' : ''} selling`
    return <WhaleBadge $bullish={bullish}>{'\uD83D\uDC0B'} {label}</WhaleBadge>
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

          {loading && <SonarLoader text="Loading trending tokens..." size={60} />}
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
                        {getWhaleBadge(coin.symbol)}
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
                          {getWhaleBadge(coin.symbol)}
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
                          {getWhaleBadge(coin.symbol)}
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
                  borderRadius: '8px', fontFamily: FONT_SANS,
                }}>
                  <div style={{ fontSize: '0.8rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
                    Showing top 10 per section. Premium shows all 12+ coins with full data.
                  </div>
                  <a href="/subscribe" style={{
                    display: 'inline-block', padding: '0.4rem 1rem', borderRadius: '4px',
                    background: 'linear-gradient(135deg, #00e5ff, #00b8d4)', color: '#0a0e17',
                    fontFamily: FONT_MONO, fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none',
                    letterSpacing: '0.5px',
                  }}>
                    UPGRADE →
                  </a>
                </div>
              )}

              {/* Trending by X / Social Sentiment (LunarCrush coins/list) */}
              <Panel>
                <TerminalPrompt>X_SENTIMENT_TRENDING</TerminalPrompt>
                <div style={{
                  fontFamily: FONT_MONO, fontSize: '0.65rem', color: COLORS.textMuted,
                  marginTop: '-0.5rem', marginBottom: '0.9rem', letterSpacing: '0.5px',
                }}>
                  Top assets ranked by real-time X / social signals (powered by LunarCrush).
                  {SENTIMENT_SORTS.find(s => s.key === sentimentSort)?.hint && (
                    <span style={{ color: COLORS.cyan }}>
                      {' '}— {SENTIMENT_SORTS.find(s => s.key === sentimentSort)?.hint}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {SENTIMENT_SORTS.map(s => (
                    <FilterButton
                      key={s.key}
                      $active={sentimentSort === s.key}
                      onClick={() => setSentimentSort(s.key)}
                    >
                      {s.label}
                    </FilterButton>
                  ))}
                </div>

                {sentimentLoading && (
                  <div style={{ padding: '2rem', textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.7rem', color: COLORS.textMuted }}>
                    Querying LunarCrush...
                  </div>
                )}

                {!sentimentLoading && sentimentCoins.length > 0 && (
                  <Grid>
                    {sentimentCoins.slice(0, isPremium ? 20 : 10).map((coin, idx) => {
                      const sentColor = coin.sentiment == null
                        ? COLORS.textMuted
                        : coin.sentiment >= 60 ? COLORS.green
                        : coin.sentiment >= 40 ? COLORS.amber
                        : COLORS.red
                      const gsColor = coin.galaxy_score == null
                        ? COLORS.textMuted
                        : coin.galaxy_score >= 60 ? COLORS.green
                        : coin.galaxy_score >= 40 ? COLORS.amber
                        : COLORS.red
                      const change = coin.percent_change_24h
                      return (
                        <Link
                          key={`${coin.symbol}-${idx}`}
                          href={isPremium || idx < 10 ? `/token/${coin.symbol}` : '/subscribe'}
                          style={{
                            textDecoration: 'none',
                            filter: !isPremium && idx >= 10 ? 'blur(5px)' : 'none',
                            pointerEvents: !isPremium && idx >= 10 ? 'none' : 'auto',
                          }}
                        >
                          <CoinCard variants={fadeUp} initial="hidden" animate="visible">
                            <CoinHeader>
                              <TokenIcon symbol={coin.symbol} imageUrl={coin.logo} size={36} />
                              <CoinInfo>
                                <CoinName>{coin.name}</CoinName>
                                <CoinSymbol>{coin.symbol}</CoinSymbol>
                              </CoinInfo>
                              {coin.galaxy_score != null && (
                                <span style={{
                                  fontSize: '0.6rem', fontFamily: FONT_MONO, fontWeight: 700,
                                  color: gsColor, padding: '0.15rem 0.4rem', borderRadius: '3px',
                                  background: 'rgba(0, 229, 255, 0.04)',
                                  border: `1px solid ${COLORS.borderSubtle}`,
                                }}>
                                  GS: {coin.galaxy_score}
                                </span>
                              )}
                            </CoinHeader>
                            <CoinMetrics>
                              <Metric>
                                <MetricLabel>Price</MetricLabel>
                                <MetricValue>{formatPrice(coin.price)}</MetricValue>
                              </Metric>
                              {change != null && (
                                <Metric>
                                  <MetricLabel>24h</MetricLabel>
                                  <ChangeValue $positive={change >= 0}>
                                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                  </ChangeValue>
                                </Metric>
                              )}
                              {coin.sentiment != null && (
                                <Metric>
                                  <MetricLabel>Bullish %</MetricLabel>
                                  <MetricValue style={{ color: sentColor }}>
                                    {coin.sentiment.toFixed(0)}%
                                  </MetricValue>
                                </Metric>
                              )}
                              <Metric>
                                <MetricLabel>X Activity</MetricLabel>
                                <MetricValue>{formatInteractions(coin.interactions_24h)}</MetricValue>
                              </Metric>
                              {coin.alt_rank != null && (
                                <Metric>
                                  <MetricLabel>AltRank</MetricLabel>
                                  <MetricValue>#{coin.alt_rank}</MetricValue>
                                </Metric>
                              )}
                              {coin.social_dominance != null && (
                                <Metric>
                                  <MetricLabel>Mindshare</MetricLabel>
                                  <MetricValue>{coin.social_dominance.toFixed(2)}%</MetricValue>
                                </Metric>
                              )}
                            </CoinMetrics>
                            {getWhaleBadge(coin.symbol)}
                          </CoinCard>
                        </Link>
                      )
                    })}
                  </Grid>
                )}

                {!sentimentLoading && sentimentCoins.length === 0 && (
                  <div style={{ padding: '2rem', textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.7rem', color: COLORS.textMuted, lineHeight: 1.6 }}>
                    {sentimentStatus?.status === 'quota_exhausted' ? (
                      <>
                        <div style={{ color: COLORS.amber, marginBottom: '0.4rem' }}>⚠ LunarCrush daily quota exhausted</div>
                        <div>Resets at 00:00 UTC. Cached results will appear automatically once upstream is healthy again.</div>
                      </>
                    ) : sentimentStatus?.status === 'unconfigured' ? (
                      <div style={{ color: COLORS.amber }}>⚠ LUNARCRUSH_API_KEY not configured on the server.</div>
                    ) : sentimentStatus?.status === 'upstream_error' ? (
                      <>
                        <div style={{ color: COLORS.amber, marginBottom: '0.4rem' }}>⚠ LunarCrush upstream error</div>
                        <div style={{ fontSize: '0.65rem' }}>{sentimentStatus.message}</div>
                      </>
                    ) : (
                      <div>No social-sentiment data right now.</div>
                    )}
                  </div>
                )}

                {!sentimentLoading && sentimentCoins.length > 0 && sentimentStatus?.status === 'stale' && (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 4, background: 'rgba(255, 171, 0, 0.06)', border: `1px solid rgba(255, 171, 0, 0.2)`, fontFamily: FONT_MONO, fontSize: '0.62rem', color: COLORS.amber }}>
                    ⚠ Showing cached data ({Math.round((sentimentStatus.stale_age_seconds || 0) / 60)} min old) — {sentimentStatus.stale_reason}
                  </div>
                )}
              </Panel>

              {/* Social Trending by Category (LunarCrush) */}
              <Panel>
                <TerminalPrompt>SOCIAL_TRENDING</TerminalPrompt>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  {SOCIAL_CATEGORIES.map(cat => (
                    <FilterButton
                      key={cat.key}
                      $active={activeCategory === cat.key}
                      onClick={() => setActiveCategory(cat.key)}
                    >
                      {cat.label}
                    </FilterButton>
                  ))}
                </div>
                {categoryLoading && <div style={{ padding: '2rem', textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.7rem', color: COLORS.textMuted }}>Loading {activeCategory} data...</div>}
                {!categoryLoading && categoryTopics.length > 0 && (
                  <Grid>
                    {categoryTopics.slice(0, isPremium ? 20 : 10).map((topic, idx) => (
                      <Link key={topic.topic} href={`/token/${topic.symbol}`} style={{ textDecoration: 'none' }}>
                        <CoinCard variants={fadeUp} initial="hidden" animate="visible">
                          <CoinHeader>
                            <TokenIcon symbol={topic.symbol} size={36} />
                            <CoinInfo>
                              <CoinName>{topic.title}</CoinName>
                              <CoinSymbol>{topic.symbol}</CoinSymbol>
                            </CoinInfo>
                            {topic.galaxy_score != null && (
                              <span style={{
                                fontSize: '0.6rem', fontFamily: FONT_MONO, fontWeight: 700,
                                color: topic.galaxy_score >= 60 ? COLORS.green : topic.galaxy_score >= 40 ? COLORS.amber : COLORS.red,
                                padding: '0.15rem 0.4rem', borderRadius: '3px',
                                background: 'rgba(0, 229, 255, 0.04)',
                                border: `1px solid ${COLORS.borderSubtle}`,
                              }}>
                                GS: {topic.galaxy_score}
                              </span>
                            )}
                          </CoinHeader>
                          <CoinMetrics>
                            {topic.sentiment != null && (
                              <Metric>
                                <MetricLabel>Sentiment</MetricLabel>
                                <MetricValue style={{ color: topic.sentiment >= 60 ? COLORS.green : topic.sentiment >= 40 ? COLORS.amber : COLORS.red }}>
                                  {topic.sentiment}%
                                </MetricValue>
                              </Metric>
                            )}
                            <Metric>
                              <MetricLabel>24h Activity</MetricLabel>
                              <MetricValue>{formatInteractions(topic.interactions_24h)}</MetricValue>
                            </Metric>
                            {topic.posts_24h > 0 && (
                              <Metric>
                                <MetricLabel>Posts</MetricLabel>
                                <MetricValue>{formatInteractions(topic.posts_24h)}</MetricValue>
                              </Metric>
                            )}
                          </CoinMetrics>
                          {getWhaleBadge(topic.symbol)}
                        </CoinCard>
                      </Link>
                    ))}
                  </Grid>
                )}
                {!categoryLoading && categoryTopics.length === 0 && (
                  <div style={{ padding: '2rem', textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.7rem', color: COLORS.textMuted, lineHeight: 1.6 }}>
                    {categoryStatus?.status === 'quota_exhausted' ? (
                      <>
                        <div style={{ color: COLORS.amber, marginBottom: '0.4rem' }}>⚠ LunarCrush daily quota exhausted</div>
                        <div>Resets at 00:00 UTC.</div>
                      </>
                    ) : categoryStatus?.status === 'upstream_error' ? (
                      <>
                        <div style={{ color: COLORS.amber, marginBottom: '0.4rem' }}>⚠ Upstream error</div>
                        <div style={{ fontSize: '0.65rem' }}>{categoryStatus.message}</div>
                      </>
                    ) : (
                      <div>No data for {activeCategory}</div>
                    )}
                  </div>
                )}
              </Panel>
            </>
          )}
        </Container>
      </PageWrapper>
    </AuthGuard>
  )
}
