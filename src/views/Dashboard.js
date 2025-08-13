'use client'
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '../components/PageHeader';
import Link from 'next/link'

const DashboardContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
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

// Removed the HeaderActions CTA

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
  
  h2 { display: flex; align-items: center; margin-bottom: 1.5rem; font-size: 1.5rem; }
`;

const IncomingDataSection = styled(DashboardCard)``;

const IncomingDataHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;
  h2 { font-size: 1.75rem; margin-bottom: 0; }
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

const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [topBuys, setTopBuys] = useState([]);
  const [topSells, setTopSells] = useState([]);
  const [blockchainData, setBlockchainData] = useState({ labels: [], data: [] });
  const [minValue, setMinValue] = useState(0);
  const [lastUpdate, setLastUpdate] = useState('now');
  const [loading, setLoading] = useState(true);
  const [algoActive, setAlgoActive] = useState(true);

  useEffect(() => {
    let timer
    const fetchSummary = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/dashboard/summary', { cache: 'no-store' })
        const json = await res.json()
        if (res.ok) {
          const recent = json.recent || []
          setTransactions(recent.map(r => ({
            id: r.transaction_hash || `${r.time}-${r.coin}-${r.usd_value}`,
            time: new Date(r.time).toLocaleTimeString(),
            coin: r.coin || '—',
            action: r.action || 'TRANSFER',
            blockchain: r.blockchain || '—',
            amount: formatNumber(Math.max(1, Math.floor((r.usd_value || 0) / 1000))),
            price: formatNumber(Math.floor(r.usd_value || 0)),
            usdPrice: formatNumber(Math.max(1, Math.floor((r.usd_value || 0) / 10))),
          })))
          setTopBuys(json.topBuys || [])
          setTopSells(json.topSells || [])
          setBlockchainData(json.blockchainVolume || { labels: [], data: [] })
          setLastUpdate('just now')
        }
      } catch {}
      finally { setLoading(false) }
    }
    const pollAlgo = async () => {
      try {
        const res = await fetch('/api/health/algorithm', { cache: 'no-store' })
        const j = await res.json()
        if (res.ok) setAlgoActive(Boolean(j.active))
      } catch {}
    }
    fetchSummary(); pollAlgo()
    timer = setInterval(() => { fetchSummary(); pollAlgo() }, 15000)
    return () => clearInterval(timer)
  }, [])

  const filteredTransactions = transactions.filter(t => {
    const priceNum = Number(String(t.price).replace(/,/g, ''))
    return priceNum >= minValue
  })

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { when: 'beforeChildren', staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  const handleMinValueChange = (e) => {
    const value = e.target.value === '' ? '' : Number(e.target.value)
    setMinValue(value)
  };

  return (
    <DashboardContainer>
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
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <IncomingDataSection>
          <IncomingDataHeader>
            <h2>Incoming Data</h2>
            <span>Updated {lastUpdate}</span>
          </IncomingDataHeader>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
          ) : (
            <TransactionTable>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Token</th>
                  <th>Amount</th>
                  <th>Action</th>
                  <th>Blockchain</th>
                  <th>Price per Coin</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map(transaction => (
                      <motion.tr key={transaction.id} variants={itemVariants} initial="hidden" animate="visible" exit={{ opacity: 0, height: 0 }}>
                        <td className="time">{transaction.time}</td>
                        <td className="token">{transaction.coin ? (<Link href={`/token/${encodeURIComponent(transaction.coin)}`}>{transaction.coin}</Link>) : '—'}</td>
                        <td className="amount">{transaction.amount}</td>
                        <td><span className={`action-${transaction.action.toLowerCase() || 'transfer'}`}>{transaction.action}</span></td>
                        <td>{transaction.blockchain}</td>
                        <td className="price">${transaction.usdPrice}</td>
                        <td className="price">${transaction.price}</td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No transactions match the current minimum value. Try lowering the minimum value.</td></tr>
                  )}
                </AnimatePresence>
              </tbody>
            </TransactionTable>
          )}
        </IncomingDataSection>
      </motion.div>

      <GridContainer>
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <StatsCard>
            <h2>Top % of Buys</h2>
            <table>
              <thead><tr><th>Coin</th><th>%</th></tr></thead>
              <tbody>
                {topBuys.map((item, index) => (
                  <motion.tr key={`buy-${item.coin}-${index}`} variants={itemVariants}>
                    <td>{item.coin}</td>
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
                    <td>{item.coin}</td>
                    <td className="percentage">{item.percentage.toFixed(1)}%</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </StatsCard>
        </motion.div>
      </GridContainer>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <DashboardCard>
          <h2>Transaction Volume by Blockchain</h2>
          <div style={{ minHeight: '220px' }}>
            {blockchainData.labels.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No data</p>
            ) : (
              <BarsContainer>
                {blockchainData.labels.map((label, i) => {
                  const value = Number(blockchainData.data[i] || 0)
                  const max = Math.max(...blockchainData.data.map(Number), 1)
                  const pct = Math.max(0, (value / max) * 100)
                  return (
                    <BarRow key={label}>
                      <div style={{ color: 'var(--text-secondary)' }}>{label}</div>
                      <BarTrack>
                        <BarFill style={{ width: `${pct}%` }} />
                      </BarTrack>
                      <div style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{value}</div>
                    </BarRow>
                  )
                })}
              </BarsContainer>
            )}
          </div>
        </DashboardCard>
      </motion.div>
    </DashboardContainer>
  );
};

export default Dashboard; 