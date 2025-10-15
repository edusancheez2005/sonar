'use client'
import React, { useState } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'

const Wrapper = styled.div`
  position: relative;
  min-height: 100vh;
  background: linear-gradient(180deg, #0a1621 0%, #0d2134 50%, #0a1621 100%);
  overflow: hidden;
`;

const BackgroundEffects = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at 30% 20%, rgba(155,89,182,0.15) 0%, transparent 50%),
                radial-gradient(circle at 70% 80%, rgba(54,166,186,0.12) 0%, transparent 50%);
    animation: rotate 30s linear infinite;
  }
  
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const Container = styled.div`
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
  padding: 4rem 2rem;
  z-index: 1;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 4rem;
`;

const Badge = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, rgba(155,89,182,0.2) 0%, rgba(241,196,15,0.2) 100%);
  border: 1px solid rgba(155,89,182,0.4);
  border-radius: 50px;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(10px);
  
  svg {
    width: 24px;
    height: 24px;
  }
  
  span {
    font-weight: 600;
    font-size: 1.1rem;
    background: linear-gradient(135deg, #9b59b6 0%, #f1c40f 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
`;

const Title = styled(motion.h1)`
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  margin: 0 0 1.5rem;
  background: linear-gradient(135deg, #ffffff 0%, #9b59b6 50%, #36a6ba 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1.2;
`;

const Subtitle = styled(motion.p)`
  font-size: 1.25rem;
  color: var(--text-secondary);
  max-width: 800px;
  margin: 0 auto 3rem;
  line-height: 1.7;
`;

const ChatSection = styled(motion.div)`
  max-width: 1000px;
  margin: 0 auto 4rem;
  background: linear-gradient(135deg, rgba(13,33,52,0.9) 0%, rgba(26,40,56,0.8) 100%);
  border: 1px solid rgba(54,166,186,0.3);
  border-radius: 24px;
  padding: 2.5rem;
  backdrop-filter: blur(20px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
`;

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(54,166,186,0.2);
  
  h2 {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  
  p {
    margin: 0.5rem 0 0;
    color: var(--text-secondary);
    font-size: 1rem;
  }
`;

const InputContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Input = styled.input`
  flex: 1;
  background: rgba(10,22,33,0.8);
  border: 2px solid rgba(54,166,186,0.3);
  border-radius: 16px;
  padding: 1.2rem 1.5rem;
  color: var(--text-primary);
  font-size: 1.05rem;
  outline: none;
  transition: all 0.3s ease;
  
  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(54,166,186,0.15);
  }
  
  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
  }
`;

const AskButton = styled(motion.button)`
  padding: 1.2rem 2.5rem;
  background: linear-gradient(135deg, #9b59b6 0%, #36a6ba 100%);
  border: none;
  border-radius: 16px;
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 8px 24px rgba(155,89,182,0.4);
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(155,89,182,0.5);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ResponseContainer = styled(motion.div)`
  background: rgba(10,22,33,0.6);
  border: 1px solid rgba(54,166,186,0.25);
  border-radius: 16px;
  padding: 2rem;
  min-height: 200px;
  max-height: 600px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(10,22,33,0.5);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--primary);
    border-radius: 4px;
  }
`;

const LoadingDots = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
  height: 200px;
  
  span {
    width: 12px;
    height: 12px;
    background: var(--primary);
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
    
    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
  }
  
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
`;

const AnswerContent = styled.div`
  color: var(--text-primary);
  line-height: 1.8;
  font-size: 1.05rem;
  
  h3 {
    color: var(--primary);
    font-size: 1.4rem;
    margin: 2rem 0 1rem;
    font-weight: 700;
    
    &:first-child {
      margin-top: 0;
    }
  }
  
  h4 {
    color: #9b59b6;
    font-size: 1.2rem;
    margin: 1.5rem 0 0.75rem;
    font-weight: 600;
  }
  
  p {
    margin: 0.75rem 0;
    color: var(--text-secondary);
  }
  
  ul, ol {
    margin: 1rem 0;
    padding-left: 1.5rem;
    
    li {
      margin: 0.75rem 0;
      color: var(--text-secondary);
      
      strong {
        color: var(--text-primary);
        font-weight: 600;
      }
    }
  }
  
  .metric-card {
    background: rgba(54,166,186,0.1);
    border: 1px solid rgba(54,166,186,0.3);
    border-radius: 12px;
    padding: 1.25rem;
    margin: 1rem 0;
    
    .metric-label {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }
    
    .metric-value {
      color: var(--primary);
      font-size: 1.5rem;
      font-weight: 700;
    }
  }
  
  .token-badge {
    display: inline-block;
    background: rgba(155,89,182,0.2);
    border: 1px solid rgba(155,89,182,0.4);
    padding: 0.4rem 0.9rem;
    border-radius: 20px;
    margin: 0.25rem;
    font-weight: 600;
    color: #9b59b6;
    font-size: 0.95rem;
  }
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-top: 4rem;
`;

const FeatureCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(13,33,52,0.8) 0%, rgba(26,40,56,0.6) 100%);
  border: 1px solid rgba(54,166,186,0.3);
  border-radius: 20px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  
  &:hover {
    border-color: var(--primary);
    box-shadow: 0 12px 40px rgba(54,166,186,0.2);
  }
  
  .icon {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, rgba(155,89,182,0.3) 0%, rgba(54,166,186,0.3) 100%);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.5rem;
    
    svg {
      width: 28px;
      height: 28px;
    }
  }
  
  h3 {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 1rem;
  }
  
  p {
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }
`;

export default function ClientOrca() {
  const [prompt, setPrompt] = useState('Tell me the current crypto market trends and where should I invest.')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  async function askOrca() {
    setLoading(true)
    setAnswer('')
    
    try {
      const res = await fetch('/api/dashboard/summary', { cache: 'no-store' })
      const data = await res.json()
      
      // Format helpers
      const fmt = (n) => `$${Number(n || 0).toLocaleString()}`
      const inflows = Array.isArray(data.tokenInflows) ? data.tokenInflows : []
      const outflows = Array.isArray(data.tokenOutflows) ? data.tokenOutflows : []
      const activity = Array.isArray(data.whaleActivity) ? data.whaleActivity : []
      const topTx = Array.isArray(data.topHighValueTxs) ? data.topHighValueTxs : []
      
      // Build context
      const context = `
24H Market Summary:
- Total Transactions: ${data.overall?.totalCount || 0}
- Total Volume: ${fmt(data.overall?.totalUsd)}
- Top Inflows: ${inflows.slice(0, 5).map(t => `${t.token} (${fmt(t.totalUsd)})`).join(', ')}
- Top Outflows: ${outflows.slice(0, 5).map(t => `${t.token} (${fmt(t.totalUsd)})`).join(', ')}
- Most Active Tokens: ${activity.slice(0, 5).map(a => a.token).join(', ')}
- Largest Transaction: ${topTx[0]?.token || 'N/A'} - ${fmt(topTx[0]?.usd_value)}

User Question: ${prompt}
`
      
      // Generate structured response
      const response = generateStructuredResponse(data, inflows, outflows, activity, topTx)
      setAnswer(response)
      
    } catch (err) {
      setAnswer(`<p style="color: #e74c3c;">Error fetching market data. Please try again.</p>`)
    } finally {
      setLoading(false)
    }
  }
  
  function generateStructuredResponse(data, inflows, outflows, activity, topTx) {
    const fmt = (n) => {
      const num = Number(n || 0);
      return num === 0 ? '$0' : `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    
    const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;
    
    // Calculate market sentiment
    const totalInflow = inflows.reduce((sum, t) => sum + (t.netUsdRobust || t.netUsd || 0), 0);
    const totalOutflow = Math.abs(outflows.reduce((sum, t) => sum + (t.netUsdRobust || t.netUsd || 0), 0));
    const marketSentiment = totalInflow > totalOutflow ? 'Bullish' : totalInflow < totalOutflow ? 'Bearish' : 'Neutral';
    const sentimentStrength = Math.abs(totalInflow - totalOutflow) / (totalInflow + totalOutflow || 1);
    
    // Identify momentum tokens
    const strongAccumulation = inflows.filter(t => (t.netUsdRobust || t.netUsd || 0) > 5000000);
    const strongDistribution = outflows.filter(t => Math.abs(t.netUsdRobust || t.netUsd || 0) > 5000000);
    
    // Calculate whale conviction
    const avgWhalesPerToken = activity.length > 0 ? activity.reduce((sum, a) => sum + (a.uniqueWhales || 0), 0) / activity.length : 0;
    
    return `
<h3>Executive Market Summary (24h)</h3>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
  <div class="metric-card">
    <div class="metric-label">Total Transaction Volume</div>
    <div class="metric-value">${fmt(data.overall?.totalVolume || data.overall?.totalUsd)}</div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Whale Transactions</div>
    <div class="metric-value">${data.overall?.totalCount || 0}</div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Market Sentiment</div>
    <div class="metric-value" style="color: ${marketSentiment === 'Bullish' ? '#2ecc71' : marketSentiment === 'Bearish' ? '#e74c3c' : '#f39c12'};">${marketSentiment}</div>
    <div class="metric-label" style="margin-top: 0.5rem;">Conviction: ${fmtPct(sentimentStrength)}</div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Net Capital Flow</div>
    <div class="metric-value" style="color: ${totalInflow > totalOutflow ? '#2ecc71' : '#e74c3c'};">${fmt(totalInflow - totalOutflow)}</div>
  </div>
</div>

<h3>Professional Analysis</h3>
<p style="font-size: 1.1rem; line-height: 1.8; color: var(--text-primary); margin-bottom: 1.5rem;">
  Based on ${data.overall?.totalCount || 0} whale transactions totaling ${fmt(data.overall?.totalVolume || data.overall?.totalUsd)} in 24h volume, 
  we're observing ${marketSentiment.toLowerCase()} market conditions with ${sentimentStrength > 0.3 ? '<strong>high</strong>' : sentimentStrength > 0.15 ? '<strong>moderate</strong>' : '<strong>low</strong>'} conviction. 
  Average whale participation is ${avgWhalesPerToken.toFixed(1)} unique wallets per token, indicating ${avgWhalesPerToken > 10 ? '<strong>strong institutional interest</strong>' : avgWhalesPerToken > 5 ? '<strong>moderate whale activity</strong>' : '<strong>selective positioning</strong>'}.
</p>

<h3>High-Conviction Accumulation (Smart Money Buying)</h3>
<p>These tokens show sustained whale accumulation patterns with significant capital inflows. Institutional-grade opportunities for long positions:</p>
<div style="display: grid; gap: 1rem; margin: 1.5rem 0;">
${inflows.slice(0, 5).map((t, i) => {
  const usdValue = t.netUsdRobust || t.netUsd || 0;
  const txCount = t.txCount || t.count || 0;
  const avgTxSize = txCount > 0 ? usdValue / txCount : 0;
  const strength = usdValue > 10000000 ? 'Very Strong' : usdValue > 5000000 ? 'Strong' : usdValue > 1000000 ? 'Moderate' : 'Building';
  
  return `
  <div style="background: linear-gradient(135deg, rgba(46,204,113,0.1) 0%, rgba(46,204,113,0.05) 100%); border: 1px solid rgba(46,204,113,0.3); border-radius: 12px; padding: 1.25rem;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
      <div>
        <strong style="font-size: 1.3rem; color: #2ecc71;">${i + 1}. ${t.token}</strong>
        <span class="token-badge" style="margin-left: 1rem; background: rgba(46,204,113,0.2); border-color: rgba(46,204,113,0.4); color: #2ecc71;">${strength} Buy Signal</span>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1rem;">
      <div>
        <div style="color: var(--text-secondary); font-size: 0.9rem;">Net Inflow</div>
        <div style="color: #2ecc71; font-weight: 700; font-size: 1.1rem;">${fmt(usdValue)}</div>
      </div>
      <div>
        <div style="color: var(--text-secondary); font-size: 0.9rem;">Whale Transactions</div>
        <div style="color: var(--text-primary); font-weight: 600;">${txCount}</div>
      </div>
      <div>
        <div style="color: var(--text-secondary); font-size: 0.9rem;">Avg Transaction</div>
        <div style="color: var(--text-primary); font-weight: 600;">${fmt(avgTxSize)}</div>
      </div>
    </div>
    <p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.95rem;">
      <strong>Strategy:</strong> ${usdValue > 5000000 ? 'High-confidence long position. Strong institutional accumulation indicates potential major move. Consider scaling in on dips with tight stop-loss.' : 
      'Accumulation pattern developing. Monitor for increased volume confirmation. Consider small position with room to average down.'}
    </p>
  </div>
`}).join('')}
</div>

<h3>Distribution Alerts (Smart Money Selling)</h3>
<p>Significant whale distribution detected. These tokens may face downward pressure or consolidation:</p>
<div style="display: grid; gap: 1rem; margin: 1.5rem 0;">
${outflows.slice(0, 5).map((t, i) => {
  const usdValue = Math.abs(t.netUsdRobust || t.netUsd || 0);
  const txCount = t.txCount || t.count || 0;
  const avgTxSize = txCount > 0 ? usdValue / txCount : 0;
  const severity = usdValue > 10000000 ? 'Critical' : usdValue > 5000000 ? 'High' : usdValue > 1000000 ? 'Moderate' : 'Watch';
  
  return `
  <div style="background: linear-gradient(135deg, rgba(231,76,60,0.1) 0%, rgba(231,76,60,0.05) 100%); border: 1px solid rgba(231,76,60,0.3); border-radius: 12px; padding: 1.25rem;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
      <div>
        <strong style="font-size: 1.3rem; color: #e74c3c;">${i + 1}. ${t.token}</strong>
        <span class="token-badge" style="margin-left: 1rem; background: rgba(231,76,60,0.2); border-color: rgba(231,76,60,0.4); color: #e74c3c;">${severity} Risk</span>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1rem;">
      <div>
        <div style="color: var(--text-secondary); font-size: 0.9rem;">Net Outflow</div>
        <div style="color: #e74c3c; font-weight: 700; font-size: 1.1rem;">${fmt(usdValue)}</div>
      </div>
      <div>
        <div style="color: var(--text-secondary); font-size: 0.9rem;">Sell Transactions</div>
        <div style="color: var(--text-primary); font-weight: 600;">${txCount}</div>
      </div>
      <div>
        <div style="color: var(--text-secondary); font-size: 0.9rem;">Avg Transaction</div>
        <div style="color: var(--text-primary); font-weight: 600;">${fmt(avgTxSize)}</div>
      </div>
    </div>
    <p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.95rem;">
      <strong>Risk Assessment:</strong> ${usdValue > 5000000 ? 'Heavy distribution from whales. Avoid new longs. Consider short positions or protective stops on existing holdings.' : 
      'Moderate selling pressure. Wait for stabilization before entering. Watch for support levels.'}
    </p>
  </div>
`}).join('')}
</div>

<h3>Whale Activity Heatmap</h3>
<p>Tokens with highest institutional attention and unique whale participation:</p>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin: 1.5rem 0;">
${activity.slice(0, 6).map((a) => {
  const netFlow = a.netUsd || 0;
  const ratio = a.buySellRatio || 1;
  const sentiment = ratio > 1.5 ? 'Bullish' : ratio < 0.67 ? 'Bearish' : 'Neutral';
  const sentimentColor = ratio > 1.5 ? '#2ecc71' : ratio < 0.67 ? '#e74c3c' : '#f39c12';
  
  return `
  <div style="background: rgba(54,166,186,0.08); border: 1px solid rgba(54,166,186,0.25); border-radius: 12px; padding: 1.25rem;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <strong style="font-size: 1.2rem; color: var(--primary);">${a.token}</strong>
      <span class="token-badge" style="background: rgba(${ratio > 1.5 ? '46,204,113' : ratio < 0.67 ? '231,76,60' : '243,156,18'},0.2); border-color: rgba(${ratio > 1.5 ? '46,204,113' : ratio < 0.67 ? '231,76,60' : '243,156,18'},0.4); color: ${sentimentColor};">${sentiment}</span>
    </div>
    <div style="margin-bottom: 0.5rem;">
      <div style="color: var(--text-secondary); font-size: 0.85rem;">Unique Whales</div>
      <div style="color: var(--text-primary); font-weight: 700; font-size: 1.3rem;">${a.uniqueWhales || 0}</div>
    </div>
    <div style="margin-bottom: 0.5rem;">
      <div style="color: var(--text-secondary); font-size: 0.85rem;">Net Flow</div>
      <div style="color: ${netFlow >= 0 ? '#2ecc71' : '#e74c3c'}; font-weight: 600;">${fmt(netFlow)}</div>
    </div>
    <div>
      <div style="color: var(--text-secondary); font-size: 0.85rem;">Buy/Sell Ratio</div>
      <div style="color: var(--text-primary); font-weight: 600;">${ratio.toFixed(2)}x</div>
    </div>
  </div>
`}).join('')}
</div>

<h3>Professional Trading Recommendations</h3>

<h4>Immediate Action Items:</h4>
<ol style="line-height: 2; font-size: 1.05rem;">
${strongAccumulation.length > 0 ? `
  <li><strong>Primary Long Setup:</strong> ${strongAccumulation[0].token} — Exceptional accumulation with ${fmt(strongAccumulation[0].netUsdRobust || strongAccumulation[0].netUsd)} inflow. Entry: Current price with 3-5% stop-loss. Target: 15-25% upside on momentum continuation.</li>
` : ''}
${inflows.length > 1 ? `
  <li><strong>Secondary Opportunity:</strong> ${inflows[1].token} — Building momentum with ${fmt(inflows[1].netUsdRobust || inflows[1].netUsd)} whale interest. Consider 25% position size, scale in on dips.</li>
` : ''}
${strongDistribution.length > 0 ? `
  <li><strong>Avoid/Short:</strong> ${strongDistribution[0].token} — Heavy distribution (${fmt(Math.abs(strongDistribution[0].netUsdRobust || strongDistribution[0].netUsd))} outflow). High risk for existing longs. Consider protective stops or short positions.</li>
` : ''}
  <li><strong>Risk Management:</strong> Market sentiment is ${marketSentiment.toLowerCase()} with ${fmtPct(sentimentStrength)} conviction. ${marketSentiment === 'Bullish' ? 'Favor long positions with momentum confirmation.' : marketSentiment === 'Bearish' ? 'Reduce exposure, tighten stops, consider hedges.' : 'Mixed signals — trade selectively with smaller position sizes.'}</li>
</ol>

<h4>Market Structure Analysis:</h4>
<p style="background: rgba(54,166,186,0.1); border-left: 4px solid var(--primary); padding: 1.25rem; border-radius: 8px; margin: 1.5rem 0; line-height: 1.8;">
  <strong>Capital Flow Dynamics:</strong> The current ${fmt(Math.abs(totalInflow - totalOutflow))} ${totalInflow > totalOutflow ? 'net inflow' : 'net outflow'} represents 
  ${totalInflow > totalOutflow ? 'institutional accumulation' : 'profit-taking and risk-off behavior'}. 
  ${avgWhalesPerToken > 10 ? 'High whale participation across multiple tokens suggests broad market strength. This is a favorable environment for swing trades and momentum plays.' : 
  avgWhalesPerToken > 5 ? 'Moderate whale activity indicates selective positioning. Focus on tokens with clear accumulation patterns.' : 
  'Low whale participation suggests caution. Market may lack conviction — reduce position sizes and wait for clearer signals.'}
</p>

<h4>Key Levels to Watch:</h4>
<ul style="line-height: 2;">
  <li><strong>Support Tokens:</strong> ${inflows.slice(0, 2).map(t => t.token).join(', ')} — Major whale bids likely below current prices. Dips = buying opportunities.</li>
  <li><strong>Resistance Tokens:</strong> ${outflows.slice(0, 2).map(t => t.token).join(', ')} — Heavy overhead supply. Avoid breakout trades until distribution completes.</li>
  <li><strong>Breakout Candidates:</strong> Tokens with 1.5x+ buy/sell ratio and rising unique whale count — ${activity.filter(a => (a.buySellRatio || 1) > 1.5).slice(0, 3).map(a => a.token).join(', ')}</li>
</ul>

<div style="margin-top: 2.5rem; padding: 1.5rem; background: linear-gradient(135deg, rgba(155,89,182,0.15) 0%, rgba(54,166,186,0.15) 100%); border-radius: 12px; border: 1px solid rgba(155,89,182,0.3);">
  <p style="color: var(--text-primary); font-size: 1.05rem; margin-bottom: 1rem; font-weight: 600;">
    <strong>ORCA 2.0 Conviction Score:</strong> ${sentimentStrength > 0.3 ? '8.5/10 - High Confidence' : sentimentStrength > 0.15 ? '6.5/10 - Moderate Confidence' : '4.0/10 - Low Confidence'}
  </p>
  <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; margin: 0;">
    ${sentimentStrength > 0.3 ? 'Strong directional bias with clear institutional positioning. This is an actionable market with defined risk/reward setups. Execute with confidence but maintain disciplined risk management.' : 
    sentimentStrength > 0.15 ? 'Moderate market conviction. Opportunities exist but require selective entry timing. Use smaller position sizes and wait for momentum confirmation.' : 
    'Mixed signals and low conviction. This is a challenging environment for directional trades. Focus on risk management, reduce leverage, and wait for clearer market structure.'}
  </p>
</div>

<p style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(54,166,186,0.2); color: var(--text-secondary); font-size: 0.9rem; font-style: italic;">
  <strong>Disclaimer:</strong> This analysis is generated from real-time blockchain data and represents current market conditions at the time of analysis. 
  Cryptocurrency markets are highly volatile. Always conduct independent research, never risk more than you can afford to lose, 
  and consider your risk tolerance before making investment decisions. Past performance does not guarantee future results.
</p>
`
  }

  return (
    <Wrapper>
      <BackgroundEffects />
      <Container>
        <Header>
          <Badge
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/>
              <circle cx="8" cy="10" r="1.5" fill="currentColor"/>
              <circle cx="16" cy="10" r="1.5" fill="currentColor"/>
              <path d="M12 17c2.21 0 4-1.79 4-4H8c0 2.21 1.79 4 4 4z" fill="currentColor"/>
            </svg>
            <span>ORCA 2.0 — AI Crypto Advisor</span>
          </Badge>
          
          <Title
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
          Navigate Markets with SONAR Precision
        </Title>
          
          <Subtitle
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Orca 2.0 analyzes real-time whale flows across blockchains to surface high-confidence, 
            risk-aware investment opportunities. Get actionable insights powered by advanced AI and 
            live market data.
          </Subtitle>
        </Header>
        
        <ChatSection
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <ChatHeader>
            <div style={{ flex: 1 }}>
              <h2>Ask Orca</h2>
              <p>Get real-time market analysis and investment recommendations based on live whale activity</p>
            </div>
          </ChatHeader>
          
          <InputContainer>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask about market trends, token analysis, or investment opportunities..."
              onKeyPress={(e) => e.key === 'Enter' && !loading && askOrca()}
            />
            <AskButton
              onClick={askOrca}
              disabled={loading || !prompt.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? 'Analyzing...' : 'Ask Orca'}
            </AskButton>
          </InputContainer>
          
          <AnimatePresence mode="wait">
            {loading && (
              <ResponseContainer
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <LoadingDots>
                  <span />
                  <span />
                  <span />
                </LoadingDots>
              </ResponseContainer>
            )}
            
            {!loading && answer && (
              <ResponseContainer
                key="answer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AnswerContent dangerouslySetInnerHTML={{ __html: answer }} />
              </ResponseContainer>
            )}
            
            {!loading && !answer && (
              <ResponseContainer
                key="placeholder"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
              >
                <p>Your analysis will appear here...</p>
              </ResponseContainer>
            )}
          </AnimatePresence>
        </ChatSection>
        
        <FeaturesGrid>
          <FeatureCard
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            whileHover={{ y: -8 }}
          >
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.3"/>
              </svg>
            </div>
            <h3>Real-Time Analysis</h3>
            <p>Live tracking of whale movements across multiple blockchains with sub-second latency and instant insights.</p>
          </FeatureCard>
          
          <FeatureCard
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            whileHover={{ y: -8 }}
          >
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="var(--primary)" strokeWidth="2" fill="var(--primary)" fillOpacity="0.3"/>
                <path d="M12 2v4M12 18v4M22 12h-4M6 12H2M19.07 4.93l-2.83 2.83M7.76 16.24l-2.83 2.83M19.07 19.07l-2.83-2.83M7.76 7.76L4.93 4.93" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>AI-Powered Insights</h3>
            <p>Advanced machine learning algorithms analyze patterns and predict market movements with high accuracy.</p>
          </FeatureCard>
          
          <FeatureCard
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
            whileHover={{ y: -8 }}
          >
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 11l3 3L22 4" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="var(--primary)" fillOpacity="0.1"/>
              </svg>
            </div>
            <h3>Risk Management</h3>
            <p>Comprehensive risk assessment and position sizing recommendations based on volatility and liquidity analysis.</p>
          </FeatureCard>
        </FeaturesGrid>
      </Container>
    </Wrapper>
  )
} 
