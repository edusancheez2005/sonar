'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

// ─── CONSTANTS ──────────────────────────────────────────────────────
const MONO = "'JetBrains Mono','SF Mono','Fira Code','Consolas',monospace"
const SANS = "'Inter','Segoe UI',system-ui,sans-serif"
const C = {
  bg: '#070c14', panel: '#0b1520', panelHover: '#0e1d2e',
  cyan: '#00e5ff', primary: '#36a6ba', green: '#00e676', red: '#ff1744',
  amber: '#f0b90b', text: '#e0e6ed', textSec: '#8a9bb5', textMuted: '#4d6070',
  border: 'rgba(0,229,255,0.06)', borderHover: 'rgba(0,229,255,0.15)',
}

const TABS = [
  { key: 'articles', label: 'ARTICLES' },
  { key: 'social', label: 'SOCIAL' },
]

const ECOSYSTEMS = [
  { key: 'all', label: 'All' },
  { key: 'btc', label: 'BTC', tokens: ['BTC','WBTC'] },
  { key: 'eth', label: 'ETH', tokens: ['ETH','UNI','AAVE','LINK','MKR','LDO','ENS','ARB','OP'] },
  { key: 'sol', label: 'SOL', tokens: ['SOL','JUP','RAY','BONK','WIF','PYTH','JTO'] },
  { key: 'layer1', label: 'L1s', tokens: ['ADA','DOT','AVAX','ATOM','NEAR','SUI','SEI','APT','TIA'] },
  { key: 'defi', label: 'DeFi', tokens: ['UNI','AAVE','MKR','LDO','CRV','COMP','SNX','SUSHI','DYDX','INJ'] },
  { key: 'meme', label: 'Memes', tokens: ['DOGE','SHIB','PEPE','BONK','WIF','FLOKI'] },
  { key: 'ai', label: 'AI', tokens: ['FET','RENDER','OCEAN','TAO'] },
]

const SENTIMENTS = [
  { key: 'all', label: 'All' },
  { key: 'bullish', label: 'Bullish' },
  { key: 'bearish', label: 'Bearish' },
]

// ─── ANIMATIONS ─────────────────────────────────────────────────────
const pulse = keyframes`0%,100%{opacity:1}50%{opacity:.3}`
const scanline = keyframes`0%{top:-4px}100%{top:100%}`
const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`
const shimmer = keyframes`0%{background-position:-200% 0}100%{background-position:200% 0}`
const typewriter = keyframes`from{width:0}to{width:100%}`

// ─── STYLED COMPONENTS ─────────────────────────────────────────────

// Boot screen
const BootOverlay = styled(motion.div)`
  position:fixed;inset:0;z-index:9999;background:${C.bg};
  display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1rem;
  font-family:${MONO};color:${C.cyan};
`
const BootLine = styled(motion.div)`
  font-size:.8rem;letter-spacing:1px;opacity:.7;
  &.active{opacity:1;color:${C.green};}
`
const BootCursor = styled.span`
  display:inline-block;width:8px;height:14px;background:${C.cyan};
  animation:${pulse} 1s step-end infinite;margin-left:4px;vertical-align:middle;
`

const Shell = styled.div`
  min-height:100vh;background:${C.bg};position:relative;overflow:hidden;
  &::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:1;
    background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,229,255,0.008) 2px,rgba(0,229,255,0.008) 4px);}
`

const TopBar = styled.div`
  position:sticky;top:0;z-index:100;
  height:44px;background:rgba(7,12,20,0.92);backdrop-filter:blur(12px);
  border-bottom:1px solid ${C.border};
  display:flex;align-items:center;justify-content:space-between;padding:0 2rem;
  font-family:${MONO};
  @media(max-width:768px){padding:0 1rem;}
`
const TopLeft = styled.div`display:flex;align-items:center;gap:.75rem;`
const TopTitle = styled.span`font-size:.75rem;font-weight:700;color:${C.cyan};letter-spacing:1.5px;`
const LiveDot = styled.span`
  display:flex;align-items:center;gap:.3rem;font-size:.6rem;font-weight:600;color:${C.green};letter-spacing:.5px;
  &::before{content:'';width:6px;height:6px;border-radius:50%;background:${C.green};animation:${pulse} 2s infinite;}
`
const TopRight = styled.div`display:flex;align-items:center;gap:.75rem;font-size:.65rem;color:${C.textMuted};font-family:${MONO};`

const Content = styled.div`
  display:grid;grid-template-columns:300px 1fr;gap:0;max-width:1600px;margin:0 auto;
  min-height:calc(100vh - 44px);position:relative;z-index:2;
  @media(max-width:1080px){grid-template-columns:1fr;}
`

// ─── SIDEBAR ────────────────────────────────────────────────────────
const Sidebar = styled.aside`
  border-right:1px solid ${C.border};padding:1rem;overflow-y:auto;
  height:calc(100vh - 44px);position:sticky;top:44px;
  display:flex;flex-direction:column;gap:1rem;
  @media(max-width:1080px){display:none;}
`

const SideSection = styled.div`
  background:${C.panel};border:1px solid ${C.border};border-radius:6px;overflow:hidden;
`
const SideHeader = styled.div`
  padding:.6rem .75rem;border-bottom:1px solid ${C.border};
  display:flex;align-items:center;justify-content:space-between;gap:.5rem;
`
const SideLabel = styled.span`
  font-size:.6rem;font-weight:700;color:${p => p.$color || C.cyan};font-family:${MONO};
  text-transform:uppercase;letter-spacing:1px;
`
const SideBadge = styled.span`
  font-size:.5rem;font-weight:700;padding:.1rem .35rem;border-radius:3px;letter-spacing:.5px;
  color:${p => p.$color || C.textMuted};
  background:${p => p.$bg || 'rgba(0,229,255,0.06)'};
`
const SideBody = styled.div`padding:.5rem .75rem;`

// Macro factor card
const MacroCard = styled.div`
  padding:.5rem 0;border-bottom:1px solid rgba(0,229,255,0.04);
  &:last-child{border-bottom:none;}
`
const MacroTitle = styled.div`
  display:flex;align-items:center;gap:.35rem;margin-bottom:.15rem;
  font-size:.7rem;font-weight:700;color:${C.text};
`
const ImpactDot = styled.span`
  width:7px;height:7px;border-radius:50%;flex-shrink:0;
  background:${p => p.$s === 'bullish' ? C.green : p.$s === 'bearish' ? C.red : C.textMuted};
`
const MacroSummary = styled.div`font-size:.62rem;color:${C.textMuted};line-height:1.45;`

// Voice card
const VoiceCard = styled.div`
  padding:.5rem 0;border-bottom:1px solid rgba(0,229,255,0.04);
  &:last-child{border-bottom:none;}
`
const VoiceName = styled.div`
  font-size:.68rem;font-weight:700;color:${C.text};
  span{font-weight:400;color:${C.textMuted};margin-left:.4rem;font-size:.58rem;}
`
const VoiceQuote = styled.div`
  font-size:.62rem;color:${C.textSec};line-height:1.45;margin-top:.15rem;font-style:italic;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;
`
const VoiceContext = styled.div`
  font-size:.55rem;color:${C.textMuted};font-family:${MONO};margin-top:.15rem;
  display:flex;align-items:center;gap:.35rem;
`

// Ask ORCA box
const OrcaBox = styled.div`padding:.75rem;`
const OrcaInput = styled.input`
  width:100%;padding:.5rem .65rem;background:rgba(0,229,255,0.04);
  border:1px solid ${C.border};border-radius:5px;color:${C.text};
  font-size:.72rem;font-family:${MONO};outline:none;
  &::placeholder{color:${C.textMuted};}
  &:focus{border-color:${C.primary};}
`

// ─── MAIN FEED ──────────────────────────────────────────────────────
const Feed = styled.main`
  padding:1rem 1.5rem;overflow-y:auto;height:calc(100vh - 44px);
  @media(max-width:768px){padding:1rem;}
`

const FilterBar = styled.div`
  display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin-bottom:.75rem;
`
const Pill = styled.button`
  padding:.25rem .6rem;font-size:.6rem;font-weight:600;font-family:${MONO};
  background:${p => p.$on ? 'rgba(0,229,255,0.12)' : 'transparent'};
  color:${p => p.$on ? C.cyan : C.textMuted};
  border:1px solid ${p => p.$on ? 'rgba(0,229,255,0.2)' : 'rgba(0,229,255,0.06)'};
  border-radius:4px;cursor:pointer;transition:all .15s;letter-spacing:.3px;
  text-transform:uppercase;
  &:hover{border-color:rgba(0,229,255,0.2);color:${C.text};}
`
const PillDivider = styled.div`width:1px;height:16px;background:rgba(0,229,255,0.08);margin:0 .15rem;`

const TabRow = styled.div`
  display:flex;gap:0;margin-bottom:1rem;border-bottom:1px solid ${C.border};
`
const Tab = styled.button`
  padding:.5rem 1.2rem;font-size:.65rem;font-weight:700;font-family:${MONO};
  background:none;color:${p => p.$on ? C.cyan : C.textMuted};cursor:pointer;
  border:none;border-bottom:2px solid ${p => p.$on ? C.cyan : 'transparent'};
  letter-spacing:.5px;transition:all .15s;
  &:hover{color:${C.text};}
`

const CardList = styled.div`display:flex;flex-direction:column;gap:.5rem;`

// News article card
const ArticleCard = styled(motion.a)`
  display:block;text-decoration:none;
  background:${C.panel};border:1px solid ${C.border};
  border-left:3px solid ${p => p.$s === 'bullish' ? C.green : p.$s === 'bearish' ? C.red : 'rgba(0,229,255,0.1)'};
  border-radius:5px;padding:.75rem 1rem;cursor:pointer;transition:all .15s;
  &:hover{background:${C.panelHover};border-color:${C.borderHover};}
`
const ArticleTitle = styled.div`font-size:.82rem;font-weight:600;color:${C.text};line-height:1.4;margin-bottom:.3rem;`
const ArticleDesc = styled.div`
  font-size:.7rem;color:${C.textSec};line-height:1.5;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
`
const ArticleMeta = styled.div`
  display:flex;align-items:center;gap:.5rem;margin-top:.4rem;flex-wrap:wrap;
  font-size:.6rem;color:${C.textMuted};font-family:${MONO};
`
const TokenChip = styled.span`
  padding:.1rem .35rem;background:rgba(0,229,255,0.06);border:1px solid rgba(0,229,255,0.1);
  border-radius:3px;font-size:.55rem;font-weight:600;color:${C.cyan};font-family:${MONO};
`
const SentBadge = styled.span`
  padding:.1rem .35rem;border-radius:3px;font-size:.5rem;font-weight:700;letter-spacing:.3px;
  color:${p => p.$s === 'bullish' ? C.green : p.$s === 'bearish' ? C.red : C.textMuted};
  background:${p => p.$s === 'bullish' ? 'rgba(0,230,118,0.08)' : p.$s === 'bearish' ? 'rgba(255,23,68,0.08)' : 'rgba(100,120,140,0.08)'};
`

// Social post card
const SocialCard = styled(motion.div)`
  background:${C.panel};border:1px solid ${C.border};
  border-left:3px solid rgba(240,185,11,0.15);
  border-radius:5px;padding:.75rem 1rem;transition:all .15s;
  &:hover{background:${C.panelHover};}
`
const SocialHandle = styled.div`
  font-size:.72rem;font-weight:700;color:${C.text};
  span{color:${C.textMuted};font-weight:400;font-family:${MONO};font-size:.6rem;margin-left:.35rem;}
`
const SocialBody = styled.div`
  font-size:.72rem;color:${C.textSec};line-height:1.55;margin-top:.3rem;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;
`
const SocialMeta = styled.div`
  display:flex;align-items:center;gap:.6rem;margin-top:.35rem;
  font-size:.58rem;color:${C.textMuted};font-family:${MONO};
`

const EmptyState = styled.div`
  text-align:center;padding:3rem 1rem;color:${C.textMuted};font-size:.8rem;font-family:${MONO};
`

const RefreshNote = styled.div`
  font-size:.55rem;color:${C.textMuted};font-family:${MONO};text-align:center;
  padding:.5rem 0;margin-top:.5rem;
`

// ─── LOADING SKELETON ───────────────────────────────────────────────
const SkeletonBar = styled.div`
  height:${p => p.$h || '12px'};width:${p => p.$w || '100%'};border-radius:3px;
  background:linear-gradient(90deg,rgba(0,229,255,0.03) 25%,rgba(0,229,255,0.06) 50%,rgba(0,229,255,0.03) 75%);
  background-size:200% 100%;animation:${shimmer} 1.5s ease infinite;
  margin-bottom:${p => p.$mb || '0'};
`

// ─── HELPERS ────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 0) return 'just now'
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function guessSentiment(item) {
  if (item.sentiment_llm) {
    if (item.sentiment_llm > 0.3) return 'bullish'
    if (item.sentiment_llm < -0.3) return 'bearish'
    return 'neutral'
  }
  const text = `${item.title || ''} ${item.description || ''} ${item.body || ''}`.toLowerCase()
  const bull = ['surge','rally','soar','bullish','pump','record high','all-time high','adoption','approval','etf inflow','accumulation']
  const bear = ['crash','plunge','bearish','dump','sell-off','SEC charges','hack','exploit','fraud','ban','outflow']
  const bs = bull.filter(w => text.includes(w)).length
  const brs = bear.filter(w => text.includes(w)).length
  if (bs > brs) return 'bullish'
  if (brs > bs) return 'bearish'
  return 'neutral'
}

// ─── BOOT ANIMATION ─────────────────────────────────────────────────
const BOOT_LINES = [
  'SONAR_NEWS_TERMINAL v3.2.1',
  'Initializing data feeds...',
  'Connecting: NewsAPI.org ✓',
  'Connecting: Social Intelligence ✓',
  'Connecting: Grok Macro Analysis ✓',
  'Connecting: Key Voices Engine ✓',
  'Loading whale transaction overlay...',
  'Terminal ready.',
]

function BootScreen({ onDone }) {
  const [visibleLines, setVisibleLines] = useState(0)

  useEffect(() => {
    const seen = sessionStorage.getItem('news_boot_seen')
    if (seen) { onDone(); return }

    let i = 0
    const interval = setInterval(() => {
      i++
      setVisibleLines(i)
      if (i >= BOOT_LINES.length) {
        clearInterval(interval)
        setTimeout(() => {
          sessionStorage.setItem('news_boot_seen', '1')
          onDone()
        }, 400)
      }
    }, 120)
    return () => clearInterval(interval)
  }, [onDone])

  return (
    <BootOverlay
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ maxWidth: 420, width: '90vw' }}>
        {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
          <BootLine key={i} className={i === visibleLines - 1 ? 'active' : ''} style={{ marginBottom: 6 }}>
            <span style={{ color: C.green, marginRight: 8 }}>{'>'}</span>
            {line}
            {i === visibleLines - 1 && <BootCursor />}
          </BootLine>
        ))}
      </div>
    </BootOverlay>
  )
}

// ─── COMPONENT ──────────────────────────────────────────────────────
export default function NewsTerminal({ initialNews = [] }) {
  const [booting, setBooting] = useState(true)
  const [tab, setTab] = useState('articles')
  const [eco, setEco] = useState('all')
  const [sent, setSent] = useState('all')

  // Data
  const [articles, setArticles] = useState(initialNews)
  const [socialPosts, setSocialPosts] = useState([])
  const [macroFactors, setMacroFactors] = useState(null)
  const [voices, setVoices] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [orcaQ, setOrcaQ] = useState('')

  const bootDone = useCallback(() => setBooting(false), [])

  // Fetch social posts
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/social/feed?limit=200&sort=interactions')
        const data = await res.json()
        if (data?.posts) {
          setSocialPosts(data.posts)
          // Merge high-engagement X posts into articles feed (tracked creators + viral posts)
          const topXPosts = data.posts
            .filter(p => p.interactions > 500 || p.category === 'tracked_creator')
            .slice(0, 30)
            .map(p => ({
              id: `x-${p.post_id || p.id}`,
              title: `${p.creator_name || p.creator_screen_name || 'X'}: ${(p.body || '').slice(0, 120)}${(p.body || '').length > 120 ? '…' : ''}`,
              description: p.body || '',
              published_at: p.published_at,
              source: `@${p.creator_screen_name || 'X'}`,
              url: p.url || '',
              image: '',
              instruments: (p.tickers_mentioned || []).map(t => ({ code: t })),
              sentiment_llm: p.sentiment || null,
              kind: 'x-post',
            }))
          if (topXPosts.length > 0) {
            setArticles(prev => {
              const existing = new Set(prev.map(a => a.url || a.id))
              const newXPosts = topXPosts.filter(x => !existing.has(x.url || x.id))
              const merged = [...prev, ...newXPosts]
              merged.sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
              return merged.slice(0, 200)
            })
          }
        }
      } catch {}
    }
    load()
    const interval = setInterval(load, 5 * 60 * 1000) // refresh every 5 min
    return () => clearInterval(interval)
  }, [])

  // Fetch DB news articles too
  useEffect(() => {
    const load = async () => {
      try {
        const sb = supabaseBrowser()
        const { data } = await sb
          .from('news_items')
          .select('id,title,description,published_at,source,url,image,tokens_mentioned,sentiment_llm')
          .order('published_at', { ascending: false })
          .limit(200)
        if (data && data.length > 0) {
          const mapped = data.map(n => ({
            id: n.id,
            title: n.title || '',
            description: n.description || '',
            published_at: n.published_at,
            source: n.source || 'Unknown',
            url: n.url || '',
            image: n.image || '',
            instruments: (n.tokens_mentioned || []).map(t => ({ code: t })),
            sentiment_llm: n.sentiment_llm,
            kind: 'news',
          }))
          setArticles(prev => {
            const existing = new Set(prev.map(p => p.url || p.id))
            const newItems = mapped.filter(m => !existing.has(m.url || m.id))
            const merged = [...prev, ...newItems]
            merged.sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
            return merged.slice(0, 200)
          })
        }
      } catch {}
      setLastRefresh(new Date())
    }
    load()
    const interval = setInterval(load, 10 * 60 * 1000) // refresh every 10 min
    return () => clearInterval(interval)
  }, [])

  // Fetch macro factors
  useEffect(() => {
    fetch('/api/social/macro').then(r => r.json()).then(d => {
      if (d?.factors) setMacroFactors(d)
    }).catch(() => {})
  }, [])

  // Fetch voices
  useEffect(() => {
    fetch('/api/social/voices').then(r => r.json()).then(d => {
      if (d?.voices) setVoices(d)
    }).catch(() => {})
  }, [])

  // Filter articles
  const filteredArticles = useMemo(() => {
    let items = articles
    if (eco !== 'all') {
      const tokens = ECOSYSTEMS.find(e => e.key === eco)?.tokens || []
      if (tokens.length) {
        items = items.filter(a => (a.instruments || []).some(i => tokens.includes(String(i.code).toUpperCase())))
      }
    }
    if (sent !== 'all') {
      items = items.filter(a => guessSentiment(a) === sent)
    }
    return items
  }, [articles, eco, sent])

  // Filter social
  const filteredSocial = useMemo(() => {
    let items = socialPosts
    if (eco !== 'all') {
      const tokens = ECOSYSTEMS.find(e => e.key === eco)?.tokens || []
      if (tokens.length) {
        items = items.filter(p =>
          (p.tickers_mentioned || []).some(t => tokens.includes(String(t).toUpperCase())) ||
          tokens.some(t => (p.body || '').toUpperCase().includes(t))
        )
      }
    }
    return items
  }, [socialPosts, eco])

  const handleOrcaSubmit = (e) => {
    e.preventDefault()
    if (!orcaQ.trim()) return
    window.location.href = `/ai-advisor?q=${encodeURIComponent(orcaQ.trim())}`
  }

  return (
    <>
      <AnimatePresence>
        {booting && <BootScreen onDone={bootDone} />}
      </AnimatePresence>

      <Shell>
        <TopBar>
          <TopLeft>
            <TopTitle>SONAR // NEWS_TERMINAL</TopTitle>
            <LiveDot>LIVE</LiveDot>
          </TopLeft>
          <TopRight>
            {lastRefresh && <span>Updated {timeAgo(lastRefresh)}</span>}
          </TopRight>
        </TopBar>

        <Content>
          {/* ─── SIDEBAR ─────────────────────────────── */}
          <Sidebar>
            {/* MACRO FACTORS */}
            <SideSection>
              <SideHeader style={{ borderBottom: `1px solid rgba(240,185,11,0.12)` }}>
                <SideLabel $color={C.amber}>MACRO_FACTORS</SideLabel>
                {macroFactors?.overall_sentiment && (
                  <SideBadge
                    $color={macroFactors.overall_sentiment === 'bullish' ? C.green : macroFactors.overall_sentiment === 'bearish' ? C.red : C.textMuted}
                    $bg={macroFactors.overall_sentiment === 'bullish' ? 'rgba(0,230,118,0.08)' : macroFactors.overall_sentiment === 'bearish' ? 'rgba(255,23,68,0.08)' : 'rgba(100,120,140,0.08)'}
                  >
                    {macroFactors.overall_sentiment.toUpperCase()}
                  </SideBadge>
                )}
              </SideHeader>
              <SideBody>
                {macroFactors?.factors ? macroFactors.factors.map((f, i) => (
                  <MacroCard key={i}>
                    <MacroTitle><ImpactDot $s={f.impact} />{f.title}</MacroTitle>
                    <MacroSummary>{f.summary}</MacroSummary>
                  </MacroCard>
                )) : (
                  [1,2,3].map(i => <div key={i} style={{ padding: '.4rem 0' }}><SkeletonBar $w="60%" $h="10px" $mb="6px" /><SkeletonBar $h="8px" /></div>)
                )}
              </SideBody>
            </SideSection>

            {/* KEY VOICES */}
            <SideSection>
              <SideHeader>
                <SideLabel>KEY_VOICES</SideLabel>
                <SideBadge>LIVE</SideBadge>
              </SideHeader>
              <SideBody>
                {voices?.voices ? voices.voices.slice(0, 8).map((v, i) => (
                  <VoiceCard key={i}>
                    <VoiceName>
                      {v.name}
                      {v.handle && <span>{v.handle}</span>}
                    </VoiceName>
                    <VoiceQuote>"{v.quote}"</VoiceQuote>
                    <VoiceContext>
                      <ImpactDot $s={v.sentiment} />
                      <span>{v.context}</span>
                      <span style={{ marginLeft: 'auto' }}>{v.date}</span>
                    </VoiceContext>
                  </VoiceCard>
                )) : (
                  [1,2,3,4].map(i => <div key={i} style={{ padding: '.4rem 0' }}><SkeletonBar $w="50%" $h="10px" $mb="4px" /><SkeletonBar $h="8px" $mb="4px" /><SkeletonBar $w="35%" $h="7px" /></div>)
                )}
              </SideBody>
            </SideSection>

            {/* ASK ORCA */}
            <SideSection>
              <SideHeader>
                <SideLabel $color={C.primary}>ASK_ORCA</SideLabel>
              </SideHeader>
              <OrcaBox>
                <form onSubmit={handleOrcaSubmit}>
                  <OrcaInput
                    placeholder="Ask about any token, trend..."
                    value={orcaQ}
                    onChange={e => setOrcaQ(e.target.value)}
                  />
                </form>
                <div style={{ fontSize: '.55rem', color: C.textMuted, marginTop: '.35rem', fontFamily: MONO }}>
                  Press Enter to ask ORCA AI
                </div>
              </OrcaBox>
            </SideSection>
          </Sidebar>

          {/* ─── MAIN FEED ───────────────────────────── */}
          <Feed>
            {/* Tabs */}
            <TabRow>
              {TABS.map(t => (
                <Tab key={t.key} $on={tab === t.key} onClick={() => setTab(t.key)}>
                  {t.label}
                  {t.key === 'articles' && <span style={{ marginLeft: 6, fontSize: '.55rem', color: C.textMuted }}>{filteredArticles.length}</span>}
                  {t.key === 'social' && <span style={{ marginLeft: 6, fontSize: '.55rem', color: C.textMuted }}>{filteredSocial.length}</span>}
                </Tab>
              ))}
            </TabRow>

            {/* Filters */}
            <FilterBar>
              {ECOSYSTEMS.map(e => (
                <Pill key={e.key} $on={eco === e.key} onClick={() => setEco(e.key)}>{e.label}</Pill>
              ))}
              <PillDivider />
              {SENTIMENTS.map(s => (
                <Pill key={s.key} $on={sent === s.key} onClick={() => setSent(s.key)}>
                  {s.key === 'bullish' ? '▲ ' : s.key === 'bearish' ? '▼ ' : ''}{s.label}
                </Pill>
              ))}
            </FilterBar>

            {/* Articles Tab */}
            {tab === 'articles' && (
              <CardList>
                <AnimatePresence initial={false}>
                  {filteredArticles.length === 0 ? (
                    <EmptyState>No articles match current filters.</EmptyState>
                  ) : filteredArticles.slice(0, 100).map((a, i) => {
                    const s = guessSentiment(a)
                    return (
                      <ArticleCard
                        key={a.id || a.url || i}
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        $s={s}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: .2, delay: Math.min(i * 0.02, 0.3) }}
                      >
                        <ArticleTitle>{a.title}</ArticleTitle>
                        {a.description && <ArticleDesc>{a.description}</ArticleDesc>}
                        <ArticleMeta>
                          <span>{a.source}</span>
                          <span>·</span>
                          <span>{timeAgo(a.published_at)}</span>
                          {s !== 'neutral' && (
                            <>
                              <span>·</span>
                              <SentBadge $s={s}>{s.toUpperCase()}</SentBadge>
                            </>
                          )}
                          {(a.instruments || []).slice(0, 4).map(ins => (
                            <TokenChip key={ins.code}>{ins.code}</TokenChip>
                          ))}
                        </ArticleMeta>
                      </ArticleCard>
                    )
                  })}
                </AnimatePresence>
              </CardList>
            )}

            {/* Social Tab */}
            {tab === 'social' && (
              <CardList>
                <AnimatePresence initial={false}>
                  {filteredSocial.length === 0 ? (
                    <EmptyState>No social posts match current filters.</EmptyState>
                  ) : filteredSocial.slice(0, 60).map((p, i) => (
                    <SocialCard
                      key={p.id || i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: .2, delay: Math.min(i * 0.02, 0.3) }}
                    >
                      <SocialHandle>
                        {p.creator_display_name || p.creator_screen_name || 'Anon'}
                        {p.creator_screen_name && <span>@{p.creator_screen_name}</span>}
                      </SocialHandle>
                      <SocialBody>{p.body}</SocialBody>
                      <SocialMeta>
                        <span>{timeAgo(p.published_at)}</span>
                        {p.interactions > 0 && <span>🔥 {p.interactions.toLocaleString()}</span>}
                        {(p.tickers_mentioned || []).slice(0, 3).map(t => (
                          <TokenChip key={t}>{t}</TokenChip>
                        ))}
                      </SocialMeta>
                    </SocialCard>
                  ))}
                </AnimatePresence>
              </CardList>
            )}

            <RefreshNote>
              Data refreshes automatically · Social: 5min · Articles: 10min · Macro: 12h · Voices: 1h
            </RefreshNote>
          </Feed>
        </Content>
      </Shell>
    </>
  )
}
