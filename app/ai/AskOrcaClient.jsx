/**
 * Ask ORCA (Stage C, 2026-05-26)
 * =============================================================================
 * New `/ai` surface. Nansen-style centred input + suggested chips on the
 * empty state; turns into a focused single-conversation chat after the first
 * message. Reuses the v1 `/api/chat` SSE endpoint AS IS — including the
 * Stage B.2 fast-write Confirm/Cancel flow.
 *
 * NOT a replacement for `/ai-advisor` (which keeps the session-sidebar +
 * full feature set). Per HARD RULES this is additive only — both routes
 * stay alive.
 */

'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { FONT_SANS, FONT_MONO } from '@/src/styles/fontStacks'
import { getSuggestedChips } from '@/lib/orca/suggestedChips'

const colors = {
  bgDark: '#0a0e17',
  bgCard: 'rgba(13, 17, 28, 0.8)',
  bgCardLight: 'rgba(13, 17, 28, 0.55)',
  primary: '#00e5ff',
  primaryDim: 'rgba(0, 229, 255, 0.18)',
  textPrimary: '#e0e6ed',
  textSecondary: '#8a9ab0',
  textMuted: '#5a6a7a',
  borderLight: 'rgba(0, 229, 255, 0.10)',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  sentimentBull: '#00e676',
  sentimentBear: '#ff1744',
  sentimentNeutral: '#ffab00',
}

// ---- Formatters (mirrors v1 ClientOrca) ----------------------------------
function formatPrice(price) {
  if (!price) return '$0.00'
  if (price >= 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (price >= 0.01) return `$${price.toFixed(4)}`
  return `$${price.toFixed(8)}`
}
function formatCompact(n) {
  const num = Number(n || 0)
  const abs = Math.abs(num)
  if (abs >= 1e12) return `$${(num/1e12).toFixed(2)}T`
  if (abs >= 1e9) return `$${(num/1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(num/1e6).toFixed(2)}M`
  if (abs >= 1e3) return `$${(num/1e3).toFixed(2)}K`
  return `$${Math.round(num)}`
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`

const Shell = styled.div`
  min-height: calc(100vh - 80px);
  background: ${colors.bgDark};
  color: ${colors.textPrimary};
  font-family: ${FONT_SANS};
  display: flex;
  flex-direction: column;
`

const HeroWrap = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1.5rem 2rem;
  text-align: center;
`

const Eyebrow = styled.div`
  font-family: ${FONT_MONO};
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  color: ${colors.primary};
  text-transform: uppercase;
  margin-bottom: 1rem;
  opacity: 0.85;
`

const Heading = styled.h1`
  margin: 0 0 0.6rem;
  font-size: clamp(1.9rem, 4vw, 2.6rem);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${colors.textPrimary};
`

const Subhead = styled.p`
  margin: 0 0 2rem;
  max-width: 540px;
  color: ${colors.textSecondary};
  font-size: 0.95rem;
  line-height: 1.55;
`

const InputCard = styled.form`
  width: 100%;
  max-width: 720px;
  background: ${colors.bgCard};
  border: 1px solid ${colors.borderLight};
  border-radius: 14px;
  padding: 0.6rem 0.6rem 0.6rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  box-shadow: 0 8px 40px rgba(0, 229, 255, 0.06);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  &:focus-within {
    border-color: ${colors.primaryDim};
    box-shadow: 0 8px 40px rgba(0, 229, 255, 0.14);
  }
`

const HeroInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: ${colors.textPrimary};
  font-family: ${FONT_SANS};
  font-size: 1rem;
  padding: 0.85rem 0.25rem;
  outline: none;
  &::placeholder { color: ${colors.textMuted}; }
`

const SendBtn = styled.button`
  background: linear-gradient(135deg, ${colors.primary} 0%, #00b8d4 100%);
  color: #0a0e17;
  border: none;
  border-radius: 10px;
  padding: 0.65rem 1.1rem;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const ChipsRow = styled.div`
  margin-top: 1.4rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  max-width: 760px;
`

const Chip = styled.button`
  background: ${colors.bgCardLight};
  color: ${colors.textSecondary};
  border: 1px solid ${colors.borderSubtle};
  border-radius: 999px;
  padding: 0.5rem 0.95rem;
  font-size: 0.82rem;
  font-family: ${FONT_SANS};
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
  &:hover {
    border-color: ${colors.primaryDim};
    color: ${colors.textPrimary};
    background: rgba(0, 229, 255, 0.04);
  }
  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }
`

const KeyHint = styled.span`
  display: inline-block;
  margin-right: 0.45rem;
  font-family: ${FONT_MONO};
  font-size: 0.65rem;
  color: ${colors.textMuted};
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${colors.borderSubtle};
  border-radius: 4px;
  padding: 0.05rem 0.35rem;
`

const ConvShell = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 820px;
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem 1rem 0;
`

const Messages = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 1.5rem;
`

const Bubble = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  animation: ${fadeIn} 0.2s ease;
`

const Role = styled.div`
  font-family: ${FONT_MONO};
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  color: ${({ $isUser }) => ($isUser ? colors.textMuted : colors.primary)};
  text-transform: uppercase;
`

const Body = styled.div`
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${colors.textPrimary};
  p { margin: 0 0 0.75rem; }
  ul, ol { margin: 0 0 0.75rem 1.2rem; }
  code {
    font-family: ${FONT_MONO};
    background: rgba(13, 17, 28, 0.6);
    padding: 0.05rem 0.35rem;
    border-radius: 4px;
    font-size: 0.85em;
    color: ${colors.primary};
  }
  pre { overflow-x: auto; }
  h3, h4 {
    margin: 1.1rem 0 0.5rem;
    color: ${colors.primary};
    font-size: 1rem;
  }
  a { color: ${colors.primary}; }
`

const StickyInputWrap = styled.div`
  position: sticky;
  bottom: 0;
  background: linear-gradient(180deg, transparent 0%, ${colors.bgDark} 30%);
  padding: 1rem 0 1.25rem;
`

const ErrorLine = styled.div`
  color: #ff7a7a;
  font-size: 0.85rem;
  margin-top: 0.5rem;
`

const Status = styled.div`
  font-family: ${FONT_MONO};
  font-size: 0.7rem;
  color: ${colors.textMuted};
  letter-spacing: 0.08em;
`

const ConfirmCard = styled.div`
  padding: 1rem 1.1rem;
  background: ${colors.bgCard};
  border-radius: 10px;
  border: 1px solid ${colors.borderLight};
`

const ConfirmBtn = styled.button`
  background: linear-gradient(135deg, ${colors.primary} 0%, #00b8d4 100%);
  color: #0a0e17;
  border: none;
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
`

const CancelBtn = styled.button`
  background: transparent;
  color: ${colors.textSecondary};
  border: 1px solid ${colors.borderSubtle};
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
`

const Disclaimer = styled.div`
  text-align: center;
  font-size: 0.7rem;
  color: ${colors.textMuted};
  padding: 0.5rem 1rem 1rem;
`

// ---- TokenDataCard (ported from v1 ClientOrca) ---------------------------
// Renders KPI row + 24h chart + 7d chart + whale/social row beneath the
// assistant's markdown answer when `message.data.price` is present.
function TokenDataCard({ message }) {
  const data = message.data
  if (!data || !data.price) return null
  const showWhaleRow = (
    (data.whale_summary && (data.whale_summary.transactions > 0 || Math.abs(data.whale_summary.net_flow || 0) > 0)) ||
    (data.lunarcrush && (data.lunarcrush.galaxy_score > 0 || data.lunarcrush.alt_rank > 0)) ||
    data.price.ath_distance != null
  )
  const kpiCell = { textAlign: 'center' }
  const kpiLabel = { fontSize: '0.55rem', color: colors.textMuted, fontFamily: FONT_SANS, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }
  const kpiVal = { fontSize: '0.95rem', fontWeight: 800, fontFamily: FONT_MONO, color: colors.textPrimary }

  return (
    <div style={{ marginTop: '0.9rem' }}>
      {/* Token header */}
      {message.ticker && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: colors.textPrimary, fontFamily: FONT_MONO, letterSpacing: '1px' }}>
              {message.ticker}
            </span>
            {data.price.current > 0 && (
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: colors.primary, fontFamily: FONT_MONO }}>
                {formatPrice(data.price.current)}
              </span>
            )}
            {data.price.change_24h != null && (
              <span style={{
                fontSize: '0.75rem', fontWeight: 700, fontFamily: FONT_MONO,
                color: data.price.change_24h >= 0 ? colors.sentimentBull : colors.sentimentBear,
                padding: '0.15rem 0.35rem', borderRadius: '3px',
                background: data.price.change_24h >= 0 ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 23, 68, 0.08)',
              }}>
                {data.price.change_24h >= 0 ? '▲' : '▼'} {Math.abs(data.price.change_24h).toFixed(2)}%
              </span>
            )}
          </div>
          <a href={`/token/${encodeURIComponent(message.ticker)}?sinceHours=24`} style={{
            fontSize: '0.7rem', fontFamily: FONT_MONO, fontWeight: 600,
            color: colors.primary, textDecoration: 'none',
            padding: '0.25rem 0.6rem', borderRadius: '4px',
            border: `1px solid ${colors.borderLight}`,
          }}>
            VIEW CHART →
          </a>
        </div>
      )}

      <div style={{
        background: 'rgba(0, 229, 255, 0.02)', border: `1px solid ${colors.borderLight}`,
        borderRadius: '6px', padding: '0.65rem 0.8rem',
      }}>
        {/* KPI Row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '0.5rem', marginBottom: '0.7rem',
        }}>
          <div style={kpiCell}>
            <div style={kpiLabel}>Price</div>
            <div style={kpiVal}>{formatPrice(data.price.current)}</div>
          </div>
          {data.price.change_24h != null && (
            <div style={kpiCell}>
              <div style={kpiLabel}>24h</div>
              <div style={{ ...kpiVal, color: data.price.change_24h >= 0 ? colors.sentimentBull : colors.sentimentBear }}>
                {data.price.change_24h >= 0 ? '+' : ''}{data.price.change_24h.toFixed(2)}%
              </div>
            </div>
          )}
          {data.price.market_cap > 0 && (
            <div style={kpiCell}>
              <div style={kpiLabel}>MCap</div>
              <div style={kpiVal}>{formatCompact(data.price.market_cap)}</div>
            </div>
          )}
          {data.price.volume_24h > 0 && (
            <div style={kpiCell}>
              <div style={kpiLabel}>Volume</div>
              <div style={kpiVal}>{formatCompact(data.price.volume_24h)}</div>
            </div>
          )}
          {data.sentiment && (
            <div style={kpiCell}>
              <div style={kpiLabel}>Sentiment</div>
              <div style={{ ...kpiVal, color: data.sentiment.score > 0.2 ? colors.sentimentBull : data.sentiment.score < -0.2 ? colors.sentimentBear : colors.sentimentNeutral }}>
                {data.sentiment.score > 0.2 ? 'Bullish' : data.sentiment.score < -0.2 ? 'Bearish' : 'Neutral'}
              </div>
            </div>
          )}
          {data.social?.sentiment_pct && (
            <div style={kpiCell}>
              <div style={kpiLabel}>Social</div>
              <div style={{ ...kpiVal, color: colors.primary }}>{data.social.sentiment_pct}%</div>
            </div>
          )}
        </div>

        {/* 24h chart */}
        {Array.isArray(data.sparkline_24h) && data.sparkline_24h.length > 5 && (
          <SparkChart prices={data.sparkline_24h} authoritativeChange={data.price.change_24h} title="24H PRICE CHART" id={`24-${message.id}`} height={80} />
        )}

        {/* 7d chart */}
        {Array.isArray(data.sparkline_7d) && data.sparkline_7d.length > 5 && (
          <SparkChart prices={data.sparkline_7d} title="7D PRICE CHART" id={`7d-${message.id}`} height={60} compact />
        )}

        {/* Whale + LunarCrush row */}
        {showWhaleRow && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '0.4rem',
            paddingTop: '0.6rem', borderTop: `1px solid ${colors.borderLight}`, marginTop: '0.4rem',
          }}>
            {data.whale_summary && (data.whale_summary.transactions > 0 || Math.abs(data.whale_summary.net_flow || 0) > 0) && (
              <>
                <span style={{ fontSize: '0.65rem', fontFamily: FONT_MONO, color: data.whale_summary.net_flow >= 0 ? colors.sentimentBull : colors.sentimentBear, padding: '0.15rem 0.4rem', borderRadius: '3px', background: data.whale_summary.net_flow >= 0 ? 'rgba(0, 230, 118, 0.06)' : 'rgba(255, 23, 68, 0.06)', border: `1px solid ${data.whale_summary.net_flow >= 0 ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 23, 68, 0.1)'}` }}>
                  WHALE: {data.whale_summary.net_flow >= 0 ? '+' : ''}{formatCompact(data.whale_summary.net_flow)}
                </span>
                <span style={{ fontSize: '0.65rem', fontFamily: FONT_MONO, color: colors.textMuted, padding: '0.15rem 0.4rem', borderRadius: '3px', border: `1px solid ${colors.borderLight}` }}>
                  {data.whale_summary.transactions} TXN ({data.whale_summary.buy_sell_ratio})
                </span>
              </>
            )}
            {data.lunarcrush?.galaxy_score > 0 && (
              <span style={{ fontSize: '0.65rem', fontFamily: FONT_MONO, color: data.lunarcrush.galaxy_score >= 60 ? colors.sentimentBull : data.lunarcrush.galaxy_score >= 40 ? colors.sentimentNeutral : colors.sentimentBear, padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(0, 229, 255, 0.04)', border: `1px solid ${colors.borderLight}` }}>
                GALAXY: {data.lunarcrush.galaxy_score}/100
              </span>
            )}
            {data.lunarcrush?.alt_rank > 0 && (
              <span style={{ fontSize: '0.65rem', fontFamily: FONT_MONO, color: colors.primary, padding: '0.15rem 0.4rem', borderRadius: '3px', border: `1px solid ${colors.borderLight}` }}>
                ALT RANK: #{data.lunarcrush.alt_rank}
              </span>
            )}
            {data.price.ath_distance != null && (
              <span style={{ fontSize: '0.65rem', fontFamily: FONT_MONO, color: colors.textMuted, padding: '0.15rem 0.4rem', borderRadius: '3px', border: `1px solid ${colors.borderLight}` }}>
                ATH: {data.price.ath_distance.toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SparkChart({ prices, authoritativeChange, title, id, height = 60, compact = false }) {
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const width = 400
  const padding = 2
  const sparklineChange = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
  const displayChange = authoritativeChange != null ? authoritativeChange : sparklineChange
  const isPositive = displayChange >= 0
  const color = isPositive ? colors.sentimentBull : colors.sentimentBear
  const ptsArr = prices.map((p, i) => {
    const x = padding + (i / (prices.length - 1)) * (width - padding * 2)
    const y = padding + (1 - (p - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })
  const points = ptsArr.join(' ')
  const firstX = padding
  const lastX = padding + (width - padding * 2)
  const lastY = padding + (1 - (prices[prices.length - 1] - min) / range) * (height - padding * 2)
  const areaPath = `M${firstX},${height} ${ptsArr.map(p => `L${p}`).join(' ')} L${lastX},${height} Z`
  return (
    <div style={{
      margin: '0.5rem 0', padding: compact ? '0.5rem' : '0.75rem', borderRadius: compact ? '4px' : '6px',
      background: 'rgba(0, 229, 255, 0.03)', border: `1px solid ${colors.borderLight}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: compact ? '0.6rem' : '0.65rem', fontFamily: FONT_MONO, color: compact ? colors.textMuted : colors.primary, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: compact ? 600 : 700 }}>
          {title}
        </span>
        <span style={{ fontSize: compact ? '0.6rem' : '0.65rem', fontFamily: FONT_MONO, color: isPositive ? colors.sentimentBull : colors.sentimentBear, fontWeight: 700 }}>
          {isPositive ? '▲' : '▼'} {Math.abs(displayChange).toFixed(2)}%
        </span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(pct => (
          <line key={pct} x1={0} y1={pct * height} x2={width} y2={pct * height} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        ))}
        <path d={areaPath} fill={`url(#grad-${id})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r={compact ? 2.5 : 3} fill={color} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
        <span style={{ fontSize: '0.55rem', fontFamily: FONT_MONO, color: colors.textMuted }}>{compact ? formatPrice(min) : `Low: ${formatPrice(min)}`}</span>
        <span style={{ fontSize: '0.55rem', fontFamily: FONT_MONO, color: colors.textMuted }}>{compact ? formatPrice(max) : `High: ${formatPrice(max)}`}</span>
      </div>
    </div>
  )
}

export default function AskOrcaClient() {
  const searchParams = useSearchParams()
  const ticker = searchParams?.get('ticker') || null
  const wallet = searchParams?.get('wallet') || null
  const initialQ = searchParams?.get('q') || ''

  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState(initialQ)
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState(null)
  const sessionIdRef = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ai-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  )
  const messagesEndRef = useRef(null)

  const chips = useMemo(
    () => getSuggestedChips({ ticker, wallet }),
    [ticker, wallet]
  )

  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth.getSession().then(({ data }) => setSession(data?.session || null))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub?.subscription?.unsubscribe?.()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

  // Keyboard shortcuts: 1/2/3/4 trigger the corresponding chip when empty.
  useEffect(() => {
    if (messages.length > 0) return
    function onKey(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return
      const n = parseInt(e.key, 10)
      if (Number.isFinite(n) && n >= 1 && n <= chips.length) {
        e.preventDefault()
        sendMessage(chips[n - 1].prompt)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chips, messages.length])

  async function sendMessage(rawQuestion) {
    const question = (rawQuestion || '').trim()
    if (!question) return
    if (!session) {
      window.location.href = `/auth/signin?redirect=/ai`
      return
    }
    setError(null)
    setInput('')
    setLoading(true)
    setStatusText('')

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: question,
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: question, session_id: sessionIdRef.current }),
      })
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('text/event-stream')) {
        await consumeSse(res, question)
      } else {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || data?.message || `HTTP ${res.status}`)
        }
        if (data?.response) {
          setMessages((prev) => [
            ...prev,
            { id: `a-${Date.now()}`, role: 'assistant', content: data.response },
          ])
        }
      }
    } catch (err) {
      console.error('[AskOrca] send failed', err)
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
      setStatusText('')
    }
  }

  // Shared SSE consumer used by both the first POST and the Confirm re-POST.
  async function consumeSse(res, question) {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop()
      for (const part of parts) {
        const line = part.trim()
        if (!line.startsWith('data: ')) continue
        let event
        try {
          event = JSON.parse(line.slice(6))
        } catch {
          continue
        }
        if (event.type === 'status') {
          setStatusText(event.message || '')
        } else if (event.type === 'confirm') {
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: 'assistant',
              content: '',
              confirmPending: {
                label: event.label,
                calls: event.calls,
                question,
              },
            },
          ])
        } else if (event.type === 'complete') {
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: 'assistant',
              content: event.response || '',
              ticker: event.ticker || null,
              data: event.data || null,
            },
          ])
        } else if (event.type === 'error') {
          throw new Error(event.message || event.error || 'Stream error')
        }
      }
    }
  }

  async function handleConfirm(messageId, accept) {
    const target = messages.find((m) => m.id === messageId)
    if (!target || !target.confirmPending || !session) return
    const { calls, question } = target.confirmPending

    if (!accept) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, confirmPending: null, content: 'Cancelled.' }
            : m
        )
      )
      return
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, confirmPending: { ...m.confirmPending, executing: true } }
          : m
      )
    )

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: question,
          session_id: sessionIdRef.current,
          confirm: { calls },
        }),
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalText = ''
      let success = false
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop()
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'complete') {
              finalText = event.response || ''
              success = !!event.success
            } else if (event.type === 'error') {
              throw new Error(event.error || 'Write failed')
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue
            throw e
          }
        }
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, confirmPending: null, content: finalText || 'Done.' }
            : m
        )
      )
      if (success) {
        try { window.dispatchEvent(new CustomEvent('orca:watchlist-changed')) } catch {}
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, confirmPending: null, content: `Could not complete: ${err.message}` }
            : m
        )
      )
    }
  }

  function onSubmit(e) {
    e.preventDefault()
    sendMessage(input)
  }

  // Render — hero state vs conversation state.
  const showHero = messages.length === 0

  return (
    <Shell>
      {showHero ? (
        <HeroWrap>
          <Eyebrow>Ask ORCA</Eyebrow>
          <Heading>
            {ticker ? `What do you want to know about $${ticker.toUpperCase().replace(/^\$/, '')}?`
              : wallet ? 'Ask about this wallet'
              : 'What do you want to know about crypto?'}
          </Heading>
          <Subhead>
            Long-form, sourced research answers. Powered by Sonar Tracker
            on-chain data, news, and social signals.
          </Subhead>
          <InputCard onSubmit={onSubmit}>
            <HeroInput
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything — e.g. why did BTC move today?"
              disabled={loading}
            />
            <SendBtn type="submit" disabled={loading || !input.trim()}>
              {loading ? '…' : 'Ask'}
            </SendBtn>
          </InputCard>
          {error && <ErrorLine>{error}</ErrorLine>}
          <ChipsRow>
            {chips.map((chip, idx) => (
              <Chip
                key={chip.label}
                type="button"
                onClick={() => sendMessage(chip.prompt)}
                disabled={loading}
              >
                <KeyHint>{idx + 1}</KeyHint>
                {chip.label}
              </Chip>
            ))}
          </ChipsRow>
        </HeroWrap>
      ) : (
        <ConvShell>
          <Messages>
            {messages.map((m) => (
              <Bubble key={m.id}>
                <Role $isUser={m.role === 'user'}>
                  {m.role === 'user' ? 'You' : 'ORCA'}
                </Role>
                <Body>
                  {m.role === 'user' ? (
                    m.content
                  ) : m.confirmPending ? (
                    <ConfirmCard>
                      <div style={{ marginBottom: '0.85rem' }}>{m.confirmPending.label}</div>
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <ConfirmBtn
                          type="button"
                          onClick={() => handleConfirm(m.id, true)}
                          disabled={!!m.confirmPending.executing}
                        >
                          {m.confirmPending.executing ? 'Working…' : 'Confirm'}
                        </ConfirmBtn>
                        <CancelBtn
                          type="button"
                          onClick={() => handleConfirm(m.id, false)}
                          disabled={!!m.confirmPending.executing}
                        >
                          Cancel
                        </CancelBtn>
                      </div>
                    </ConfirmCard>
                  ) : (
                    <>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content || ''}
                      </ReactMarkdown>
                      {m.data?.price && <TokenDataCard message={m} />}
                    </>
                  )}
                </Body>
              </Bubble>
            ))}
            {loading && statusText && <Status>{statusText}</Status>}
            {error && <ErrorLine>{error}</ErrorLine>}
            <div ref={messagesEndRef} />
          </Messages>
          <StickyInputWrap>
            <InputCard onSubmit={onSubmit}>
              <HeroInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a follow-up…"
                disabled={loading}
              />
              <SendBtn type="submit" disabled={loading || !input.trim()}>
                {loading ? '…' : 'Send'}
              </SendBtn>
            </InputCard>
          </StickyInputWrap>
        </ConvShell>
      )}
      <Disclaimer>
        ORCA provides educational analysis only. Not financial advice.
      </Disclaimer>
    </Shell>
  )
}
