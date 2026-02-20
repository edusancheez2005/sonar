'use client'

import React, { useState, useEffect, useMemo } from 'react'
import styled, { keyframes } from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const MONO = "'SF Mono', 'Fira Code', 'Courier New', monospace"
const c = {
  bg: '#080f18', panel: '#0b1724', panelHover: '#0e1e30', primary: '#36a6ba',
  accent: '#2ecc71', text: '#e8ecf1', textSec: '#8a9bb5', textMuted: '#556677',
  border: 'rgba(54,166,186,0.12)', bull: '#2ecc71', bear: '#e74c3c', neutral: '#8a9bb5',
  gold: '#f0b90b',
}

const pulse = keyframes`0%,100%{opacity:1;}50%{opacity:0.3;}`

// ─── LAYOUT ─────────────────────────────────────────────────────

const Container = styled.div`max-width:1440px;margin:0 auto;padding:1.5rem 2rem;`

const PageTitle = styled.div`
  display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem;
  h1{font-size:1.1rem;font-weight:700;color:${c.primary};font-family:${MONO};text-transform:uppercase;letter-spacing:1px;margin:0;}
`
const LiveIndicator = styled.span`
  display:inline-flex;align-items:center;gap:0.4rem;font-size:0.7rem;font-weight:600;color:${c.accent};
  font-family:${MONO};text-transform:uppercase;
  &::before{content:'';width:6px;height:6px;background:${c.accent};border-radius:50%;animation:${pulse} 2s infinite;}
`
const SubText = styled.p`font-size:0.8rem;color:${c.textMuted};margin:0;font-family:${MONO};`

// ─── AI SUMMARIES ───────────────────────────────────────────────

const SummaryGrid = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:0.75rem;margin-bottom:1.5rem;`
const SummaryPanel = styled(motion.div)`
  background:${c.panel};border:1px solid ${c.border};border-top:2px solid ${c.primary};border-radius:6px;padding:1rem 1.125rem;
  cursor:pointer;transition:border-color 0.2s;
  &:hover{border-color:rgba(54,166,186,0.3);}
`
const SumLabel = styled.div`font-size:0.65rem;font-weight:700;color:${c.primary};font-family:${MONO};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.5rem;`
const SumBody = styled.div`
  font-size:0.78rem;color:${c.textSec};line-height:1.5;
  display:-webkit-box;-webkit-line-clamp:${p => p.$open ? 'unset' : '3'};-webkit-box-orient:vertical;overflow:hidden;
`
const SumMeta = styled.div`font-size:0.6rem;color:${c.textMuted};font-family:${MONO};margin-top:0.5rem;`

// ─── FILTERS ────────────────────────────────────────────────────

const ControlBar = styled.div`display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem;`
const Tag = styled.button`
  padding:0.3rem 0.7rem;font-size:0.7rem;font-weight:600;font-family:${MONO};
  background:${p => p.$active ? c.primary : 'transparent'};color:${p => p.$active ? '#000' : c.textMuted};
  border:1px solid ${p => p.$active ? c.primary : 'rgba(54,166,186,0.2)'};border-radius:4px;
  cursor:pointer;transition:all 0.15s;text-transform:uppercase;letter-spacing:0.3px;
  &:hover{border-color:${c.primary};color:${p => p.$active ? '#000' : c.text};}
`
const Divider = styled.div`width:1px;height:20px;background:rgba(54,166,186,0.15);margin:0 0.25rem;`

// ─── TWO COLUMN LAYOUT ─────────────────────────────────────────

const Layout = styled.div`display:grid;grid-template-columns:1fr 320px;gap:1.25rem;@media(max-width:1080px){grid-template-columns:1fr;}`
const Main = styled.div``
const Side = styled.div`@media(max-width:1080px){order:-1;}`

// ─── POST CARDS ─────────────────────────────────────────────────

const PostList = styled.div`display:flex;flex-direction:column;gap:0.5rem;`
const Post = styled(motion.div)`
  background:${c.panel};border:1px solid ${p => p.$vip ? 'rgba(240,185,11,0.2)' : c.border};
  border-left:3px solid ${p => p.$sent > 0 ? c.bull : p.$sent < 0 ? c.bear : 'rgba(54,166,186,0.2)'};
  border-radius:4px;padding:0.75rem 1rem;cursor:pointer;transition:all 0.15s;
  &:hover{background:${c.panelHover};border-color:${p => p.$vip ? 'rgba(240,185,11,0.35)' : 'rgba(54,166,186,0.25)'};}
`
const PostTop = styled.div`display:flex;align-items:center;gap:0.5rem;margin-bottom:0.375rem;`
const Avi = styled.img`width:28px;height:28px;border-radius:4px;object-fit:cover;opacity:0.9;`
const AviFallback = styled.div`width:28px;height:28px;border-radius:4px;background:rgba(54,166,186,0.15);display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;color:${c.primary};`
const Handle = styled.div`flex:1;min-width:0;`
const Name = styled.span`font-size:0.78rem;font-weight:700;color:${c.text};`
const Screen = styled.span`font-size:0.65rem;color:${c.textMuted};font-family:${MONO};margin-left:0.375rem;`
const VipTag = styled.span`font-size:0.55rem;font-weight:700;color:${c.gold};border:1px solid rgba(240,185,11,0.3);padding:0.075rem 0.35rem;border-radius:2px;font-family:${MONO};`
const FollowCount = styled.span`font-size:0.6rem;color:${c.textMuted};font-family:${MONO};white-space:nowrap;`

const Body = styled.div`font-size:0.8rem;color:${c.textSec};line-height:1.5;margin-bottom:0.375rem;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;`
const Tickers = styled.div`display:flex;gap:0.3rem;flex-wrap:wrap;margin-bottom:0.375rem;`
const Tick = styled.span`font-size:0.6rem;font-weight:700;color:${c.primary};font-family:${MONO};background:rgba(54,166,186,0.08);padding:0.1rem 0.35rem;border-radius:2px;cursor:pointer;&:hover{background:rgba(54,166,186,0.15);}`
const PostBottom = styled.div`display:flex;justify-content:space-between;align-items:center;font-size:0.65rem;color:${c.textMuted};font-family:${MONO};`
const Metric = styled.span`margin-right:0.75rem;`
const SentBar = styled.span`width:8px;height:8px;border-radius:2px;display:inline-block;background:${p => p.$s > 0 ? c.bull : p.$s < 0 ? c.bear : c.neutral};margin-right:0.375rem;`

// ─── INFLUENCER SIDEBAR ─────────────────────────────────────────

const SideHeader = styled.div`font-size:0.75rem;font-weight:700;color:${c.primary};font-family:${MONO};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.75rem;padding-bottom:0.5rem;border-bottom:1px solid ${c.border};`
const InflRow = styled.div`
  display:flex;align-items:center;gap:0.5rem;padding:0.5rem;border-radius:4px;cursor:pointer;transition:background 0.15s;
  &:hover{background:rgba(54,166,186,0.06);}
  & + &{border-top:1px solid rgba(255,255,255,0.03);}
`
const InflRank = styled.div`font-size:0.6rem;font-weight:700;color:${c.textMuted};width:18px;text-align:right;font-family:${MONO};`
const InflAvi = styled.img`width:26px;height:26px;border-radius:4px;object-fit:cover;`
const InflInfo = styled.div`flex:1;min-width:0;`
const InflName = styled.div`font-size:0.75rem;font-weight:700;color:${c.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const InflHandle = styled.div`font-size:0.6rem;color:${c.textMuted};font-family:${MONO};`
const InflMetric = styled.div`text-align:right;font-family:${MONO};`
const InflVal = styled.div`font-size:0.75rem;font-weight:700;color:${c.text};`
const InflLabel = styled.div`font-size:0.55rem;color:${c.textMuted};text-transform:uppercase;`

const LoadMore = styled.button`
  width:100%;padding:0.6rem;background:transparent;border:1px solid ${c.border};border-radius:4px;
  color:${c.primary};font-size:0.75rem;font-weight:600;font-family:${MONO};cursor:pointer;margin-top:0.75rem;
  transition:all 0.15s;text-transform:uppercase;letter-spacing:0.5px;
  &:hover{background:rgba(54,166,186,0.06);border-color:rgba(54,166,186,0.3);}
`
const EmptyMsg = styled.div`padding:2.5rem;text-align:center;color:${c.textMuted};font-size:0.8rem;font-family:${MONO};`

// ─── COMPONENT ──────────────────────────────────────────────────

const CATS = [
  { key: 'all', label: 'ALL' },
  { key: 'cryptocurrencies', label: 'CRYPTO' },
  { key: 'defi', label: 'DEFI' },
  { key: 'nfts', label: 'NFTS' },
  { key: 'memecoins', label: 'MEMES' },
  { key: 'layer-1', label: 'L1' },
  { key: 'tracked_creator', label: 'INFLUENCERS' },
]

export default function CommunityClient() {
  const [summaries, setSummaries] = useState([])
  const [posts, setPosts] = useState([])
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('interactions')
  const [show, setShow] = useState(40)
  const [openSum, setOpenSum] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [pRes, cRes, sRes] = await Promise.all([
          fetch('/api/social/feed?limit=200&sort=' + sort),
          fetch('/api/social/creators?limit=30'),
          fetchSummaries(),
        ])
        setPosts((await pRes.json()).posts || [])
        setCreators((await cRes.json()).creators || [])
        setSummaries(sRes)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [sort])

  async function fetchSummaries() {
    try {
      const { supabaseBrowser } = await import('@/app/lib/supabaseBrowserClient')
      const sb = supabaseBrowser()
      const { data } = await sb.from('social_ai_summaries').select('*').in('topic', ['bitcoin', 'ethereum', 'solana', 'defi', 'memecoins']).order('generated_at', { ascending: false }).limit(15)
      const seen = new Set()
      return (data || []).filter(s => { if (seen.has(s.topic)) return false; seen.add(s.topic); return true }).slice(0, 3)
    } catch { return [] }
  }

  const filtered = useMemo(() => cat === 'all' ? posts : posts.filter(p => p.category === cat), [posts, cat])

  const fmt = n => { if (!n) return '0'; if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'; return String(n) }
  const ago = d => { if (!d) return ''; const s = Math.floor((Date.now() - new Date(d)) / 1000); if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h'; return Math.floor(s / 86400) + 'd' }

  if (loading) return <Container><EmptyMsg>LOADING SOCIAL INTELLIGENCE...</EmptyMsg></Container>

  return (
    <Container>
      <PageTitle>
        <h1>Social Intelligence</h1>
        <LiveIndicator>LIVE FEED</LiveIndicator>
      </PageTitle>
      <SubText>Real-time crypto social data via LunarCrush — influencer posts, viral content, AI-generated market summaries</SubText>

      {/* AI Summaries */}
      {summaries.length > 0 && (
        <SummaryGrid style={{ marginTop: '1.25rem' }}>
          {summaries.map((s, i) => (
            <SummaryPanel key={s.id || i} onClick={() => setOpenSum(openSum === s.id ? null : s.id)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }}>
              <SumLabel>AI BRIEF // {s.topic}</SumLabel>
              <SumBody $open={openSum === s.id}>{s.summary}</SumBody>
              <SumMeta>{ago(s.generated_at)} ago</SumMeta>
            </SummaryPanel>
          ))}
        </SummaryGrid>
      )}

      {/* Controls */}
      <ControlBar>
        {CATS.map(c => <Tag key={c.key} $active={cat === c.key} onClick={() => { setCat(c.key); setShow(40) }}>{c.label}</Tag>)}
        <Divider />
        <Tag $active={sort === 'interactions'} onClick={() => setSort('interactions')}>TOP</Tag>
        <Tag $active={sort === 'recent'} onClick={() => setSort('recent')}>LATEST</Tag>
      </ControlBar>

      <Layout>
        <Main>
          <PostList>
            {filtered.length === 0 && <EmptyMsg>NO SOCIAL DATA YET — FEED POPULATES EVERY 4 HOURS VIA LUNARCRUSH</EmptyMsg>}
            <AnimatePresence mode="popLayout">
              {filtered.slice(0, show).map((p, i) => {
                const vip = p.category === 'tracked_creator'
                const sent = p.sentiment || 0
                const ticks = Array.isArray(p.tickers_mentioned) ? p.tickers_mentioned : []
                return (
                  <Post key={p.id || p.post_id} $vip={vip} $sent={sent}
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.12, delay: Math.min(i * 0.015, 0.3) }} layout
                    onClick={() => p.url && window.open(p.url, '_blank')}>
                    <PostTop>
                      {p.creator_image ? <Avi src={p.creator_image} alt="" onError={e => { e.target.style.display = 'none' }} /> : <AviFallback>{(p.creator_name || '?')[0]}</AviFallback>}
                      <Handle>
                        <Name>{p.creator_name || p.creator_screen_name || 'anon'}</Name>
                        <Screen>@{p.creator_screen_name || '—'}</Screen>
                      </Handle>
                      {vip && <VipTag>TRACKED</VipTag>}
                      {p.creator_followers > 10000 && <FollowCount>{fmt(p.creator_followers)}</FollowCount>}
                    </PostTop>
                    {ticks.length > 0 && <Tickers>{ticks.slice(0, 6).map(t => <Link key={t} href={`/token/${t}`} onClick={e => e.stopPropagation()}><Tick>${t}</Tick></Link>)}</Tickers>}
                    <Body>{p.body || p.title || ''}</Body>
                    <PostBottom>
                      <div><SentBar $s={sent} /><Metric>{fmt(p.likes)} likes</Metric><Metric>{fmt(p.retweets)} rt</Metric><Metric>{fmt(p.replies)} replies</Metric></div>
                      <span>{ago(p.published_at)} ago</span>
                    </PostBottom>
                  </Post>
                )
              })}
            </AnimatePresence>
          </PostList>
          {filtered.length > show && <LoadMore onClick={() => setShow(s => s + 40)}>LOAD MORE ({filtered.length - show} REMAINING)</LoadMore>}
        </Main>

        <Side>
          <SideHeader>TOP INFLUENCERS // 24H</SideHeader>
          {creators.length === 0 && <EmptyMsg>POPULATING...</EmptyMsg>}
          {creators.slice(0, 20).map((cr, i) => (
            <InflRow key={cr.id || cr.creator_id} onClick={() => window.open(`https://x.com/${cr.screen_name}`, '_blank')}>
              <InflRank>{i + 1}</InflRank>
              {cr.profile_image ? <InflAvi src={cr.profile_image} alt="" onError={e => { e.target.style.display = 'none' }} /> : <AviFallback style={{ width: 26, height: 26 }}>{(cr.display_name || '?')[0]}</AviFallback>}
              <InflInfo>
                <InflName>{cr.display_name || cr.screen_name}</InflName>
                <InflHandle>@{cr.screen_name}</InflHandle>
              </InflInfo>
              <InflMetric>
                <InflVal>{fmt(cr.interactions_24h)}</InflVal>
                <InflLabel>INTERACTIONS</InflLabel>
              </InflMetric>
            </InflRow>
          ))}
        </Side>
      </Layout>
    </Container>
  )
}
