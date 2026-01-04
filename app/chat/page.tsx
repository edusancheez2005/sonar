/**
 * PHASE 2 - ORCA AI: Chat Interface
 * Main chat page for user interaction
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ResponseCards } from '@/components/orca/ResponseCards'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  ticker?: string
  data?: any
  timestamp: Date
}

interface QuotaStatus {
  used: number
  limit: number
  remaining: number
  plan?: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [quota, setQuota] = useState<QuotaStatus | null>(null)
  const [currentData, setCurrentData] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Check authentication on mount
  useEffect(() => {
    checkAuth()
  }, [])
  
  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/auth/signin?redirect=/chat'
    }
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!input.trim() || loading) return
    
    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    
    // Add user message to chat
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])
    
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }
      
      // Call chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ message: userMessage })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // Handle rate limit or other errors
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message || data.error || 'An error occurred',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMsg])
        
        if (data.quota) {
          setQuota(data.quota)
        }
        
        return
      }
      
      // Add ORCA response to chat
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        ticker: data.ticker,
        data: data.data,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMsg])
      
      // Update quota
      if (data.quota) {
        setQuota(data.quota)
      }
      
      // Store current data for cards
      if (data.data) {
        setCurrentData(data.data)
      }
      
    } catch (error) {
      console.error('Error:', error)
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            ORCA AI 2.0
          </h1>
          <p className="text-gray-400">
            Crypto Intelligence powered by whale data, sentiment analysis, and social insights
          </p>
          
          {/* Quota Display */}
          {quota && (
            <div className="mt-4 inline-block bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2">
              <span className="text-sm text-gray-300">
                Questions today: <span className="font-bold text-white">{quota.used}/{quota.limit}</span>
              </span>
              {quota.plan === 'free' && quota.remaining <= 1 && (
                <span className="ml-2 text-xs text-yellow-400">
                  Upgrade to Pro for 5 questions/day!
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Chat Messages */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-6 mb-6 min-h-[400px] max-h-[600px] overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              <div className="text-6xl mb-4">🐋</div>
              <h2 className="text-2xl font-semibold mb-2 text-gray-300">Welcome to ORCA AI</h2>
              <p className="text-sm">Ask me about any cryptocurrency!</p>
              <div className="mt-6 space-y-2">
                <div className="text-xs text-gray-600">Try asking:</div>
                <div className="text-sm text-gray-400">
                  "What's happening with Bitcoin?"<br />
                  "Analyze ETH"<br />
                  "Tell me about SOL whale activity"
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-6 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div
                className={`inline-block max-w-[80%] p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700/50 text-gray-100'
                }`}
              >
                {message.role === 'assistant' && message.ticker && (
                  <div className="text-xs text-gray-400 mb-2 font-mono">
                    📊 {message.ticker} Analysis
                  </div>
                )}
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className="text-xs text-gray-400 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="text-left mb-6">
              <div className="inline-block bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  <span className="text-gray-400">ORCA is analyzing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Response Cards */}
        {currentData && (
          <div className="mb-6">
            <ResponseCards data={currentData} />
          </div>
        )}
        
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any cryptocurrency... (e.g., 'What's happening with Bitcoin?')"
            disabled={loading}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-6 py-4 pr-24 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Analyzing...' : 'Send'}
          </button>
        </form>
        
        {/* Disclaimer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>⚠️ ORCA provides educational analysis only. This is not financial advice.</p>
          <p className="mt-1">Always do your own research before making investment decisions.</p>
        </div>
      </div>
    </div>
  )
}

