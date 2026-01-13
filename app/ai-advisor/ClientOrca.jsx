/**
 * ORCA AI 2.0 - ChatGPT-style Interface
 * Updated: January 3, 2026
 * Theme: Sonar colors
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
// import { ResponseCards } from '@/components/orca/ResponseCards' // Not used - data in conversational text now

// LunarCrush-inspired Design System
const colors = {
  bgDark: '#0a0f19',
  bgCard: '#0f1622',
  primary: '#3f92ff',
  secondary: '#16c784',
  textPrimary: '#e1e8f0',
  textSecondary: '#8aa7bf',
  borderLight: '#1f2a3a',
  sentimentBull: '#16c784',
  sentimentBear: '#ed4c5c',
  sentimentNeutral: '#f2bc1d',
  purple: '#9b59b6'
}

// Main Container
const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
  max-width: 1200px;
  margin: 0 auto;
  background: ${colors.bgDark};
  border-radius: 12px;
  overflow: hidden;
`

// Header
const ChatHeader = styled.div`
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.secondary} 100%);
  border-bottom: 1px solid ${colors.secondary};
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  h1 {
    font-size: 1.8rem;
    font-weight: 700;
    background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.purple} 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .subtitle {
    font-size: 0.9rem;
    color: ${colors.textSecondary};
    margin-top: 0.25rem;
  }
`

const QuotaBadge = styled.div`
  background: rgba(54, 166, 186, 0.15);
  border: 1px solid ${colors.primary};
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  color: ${colors.textPrimary};
  font-weight: 600;
  
  span {
    color: ${colors.primary};
  }
  
  .upgrade {
    color: ${colors.purple};
    cursor: pointer;
    margin-left: 0.5rem;
    font-size: 0.85rem;
    
    &:hover {
      text-decoration: underline;
    }
  }
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
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${colors.bgDark};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${colors.primary};
    border-radius: 4px;
  }
`

// Message Bubble
const MessageBubble = styled(motion.div)`
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  ${props => props.$isUser && 'flex-direction: row-reverse;'}
  max-width: 85%;
  ${props => props.$isUser && 'margin-left: auto;'}
`

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => props.$isUser ? 
    `linear-gradient(135deg, ${colors.primary} 0%, #2d7bdb 100%)` :
    `linear-gradient(135deg, ${colors.secondary} 0%, #0d9b65 100%)`};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
`

const MessageContent = styled.div`
  flex: 1;
  min-width: 0;
`

const MessageText = styled.div`
  background: ${props => props.$isUser ? 
    'rgba(63, 146, 255, 0.12)' :
    colors.bgCard};
  color: ${colors.textPrimary};
  padding: 1rem 1.25rem;
  border-radius: 16px;
  ${props => props.$isUser ? 'border-top-right-radius: 4px;' : 'border-top-left-radius: 4px;'}
  line-height: 1.65;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  border: 1px solid ${props => props.$isUser ? 'rgba(63, 146, 255, 0.2)' : colors.borderLight};
  font-size: 0.95rem;
  
  a {
    color: ${colors.primary};
    text-decoration: none;
    border-bottom: 1px solid ${colors.primary};
    transition: all 0.2s ease;
    
    &:hover {
      color: ${colors.secondary};
      border-bottom-color: ${colors.secondary};
    }
  }
  
  h3 {
    font-size: 1.05rem;
    font-weight: 600;
    margin: 0.75rem 0 0.5rem 0;
    color: ${colors.primary};
  }
  
  strong {
    color: ${colors.textPrimary};
    font-weight: 600;
  }
`

const MessageTime = styled.div`
  font-size: 0.7rem;
  color: ${colors.textSecondary};
  margin-top: 0.4rem;
  opacity: 0.7;
  ${props => props.$isUser && 'text-align: right;'}
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 1;
  }
`

const CardsContainer = styled.div`
  margin-top: 1rem;
  ${props => props.$isUser && 'margin-left: auto;'}
`

// Input Area
const InputArea = styled.div`
  padding: 1.25rem 1.5rem;
  background: ${colors.bgCard};
  border-top: 1px solid ${colors.borderLight};
  backdrop-filter: blur(10px);
`

const InputForm = styled.form`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`

const Input = styled.input`
  flex: 1;
  background: rgba(15, 22, 34, 0.8);
  border: 1px solid ${colors.borderLight};
  border-radius: 20px;
  padding: 0.875rem 1.25rem;
  color: ${colors.textPrimary};
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s ease;
  
  &:focus {
    border-color: ${colors.primary};
    background: rgba(15, 22, 34, 1);
    box-shadow: 0 0 0 3px rgba(63, 146, 255, 0.12);
  }
  
  &::placeholder {
    color: ${colors.textSecondary};
  }
`

const SendButton = styled.button`
  background: linear-gradient(135deg, ${colors.primary} 0%, #2d7bdb 100%);
  color: white;
  padding: 0.875rem 1.75rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(63, 146, 255, 0.25);
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(63, 146, 255, 0.35);
    background: linear-gradient(135deg, #5aa0ff 0%, #4487e8 100%);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

// Loading indicator
const TypingIndicator = styled(motion.div)`
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  background: ${colors.bgCard};
  border: 1px solid ${colors.secondary};
  border-radius: 18px;
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

// Welcome message
const WelcomeCard = styled(motion.div)`
  background: linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.secondary} 100%);
  border: 1px solid ${colors.secondary};
  border-radius: 18px;
  padding: 2.5rem;
  text-align: center;
  max-width: 700px;
  margin: auto;
  
  h2 {
    font-size: 2rem;
    background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.purple} 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin-bottom: 1rem;
  }
  
  p {
    color: ${colors.textSecondary};
    line-height: 1.7;
    font-size: 1.05rem;
    margin-bottom: 2rem;
  }
  
  .examples {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 2rem;
  }
  
  .example {
    background: rgba(54, 166, 186, 0.1);
    border: 1px solid ${colors.primary};
    padding: 0.75rem 1rem;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    color: ${colors.textPrimary};
      font-size: 0.9rem;
    
    &:hover {
      background: rgba(54, 166, 186, 0.2);
      transform: translateY(-2px);
    }
  }
`

const Disclaimer = styled.div`
  background: rgba(155, 89, 182, 0.1);
  border-left: 3px solid ${colors.purple};
  padding: 1rem 1.25rem;
  margin-top: 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  color: ${colors.textSecondary};
  line-height: 1.5;
  
  strong {
    color: ${colors.textPrimary};
  }
`

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

  // Example questions
  const examples = [
    "What's happening with Bitcoin?",
    "Tell me about ETH",
    "Should I invest in SOL?",
    "Analyze whale activity for LINK"
  ]

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
      {/* Header */}
      <ChatHeader>
        <div>
          <h1>
            <span>🐋</span>
            ORCA AI 2.0
          </h1>
          <div className="subtitle">
            Crypto Intelligence powered by whale data, sentiment analysis, and social insights
          </div>
        </div>
        {quota && (
          <QuotaBadge>
            Questions today: <span>
              {quota.plan === 'unlimited' ? `${quota.used}/Unlimited ♾️` : `${quota.used}/${quota.limit}`}
            </span>
            {quota.plan === 'free' && (
              <a href="/subscribe" className="upgrade">Upgrade to Pro for 5 questions/day!</a>
            )}
          </QuotaBadge>
        )}
      </ChatHeader>

      {/* Messages Area */}
      <MessagesArea>
        {messages.length === 0 ? (
          <WelcomeCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2>👋 Hey there! I'm ORCA.</h2>
            <p>
              I'm your AI-powered crypto analyst. I track whale movements, analyze sentiment across news and social media, 
              and combine it all to give you real insights. Ask me about any cryptocurrency!
            </p>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: colors.textPrimary }}>
              Try asking me:
            </p>
            <div className="examples">
              {examples.map((example, i) => (
                <div
                  key={i}
                  className="example"
                  onClick={() => handleSubmit(null, example)}
                >
                  {example}
                </div>
              ))}
            </div>
          </WelcomeCard>
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
                  {message.role === 'user' ? '👤' : '🐋'}
                </Avatar>
                <MessageContent>
                  <MessageText $isUser={message.role === 'user'}>
                    {message.content}
                  </MessageText>
                  <MessageTime $isUser={message.role === 'user'}>
                    {formatTime(message.timestamp)}
                  </MessageTime>
                  
                  {/* Cards hidden - all data is now in conversational text */}
                  {/* {message.role === 'assistant' && message.data && (
                    <CardsContainer>
                      <ResponseCards
                        data={{
                          price: message.data.price,
                          whale_summary: message.data.whale_summary,
                          sentiment: message.data.sentiment,
                          social: message.data.social,
                          news_headlines: message.data.news_headlines
                        }}
                      />
                    </CardsContainer>
                  )} */}
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
            <Avatar $isUser={false}>🐋</Avatar>
            <MessageContent>
              <TypingIndicator>
                <span />
                <span />
                <span />
              </TypingIndicator>
              <MessageTime>ORCA is analyzing...</MessageTime>
            </MessageContent>
          </MessageBubble>
        )}

        <div ref={messagesEndRef} />
      </MessagesArea>

      {/* Input Area */}
      <InputArea>
        {messages.length > 0 && (
          <Disclaimer>
            <strong>⚠️ ORCA provides educational analysis only.</strong> This is not financial advice.
            Always do your own research before making investment decisions.
          </Disclaimer>
        )}
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
            {loading ? 'Analyzing...' : 'Send'}
          </SendButton>
        </InputForm>
      </InputArea>
    </ChatContainer>
  )
} 
