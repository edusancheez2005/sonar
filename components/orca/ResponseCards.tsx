/**
 * PHASE 2 - ORCA AI: Response Cards
 * 5 interactive cards for displaying chat response data
 */

'use client'

import React from 'react'

interface ResponseCardsProps {
  data: {
    price: {
      current: number
      change_24h: number
      trend: string
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
      sentiment: number | null
    }>
  }
}

export function ResponseCards({ data }: ResponseCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      <WhaleActivityCard whaleData={data.whale_summary} />
      <SentimentCard sentimentData={data.sentiment} />
      <SocialCard socialData={data.social} />
      <PriceCard priceData={data.price} />
      <NewsCard newsData={data.news_headlines} />
    </div>
  )
}

/**
 * 🐋 Whale Activity Card
 */
function WhaleActivityCard({ whaleData }: { whaleData: any }) {
  const netFlowColor = whaleData.net_flow > 0 ? 'text-green-400' : 
                       whaleData.net_flow < 0 ? 'text-red-400' : 'text-gray-400'
  const netFlowLabel = whaleData.net_flow > 0 ? 'Accumulation' :
                       whaleData.net_flow < 0 ? 'Distribution' : 'Neutral'
  
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300 flex items-center">
          <span className="text-xl mr-2">🐋</span>
          Whale Activity
        </h3>
        <span className="text-xs text-gray-500">Last 24h</span>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="text-xs text-gray-400 mb-1">Net Flow</div>
          <div className={`text-2xl font-bold ${netFlowColor}`}>
            ${(whaleData.net_flow / 1e6).toFixed(2)}M
          </div>
          <div className="text-xs text-gray-500">{netFlowLabel}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-gray-400">Transactions</div>
            <div className="text-lg font-semibold text-white">
              {whaleData.transactions}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Accumulation</div>
            <div className="text-lg font-semibold text-green-400">
              {whaleData.accumulation}
            </div>
          </div>
        </div>
        
        <div className="pt-2 border-t border-gray-700">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Distribution:</span>
            <span className="text-red-400">{whaleData.distribution}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 📊 Sentiment Card
 */
function SentimentCard({ sentimentData }: { sentimentData: any }) {
  const score = sentimentData.score
  const sentiment = score > 0.5 ? 'Very Bullish' :
                   score > 0.2 ? 'Bullish' :
                   score > -0.2 ? 'Neutral' :
                   score > -0.5 ? 'Bearish' : 'Very Bearish'
  
  const color = score > 0.2 ? 'text-green-400' :
                score < -0.2 ? 'text-red-400' : 'text-gray-400'
  
  const percentage = ((score + 1) / 2) * 100 // Convert -1 to 1 range to 0-100%
  
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300 flex items-center">
          <span className="text-xl mr-2">📊</span>
          Sentiment
        </h3>
        <span className="text-xs text-gray-500">Multi-Source</span>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="text-xs text-gray-400 mb-2">Combined Score</div>
          <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`absolute left-0 top-0 h-full ${score > 0 ? 'bg-green-500' : 'bg-red-500'} transition-all duration-300`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className={`text-2xl font-bold mt-2 ${color}`}>
            {score.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">{sentiment}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-gray-400">Trend</div>
            <div className="text-sm font-semibold text-white">
              {sentimentData.trend}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">News Count</div>
            <div className="text-sm font-semibold text-white">
              {sentimentData.news_count}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 🌙 Social Card (LunarCrush)
 */
function SocialCard({ socialData }: { socialData: any }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300 flex items-center">
          <span className="text-xl mr-2">🌙</span>
          Social Intelligence
        </h3>
        <span className="text-xs text-gray-500">LunarCrush</span>
      </div>
      
      <div className="space-y-3">
        {socialData.sentiment_pct && (
          <div>
            <div className="text-xs text-gray-400 mb-2">Social Sentiment</div>
            <div className="text-2xl font-bold text-green-400">
              {socialData.sentiment_pct}%
            </div>
            <div className="text-xs text-gray-500">Bullish</div>
          </div>
        )}
        
        {socialData.engagement && (
          <div>
            <div className="text-xs text-gray-400">Engagement (24h)</div>
            <div className="text-sm font-semibold text-white">
              {(socialData.engagement / 1e6).toFixed(1)}M interactions
            </div>
          </div>
        )}
        
        <div className="pt-2 border-t border-gray-700 space-y-2">
          {socialData.supportive_themes.length > 0 && (
            <div>
              <div className="text-xs text-green-400 font-medium mb-1">💚 Supportive</div>
              <div className="text-xs text-gray-400 line-clamp-2">
                {socialData.supportive_themes[0]}
              </div>
            </div>
          )}
          {socialData.critical_themes.length > 0 && (
            <div>
              <div className="text-xs text-yellow-400 font-medium mb-1">⚠️ Critical</div>
              <div className="text-xs text-gray-400 line-clamp-2">
                {socialData.critical_themes[0]}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 💰 Price Card
 */
function PriceCard({ priceData }: { priceData: any }) {
  const changeColor = priceData.change_24h > 0 ? 'text-green-400' :
                     priceData.change_24h < 0 ? 'text-red-400' : 'text-gray-400'
  const changeSign = priceData.change_24h > 0 ? '+' : ''
  
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300 flex items-center">
          <span className="text-xl mr-2">💰</span>
          Price
        </h3>
        <span className="text-xs text-gray-500">CoinGecko</span>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="text-xs text-gray-400 mb-1">Current Price</div>
          <div className="text-2xl font-bold text-white">
            ${priceData.current.toLocaleString()}
          </div>
          <div className={`text-sm font-semibold ${changeColor}`}>
            {changeSign}{priceData.change_24h.toFixed(2)}% (24h)
          </div>
        </div>
        
        <div className="pt-2 border-t border-gray-700">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Trend:</span>
            <span className="text-white font-medium">{priceData.trend}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 📰 News Card
 */
function NewsCard({ newsData }: { newsData: any[] }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300 flex items-center">
          <span className="text-xl mr-2">📰</span>
          Recent News
        </h3>
        <span className="text-xs text-gray-500">Top 5</span>
      </div>
      
      <div className="space-y-2">
        {newsData.slice(0, 5).map((news, index) => {
          const sentiment = news.sentiment || 0
          const emoji = sentiment > 0.3 ? '📈' :
                       sentiment < -0.3 ? '📉' : '➡️'
          
          // Fallback title if missing
          const title = news.title && news.title.trim() !== '' 
            ? news.title 
            : 'Untitled Article'
          
          // Make clickable if URL exists
          const content = news.url ? (
            <a 
              href={news.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-gray-300 hover:text-blue-400 line-clamp-2 mb-1 block transition-colors"
            >
              {emoji} {title}
            </a>
          ) : (
            <div className="text-xs text-gray-300 line-clamp-2 mb-1">
              {emoji} {title}
            </div>
          )
          
          return (
            <div key={index} className="pb-2 border-b border-gray-700 last:border-0">
              {content}
              <div className="text-xs text-gray-500">{news.source}</div>
            </div>
          )
        })}
        
        {newsData.length === 0 && (
          <div className="text-xs text-gray-500">No recent news available</div>
        )}
      </div>
    </div>
  )
}

