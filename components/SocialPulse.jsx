'use client'
/**
 * Dashboard strip: the most-shared crypto posts of the last 48 h from the
 * topics Sonar ingests (social_posts). Sentiment is LunarCrush's 1–5 scale,
 * read with the /news thresholds (≥ 3.6 bullish, ≤ 2.4 bearish).
 */
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import Link from 'next/link'

const MONO = "'SF Mono', 'Fira Code', 'Courier New', monospace"
const c = {
  panel: '#0b1724', panelHover: '#0e1e30', primary: '#36a6ba', accent: '#2ecc71',
  text: '#e8ecf1', textSec: '#8a9bb5', textMuted: '#556677',
  border: 'rgba(54,166,186,0.12)', bull: '#2ecc71', bear: '#e74c3c', neutral: '#8a9bb5', gold: '#f0b90b',
}

const Section = styled.div`max-width:1440px;margin:1.5rem auto 0;padding:0 2rem;`
const Header = styled.div`display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;`
const STitle = styled.h2`margin:0;font-size:0.95rem;font-weight:600;color:${c.text};display:flex;align-items:baseline;gap:0.6rem;span{font-size:0.75rem;font-weight:400;color:${c.textSec};}`
const ViewLink = styled.a`font-size:0.7rem;color:${c.primary};font-family:${MONO};text-decoration:none;text-transform:uppercase;&:hover{text-decoration:underline;}`

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

// 1–5 sentiment → tone, as on /news.
function tone(sentiment) {
  const n = Number(sentiment)
  if (!Number.isFinite(n) || n <= 1) return 0
  if (n >= 3.6) return 1
  if (n <= 2.4) return -1
  return 0
}

export default function SocialPulse() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/social/feed?limit=10&sort=interactions&since=48h')
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((j) => { if (!cancelled) setPosts(j.posts || []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const fmt = n => { if (!n) return '0'; if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'; return String(n) }
  const ago = d => { if (!d) return ''; const s = Math.floor((Date.now() - new Date(d)) / 1000); if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h'; return Math.floor(s / 86400) + 'd' }

  if (posts.length === 0) return null

  return (
    <Section>
      <Header>
        <STitle>Social pulse <span>most-shared posts, last 48 h</span></STitle>
        <Link href="/news" passHref legacyBehavior><ViewLink>VIEW FULL FEED &rarr;</ViewLink></Link>
      </Header>

      {posts.length > 0 && (
        <Scroll>
          {posts.slice(0, 8).map((p, i) => {
            const vip = p.category === 'tracked_creator'
            const s = tone(p.sentiment)
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
