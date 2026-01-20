/**
 * PHASE 2 - ORCA AI: Data Formatters
 * Format data for GPT-4.0 context (detailed, structured output)
 */

interface WhaleMove {
  hash: string
  value_usd: number
  classification: string | null
  from: string
  to: string
  type: string | null
  reasoning: string | null
  whale_score?: number | null
  timestamp: string
}

interface NewsItem {
  id: string
  title: string
  source: string
  url: string
  published_at: string
  sentiment_llm: number | null
  sentiment_raw: number | null
}

/**
 * Format whale moves for GPT context (detailed version)
 */
export function formatWhaleMovesDetailed(moves: WhaleMove[]): string {
  if (!moves || moves.length === 0) {
    return '   No significant whale activity in last 24h'
  }
  
  return moves.map((move, index) => {
    const valueStr = formatCurrency(move.value_usd)
    const classification = move.classification || 'Unknown'
    const timeAgo = formatTimeAgo(move.timestamp)
    const reasoning = move.reasoning || 'No analysis available'
    const scoreInfo = move.whale_score ? `Whale Score: ${move.whale_score.toFixed(1)}` : ''
    
    return `   ${index + 1}. ${valueStr} - ${classification.toUpperCase()}
      ├─ From: ${move.from}
      ├─ To: ${move.to}
      ├─ Type: ${move.type || 'Unknown'}${scoreInfo ? `\n      ├─ ${scoreInfo}` : ''}
      ├─ Time: ${timeAgo}
      └─ Analysis: ${reasoning}`
  }).join('\n\n')
}

/**
 * Format themes from LunarCrush
 */
export function formatThemes(themes: string[]): string {
  if (!themes || themes.length === 0) {
    return '│  No themes identified'
  }
  
  return themes.map(theme => `│  • ${theme}`).join('\n')
}

/**
 * Format news headlines with sentiment (detailed version)
 */
export function formatNewsHeadlinesDetailed(headlines: NewsItem[]): string {
  if (!headlines || headlines.length === 0) {
    return 'No recent news available'
  }
  
  return headlines.map((news, index) => {
    const sentiment = news.sentiment_llm ?? news.sentiment_raw ?? 0
    const sentimentEmoji = sentiment > 0.3 ? '📈' : 
                          sentiment < -0.3 ? '📉' : '➡️'
    const sentimentLabel = sentiment > 0.3 ? 'Bullish' :
                          sentiment < -0.3 ? 'Bearish' : 'Neutral'
    const timeAgo = formatTimeAgo(news.published_at)
    
    return `${index + 1}. ${sentimentEmoji} "${news.title}"
   ├─ Source: ${news.source}
   ├─ Sentiment: ${sentimentLabel} (${sentiment.toFixed(2)})
   ├─ Time: ${timeAgo}
   └─ URL: ${news.url}`
  }).join('\n\n')
}

/**
 * Format time ago helper
 */
export function formatTimeAgo(timestamp: string): string {
  try {
    const now = new Date().getTime()
    const time = new Date(timestamp).getTime()
    const diffMs = now - time
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) {
      return 'Just now'
    } else if (diffMins < 60) {
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else {
      return `${diffDays}d ago`
    }
  } catch (error) {
    return 'Unknown'
  }
}

/**
 * Format currency (USD)
 */
export function formatCurrency(amount: number): string {
  if (amount >= 1e9) {
    return `$${(amount / 1e9).toFixed(2)}B`
  } else if (amount >= 1e6) {
    return `$${(amount / 1e6).toFixed(2)}M`
  } else if (amount >= 1e3) {
    return `$${(amount / 1e3).toFixed(0)}K`
  } else if (amount >= 1) {
    return `$${amount.toFixed(2)}`
  } else if (amount >= 0.01) {
    return `$${amount.toFixed(4)}`
  } else if (amount >= 0.0001) {
    return `$${amount.toFixed(6)}`
  } else if (amount > 0) {
    // For very small numbers (like SHIB), use scientific notation
    return `$${amount.toExponential(4)}`
  } else {
    return '$0.00'
  }
}

/**
 * Format large number with K/M/B suffix
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`
  } else {
    return num.toFixed(0)
  }
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

/**
 * Truncate Ethereum address
 */
export function truncateAddress(address: string | null): string {
  if (!address) return 'Unknown'
  if (address.length < 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Format sentiment score to label
 */
export function formatSentimentLabel(score: number): string {
  if (score > 0.5) return 'Very Bullish'
  if (score > 0.2) return 'Bullish'
  if (score > -0.2) return 'Neutral'
  if (score > -0.5) return 'Bearish'
  return 'Very Bearish'
}

/**
 * Format sentiment score to emoji
 */
export function formatSentimentEmoji(score: number): string {
  if (score > 0.5) return '🚀'
  if (score > 0.2) return '📈'
  if (score > -0.2) return '➡️'
  if (score > -0.5) return '📉'
  return '🔻'
}

/**
 * Format price trend
 */
export function formatPriceTrend(priceData: any[]): string {
  if (!priceData || priceData.length < 2) {
    return 'Insufficient data'
  }
  
  const latest = priceData[0].price_usd
  const oldest = priceData[priceData.length - 1].price_usd
  const change = ((latest - oldest) / oldest) * 100
  
  if (change > 5) return 'Strong Uptrend'
  if (change > 1) return 'Uptrend'
  if (change > -1) return 'Sideways'
  if (change > -5) return 'Downtrend'
  return 'Strong Downtrend'
}

/**
 * Calculate sentiment trend
 */
export function calculateSentimentTrend(sentimentData: any[]): string {
  if (!sentimentData || sentimentData.length < 2) {
    return 'Stable'
  }
  
  const latest = sentimentData[0].aggregated_score
  const previous = sentimentData[sentimentData.length - 1].aggregated_score
  const change = latest - previous
  
  if (change > 0.1) return 'Improving'
  if (change < -0.1) return 'Declining'
  return 'Stable'
}

/**
 * Format whale net flow interpretation
 */
export function formatNetFlowInterpretation(netFlow: number): string {
  if (netFlow > 10e6) {
    return '(VERY BULLISH - Strong Accumulation)'
  } else if (netFlow > 1e6) {
    return '(BULLISH - Accumulation)'
  } else if (netFlow > -1e6) {
    return '(NEUTRAL - Balanced)'
  } else if (netFlow > -10e6) {
    return '(BEARISH - Distribution)'
  } else {
    return '(VERY BEARISH - Strong Distribution)'
  }
}

