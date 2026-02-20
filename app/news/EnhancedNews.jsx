'use client'

import React, { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import TokenIcon from '@/components/TokenIcon'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const colors = {
  bgDark: '#0a1621',
  bgCard: '#0d2134',
  bgCardHover: '#112940',
  primary: '#36a6ba',
  textPrimary: '#ffffff',
  textSecondary: '#a0b2c6',
  textMuted: '#6b7d8f',
  borderLight: 'rgba(54, 166, 186, 0.1)',
  sentimentBull: '#16c784',
  sentimentBear: '#ed4c5c',
  sentimentNeutral: '#a0b2c6',
}

const ECOSYSTEMS = {
  all: { label: 'All', tokens: null },
  ethereum: { label: 'Ethereum', tokens: ['ETH', 'UNI', 'AAVE', 'LINK', 'MKR', 'LDO', 'SNX', 'COMP', 'CRV', 'ENS', 'IMX', 'MATIC', 'ARB', 'OP', 'MANA', 'SAND', 'AXS', 'SHIB', 'PEPE'] },
  bitcoin: { label: 'Bitcoin', tokens: ['BTC', 'WBTC'] },
  solana: { label: 'Solana', tokens: ['SOL', 'JUP', 'RAY', 'BONK', 'WIF', 'PYTH', 'JTO'] },
  bnb: { label: 'BNB Chain', tokens: ['BNB', 'CAKE', 'XVS'] },
  xrp: { label: 'XRP', tokens: ['XRP'] },
  layer1: { label: 'Layer 1s', tokens: ['ADA', 'DOT', 'AVAX', 'ATOM', 'NEAR', 'SUI', 'SEI', 'APT', 'TIA', 'FIL', 'ALGO'] },
  ai: { label: 'AI Tokens', tokens: ['FET', 'RENDER', 'OCEAN', 'TAO', 'AGIX'] },
  defi: { label: 'DeFi', tokens: ['UNI', 'AAVE', 'MKR', 'LDO', 'CRV', 'COMP', 'SNX', 'SUSHI', '1INCH', 'DYDX', 'INJ'] },
  meme: { label: 'Meme', tokens: ['DOGE', 'SHIB', 'PEPE', 'BONK', 'WIF', 'FLOKI', 'ELON'] },
}

// ─── STYLED COMPONENTS ──────────────────────────────────────────────

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
`

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`

const Title = styled.h1`
  font-size: 2.25rem;
  font-weight: 700;
  color: ${colors.textPrimary};
  margin-bottom: 0.5rem;
`

const Subtitle = styled.p`
  font-size: 1rem;
  color: ${colors.textSecondary};
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.6;
  span { color: ${colors.primary}; font-weight: 500; }
`

const FiltersSection = styled.div`
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const FilterRow = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
`

const FilterLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 80px;
`

const Chip = styled.button`
  padding: 0.375rem 0.875rem;
  background: ${p => p.$active ? (p.$color || colors.primary) : 'rgba(54, 166, 186, 0.08)'};
  border: 1px solid ${p => p.$active ? (p.$color || colors.primary) : 'rgba(54, 166, 186, 0.2)'};
  border-radius: 20px;
  color: ${p => p.$active ? '#fff' : colors.textSecondary};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  
  &:hover {
    border-color: ${p => p.$color || colors.primary};
    color: ${colors.textPrimary};
  }
  
  .count { margin-left: 0.35rem; opacity: 0.8; font-size: 0.75rem; }
`

const TokenSearchInput = styled.input`
  padding: 0.375rem 0.875rem;
  background: rgba(30, 57, 81, 0.5);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 20px;
  color: ${colors.textPrimary};
  font-size: 0.8rem;
  width: 160px;
  transition: border-color 0.2s;
  &:focus { outline: none; border-color: ${colors.primary}; }
  &::placeholder { color: ${colors.textMuted}; }
`

const StatsRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`

const StatBadge = styled.div`
  padding: 0.4rem 1rem;
  background: rgba(30, 57, 81, 0.4);
  border: 1px solid rgba(54, 166, 186, 0.15);
  border-radius: 8px;
  font-size: 0.8rem;
  color: ${colors.textSecondary};
  span { color: ${colors.textPrimary}; font-weight: 700; }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 0.875rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const Card = styled(motion.a)`
  display: flex;
  flex-direction: column;
  background: ${colors.bgCard};
  border: 1px solid ${colors.borderLight};
  border-left: 3px solid ${p => p.$neutral ? colors.sentimentNeutral : p.$bullish ? colors.sentimentBull : colors.sentimentBear};
  border-radius: 10px;
  padding: 1rem 1.125rem;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background: ${colors.bgCardHover};
    border-color: ${p => p.$neutral ? 'rgba(160,178,198,0.4)' : p.$bullish ? 'rgba(22,199,132,0.4)' : 'rgba(237,76,92,0.4)'};
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  }
`

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
`

const TokenBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: ${colors.primary};
  background: rgba(54, 166, 186, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
`

const SentimentBadge = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  background: ${p => p.$neutral ? 'rgba(160,178,198,0.12)' : p.$bullish ? 'rgba(22,199,132,0.12)' : 'rgba(237,76,92,0.12)'};
  color: ${p => p.$neutral ? colors.sentimentNeutral : p.$bullish ? colors.sentimentBull : colors.sentimentBear};
  border: 1px solid ${p => p.$neutral ? 'rgba(160,178,198,0.3)' : p.$bullish ? 'rgba(22,199,132,0.3)' : 'rgba(237,76,92,0.3)'};
`

const CardTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${colors.textPrimary};
  line-height: 1.4;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const CardMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
  color: ${colors.textMuted};
  margin-top: auto;
  padding-top: 0.5rem;
`

const ConfidenceBar = styled.div`
  width: 40px;
  height: 3px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
  
  div {
    height: 100%;
    background: ${p => p.$bullish ? colors.sentimentBull : p.$bearish ? colors.sentimentBear : colors.sentimentNeutral};
    border-radius: 2px;
  }
`

const Loading = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${colors.textSecondary};
`

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${colors.textSecondary};
  grid-column: 1 / -1;
`

const ShowMoreBtn = styled.button`
  grid-column: 1 / -1;
  padding: 0.75rem;
  background: rgba(54, 166, 186, 0.1);
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 10px;
  color: ${colors.primary};
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(54, 166, 186, 0.2);
    border-color: ${colors.primary};
  }
`

// ─── COMPONENT ──────────────────────────────────────────────────────

export default function EnhancedNews({ ticker = null }) {
  const [allArticles, setAllArticles] = useState([])
  const [socialPosts, setSocialPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [ecosystemFilter, setEcosystemFilter] = useState('all')
  const [tokenSearch, setTokenSearch] = useState('')
  const [showCount, setShowCount] = useState(30)
  const [activeTab, setActiveTab] = useState('news') // 'news' | 'social'

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = supabaseBrowser()
        
        let query = supabase
          .from('news_items')
          .select('id, title, url, ticker, source, published_at, sentiment_llm, sentiment_raw')
          .order('published_at', { ascending: false })
          .limit(1000)
        
        if (ticker) {
          query = query.eq('ticker', ticker.toUpperCase())
        }
        
        const { data, error } = await query
        if (error) throw error
        
        // Filter out untitled and junk
        const valid = (data || []).filter(a => {
          const title = a.title?.trim()
          if (!title || title.toLowerCase() === 'untitled' || title.length < 15) return false
          return true
        })
        
        setAllArticles(valid)

        // Also fetch social posts
        try {
          const socialRes = await fetch('/api/social/feed?limit=100&sort=interactions')
          const socialJson = await socialRes.json()
          setSocialPosts((socialJson.posts || []).filter(p => p.body && p.body.length > 20))
        } catch {}
      } catch (err) {
        console.error('Error fetching news:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ticker])

  // Apply filters
  const filtered = useMemo(() => {
    let list = allArticles

    // Ecosystem filter
    if (ecosystemFilter !== 'all') {
      const eco = ECOSYSTEMS[ecosystemFilter]
      if (eco?.tokens) {
        const tokenSet = new Set(eco.tokens)
        list = list.filter(a => tokenSet.has((a.ticker || '').toUpperCase()))
      }
    }

    // Token search
    if (tokenSearch.trim()) {
      const q = tokenSearch.toUpperCase().trim()
      list = list.filter(a => (a.ticker || '').toUpperCase().includes(q))
    }

    // Sentiment filter
    if (sentimentFilter !== 'all') {
      list = list.filter(a => {
        const s = a.sentiment_llm || a.sentiment_raw || 0
        if (sentimentFilter === 'bullish') return s > 0.2
        if (sentimentFilter === 'bearish') return s < -0.2
        return s >= -0.2 && s <= 0.2
      })
    }

    return list
  }, [allArticles, ecosystemFilter, tokenSearch, sentimentFilter])

  // Stats
  const stats = useMemo(() => {
    const tickers = new Set(filtered.map(a => a.ticker).filter(Boolean))
    const bullish = filtered.filter(a => (a.sentiment_llm || a.sentiment_raw || 0) > 0.2).length
    const bearish = filtered.filter(a => (a.sentiment_llm || a.sentiment_raw || 0) < -0.2).length
    return { total: filtered.length, tickers: tickers.size, bullish, bearish, neutral: filtered.length - bullish - bearish }
  }, [filtered])

  const formatTimeAgo = (dateString) => {
    const seconds = Math.floor((Date.now() - new Date(dateString)) / 1000)
    if (seconds < 60) return 'Now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  if (loading) return <Container><Loading>Analyzing market sentiment...</Loading></Container>

  return (
    <Container>
      {!ticker && (
        <Header>
          <Title>Crypto Market Intelligence</Title>
          <Subtitle>Real-time news analyzed by <span>ORCA AI</span> for actionable sentiment signals</Subtitle>
        </Header>
      )}

      {/* Tab switcher */}
      {!ticker && (
        <FilterRow style={{ marginBottom: '1rem' }}>
          <Chip $active={activeTab === 'news'} onClick={() => { setActiveTab('news'); setShowCount(30) }}>
            📰 News Articles<span className="count">({allArticles.length})</span>
          </Chip>
          <Chip $active={activeTab === 'social'} onClick={() => { setActiveTab('social'); setShowCount(30) }}>
            🐦 Social Buzz<span className="count">({socialPosts.length})</span>
          </Chip>
        </FilterRow>
      )}

      <FiltersSection>
        <FilterRow>
          <FilterLabel>Ecosystem</FilterLabel>
          {Object.entries(ECOSYSTEMS).map(([key, eco]) => (
            <Chip
              key={key}
              $active={ecosystemFilter === key}
              onClick={() => { setEcosystemFilter(key); setShowCount(30); }}
            >
              {eco.label}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow>
          <FilterLabel>Sentiment</FilterLabel>
          <Chip $active={sentimentFilter === 'all'} onClick={() => setSentimentFilter('all')}>
            All<span className="count">({stats.total})</span>
          </Chip>
          <Chip $active={sentimentFilter === 'bullish'} $color={colors.sentimentBull} onClick={() => setSentimentFilter('bullish')}>
            Bullish<span className="count">({stats.bullish})</span>
          </Chip>
          <Chip $active={sentimentFilter === 'bearish'} $color={colors.sentimentBear} onClick={() => setSentimentFilter('bearish')}>
            Bearish<span className="count">({stats.bearish})</span>
          </Chip>
          <Chip $active={sentimentFilter === 'neutral'} onClick={() => setSentimentFilter('neutral')}>
            Neutral<span className="count">({stats.neutral})</span>
          </Chip>
          <TokenSearchInput
            placeholder="Filter by token..."
            value={tokenSearch}
            onChange={e => { setTokenSearch(e.target.value); setShowCount(30); }}
          />
        </FilterRow>
      </FiltersSection>

      {activeTab === 'news' && (
        <>
          <StatsRow>
            <StatBadge><span>{stats.total}</span> articles</StatBadge>
            <StatBadge><span>{stats.tickers}</span> tokens</StatBadge>
            <StatBadge style={{ color: colors.sentimentBull }}><span>{stats.bullish}</span> bullish</StatBadge>
            <StatBadge style={{ color: colors.sentimentBear }}><span>{stats.bearish}</span> bearish</StatBadge>
          </StatsRow>

          <Grid>
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 && (
                <EmptyState>No news found matching your filters.</EmptyState>
              )}
              {filtered.slice(0, showCount).map((article, i) => {
                const sentiment = article.sentiment_llm || article.sentiment_raw || 0
                const isBullish = sentiment > 0.2
                const isBearish = sentiment < -0.2
                const isNeutral = !isBullish && !isBearish
                const confidence = Math.abs(sentiment * 100)

                return (
                  <Card
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    $bullish={isBullish}
                    $neutral={isNeutral}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.5) }}
                    layout
                  >
                    <CardHeader>
                      {article.ticker && (
                        <TokenBadge>
                          <TokenIcon symbol={article.ticker} size={14} />
                          {article.ticker}
                        </TokenBadge>
                      )}
                      <SentimentBadge $bullish={isBullish} $neutral={isNeutral}>
                        {isBullish ? 'Bullish' : isBearish ? 'Bearish' : 'Neutral'}
                      </SentimentBadge>
                    </CardHeader>
                    
                    <CardTitle>{article.title}</CardTitle>

                    <CardMeta>
                      <span>{article.source ? article.source.replace(/_/g, ' ') : 'News'} · {formatTimeAgo(article.published_at)}</span>
                      <ConfidenceBar $bullish={isBullish} $bearish={isBearish}>
                        <div style={{ width: `${Math.min(100, confidence)}%` }} />
                      </ConfidenceBar>
                    </CardMeta>
                  </Card>
                )
              })}
            </AnimatePresence>
            {filtered.length > showCount && (
              <ShowMoreBtn onClick={() => setShowCount(c => c + 30)}>
                Show more ({filtered.length - showCount} remaining)
              </ShowMoreBtn>
            )}
          </Grid>
        </>
      )}

      {activeTab === 'social' && (
        <Grid>
          <AnimatePresence mode="popLayout">
            {socialPosts.length === 0 && (
              <EmptyState>Social buzz data populates every 4 hours from LunarCrush. Check back soon!</EmptyState>
            )}
            {socialPosts.slice(0, showCount).map((post, i) => {
              const sent = post.sentiment || 0
              const isBullish = sent > 0
              const isNeutral = sent === 0
              const isVip = post.category === 'tracked_creator'

              return (
                <Card
                  key={post.id || post.post_id}
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  $bullish={isBullish}
                  $neutral={isNeutral}
                  style={isVip ? { borderColor: 'rgba(241,196,15,0.3)' } : {}}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.5) }}
                  layout
                >
                  <CardHeader>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {post.creator_image && (
                        <img src={post.creator_image} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                      )}
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>
                        {post.creator_name || post.creator_screen_name || 'Crypto'}
                      </span>
                      {isVip && <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#f1c40f', background: 'rgba(241,196,15,0.15)', padding: '0.05rem 0.3rem', borderRadius: 3 }}>★ VIP</span>}
                    </div>
                    <SentimentBadge $bullish={isBullish} $neutral={isNeutral}>
                      {isBullish ? 'Bullish' : sent < 0 ? 'Bearish' : 'Neutral'}
                    </SentimentBadge>
                  </CardHeader>
                  
                  <CardTitle>{post.body || post.title || ''}</CardTitle>

                  <CardMeta>
                    <span>❤️ {post.likes || 0} · 🔁 {post.retweets || 0} · 💬 {post.replies || 0}</span>
                    <span>{formatTimeAgo(post.published_at)}</span>
                  </CardMeta>
                </Card>
              )
            })}
          </AnimatePresence>
          {socialPosts.length > showCount && (
            <ShowMoreBtn onClick={() => setShowCount(c => c + 30)}>
              Show more ({socialPosts.length - showCount} remaining)
            </ShowMoreBtn>
          )}
        </Grid>
      )}
    </Container>
  )
}
