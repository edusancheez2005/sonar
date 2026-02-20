'use client'

import React, { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const c = {
  bg: '#0a1621', card: '#0d2134', cardHover: '#112940', primary: '#36a6ba',
  text: '#ffffff', textSec: '#a0b2c6', textMuted: '#6b7d8f',
  border: 'rgba(54,166,186,0.1)', bull: '#16c784', bear: '#ed4c5c', neutral: '#a0b2c6',
  gold: '#f1c40f',
}

// ─── STYLED COMPONENTS ──────────────────────────────────────────

const Container = styled.div`max-width:1400px;margin:0 auto;padding:2rem;`

const Header = styled.div`text-align:center;margin-bottom:2rem;`
const Title = styled.h1`font-size:2.25rem;font-weight:700;color:${c.text};margin-bottom:0.5rem;`
const Sub = styled.p`font-size:1rem;color:${c.textSec};max-width:550px;margin:0 auto;line-height:1.6;span{color:${c.primary};font-weight:600;}`

// AI Summaries
const SummaryRow = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-bottom:2rem;`
const SummaryCard = styled(motion.div)`
  background:linear-gradient(135deg,${c.card} 0%,rgba(54,166,186,0.08) 100%);
  border:1px solid rgba(54,166,186,0.2);border-radius:14px;padding:1.25rem;position:relative;overflow:hidden;
  &::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,${c.primary},${c.bull});border-radius:14px 14px 0 0;}
`
const SumTopic = styled.div`font-size:0.75rem;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.5rem;`
const SumText = styled.div`font-size:0.85rem;color:${c.textSec};line-height:1.5;display:-webkit-box;-webkit-line-clamp:${p => p.$expanded ? 'none' : '4'};-webkit-box-orient:vertical;overflow:hidden;cursor:pointer;`
const SumTime = styled.div`font-size:0.7rem;color:${c.textMuted};margin-top:0.5rem;`
const LiveDot = styled.span`display:inline-block;width:6px;height:6px;background:${c.bull};border-radius:50%;margin-right:6px;animation:pulse 2s infinite;@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}`

// Filters
const FilterRow = styled.div`display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;margin-bottom:1.25rem;`
const FilterLabel = styled.span`font-size:0.8rem;font-weight:600;color:${c.textMuted};text-transform:uppercase;letter-spacing:0.5px;min-width:60px;`
const Chip = styled.button`
  padding:0.35rem 0.8rem;background:${p => p.$active ? (p.$color || c.primary) : 'rgba(54,166,186,0.08)'};
  border:1px solid ${p => p.$active ? (p.$color || c.primary) : 'rgba(54,166,186,0.2)'};border-radius:20px;
  color:${p => p.$active ? '#fff' : c.textSec};font-size:0.78rem;font-weight:600;cursor:pointer;transition:all 0.2s;white-space:nowrap;
  &:hover{border-color:${p => p.$color || c.primary};color:${c.text};}
`
const SortBtn = styled.button`
  padding:0.35rem 0.8rem;background:${p => p.$active ? 'rgba(54,166,186,0.2)' : 'transparent'};
  border:1px solid rgba(54,166,186,0.2);border-radius:8px;color:${p => p.$active ? c.primary : c.textMuted};
  font-size:0.75rem;font-weight:600;cursor:pointer;transition:all 0.2s;margin-left:auto;
`

// Layout
const TwoCol = styled.div`display:grid;grid-template-columns:1fr 340px;gap:1.5rem;@media(max-width:1024px){grid-template-columns:1fr;}`
const MainCol = styled.div``
const Sidebar = styled.div`@media(max-width:1024px){order:-1;}`

// Post Cards
const PostGrid = styled.div`display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:0.875rem;`
const PostCard = styled(motion.div)`
  background:${c.card};border:1px solid ${p => p.$vip ? 'rgba(241,196,15,0.3)' : c.border};
  border-radius:12px;padding:1rem;transition:all 0.2s;cursor:pointer;display:flex;flex-direction:column;
  &:hover{background:${c.cardHover};transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,0.3);border-color:${p => p.$vip ? 'rgba(241,196,15,0.5)' : 'rgba(54,166,186,0.3)'};}
`
const PostHeader = styled.div`display:flex;align-items:center;gap:0.625rem;margin-bottom:0.625rem;`
const Avatar = styled.img`width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid ${p => p.$vip ? c.gold : 'rgba(54,166,186,0.3)'};flex-shrink:0;`
const AvatarFallback = styled.div`width:36px;height:36px;border-radius:50%;background:rgba(54,166,186,0.2);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:${c.primary};flex-shrink:0;`
const CreatorInfo = styled.div`flex:1;min-width:0;`
const CreatorName = styled.div`font-size:0.85rem;font-weight:700;color:${c.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const CreatorHandle = styled.div`font-size:0.7rem;color:${c.textMuted};`
const VipBadge = styled.span`font-size:0.6rem;font-weight:700;color:${c.gold};background:rgba(241,196,15,0.15);border:1px solid rgba(241,196,15,0.3);padding:0.1rem 0.4rem;border-radius:4px;margin-left:0.5rem;`
const FollowerBadge = styled.div`font-size:0.65rem;color:${c.textMuted};background:rgba(255,255,255,0.05);padding:0.15rem 0.5rem;border-radius:10px;white-space:nowrap;`

const PostBody = styled.div`font-size:0.82rem;color:${c.textSec};line-height:1.5;margin-bottom:0.625rem;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;flex:1;`
const PostMeta = styled.div`display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin-top:auto;padding-top:0.5rem;border-top:1px solid rgba(255,255,255,0.05);`
const Interactions = styled.div`display:flex;gap:0.75rem;font-size:0.7rem;color:${c.textMuted};span{display:flex;align-items:center;gap:0.25rem;}`
const SentDot = styled.div`width:8px;height:8px;border-radius:50%;background:${p => p.$s > 0 ? c.bull : p.$s < 0 ? c.bear : c.neutral};`
const TickerChips = styled.div`display:flex;gap:0.375rem;flex-wrap:wrap;margin-bottom:0.5rem;`
const TickerChip = styled.span`font-size:0.6rem;font-weight:700;color:${c.primary};background:rgba(54,166,186,0.1);padding:0.1rem 0.4rem;border-radius:3px;cursor:pointer;&:hover{background:rgba(54,166,186,0.2);}`
const TimeAgo = styled.span`font-size:0.65rem;color:${c.textMuted};`

// Influencer sidebar
const SideTitle = styled.h3`font-size:1.1rem;font-weight:700;color:${c.text};margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;`
const InfluencerList = styled.div`display:flex;flex-direction:column;gap:0.5rem;`
const InfluencerRow = styled.div`
  display:flex;align-items:center;gap:0.625rem;padding:0.625rem;background:${c.card};border:1px solid ${c.border};
  border-radius:10px;transition:all 0.2s;cursor:pointer;
  &:hover{background:${c.cardHover};border-color:rgba(54,166,186,0.3);}
`
const InflRank = styled.div`font-size:0.7rem;font-weight:700;color:${c.textMuted};width:20px;text-align:center;`
const InflAvatar = styled.img`width:32px;height:32px;border-radius:50%;object-fit:cover;`
const InflInfo = styled.div`flex:1;min-width:0;`
const InflName = styled.div`font-size:0.8rem;font-weight:700;color:${c.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const InflHandle = styled.div`font-size:0.65rem;color:${c.textMuted};`
const InflStat = styled.div`text-align:right;font-size:0.7rem;color:${c.textSec};span{display:block;font-weight:700;color:${c.text};font-size:0.8rem;}`

const ShowMore = styled.button`
  grid-column:1/-1;padding:0.75rem;background:rgba(54,166,186,0.1);border:1px solid rgba(54,166,186,0.3);
  border-radius:10px;color:${c.primary};font-size:0.9rem;font-weight:600;cursor:pointer;transition:all 0.2s;width:100%;margin-top:0.5rem;
  &:hover{background:rgba(54,166,186,0.2);}
`
const Empty = styled.div`text-align:center;padding:3rem;color:${c.textMuted};font-size:1rem;grid-column:1/-1;`
const Loading = styled.div`text-align:center;padding:4rem;color:${c.textSec};font-size:1.1rem;`

// ─── COMPONENT ──────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'cryptocurrencies', label: 'Crypto' },
  { key: 'defi', label: 'DeFi' },
  { key: 'nfts', label: 'NFTs' },
  { key: 'memecoins', label: 'Memecoins' },
  { key: 'layer-1', label: 'Layer 1' },
  { key: 'tracked_creator', label: 'Influencers' },
]

export default function CommunityClient() {
  const [summaries, setSummaries] = useState([])
  const [posts, setPosts] = useState([])
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('all')
  const [sortBy, setSortBy] = useState('interactions')
  const [showCount, setShowCount] = useState(30)
  const [expandedSummary, setExpandedSummary] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [postsRes, creatorsRes, summariesRes] = await Promise.all([
          fetch('/api/social/feed?limit=200&sort=' + sortBy),
          fetch('/api/social/creators?limit=30'),
          fetchSummaries(),
        ])

        const postsJson = await postsRes.json()
        const creatorsJson = await creatorsRes.json()

        setPosts(postsJson.posts || [])
        setCreators(creatorsJson.creators || [])
        setSummaries(summariesRes)
      } catch (err) {
        console.error('Error loading community data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sortBy])

  async function fetchSummaries() {
    try {
      const { supabaseBrowser } = await import('@/app/lib/supabaseBrowserClient')
      const supabase = supabaseBrowser()
      
      // Get latest summary per topic
      const { data } = await supabase
        .from('social_ai_summaries')
        .select('*')
        .in('topic', ['bitcoin', 'ethereum', 'solana', 'xrp', 'defi', 'memecoins'])
        .order('generated_at', { ascending: false })
        .limit(20)

      // Dedupe: keep latest per topic
      const seen = new Set()
      const unique = []
      for (const s of data || []) {
        if (!seen.has(s.topic)) {
          seen.add(s.topic)
          unique.push(s)
        }
      }
      return unique.slice(0, 3)
    } catch { return [] }
  }

  const filtered = useMemo(() => {
    if (catFilter === 'all') return posts
    return posts.filter(p => p.category === catFilter)
  }, [posts, catFilter])

  const formatTime = (d) => {
    if (!d) return ''
    const s = Math.floor((Date.now() - new Date(d)) / 1000)
    if (s < 60) return 'now'
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return `${Math.floor(s / 86400)}d ago`
  }

  const formatNum = (n) => {
    if (!n) return '0'
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
    return String(n)
  }

  if (loading) return <Container><Loading>Loading social intelligence...</Loading></Container>

  return (
    <Container>
      <Header>
        <Title>Social Intelligence</Title>
        <Sub>Real-time crypto social feed powered by <span>LunarCrush</span> — top influencers, viral posts, and AI market summaries</Sub>
      </Header>

      {/* AI Summaries */}
      {summaries.length > 0 && (
        <SummaryRow>
          {summaries.map((s, i) => (
            <SummaryCard
              key={s.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <SumTopic><LiveDot />{s.topic} — AI Summary</SumTopic>
              <SumText
                $expanded={expandedSummary === s.id}
                onClick={() => setExpandedSummary(expandedSummary === s.id ? null : s.id)}
              >
                {s.summary}
              </SumText>
              <SumTime>{formatTime(s.generated_at)}</SumTime>
            </SummaryCard>
          ))}
        </SummaryRow>
      )}

      {/* Filters */}
      <FilterRow>
        <FilterLabel>Category</FilterLabel>
        {CATEGORIES.map(cat => (
          <Chip key={cat.key} $active={catFilter === cat.key} onClick={() => { setCatFilter(cat.key); setShowCount(30) }}>
            {cat.label}
          </Chip>
        ))}
        <SortBtn $active={sortBy === 'interactions'} onClick={() => setSortBy('interactions')}>Top</SortBtn>
        <SortBtn $active={sortBy === 'recent'} onClick={() => setSortBy('recent')}>Latest</SortBtn>
      </FilterRow>

      <TwoCol>
        <MainCol>
          <PostGrid>
            {filtered.length === 0 && <Empty>No social posts yet. Data populates every 4 hours from LunarCrush.</Empty>}
            <AnimatePresence mode="popLayout">
              {filtered.slice(0, showCount).map((post, i) => {
                const isVip = post.category === 'tracked_creator'
                const sent = post.sentiment || 0
                const tickers = Array.isArray(post.tickers_mentioned) ? post.tickers_mentioned : []

                return (
                  <PostCard
                    key={post.id || post.post_id}
                    $vip={isVip}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.4) }}
                    layout
                    onClick={() => post.url && window.open(post.url, '_blank')}
                  >
                    <PostHeader>
                      {post.creator_image ? (
                        <Avatar src={post.creator_image} alt="" $vip={isVip} onError={e => { e.target.style.display = 'none' }} />
                      ) : (
                        <AvatarFallback>{(post.creator_name || '?')[0]}</AvatarFallback>
                      )}
                      <CreatorInfo>
                        <CreatorName>
                          {post.creator_name || post.creator_screen_name || 'Crypto User'}
                          {isVip && <VipBadge>★ VIP</VipBadge>}
                        </CreatorName>
                        <CreatorHandle>@{post.creator_screen_name || 'unknown'}</CreatorHandle>
                      </CreatorInfo>
                      {post.creator_followers > 10000 && (
                        <FollowerBadge>{formatNum(post.creator_followers)} followers</FollowerBadge>
                      )}
                    </PostHeader>

                    {tickers.length > 0 && (
                      <TickerChips>
                        {tickers.slice(0, 5).map(t => (
                          <Link key={t} href={`/token/${t}`} onClick={e => e.stopPropagation()}>
                            <TickerChip>${t}</TickerChip>
                          </Link>
                        ))}
                      </TickerChips>
                    )}

                    <PostBody>{post.body || post.title || 'No content'}</PostBody>

                    <PostMeta>
                      <Interactions>
                        <span>❤️ {formatNum(post.likes)}</span>
                        <span>🔁 {formatNum(post.retweets)}</span>
                        <span>💬 {formatNum(post.replies)}</span>
                      </Interactions>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <SentDot $s={sent} />
                        <TimeAgo>{formatTime(post.published_at)}</TimeAgo>
                      </div>
                    </PostMeta>
                  </PostCard>
                )
              })}
            </AnimatePresence>
          </PostGrid>
          {filtered.length > showCount && (
            <ShowMore onClick={() => setShowCount(c => c + 30)}>
              Show more ({filtered.length - showCount} remaining)
            </ShowMore>
          )}
        </MainCol>

        {/* Sidebar: Top Influencers */}
        <Sidebar>
          <SideTitle>🔥 Top Influencers (24h)</SideTitle>
          <InfluencerList>
            {creators.length === 0 && <Empty style={{ padding: '2rem' }}>Populating...</Empty>}
            {creators.slice(0, 20).map((cr, i) => (
              <InfluencerRow
                key={cr.id || cr.creator_id}
                onClick={() => window.open(`https://x.com/${cr.screen_name}`, '_blank')}
              >
                <InflRank>{i + 1}</InflRank>
                {cr.profile_image ? (
                  <InflAvatar src={cr.profile_image} alt="" onError={e => { e.target.style.display = 'none' }} />
                ) : (
                  <AvatarFallback style={{ width: 32, height: 32 }}>{(cr.display_name || '?')[0]}</AvatarFallback>
                )}
                <InflInfo>
                  <InflName>{cr.display_name || cr.screen_name}</InflName>
                  <InflHandle>@{cr.screen_name}</InflHandle>
                </InflInfo>
                <InflStat>
                  <span>{formatNum(cr.interactions_24h)}</span>
                  interactions
                </InflStat>
              </InfluencerRow>
            ))}
          </InfluencerList>
        </Sidebar>
      </TwoCol>
    </Container>
  )
}
