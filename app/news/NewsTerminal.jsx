'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import styled, { keyframes, createGlobalStyle } from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { isCryptoRelevant } from '@/lib/crypto-relevance-filter'

// ─── DESIGN DIRECTION ───────────────────────────────────────────────
// The one deliberately-open decision from the design handoff:
//   'serif' → Direction A (Newsreader, warm paper) — newspaper authority
//   'sans'  → Direction B (Libre Franklin, cool paper) — terminal/markets
// Flip this single constant to switch the whole headline treatment.
const DIR = 'serif'
const PAPER = DIR === 'sans' ? '#FAFAFB' : '#FAF8F4'
const HL = DIR === 'sans' ? "'Libre Franklin', sans-serif" : "'Newsreader', serif"
const HL_WEIGHT = DIR === 'sans' ? 800 : 600
const FEED_WEIGHT = DIR === 'sans' ? 700 : 600

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"

// ─── DESIGN TOKENS (from handoff README) ────────────────────────────
const K = {
  paper: PAPER,
  cardWhite: '#FFFFFF',
  chartCard: '#FBFBFC',
  dark: '#0B0D11',
  darkTicker: '#101319',
  ink: '#15171C',
  ink2: '#1A1C21',
  ink3: '#22252B',
  body: '#41454C',
  body2: '#3A3E45',
  muted: '#5C5F66',
  muted2: '#646A73',
  muted3: '#7A818B',
  muted4: '#9AA0A8',
  teal: '#1FB6A6',
  live: '#2ED88B',
  posText: '#15803D', posBg: 'rgba(21,128,61,0.10)', posBar: 'rgba(21,128,61,0.55)',
  negText: '#C2371F', negBg: 'rgba(194,55,31,0.10)', negBar: 'rgba(194,55,31,0.55)',
  neuText: '#6B7280', neuBg: 'rgba(0,0,0,0.05)', neuBar: 'rgba(0,0,0,0.13)',
  posDark: '#2ED88B', negDark: '#FF5C4D',
}

const BREAK = 1100

// ─── FILTERS ────────────────────────────────────────────────────────
const TABS = [
  { key: 'articles', label: 'ARTICLES' },
  { key: 'social', label: 'SOCIAL' },
]

// Token chips shown in the toolbar. `tokens` drives feed filtering; full
// project names let a headline like "Bitcoin slips" match the BTC chip even
// when ingested under a single ticker.
const TOKEN_CHIPS = [
  { key: 'all', label: 'ALL', tokens: null },
  { key: 'btc', label: 'BTC', tokens: ['BTC', 'WBTC'] },
  { key: 'eth', label: 'ETH', tokens: ['ETH', 'UNI', 'AAVE', 'LINK', 'MKR', 'LDO', 'ENS', 'ARB', 'OP'] },
  { key: 'sol', label: 'SOL', tokens: ['SOL', 'JUP', 'RAY', 'BONK', 'WIF', 'PYTH', 'JTO'] },
  { key: 'defi', label: 'DEFI', tokens: ['UNI', 'AAVE', 'MKR', 'LDO', 'CRV', 'COMP', 'SNX', 'SUSHI', 'DYDX', 'INJ'] },
  { key: 'meme', label: 'MEMES', tokens: ['DOGE', 'SHIB', 'PEPE', 'BONK', 'WIF', 'FLOKI'] },
  { key: 'ai', label: 'AI', tokens: ['FET', 'RENDER', 'OCEAN', 'TAO'] },
]

const SENTIMENTS = [
  { key: 'all', label: 'ALL' },
  { key: 'bullish', label: '▲ BULL' },
  { key: 'bearish', label: '▼ BEAR' },
]

const TOKEN_NAMES = {
  BTC: ['bitcoin'], WBTC: ['wrapped bitcoin'],
  ETH: ['ethereum', 'ether'], UNI: ['uniswap'], AAVE: ['aave'], LINK: ['chainlink'],
  MKR: ['maker', 'makerdao'], LDO: ['lido'], ENS: ['ethereum name service'],
  ARB: ['arbitrum'], OP: ['optimism'],
  SOL: ['solana'], JUP: ['jupiter exchange'], RAY: ['raydium'], BONK: ['bonk'],
  WIF: ['dogwifhat'], PYTH: ['pyth'], JTO: ['jito'],
  CRV: ['curve finance'], COMP: ['compound'], SNX: ['synthetix'], SUSHI: ['sushiswap'],
  DYDX: ['dydx'], INJ: ['injective'],
  DOGE: ['dogecoin'], SHIB: ['shiba inu'], PEPE: ['pepe coin', 'pepecoin'], FLOKI: ['floki'],
  FET: ['fetch.ai', 'fetch ai'], RENDER: ['render network'], OCEAN: ['ocean protocol'], TAO: ['bittensor'],
}

// True if the article belongs to a token group: tagged instrument matches, OR the
// headline/description names one of the group's tokens (symbol or full name).
function articleMatchesTokens(article, tokens) {
  const codes = (article.instruments || []).map((i) => String(i.code).toUpperCase())
  if (codes.some((c) => tokens.includes(c))) return true
  const text = `${article.title || ''} ${article.description || ''}`
  const lower = text.toLowerCase()
  for (const t of tokens) {
    if (new RegExp(`\\b${t}\\b`, 'i').test(text)) return true
    const names = TOKEN_NAMES[t]
    if (names && names.some((n) => lower.includes(n))) return true
  }
  return false
}

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
  if (item.sentiment_llm != null && item.sentiment_llm !== 0) {
    if (item.sentiment_llm > 0.15) return 'bullish'
    if (item.sentiment_llm < -0.15) return 'bearish'
    return 'neutral'
  }
  const text = `${item.title || ''} ${item.description || ''} ${item.body || ''}`.toLowerCase()
  const bull = ['surge', 'rally', 'soar', 'bullish', 'pump', 'record high', 'all-time high', 'adoption', 'approval',
    'etf inflow', 'accumulation', 'inflows', 'buying', 'breakout', 'rise', 'gain', 'profitable', 'bottom is in',
    'set to rise', 'eyes', 'recovery', 'rebound', 'momentum', 'upgrade', 'growth', 'outperform', 'targets', 'milestone']
  const bear = ['crash', 'plunge', 'bearish', 'dump', 'sell-off', 'sec charges', 'hack', 'exploit', 'fraud', 'ban',
    'outflow', 'drop', 'decline', 'collapse', 'threat', 'warn', 'risk', 'lawsuit', 'investigation', 'crackdown',
    'liquidat', 'panic', 'fear', 'plummet', 'obliterate', 'sanction', 'tariff', 'war', 'attack', 'slash']
  const bs = bull.filter((w) => text.includes(w)).length
  const brs = bear.filter((w) => text.includes(w)).length
  if (bs > brs) return 'bullish'
  if (brs > bs) return 'bearish'
  return 'neutral'
}

// Tradable symbols on the rail — a breaking story charts cleanly when it maps to one.
const RAIL_SYMS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'LINK']
const RAIL_SET = new Set(RAIL_SYMS)

// Market-moving signals that make a story "breaking" rather than background chatter.
const IMPORTANCE_KEYWORDS = [
  'fomc', 'federal reserve', 'fed ', 'rate cut', 'rate hike', 'interest rate', 'inflation',
  'cpi', 'pce', 'jobs report', 'powell', 'treasury', 'etf', 'blackrock', 'ibit', 'fbtc',
  'sec ', 'lawsuit', 'approval', 'halving', 'liquidation', 'all-time high', 'record high',
  'hack', 'exploit', 'inflow', 'outflow', 'spot etf', 'tariff', 'sanction', 'default',
]
const STRONG_SOURCES = [
  'cointelegraph', 'coindesk', 'the block', 'blockworks', 'decrypt', 'bloomberg', 'reuters',
  'cnbc', 'wall street journal', 'financial times', 'forbes', 'the defiant',
]

// Rank a story's fitness to headline the breaking hero (higher = more important).
// Excludes social posts; rewards macro keywords, a chartable token, clear
// sentiment, a reputable source, and recency.
function importanceScore(article) {
  if (!article || !article.title) return -Infinity
  const text = `${article.title} ${article.description || ''}`.toLowerCase()
  const codes = (article.instruments || []).map((i) => String(i.code).toUpperCase())
  let score = 0
  if (codes.some((c) => RAIL_SET.has(c))) score += 4
  else if (codes.length) score += 1
  let kw = 0
  for (const k of IMPORTANCE_KEYWORDS) if (text.includes(k)) kw++
  score += Math.min(kw, 4) * 2
  if (guessSentiment(article) !== 'neutral') score += 2
  const src = (article.source || '').toLowerCase()
  if (STRONG_SOURCES.some((s) => src.includes(s))) score += 2
  const ageH = article.published_at ? (Date.now() - new Date(article.published_at).getTime()) / 3.6e6 : 999
  if (ageH < 3) score += 4
  else if (ageH < 8) score += 3
  else if (ageH < 16) score += 2
  else if (ageH < 36) score += 1
  if (article.kind === 'x-post' || article.kind === 'social') score -= 8
  return score
}

// social_posts.sentiment is LunarCrush's 1–5 scale (1 bearish · 3 neutral · 5 bullish).
function socialSentiment(post) {
  const raw = post.sentiment
  if (raw != null && !Number.isNaN(Number(raw))) {
    const n = Number(raw)
    if (n >= 3.6) return 'bullish'
    if (n <= 2.4) return 'bearish'
    if (n > 1 && n < 3.6) return 'neutral'
    // already on a [-1,1] scale
    if (n > 0.15) return 'bullish'
    if (n < -0.15) return 'bearish'
    return 'neutral'
  }
  return guessSentiment({ body: post.body })
}

function fmtPrice(p) {
  if (p == null || !Number.isFinite(p)) return '—'
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (p >= 1) return p.toFixed(2)
  return p.toFixed(4)
}

function spark(series, w, h) {
  if (!series || series.length < 2) return ''
  const min = Math.min(...series)
  const max = Math.max(...series)
  const r = max - min || 1
  return series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * w
      const y = h - ((v - min) / r) * (h - 3) - 1.5
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function buildPaths(series, w, h) {
  if (!series || series.length < 2) return { line: '', area: '', min: 0, max: 0 }
  const min = Math.min(...series)
  const max = Math.max(...series)
  const r = max - min || 1
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * w
    const y = h - ((v - min) / r) * (h - 12) - 6
    return [x, y]
  })
  const line = 'M ' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')
  const area = `${line} L ${w} ${h} L 0 ${h} Z`
  return { line, area, min, max }
}

function indexTheme(value) {
  if (value == null) return { color: '#FF8A4D', grad: 'linear-gradient(90deg,#FF5C4D,#FF8A4D)' }
  if (value < 45) return { color: '#FF8A4D', grad: 'linear-gradient(90deg,#FF5C4D,#FF8A4D)' }
  if (value <= 55) return { color: '#9AA0A8', grad: 'linear-gradient(90deg,#8A9099,#C7CCD2)' }
  return { color: '#2ED88B', grad: 'linear-gradient(90deg,#2BAE6E,#2ED88B)' }
}

const SENT = {
  bullish: { label: 'BULLISH', text: K.posText, bg: K.posBg, bar: K.posBar, dark: K.posDark },
  bearish: { label: 'BEARISH', text: K.negText, bg: K.negBg, bar: K.negBar, dark: K.negDark },
  neutral: { label: 'NEUTRAL', text: K.neuText, bg: K.neuBg, bar: K.neuBar, dark: K.muted4 },
}

const ECOSYSTEM_BY_KEY = Object.fromEntries(TOKEN_CHIPS.map((t) => [t.key, t.tokens]))

// ─── ANIMATIONS ─────────────────────────────────────────────────────
const marquee = keyframes`from{transform:translateX(0)}to{transform:translateX(-50%)}`
const pulse = keyframes`0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.82)}`
const shimmer = keyframes`0%{background-position:-200% 0}100%{background-position:200% 0}`

const Fonts = createGlobalStyle`
  .son-root *::-webkit-scrollbar{width:8px;height:8px}
  .son-root *::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.14);border-radius:8px}
  .son-rail-dark::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12)}
`

// ─── STYLED COMPONENTS ──────────────────────────────────────────────
const Root = styled.div`
  width: 100%;
  min-height: 100vh;
  background: ${K.paper};
  font-family: ${BODY};
  color: #17191e;
`

// Header
const Header = styled.header`
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 56px; background: ${K.dark};
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  position: sticky; top: 0; z-index: 20;
  @media (max-width: 640px) { padding: 0 14px; }
`
const Brand = styled.div`display: flex; align-items: center; gap: 14px;`
const BrandName = styled.span`font-family: ${MONO}; font-weight: 600; font-size: 16px; letter-spacing: 0.14em; color: #f4f5f6;`
const BrandSlash = styled.span`
  font-family: ${MONO}; font-weight: 500; font-size: 13px; letter-spacing: 0.18em; color: ${K.teal};
  @media (max-width: 520px) { display: none; }
`
const LiveTag = styled.span`display: inline-flex; align-items: center; gap: 6px; margin-left: 6px;`
const LiveDot = styled.span`width: 7px; height: 7px; border-radius: 50%; background: ${K.live}; animation: ${pulse} 1.6s ease-in-out infinite;`
const LiveText = styled.span`font-family: ${MONO}; font-size: 11px; letter-spacing: 0.16em; color: ${K.live};`
const HeaderRight = styled.div`display: flex; align-items: center; gap: 18px;`
const Search = styled.div`
  display: flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 3px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.09); width: 280px;
  &:focus-within { border-color: rgba(31, 182, 166, 0.5); }
  @media (max-width: 900px) { width: 180px; }
  @media (max-width: 640px) { display: none; }
`
const SearchInput = styled.input`
  background: transparent; border: none; outline: none; width: 100%;
  font-family: ${MONO}; font-size: 12px; color: #c7ccd2;
  &::placeholder { color: #5a6068; }
`
const Clock = styled.span`
  font-family: ${MONO}; font-size: 11px; letter-spacing: 0.08em; color: #6a707a; white-space: nowrap;
  @media (max-width: 420px) { display: none; }
`

// Ticker
const TickerStrip = styled.div`height: 38px; background: ${K.darkTicker}; border-bottom: 1px solid rgba(255, 255, 255, 0.06); overflow: hidden; display: flex; align-items: center;`
const TickerTrack = styled.div`display: flex; width: max-content; animation: ${marquee} 32s linear infinite;`
const TickerItem = styled.span`
  display: inline-flex; align-items: center; gap: 8px; padding: 0 22px;
  border-right: 1px solid rgba(255, 255, 255, 0.06); font-family: ${MONO}; font-size: 12px; white-space: nowrap;
`
const TSym = styled.span`color: #c7ccd2; font-weight: 600; letter-spacing: 0.05em;`
const TPrice = styled.span`color: #9097a0;`
const TPct = styled.span`color: ${(p) => p.$c};`

// Body layout
const Body = styled.div`
  display: flex; align-items: stretch;
  @media (max-width: ${BREAK}px) { flex-direction: column; }
`

// Left market rail (dark)
const Rail = styled.aside`
  width: 262px; flex: none; background: ${K.dark}; border-right: 1px solid rgba(255, 255, 255, 0.06);
  padding: 18px 16px 28px;
  @media (max-width: ${BREAK}px) {
    width: 100%;
    border-right: none; border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
`
const RailHead = styled.div`display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;`
const RailLabel = styled.span`font-family: ${MONO}; font-size: 11px; letter-spacing: 0.2em; color: #8a9099;`
const RailLive = styled.span`font-family: ${MONO}; font-size: 10px; letter-spacing: 0.16em; color: ${K.live};`
const IndexCard = styled.div`padding: 12px 13px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 4px; margin-bottom: 18px;`
const IndexTop = styled.div`display: flex; align-items: baseline; justify-content: space-between;`
const IndexName = styled.span`font-family: ${MONO}; font-size: 10px; letter-spacing: 0.14em; color: #7a818b;`
const IndexState = styled.span`font-family: ${MONO}; font-size: 11px; color: ${(p) => p.$c}; letter-spacing: 0.08em;`
const IndexRow = styled.div`display: flex; align-items: baseline; gap: 6px; margin: 5px 0 9px;`
const IndexValue = styled.span`font-family: ${MONO}; font-size: 26px; font-weight: 600; color: #f1f2f4;`
const IndexDelta = styled.span`font-family: ${MONO}; font-size: 11px; color: ${(p) => p.$c};`
const IndexBarTrack = styled.div`height: 4px; border-radius: 3px; background: rgba(255, 255, 255, 0.08); overflow: hidden;`
const IndexBarFill = styled.div`width: ${(p) => p.$w}%; height: 100%; background: ${(p) => p.$g};`
const RailCoins = styled.div`
  @media (max-width: ${BREAK}px) { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 20px; }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`
const CoinRow = styled.div`display: flex; align-items: center; gap: 10px; padding: 11px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.055);`
const CoinId = styled.div`width: 54px; flex: none;`
const CoinSym = styled.div`font-family: ${MONO}; font-size: 13px; font-weight: 600; color: #e7e9ec; letter-spacing: 0.04em;`
const CoinName = styled.div`font-size: 10px; color: #6e747e; margin-top: 1px;`
const CoinRight = styled.div`flex: 1; text-align: right;`
const CoinPrice = styled.div`font-family: ${MONO}; font-size: 12px; color: #d3d7dc;`
const CoinPct = styled.div`font-family: ${MONO}; font-size: 11px; color: ${(p) => p.$c}; margin-top: 1px;`

// Light area
const Light = styled.div`flex: 1; min-width: 0; display: flex; flex-direction: column; background: ${K.paper};`
const Toolbar = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 18px;
  padding: 11px 26px; background: ${K.paper}; border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  position: sticky; top: 56px; z-index: 12;
  @media (max-width: ${BREAK}px) { top: 0; }
  @media (max-width: 760px) { flex-direction: column; align-items: stretch; gap: 10px; padding: 11px 16px; }
`
const ToolbarLeft = styled.div`
  display: flex; align-items: center; gap: 18px;
  @media (max-width: 760px) { flex-wrap: wrap; gap: 10px; }
`
const TabGroup = styled.div`display: flex; gap: 4px;`
const TabBtn = styled.button`
  font-family: ${MONO}; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; padding: 7px 12px;
  border-radius: 4px; cursor: pointer; border: none; transition: all 0.12s;
  background: ${(p) => (p.$on ? K.ink : 'transparent')}; color: ${(p) => (p.$on ? '#fff' : K.body2)};
  span { opacity: 0.55; font-size: 11px; }
`
const Divider = styled.div`width: 1px; height: 20px; background: rgba(0, 0, 0, 0.12); @media (max-width: 760px) { display: none; }`
const ChipGroup = styled.div`display: flex; gap: 6px; flex-wrap: wrap;`
const Chip = styled.button`
  font-family: ${MONO}; font-size: 11px; font-weight: 500; letter-spacing: 0.06em; padding: 6px 11px;
  border-radius: 4px; cursor: pointer; transition: all 0.12s;
  background: ${(p) => (p.$on ? K.ink : 'transparent')};
  color: ${(p) => (p.$on ? '#fff' : K.ink3)};
  border: 1px solid ${(p) => (p.$on ? K.ink : 'rgba(0,0,0,0.18)')};
`
const SentGroup = styled.div`display: flex; gap: 6px; flex: none;`
const SentBtn = styled.button`
  font-family: ${MONO}; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; padding: 6px 11px;
  border-radius: 4px; cursor: pointer; transition: all 0.12s;
  background: ${(p) => (p.$on ? p.$color : 'transparent')};
  color: ${(p) => (p.$on ? '#fff' : p.$key === 'all' ? K.ink3 : p.$color)};
  border: 1px solid ${(p) => (p.$on ? p.$color : p.$border)};
`

const ContentRow = styled.div`
  display: flex; align-items: flex-start;
  @media (max-width: ${BREAK}px) { flex-direction: column; }
`
const Center = styled.main`
  flex: 1; min-width: 0; padding: 24px 26px 40px;
  @media (max-width: 760px) { padding: 18px 16px 32px; }
`

// Breaking hero
const Hero = styled.div`
  border: 1px solid rgba(0, 0, 0, 0.11); border-radius: 5px; background: ${K.cardWhite};
  overflow: hidden; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); margin-bottom: 18px;
`
const HeroTop = styled.div`display: flex; align-items: center; justify-content: space-between; padding: 11px 18px; border-bottom: 1px solid rgba(0, 0, 0, 0.08); background: ${K.dark};`
const BreakingPill = styled.span`
  display: inline-flex; align-items: center; gap: 6px; background: ${(p) => p.$c}; color: #fff;
  font-family: ${MONO}; font-size: 10px; font-weight: 600; letter-spacing: 0.16em; padding: 4px 9px; border-radius: 3px;
`
const BreakingDot = styled.span`width: 6px; height: 6px; border-radius: 50%; background: #fff; animation: ${pulse} 1.4s ease-in-out infinite;`
const HeroTime = styled.span`font-family: ${MONO}; font-size: 11px; color: #8a9099; letter-spacing: 0.08em;`
const HeroTokens = styled.span`display: flex; gap: 5px;`
const HeroTokenChip = styled.span`font-family: ${MONO}; font-size: 10px; color: ${K.teal}; border: 1px solid rgba(31, 182, 166, 0.4); padding: 3px 7px; border-radius: 3px; letter-spacing: 0.06em;`
const HeroBody = styled.a`
  display: flex; gap: 26px; padding: 24px 24px 26px; text-decoration: none; color: inherit;
  @media (max-width: 760px) { flex-direction: column; gap: 18px; padding: 20px 18px 22px; }
`
const HeroLeft = styled.div`flex: 1; min-width: 0;`
const HeroTitle = styled.h1`font-family: ${HL}; font-weight: ${HL_WEIGHT}; font-size: 33px; line-height: 1.14; letter-spacing: -0.01em; margin: 0 0 12px; color: ${K.ink}; @media (max-width: 760px) { font-size: 26px; }`
const HeroSummary = styled.p`font-size: 15.5px; line-height: 1.6; color: ${K.body}; margin: 0 0 18px;`
const WhyBox = styled.div`border-left: 3px solid ${(p) => p.$c}; background: ${(p) => p.$bg}; padding: 12px 16px; border-radius: 0 4px 4px 0;`
const WhyLabel = styled.div`font-family: ${MONO}; font-size: 10px; letter-spacing: 0.16em; color: ${(p) => p.$c}; margin-bottom: 6px;`
const WhyText = styled.p`font-size: 14px; line-height: 1.55; color: ${K.body2}; margin: 0;`
const ChartCard = styled.div`width: 312px; flex: none; border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 5px; padding: 16px; background: ${K.chartCard}; @media (max-width: 760px) { width: 100%; }`
const ChartTop = styled.div`display: flex; align-items: baseline; justify-content: space-between;`
const ChartLabel = styled.span`font-family: ${MONO}; font-size: 12px; color: ${K.muted}; letter-spacing: 0.06em;`
const ChartSent = styled.span`display: inline-flex; align-items: center; gap: 5px; font-family: ${MONO}; font-size: 10px; color: ${(p) => p.$c}; background: ${(p) => p.$bg}; padding: 3px 8px; border-radius: 3px; letter-spacing: 0.08em;`
const ChartPriceRow = styled.div`display: flex; align-items: baseline; gap: 9px; margin: 8px 0 14px;`
const ChartPrice = styled.span`font-family: ${MONO}; font-size: 30px; font-weight: 600; color: ${K.ink};`
const ChartPct = styled.span`font-family: ${MONO}; font-size: 14px; color: ${(p) => p.$c};`
const ChartFoot = styled.div`display: flex; justify-content: space-between; margin-top: 8px; font-family: ${MONO}; font-size: 10px; color: ${K.muted4}; letter-spacing: 0.04em;`

// Feed
const FeedHead = styled.div`display: flex; align-items: center; gap: 10px; margin: 30px 0 4px;`
const FeedLabel = styled.span`font-family: ${MONO}; font-size: 11px; letter-spacing: 0.2em; color: ${K.muted3};`
const FeedRule = styled.span`flex: 1; height: 1px; background: rgba(0, 0, 0, 0.12);`
const FeedCount = styled.span`font-family: ${MONO}; font-size: 11px; color: ${K.muted4};`
const Row = styled.div`
  display: flex; gap: 16px; padding: 17px 6px 17px 16px; border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  border-left: 2px solid ${(p) => p.$bar}; cursor: pointer; text-decoration: none; color: inherit; transition: background 0.12s;
  &:hover { background: rgba(0, 0, 0, 0.022); }
`
const RowTitle = styled.div`font-family: ${HL}; font-weight: ${FEED_WEIGHT}; font-size: 18.5px; line-height: 1.26; letter-spacing: -0.005em; color: ${K.ink2};`
const RowBody = styled.div`font-size: 13.5px; line-height: 1.5; color: #5a5e66; margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;`
const RowMeta = styled.div`display: flex; align-items: center; gap: 11px; margin-top: 10px; flex-wrap: wrap;`
const RowByline = styled.span`font-family: ${MONO}; font-size: 11px; color: #7e848d; letter-spacing: 0.04em;`
const RowSent = styled.span`font-family: ${MONO}; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; padding: 3px 8px; border-radius: 3px; color: ${(p) => p.$c}; background: ${(p) => p.$bg};`
const RowToken = styled.span`font-family: ${MONO}; font-size: 10px; color: ${K.neuText}; border: 1px solid rgba(0, 0, 0, 0.16); padding: 3px 7px; border-radius: 3px; letter-spacing: 0.04em;`
const Empty = styled.div`padding: 48px 12px; text-align: center; font-family: ${MONO}; font-size: 13px; color: ${K.muted4};`

// Right rail (light)
const RightRail = styled.aside`
  width: 322px; flex: none; border-left: 1px solid rgba(0, 0, 0, 0.1); padding: 24px 22px 40px; background: rgba(0, 0, 0, 0.012);
  @media (max-width: ${BREAK}px) { width: 100%; border-left: none; border-top: 1px solid rgba(0, 0, 0, 0.1); }
`
const SecHead = styled.div`display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;`
const SecLabel = styled.span`font-family: ${MONO}; font-size: 11px; letter-spacing: 0.2em; color: ${K.muted3};`
const SecBadge = styled.span`font-family: ${MONO}; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; color: ${(p) => p.$c}; background: ${(p) => p.$bg}; padding: 3px 8px; border-radius: 3px;`
const SecLive = styled.span`font-family: ${MONO}; font-size: 10px; letter-spacing: 0.14em; color: #2bae6e;`
const Block = styled.div`margin-bottom: 30px;`
const MacroItem = styled.div`padding: 11px 0; border-bottom: 1px solid rgba(0, 0, 0, 0.08);`
const MacroTop = styled.div`display: flex; align-items: center; gap: 8px;`
const Dot = styled.span`width: 7px; height: 7px; border-radius: 50%; flex: none; background: ${(p) => p.$c};`
const MacroTitle = styled.span`font-family: ${HL}; font-weight: 600; font-size: 14px; color: ${K.ink3}; line-height: 1.2;`
const MacroDesc = styled.div`font-size: 12px; line-height: 1.5; color: ${K.muted2}; margin-top: 5px; padding-left: 15px;`
const VoiceItem = styled.div`padding: 13px 0; border-bottom: 1px solid rgba(0, 0, 0, 0.08);`
const VoiceTop = styled.div`display: flex; align-items: baseline; gap: 7px;`
const VoiceName = styled.span`font-family: ${HL}; font-weight: 700; font-size: 13.5px; color: ${K.ink3};`
const VoiceHandle = styled.span`font-family: ${MONO}; font-size: 11px; color: #9097a0;`
const VoiceQuote = styled.p`font-style: italic; font-size: 13.5px; line-height: 1.5; color: #43474e; margin: 7px 0;`
const VoiceFoot = styled.div`display: flex; align-items: center; justify-content: space-between;`
const VoiceCtx = styled.span`font-family: ${MONO}; font-size: 10px; color: #8a9099; letter-spacing: 0.04em;`
const VoiceDate = styled.span`font-family: ${MONO}; font-size: 10px; color: #a2a8b0;`
const OrcaCard = styled.div`border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 6px; padding: 16px; background: ${K.dark};`
const OrcaTop = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 11px;`
const OrcaDot = styled.span`width: 8px; height: 8px; border-radius: 50%; background: ${K.teal};`
const OrcaLabel = styled.span`font-family: ${MONO}; font-size: 11px; letter-spacing: 0.18em; color: #c7ccd2;`
const OrcaInputWrap = styled.form`display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 4px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 11px; &:focus-within { border-color: rgba(31, 182, 166, 0.5); }`
const OrcaInput = styled.input`background: transparent; border: none; outline: none; width: 100%; font-family: ${MONO}; font-size: 12px; color: #c7ccd2; &::placeholder { color: #5e646d; }`
const OrcaChips = styled.div`display: flex; flex-wrap: wrap; gap: 6px;`
const OrcaChip = styled.button`font-family: ${MONO}; font-size: 10px; color: #9097a0; border: 1px solid rgba(255, 255, 255, 0.12); padding: 4px 9px; border-radius: 20px; background: transparent; cursor: pointer; transition: all 0.12s; &:hover { color: ${K.teal}; border-color: rgba(31, 182, 166, 0.5); }`

// Skeletons
const Sk = styled.div`height: ${(p) => p.$h || '12px'}; width: ${(p) => p.$w || '100%'}; border-radius: 3px; margin-bottom: ${(p) => p.$mb || '0'}; background: linear-gradient(90deg, rgba(0, 0, 0, 0.04) 25%, rgba(0, 0, 0, 0.08) 50%, rgba(0, 0, 0, 0.04) 75%); background-size: 200% 100%; animation: ${shimmer} 1.5s ease infinite;`
const SkDark = styled(Sk)`background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%); background-size: 200% 100%;`

// ─── COMPONENT ──────────────────────────────────────────────────────
export default function NewsTerminal({ initialNews = [] }) {
  const [tab, setTab] = useState('articles')
  const [token, setToken] = useState('all')
  const [sentiment, setSentiment] = useState('all')
  const [query, setQuery] = useState('')

  const [articles, setArticles] = useState(initialNews)
  const [socialPosts, setSocialPosts] = useState([])
  const [macroFactors, setMacroFactors] = useState(null)
  const [voices, setVoices] = useState(null)
  const [coins, setCoins] = useState([])
  const [index, setIndex] = useState(null)
  const [clock, setClock] = useState('')
  const [orcaQ, setOrcaQ] = useState('')

  // Live clock (UPDATED hh:mm:ss)
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const p = (n) => String(n).padStart(2, '0')
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [])

  // Markets: rail + ticker + hero chart + Sonar (Fear/Greed) index.
  // Poll every 5s; roll the live price onto each series for the sliding sparkline.
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await fetch('/api/news/markets', { cache: 'no-store' })
        const data = await res.json()
        if (!alive || !Array.isArray(data?.coins)) return
        if (data.index) setIndex(data.index)
        setCoins((prev) => {
          if (prev.length === 0) return data.coins
          const prevBy = new Map(prev.map((c) => [c.sym, c]))
          return data.coins.map((c) => {
            const old = prevBy.get(c.sym)
            if (!old || !Array.isArray(old.series)) return c
            const series = [...old.series.slice(1), c.price]
            return { ...c, series }
          })
        })
      } catch {
        /* keep last good markets */
      }
    }
    load()
    const iv = setInterval(load, 5000)
    return () => {
      alive = false
      clearInterval(iv)
    }
  }, [])

  // Social posts (+ merge high-signal X posts into the articles feed).
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/social/feed?limit=200&sort=interactions')
        const data = await res.json()
        if (!data?.posts) return
        setSocialPosts(data.posts)
        const topXPosts = data.posts
          .filter((p) => p.interactions > 500 || p.category === 'tracked_creator')
          .slice(0, 30)
          .map((p) => {
            const rawSent = p.sentiment
            let normalizedSent = null
            if (rawSent != null && !Number.isNaN(Number(rawSent))) {
              const n = Number(rawSent)
              if (n >= -1 && n <= 1) normalizedSent = n
              else if (n >= 1 && n <= 5) normalizedSent = (n - 3) / 2
            }
            return {
              id: `x-${p.post_id || p.id}`,
              title: `${p.creator_name || p.creator_screen_name || 'X'}: ${(p.body || '').slice(0, 120)}${(p.body || '').length > 120 ? '…' : ''}`,
              description: p.body || '',
              published_at: p.published_at,
              source: `@${p.creator_screen_name || 'X'}`,
              url: p.url || '',
              image: '',
              instruments: (p.tickers_mentioned || []).map((t) => ({ code: t })),
              sentiment_llm: normalizedSent,
              kind: 'x-post',
            }
          })
        if (topXPosts.length > 0) {
          setArticles((prev) => {
            const existing = new Set(prev.map((a) => a.url || a.id))
            const newXPosts = topXPosts.filter((x) => !existing.has(x.url || x.id))
            const merged = [...prev, ...newXPosts]
            merged.sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
            return merged.slice(0, 200)
          })
        }
      } catch {
        /* ignore */
      }
    }
    load()
    const iv = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  // Additional DB news articles (merged + deduped).
  useEffect(() => {
    const load = async () => {
      try {
        const sb = supabaseBrowser()
        const { data } = await sb
          .from('news_items')
          .select('id,title,description,published_at,source,url,image,tokens_mentioned,ticker,sentiment_llm')
          .order('published_at', { ascending: false })
          .limit(200)
        if (data && data.length > 0) {
          const mapped = data
            .filter((n) => {
              const codes = n.tokens_mentioned && n.tokens_mentioned.length ? n.tokens_mentioned : n.ticker ? [n.ticker] : []
              if (!codes.length) return true
              const text = `${n.title || ''} ${n.description || ''}`
              return codes.some((c) => isCryptoRelevant(text, String(c)))
            })
            .map((n) => ({
              id: n.id,
              title: n.title || '',
              description: n.description || '',
              published_at: n.published_at,
              source: n.source || 'Unknown',
              url: n.url || '',
              image: n.image || '',
              instruments: (n.tokens_mentioned || []).map((t) => ({ code: t })),
              sentiment_llm: n.sentiment_llm,
              kind: 'news',
            }))
          setArticles((prev) => {
            const existing = new Set(prev.map((p) => p.url || p.id))
            const newItems = mapped.filter((m) => !existing.has(m.url || m.id))
            const merged = [...prev, ...newItems]
            merged.sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
            return merged.slice(0, 200)
          })
        }
      } catch {
        /* ignore */
      }
    }
    load()
    const iv = setInterval(load, 10 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  // Macro factors
  useEffect(() => {
    fetch('/api/social/macro')
      .then((r) => r.json())
      .then((d) => {
        if (d?.factors) setMacroFactors(d)
      })
      .catch(() => {})
  }, [])

  // Key voices
  useEffect(() => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 30000)
    fetch('/api/social/voices', { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setVoices({ voices: Array.isArray(d?.voices) ? d.voices : [] }))
      .catch(() => setVoices({ voices: [] }))
      .finally(() => clearTimeout(timer))
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [])

  // ── Derived ─────────────────────────────────────────────────────
  const coinBySym = useMemo(() => new Map(coins.map((c) => [c.sym, c])), [coins])

  const railRows = useMemo(
    () =>
      coins.map((c) => {
        const pct = c.open ? (c.price / c.open - 1) * 100 : 0
        const pos = pct >= 0
        return {
          sym: c.sym,
          name: c.name,
          priceStr: `$${fmtPrice(c.price)}`,
          pctStr: `${pos ? '+' : ''}${pct.toFixed(2)}%`,
          col: pos ? K.posDark : K.negDark,
          spark: spark(c.series, 64, 24),
        }
      }),
    [coins]
  )

  const q = query.trim().toLowerCase()
  const matchesQuery = useCallback(
    (text) => !q || (text || '').toLowerCase().includes(q),
    [q]
  )

  const filteredArticles = useMemo(() => {
    let items = articles
    if (token !== 'all') {
      const tokens = ECOSYSTEM_BY_KEY[token] || []
      if (tokens.length) items = items.filter((a) => articleMatchesTokens(a, tokens))
    }
    if (sentiment !== 'all') items = items.filter((a) => guessSentiment(a) === sentiment)
    if (q) items = items.filter((a) => matchesQuery(`${a.title} ${a.description} ${a.source}`))
    return items
  }, [articles, token, sentiment, q, matchesQuery])

  const filteredSocial = useMemo(() => {
    let items = socialPosts
    if (token !== 'all') {
      const tokens = ECOSYSTEM_BY_KEY[token] || []
      if (tokens.length) {
        items = items.filter(
          (p) =>
            (p.tickers_mentioned || []).some((t) => tokens.includes(String(t).toUpperCase())) ||
            tokens.some((t) => (p.body || '').toUpperCase().includes(t))
        )
      }
    }
    if (sentiment !== 'all') items = items.filter((p) => socialSentiment(p) === sentiment)
    if (q) items = items.filter((p) => matchesQuery(`${p.body} ${p.creator_screen_name} ${p.creator_display_name}`))
    return items
  }, [socialPosts, token, sentiment, q, matchesQuery])

  const articleCount = filteredArticles.length
  const socialCount = filteredSocial.length

  // Unified feed rows for the active tab
  const feed = useMemo(() => {
    if (tab === 'social') {
      return filteredSocial.slice(0, 80).map((p, i) => {
        const s = socialSentiment(p)
        const t = (p.tickers_mentioned || [])[0]
        return {
          key: p.id || p.post_id || i,
          title: p.body || '',
          body: '',
          byline: `@${p.creator_screen_name || 'x'} · ${timeAgo(p.published_at)}`,
          sent: s,
          token: t ? String(t).toUpperCase() : '',
          url: p.url || '',
        }
      })
    }
    return filteredArticles.slice(0, 100).map((a, i) => {
      const s = guessSentiment(a)
      const t = (a.instruments || [])[0]
      return {
        key: a.id || a.url || i,
        title: a.title || '',
        body: a.description || '',
        byline: `${a.source || 'Unknown'} · ${timeAgo(a.published_at)}`,
        sent: s,
        token: t ? String(t.code).toUpperCase() : '',
        url: a.url || '',
      }
    })
  }, [tab, filteredArticles, filteredSocial])

  // Breaking hero — top story (composes with token + sentiment filters), charted
  // against its primary tradable coin (falls back to BTC so a chart always shows).
  const hero = useMemo(() => {
    const pool = filteredArticles.length ? filteredArticles : articles
    if (!pool.length) return null
    // Pick the most *important* recent story (not just the newest) so a random
    // viral tweet never headlines.
    let article = null
    let best = -Infinity
    for (const a of pool.slice(0, 80)) {
      const sc = importanceScore(a)
      if (sc > best) {
        best = sc
        article = a
      }
    }
    if (!article) article = pool[0]
    const codes = (article.instruments || []).map((i) => String(i.code).toUpperCase())
    let coin = codes.map((c) => coinBySym.get(c)).find(Boolean)
    if (!coin) coin = coinBySym.get('BTC') || coins[0]
    const s = guessSentiment(article)
    const sent = SENT[s]
    let priceStr = '—'
    let pctStr = ''
    let pctNum = 0
    let pos = s !== 'bearish'
    let paths = { line: '', area: '', min: 0, max: 0 }
    if (coin) {
      pctNum = coin.open ? (coin.price / coin.open - 1) * 100 : 0
      pos = pctNum >= 0
      priceStr = `$${fmtPrice(coin.price)}`
      pctStr = `${pos ? '+' : ''}${pctNum.toFixed(2)}%`
      paths = buildPaths(coin.series, 360, 118)
    }
    // "Why it moved": real 24h price action + the most relevant live macro factor,
    // tying the breaking story back to the macro panel. Always populated.
    const macroList = (macroFactors && macroFactors.factors) || []
    let macroNote = ''
    if (macroList.length) {
      const t = `${article.title || ''} ${article.description || ''}`.toLowerCase()
      const rel = (m) => {
        const mt = `${m.title || ''} ${m.summary || ''}`.toLowerCase()
        let r = 0
        for (const c of codes) if (mt.includes(c.toLowerCase())) r += 3
        for (const k of IMPORTANCE_KEYWORDS) if (t.includes(k) && mt.includes(k)) r += 1
        return r
      }
      const m = [...macroList].sort((a, b) => rel(b) - rel(a))[0]
      if (m && m.title) {
        const sum = (m.summary || '').trim()
        macroNote = sum ? `${m.title} — ${sum}` : m.title
        if (macroNote.length > 200) macroNote = macroNote.slice(0, 197).trimEnd() + '…'
      }
    }
    const moveStr = coin ? `${coin.sym} ${pctNum >= 0 ? '+' : '−'}${Math.abs(pctNum).toFixed(2)}% over 24h.` : ''
    const why = [moveStr, macroNote || `Sentiment across tracked sources currently reads ${s}.`]
      .filter(Boolean)
      .join(' ')
    return {
      article,
      title: article.title || '',
      summary: article.description || 'Tap to read the full report.',
      tokens: codes.slice(0, 3),
      label: coin ? `${coin.sym} / USD` : 'MARKETS',
      time: timeAgo(article.published_at) ? `${timeAgo(article.published_at)}` : 'LIVE',
      url: article.url || '',
      sent: s,
      sentLabel: pos ? '▲ BULLISH' : '▼ BEARISH',
      accent: pos ? K.posText : K.negText,
      accentBg: pos ? K.posBg : K.negBg,
      col: pos ? K.posText : K.negText,
      sentColor: sent.text,
      sentBg: sent.bg,
      priceStr,
      pctStr,
      lowStr: coin ? `$${fmtPrice(paths.min)}` : '—',
      highStr: coin ? `$${fmtPrice(paths.max)}` : '—',
      areaPath: paths.area,
      linePath: paths.line,
    }
  }, [filteredArticles, articles, coinBySym, coins, macroFactors])

  const macroSent = macroFactors?.overall_sentiment
    ? SENT[macroFactors.overall_sentiment] || SENT.neutral
    : null

  const idxTheme = indexTheme(index?.value)

  const goOrca = (text) => {
    const v = (text || '').trim()
    if (!v) return
    window.location.href = `/ai-advisor?q=${encodeURIComponent(v)}`
  }

  const tickerRows = railRows.length ? railRows : []

  return (
    <>
      <Fonts />
      <Root className="son-root">
        {/* HEADER */}
        <Header>
          <Brand>
            <BrandName>SONAR</BrandName>
            <BrandSlash>/ NEWS_TERMINAL</BrandSlash>
            <LiveTag>
              <LiveDot />
              <LiveText>LIVE</LiveText>
            </LiveTag>
          </Brand>
          <HeaderRight>
            <Search>
              <span style={{ color: '#5a6068', fontSize: 13 }}>⌕</span>
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search tokens, sources, people…"
                aria-label="Search news"
              />
            </Search>
            <Clock>UPDATED {clock}</Clock>
          </HeaderRight>
        </Header>

        {/* TICKER */}
        <TickerStrip>
          {tickerRows.length > 0 ? (
            <TickerTrack>
              {[0, 1].map((dup) =>
                tickerRows.map((t) => (
                  <TickerItem key={`${dup}-${t.sym}`}>
                    <TSym>{t.sym}</TSym>
                    <TPrice>{t.priceStr}</TPrice>
                    <TPct $c={t.col}>{t.pctStr}</TPct>
                  </TickerItem>
                ))
              )}
            </TickerTrack>
          ) : (
            <TickerItem style={{ paddingLeft: 24 }}>
              <TPrice>CONNECTING MARKET FEED…</TPrice>
            </TickerItem>
          )}
        </TickerStrip>

        <Body>
          {/* LEFT MARKET RAIL */}
          <Rail className="son-rail-dark">
            <RailHead>
              <RailLabel>MARKETS</RailLabel>
              <RailLive>● REALTIME</RailLive>
            </RailHead>

            <IndexCard>
              <IndexTop>
                <IndexName>SONAR INDEX</IndexName>
                <IndexState $c={idxTheme.color}>{index?.label || '—'}</IndexState>
              </IndexTop>
              <IndexRow>
                <IndexValue>{index?.value ?? '—'}</IndexValue>
                {index && (
                  <IndexDelta $c={index.delta >= 0 ? K.posDark : K.negDark}>
                    {index.delta >= 0 ? '+' : '−'}
                    {Math.abs(index.delta)} / 24h
                  </IndexDelta>
                )}
              </IndexRow>
              <IndexBarTrack>
                <IndexBarFill $w={index?.bar ?? 0} $g={idxTheme.grad} />
              </IndexBarTrack>
            </IndexCard>

            <RailCoins>
              {railRows.length > 0
                ? railRows.map((c) => (
                    <CoinRow key={c.sym}>
                      <CoinId>
                        <CoinSym>{c.sym}</CoinSym>
                        <CoinName>{c.name}</CoinName>
                      </CoinId>
                      <svg width="64" height="24" viewBox="0 0 64 24" preserveAspectRatio="none" style={{ flex: 'none' }}>
                        <polyline fill="none" stroke={c.col} strokeWidth="1.5" strokeLinejoin="round" points={c.spark} />
                      </svg>
                      <CoinRight>
                        <CoinPrice>{c.priceStr}</CoinPrice>
                        <CoinPct $c={c.col}>{c.pctStr}</CoinPct>
                      </CoinRight>
                    </CoinRow>
                  ))
                : [0, 1, 2, 3, 4, 5].map((i) => (
                    <CoinRow key={i}>
                      <CoinId>
                        <SkDark $w="40px" $h="13px" $mb="4px" />
                        <SkDark $w="30px" $h="9px" />
                      </CoinId>
                      <SkDark $w="64px" $h="20px" />
                      <CoinRight>
                        <SkDark $w="48px" $h="12px" $mb="4px" />
                      </CoinRight>
                    </CoinRow>
                  ))}
            </RailCoins>
          </Rail>

          {/* LIGHT AREA */}
          <Light>
            {/* FILTER TOOLBAR */}
            <Toolbar>
              <ToolbarLeft>
                <TabGroup>
                  {TABS.map((t) => (
                    <TabBtn key={t.key} $on={tab === t.key} onClick={() => setTab(t.key)}>
                      {t.label} <span>{t.key === 'articles' ? articleCount : socialCount}</span>
                    </TabBtn>
                  ))}
                </TabGroup>
                <Divider />
                <ChipGroup>
                  {TOKEN_CHIPS.map((t) => (
                    <Chip key={t.key} $on={token === t.key} onClick={() => setToken(t.key)}>
                      {t.label}
                    </Chip>
                  ))}
                </ChipGroup>
              </ToolbarLeft>
              <SentGroup>
                {SENTIMENTS.map((s) => {
                  const color = s.key === 'bullish' ? K.posText : s.key === 'bearish' ? K.negText : K.ink
                  const border = s.key === 'all' ? 'rgba(0,0,0,0.18)' : s.key === 'bullish' ? 'rgba(21,128,61,0.4)' : 'rgba(194,55,31,0.4)'
                  return (
                    <SentBtn
                      key={s.key}
                      $on={sentiment === s.key}
                      $key={s.key}
                      $color={color}
                      $border={border}
                      onClick={() => setSentiment(sentiment === s.key ? 'all' : s.key)}
                    >
                      {s.label}
                    </SentBtn>
                  )
                })}
              </SentGroup>
            </Toolbar>

            <ContentRow>
              {/* CENTER */}
              <Center>
                {/* BREAKING HERO */}
                {hero && (
                  <Hero>
                    <HeroTop>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <BreakingPill $c={hero.accent}>
                          <BreakingDot />
                          BREAKING
                        </BreakingPill>
                        <HeroTime>{hero.time}</HeroTime>
                      </span>
                      <HeroTokens>
                        {hero.tokens.map((tok) => (
                          <HeroTokenChip key={tok}>{tok}</HeroTokenChip>
                        ))}
                      </HeroTokens>
                    </HeroTop>
                    <HeroBody href={hero.url || undefined} target={hero.url ? '_blank' : undefined} rel="noopener noreferrer">
                      <HeroLeft>
                        <HeroTitle>{hero.title}</HeroTitle>
                        <HeroSummary>{hero.summary}</HeroSummary>
                        <WhyBox $c={hero.accent} $bg={hero.accentBg}>
                          <WhyLabel $c={hero.accent}>▼ WHY IT MOVED</WhyLabel>
                          <WhyText>{hero.why}</WhyText>
                        </WhyBox>
                      </HeroLeft>
                      <ChartCard>
                        <ChartTop>
                          <ChartLabel>{hero.label}</ChartLabel>
                          <ChartSent $c={hero.sentColor} $bg={hero.sentBg}>
                            {hero.sentLabel}
                          </ChartSent>
                        </ChartTop>
                        <ChartPriceRow>
                          <ChartPrice>{hero.priceStr}</ChartPrice>
                          <ChartPct $c={hero.col}>{hero.pctStr}</ChartPct>
                        </ChartPriceRow>
                        <svg width="100%" height="118" viewBox="0 0 360 118" preserveAspectRatio="none">
                          <path d={hero.areaPath} fill={hero.col} fillOpacity="0.10" />
                          <path d={hero.linePath} fill="none" stroke={hero.col} strokeWidth="2" strokeLinejoin="round" />
                        </svg>
                        <ChartFoot>
                          <span>24h LOW {hero.lowStr}</span>
                          <span>HIGH {hero.highStr}</span>
                        </ChartFoot>
                      </ChartCard>
                    </HeroBody>
                  </Hero>
                )}

                {/* FEED HEADER */}
                <FeedHead>
                  <FeedLabel>{tab === 'social' ? 'SOCIAL_FEED' : 'LATEST'}</FeedLabel>
                  <FeedRule />
                  <FeedCount>{feed.length} RESULTS</FeedCount>
                </FeedHead>

                {/* FEED */}
                {feed.length === 0 ? (
                  <Empty>No {tab === 'social' ? 'posts' : 'articles'} match the current filters.</Empty>
                ) : (
                  feed.map((it) => {
                    const s = SENT[it.sent]
                    const linkProps = it.url
                      ? { as: 'a', href: it.url, target: '_blank', rel: 'noopener noreferrer' }
                      : {}
                    return (
                      <Row key={it.key} {...linkProps} $bar={s.bar}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <RowTitle>{it.title}</RowTitle>
                          {it.body && <RowBody>{it.body}</RowBody>}
                          <RowMeta>
                            <RowByline>{it.byline}</RowByline>
                            <RowSent $c={s.text} $bg={s.bg}>
                              {s.label}
                            </RowSent>
                            {it.token && <RowToken>{it.token}</RowToken>}
                          </RowMeta>
                        </div>
                      </Row>
                    )
                  })
                )}
              </Center>

              {/* RIGHT RAIL */}
              <RightRail>
                {/* MACRO */}
                <SecHead>
                  <SecLabel>MACRO_FACTORS</SecLabel>
                  {macroSent && (
                    <SecBadge $c={macroSent.text} $bg={macroSent.bg}>
                      {macroSent.label}
                    </SecBadge>
                  )}
                </SecHead>
                <Block>
                  {macroFactors?.factors
                    ? macroFactors.factors.map((f, i) => {
                        const dotColor =
                          f.impact === 'bullish' || f.impact === 'positive'
                            ? K.posText
                            : f.impact === 'bearish' || f.impact === 'negative'
                            ? K.negText
                            : K.neuText
                        return (
                          <MacroItem key={i}>
                            <MacroTop>
                              <Dot $c={dotColor} />
                              <MacroTitle>{f.title}</MacroTitle>
                            </MacroTop>
                            <MacroDesc>{f.summary}</MacroDesc>
                          </MacroItem>
                        )
                      })
                    : [0, 1, 2, 3].map((i) => (
                        <MacroItem key={i}>
                          <Sk $w="60%" $h="12px" $mb="6px" />
                          <Sk $h="9px" $mb="4px" />
                          <Sk $w="80%" $h="9px" />
                        </MacroItem>
                      ))}
                </Block>

                {/* KEY VOICES */}
                <SecHead>
                  <SecLabel>KEY_VOICES</SecLabel>
                  <SecLive>● LIVE</SecLive>
                </SecHead>
                <Block>
                  {!voices ? (
                    [0, 1, 2].map((i) => (
                      <VoiceItem key={i}>
                        <Sk $w="40%" $h="12px" $mb="6px" />
                        <Sk $h="9px" $mb="4px" />
                        <Sk $w="70%" $h="9px" />
                      </VoiceItem>
                    ))
                  ) : voices.voices.length === 0 ? (
                    <MacroDesc style={{ paddingLeft: 0 }}>No recent statements from tracked voices.</MacroDesc>
                  ) : (
                    voices.voices.slice(0, 6).map((v, i) => (
                      <VoiceItem key={i}>
                        <VoiceTop>
                          <VoiceName>{v.name}</VoiceName>
                          {v.handle && <VoiceHandle>{v.handle.startsWith('@') ? v.handle : `@${v.handle}`}</VoiceHandle>}
                        </VoiceTop>
                        <VoiceQuote>“{(v.quote || '').replace(/^["“]|["”]$/g, '')}”</VoiceQuote>
                        <VoiceFoot>
                          <VoiceCtx>{v.context}</VoiceCtx>
                          <VoiceDate>{v.date}</VoiceDate>
                        </VoiceFoot>
                      </VoiceItem>
                    ))
                  )}
                </Block>

                {/* ASK ORCA */}
                <OrcaCard>
                  <OrcaTop>
                    <OrcaDot />
                    <OrcaLabel>ASK_ORCA</OrcaLabel>
                  </OrcaTop>
                  <OrcaInputWrap
                    onSubmit={(e) => {
                      e.preventDefault()
                      goOrca(orcaQ)
                    }}
                  >
                    <OrcaInput
                      value={orcaQ}
                      onChange={(e) => setOrcaQ(e.target.value)}
                      placeholder="Why did BTC drop today?"
                      aria-label="Ask Orca"
                    />
                  </OrcaInputWrap>
                  <OrcaChips>
                    {['Summarize macro', 'SOL vs ETH', 'Top movers'].map((c) => (
                      <OrcaChip key={c} onClick={() => goOrca(c)}>
                        {c}
                      </OrcaChip>
                    ))}
                  </OrcaChips>
                </OrcaCard>
              </RightRail>
            </ContentRow>
          </Light>
        </Body>
      </Root>
    </>
  )
}
