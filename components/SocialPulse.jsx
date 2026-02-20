'use client'

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import Link from 'next/link'

const c = {
  card: '#0d2134', cardHover: '#112940', primary: '#36a6ba',
  text: '#ffffff', textSec: '#a0b2c6', textMuted: '#6b7d8f',
  border: 'rgba(54,166,186,0.1)', bull: '#16c784', bear: '#ed4c5c', neutral: '#a0b2c6',
  gold: '#f1c40f',
}

const Section = styled.div`margin-top:2rem;`
const SectionHeader = styled.div`display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;`
const STitle = styled.h2`font-size:1.1rem;font-weight:700;color:${c.primary};display:flex;align-items:center;gap:0.5rem;`
const ViewAll = styled.a`font-size:0.8rem;color:${c.primary};text-decoration:none;font-weight:600;&:hover{text-decoration:underline;}`

const LiveDot = styled.span`display:inline-block;width:6px;height:6px;background:${c.bull};border-radius:50%;animation:pulse 2s infinite;@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}`

// AI Summary cards
const SumGrid = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:0.75rem;margin-bottom:1rem;`
const SumCard = styled.div`
  background:linear-gradient(135deg,${c.card} 0%,rgba(54,166,186,0.06) 100%);
  border:1px solid rgba(54,166,186,0.15);border-radius:10px;padding:0.875rem;position:relative;
  &::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,${c.primary},${c.bull});border-radius:10px 10px 0 0;}
`
const SumTopic = styled.div`font-size:0.65rem;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.375rem;`
const SumText = styled.div`font-size:0.78rem;color:${c.textSec};line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;`

// Viral posts row
const PostsScroll = styled.div`display:flex;gap:0.75rem;overflow-x:auto;padding-bottom:0.5rem;scroll-snap-type:x mandatory;&::-webkit-scrollbar{height:4px;}&::-webkit-scrollbar-thumb{background:rgba(54,166,186,0.3);border-radius:2px;}`
const MiniPost = styled(motion.div)`
  min-width:280px;max-width:320px;scroll-snap-align:start;background:${c.card};border:1px solid ${p => p.$vip ? 'rgba(241,196,15,0.25)' : c.border};
  border-radius:10px;padding:0.75rem;cursor:pointer;transition:all 0.2s;flex-shrink:0;
  &:hover{background:${c.cardHover};transform:translateY(-2px);}
`
const MiniHeader = styled.div`display:flex;align-items:center;gap:0.5rem;margin-bottom:0.375rem;`
const MiniAvatar = styled.img`width:24px;height:24px;border-radius:50%;object-fit:cover;`
const MiniName = styled.span`font-size:0.75rem;font-weight:700;color:${c.text};flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const MiniVip = styled.span`font-size:0.55rem;font-weight:700;color:${c.gold};background:rgba(241,196,15,0.15);padding:0.05rem 0.3rem;border-radius:3px;`
const MiniBody = styled.div`font-size:0.75rem;color:${c.textSec};line-height:1.4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:0.375rem;`
const MiniMeta = styled.div`display:flex;justify-content:space-between;font-size:0.65rem;color:${c.textMuted};`
const SentDot = styled.span`display:inline-block;width:6px;height:6px;border-radius:50%;background:${p => p.$s > 0 ? c.bull : p.$s < 0 ? c.bear : c.neutral};margin-right:4px;`

const EmptyMsg = styled.div`font-size:0.85rem;color:${c.textMuted};padding:1.5rem;text-align:center;`

export default function SocialPulse() {
  const [summaries, setSummaries] = useState([])
  const [posts, setPosts] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const [postsRes, sumsRes] = await Promise.all([
          fetch('/api/social/feed?limit=10&sort=interactions'),
          fetchSummaries(),
        ])
        const postsJson = await postsRes.json()
        setPosts(postsJson.posts || [])
        setSummaries(sumsRes)
      } catch (err) {
        console.error('SocialPulse error:', err)
      }
    }
    load()
  }, [])

  async function fetchSummaries() {
    try {
      const { supabaseBrowser } = await import('@/app/lib/supabaseBrowserClient')
      const supabase = supabaseBrowser()
      const { data } = await supabase
        .from('social_ai_summaries')
        .select('*')
        .in('topic', ['bitcoin', 'ethereum', 'solana'])
        .order('generated_at', { ascending: false })
        .limit(9)
      const seen = new Set()
      return (data || []).filter(s => { if (seen.has(s.topic)) return false; seen.add(s.topic); return true }).slice(0, 3)
    } catch { return [] }
  }

  const formatNum = (n) => {
    if (!n) return '0'
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
    return String(n)
  }

  const formatTime = (d) => {
    if (!d) return ''
    const s = Math.floor((Date.now() - new Date(d)) / 1000)
    if (s < 3600) return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    return `${Math.floor(s / 86400)}d`
  }

  if (summaries.length === 0 && posts.length === 0) return null

  return (
    <Section>
      <SectionHeader>
        <STitle><LiveDot />SOCIAL PULSE</STitle>
        <Link href="/community" passHref legacyBehavior><ViewAll>View full social feed →</ViewAll></Link>
      </SectionHeader>

      {/* AI Summaries */}
      {summaries.length > 0 && (
        <SumGrid>
          {summaries.map((s, i) => (
            <SumCard key={s.id || i}>
              <SumTopic>{s.topic} — AI Summary</SumTopic>
              <SumText>{s.summary}</SumText>
            </SumCard>
          ))}
        </SumGrid>
      )}

      {/* Top Viral Posts */}
      {posts.length > 0 ? (
        <PostsScroll>
          {posts.slice(0, 8).map((post, i) => {
            const isVip = post.category === 'tracked_creator'
            return (
              <MiniPost
                key={post.id || post.post_id}
                $vip={isVip}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => post.url && window.open(post.url, '_blank')}
              >
                <MiniHeader>
                  {post.creator_image && <MiniAvatar src={post.creator_image} alt="" onError={e => { e.target.style.display = 'none' }} />}
                  <MiniName>{post.creator_name || post.creator_screen_name || 'Crypto'}</MiniName>
                  {isVip && <MiniVip>★ VIP</MiniVip>}
                </MiniHeader>
                <MiniBody>{post.body || post.title || ''}</MiniBody>
                <MiniMeta>
                  <span><SentDot $s={post.sentiment || 0} />{formatNum(post.interactions)} interactions</span>
                  <span>{formatTime(post.published_at)}</span>
                </MiniMeta>
              </MiniPost>
            )
          })}
        </PostsScroll>
      ) : (
        <EmptyMsg>Social data populating — check back in a few hours.</EmptyMsg>
      )}
    </Section>
  )
}
