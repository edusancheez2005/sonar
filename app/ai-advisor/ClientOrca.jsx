/**
 * ORCA AI 2.0 - Terminal Command Center Interface
 * Updated: February 12, 2026
 * Theme: Terminal/Bloomberg aesthetic
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import OrcaWelcome from './OrcaWelcome'
import { useSearchParams } from 'next/navigation'
import TokenIcon from '@/components/TokenIcon'
import SonarLoader from '@/components/wallet-tracker/SonarLoader'

const MONO_FONT = "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace"
const SANS_FONT = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
const colors = {
  bgDark: '#0a0e17',
  bgCard: 'rgba(13, 17, 28, 0.8)',
  bgCardLight: 'rgba(13, 17, 28, 0.6)',
  primary: '#00e5ff',
  secondary: 'rgba(0, 229, 255, 0.08)',
  textPrimary: '#e0e6ed',
  textSecondary: '#8a9ab0',
  textMuted: '#5a6a7a',
  borderLight: 'rgba(0, 229, 255, 0.08)',
  accent: '#9b59b6',
  sentimentBull: '#00e676',
  sentimentBear: '#ff1744',
  sentimentNeutral: '#ffab00'
}

const pulseGlow = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 4px #00e676; }
  50% { opacity: 0.4; box-shadow: 0 0 8px #00e676; }
`

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`

// Premium Overlay
const PremiumOverlay = styled(motion.div)`
  position: fixed; inset: 0;
  background: rgba(10, 14, 23, 0.92); backdrop-filter: blur(16px);
  z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 2rem;
`

const PremiumCard = styled(motion.div)`
  background: rgba(13, 17, 28, 0.95);
  border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 12px; padding: 2.5rem; max-width: 560px; width: 100%;
  box-shadow: 0 0 60px rgba(0, 229, 255, 0.08); text-align: center;
`

const PremiumIcon = styled.div`font-size: 3rem; margin-bottom: 1.5rem;`

const PremiumTitle = styled.h2`
  font-size: 1.6rem; font-weight: 700; color: ${colors.textPrimary}; margin-bottom: 1rem;
  font-family: ${SANS_FONT};
  background: linear-gradient(135deg, ${colors.primary} 0%, #00b8d4 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
`

const PremiumDescription = styled.p`
  font-size: 0.95rem; color: ${colors.textMuted}; margin-bottom: 2rem;
  line-height: 1.6; font-family: ${SANS_FONT};
`

const PremiumFeatureList = styled.ul`
  list-style: none; padding: 0; margin: 1.5rem 0; text-align: left;
  li {
    color: ${colors.textSecondary}; padding: 0.6rem 0; display: flex;
    align-items: center; gap: 0.75rem; font-size: 0.9rem; font-family: ${SANS_FONT};
    &::before { content: '▸'; color: ${colors.primary}; font-weight: bold; }
  }
`

const PremiumButton = styled(motion.a)`
  display: inline-block;
  background: linear-gradient(135deg, ${colors.primary} 0%, #00b8d4 100%);
  color: #0a0e17; padding: 0.9rem 2rem; border-radius: 8px; font-weight: 700;
  font-size: 1rem; text-decoration: none; cursor: pointer; border: none;
  box-shadow: 0 4px 20px rgba(0, 229, 255, 0.25); font-family: ${SANS_FONT};
`

// Outer wrapper for sidebar + chat
const PageWrapper = styled.div`
  display: flex; height: calc(100vh - 100px); max-width: 1300px; margin: 0 auto;
  gap: 0;
  @media (max-width: 768px) { flex-direction: column; }
`

// Sidebar (desktop: static, mobile: overlay drawer)
const Sidebar = styled.div`
  width: 280px; min-width: 280px; background: rgba(8, 12, 20, 0.95);
  border: 1px solid ${colors.borderLight}; border-radius: 8px 0 0 8px;
  display: flex; flex-direction: column; overflow: hidden;
  @media (max-width: 768px) { display: none; }
`

const MobileSidebarOverlay = styled(motion.div)`
  display: none;
  @media (max-width: 768px) {
    display: block; position: fixed; inset: 0; z-index: 999;
    background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
  }
`

const MobileSidebarDrawer = styled(motion.div)`
  display: none;
  @media (max-width: 768px) {
    display: flex; flex-direction: column; position: fixed;
    top: 0; left: 0; bottom: 0; width: 300px; max-width: 85vw;
    z-index: 1000; background: rgba(8, 12, 20, 0.98);
    border-right: 1px solid ${colors.borderLight}; overflow: hidden;
  }
`

const MobileHistoryButton = styled.button`
  display: none;
  @media (max-width: 768px) {
    display: flex; align-items: center; justify-content: center;
    background: none; border: 1px solid ${colors.borderLight};
    color: ${colors.primary}; width: 32px; height: 32px; border-radius: 6px;
    cursor: pointer; font-size: 1rem; flex-shrink: 0;
  }
`

const SessionPreview = styled.div`
  font-family: ${SANS_FONT}; font-size: 0.68rem; color: ${colors.textMuted};
  margin-top: 0.15rem; line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
`

const DeleteSessionButton = styled.button`
  background: none; border: none; color: ${colors.textMuted};
  cursor: pointer; padding: 0.2rem; border-radius: 4px; font-size: 0.7rem;
  opacity: 0; transition: all 0.15s ease; flex-shrink: 0; line-height: 1;
  &:hover { color: ${colors.sentimentBear}; background: rgba(255, 23, 68, 0.1); }
`

const SessionItemRow = styled.div`
  display: flex; align-items: flex-start; gap: 0.5rem;
  &:hover ${DeleteSessionButton} { opacity: 1; }
`

const ConfirmOverlay = styled(motion.div)`
  position: fixed; inset: 0;
  background: rgba(10, 14, 23, 0.85); backdrop-filter: blur(8px);
  z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 2rem;
`

const ConfirmCard = styled(motion.div)`
  background: rgba(13, 17, 28, 0.95);
  border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 10px; padding: 2rem; max-width: 400px; width: 100%;
  box-shadow: 0 0 40px rgba(0, 229, 255, 0.06); text-align: center;
`

const ConfirmTitle = styled.h3`
  font-family: ${MONO_FONT}; font-size: 0.9rem; font-weight: 700;
  color: ${colors.primary}; margin-bottom: 0.75rem; letter-spacing: 1px;
`

const ConfirmText = styled.p`
  font-family: ${SANS_FONT}; font-size: 0.85rem; color: ${colors.textSecondary};
  margin-bottom: 1.5rem; line-height: 1.5;
`

const ConfirmButtons = styled.div`
  display: flex; gap: 0.75rem; justify-content: center;
`

const ConfirmBtn = styled(motion.button)`
  font-family: ${MONO_FONT}; font-size: 0.75rem; font-weight: 600;
  padding: 0.6rem 1.25rem; border-radius: 6px; cursor: pointer; border: none;
  transition: all 0.15s ease;
`

const ConfirmDeleteBtn = styled(ConfirmBtn)`
  background: rgba(255, 23, 68, 0.15); color: ${colors.sentimentBear};
  border: 1px solid rgba(255, 23, 68, 0.3);
  &:hover { background: rgba(255, 23, 68, 0.25); }
`

const ConfirmCancelBtn = styled(ConfirmBtn)`
  background: rgba(0, 229, 255, 0.08); color: ${colors.textSecondary};
  border: 1px solid ${colors.borderLight};
  &:hover { background: rgba(0, 229, 255, 0.15); color: ${colors.textPrimary}; }
`

const SidebarHeader = styled.div`
  padding: 0.75rem 1rem; border-bottom: 1px solid ${colors.borderLight};
  display: flex; align-items: center; justify-content: space-between;
`

const NewChatButton = styled.button`
  background: rgba(0, 229, 255, 0.1); border: 1px solid rgba(0, 229, 255, 0.2);
  color: ${colors.primary}; padding: 0.5rem 1rem; border-radius: 6px;
  font-family: ${MONO_FONT}; font-size: 0.75rem; font-weight: 600;
  cursor: pointer; width: 100%; transition: all 0.2s ease;
  &:hover { background: rgba(0, 229, 255, 0.2); }
`

const SessionList = styled.div`
  flex: 1; overflow-y: auto; padding: 0.5rem;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(0, 229, 255, 0.1); border-radius: 2px; }
`

const SessionItem = styled.div`
  padding: 0.6rem 0.75rem; border-radius: 6px; cursor: pointer;
  margin-bottom: 0.25rem; transition: all 0.15s ease;
  background: ${props => props.$active ? 'rgba(0, 229, 255, 0.1)' : 'transparent'};
  border: 1px solid ${props => props.$active ? 'rgba(0, 229, 255, 0.15)' : 'transparent'};
  &:hover { background: rgba(0, 229, 255, 0.06); }
`

const SessionTitle = styled.div`
  font-family: ${SANS_FONT}; font-size: 0.8rem; font-weight: 600;
  color: ${colors.textPrimary}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`

const SessionMeta = styled.div`
  font-family: ${MONO_FONT}; font-size: 0.6rem; color: ${colors.textMuted};
  margin-top: 0.2rem; display: flex; gap: 0.5rem; align-items: center;
`

// Main Container
const ChatContainer = styled.div`
  display: flex; flex-direction: column; flex: 1;
  height: calc(100vh - 100px);
  background: ${colors.bgDark}; border-radius: 0 8px 8px 0; overflow: hidden;
  border: 1px solid ${colors.borderLight}; border-left: none;
  position: relative;
  @media (max-width: 768px) { border-radius: 8px; border-left: 1px solid ${colors.borderLight}; }
  
  &::before {
    content: '';
    position: absolute; inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 229, 255, 0.005) 2px, rgba(0, 229, 255, 0.005) 4px);
    pointer-events: none; z-index: 0;
  }
`

const ChatHeader = styled.div`
  display: flex; align-items: center; gap: 1rem;
  padding: 0.75rem 1.5rem; border-bottom: 1px solid ${colors.borderLight};
  font-family: ${MONO_FONT}; background: rgba(13, 17, 28, 0.6);
  position: relative; z-index: 1;
`

const MessagesArea = styled.div`
  flex: 1; overflow-y: auto; padding: 1.5rem; display: flex;
  flex-direction: column; gap: 1.5rem; position: relative; z-index: 1;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(0, 229, 255, 0.1); border-radius: 2px; }
`

const MessageBubble = styled(motion.div)`
  display: flex; gap: 0.75rem; align-items: flex-start;
  ${props => props.$isUser && 'flex-direction: row-reverse;'}
  max-width: 90%;
  ${props => props.$isUser && 'margin-left: auto;'}
`

const Avatar = styled.div`
  width: 36px; height: 36px; border-radius: 8px;
  background: ${props => props.$isUser ? `rgba(0, 229, 255, 0.1)` : `rgba(13, 17, 28, 0.9)`};
  border: 1px solid ${props => props.$isUser ? 'rgba(0, 229, 255, 0.2)' : colors.borderLight};
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  font-size: 0.65rem; font-weight: 700; font-family: ${MONO_FONT};
  color: ${props => props.$isUser ? colors.primary : colors.primary};
  svg { width: 20px; height: 20px; fill: ${colors.primary}; }
`

// Whale/Orca SVG Icon
const WhaleIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 12.5c0 .28-.22.5-.5.5h-1c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h1c.28 0 .5.22.5.5zM20.5 15h-1c-.28 0-.5.22-.5.5s.22.5.5.5h1c.28 0 .5-.22.5-.5s-.22-.5-.5-.5zM12 4C6.5 4 2 7.58 2 12c0 2.12.91 4.07 2.44 5.56-.47 1.33-1.37 2.44-2.42 3.44.83 0 2.27-.41 4-1.41C7.35 20.51 9.58 21 12 21c5.5 0 10-3.58 10-8s-4.5-9-10-9zm-4.75 9.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3.75 3.5c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2z"/>
  </svg>
)

const MessageContent = styled.div`flex: 1; min-width: 0;`

const SenderName = styled.div`
  font-size: 0.7rem; font-weight: 600; font-family: ${MONO_FONT};
  color: ${props => props.$isUser ? colors.primary : colors.textMuted};
  margin-bottom: 0.4rem; letter-spacing: 0.5px; text-transform: uppercase;
  ${props => props.$isUser && 'text-align: right;'}
`

const MessageText = styled.div`
  background: ${props => props.$isUser ? 'rgba(0, 229, 255, 0.08)' : colors.bgCard};
  color: ${colors.textPrimary};
  padding: ${props => props.$isUser ? '1rem 1.25rem' : '1.25rem'};
  border-radius: 8px;
  ${props => props.$isUser ? 'border-bottom-right-radius: 2px;' : 'border-bottom-left-radius: 2px;'}
  border: 1px solid ${props => props.$isUser ? 'rgba(0, 229, 255, 0.12)' : colors.borderLight};
  line-height: 1.7;
  font-size: 0.95rem;
  font-family: ${SANS_FONT};
  
  h3, h4 { font-family: ${SANS_FONT}; color: ${colors.primary}; margin: 1.25rem 0 0.75rem 0; font-size: 1rem; }
  & > p:first-child strong:first-child { margin-top: 0; }
  strong { color: ${colors.primary}; font-weight: 600; }
  p { margin: 0.6rem 0; line-height: 1.7; }
  ul, ol { margin: 0.6rem 0; padding-left: 0; list-style: none;
    li { margin: 0.4rem 0; line-height: 1.6; padding-left: 1rem; position: relative;
      &::before { content: "›"; position: absolute; left: 0; color: ${colors.primary}; font-weight: 600; }
    }
  }
  ol { counter-reset: item;
    li { counter-increment: item;
      &::before { content: counter(item) "."; color: ${colors.primary}; font-weight: 600; font-size: 0.85rem; }
    }
  }
  a { color: ${colors.primary}; text-decoration: none; font-weight: 500; border-bottom: 1px dashed rgba(0, 229, 255, 0.3);
    &:hover { border-bottom-color: ${colors.primary}; }
    &[href^="http"]::after { content: " ↗"; font-size: 0.8em; opacity: 0.5; }
  }
  code {
    background: rgba(0, 229, 255, 0.08); padding: 0.15rem 0.4rem; border-radius: 3px;
    font-family: ${MONO_FONT}; font-size: 0.85em; color: ${colors.primary};
    border: 1px solid rgba(0, 229, 255, 0.1);
  }
  pre > code { display: block; padding: 1rem; border-radius: 6px; overflow-x: auto; }
`

const MessageTime = styled.div`
  font-size: 0.65rem; color: ${colors.textMuted}; margin-top: 0.4rem;
  font-family: ${MONO_FONT};
  ${props => props.$isUser && 'text-align: right;'}
`

const DataCardsRow = styled.div`
  display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 0.75rem;
`

const MiniCard = styled(motion.div)`
  background: rgba(13, 17, 28, 0.6);
  border: 1px solid ${colors.borderLight};
  border-left: 3px solid ${props => props.$color || colors.primary};
  border-radius: 4px; padding: 0.6rem 0.85rem;
  display: flex; align-items: center; gap: 0.5rem; min-width: 110px;
  
  .icon {
    width: 24px; height: 24px; border-radius: 4px; display: flex;
    align-items: center; justify-content: center; font-size: 0.75rem;
    background: ${props => props.$color || colors.primary}15;
    color: ${props => props.$color || colors.primary}; font-family: ${MONO_FONT};
  }
  .content {
    flex: 1;
    .label { font-size: 0.6rem; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 1px; font-family: ${SANS_FONT}; font-weight: 600; }
    .value { font-size: 0.85rem; font-weight: 700; color: ${colors.textPrimary}; font-family: ${MONO_FONT}; }
  }
`

const Sparkline = styled.div`
  display: flex; align-items: flex-end; gap: 2px; height: 24px;
  .bar {
    width: 3px; background: ${props => props.$positive ? colors.sentimentBull : colors.sentimentBear};
    border-radius: 1px; opacity: 0.6; &:last-child { opacity: 1; }
  }
`

const InputArea = styled.div`
  padding: 1rem 1.5rem; background: rgba(13, 17, 28, 0.9);
  border-top: 1px solid ${colors.borderLight}; position: relative; z-index: 1;
`

const InputForm = styled.form`display: flex; gap: 0.6rem; align-items: center;`

const Input = styled.input`
  flex: 1; background: rgba(10, 14, 23, 0.9);
  border: 1px solid ${colors.borderLight}; border-radius: 6px;
  padding: 0.75rem 1rem; color: ${colors.textPrimary};
  font-size: 0.9rem; font-family: ${MONO_FONT}; outline: none;
  transition: border-color 0.15s ease;
  &:focus { border-color: ${colors.primary}; box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.06); }
  &::placeholder { color: ${colors.textMuted}; font-family: ${MONO_FONT}; }
`

const SendButton = styled.button`
  background: linear-gradient(135deg, ${colors.primary} 0%, #00b8d4 100%);
  color: #0a0e17; padding: 0.75rem 1.25rem; border-radius: 6px;
  font-weight: 700; font-size: 0.8rem; font-family: ${MONO_FONT};
  transition: all 0.15s ease; display: flex; align-items: center; gap: 0.4rem;
  border: none; cursor: pointer;
  &:hover:not(:disabled) { box-shadow: 0 4px 16px rgba(0, 229, 255, 0.3); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  .arrow { font-size: 1rem; transition: transform 0.15s ease; }
  &:hover:not(:disabled) .arrow { transform: translateX(2px); }
`

const TypingIndicator = styled(motion.div)`
  display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1rem;
  font-family: ${MONO_FONT}; font-size: 0.8rem; color: ${colors.primary};
  
  &::after {
    content: '▎';
    animation: ${blink} 1s step-end infinite;
  }
`

const Disclaimer = styled.div`
  background: rgba(0, 229, 255, 0.03); border: 1px solid ${colors.borderLight};
  padding: 0.6rem 0.85rem; margin-bottom: 0.75rem; border-radius: 4px;
  font-size: 0.7rem; color: ${colors.textMuted}; text-align: center; font-family: ${SANS_FONT};
  a { color: ${colors.primary}; text-decoration: underline; }
`

// Format price with smart decimals
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

// Generate mini sparkline data
function generateSparkline(change) {
  const bars = []
  const baseHeight = 12
  for (let i = 0; i < 7; i++) {
    const variance = Math.random() * 8 - 4
    const height = Math.max(4, baseHeight + variance + (change > 0 ? i * 1.5 : -i * 1.5))
    bars.push(Math.min(24, height))
  }
  return bars
}

export default function ClientOrca() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentSteps, setAgentSteps] = useState([]) // Real-time SSE progress steps
  const [quota, setQuota] = useState(null)
  const [session, setSession] = useState(null)
  const [isPremium, setIsPremium] = useState(false)
  const [checkingPremium, setCheckingPremium] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [sessions, setSessions] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(() => crypto.randomUUID())
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [serverQuota, setServerQuota] = useState(null) // { canAsk, remaining, limit, used, plan, resetsAt }
  const [resetCountdown, setResetCountdown] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null) // session_id to confirm delete
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Ordered list of agent steps with labels
  const AGENT_STEP_ORDER = [
    { key: 'start', label: 'Connecting to Sonar' },
    { key: 'whale_data', label: 'Scanning whale transactions' },
    { key: 'price', label: 'Pulling live price data' },
    { key: 'sentiment', label: 'Loading sentiment scores' },
    { key: 'social', label: 'Gathering social intelligence' },
    { key: 'news', label: 'Fetching news from 3 sources' },
    { key: 'whale_alerts', label: 'Checking large whale alerts' },
    { key: 'lunarcrush', label: 'Querying LunarCrush metrics' },
    { key: 'charts', label: 'Loading chart data' },
    { key: 'ai_thinking', label: 'ORCA analyzing all signals' },
  ]

  // Pre-fill from URL params (e.g. from "Ask ORCA" buttons)
  const prefillDone = useRef(false)
  useEffect(() => {
    if (prefillDone.current) return
    const q = searchParams.get('q')
    if (q) {
      prefillDone.current = true
      setInput(q)
      // Focus the input so user can review and send
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [searchParams])

  // Auto-scroll to bottom (block: 'nearest' prevents page-level scroll)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  // Fetch server-side quota status
  const fetchQuota = async (accessToken) => {
    if (!accessToken) return
    try {
      const res = await fetch('/api/chat/quota', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setServerQuota(data)
        setIsPremium(data.plan === 'premium' || data.plan === 'pro' || data.plan === 'unlimited')
      }
    } catch (err) {
      console.error('Failed to fetch quota:', err)
    }
  }

  // Get session and check premium status via server quota
  useEffect(() => {
    const getSession = async () => {
      const sb = supabaseBrowser()
      const { data } = await sb.auth.getSession()
      setSession(data.session)

      if (data.session?.access_token) {
        await fetchQuota(data.session.access_token)
      }
      setCheckingPremium(false)
    }
    getSession()
  }, [])

  // Reset countdown timer — updates every minute
  useEffect(() => {
    if (!serverQuota?.resetsAt) return
    const update = () => {
      const now = new Date().getTime()
      const reset = new Date(serverQuota.resetsAt).getTime()
      const diff = reset - now
      if (diff <= 0) { setResetCountdown(''); return }
      const hours = Math.floor(diff / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      setResetCountdown(`${hours}h ${mins}m`)
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [serverQuota?.resetsAt])

  // Load chat sessions from API
  const loadSessions = async () => {
    if (!session?.access_token) return
    try {
      const res = await fetch('/api/chat/sessions', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
  }

  useEffect(() => {
    if (session) loadSessions()
  }, [session])

  // Load a specific session's messages (Fix 6: loading state)
  const loadSession = async (sessionId) => {
    if (!session?.access_token) return
    setCurrentSessionId(sessionId)
    setSessionLoading(true)
    setMobileSidebarOpen(false)
    try {
      const res = await fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const loaded = []
        for (const msg of (data.messages || [])) {
          if (msg.user_message) {
            loaded.push({
              id: `${msg.id}-user`,
              role: 'user',
              content: msg.user_message,
              timestamp: new Date(msg.timestamp)
            })
          }
          if (msg.orca_response) {
            loaded.push({
              id: `${msg.id}-orca`,
              role: 'assistant',
              content: msg.orca_response,
              ticker: msg.tickers_mentioned?.[0] || null,
              timestamp: new Date(msg.timestamp)
            })
          }
        }
        setMessages(loaded.length > 0 ? loaded : [])
      }
    } catch (err) {
      console.error('Failed to load session:', err)
    } finally {
      setSessionLoading(false)
    }
  }

  // Start new chat — refresh sidebar so current chat stays visible
  const startNewChat = () => {
    loadSessions()
    setCurrentSessionId(crypto.randomUUID())
    setMessages([])
    setAgentSteps([])
    setMobileSidebarOpen(false)
  }

  // Delete a chat session
  const deleteSession = async (sessionId) => {
    if (!session?.access_token) return
    try {
      const res = await fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.session_id !== sessionId))
        if (currentSessionId === sessionId) {
          setCurrentSessionId(crypto.randomUUID())
          setMessages([])
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
    setDeleteConfirm(null)
  }

  // Reset agent steps when loading ends
  useEffect(() => {
    if (!loading) {
      setAgentSteps([])
    }
  }, [loading])

  const handleSubmit = async (e, exampleQuery = null) => {
    if (e) e.preventDefault()
    
    const question = exampleQuery || input.trim()
    if (!question) return

    // Check if logged in
    if (!session) {
      alert('Please log in to use ORCA AI')
      window.location.href = '/auth/signin?redirect=/ai-advisor'
      return
    }

    // Check quota from server state
    if (serverQuota && !serverQuota.canAsk) {
      if (!isPremium) {
        setShowUpgradeModal(true)
      }
      // Rate limited message will come from server if we try anyway
      return
    }

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ message: question, session_id: currentSessionId })
      })

      const contentType = response.headers.get('content-type') || ''

      // SSE streaming response (ticker analysis)
      if (contentType.includes('text/event-stream')) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() // Keep incomplete event in buffer

          for (const part of parts) {
            const line = part.trim()
            if (!line.startsWith('data: ')) continue

            try {
              const event = JSON.parse(line.slice(6))

              if (event.type === 'status') {
                setAgentSteps(prev => {
                  // Avoid duplicates
                  if (prev.some(s => s.step === event.step)) return prev
                  return [...prev, { step: event.step, message: event.message, detail: event.detail || '' }]
                })
              } else if (event.type === 'complete') {
                const orcaMessage = {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: event.response,
                  ticker: event.ticker,
                  data: event.data,
                  timestamp: new Date()
                }
                setMessages(prev => [...prev, orcaMessage])
                setQuota(event.quota)
              } else if (event.type === 'error') {
                throw new Error(event.message)
              }
            } catch (parseError) {
              // Ignore malformed SSE events
              if (parseError instanceof SyntaxError) continue
              throw parseError
            }
          }
        }

        return
      }

      // Regular JSON response (conversational, errors)
      const data = await response.json()

      if (!response.ok) {
        // Special handling for rate limit errors
        if (response.status === 429 && data.isRateLimited) {
          const rateLimitMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.message,
            isRateLimited: true,
            plan: data.quota?.plan || 'free',
            timestamp: new Date()
          }
          setMessages(prev => [...prev, rateLimitMessage])
          setQuota(data.quota)
          return
        }
        throw new Error(data.error || 'Failed to get response')
      }

      // Add ORCA response (conversational)
      const orcaMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        ticker: data.ticker,
        data: data.data,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, orcaMessage])
      setQuota(data.quota)

    } catch (error) {
      console.error('Error:', error)
      
      // Add error message
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
      // Optimistic sidebar update instead of fetching all sessions (Fix 4)
      setSessions(prev => {
        const existing = prev.find(s => s.session_id === currentSessionId)
        if (existing) {
          return prev.map(s => s.session_id === currentSessionId
            ? { ...s, message_count: s.message_count + 1, last_activity: new Date().toISOString() }
            : s
          )
        }
        // New session — prepend it
        return [{
          session_id: currentSessionId,
          title: question.substring(0, 50) || 'Chat',
          preview: null,
          ticker: null,
          last_activity: new Date().toISOString(),
          message_count: 1
        }, ...prev]
      })
      // Refresh server quota after each message
      fetchQuota(session?.access_token)
    }
  }
  
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Show loading while checking premium status
  if (checkingPremium) {
  return (
      <ChatContainer>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: colors.textSecondary 
        }}>
          Loading...
        </div>
      </ChatContainer>
    )
  }

  // Shared session list renderer (used in desktop sidebar and mobile drawer)
  const renderSessionList = () => (
    <>
      <SidebarHeader>
        <NewChatButton onClick={startNewChat}>+ New Chat</NewChatButton>
      </SidebarHeader>
      <SessionList>
        {sessions.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: colors.textMuted, fontSize: '0.75rem', fontFamily: SANS_FONT }}>
            Your conversations will appear here
          </div>
        ) : (
          sessions.map(s => (
            <SessionItemRow key={s.session_id}>
              <SessionItem
                style={{ flex: 1 }}
                $active={s.session_id === currentSessionId}
                onClick={() => loadSession(s.session_id)}
              >
                <SessionTitle>{s.title}</SessionTitle>
                {s.preview && <SessionPreview>{s.preview}</SessionPreview>}
                <SessionMeta>
                  {s.ticker && <span style={{ color: colors.primary, fontWeight: 600 }}>{s.ticker}</span>}
                  <span>{new Date(s.last_activity).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  <span>{s.message_count} msg{s.message_count !== 1 ? 's' : ''}</span>
                </SessionMeta>
              </SessionItem>
              <DeleteSessionButton
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(s.session_id) }}
                title="Delete chat"
              >
                &#10005;
              </DeleteSessionButton>
            </SessionItemRow>
          ))
        )}
      </SessionList>
    </>
  )

  return (
    <>
    <PageWrapper>
    {/* Desktop Sidebar */}
    <Sidebar>{renderSessionList()}</Sidebar>

    {/* Mobile Sidebar Drawer (Fix 3) */}
    <AnimatePresence>
      {mobileSidebarOpen && (
        <>
          <MobileSidebarOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
          />
          <MobileSidebarDrawer
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
          >
            {renderSessionList()}
          </MobileSidebarDrawer>
        </>
      )}
    </AnimatePresence>

    <ChatContainer>
      {/* Terminal Header */}
      <ChatHeader>
        <MobileHistoryButton onClick={() => setMobileSidebarOpen(true)} aria-label="Chat history">
          &#9776;
        </MobileHistoryButton>
        <span style={{ fontWeight: 800, color: colors.primary, fontSize: '0.8rem', letterSpacing: '2px' }}>ORCA_TERMINAL</span>
        <span style={{ color: colors.textMuted, fontSize: '0.7rem' }}>v5.0</span>
        {serverQuota && isPremium && (
          <span style={{ fontSize: '0.65rem', fontFamily: MONO_FONT, color: colors.textMuted, marginLeft: '0.5rem' }}>
            {serverQuota.remaining}/{serverQuota.limit} left
          </span>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: colors.sentimentBull, marginLeft: 'auto' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.sentimentBull, display: 'inline-block' }} />
          ONLINE
        </span>
      </ChatHeader>

      {/* Messages Area */}
      <MessagesArea>
        {sessionLoading ? (
          <SonarLoader text="Loading conversation..." size={60} compact />
        ) : messages.length === 0 ? (
          <OrcaWelcome onExampleClick={(example) => handleSubmit(null, example)} />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                $isUser={message.role === 'user'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Avatar $isUser={message.role === 'user'}>
                  {message.role === 'user' ? 'You' : <WhaleIcon />}
                </Avatar>
                <MessageContent>
                  <SenderName $isUser={message.role === 'user'}>
                    {message.role === 'user' ? 'You' : 'ORCA'}
                  </SenderName>
                  <MessageText $isUser={message.role === 'user'}>
                    {message.role === 'user' ? (
                      message.content
                    ) : message.isRateLimited ? (
                      <div style={{ 
                        padding: '1.25rem', 
                        background: colors.bgCard,
                        borderRadius: '8px',
                        border: `1px solid ${colors.borderLight}`
                      }}>
                        <div style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: '600', 
                          color: colors.primary,
                          marginBottom: '0.75rem'
                        }}>
                          Daily Limit Reached
                        </div>
                        <p style={{ 
                          color: colors.textSecondary, 
                          marginBottom: '1rem',
                          lineHeight: '1.6'
                        }}>
                          {message.content}
                        </p>
                        {message.plan === 'free' && (
                          <a 
                            href="/subscribe"
                            style={{
                              display: 'inline-block',
                              background: `linear-gradient(135deg, ${colors.primary} 0%, #00b8d4 100%)`,
                              color: '#0a0e17',
                              padding: '0.75rem 1.5rem',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              fontWeight: '600',
                              fontSize: '0.95rem',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.target.style.transform = 'translateY(-2px)'
                              e.target.style.boxShadow = '0 8px 20px rgba(54, 166, 186, 0.4)'
                            }}
                            onMouseOut={(e) => {
                              e.target.style.transform = 'translateY(0)'
                              e.target.style.boxShadow = 'none'
                            }}
                          >
                            Upgrade to ORCA Pro →
                          </a>
                        )}
                      </div>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </MessageText>
                  
                  {/* Token Header with Logo */}
                  {message.role === 'assistant' && message.ticker && (
                    <div style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginTop: '12px', marginBottom: '8px', flexWrap: 'wrap', gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <TokenIcon symbol={message.ticker} size={28} />
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: colors.textPrimary, fontFamily: MONO_FONT, letterSpacing: '1px' }}>
                          {message.ticker}
                        </span>
                        {message.data?.price?.current > 0 && (
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: colors.primary, fontFamily: MONO_FONT }}>
                            {formatPrice(message.data.price.current)}
                          </span>
                        )}
                        {message.data?.price?.change_24h != null && (
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 700, fontFamily: MONO_FONT,
                            color: message.data.price.change_24h >= 0 ? colors.sentimentBull : colors.sentimentBear,
                            padding: '0.15rem 0.35rem', borderRadius: '3px',
                            background: message.data.price.change_24h >= 0 ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 23, 68, 0.08)',
                          }}>
                            {message.data.price.change_24h >= 0 ? '▲' : '▼'} {Math.abs(message.data.price.change_24h).toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <a href={`/token/${encodeURIComponent(message.ticker)}?sinceHours=24`} style={{
                        fontSize: '0.7rem', fontFamily: MONO_FONT, fontWeight: 600,
                        color: colors.primary, textDecoration: 'none',
                        padding: '0.25rem 0.6rem', borderRadius: '4px',
                        border: `1px solid ${colors.borderLight}`,
                        transition: 'all 0.15s ease',
                      }}>
                        VIEW CHART →
                      </a>
                    </div>
                  )}
                  
                  {/* Terminal-style data dashboard after ORCA responses */}
                  {message.role === 'assistant' && message.data?.price && (
                    <div style={{
                      background: 'rgba(0, 229, 255, 0.02)', border: `1px solid ${colors.borderLight}`,
                      borderRadius: '6px', padding: '0.75rem', marginTop: '0.5rem', marginBottom: '0.5rem',
                    }}>
                      {/* KPI Row */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                        gap: '0.5rem', marginBottom: message.data.whale_summary || message.data.lunarcrush ? '0.6rem' : 0,
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.55rem', color: colors.textMuted, fontFamily: SANS_FONT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>Price</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: MONO_FONT, color: colors.textPrimary }}>{formatPrice(message.data.price.current)}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.55rem', color: colors.textMuted, fontFamily: SANS_FONT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>24h</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: MONO_FONT, color: message.data.price.change_24h >= 0 ? colors.sentimentBull : colors.sentimentBear }}>
                            {message.data.price.change_24h >= 0 ? '+' : ''}{message.data.price.change_24h?.toFixed(2)}%
                          </div>
                        </div>
                        {message.data.price.market_cap > 0 && (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.55rem', color: colors.textMuted, fontFamily: SANS_FONT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>MCap</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: MONO_FONT, color: colors.textPrimary }}>{formatCompact(message.data.price.market_cap)}</div>
                          </div>
                        )}
                        {message.data.price.volume_24h > 0 && (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.55rem', color: colors.textMuted, fontFamily: SANS_FONT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>Volume</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: MONO_FONT, color: colors.textPrimary }}>{formatCompact(message.data.price.volume_24h)}</div>
                          </div>
                        )}
                        {message.data.sentiment && (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.55rem', color: colors.textMuted, fontFamily: SANS_FONT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>Sentiment</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: MONO_FONT, color: message.data.sentiment.score > 0.2 ? colors.sentimentBull : message.data.sentiment.score < -0.2 ? colors.sentimentBear : colors.sentimentNeutral }}>
                              {message.data.sentiment.score > 0.2 ? 'Bullish' : message.data.sentiment.score < -0.2 ? 'Bearish' : 'Neutral'}
                            </div>
                          </div>
                        )}
                        {message.data.social?.sentiment_pct && (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.55rem', color: colors.textMuted, fontFamily: SANS_FONT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>Social</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: MONO_FONT, color: colors.primary }}>{message.data.social.sentiment_pct}%</div>
                          </div>
                        )}
                      </div>

                      {/* 24-Hour Price Chart */}
                      {message.data.sparkline_24h && message.data.sparkline_24h.length > 5 && (() => {
                        const prices = message.data.sparkline_24h
                        const min = Math.min(...prices)
                        const max = Math.max(...prices)
                        const range = max - min || 1
                        const width = 400
                        const height = 80
                        const padding = 2
                        const isPositive = prices[prices.length - 1] >= prices[0]
                        const color = isPositive ? colors.sentimentBull : colors.sentimentBear
                        
                        const points = prices.map((p, i) => {
                          const x = padding + (i / (prices.length - 1)) * (width - padding * 2)
                          const y = padding + (1 - (p - min) / range) * (height - padding * 2)
                          return `${x},${y}`
                        }).join(' ')
                        
                        const firstX = padding
                        const lastX = padding + ((prices.length - 1) / (prices.length - 1)) * (width - padding * 2)
                        const areaPath = `M${firstX},${height} L${points.split(' ').map(p => `L${p}`).join(' ')} L${lastX},${height} Z`
                        
                        return (
                          <div style={{
                            margin: '0.5rem 0', padding: '0.75rem', borderRadius: '6px',
                            background: 'rgba(0, 229, 255, 0.03)', border: `1px solid ${colors.borderLight}`,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                              <span style={{ fontSize: '0.65rem', fontFamily: MONO_FONT, color: colors.primary, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                                24H PRICE CHART
                              </span>
                              <span style={{ fontSize: '0.65rem', fontFamily: MONO_FONT, color: isPositive ? colors.sentimentBull : colors.sentimentBear, fontWeight: 700 }}>
                                {isPositive ? '▲' : '▼'} {((prices[prices.length-1] - prices[0]) / prices[0] * 100).toFixed(2)}%
                              </span>
                            </div>
                            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
                              <defs>
                                <linearGradient id={`grad24-${message.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              {[0.25, 0.5, 0.75].map(pct => (
                                <line key={pct} x1={0} y1={pct * height} x2={width} y2={pct * height} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                              ))}
                              <path d={areaPath} fill={`url(#grad24-${message.id})`} />
                              <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              <circle cx={lastX} cy={padding + (1 - (prices[prices.length-1] - min) / range) * (height - padding * 2)} r="3" fill={color} />
                            </svg>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                              <span style={{ fontSize: '0.55rem', fontFamily: MONO_FONT, color: colors.textMuted }}>Low: {formatPrice(min)}</span>
                              <span style={{ fontSize: '0.55rem', fontFamily: MONO_FONT, color: colors.textMuted }}>High: {formatPrice(max)}</span>
                            </div>
                          </div>
                        )
                      })()}

                      {/* 7-Day Price Sparkline Chart */}
                      {message.data.sparkline_7d && message.data.sparkline_7d.length > 5 && (() => {
                        const prices = message.data.sparkline_7d
                        const min = Math.min(...prices)
                        const max = Math.max(...prices)
                        const range = max - min || 1
                        const width = 400
                        const height = 60
                        const padding = 2
                        const isPositive = prices[prices.length - 1] >= prices[0]
                        const color = isPositive ? colors.sentimentBull : colors.sentimentBear
                        
                        const points = prices.map((p, i) => {
                          const x = padding + (i / (prices.length - 1)) * (width - padding * 2)
                          const y = padding + (1 - (p - min) / range) * (height - padding * 2)
                          return `${x},${y}`
                        }).join(' ')
                        
                        // Area fill path
                        const firstX = padding
                        const lastX = padding + ((prices.length - 1) / (prices.length - 1)) * (width - padding * 2)
                        const areaPath = `M${firstX},${height} L${points.split(' ').map(p => `L${p}`).join(' ')} L${lastX},${height} Z`
                        
                        return (
                          <div style={{
                            margin: '0.5rem 0', padding: '0.5rem', borderRadius: '4px',
                            background: 'rgba(0, 229, 255, 0.02)', border: `1px solid ${colors.borderLight}`,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.6rem', fontFamily: MONO_FONT, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                                7D PRICE CHART
                              </span>
                              <span style={{ fontSize: '0.6rem', fontFamily: MONO_FONT, color: isPositive ? colors.sentimentBull : colors.sentimentBear, fontWeight: 700 }}>
                                {isPositive ? '▲' : '▼'} {((prices[prices.length-1] - prices[0]) / prices[0] * 100).toFixed(2)}%
                              </span>
                            </div>
                            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
                              <defs>
                                <linearGradient id={`grad-${message.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              {/* Grid lines */}
                              {[0.25, 0.5, 0.75].map(pct => (
                                <line key={pct} x1={0} y1={pct * height} x2={width} y2={pct * height} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                              ))}
                              {/* Area fill */}
                              <path d={areaPath} fill={`url(#grad-${message.id})`} />
                              {/* Price line */}
                              <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              {/* Current price dot */}
                              <circle cx={lastX} cy={padding + (1 - (prices[prices.length-1] - min) / range) * (height - padding * 2)} r="2.5" fill={color} />
                            </svg>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                              <span style={{ fontSize: '0.55rem', fontFamily: MONO_FONT, color: colors.textMuted }}>{formatPrice(min)}</span>
                              <span style={{ fontSize: '0.55rem', fontFamily: MONO_FONT, color: colors.textMuted }}>{formatPrice(max)}</span>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Whale + LunarCrush row */}
                      {(message.data.whale_summary || message.data.lunarcrush) && (
                        <div style={{
                          display: 'flex', flexWrap: 'wrap', gap: '0.4rem',
                          paddingTop: '0.6rem', borderTop: `1px solid ${colors.borderLight}`,
                        }}>
                          {message.data.whale_summary && (
                            <>
                              <span style={{ fontSize: '0.65rem', fontFamily: MONO_FONT, color: message.data.whale_summary.net_flow >= 0 ? colors.sentimentBull : colors.sentimentBear, padding: '0.15rem 0.4rem', borderRadius: '3px', background: message.data.whale_summary.net_flow >= 0 ? 'rgba(0, 230, 118, 0.06)' : 'rgba(255, 23, 68, 0.06)', border: `1px solid ${message.data.whale_summary.net_flow >= 0 ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 23, 68, 0.1)'}` }}>
                                WHALE: {message.data.whale_summary.net_flow >= 0 ? '+' : ''}{formatCompact(message.data.whale_summary.net_flow)}
                              </span>
                              <span style={{ fontSize: '0.65rem', fontFamily: MONO_FONT, color: colors.textMuted, padding: '0.15rem 0.4rem', borderRadius: '3px', border: `1px solid ${colors.borderLight}` }}>
                                {message.data.whale_summary.transactions} TXN ({message.data.whale_summary.buy_sell_ratio})
                              </span>
                            </>
                          )}
                          {message.data.lunarcrush?.galaxy_score > 0 && (
                            <span style={{ fontSize: '0.65rem', fontFamily: MONO_FONT, color: message.data.lunarcrush.galaxy_score >= 60 ? colors.sentimentBull : message.data.lunarcrush.galaxy_score >= 40 ? colors.sentimentNeutral : colors.sentimentBear, padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(0, 229, 255, 0.04)', border: `1px solid ${colors.borderLight}` }}>
                              GALAXY: {message.data.lunarcrush.galaxy_score}/100
                            </span>
                          )}
                          {message.data.lunarcrush?.alt_rank > 0 && (
                            <span style={{ fontSize: '0.65rem', fontFamily: MONO_FONT, color: colors.primary, padding: '0.15rem 0.4rem', borderRadius: '3px', border: `1px solid ${colors.borderLight}` }}>
                              ALT RANK: #{message.data.lunarcrush.alt_rank}
                            </span>
                          )}
                          {message.data.price.ath_distance != null && (
                            <span style={{ fontSize: '0.65rem', fontFamily: MONO_FONT, color: colors.textMuted, padding: '0.15rem 0.4rem', borderRadius: '3px', border: `1px solid ${colors.borderLight}` }}>
                              ATH: {message.data.price.ath_distance.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <MessageTime $isUser={message.role === 'user'}>
                    {formatTime(message.timestamp)}
                  </MessageTime>
                </MessageContent>
              </MessageBubble>
            ))}
          </>
        )}

        {/* Loading indicator — real-time agent step tracker */}
        {loading && (
          <MessageBubble
            $isUser={false}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
          >
            <Avatar $isUser={false}><WhaleIcon /></Avatar>
            <MessageContent>
              <SenderName $isUser={false}>ORCA</SenderName>
              <div style={{ 
                background: colors.bgCard,
                border: `1px solid ${colors.borderLight}`,
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '0.4rem',
                minWidth: '320px'
              }}>
                {/* Completed + in-progress steps from SSE */}
                {agentSteps.map((s, i) => (
                  <motion.div
                    key={s.step}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.3rem 0',
                      fontFamily: MONO_FONT,
                      fontSize: '0.75rem',
                    }}
                  >
                    {/* Checkmark for completed, spinner for last (in-progress) */}
                    {i < agentSteps.length - 1 ? (
                      <span style={{ color: colors.sentimentBull, fontWeight: 700, fontSize: '0.8rem' }}>&#10003;</span>
                    ) : (
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        style={{ color: colors.primary, fontWeight: 700, fontSize: '0.8rem' }}
                      >&#9679;</motion.span>
                    )}
                    <span style={{ color: i < agentSteps.length - 1 ? colors.textSecondary : colors.textPrimary }}>
                      {s.message}
                    </span>
                    {s.detail && (
                      <span style={{ color: colors.textMuted, marginLeft: 'auto', fontSize: '0.7rem' }}>
                        {s.detail}
                      </span>
                    )}
                  </motion.div>
                ))}
                {/* Upcoming steps (dimmed) */}
                {AGENT_STEP_ORDER
                  .filter(s => !agentSteps.some(a => a.step === s.key))
                  .slice(0, 3) // Show next 3 upcoming
                  .map(s => (
                    <div
                      key={s.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.3rem 0',
                        fontFamily: MONO_FONT,
                        fontSize: '0.75rem',
                        opacity: 0.3,
                      }}
                    >
                      <span style={{ color: colors.textMuted, fontWeight: 700, fontSize: '0.8rem' }}>&#9675;</span>
                      <span style={{ color: colors.textMuted }}>{s.label}</span>
                    </div>
                  ))
                }
              </div>
              <MessageTime>Deep analysis in progress...</MessageTime>
            </MessageContent>
          </MessageBubble>
        )}

        <div ref={messagesEndRef} />
      </MessagesArea>

      {/* Input Area */}
      <InputArea>
        <Disclaimer>
          {serverQuota && !serverQuota.canAsk && !isPremium ? (
            <span style={{ color: colors.sentimentNeutral }}>
              Free prompts used. <a href="/subscribe" style={{ color: colors.primary, textDecoration: 'underline' }}>Upgrade to Premium</a> for {serverQuota.limit > 2 ? serverQuota.limit : 5} prompts/day.
              {resetCountdown && <span style={{ marginLeft: '0.5rem', color: colors.textMuted }}>Resets in {resetCountdown}</span>}
            </span>
          ) : serverQuota && !serverQuota.canAsk && isPremium ? (
            <span style={{ color: colors.sentimentNeutral }}>
              Daily limit reached ({serverQuota.limit} prompts).
              {resetCountdown && <span style={{ marginLeft: '0.5rem', color: colors.primary }}> Resets in {resetCountdown}</span>}
            </span>
          ) : serverQuota && serverQuota.canAsk && !isPremium && serverQuota.remaining > 0 ? (
            <span style={{ color: colors.primary }}>You have {serverQuota.remaining} free ORCA prompt{serverQuota.remaining !== 1 ? 's' : ''} — try it now!</span>
          ) : (
            'ORCA provides educational analysis only. Not financial advice.'
          )}
        </Disclaimer>
        <InputForm onSubmit={handleSubmit}>
          <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={serverQuota && !serverQuota.canAsk ? "Daily limit reached..." : "Ask about any cryptocurrency..."}
            disabled={loading || (serverQuota && !serverQuota.canAsk)}
          />
          <SendButton type="submit" disabled={loading || !input.trim() || (serverQuota && !serverQuota.canAsk)}>
            {loading ? 'Analyzing' : serverQuota && !serverQuota.canAsk ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.7 }}>
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
            ) : 'Send'}
            {loading || (serverQuota && !serverQuota.canAsk) ? null : <span className="arrow">→</span>}
          </SendButton>
        </InputForm>
      </InputArea>
    </ChatContainer>
    
    {/* Upgrade Modal - Shows after free prompt is used */}
    {showUpgradeModal && (
      <PremiumOverlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        onClick={() => setShowUpgradeModal(false)}
      >
        <PremiumCard
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          onClick={(e) => e.stopPropagation()}
        >
          <PremiumIcon>🐋</PremiumIcon>
          <PremiumTitle>You've Used Your Free Preview!</PremiumTitle>
          <PremiumDescription>
            You've experienced the power of ORCA AI with your free prompt. 
            Upgrade to Premium for unlimited conversations and deeper market insights.
          </PremiumDescription>
          <PremiumFeatureList>
            <li>10 AI conversations per day with ORCA 2.0</li>
            <li>Real-time whale transaction analysis</li>
            <li>Advanced sentiment & social insights</li>
            <li>Custom whale alerts & notifications</li>
            <li>Priority support & updates</li>
          </PremiumFeatureList>
          <PremiumButton
            href="/subscribe"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Upgrade to Premium - $7.99/month
          </PremiumButton>
          <div 
            style={{ 
              marginTop: '1rem', 
              color: colors.textSecondary, 
              fontSize: '0.9rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            onClick={() => setShowUpgradeModal(false)}
          >
            Maybe later
          </div>
        </PremiumCard>
      </PremiumOverlay>
    )}
    {/* Delete Confirmation Dialog */}
    <AnimatePresence>
      {deleteConfirm && (
        <ConfirmOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setDeleteConfirm(null)}
        >
          <ConfirmCard
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ConfirmTitle>DELETE_CHAT</ConfirmTitle>
            <ConfirmText>
              This will permanently remove this conversation and all its messages. This action cannot be undone.
            </ConfirmText>
            <ConfirmButtons>
              <ConfirmCancelBtn
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </ConfirmCancelBtn>
              <ConfirmDeleteBtn
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => deleteSession(deleteConfirm)}
              >
                Delete
              </ConfirmDeleteBtn>
            </ConfirmButtons>
          </ConfirmCard>
        </ConfirmOverlay>
      )}
    </AnimatePresence>
    </PageWrapper>
    </>
  )
} 
