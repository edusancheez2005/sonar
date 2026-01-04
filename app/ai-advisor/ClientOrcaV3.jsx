/**
 * ORCA Intelligence - Professional Research Interface
 * Design: Institutional-grade crypto intelligence platform
 * Target: LunarCrush quality bar
 * Date: January 4, 2026
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { ResponseCards } from '@/components/orca/ResponseCardsV3'

export default function ClientOrcaV3() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [quota, setQuota] = useState(null)
  const [session, setSession] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const getSession = async () => {
      const supabase = supabaseBrowser()
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      
      if (session) {
        fetchQuota(session.access_token)
      }
    }
    getSession()
    
    // Autofocus input on page load
    if (inputRef.current && !result) {
      inputRef.current.focus()
    }
  }, [result])

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
      setResult({
        query: question,
        response: `Error: ${error.message}. Please try again.`,
        ticker: null,
        data: null,
        timestamp: new Date(),
        error: true
      })
    } finally {
      setLoading(false)
    }
  }

  const exampleQueries = [
    'Bitcoin institutional flows',
    'Ethereum whale accumulation patterns',
    'Solana ecosystem vs Ethereum',
    'PEPE coin short-term risk/reward'
  ]

  // Parse response sections
  const parseResponse = (text) => {
    if (!text) return { prose: '', themes: [], shortTerm: '', longTerm: '' }
    
    const sections = {
      prose: '',
      themes: [],
      shortTerm: '',
      longTerm: ''
    }
    
    const lines = text.split('\n')
    let currentSection = 'prose'
    let proseLines = []
    let themeLines = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.startsWith('### News') || trimmed.startsWith('### KEY THEMES') || trimmed.match(/^KEY THEMES/i)) {
        currentSection = 'themes'
        continue
      } else if (trimmed.match(/^SHORT[- ]TERM/i) || trimmed.startsWith('### Short-Term')) {
        currentSection = 'shortTerm'
        continue
      } else if (trimmed.match(/^LONG[- ]TERM/i) || trimmed.startsWith('### Long-Term')) {
        currentSection = 'longTerm'
        continue
      } else if (trimmed.startsWith('### Global') || trimmed.match(/^GLOBAL/i)) {
        currentSection = 'prose' // Merge global context into prose
        continue
      }
      
      if (currentSection === 'prose' && trimmed && !trimmed.startsWith('#')) {
        proseLines.push(trimmed)
      } else if (currentSection === 'themes' && (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('1.') || trimmed.startsWith('2.') || trimmed.startsWith('3.'))) {
        themeLines.push(trimmed.replace(/^[•\-\d.]\s*/, ''))
      } else if (currentSection === 'shortTerm' && trimmed && !trimmed.startsWith('#')) {
        sections.shortTerm += trimmed + ' '
      } else if (currentSection === 'longTerm' && trimmed && !trimmed.startsWith('#')) {
        sections.longTerm += trimmed + ' '
      }
    }
    
    sections.prose = proseLines.slice(0, 3).join(' ') // First 3 paragraphs max
    sections.themes = themeLines.slice(0, 4)
    
    return sections
  }

  const parsed = result ? parseResponse(result.response) : null

  return (
    <div className="min-h-screen bg-[#0a1621] py-8 px-4">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-4">
            <div className="text-6xl mb-3">🐋</div>
            <h1 className="text-[42px] font-bold tracking-tight text-[#e5e7eb] mb-2">
              ORCA Intelligence
            </h1>
            <p className="text-base text-[#708090] font-medium">
              Real-time whale moves · Multi-source sentiment
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="max-w-[700px] mx-auto mb-4">
          <div className="relative">
            <div className="flex items-center gap-3 bg-[rgba(13,33,52,0.6)] backdrop-blur-sm border border-[#1e3951] rounded-xl px-5 py-4 focus-within:border-[#36a6ba] transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(input)
                  }
                }}
                placeholder={result ? "Ask follow-up or analyze another token..." : "Analyze any token..."}
                disabled={loading}
                className="flex-1 bg-transparent border-none outline-none text-base text-gray-100 placeholder:text-gray-500"
              />
              <button
                onClick={() => handleSubmit(input)}
                disabled={loading || !input.trim()}
                className="px-6 py-2.5 bg-gradient-to-br from-[#36a6ba] to-[#9b59b6] text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Analyzing...' : 'Ask'}
              </button>
            </div>
          </div>
          
          {/* Quota info */}
          {quota && (
            <div className="text-center mt-3 text-[13px] text-[#708090] font-medium">
              {quota.plan === 'unlimited' ? 
                'Unlimited access' : 
                `${quota.remaining} questions remaining today`
              }
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8 text-[#8a939f] text-sm">
            Analyzing data from multiple sources...
          </div>
        )}

        {/* Results */}
        {!loading && result && !result.error && (
          <div 
            className="max-w-[1200px] mx-auto bg-[rgba(13,33,52,0.4)] backdrop-blur-sm border border-[#1e3951] rounded-2xl p-12 mt-8 animate-fadeIn"
          >
            {/* Result Header */}
            <div className="flex items-start justify-between mb-8 pb-6 border-b border-[#1e3951]">
              <div>
                <div className="text-sm font-bold tracking-wider text-[#36a6ba] mb-2">
                  {result.ticker}
                </div>
                <h2 className="text-2xl font-bold text-[#e5e7eb]">
                  Analysis
                </h2>
              </div>
              <div className="text-xs text-[#708090]">
                {result.timestamp.toLocaleTimeString()}
              </div>
            </div>

            {/* Analysis Content */}
            <div className="max-w-[800px] mb-8">
              {/* Main prose */}
              {parsed.prose && (
                <div className="text-base leading-relaxed text-[#e5e7eb] mb-8">
                  {parsed.prose}
                </div>
              )}

              {/* Key Themes */}
              {parsed.themes.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#708090] mb-3">
                    Key Themes
                  </h3>
                  <ul className="space-y-2">
                    {parsed.themes.map((theme, idx) => (
                      <li key={idx} className="text-[15px] text-[#e5e7eb] flex items-start">
                        <span className="text-[#36a6ba] mr-2">•</span>
                        <span>{theme}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Short-term / Long-term */}
              {(parsed.shortTerm || parsed.longTerm) && (
                <div className="space-y-4">
                  {parsed.shortTerm && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#708090] mb-2">
                        Short-Term
                      </h3>
                      <p className="text-[15px] leading-relaxed text-[#e5e7eb]">
                        {parsed.shortTerm.trim()}
                      </p>
                    </div>
                  )}
                  
                  {parsed.longTerm && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#708090] mb-2">
                        Long-Term
                      </h3>
                      <p className="text-[15px] leading-relaxed text-[#e5e7eb]">
                        {parsed.longTerm.trim()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-[#1e3951] my-8"></div>

            {/* Data Cards */}
            {result.data && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <ResponseCards
                  data={{
                    price: result.data.price,
                    whale_summary: result.data.whale_summary,
                    sentiment: result.data.sentiment,
                    social: result.data.social,
                    news_headlines: result.data.news_headlines
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {!loading && result && result.error && (
          <div className="max-w-[700px] mx-auto bg-red-900/20 border border-red-500/30 rounded-xl p-6 mt-8 text-center">
            <div className="text-red-400 text-sm">
              {result.response}
            </div>
          </div>
        )}

        {/* Welcome State - Example Queries */}
        {!loading && !result && (
          <div className="max-w-[900px] mx-auto mt-12">
            <div className="text-center mb-6">
              <h2 className="text-lg font-medium text-[#e5e7eb] mb-2">
                Example queries
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {exampleQueries.map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(query)
                    inputRef.current?.focus()
                  }}
                  className="px-6 py-4 bg-[rgba(13,33,52,0.4)] border border-[#1e3951] rounded-lg text-left text-[15px] font-medium text-[#e5e7eb] hover:border-[#36a6ba] hover:bg-[rgba(13,33,52,0.6)] transition-all duration-150"
                >
                  {query}
                </button>
              ))}
            </div>
            
            <div className="text-center text-sm text-[#708090]">
              Or ask anything about 140+ tokens
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="max-w-[900px] mx-auto mt-16 text-center text-xs text-[#708090]">
          ORCA provides educational analysis only. This is not financial advice. Always do your own research before making investment decisions.
        </div>
      </div>

      {/* Add fade-in animation */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  )
}

