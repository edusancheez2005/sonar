/**
 * ORCA AI 2.0 - Professional Chat Interface
 * Updated: January 13, 2026
 * Theme: Sonar colors with enhanced visuals
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import OrcaWelcome from './OrcaWelcome'

// Original Sonar colors - clean and professional
const colors = {
  bgDark: '#0a1621',
  bgCard: '#0d2134',
  bgCardLight: '#112940',
  primary: '#36a6ba',
  secondary: '#1e3951',
  textPrimary: '#ffffff',
  textSecondary: '#a0b2c6',
  textMuted: '#6b7d8f',
  borderLight: 'rgba(54, 166, 186, 0.15)',
  accent: '#9b59b6',
  sentimentBull: '#16c784',
  sentimentBear: '#ed4c5c',
  sentimentNeutral: '#f2bc1d'
}

// Animations
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

// Main Container
const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
  max-width: 1000px;
  margin: 0 auto;
  background: ${colors.bgDark};
  border-radius: 16px;
  overflow: hidden;
`

// Messages Area
const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${colors.secondary};
    border-radius: 3px;
  }
`

// Message Bubble
const MessageBubble = styled(motion.div)`
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  ${props => props.$isUser && 'flex-direction: row-reverse;'}
  max-width: 90%;
  ${props => props.$isUser && 'margin-left: auto;'}
`

const Avatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${props => props.$isUser ? 
    `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` :
    `linear-gradient(135deg, ${colors.bgCardLight} 0%, ${colors.secondary} 100%)`};
  border: 2px solid ${props => props.$isUser ? colors.primary : colors.borderLight};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: ${props => props.$isUser ? 'white' : colors.primary};
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  letter-spacing: 0.02em;
  overflow: hidden;
  
  svg {
    width: 26px;
    height: 26px;
    fill: ${colors.primary};
  }
`

// Whale/Orca SVG Icon
const WhaleIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 12.5c0 .28-.22.5-.5.5h-1c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h1c.28 0 .5.22.5.5zM20.5 15h-1c-.28 0-.5.22-.5.5s.22.5.5.5h1c.28 0 .5-.22.5-.5s-.22-.5-.5-.5zM12 4C6.5 4 2 7.58 2 12c0 2.12.91 4.07 2.44 5.56-.47 1.33-1.37 2.44-2.42 3.44.83 0 2.27-.41 4-1.41C7.35 20.51 9.58 21 12 21c5.5 0 10-3.58 10-8s-4.5-9-10-9zm-4.75 9.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3.75 3.5c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2z"/>
  </svg>
)

const MessageContent = styled.div`
  flex: 1;
  min-width: 0;
`

const SenderName = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.$isUser ? colors.primary : colors.textSecondary};
  margin-bottom: 0.5rem;
  ${props => props.$isUser && 'text-align: right;'}
`

const MessageText = styled.div`
  background: ${props => props.$isUser ? 
    `linear-gradient(135deg, ${colors.primary} 0%, #2d8a99 100%)` :
    colors.bgCard};
  color: ${colors.textPrimary};
  padding: ${props => props.$isUser ? '1rem 1.5rem' : '1.5rem'};
  border-radius: 16px;
  ${props => props.$isUser ? 'border-bottom-right-radius: 4px;' : 'border-bottom-left-radius: 4px;'}
  border: ${props => props.$isUser ? 'none' : `1px solid ${colors.borderLight}`};
  line-height: 1.8;
  font-size: 1.05rem;
  
  /* Section Headers */
  h3, strong:first-child {
    display: block;
    font-size: 1.1rem;
    font-weight: 700;
    margin: 1.5rem 0 1rem 0;
    color: ${colors.textPrimary};
    padding-bottom: 0.5rem;
    border-bottom: 1px solid ${colors.borderLight};
  }
    
  /* First header no top margin */
  & > p:first-child strong:first-child,
  & > strong:first-child {
      margin-top: 0;
  }
  
  /* Part headers with icons */
  strong:contains("Part 1"), strong:contains("Sonar Data") {
    &::before {
      content: "◆ ";
      color: ${colors.primary};
    }
  }
  
  strong:contains("Part 2"), strong:contains("News") {
    &::before {
      content: "◇ ";
      color: ${colors.sentimentBull};
    }
  }
  
  strong:contains("Part 3"), strong:contains("Bottom Line") {
    &::before {
      content: "◈ ";
      color: ${colors.accent};
    }
  }
  
  /* Subheaders */
  h4 {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem 0;
    color: ${colors.primary};
  }
  
  p {
    margin: 0.75rem 0;
    line-height: 1.8;
  }
  
  /* Data labels */
  strong {
    color: ${colors.textPrimary};
    font-weight: 600;
  }
  
  /* Lists */
  ul, ol {
    margin: 0.75rem 0;
    padding-left: 0;
    list-style: none;
    
    li {
      margin: 0.6rem 0;
      line-height: 1.7;
      padding-left: 1.25rem;
      position: relative;
      
      &::before {
        content: "›";
        position: absolute;
        left: 0;
        color: ${colors.primary};
        font-weight: 600;
      }
    }
  }
  
  ol {
    counter-reset: item;
    
    li {
      counter-increment: item;
      
      &::before {
        content: counter(item) ".";
        color: ${colors.primary};
        font-weight: 600;
      font-size: 0.9rem;
      }
    }
  }
  
  /* Links - News articles */
  a {
    color: ${colors.primary};
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;
    border-bottom: 1px dashed ${colors.primary};
    
    &:hover {
      color: ${colors.sentimentBull};
      border-bottom-color: ${colors.sentimentBull};
    }
    
    /* External link indicator */
    &[href^="http"]::after {
      content: " ↗";
      font-size: 0.8em;
      opacity: 0.7;
    }
  }
  
  /* Inline code for values */
  code {
    background: rgba(54, 166, 186, 0.15);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-family: 'SF Mono', 'Consolas', monospace;
    font-size: 0.9em;
    color: ${colors.primary};
  }
  
  /* Highlight positive/negative values */
  em {
    font-style: normal;
    font-weight: 500;
  }
`

const MessageTime = styled.div`
  font-size: 0.75rem;
  color: ${colors.textMuted};
  margin-top: 0.5rem;
  ${props => props.$isUser && 'text-align: right;'}
`

// Data Cards for visual enhancement
const DataCardsRow = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1rem;
`

const MiniCard = styled(motion.div)`
  background: ${colors.bgCardLight};
  border: 1px solid ${colors.borderLight};
  border-radius: 10px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 120px;
  
  .icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    background: ${props => props.$color || colors.primary}20;
    color: ${props => props.$color || colors.primary};
  }
  
  .content {
    flex: 1;
    
    .label {
      font-size: 0.7rem;
      color: ${colors.textMuted};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .value {
      font-size: 0.95rem;
      font-weight: 600;
      color: ${colors.textPrimary};
    }
  }
`

// Mini Sparkline for price
const Sparkline = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 24px;
  
  .bar {
    width: 3px;
    background: ${props => props.$positive ? colors.sentimentBull : colors.sentimentBear};
    border-radius: 1px;
    opacity: 0.7;
    
    &:last-child {
      opacity: 1;
    }
  }
`

// Input Area
const InputArea = styled.div`
  padding: 1.5rem 2rem;
  background: ${colors.bgCard};
  border-top: 1px solid ${colors.borderLight};
`

const InputForm = styled.form`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`

const Input = styled.input`
  flex: 1;
  background: ${colors.bgDark};
  border: 1px solid ${colors.borderLight};
  border-radius: 12px;
  padding: 1rem 1.25rem;
  color: ${colors.textPrimary};
  font-size: 1rem;
  outline: none;
  transition: all 0.2s ease;
  
  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(54, 166, 186, 0.1);
  }
  
  &::placeholder {
    color: ${colors.textMuted};
  }
`

const SendButton = styled.button`
  background: ${colors.primary};
  color: white;
  padding: 1rem 1.75rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover:not(:disabled) {
    background: #2d8a99;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .arrow {
    font-size: 1.1rem;
    transition: transform 0.2s ease;
  }
  
  &:hover:not(:disabled) .arrow {
    transform: translateX(2px);
  }
`

// Loading indicator
const TypingIndicator = styled(motion.div)`
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  background: ${colors.bgCard};
  border: 1px solid ${colors.borderLight};
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  width: fit-content;
  
  span {
    width: 8px;
    height: 8px;
    background: ${colors.primary};
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
    
    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
  }
  
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
    40% { transform: scale(1.2); opacity: 1; }
  }
`

const Disclaimer = styled.div`
  background: rgba(54, 166, 186, 0.05);
  border: 1px solid ${colors.borderLight};
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  font-size: 0.8rem;
  color: ${colors.textMuted};
  text-align: center;
`

// Format price with smart decimals
function formatPrice(price) {
  if (!price) return '$0.00'
  if (price >= 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (price >= 0.01) return `$${price.toFixed(4)}`
  return `$${price.toFixed(8)}`
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
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [quota, setQuota] = useState(null)
  const [session, setSession] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  // Get session
  useEffect(() => {
    const getSession = async () => {
      const sb = supabaseBrowser()
      const { data } = await sb.auth.getSession()
      setSession(data.session)
    }
    getSession()
  }, [])

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
        body: JSON.stringify({ message: question })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Add ORCA response
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
    }
  }
  
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <ChatContainer>
      {/* Messages Area */}
      <MessagesArea>
        {messages.length === 0 ? (
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
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </MessageText>
                  
                  {/* Mini data cards for ORCA responses */}
                  {message.role === 'assistant' && message.data?.price && (
                    <DataCardsRow>
                      <MiniCard
                        $color={message.data.price.change_24h >= 0 ? colors.sentimentBull : colors.sentimentBear}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="icon">$</div>
                        <div className="content">
                          <div className="label">Price</div>
                          <div className="value">{formatPrice(message.data.price.current)}</div>
                        </div>
                      </MiniCard>
                      
                      <MiniCard
                        $color={message.data.price.change_24h >= 0 ? colors.sentimentBull : colors.sentimentBear}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.25 }}
                      >
                        <Sparkline $positive={message.data.price.change_24h >= 0}>
                          {generateSparkline(message.data.price.change_24h).map((height, i) => (
                            <div key={i} className="bar" style={{ height: `${height}px` }} />
                          ))}
                        </Sparkline>
                        <div className="content">
                          <div className="label">24h</div>
                          <div className="value" style={{ 
                            color: message.data.price.change_24h >= 0 ? colors.sentimentBull : colors.sentimentBear 
                          }}>
                            {message.data.price.change_24h >= 0 ? '+' : ''}{message.data.price.change_24h?.toFixed(2)}%
                          </div>
                        </div>
                      </MiniCard>
                      
                      {message.data.sentiment && (
                        <MiniCard
                          $color={message.data.sentiment.score > 0.2 ? colors.sentimentBull : 
                                  message.data.sentiment.score < -0.2 ? colors.sentimentBear : 
                                  colors.sentimentNeutral}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <div className="icon">◆</div>
                          <div className="content">
                            <div className="label">Sentiment</div>
                            <div className="value">
                              {message.data.sentiment.score > 0.2 ? 'Bullish' : 
                               message.data.sentiment.score < -0.2 ? 'Bearish' : 'Neutral'}
                            </div>
                          </div>
                        </MiniCard>
                      )}
                      
                      {message.data.social?.sentiment_pct && (
                        <MiniCard
                          $color={colors.primary}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.35 }}
                        >
                          <div className="icon">◇</div>
                          <div className="content">
                            <div className="label">Social</div>
                            <div className="value">{message.data.social.sentiment_pct}% Bullish</div>
                          </div>
                        </MiniCard>
                      )}
                    </DataCardsRow>
                  )}
                  
                  <MessageTime $isUser={message.role === 'user'}>
                    {formatTime(message.timestamp)}
                  </MessageTime>
                </MessageContent>
              </MessageBubble>
            ))}
          </>
        )}

        {/* Loading indicator */}
        {loading && (
          <MessageBubble
            $isUser={false}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
          >
            <Avatar $isUser={false}><WhaleIcon /></Avatar>
            <MessageContent>
              <SenderName $isUser={false}>ORCA</SenderName>
              <TypingIndicator>
                <span />
                <span />
                <span />
              </TypingIndicator>
              <MessageTime>Analyzing...</MessageTime>
            </MessageContent>
          </MessageBubble>
        )}

        <div ref={messagesEndRef} />
      </MessagesArea>

      {/* Input Area */}
      <InputArea>
        <Disclaimer>
          ORCA provides educational analysis only. Not financial advice.
        </Disclaimer>
        <InputForm onSubmit={handleSubmit}>
          <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any cryptocurrency..."
            disabled={loading}
          />
          <SendButton type="submit" disabled={loading || !input.trim()}>
            {loading ? 'Analyzing' : 'Send'}
            <span className="arrow">→</span>
          </SendButton>
        </InputForm>
      </InputArea>
    </ChatContainer>
  )
} 
