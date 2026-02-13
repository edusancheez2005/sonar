/**
 * Sonar Token Score (0-100)
 * Composite score combining whale data, sentiment, social, price momentum, and dev activity
 */

export function calculateTokenScore({
  sentimentScore = 0,
  sentimentConfidence = 0,
  galaxyScore = null,
  socialSentimentPct = null,
  priceChange24h = 0,
  priceChange7d = 0,
  whaleNetFlow = 0,
  whaleVolume = 0,
  volumeToMcap = 0,
  devActivity = 0,
}) {
  let score = 50

  // Sentiment (up to ±20)
  score += sentimentScore * 15
  score += (sentimentConfidence - 50) / 10

  // Social (up to ±20)
  if (galaxyScore != null && galaxyScore > 0) score += (galaxyScore - 50) / 5
  if (socialSentimentPct != null && socialSentimentPct > 0) score += (socialSentimentPct - 50) / 5

  // Price momentum (up to ±20)
  score += Math.tanh(priceChange24h / 10) * 10
  score += Math.tanh(priceChange7d / 20) * 10

  // Whale conviction (up to ±10)
  const flowDirection = Math.sign(whaleNetFlow)
  const flowMagnitude = Math.min(1, Math.abs(whaleNetFlow) / 1000000)
  score += flowDirection * flowMagnitude * 10

  // Volume activity (up to ±5)
  score += Math.tanh((volumeToMcap - 0.05) / 0.05) * 5

  // Dev activity bonus (up to +5)
  if (devActivity > 100) score += 5
  else if (devActivity > 50) score += 3
  else if (devActivity > 10) score += 1

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function getScoreLabel(score) {
  if (score >= 80) return { label: 'STRONG BUY', color: '#00e676' }
  if (score >= 65) return { label: 'BUY', color: '#00e676' }
  if (score >= 55) return { label: 'SLIGHT BUY', color: '#b2ff59' }
  if (score >= 45) return { label: 'NEUTRAL', color: '#ffab00' }
  if (score >= 35) return { label: 'SLIGHT SELL', color: '#ff8a65' }
  if (score >= 20) return { label: 'SELL', color: '#ff1744' }
  return { label: 'STRONG SELL', color: '#ff1744' }
}

export function getScoreGradient(score) {
  if (score >= 60) return 'linear-gradient(135deg, rgba(0, 230, 118, 0.15), rgba(0, 230, 118, 0.05))'
  if (score >= 40) return 'linear-gradient(135deg, rgba(255, 171, 0, 0.15), rgba(255, 171, 0, 0.05))'
  return 'linear-gradient(135deg, rgba(255, 23, 68, 0.15), rgba(255, 23, 68, 0.05))'
}
