'use client'
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '../components/PageHeader';
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
  const [transactions, setTransactions] = useState([]);
  const [topBuys, setTopBuys] = useState([]);
  const [topSells, setTopSells] = useState([]);
  const [blockchainData, setBlockchainData] = useState({ labels: [], data: [] });
  const [tokenTradeCounts, setTokenTradeCounts] = useState([]);
  const [noData24h, setNoData24h] = useState(false);
  const [minValue, setMinValue] = useState(0);
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
          setNoData24h(Boolean(json.noData24h));
          
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

  const filteredTransactions = transactions.filter(t => {
    const min = typeof minValue === 'number' ? minValue : Number(minValue || 0)
    const usd = Number(t.rawUsd || 0)
    return usd >= min
  })

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { when: 'beforeChildren', staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  const handleMinValueChange = (e) => {
    const value = e.target.value === '' ? '' : Number(e.target.value)
    setMinValue(value)
  };

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
             <FilterGroup>
               <label htmlFor="min-value">Minimum Transaction Value ($)</label>
               <input id="min-value" type="number" min="0" step="1000" value={minValue} onChange={handleMinValueChange} placeholder="Enter minimum value" />
             </FilterGroup>
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
             margin: '0'
           }}>
             ⏰ All data represents the last 24 hours of whale activity
           </p>
         </div>
       </motion.div>

      


      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <IncomingDataSection>
          <IncomingDataHeader>
            <h2>Incoming Data</h2>
            <span>Updated {lastUpdate}</span>
          </IncomingDataHeader>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
          ) : noData24h ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No data in the past 24 hours.</p>
          ) : (
            <TransactionTable>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Token</th>
                  <th>Action</th>
                  <th>Blockchain</th>
                  <th>USD Value</th>
                  <th>
                    <Link href="/faq#whale-score" style={{ color: 'inherit', textDecoration: 'none' }}>Whale Score</Link>
                  </th>
                  <th>From Address</th>
                  <th>Transaction</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.slice(0, 5).map(transaction => (
                      <motion.tr key={transaction.id} variants={itemVariants} initial="hidden" animate="visible" exit={{ opacity: 0, height: 0 }}>
                        <td className="time">{transaction.time}</td>
                        <td className="token">{transaction.coin ? (<Link href={`/token/${encodeURIComponent(transaction.coin)}`}>{transaction.coin}</Link>) : '—'}</td>
                        <td><span className={`action-${transaction.action.toLowerCase() || 'transfer'}`}>{transaction.action}</span></td>
                        <td>{transaction.blockchain}</td>
                        <td className="price">${transaction.usdValue}</td>
                        <td className="whale-score" style={{ 
                          color: transaction.whale_score > 75 ? '#e74c3c' : 
                                transaction.whale_score > 50 ? '#f39c12' : 
                                transaction.whale_score > 25 ? '#3498db' : '#95a5a6',
                          fontWeight: '600'
                        }}>
                          {transaction.whale_score > 0 ? Math.round(transaction.whale_score) : '—'}
                        </td>
                        <td className="address" style={{ 
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)'
                        }}>
                          {transaction.from_address !== '—' ? 
                            `${transaction.from_address.slice(0, 6)}...${transaction.from_address.slice(-4)}` : 
                            '—'
                          }
                        </td>
                        <td className="hash">{transaction.hash ? `${transaction.hash.slice(0,6)}...${transaction.hash.slice(-4)}` : '—'}</td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No transactions match the current minimum value. Try lowering the minimum value.</td></tr>
                  )}
                </AnimatePresence>
              </tbody>
            </TransactionTable>
          )}
        </IncomingDataSection>
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

       {/* Enhanced Market Insights - Last 24 Hours */}
       <motion.div variants={containerVariants} initial="hidden" animate="visible">
         <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
           <h2 style={{ 
             color: 'var(--text-primary)', 
             marginBottom: '0.5rem', 
             fontSize: '2.5rem',
             fontWeight: '700',
             letterSpacing: '0.05em'
           }}>Market Insights</h2>
         </div>
         <InsightGrid>
                       <InsightCard>
              <h3>Whale Activity Heatmap</h3>
            <div className="insight-value" style={{ marginBottom: '0.25rem' }}>{whaleActivity.length}</div>
                          <div className="insight-label">Active Tokens</div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginTop: '12px' }}>
               {whaleActivity
                 .slice()
                 .sort((a,b)=> (b.uniqueWhales||0) - (a.uniqueWhales||0))
                 .slice(0, 12)
                 .map((t) => {
                   const count = Number(t.uniqueWhales || 0)
                   const intensity = Math.min(1, count / Math.max(1, whaleActivity[0]?.uniqueWhales || count || 1))
                   const bg = `rgba(54,166,186,${0.15 + intensity * 0.5})`
                   const border = `rgba(54,166,186,${0.3 + intensity * 0.4})`
                   return (
                     <Link key={t.token}
                       href={`/statistics?token=${encodeURIComponent(t.token)}&sinceHours=24`}
                       style={{
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'space-between',
                         padding: '10px 12px',
                         borderRadius: 6,
                         background: bg,
                         border: `1px solid ${border}`,
                         boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                         color: 'var(--text-primary)',
                         textDecoration: 'none',
                         fontWeight: 600,
                         fontSize: '0.95rem',
                         minHeight: '44px'
                       }}
                       title={`${t.token}: ${count} whales, $${formatNumber(Math.round(t.netUsd||0))} net flow`}
                     >
                       <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.token}</span>
                       <span style={{ color: '#a0b2c6', fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--secondary)', borderRadius: 12, padding: '2px 8px' }}>{count}</span>
                     </Link>
                   )
                 })}
             </div>
           </InsightCard>

                       <InsightCard>
              <h3>Risk Assessment</h3>
             <div className="insight-value">{riskMetrics.highValueCount}</div>
             <div className="insight-label">High-Value Transactions (&gt;$1M)</div>
             <div style={{ marginTop: '1rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                 <span>Avg Transaction Size:</span>
                 <span style={{ fontWeight: '600' }}>${formatNumber(Math.round(riskMetrics.avgTransactionSize))}</span>
               </div>
              {topHighValueTxs.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.4rem' }}>Top 10 Largest (24h)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem 0.75rem', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>Token</div>
                    <div style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>USD</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Side</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Chain</div>
                    {topHighValueTxs.map((t) => (
                      <React.Fragment key={t.hash || `${t.coin}-${t.time}`}>
                        <div><Link href={`/statistics?token=${encodeURIComponent(t.coin)}&sinceHours=24`}>{t.coin}</Link></div>
                        <div style={{ textAlign: 'right' }}>${formatNumber(t.usd)}</div>
                        <div><span className={`action-${(t.side||'').toLowerCase()}`}>{t.side}</span></div>
                        <div>{t.chain}</div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
             </div>
           </InsightCard>

                       <InsightCard>
              <h3>Market Momentum</h3>
             <div className="insight-value" style={{ color: marketMomentum.volumeChange > 0 ? '#2ecc71' : '#e74c3c' }}>
               {marketMomentum.volumeChange > 0 ? '+' : ''}{marketMomentum.volumeChange.toFixed(1)}%
             </div>
                           <div className="insight-label">Volume Change</div>
             <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Transaction Count:</span>
                <span style={{ fontWeight: '600' }}>{formatNumber(overall.totalCount || 0)}</span>
              </div>
               
             </div>
           </InsightCard>
         </InsightGrid>
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
        </BlurredContent>
      </DashboardContainer>
    </>
  );
};

export default Dashboard; 