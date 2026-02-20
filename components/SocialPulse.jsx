'use client'

import React, { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { motion } from 'framer-motion'
import Link from 'next/link'

const MONO = "'SF Mono', 'Fira Code', 'Courier New', monospace"
const c = {
  panel: '#0b1724', panelHover: '#0e1e30', primary: '#36a6ba', accent: '#2ecc71',
  text: '#e8ecf1', textSec: '#8a9bb5', textMuted: '#556677',
  border: 'rgba(54,166,186,0.12)', bull: '#2ecc71', bear: '#e74c3c', neutral: '#8a9bb5', gold: '#f0b90b',
}
const pulse = keyframes`0%,100%{opacity:1;}50%{opacity:0.3;}`

const Section = styled.div`max-width:1440px;margin:1.5rem auto 0;padding:0 2rem;`
const Header = styled.div`display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;`
const STitle = styled.div`font-size:0.8rem;font-weight:700;color:${c.primary};font-family:${MONO};text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;gap:0.5rem;`
const LiveDot = styled.span`width:6px;height:6px;background:${c.accent};border-radius:50%;display:inline-block;animation:${pulse} 2s infinite;`
const ViewLink = styled.a`font-size:0.7rem;color:${c.primary};font-family:${MONO};text-decoration:none;text-transform:uppercase;&:hover{text-decoration:underline;}`

const SumGrid = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:0.6rem;margin-bottom:0.75rem;`
const SumCard = styled.div`
  background:${c.panel};border:1px solid ${c.border};border-top:2px solid ${c.primary};border-radius:4px;padding:0.75rem 0.875rem;
`
const SumLabel = styled.div`font-size:0.6rem;font-weight:700;color:${c.primary};font-family:${MONO};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.375rem;`
const SumText = styled.div`font-size:0.75rem;color:${c.textSec};line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;`

const Scroll = styled.div`display:flex;gap:0.5rem;overflow-x:auto;padding-bottom:0.375rem;scroll-snap-type:x mandatory;&::-webkit-scrollbar{height:3px;}&::-webkit-scrollbar-thumb{background:rgba(54,166,186,0.2);border-radius:2px;}`
const MiniPost = styled(motion.div)`
  min-width:260px;max-width:300px;scroll-snap-align:start;background:${c.panel};
  border:1px solid ${p => p.$vip ? 'rgba(240,185,11,0.2)' : c.border};
  border-left:3px solid ${p => p.$s > 0 ? c.bull : p.$s < 0 ? c.bear : 'rgba(54,166,186,0.15)'};
  border-radius:4px;padding:0.625rem 0.75rem;cursor:pointer;transition:all 0.15s;flex-shrink:0;
  &:hover{background:${c.panelHover};}
`
const MTop = styled.div`display:flex;align-items:center;gap:0.375rem;margin-bottom:0.25rem;`
const MAvi = styled.img`width:20px;height:20px;border-radius:3px;object-fit:cover;`
const MName = styled.span`font-size:0.7rem;font-weight:700;color:${c.text};flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const MVip = styled.span`font-size:0.5rem;font-weight:700;color:${c.gold};font-family:${MONO};`
const MBody = styled.div`font-size:0.7rem;color:${c.textSec};line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:0.25rem;`
const MMeta = styled.div`display:flex;justify-content:space-between;font-size:0.6rem;color:${c.textMuted};font-family:${MONO};`
const SentDot = styled.span`width:6px;height:6px;border-radius:2px;display:inline-block;background:${p => p.$s > 0 ? c.bull : p.$s < 0 ? c.bear : c.neutral};margin-right:0.25rem;`

export default function SocialPulse() {
  const [summaries, setSummaries] = useState([])
  const [posts, setPosts] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const [pRes, sums] = await Promise.all([
          fetch('/api/social/feed?limit=10&sort=interactions'),
          fetchSums(),
        ])
        setPosts((await pRes.json()).posts || [])
        setSummaries(sums)
      } catch {}
    }
    load()
  }, [])

  async function fetchSums() {
    try {
      const { supabaseBrowser } = await import('@/app/lib/supabaseBrowserClient')
      const sb = supabaseBrowser()
      const { data } = await sb.from('social_ai_summaries').select('*').in('topic', ['bitcoin', 'ethereum', 'solana']).order('generated_at', { ascending: false }).limit(9)
      const seen = new Set()
      return (data || []).filter(s => { if (seen.has(s.topic)) return false; seen.add(s.topic); return true }).slice(0, 3)
    } catch { return [] }
  }

  const fmt = n => { if (!n) return '0'; if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'; return String(n) }
  const ago = d => { if (!d) return ''; const s = Math.floor((Date.now() - new Date(d)) / 1000); if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h'; return Math.floor(s / 86400) + 'd' }

  if (summaries.length === 0 && posts.length === 0) return null

  return (
    <Section>
      <Header>
        <STitle><LiveDot />SOCIAL_PULSE</STitle>
        <Link href="/community" passHref legacyBehavior><ViewLink>VIEW FULL FEED &rarr;</ViewLink></Link>
      </Header>

      {summaries.length > 0 && (
        <SumGrid>
          {summaries.map((s, i) => (
            <SumCard key={s.id || i}>
              <SumLabel>AI_BRIEF // {s.topic}</SumLabel>
              <SumText>{s.summary}</SumText>
            </SumCard>
          ))}
        </SumGrid>
      )}

      {posts.length > 0 && (
        <Scroll>
          {posts.slice(0, 8).map((p, i) => {
            const vip = p.category === 'tracked_creator'
            const s = p.sentiment || 0
            return (
              <MiniPost key={p.id || p.post_id} $vip={vip} $s={s}
                initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => p.url && window.open(p.url, '_blank')}>
                <MTop>
                  {p.creator_image && <MAvi src={p.creator_image} alt="" onError={e => { e.target.style.display = 'none' }} />}
                  <MName>{p.creator_name || p.creator_screen_name || 'anon'}</MName>
                  {vip && <MVip>TRACKED</MVip>}
                </MTop>
                <MBody>{p.body || p.title || ''}</MBody>
                <MMeta>
                  <span><SentDot $s={s} />{fmt(p.interactions)} interactions</span>
                  <span>{ago(p.published_at)}</span>
                </MMeta>
              </MiniPost>
            )
          })}
        </Scroll>
      )}
    </Section>
  )
}
