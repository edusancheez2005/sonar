/**
 * Unified sentiment calculation algorithm
 * Combines whale transaction data, price momentum, and news sentiment
 */

export function calculateEnhancedSentiment({
  transactions = [],
  priceData = null,
  newsData = null
}) {
  if (!transactions || transactions.length === 0) {
    return {
      label: 'NEUTRAL',
      color: '#f39c12',
      score: 0,
      components: {},
      details: {}
    }
  }

  // === 1. WHALE TRANSACTION ANALYSIS ===
  const nowMs = Date.now()
  const sixH = 6 * 60 * 60 * 1000
  const last6Start = nowMs - sixH
  const prev6Start = nowMs - 2 * sixH

  let buys = 0, sells = 0, buyVol = 0, sellVol = 0, net = 0
  const txSizes = []
  let last6Net = 0, prev6Net = 0

  for (const tx of transactions) {
    const usd = Number(tx.usd_value || 0)
    const side = String(tx.classification || '').toLowerCase()
    const ts = new Date(tx.timestamp).getTime()
    
    txSizes.push(Math.abs(usd))
    
    if (side === 'buy') {
      buys += 1
      buyVol += usd
      net += usd
    } else if (side === 'sell') {
      sells += 1
      sellVol += usd
      net -= usd
    }
    
    if (ts >= last6Start) {
      last6Net += (side === 'sell' ? -usd : usd)
    } else if (ts >= prev6Start && ts < last6Start) {
      prev6Net += (side === 'sell' ? -usd : usd)
    }
  }

  const total = buys + sells
  const buyPct = total > 0 ? (buys / total) * 100 : 50
  
  // Calculate median for normalization
  const median = computeMedian(txSizes) || 1
  const scaleNet = Math.max(1, median * 20)
  const scaleMom = Math.max(1, median * 10)

  // Whale components normalized to [-1, 1]
  const whaleBias = (buyPct - 50) / 50 // [-1, 1]
  const whaleNetFlow = Math.tanh(net / scaleNet) // robust cap
  const whaleMomentum = Math.tanh((last6Net - prev6Net) / scaleMom)

  // === 2. PRICE MOMENTUM ANALYSIS ===
  let priceMomentum = 0
  let priceStrength = 0
  
  if (priceData) {
    const change24h = Number(priceData.change24h) || 0
    const change7d = Number(priceData.change7d) || 0
    
    // Normalize price changes to [-1, 1]
    // Strong moves: ±10% = ±1.0
    priceMomentum = Math.tanh(change24h / 10)
    
    // 7-day trend strength (confirms or contradicts 24h)
    const trend7d = Math.tanh(change7d / 20)
    priceStrength = (priceMomentum + trend7d) / 2
  }

  // === 3. NEWS SENTIMENT ANALYSIS ===
  let newsSentiment = 0
  let newsCount = 0
  
  if (newsData && Array.isArray(newsData)) {
    // Simple keyword-based sentiment
    const positiveWords = ['bullish', 'surge', 'rally', 'gain', 'soar', 'breakout', 'pump', 'moon', 'growth', 'positive', 'upgrade', 'adoption', 'partnership']
    const negativeWords = ['bearish', 'crash', 'dump', 'drop', 'fall', 'plunge', 'decline', 'sell', 'warning', 'risk', 'scam', 'hack', 'negative', 'downgrade']
    
    for (const article of newsData) {
      const text = `${article.title || ''} ${article.description || ''}`.toLowerCase()
      
      let score = 0
      for (const word of positiveWords) {
        if (text.includes(word)) score += 1
      }
      for (const word of negativeWords) {
        if (text.includes(word)) score -= 1
      }
      
      if (score !== 0) {
        newsSentiment += Math.sign(score)
        newsCount += 1
      }
    }
    
    // Normalize to [-1, 1] based on article count
    if (newsCount > 0) {
      newsSentiment = Math.tanh(newsSentiment / Math.max(newsCount, 3))
    }
  }

  // === 4. UNIFIED SENTIMENT SCORE ===
  // Weights: Whale data is most important, then price, then news
  const weights = {
    whaleBias: 0.30,
    whaleNetFlow: 0.25,
    whaleMomentum: 0.15,
    priceMomentum: priceData ? 0.20 : 0,
    newsSentiment: newsData ? 0.10 : 0
  }

  // Normalize weights if data is missing
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0)
  if (totalWeight < 1) {
    // Redistribute missing weight to whale factors
    const redistribution = (1 - totalWeight) / 3
    weights.whaleBias += redistribution
    weights.whaleNetFlow += redistribution
    weights.whaleMomentum += redistribution
  }

  const score = 
    (weights.whaleBias * whaleBias) +
    (weights.whaleNetFlow * whaleNetFlow) +
    (weights.whaleMomentum * whaleMomentum) +
    (weights.priceMomentum * priceMomentum) +
    (weights.newsSentiment * newsSentiment)

  // Determine label with thresholds
  let label = 'NEUTRAL'
  let color = '#f39c12'
  
  if (score > 0.15) {
    label = 'BULLISH'
    color = '#2ecc71'
  } else if (score < -0.15) {
    label = 'BEARISH'
    color = '#e74c3c'
  }

  return {
    label,
    color,
    score: Number(score.toFixed(3)),
    components: {
      whaleBias: Number(whaleBias.toFixed(3)),
      whaleNetFlow: Number(whaleNetFlow.toFixed(3)),
      whaleMomentum: Number(whaleMomentum.toFixed(3)),
      priceMomentum: Number(priceMomentum.toFixed(3)),
      newsSentiment: Number(newsSentiment.toFixed(3))
    },
    details: {
      buyPct: Number(buyPct.toFixed(1)),
      buys,
      sells,
      net: Math.round(net),
      buyVol: Math.round(buyVol),
      sellVol: Math.round(sellVol),
      last6Net: Math.round(last6Net),
      prev6Net: Math.round(prev6Net),
      priceChange24h: priceData?.change24h || null,
      priceChange7d: priceData?.change7d || null,
      newsCount,
      newsSentimentRaw: newsCount > 0 ? Number(newsSentiment.toFixed(2)) : null
    }
  }
}

function computeMedian(values) {
  if (!values || values.length === 0) return 0
  const arr = values.slice().sort((a, b) => a - b)
  const mid = Math.floor(arr.length / 2)
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2
}

/**
 * Simplified version for Orca API (just determines label from buyPct and netFlow)
 * Now uses the same thresholds as the enhanced algorithm
 */
export function calculateSimpleSentiment(buyPct, netFlow) {
  const total = 100
  const bias = (buyPct - 50) / 50
  const flowComponent = netFlow > 0 ? 0.3 : netFlow < 0 ? -0.3 : 0
  
  const score = (bias * 0.7) + flowComponent
  
  let label = 'NEUTRAL'
  if (score > 0.15) label = 'BULLISH'
  else if (score < -0.15) label = 'BEARISH'
  
  return { label, score: Number(score.toFixed(3)) }
}

