'use client'
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '../components/PageHeader';
import WhaleAlertsCard from '../components/WhaleAlertsCard';
import Link from 'next/link'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import TokenIcon from '@/components/TokenIcon'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend)

const DashboardContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
`;

const PremiumOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 22, 33, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const PremiumCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(26, 40, 56, 0.98) 0%, rgba(15, 25, 38, 0.98) 100%);
  border: 2px solid var(--primary);
  border-radius: 24px;
  padding: 3rem 2.5rem;
  max-width: 580px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(54, 166, 186, 0.3), 0 0 100px rgba(54, 166, 186, 0.1);
  text-align: center;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(54, 166, 186, 0.08) 0%, transparent 70%);
    animation: pulse 4s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }
`;

const PremiumIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1.5rem;
  filter: drop-shadow(0 4px 12px rgba(54, 166, 186, 0.4));
`;

const PremiumTitle = styled.h2`
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PremiumDescription = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const PremiumFeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 2rem 0;
  text-align: left;
  
  li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0;
    color: var(--text-primary);
    font-size: 1rem;
    
    &::before {
      content: '✓';
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: rgba(54, 166, 186, 0.2);
      border: 2px solid var(--primary);
      border-radius: 50%;
      color: var(--primary);
      font-weight: bold;
      flex-shrink: 0;
    }
  }
`;

const PremiumButton = styled(motion.button)`
  background: linear-gradient(135deg, #36a6ba 0%, #2d8a9a 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 1.2rem 3rem;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(54, 166, 186, 0.35);
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(54, 166, 186, 0.5);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const BlurredContent = styled.div`
  filter: ${props => props.$isPremium ? 'none' : 'blur(8px)'};
  pointer-events: ${props => props.$isPremium ? 'auto' : 'none'};
  user-select: ${props => props.$isPremium ? 'auto' : 'none'};
  transition: filter 0.3s ease;
`;

const StatusBadge = styled.div`
  display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.75rem;
  border-radius: 999px; font-weight: 500; font-size: 0.95rem;
  color: ${({ active }) => active ? '#2ecc71' : '#e74c3c'};
  background: ${({ active }) => active ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)'};
  border: 1px solid ${({ active }) => active ? 'rgba(46, 204, 113, 0.35)' : 'rgba(231, 76, 60, 0.35)'};
`;

const Dot = styled.span`
  width: 10px; height: 10px; border-radius: 50%; display: inline-block;
  background: currentColor;
`;

const FilterContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    margin-top: 1rem;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  label {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
  
  select, input {
    background-color: var(--background-card);
    border: 1px solid var(--secondary);
    color: var(--text-primary);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    min-width: 150px;
    
    &:focus { outline: none; border-color: var(--primary); }
  }
`;

const FilterInfo = styled.div`
  display: flex;
  align-items: center;
  margin-top: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  
  span { color: var(--primary); font-weight: 500; margin: 0 0.25rem; }
`;

const DashboardCard = styled.div`
   background-color: var(--background-card);
   border-radius: 8px;
   padding: 1.5rem;
   margin-bottom: 2rem;
   box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
   transition: transform 0.3s ease, box-shadow 0.3s ease;
   
   &:hover { transform: translateY(-5px); box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2); }
   
   h2 { 
     display: flex; 
     align-items: center; 
     margin-bottom: 1.5rem; 
     font-size: 1.6rem; 
     color: var(--text-primary);
     font-weight: 600;
     letter-spacing: 0.03em;
     border-bottom: 2px solid rgba(52, 152, 219, 0.2);
     padding-bottom: 0.75rem;
   }
 `;

const IncomingDataSection = styled(DashboardCard)``;

const IncomingDataHeader = styled.div`
   display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;
   h2 { 
     font-size: 1.75rem; 
     margin-bottom: 0; 
     color: var(--text-primary);
     font-weight: 600;
     letter-spacing: 0.03em;
     border-bottom: 2px solid rgba(52, 152, 219, 0.2);
     padding-bottom: 0.75rem;
   }
   span { color: var(--text-secondary); }
 `;

const TransactionTable = styled.table`
  width: 100%;
  table-layout: fixed;
  tr { transition: background-color 0.3s ease; }
  tr:hover { background-color: rgba(30, 57, 81, 0.5); }
  td, th { padding: 1rem; text-align: left; }
  .time { color: var(--text-secondary); }
  .amount {
    font-weight: 500;
    text-align: left;
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum' 1;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  }
  .price {
    font-weight: 500;
    text-align: left;
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum' 1;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  }
  .token { font-weight: 500; }
  .action-buy { color: var(--buy-color); background-color: rgba(54, 166, 186, 0.15); border-radius: 4px; padding: 0.25rem 0.75rem; font-weight: 500; }
  .action-sell { color: var(--sell-color); background-color: rgba(231, 76, 60, 0.15); border-radius: 4px; padding: 0.25rem 0.75rem; font-weight: 500; }
  .action-transfer { color: var(--transfer-color); background-color: rgba(52, 152, 219, 0.15); border-radius: 4px; padding: 0.25rem 0.75rem; font-weight: 500; }
  .action-defi { color: #ff8c00; background-color: rgba(255, 140, 0, 0.15); border-radius: 4px; padding: 0.25rem 0.75rem; font-weight: 500; }
  .hash { 
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
`;

const GridContainer = styled.div`
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 2rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const StatsCard = styled(DashboardCard)`
  table { width: 100%; }
  th, td { padding: 0.75rem 0; text-align: left; }
  th:last-child, td:last-child { text-align: left; }
  .percentage { font-weight: 500; color: var(--primary); }
`;

const BarsContainer = styled.div`
  display: grid; grid-template-columns: 1fr; gap: 10px;
`;
const BarRow = styled.div`
  display: grid; grid-template-columns: 160px 1fr 60px; gap: 10px; align-items: center;
`;
const BarTrack = styled.div`
  background: rgba(30, 57, 81, 0.7);
  height: 12px; border-radius: 6px; overflow: hidden;
`;
const BarFill = styled.div`
  height: 100%; background: linear-gradient(90deg, var(--primary), #2ecc71);
`;

// New styled components for enhanced insights
const InsightGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
`;

const InsightCard = styled(DashboardCard)`
   h3 {
     color: var(--text-primary);
     font-size: 1.4rem;
     margin-bottom: 1.5rem;
     display: flex;
     align-items: center;
     gap: 0.5rem;
     font-weight: 600;
     letter-spacing: 0.03em;
     border-bottom: 2px solid rgba(52, 152, 219, 0.2);
     padding-bottom: 0.75rem;
   }
  
  .insight-value {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }
  
  .insight-label {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
  
  .trend-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
    margin-top: 0.5rem;
  }
  
  .trend-up {
    background: rgba(46, 204, 113, 0.15);
    color: #2ecc71;
    border: 1px solid rgba(46, 204, 113, 0.3);
  }
  
  .trend-down {
    background: rgba(231, 76, 60, 0.15);
    color: #e74c3c;
    border: 1px solid rgba(231, 76, 60, 0.3);
  }
  
  .trend-neutral {
    background: rgba(52, 152, 219, 0.15);
    color: #3498db;
    border: 1px solid rgba(52, 152, 219, 0.3);
  }
`;

const SentimentMeter = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
  
  .meter {
    flex: 1;
    height: 8px;
    background: rgba(30, 57, 81, 0.7);
    border-radius: 4px;
    overflow: hidden;
    position: relative;
  }
  
  .meter-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  
  .bullish { background: linear-gradient(90deg, #2ecc71, #27ae60); }
  .neutral { background: linear-gradient(90deg, #f39c12, #e67e22); }
  .bearish { background: linear-gradient(90deg, #e74c3c, #c0392b); }
`;

const TokenHeatmap = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-top: 1rem;
  
  .token-item {
    padding: 0.5rem;
    border-radius: 6px;
    text-align: center;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
  }
  
  .high-activity { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
  .medium-activity { background: rgba(243, 156, 18, 0.2); color: #f39c12; }
  .low-activity { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
`;

const RiskIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
  
  &.low-risk {
    background: rgba(46, 204, 113, 0.15);
    color: #2ecc71;
    border: 1px solid rgba(46, 204, 113, 0.3);
  }
  
  &.medium-risk {
    background: rgba(243, 156, 18, 0.15);
    color: #f39c12;
    border: 1px solid rgba(243, 156, 18, 0.3);
  }
  
  &.high-risk {
    background: rgba(231, 76, 60, 0.15);
    color: #e74c3c;
    border: 1px solid rgba(231, 76, 60, 0.3);
  }
`;

const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const formatCompact = (n) => {
  const num = Number(n || 0);
  const abs = Math.abs(num);
  if (abs >= 1e12) return `${(num/1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(num/1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(num/1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(num/1e3).toFixed(2)}K`;
  return `${Math.round(num)}`;
}

const Dashboard = ({ isPremium = false }) => {
  console.log('🔍 Dashboard isPremium:', isPremium)
  
  const [transactions, setTransactions] = useState([]);
  const [topBuys, setTopBuys] = useState([]);
  const [topSells, setTopSells] = useState([]);
  const [blockchainData, setBlockchainData] = useState({ labels: [], data: [] });
  const [tokenTradeCounts, setTokenTradeCounts] = useState([]);
  const [noData24h, setNoData24h] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('now');
  const [loading, setLoading] = useState(true);
  const [algoActive, setAlgoActive] = useState(true);
  
     // New state for enhanced insights
   const [marketSentiment, setMarketSentiment] = useState({ ratio: 0, trend: 'neutral' });
   const [whaleActivity, setWhaleActivity] = useState([]);
   const [riskMetrics, setRiskMetrics] = useState({ highValueCount: 0, avgTransactionSize: 0 });
  const [topHighValueTxs, setTopHighValueTxs] = useState([])
   const [marketMomentum, setMarketMomentum] = useState({ volumeChange: 0, activityChange: 0 });
  const [timeSeries, setTimeSeries] = useState({ labels: [], volume: [], count: [] })
  const [tokenLeaders, setTokenLeaders] = useState([])
  const [tokenInflows, setTokenInflows] = useState([])
  const [tokenOutflows, setTokenOutflows] = useState([])
  const [overall, setOverall] = useState({ totalCount: 0, totalVolume: 0, buyCount: 0, sellCount: 0, buyVolume: 0, sellVolume: 0 })

  useEffect(() => {
    let timer
    const fetchSummary = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/dashboard/summary', { cache: 'no-store' })
        const json = await res.json()
        if (res.ok) {
          const recent = json.recent || []
          setTransactions(recent.map(r => {
            const rawUsd = Math.floor(r.usd_value || 0)
            return {
              id: r.transaction_hash || `${r.time}-${r.coin}-${r.usd_value}`,
              time: new Date(r.time).toLocaleTimeString(),
              coin: r.coin || '—',
              action: r.action || 'TRANSFER',
              blockchain: r.blockchain || '—',
              rawUsd,
              usdValue: formatNumber(rawUsd),
              hash: r.transaction_hash || '—',
              from_address: r.from_address || '—',
              to_address: r.to_address || '—',
              whale_score: r.whale_score || 0,
            }
          }))
                     setTopBuys(json.topBuys || [])
           setTopSells(json.topSells || [])
           setBlockchainData(json.blockchainVolume || { labels: [], data: [] })
           
           // Set enhanced insights data from API
           setMarketSentiment(json.marketSentiment || { ratio: 0, trend: 'neutral' });
           setRiskMetrics(json.riskMetrics || { highValueCount: 0, avgTransactionSize: 0 });
           setMarketMomentum(json.marketMomentum || { volumeChange: 0, activityChange: 0 });
           setWhaleActivity(json.whaleActivity || []);
          setTopHighValueTxs(json.topHighValueTxs || [])
          setTimeSeries(json.timeSeries || { labels: [], volume: [], count: [] })
          setTokenLeaders(json.tokenLeaders || [])
          setTokenInflows(json.tokenInflows || [])
          setTokenOutflows(json.tokenOutflows || [])
          setOverall(json.overall || { totalCount: 0, totalVolume: 0, buyCount: 0, sellCount: 0, buyVolume: 0, sellVolume: 0 })
          // Normalize tokenTradeCounts to an array of { token, count }
          const ttc = json.tokenTradeCounts
          let normalized = []
          if (Array.isArray(ttc)) {
            // Could be array of objects or tuples
            normalized = ttc.map((item) => {
              if (Array.isArray(item)) {
                const [tok, cnt] = item
                return { token: String(tok || '').trim().toUpperCase(), count: Number(cnt || 0) }
              }
              const token = String(item?.token || item?.symbol || '').trim().toUpperCase()
              const count = Number(item?.count ?? item?.txCount ?? 0)
              return { token, count }
            })
          } else if (ttc && typeof ttc === 'object') {
            normalized = Object.entries(ttc).map(([token, count]) => ({ token: String(token || '').trim().toUpperCase(), count: Number(count || 0) }))
          }
          // Clean, sort, top 10
          let cleaned = (normalized || [])
            .filter((x) => x && x.token && !Number.isNaN(x.count) && x.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
          // Fallback: derive counts from inflow/outflow aggregates if needed
          if (!cleaned.length) {
            const fallbackMap = new Map()
            const inflows = Array.isArray(json.tokenInflows) ? json.tokenInflows : []
            const outflows = Array.isArray(json.tokenOutflows) ? json.tokenOutflows : []
            ;[...inflows, ...outflows].forEach((t) => {
              const token = String(t?.token || '').trim().toUpperCase()
              const cnt = Number(t?.txCount || 0)
              if (token && cnt > 0) fallbackMap.set(token, (fallbackMap.get(token) || 0) + cnt)
            })
            const fb = Array.from(fallbackMap.entries()).map(([token, count]) => ({ token, count }))
              .filter((x) => x && x.token && !Number.isNaN(x.count) && x.count > 0)
              .sort((a, b) => b.count - a.count)
              .slice(0, 10)
            cleaned = fb
          }
          setTokenTradeCounts(cleaned)
          let noData = Boolean(json.noData24h)
          // Fallback: if API says no data, try computing from /api/trades
          if (noData) {
            try {
              const tradesRes = await fetch('/api/trades?sinceHours=24&limit=1000', { cache: 'no-store' })
              const tradesJson = await tradesRes.json()
              const trades = Array.isArray(tradesJson?.data) ? tradesJson.data : []
              if (trades.length > 0) {
                // Build minimal aggregates to unlock UI
                const byToken = new Map()
                trades.forEach(t => {
                  const sym = String(t.token_symbol || '—').trim().toUpperCase()
                  byToken.set(sym, (byToken.get(sym) || 0) + 1)
                })
                const top = Array.from(byToken.entries()).sort((a,b)=>b[1]-a[1]).slice(0,12)
                setTokenTradeCounts(top.map(([token, count]) => ({ token, count })))
                noData = false
              }
            } catch {}
          }
          setNoData24h(noData);
          
          setLastUpdate('just now')
        }
      } catch {}
      finally { setLoading(false) }
    }
    
                     // All enhanced insights data is now fetched from the enhanced /api/dashboard/summary endpoint
    
    const pollAlgo = async () => {
      try {
        const res = await fetch('/api/health/algorithm', { cache: 'no-store' })
        const j = await res.json()
        if (res.ok) setAlgoActive(Boolean(j.active))
      } catch {}
    }
    
         fetchSummary(); 
     pollAlgo()
     timer = setInterval(() => { 
       fetchSummary(); 
       pollAlgo() 
     }, 15000)
    return () => clearInterval(timer)
  }, [])

  const filteredTransactions = transactions;

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { when: 'beforeChildren', staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  const getSentimentColor = (trend) => {
    switch(trend) {
      case 'bullish': return '#2ecc71';
      case 'bearish': return '#e74c3c';
      default: return '#f39c12';
    }
  };

  const getRiskLevel = (value) => {
    if (value > 1000000) return 'high-risk';
    if (value > 100000) return 'medium-risk';
    return 'low-risk';
  };

  const getActivityLevel = (count) => {
    if (count > 50) return 'high-activity';
    if (count > 20) return 'medium-activity';
    return 'low-activity';
  };

  return (
    <>
      {!isPremium && (
        <PremiumOverlay>
          <PremiumCard
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <PremiumIcon>🔒</PremiumIcon>
            <PremiumTitle>Unlock Premium Dashboard</PremiumTitle>
            <PremiumDescription>
              Get full access to real-time whale analytics, advanced insights, and comprehensive market data.
            </PremiumDescription>
            <PremiumFeatureList>
              <li>Live whale transaction tracking (24/7)</li>
              <li>Advanced token analytics & heatmaps</li>
              <li>Risk assessment & sentiment analysis</li>
              <li>AI-powered market insights (Orca 2.0)</li>
              <li>Custom alerts & notifications</li>
            </PremiumFeatureList>
            <PremiumButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/subscribe'}
            >
              Go Premium — £5/month
            </PremiumButton>
          </PremiumCard>
        </PremiumOverlay>
      )}
      
    <DashboardContainer>
        <BlurredContent $isPremium={isPremium}>
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
         <PageHeader title="Real-Time" accentWord="Dashboard">
           <FilterContainer>
             <StatusBadge active={algoActive}>
               <Dot /> {algoActive ? 'Algorithm Active' : 'Algorithm Not Active'}
             </StatusBadge>
           </FilterContainer>
         </PageHeader>
         
         {/* 24-Hour Data Indicator */}
         <div style={{ 
           background: 'rgba(52, 152, 219, 0.1)', 
           border: '1px solid rgba(52, 152, 219, 0.3)',
           borderRadius: '8px',
           padding: '1rem',
           marginTop: '1.5rem',
           marginBottom: '2rem',
           textAlign: 'center'
         }}>
           <p style={{ 
             color: 'var(--primary)', 
             fontSize: '1.1rem', 
             fontWeight: '600',
             margin: '0',
             marginBottom: '0.5rem'
           }}>
             All data represents the last 24 hours of whale activity
           </p>
           <p style={{ 
             color: 'var(--text-secondary)', 
             fontSize: '0.95rem', 
             fontWeight: '500',
             margin: '0'
           }}>
             Tracking transactions $500,000+
           </p>
         </div>
       </motion.div>

      


      {/* Market Pulse - High-level sentiment overview */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <DashboardCard>
          <h2>Market Pulse (24h)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(46, 204, 113, 0.1) 0%, rgba(46, 204, 113, 0.05) 100%)', 
              border: '1px solid rgba(46, 204, 113, 0.3)',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(46, 204, 113, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#2ecc71' }}>
                {tokenInflows.filter(t => (t.netUsdRobust || 0) > 1000000).length}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 600 }}>
                Strong Accumulation
              </div>
              <div style={{ fontSize: '0.85rem', color: '#2ecc71', marginTop: '0.25rem' }}>
                &gt; $1M Net Inflow
              </div>
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(231, 76, 60, 0.1) 0%, rgba(231, 76, 60, 0.05) 100%)', 
              border: '1px solid rgba(231, 76, 60, 0.3)',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(231, 76, 60, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#e74c3c' }}>
                {tokenOutflows.filter(t => Math.abs(t.netUsdRobust || 0) > 1000000).length}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 600 }}>
                Heavy Distribution
              </div>
              <div style={{ fontSize: '0.85rem', color: '#e74c3c', marginTop: '0.25rem' }}>
                &gt; $1M Net Outflow
              </div>
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(54, 166, 186, 0.1) 0%, rgba(54, 166, 186, 0.05) 100%)', 
              border: '1px solid rgba(54, 166, 186, 0.3)',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(54, 166, 186, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                {whaleActivity.filter(t => (t.uniqueWhales || 0) > 10).length}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 600 }}>
                High Whale Activity
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                &gt; 10 Unique Whales
              </div>
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(243, 156, 18, 0.1) 0%, rgba(243, 156, 18, 0.05) 100%)', 
              border: '1px solid rgba(243, 156, 18, 0.3)',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(243, 156, 18, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f39c12' }}>
                ${formatNumber(Math.abs(overall.totalVolume || 0))}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 600 }}>
                24h Whale Volume
              </div>
              <div style={{ fontSize: '0.85rem', color: '#f39c12', marginTop: '0.25rem' }}>
                {overall.totalCount || 0} Transactions
              </div>
            </div>
          </div>
        </DashboardCard>
      </motion.div>

      {/* Net Inflows/Outflows section */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ marginTop: '1.5rem' }}>
        <GridContainer>
          <DashboardCard>
            <h2>Top Net Inflows (24h)</h2>
            {tokenInflows.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No data in the past 24 hours.</p>
            ) : (
              <Bar
                data={{
                  labels: tokenInflows.map(t => t.token),
                  datasets: [{ label: 'Net USD', data: tokenInflows.map(t => t.netUsdRobust ?? t.netUsd), backgroundColor: 'rgba(46,204,113,0.6)', borderColor: '#2ecc71' }]
                }}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `$${formatNumber(Math.round(ctx.parsed.y || 0))}` } } },
                  onClick: (_evt, elements) => { try { if (!elements?.length) return; const idx = elements[0].index; const token = tokenInflows[idx]?.token; if (token) window.location.href = `/statistics?token=${encodeURIComponent(token)}&sinceHours=24` } catch {} },
                  scales: { y: { beginAtZero: true, ticks: { color: '#a0b2c6', callback: (v) => `$${Number(v).toLocaleString()}` } }, x: { ticks: { color: '#a0b2c6' } } }
                }}
              />
            )}
          </DashboardCard>

          <DashboardCard>
            <h2>Top Net Outflows (24h)</h2>
            {tokenOutflows.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No data in the past 24 hours.</p>
            ) : (
              <Bar
                data={{
                  labels: tokenOutflows.map(t => t.token),
                  datasets: [{ label: 'Net USD', data: tokenOutflows.map(t => Math.abs(t.netUsdRobust ?? t.netUsd)), backgroundColor: 'rgba(231,76,60,0.6)', borderColor: '#e74c3c' }]
                }}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `-$${formatNumber(Math.round(ctx.parsed.y || 0))}` } } },
                  onClick: (_evt, elements) => { try { if (!elements?.length) return; const idx = elements[0].index; const token = tokenOutflows[idx]?.token; if (token) window.location.href = `/statistics?token=${encodeURIComponent(token)}&sinceHours=24` } catch {} },
                  scales: { y: { beginAtZero: true, ticks: { color: '#a0b2c6', callback: (v) => `-$${Number(v).toLocaleString()}` } }, x: { ticks: { color: '#a0b2c6' } } }
                }}
              />
            )}
          </DashboardCard>
        </GridContainer>
      </motion.div>

      {/* Buy vs Sell section removed per request */}

      {/* Premium-only sections - wrapped with conditional rendering */}
      {isPremium ? (
        <>
      <GridContainer>
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
                     <StatsCard>
             <h2>Top % of Buys</h2>
            <table>
              <thead><tr><th>Coin</th><th>%</th></tr></thead>
              <tbody>
                {topBuys.map((item, index) => (
                  <motion.tr key={`buy-${item.coin}-${index}`} variants={itemVariants}>
                    <td><Link href={`/statistics?token=${encodeURIComponent(item.coin)}&sinceHours=24`}>{item.coin}</Link></td>
                    <td className="percentage">{item.percentage.toFixed(1)}%</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </StatsCard>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
                     <StatsCard>
             <h2>Top % of Sells</h2>
            <table>
              <thead><tr><th>Coin</th><th>%</th></tr></thead>
              <tbody>
                {topSells.map((item, index) => (
                  <motion.tr key={`sell-${item.coin}-${index}`} variants={itemVariants}>
                    <td><Link href={`/statistics?token=${encodeURIComponent(item.coin)}&sinceHours=24`}>{item.coin}</Link></td>
                    <td className="percentage">{item.percentage.toFixed(1)}%</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </StatsCard>
        </motion.div>
             </GridContainer>

       {/* Professional Market Insights Section */}
       <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ marginTop: '2rem' }}>
         <div style={{ 
           display: 'grid', 
           gridTemplateColumns: '1fr 1fr', 
           gap: '1.5rem',
           '@media (max-width: 1024px)': { gridTemplateColumns: '1fr' }
         }}>
           
           {/* Whale Activity Heatmap - Full Width Left Column */}
           <DashboardCard style={{ gridColumn: '1 / 2' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Whale Activity Heatmap</h2>
               <div style={{ 
                 background: 'rgba(54, 166, 186, 0.15)',
                 border: '1px solid rgba(54, 166, 186, 0.3)',
                 borderRadius: '8px',
                 padding: '0.5rem 1rem'
               }}>
                 <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                   {whaleActivity.length}
                 </span>
                 <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                   Active Tokens
                 </span>
               </div>
             </div>
             
             <div style={{ 
               display: 'grid', 
               gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
               gap: '0.75rem'
             }}>
               {whaleActivity
                 .slice()
                 .sort((a,b)=> (b.uniqueWhales||0) - (a.uniqueWhales||0))
                 .slice(0, 12)
                 .map((t) => {
                   const count = Number(t.uniqueWhales || 0)
                   const maxWhales = whaleActivity[0]?.uniqueWhales || count || 1
                   const intensity = Math.min(1, count / maxWhales)
                   const netFlow = t.netUsd || 0
                   const isPositive = netFlow >= 0
                   
                   return (
                     <Link key={t.token}
                       href={`/token/${encodeURIComponent(t.token)}?sinceHours=24`}
                       style={{
                         display: 'flex',
                         flexDirection: 'column',
                         padding: '0.875rem',
                         borderRadius: '10px',
                         background: `linear-gradient(135deg, rgba(${isPositive ? '46,204,113' : '231,76,60'},${0.08 + intensity * 0.12}) 0%, rgba(54,166,186,${0.05 + intensity * 0.15}) 100%)`,
                         border: `1.5px solid rgba(${isPositive ? '46,204,113' : '231,76,60'},${0.2 + intensity * 0.3})`,
                         textDecoration: 'none',
                         transition: 'all 0.3s ease',
                         cursor: 'pointer',
                         position: 'relative',
                         overflow: 'hidden'
                       }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
                         e.currentTarget.style.boxShadow = `0 8px 20px rgba(${isPositive ? '46,204,113' : '231,76,60'},0.25)`
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.transform = 'translateY(0) scale(1)'
                         e.currentTarget.style.boxShadow = 'none'
                       }}
                       title={`${t.token}: ${count} unique whales trading • Net Flow: $${formatNumber(Math.abs(Math.round(netFlow)))}`}
                     >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <TokenIcon symbol={t.token} size={24} />
                          <span style={{ 
                            fontSize: '1.1rem', 
                            fontWeight: 700, 
                            color: 'var(--text-primary)', 
                            letterSpacing: '0.02em'
                          }}>
                            {t.token}
                          </span>
                        </div>
                        <span style={{ 
                          fontSize: '1.2rem',
                          fontWeight: 800,
                          color: isPositive ? '#2ecc71' : '#e74c3c'
                        }}>
                          {count}
                        </span>
        </div>
                       <div style={{ 
                         fontSize: '0.75rem', 
                         color: 'var(--text-secondary)',
                         fontWeight: 600
                       }}>
                         {count === 1 ? '1 Whale' : `${count} Whales`}
                </div>
                       <div style={{
                         position: 'absolute',
                         bottom: 0,
                         left: 0,
                         right: 0,
                         height: '3px',
                         background: `linear-gradient(90deg, ${isPositive ? '#2ecc71' : '#e74c3c'}, transparent)`,
                         opacity: intensity
                       }} />
                     </Link>
                   )
                 })}
             </div>
           </DashboardCard>

           {/* Right Column - Risk & Momentum */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             
             {/* Risk Assessment Card */}
             <DashboardCard>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                 <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Risk Assessment</h2>
                 <div style={{
                   background: 'rgba(231, 76, 60, 0.15)',
                   border: '1px solid rgba(231, 76, 60, 0.3)',
                   borderRadius: '8px',
                   padding: '0.5rem 1rem'
                 }}>
                   <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e74c3c' }}>
                     {riskMetrics.highValueCount}
                </span>
                   <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                     High-Risk
                   </span>
                 </div>
               </div>

               <div style={{
                 background: 'rgba(231, 76, 60, 0.08)',
                 border: '1px solid rgba(231, 76, 60, 0.2)',
                 borderRadius: '10px',
                 padding: '1rem',
                 marginBottom: '1rem'
               }}>
                 <div style={{ 
                   display: 'flex', 
                   justifyContent: 'space-between', 
                   alignItems: 'center'
                 }}>
                   <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                     Avg Transaction Size
                   </span>
                   <span style={{ 
                     fontSize: '1.3rem', 
                     fontWeight: 700, 
                     color: 'var(--text-primary)'
                   }}>
                     ${formatNumber(Math.round(riskMetrics.avgTransactionSize))}
                   </span>
                  </div>
               </div>

               {topHighValueTxs.length > 0 && (
                 <div>
                   <div style={{ 
                     fontSize: '0.95rem', 
                     fontWeight: 700, 
                     color: 'var(--primary)', 
                     marginBottom: '0.75rem',
                     textTransform: 'uppercase',
                     letterSpacing: '0.05em'
                   }}>
                     Top 5 Largest Transactions
               </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                     {topHighValueTxs.slice(0, 5).map((t, idx) => (
                       <div key={t.hash || `${t.coin}-${idx}`} style={{
                         display: 'grid',
                         gridTemplateColumns: '80px 1fr auto auto',
                         gap: '0.75rem',
                         alignItems: 'center',
                         padding: '0.75rem',
                         background: 'rgba(30, 57, 81, 0.3)',
                         borderRadius: '8px',
                         border: '1px solid rgba(54, 166, 186, 0.15)',
                         transition: 'all 0.3s ease'
                       }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.background = 'rgba(54, 166, 186, 0.1)'
                         e.currentTarget.style.borderColor = 'rgba(54, 166, 186, 0.3)'
                         e.currentTarget.style.transform = 'translateX(4px)'
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.background = 'rgba(30, 57, 81, 0.3)'
                         e.currentTarget.style.borderColor = 'rgba(54, 166, 186, 0.15)'
                         e.currentTarget.style.transform = 'translateX(0)'
                       }}>
                         <Link href={`/token/${encodeURIComponent(t.coin)}?sinceHours=24`} style={{
                           fontWeight: 700,
                           color: 'var(--primary)',
                           textDecoration: 'none',
                           fontSize: '0.95rem'
                         }}>
                           {t.coin}
                         </Link>
                         <div style={{ 
                           fontWeight: 700, 
                           color: 'var(--text-primary)',
                           fontSize: '0.95rem',
                           fontFamily: 'ui-monospace, monospace'
                         }}>
                           ${formatNumber(t.usd)}
                         </div>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          background: t.side?.toLowerCase() === 'buy' ? 'rgba(46,204,113,0.2)' : 
                                     t.side?.toLowerCase() === 'sell' ? 'rgba(231,76,60,0.2)' : 
                                     'rgba(52,152,219,0.2)',
                          color: t.side?.toLowerCase() === 'buy' ? '#2ecc71' : 
                                t.side?.toLowerCase() === 'sell' ? '#e74c3c' : 
                                '#3498db',
                          border: `1px solid ${t.side?.toLowerCase() === 'buy' ? 'rgba(46,204,113,0.4)' : 
                                              t.side?.toLowerCase() === 'sell' ? 'rgba(231,76,60,0.4)' : 
                                              'rgba(52,152,219,0.4)'}`
                        }}>
                          {t.side}
                        </span>
                         <span style={{ 
                           fontSize: '0.85rem', 
                           color: 'var(--text-secondary)',
                           fontWeight: 600
                         }}>
                           {t.chain}
                         </span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </DashboardCard>

             {/* Market Momentum Card */}
             <DashboardCard>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                 <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Market Momentum</h2>
             </div>

               <div style={{
                 background: `linear-gradient(135deg, rgba(${marketMomentum.volumeChange > 0 ? '46,204,113' : '231,76,60'},0.1) 0%, rgba(${marketMomentum.volumeChange > 0 ? '46,204,113' : '231,76,60'},0.05) 100%)`,
                 border: `1px solid rgba(${marketMomentum.volumeChange > 0 ? '46,204,113' : '231,76,60'},0.3)`,
                 borderRadius: '10px',
                 padding: '1.5rem',
                 textAlign: 'center',
                 marginBottom: '1rem'
               }}>
                 <div style={{ 
                   fontSize: '3rem', 
                   fontWeight: 800, 
                   color: marketMomentum.volumeChange > 0 ? '#2ecc71' : '#e74c3c',
                   marginBottom: '0.5rem'
                 }}>
               {marketMomentum.volumeChange > 0 ? '+' : ''}{marketMomentum.volumeChange.toFixed(1)}%
             </div>
                 <div style={{ 
                   fontSize: '0.95rem', 
                   color: 'var(--text-secondary)',
                   fontWeight: 600,
                   textTransform: 'uppercase',
                   letterSpacing: '0.05em'
                 }}>
                   Volume Change (24h)
                 </div>
               </div>
               
               <div style={{
                 display: 'grid',
                 gridTemplateColumns: '1fr 1fr',
                 gap: '1rem'
               }}>
                 <div style={{
                   background: 'rgba(54, 166, 186, 0.1)',
                   border: '1px solid rgba(54, 166, 186, 0.25)',
                   borderRadius: '8px',
                   padding: '1rem',
                   textAlign: 'center'
                 }}>
                   <div style={{ 
                     fontSize: '1.8rem', 
                     fontWeight: 800, 
                     color: 'var(--primary)',
                     marginBottom: '0.25rem'
                   }}>
                     {formatNumber(overall.totalCount || 0)}
             </div>
                   <div style={{ 
                     fontSize: '0.85rem', 
                     color: 'var(--text-secondary)',
                     fontWeight: 600
                   }}>
                     Transactions
                   </div>
                 </div>

                 <div style={{
                   background: 'rgba(243, 156, 18, 0.1)',
                   border: '1px solid rgba(243, 156, 18, 0.25)',
                   borderRadius: '8px',
                   padding: '1rem',
                   textAlign: 'center'
                 }}>
                   <div style={{ 
                     fontSize: '1.8rem', 
                     fontWeight: 800, 
                     color: '#f39c12',
                     marginBottom: '0.25rem'
                   }}>
                     {whaleActivity.length}
                   </div>
                   <div style={{ 
                     fontSize: '0.85rem', 
                     color: 'var(--text-secondary)',
                     fontWeight: 600
                   }}>
                     Active Tokens
                   </div>
                 </div>
               </div>
             </DashboardCard>
           </div>
         </div>
       </motion.div>

             

      <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ marginTop: '1.5rem' }}>
         <DashboardCard>
          <h2>Most Traded Tokens (24h)</h2>
          <div style={{ minHeight: '220px' }}>
           {noData24h || tokenTradeCounts.length === 0 ? (
             <p style={{ color: 'var(--text-secondary)' }}>No data in the past 24 hours.</p>
            ) : (
              <BarsContainer>
               {tokenTradeCounts.map((t) => {
                 const max = Math.max(...tokenTradeCounts.map(x => Number(x.count || 0)), 1)
                 const value = Number(t.count || 0)
                  const pct = Math.max(0, (value / max) * 100)
                  return (
                  <BarRow key={t.token}>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      <Link href={`/token/${encodeURIComponent(t.token)}?sinceHours=24`}>{t.token}</Link>
                    </div>
                      <BarTrack>
                        <BarFill style={{ width: `${pct}%` }} />
                      </BarTrack>
                    <div style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{formatNumber(value)}</div>
                    </BarRow>
                  )
                })}
              </BarsContainer>
            )}
          </div>
        </DashboardCard>
      </motion.div>

      {/* Top 10 Whales (7 Days) Section */}
      <TopWhalesSection />
        </>
      ) : (
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="visible"
          style={{ marginTop: '2rem' }}
        >
          <PremiumCard
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <PremiumIcon>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--primary)">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
            </PremiumIcon>
            <PremiumTitle>Unlock Advanced Analytics</PremiumTitle>
            <PremiumDescription>
              Upgrade to Sonar Premium to access advanced whale analytics, sentiment analysis, 
              risk assessments, and comprehensive market insights.
            </PremiumDescription>
            <PremiumFeatureList>
              <li>Real-time whale activity heatmaps</li>
              <li>Advanced sentiment & risk analysis</li>
              <li>Top buy/sell percentage tracking</li>
              <li>Blockchain distribution insights</li>
              <li>High-value transaction monitoring</li>
              <li>Custom whale alerts & notifications</li>
            </PremiumFeatureList>
            <PremiumButton
              onClick={() => window.location.href = '/subscribe'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Upgrade to Premium - $7.99/month
            </PremiumButton>
          </PremiumCard>
        </motion.div>
      )}
      
      {/* Whale Alerts - Visible to all users (locked state for free) */}
      <WhaleAlertsCard isPremium={isPremium} />
        </BlurredContent>
    </DashboardContainer>
    </>
  )
}

// Top Whales Section Component
const TopWhalesSection = () => {
  const [whales, setWhales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTopWhales = async () => {
      try {
        const res = await fetch('/api/whales/top-7day')
        const data = await res.json()
        setWhales(data?.whales || [])
      } catch (err) {
        console.error('Failed to fetch top whales:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTopWhales()
  }, [])

  const formatUSD = (value) => {
    const num = Number(value)
    const abs = Math.abs(num)
    const sign = num >= 0 ? '+' : ''
    
    if (abs >= 1e9) return `${sign}$${(num / 1e9).toFixed(2)}B`
    if (abs >= 1e6) return `${sign}$${(num / 1e6).toFixed(2)}M`
    if (abs >= 1e3) return `${sign}$${(num / 1e3).toFixed(2)}K`
    return `${sign}$${num.toFixed(2)}`
  }

  const timeAgo = (timestamp) => {
    const now = Date.now()
    const then = new Date(timestamp).getTime()
    const diffMs = now - then
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5, delay: 0.3 }}
      style={{ marginTop: '1.5rem' }}
    >
      <DashboardCard>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: '28px', height: '28px', fill: 'var(--primary)' }}>
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm-1.06 16.88L7.4 15.34l1.42-1.42 2.12 2.12 4.24-4.24 1.42 1.42-5.66 5.66z"/>
            </svg>
            <div>
              <h2 style={{ margin: '0', fontSize: '1.5rem' }}>Top 10 Whales</h2>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Most active whale wallets in the past 7 days
              </p>
            </div>
          </div>
          <span style={{
            padding: '0.5rem 1rem',
            background: 'rgba(54, 166, 186, 0.15)',
            border: '1px solid rgba(54, 166, 186, 0.3)',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: '700',
            color: 'var(--primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            7-Day Activity
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <p>Loading top whales...</p>
          </div>
        ) : whales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: '64px', height: '64px', fill: 'rgba(54, 166, 186, 0.3)', marginBottom: '1rem' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '1rem 0 0.5rem 0' }}>No Whale Activity</h3>
            <p>No significant whale transactions detected in the past 7 days.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(30, 57, 81, 0.3)', borderBottom: '1px solid rgba(54, 166, 186, 0.1)' }}>
                    Rank
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(30, 57, 81, 0.3)', borderBottom: '1px solid rgba(54, 166, 186, 0.1)' }}>
                    Whale Address
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(30, 57, 81, 0.3)', borderBottom: '1px solid rgba(54, 166, 186, 0.1)' }}>
                    Net Flow (7d)
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(30, 57, 81, 0.3)', borderBottom: '1px solid rgba(54, 166, 186, 0.1)' }}>
                    Buy/Sell
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(30, 57, 81, 0.3)', borderBottom: '1px solid rgba(54, 166, 186, 0.1)' }}>
                    Top Tokens
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(30, 57, 81, 0.3)', borderBottom: '1px solid rgba(54, 166, 186, 0.1)' }}>
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody>
                {whales.map((whale, idx) => {
                  const rank = idx + 1
                  const buyPct = parseInt(whale.buySellRatio?.split('/')[0]) || 50
                  
                  return (
                    <motion.tr
                      key={whale.address}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                      style={{
                        borderBottom: '1px solid rgba(54, 166, 186, 0.1)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(54, 166, 186, 0.08)'
                        e.currentTarget.style.transform = 'translateX(2px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.transform = 'translateX(0)'
                      }}
                    >
                      <td style={{ padding: '1rem' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          fontWeight: '800',
                          fontSize: '0.9rem',
                          background: rank === 1 ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' 
                                    : rank === 2 ? 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)'
                                    : rank === 3 ? 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)'
                                    : 'rgba(54, 166, 186, 0.2)',
                          color: rank <= 3 ? '#0a1621' : 'var(--text-primary)',
                          border: `2px solid ${
                            rank === 1 ? 'rgba(255, 215, 0, 0.5)'
                            : rank === 2 ? 'rgba(192, 192, 192, 0.5)'
                            : rank === 3 ? 'rgba(205, 127, 50, 0.5)'
                            : 'rgba(54, 166, 186, 0.3)'
                          }`,
                          boxShadow: rank <= 3 ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
                        }}>
                          {rank}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <Link 
                          href={`/whale/${encodeURIComponent(whale.address)}`}
                          style={{
                            color: 'var(--primary)',
                            textDecoration: 'none',
                            fontWeight: '700',
                            fontFamily: 'Courier New, monospace',
                            fontSize: '0.95rem',
                            transition: 'color 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#5dd5ed'
                            e.currentTarget.style.textDecoration = 'underline'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--primary)'
                            e.currentTarget.style.textDecoration = 'none'
                          }}
                        >
                          {whale.address.slice(0, 6)}…{whale.address.slice(-4)}
                        </Link>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{
                          fontWeight: '800',
                          fontSize: '1.05rem',
                          color: whale.netUsd > 0 ? '#2ecc71' : whale.netUsd < 0 ? '#e74c3c' : 'var(--text-primary)'
                        }}>
                          {formatUSD(whale.netUsd)}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          background: buyPct > 65 ? 'rgba(46, 204, 113, 0.2)'
                                    : buyPct < 35 ? 'rgba(231, 76, 60, 0.2)'
                                    : 'rgba(241, 196, 15, 0.2)',
                          color: buyPct > 65 ? '#2ecc71'
                               : buyPct < 35 ? '#e74c3c'
                               : '#f1c40f',
                          border: `1px solid ${
                            buyPct > 65 ? 'rgba(46, 204, 113, 0.3)'
                            : buyPct < 35 ? 'rgba(231, 76, 60, 0.3)'
                            : 'rgba(241, 196, 15, 0.3)'
                          }`
                        }}>
                          {whale.buySellRatio}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {(whale.tokens || []).slice(0, 3).map(token => (
                            <span key={token} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.25rem 0.6rem',
                              background: 'rgba(54, 166, 186, 0.15)',
                              border: '1px solid rgba(54, 166, 186, 0.25)',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              color: 'var(--primary)'
                            }}>
                              <TokenIcon symbol={token} size={16} />
                              {token}
                            </span>
                          ))}
                          {(whale.tokens || []).length > 3 && (
                            <span style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.6rem',
                              background: 'rgba(54, 166, 186, 0.15)',
                              border: '1px solid rgba(54, 166, 186, 0.25)',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              color: 'var(--primary)'
                            }}>
                              +{whale.tokens.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {whale.lastSeen ? timeAgo(whale.lastSeen) : '—'}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>
    </motion.div>
  )
}

export default Dashboard; 