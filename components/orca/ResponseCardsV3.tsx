/**
 * ORCA Intelligence - Data Cards V3
 * Design: Professional, institutional, minimal
 * Target: LunarCrush quality bar
 */

'use client'

import React from 'react'

interface ResponseCardsProps {
  data: {
    price: {
      current: number
      change_24h: number
      trend: string
      ath?: number | null
      ath_distance?: number | null
    }
    whale_summary: {
      net_flow: number
      transactions: number
      accumulation: number
      distribution: number
    }
    sentiment: {
      score: number
      trend: string
      news_count: number
    }
    social: {
      sentiment_pct: number | null
      engagement: number | null
      supportive_themes: string[]
      critical_themes: string[]
    }
    news_headlines: Array<{
      title: string
      source: string
      url: string
      sentiment: number | null
    }>
  }
}

export function ResponseCards({ data }: ResponseCardsProps) {
  return (
    <>
      <WhaleCard data={data.whale_summary} />
      <SentimentCard data={data.sentiment} />
      <SocialCard data={data.social} />
      <PriceCard data={data.price} />
      <NewsCard data={data.news_headlines} />
    </>
  )
}

// Whale Activity Card
function WhaleCard({ data }: { data: any }) {
  const netFlow = data.net_flow / 1e6
  const isPositive = netFlow > 0
  const isNegative = netFlow < 0
  const flowColor = isPositive ? 'text-[#10b981]' : isNegative ? 'text-[#ef4444]' : 'text-[#8a939f]'
  const flowLabel = isPositive ? 'Accumulation' : isNegative ? 'Distribution' : 'Neutral'
  
  return (
    <div className="bg-[rgba(13,33,52,0.8)] border border-[#1e3951] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8a939f]">
          Whale Activity
        </h3>
        <svg className="w-4 h-4 text-[#708090]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
      
      <div className="mb-4">
        <div className="text-[11px] text-[#8a939f] mb-1">Net Flow</div>
        <div className={`text-2xl font-bold ${flowColor}`}>
          ${Math.abs(netFlow).toFixed(2)}M
        </div>
        <div className="text-xs text-[#8a939f] mt-1">{flowLabel}</div>
      </div>
      
      <div className="pt-3 border-t border-[#1e3951] text-[13px] text-[#8a939f] space-y-1">
        <div>Last 24h: {data.transactions} txns</div>
        <div>{data.accumulation} buys · {data.distribution} sells</div>
      </div>
    </div>
  )
}

// Sentiment Card
function SentimentCard({ data }: { data: any }) {
  const score = data.score
  const isPositive = score > 0.2
  const isNegative = score < -0.2
  const scoreColor = isPositive ? 'text-[#10b981]' : isNegative ? 'text-[#ef4444]' : 'text-[#8a939f]'
  const label = isPositive ? 'Bullish' : isNegative ? 'Bearish' : 'Neutral'
  
  return (
    <div className="bg-[rgba(13,33,52,0.8)] border border-[#1e3951] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8a939f]">
          Sentiment
        </h3>
        <svg className="w-4 h-4 text-[#708090]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      
      <div className="mb-4">
        <div className="text-[11px] text-[#8a939f] mb-1">Multi-Source Score</div>
        <div className={`text-2xl font-bold ${scoreColor}`}>
          {score.toFixed(2)}
        </div>
        <div className="text-xs text-[#8a939f] mt-1">{label}</div>
      </div>
      
      <div className="pt-3 border-t border-[#1e3951] text-[13px] text-[#8a939f]">
        Trend: {data.trend} · {data.news_count} articles
      </div>
    </div>
  )
}

// Social Intelligence Card
function SocialCard({ data }: { data: any }) {
  const sentiment = data.sentiment_pct || 0
  const engagement = data.engagement || 0
  const engagementFormatted = engagement >= 1e6 ? `${(engagement / 1e6).toFixed(1)}M` : 
                               engagement >= 1e3 ? `${(engagement / 1e3).toFixed(0)}K` : engagement
  
  return (
    <div className="bg-[rgba(13,33,52,0.8)] border border-[#1e3951] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8a939f]">
          Social Buzz
        </h3>
        <svg className="w-4 h-4 text-[#708090]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
        </svg>
      </div>
      
      <div className="mb-4">
        <div className="text-[11px] text-[#8a939f] mb-1">{sentiment}% Bullish</div>
        <div className="text-2xl font-bold text-white">
          {engagementFormatted}
        </div>
        <div className="text-xs text-[#8a939f] mt-1">interactions</div>
      </div>
      
      {data.supportive_themes.length > 0 && (
        <div className="pt-3 border-t border-[#1e3951] text-[13px] text-[#8a939f]">
          {data.supportive_themes[0]?.split('(')[0].substring(0, 40)}...
        </div>
      )}
    </div>
  )
}

// Price Card
function PriceCard({ data }: { data: any }) {
  const change = data.change_24h
  const isPositive = change > 0
  const changeColor = isPositive ? 'text-[#10b981]' : 'text-[#ef4444]'
  
  // Format price
  const formatPrice = (price: number) => {
    if (price >= 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    if (price >= 0.01) return `$${price.toFixed(4)}`
    if (price >= 0.0001) return `$${price.toFixed(6)}`
    if (price > 0) return `$${price.toExponential(2)}`
    return '$0.00'
  }
  
  return (
    <div className="bg-[rgba(13,33,52,0.8)] border border-[#1e3951] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8a939f]">
          Price
        </h3>
        <svg className="w-4 h-4 text-[#708090]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      <div className="mb-4">
        <div className="text-2xl font-bold text-white mb-1">
          {formatPrice(data.current)}
        </div>
        <div className={`text-sm font-semibold ${changeColor}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
        </div>
      </div>
      
      <div className="pt-3 border-t border-[#1e3951] text-[13px] text-[#8a939f]">
        {data.ath_distance !== null && data.ath_distance !== undefined ? (
          <div>ATH: {data.ath_distance.toFixed(0)}%</div>
        ) : (
          <div>Trend: {data.trend}</div>
        )}
      </div>
    </div>
  )
}

// News Card
function NewsCard({ data }: { data: any[] }) {
  const newsData = data || []
  
  return (
    <div className="bg-[rgba(13,33,52,0.8)] border border-[#1e3951] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8a939f]">
          News ({newsData.length})
        </h3>
        <svg className="w-4 h-4 text-[#708090]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      </div>
      
      <div className="space-y-3">
        {newsData.slice(0, 5).map((news, idx) => {
          const sentiment = news.sentiment || 0
          const emoji = sentiment > 0.3 ? '📈' : sentiment < -0.3 ? '📉' : '➡️'
          const title = news.title && news.title.trim() !== '' ? news.title : 'Untitled'
          
          return (
            <div key={idx} className="pb-3 border-b border-[#1e3951] last:border-0 last:pb-0">
              {news.url ? (
                <a 
                  href={news.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-[#e5e7eb] hover:text-[#36a6ba] transition-colors line-clamp-2 mb-1 block"
                >
                  {emoji} {title}
                </a>
              ) : (
                <div className="text-[13px] text-[#e5e7eb] line-clamp-2 mb-1">
                  {emoji} {title}
                </div>
              )}
              <div className="text-[11px] text-[#708090]">
                {news.source}
              </div>
            </div>
          )
        })}
        
        {newsData.length === 0 && (
          <div className="text-[13px] text-[#708090]">No recent news</div>
        )}
      </div>
    </div>
  )
}

