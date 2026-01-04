/**
 * ORCA AI 2.0 - Professional Search Interface
 * Inspired by LunarCrush design
 * Updated: January 4, 2026
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { ResponseCards } from '@/components/orca/ResponseCards'

// Theme colors
const colors = {
  bgDark: '#0a1621',
  bgCard: '#0d2134',
  bgInput: '#111b2b',
  primary: '#36a6ba',
  secondary: '#1e3951',
  textPrimary: '#ffffff',
  textSecondary: '#a0b2c6',
  purple: '#9b59b6',
  border: '#1e3951'
}

// Main Container
const Container = styled.div`
  min-height: calc(100vh - 100px);
  background: ${colors.bgDark};
  padding: 2rem;
`

const InnerContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`

// Header Section
const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
  
  h1 {
    font-size: 3rem;
    font-weight: 800;
    background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.purple} 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }
  
  .subtitle {
    font-size: 1.1rem;
    color: ${colors.textSecondary};
    margin-bottom: 2rem;
  }
`

// Search Box (Ask Anything)
const SearchContainer = styled.div`
  position: relative;
  max-width: 900px;
  margin: 0 auto 3rem auto;
`

const SearchBox = styled.div`
  background: ${colors.bgCard};
  border: 2px solid ${colors.border};
  border-radius: 50px;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  
  &:focus-within {
    border-color: ${colors.primary};
    box-shadow: 0 4px 30px rgba(54, 166, 186, 0.3);
  }
  
  .search-icon {
    font-size: 1.5rem;
    color: ${colors.textSecondary};
  }
`

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: ${colors.textPrimary};
  font-size: 1.1rem;
  
  &::placeholder {
    color: ${colors.textSecondary};
  }
`

const SearchButton = styled.button`
  background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.purple} 100%);
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 30px;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(54, 166, 186, 0.3);
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(54, 166, 186, 0.5);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

// Quota Badge
const QuotaBadge = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
  
  .badge {
    display: inline-block;
    background: rgba(54, 166, 186, 0.15);
    border: 1px solid ${colors.primary};
    padding: 0.5rem 1.5rem;
    border-radius: 20px;
    font-size: 0.9rem;
    color: ${colors.textSecondary};
    
    span {
      color: ${colors.primary};
      font-weight: 600;
    }
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

// Results Section
const ResultsContainer = styled(motion.div)`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`

const ResultHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${colors.border};
  
  h2 {
    font-size: 1.8rem;
    color: ${colors.textPrimary};
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
  }
  
  .ticker-badge {
    background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.purple} 100%);
    padding: 0.5rem 1.25rem;
    border-radius: 20px;
    font-size: 1rem;
    font-weight: 700;
    color: white;
  }
  
  .timestamp {
    font-size: 0.85rem;
    color: ${colors.textSecondary};
  }
`

const AnalysisText = styled.div`
  color: ${colors.textPrimary};
  font-size: 1.05rem;
  line-height: 1.8;
  margin-bottom: 2rem;
  
  h3 {
    color: ${colors.primary};
    font-size: 1.3rem;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    font-weight: 600;
  }
  
  p {
    margin-bottom: 1rem;
    color: ${colors.textSecondary};
  }
  
  strong {
    color: ${colors.textPrimary};
    font-weight: 600;
  }
  
  ul {
    margin: 0.5rem 0 1rem 1.5rem;
    
    li {
      margin-bottom: 0.5rem;
      color: ${colors.textSecondary};
    }
  }
`

// Data Cards Grid
const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
`

// Loading State
const LoadingContainer = styled(motion.div)`
  text-align: center;
  padding: 4rem 2rem;
  
  .loading-text {
    font-size: 1.2rem;
    color: ${colors.textSecondary};
    margin-top: 1rem;
  }
  
  .spinner {
    display: inline-block;
    width: 50px;
    height: 50px;
    border: 4px solid ${colors.border};
    border-top: 4px solid ${colors.primary};
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`

// Welcome State
const WelcomeContainer = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  
  h2 {
    font-size: 2rem;
    color: ${colors.textPrimary};
    margin-bottom: 1rem;
  }
  
  p {
    font-size: 1.1rem;
    color: ${colors.textSecondary};
    margin-bottom: 3rem;
  }
`

const ExampleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  max-width: 900px;
  margin: 0 auto;
`

const ExampleCard = styled(motion.button)`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 12px;
  padding: 1.5rem;
  text-align: left;
  color: ${colors.textSecondary};
  font-size: 0.95rem;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    border-color: ${colors.primary};
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(54, 166, 186, 0.2);
  }
  
  .icon {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }
  
  .text {
    color: ${colors.textPrimary};
    font-weight: 500;
  }
`

// Disclaimer
const Disclaimer = styled.div`
  text-align: center;
  padding: 1.5rem;
  margin-top: 2rem;
  background: rgba(155, 89, 182, 0.1);
  border: 1px solid rgba(155, 89, 182, 0.3);
  border-radius: 12px;
  color: ${colors.textSecondary};
  font-size: 0.9rem;
  
  strong {
    color: ${colors.purple};
  }
`

// Main Component
export default function ClientOrcaV2() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [quota, setQuota] = useState(null)
  const [session, setSession] = useState(null)
  const inputRef = useRef(null)

  // Get user session
  useEffect(() => {
    const getSession = async () => {
      const supabase = supabaseBrowser() // Call the function!
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      
      if (session) {
        // Fetch quota
        fetchQuota(session.access_token)
      }
    }
    getSession()
  }, [])

  const fetchQuota = async (token) => {
    try {
      const response = await fetch('/api/quota', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setQuota(data)
    } catch (error) {
      console.error('Error fetching quota:', error)
    }
  }

  const handleSubmit = async (question) => {
    if (!question.trim() || loading) return
    
    setLoading(true)
    setResult(null)

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

      setResult({
        query: question,
        response: data.response,
        ticker: data.ticker,
        data: data.data,
        timestamp: new Date()
      })
      
      setQuota(data.quota)
      setInput('')

    } catch (error) {
      console.error('Error:', error)
      alert(error.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const exampleQuestions = [
    { icon: '🪙', text: 'What about Bitcoin? Should I invest?' },
    { icon: '💎', text: 'Tell me about Ethereum\'s future' },
    { icon: '🌙', text: 'Is Shiba Inu a good buy?' },
    { icon: '🎯', text: 'Should I buy PEPE coin?' },
    { icon: '🦄', text: 'What\'s happening with Uniswap?' },
    { icon: '🔗', text: 'Analyze Chainlink for me' }
  ]

  return (
    <Container>
      <InnerContainer>
        {/* Header */}
        <Header>
          <h1>
            <span>🐋</span>
            ORCA AI
          </h1>
          <div className="subtitle">
            Crypto intelligence powered by whale data, sentiment analysis, and social insights
          </div>
        </Header>

        {/* Quota Badge */}
        {quota && (
          <QuotaBadge>
            <div className="badge">
              Questions today: <span>
                {quota.plan === 'unlimited' ? 
                  `${quota.used}/Unlimited ♾️` : 
                  `${quota.used}/${quota.limit}`
                }
              </span>
              {quota.plan === 'free' && quota.canAsk && (
                <span className="upgrade" onClick={() => window.location.href = '/subscribe'}>
                  Upgrade to Pro for 5 questions/day!
                </span>
              )}
            </div>
          </QuotaBadge>
        )}

        {/* Search Box */}
        <SearchContainer>
          <SearchBox>
            <span className="search-icon">🔍</span>
            <SearchInput
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(input)
                }
              }}
              placeholder="Ask anything about crypto... (e.g., 'Should I invest in Bitcoin?')"
              disabled={loading}
            />
            <SearchButton
              onClick={() => handleSubmit(input)}
              disabled={loading || !input.trim()}
            >
              {loading ? 'Analyzing...' : 'Ask ORCA'}
            </SearchButton>
          </SearchBox>
        </SearchContainer>

        {/* Loading State */}
        <AnimatePresence mode="wait">
          {loading && (
            <LoadingContainer
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="spinner"></div>
              <div className="loading-text">Analyzing data from multiple sources...</div>
            </LoadingContainer>
          )}

          {/* Results */}
          {!loading && result && (
            <ResultsContainer
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Result Header */}
              <ResultHeader>
                <h2>
                  <span>📊</span>
                  Analysis for {result.ticker}
                </h2>
                <div>
                  <div className="ticker-badge">{result.ticker}</div>
                  <div className="timestamp">
                    {result.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </ResultHeader>

              {/* Analysis Text */}
              <AnalysisText>
                {result.response.split('\n').map((paragraph, idx) => {
                  if (paragraph.trim().startsWith('###')) {
                    return <h3 key={idx}>{paragraph.replace('###', '').trim()}</h3>
                  } else if (paragraph.trim()) {
                    return <p key={idx}>{paragraph}</p>
                  }
                  return null
                })}
              </AnalysisText>

              {/* Data Cards */}
              {result.data && (
                <CardsGrid>
                  <ResponseCards
                    data={{
                      price: result.data.price,
                      whale_summary: result.data.whale_summary,
                      sentiment: result.data.sentiment,
                      social: result.data.social,
                      news_headlines: result.data.news_headlines
                    }}
                  />
                </CardsGrid>
              )}
            </ResultsContainer>
          )}

          {/* Welcome State */}
          {!loading && !result && (
            <WelcomeContainer>
              <h2>👋 Welcome to ORCA AI</h2>
              <p>Ask me anything about cryptocurrency. I'll analyze whale data, sentiment, news, and social buzz.</p>
              
              <ExampleGrid>
                {exampleQuestions.map((example, idx) => (
                  <ExampleCard
                    key={idx}
                    onClick={() => {
                      setInput(example.text)
                      inputRef.current?.focus()
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="icon">{example.icon}</div>
                    <div className="text">{example.text}</div>
                  </ExampleCard>
                ))}
              </ExampleGrid>
            </WelcomeContainer>
          )}
        </AnimatePresence>

        {/* Disclaimer */}
        <Disclaimer>
          <strong>⚠️ ORCA provides educational analysis only.</strong> This is not financial advice. 
          Always do your own research before making investment decisions.
        </Disclaimer>
      </InnerContainer>
    </Container>
  )
}

