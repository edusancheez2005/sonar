import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '../components/PageHeader';
import logo from '../assets/logo.png';

const DashboardContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
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
    
    &:focus {
      outline: none;
      border-color: var(--primary);
    }
  }
`;

const FilterInfo = styled.div`
  display: flex;
  align-items: center;
  margin-top: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  
  span {
    color: var(--primary);
    font-weight: 500;
    margin: 0 0.25rem;
  }
`;

const DashboardCard = styled.div`
  background-color: var(--background-card);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
  }
  
  h2 {
    display: flex;
    align-items: center;
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
    
    .card-icon {
      width: 30px;
      height: 30px;
      margin-right: 0.75rem;
      opacity: 0.8;
    }
  }
`;

const IncomingDataSection = styled(DashboardCard)``;

const IncomingDataHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  
  h2 {
    font-size: 1.75rem;
    margin-bottom: 0;
  }
  
  span {
    color: var(--text-secondary);
  }
`;

const TransactionTable = styled.table`
  width: 100%;
  
  tr {
    transition: background-color 0.3s ease;
    
    &:hover {
      background-color: rgba(30, 57, 81, 0.5);
    }
  }
  
  td {
    padding: 1rem;
  }
  
  .time {
    color: var(--text-secondary);
  }
  
  .amount {
    font-weight: 500;
  }
  
  .price {
    font-weight: 500;
    text-align: right;
  }
  
  .action-buy {
    color: var(--buy-color);
    background-color: rgba(54, 166, 186, 0.15);
    border-radius: 4px;
    padding: 0.25rem 0.75rem;
    font-weight: 500;
  }
  
  .action-sell {
    color: var(--sell-color);
    background-color: rgba(231, 76, 60, 0.15);
    border-radius: 4px;
    padding: 0.25rem 0.75rem;
    font-weight: 500;
  }
  
  .action-transfer {
    color: #9b59b6;
    background-color: rgba(155, 89, 182, 0.15);
    border-radius: 4px;
    padding: 0.25rem 0.75rem;
    font-weight: 500;
  }
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatsCard = styled(DashboardCard)`
  height: 100%;
  
  table {
    width: 100%;
    
    th, td {
      padding: 0.75rem 0;
    }
    
    th:last-child, td:last-child {
      text-align: right;
    }
    
    .percentage {
      font-weight: 500;
      color: var(--primary);
    }
  }
`;

// Mock data generation functions
const generateTransaction = () => {
  const coins = ['BTC', 'ETH', 'DOGE', 'XRP', 'BNB', 'ADA', 'LTC', 'SOL'];
  const actions = ['BUY', 'SELL', 'TRANSFER'];
  const blockchains = ['Ethereum', 'Binance Smart Chain', 'Polygon', 'Avalanche', 'Solana'];
  const prices = {
    BTC: { min: 99000, max: 101000 },
    ETH: { min: 3000, max: 3200 },
    DOGE: { min: 0.12, max: 0.18 },
    XRP: { min: 0.45, max: 0.55 },
    BNB: { min: 550, max: 580 },
    ADA: { min: 0.45, max: 0.52 },
    LTC: { min: 70, max: 78 },
    SOL: { min: 140, max: 155 },
  };
  
  const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];
  const getRandomPrice = (min, max) => (Math.random() * (max - min) + min).toFixed(2);
  const getRandomAmount = (coin) => {
    if (coin === 'BTC') return (Math.random() * 3).toFixed(2);
    if (coin === 'ETH') return (Math.random() * 10).toFixed(2);
    return (Math.random() * 1000).toFixed(2);
  };
  
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  
  const coin = getRandomElement(coins);
  const action = getRandomElement(actions);
  const blockchain = getRandomElement(blockchains);
  const amount = getRandomAmount(coin);
  const price = getRandomPrice(prices[coin].min, prices[coin].max);
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    time: `${hours}:${minutes}:${seconds}`,
    coin,
    action,
    blockchain,
    amount,
    price: parseFloat(price) * amount,
    usdPrice: parseFloat(price),
  };
};

const generateTopCoins = () => {
  return [
    { coin: 'ETH', percentage: Math.floor(Math.random() * 30) + 40 },
    { coin: 'XRP', percentage: Math.floor(Math.random() * 20) + 30 },
    { coin: 'LTC', percentage: Math.floor(Math.random() * 20) + 25 },
  ].sort((a, b) => b.percentage - a.percentage);
};

const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [topBuys, setTopBuys] = useState(generateTopCoins());
  const [topSells, setTopSells] = useState(generateTopCoins());
  const [minValue, setMinValue] = useState(0);
  const [lastUpdate, setLastUpdate] = useState('now');
  
  // Initial transactions
  useEffect(() => {
    const initialTransactions = Array(4)
      .fill(null)
      .map(() => generateTransaction());
    
    setTransactions(initialTransactions);
  }, []);
  
  // Real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      const newTransaction = generateTransaction();
      
      setTransactions(prev => {
        const updated = [newTransaction, ...prev.slice(0, 3)];
        return updated;
      });
      
      setLastUpdate('1 second ago');
      
      // Occasionally update top buys/sells
      if (Math.random() > 0.7) {
        setTopBuys(generateTopCoins());
        setTopSells(generateTopCoins());
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Filter transactions by minimum value
  const filteredTransactions = transactions.filter(transaction => {
    return transaction.price >= minValue;
  });
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };
  
  const handleMinValueChange = (e) => {
    // Convert to number and back to string to remove leading zeros
    const value = e.target.value === '' ? '' : Number(e.target.value);
    setMinValue(value);
  };
  
  return (
    <DashboardContainer>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <PageHeader title="Real-Time" accentWord="Dashboard">
          <FilterContainer>
            <FilterGroup>
              <label htmlFor="min-value">Minimum Transaction Value ($)</label>
              <input
                id="min-value"
                type="number"
                min="0"
                step="1000"
                value={minValue}
                onChange={handleMinValueChange}
                placeholder="Enter minimum value"
              />
            </FilterGroup>
          </FilterContainer>
        </PageHeader>
      </motion.div>
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <IncomingDataSection>
          <IncomingDataHeader>
            <h2>
              Incoming Data
            </h2>
            <span>Updated {lastUpdate}</span>
          </IncomingDataHeader>
          
          <TransactionTable>
            <thead>
              <tr>
                <th>Time</th>
                <th>Amount</th>
                <th>Action</th>
                <th>Blockchain</th>
                <th>Price per Coin</th>
                <th className="price">Total Value</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredTransactions.map(transaction => (
                  <motion.tr
                    key={transaction.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <td className="time">{transaction.time}</td>
                    <td className="amount">{transaction.amount} {transaction.coin}</td>
                    <td>
                      <span className={`action-${transaction.action.toLowerCase()}`}>
                        {transaction.action}
                      </span>
                    </td>
                    <td>{transaction.blockchain}</td>
                    <td>${transaction.usdPrice.toLocaleString()}</td>
                    <td className="price">${transaction.price.toLocaleString()}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </TransactionTable>
        </IncomingDataSection>
      </motion.div>
      
      <GridContainer>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <StatsCard>
            <h2>
              Top % of Buys
            </h2>
            <table>
              <thead>
                <tr>
                  <th>Coin</th>
                  <th>% of Buys</th>
                </tr>
              </thead>
              <tbody>
                {topBuys.map((item, index) => (
                  <motion.tr
                    key={`buy-${item.coin}-${index}`}
                    variants={itemVariants}
                  >
                    <td>{item.coin}</td>
                    <td className="percentage">{item.percentage.toFixed(1)}%</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </StatsCard>
        </motion.div>
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <StatsCard>
            <h2>
              Top % of Sells
            </h2>
            <table>
              <thead>
                <tr>
                  <th>Coin</th>
                  <th>% of Sells</th>
                </tr>
              </thead>
              <tbody>
                {topSells.map((item, index) => (
                  <motion.tr
                    key={`sell-${item.coin}-${index}`}
                    variants={itemVariants}
                  >
                    <td>{item.coin}</td>
                    <td className="percentage">{item.percentage.toFixed(1)}%</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </StatsCard>
        </motion.div>
      </GridContainer>
    </DashboardContainer>
  );
};

export default Dashboard; 