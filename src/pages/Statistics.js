import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, RadialLinearScale, Filler } from 'chart.js';
import { Pie, Bar, Radar } from 'react-chartjs-2';
import PageHeader from '../components/PageHeader';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  ChartTooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
  Title
);

const StatisticsContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const TimeframeSelector = styled.div`
  display: flex;
  gap: 1rem;
  
  button {
    background-color: ${({ active }) => active ? 'var(--primary)' : 'var(--background-card)'};
    color: ${props => props.active ? '#fff' : 'var(--text-secondary)'};
    border: 1px solid ${props => props.active ? 'var(--primary)' : 'var(--secondary)'};
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &.active {
      background-color: var(--primary);
      color: white;
      border-color: var(--primary);
    }
    
    &:hover:not(.active) {
      border-color: var(--primary);
      color: var(--primary);
    }
  }
`;

const ChartSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 3rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background-color: var(--background-card);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 3rem;
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
    
    .info-icon {
      margin-left: 0.5rem;
      font-size: 1rem;
      color: var(--text-secondary);
      cursor: pointer;
    }
  }
  
  .chart-container {
    position: relative;
    height: 300px;
  }
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin-bottom: 3rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatsCard = styled(ChartCard)`
  h2 {
    margin-bottom: 1.5rem;
  }
  
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

const BlockchainVolumeSection = styled(ChartCard)`
  margin-bottom: 3rem;
`;

const MarketAnalysisSection = styled(ChartCard)`
  margin-top: 1rem;
  
  .radar-container {
    height: 350px;
  }
`;

const CustomTooltip = styled.div`
  position: absolute;
  top: ${props => props.y}px;
  left: ${props => props.x}px;
  background-color: rgba(13, 33, 52, 0.9);
  color: white;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.9rem;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  max-width: 250px;
  pointer-events: none;
  
  p {
    margin: 0;
    line-height: 1.4;
  }
`;

// Add a new styled component for the price threshold filter
const PriceThresholdFilter = styled.div`
  background-color: var(--background-card);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 3rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  h2 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    
    .filter-icon {
      height: 24px;
      width: auto;
      margin-right: 0.75rem;
      opacity: 0.8;
    }
  }
  
  .slider-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .slider-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .price-display {
      font-weight: 500;
      color: var(--primary);
      font-size: 1.2rem;
    }
  }
  
  input[type="range"] {
    width: 100%;
    height: 6px;
    -webkit-appearance: none;
    background: linear-gradient(to right, var(--primary) 0%, var(--secondary) 100%);
    border-radius: 5px;
    outline: none;
    
    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      background: var(--primary);
      border-radius: 50%;
      cursor: pointer;
    }
  }
`;

const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Update the transaction data
const generateTransactions = () => {
  const transactions = [];
  const coins = ['BTC', 'ETH', 'USDT', 'BNB', 'XRP', 'ADA', 'SOL', 'DOT'];
  const types = ['Buy', 'Sell', 'Transfer'];
  const blockchains = ['Bitcoin Network', 'Ethereum', 'Binance Smart Chain', 'Solana', 'Polygon'];
  
  for (let i = 0; i < 50; i++) {
    // Ensure most amounts are above 50k with much higher upper limits
    const amount = Math.random() < 0.9 
      ? Math.floor(Math.random() * 9950000) + 50000 // 90% chance: 50k to 10M
      : Math.floor(Math.random() * 40000) + 10000;  // 10% chance: 10k to 50k
    
    // Generate transaction type with 25% being transfers
    const typeIndex = Math.random() < 0.75 
      ? (Math.random() > 0.5 ? 0 : 1) // 75% chance to be buy or sell
      : 2; // 25% chance to be transfer
    
    const type = types[typeIndex];
    const coin = coins[Math.floor(Math.random() * coins.length)];
    const blockchain = blockchains[Math.floor(Math.random() * blockchains.length)];
    
    // Generate price between 10k and 100M
    const priceRangeCategories = [
      { min: 10000, max: 100000, weight: 50 },      // 10k-100k (common)
      { min: 100000, max: 1000000, weight: 30 },    // 100k-1M (less common)
      { min: 1000000, max: 10000000, weight: 15 },  // 1M-10M (rare)
      { min: 10000000, max: 100000000, weight: 5 }  // 10M-100M (very rare)
    ];
    
    // Weighted random selection of price range
    const totalWeight = priceRangeCategories.reduce((sum, category) => sum + category.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedRange;
    
    for (const range of priceRangeCategories) {
      random -= range.weight;
      if (random <= 0) {
        selectedRange = range;
        break;
      }
    }
    
    const price = Math.floor(Math.random() * (selectedRange.max - selectedRange.min)) + selectedRange.min;
    
    transactions.push({
      id: i + 1,
      coin,
      amount: formatNumber(amount),
      price: formatNumber(price),
      time: new Date(Date.now() - Math.random() * 86400000).toLocaleTimeString(),
      type,
      blockchain
    });
  }
  
  return transactions;
};

// Mock data
const generateTopTenCoins = (type) => {
  const buyCoins = [
    { coin: 'BTC', percentage: 82.5 },
    { coin: 'ETH', percentage: 74.3 },
    { coin: 'XRP', percentage: 68.1 },
    { coin: 'ADA', percentage: 57.5 },
    { coin: 'BNB', percentage: 49.8 },
    { coin: 'DOGE', percentage: 45.7 },
    { coin: 'AAVE', percentage: 38.2 },
    { coin: 'UNI', percentage: 34.9 },
    { coin: 'DOT', percentage: 30.4 },
    { coin: 'MATIC', percentage: 27.8 },
  ];
  
  const sellCoins = [
    { coin: 'SOL', percentage: 73.6 },
    { coin: 'LTC', percentage: 69.4 },
    { coin: 'LINK', percentage: 58.3 },
    { coin: 'ATOM', percentage: 54.7 },
    { coin: 'AVAX', percentage: 48.1 },
    { coin: 'TRX', percentage: 44.3 },
    { coin: 'XLM', percentage: 41.5 },
    { coin: 'FIL', percentage: 38.2 },
    { coin: 'VET', percentage: 31.7 },
    { coin: 'ALGO', percentage: 29.8 },
  ];
  
  return type === 'buy' ? buyCoins : sellCoins;
};

const generateVolumeData = () => {
  return {
    labels: ['BTC', 'ETH', 'USDT', 'BNB', 'DOGE', 'ADA', 'MATIC', 'MTIC'],
    data: [83, 67, 56, 45, 38, 30, 26, 22],
  };
};

const generateBlockchainVolumeData = () => {
  return {
    labels: ['Ethereum', 'Binance Smart Chain', 'Polygon', 'Avalanche'],
    data: [45, 30, 15, 10],
  };
};

// New mock data generators
const generatePriceHistoryData = (coin, timeframe) => {
  // Generate price history for different timeframes
  const dataPoints = timeframe === '24h' ? 24 : timeframe === '7d' ? 28 : timeframe === '30d' ? 30 : 12;
  
  // Price ranges for different coins
  const priceRanges = {
    BTC: { base: 100000, variance: 5000 },
    ETH: { base: 3000, variance: 200 },
    ADA: { base: 0.5, variance: 0.05 },
    SOL: { base: 150, variance: 15 },
    DOGE: { base: 0.15, variance: 0.03 },
  };
  
  const range = priceRanges[coin] || { base: 100, variance: 10 };
  const labels = [];
  const data = [];
  
  if (timeframe === '24h') {
    for (let i = 0; i < dataPoints; i++) {
      labels.push(`${i}:00`);
      const randomVariance = (Math.random() * 2 - 1) * range.variance;
      data.push(range.base + randomVariance);
    }
  } else if (timeframe === '7d') {
    for (let i = 0; i < dataPoints; i++) {
      const day = new Date();
      day.setDate(day.getDate() - 6 + Math.floor(i / 4));
      labels.push(`${day.getDate()}/${day.getMonth() + 1} ${(i % 4) * 6}:00`);
      const randomVariance = (Math.random() * 2 - 1) * range.variance * 1.5;
      data.push(range.base + randomVariance);
    }
  } else if (timeframe === '30d') {
    for (let i = 0; i < dataPoints; i++) {
      const day = new Date();
      day.setDate(day.getDate() - 29 + i);
      labels.push(`${day.getDate()}/${day.getMonth() + 1}`);
      const randomVariance = (Math.random() * 2 - 1) * range.variance * 2;
      data.push(range.base + randomVariance);
    }
  } else {
    for (let i = 0; i < dataPoints; i++) {
      const month = new Date();
      month.setMonth(month.getMonth() - 11 + i);
      labels.push(`${month.toLocaleString('default', { month: 'short' })}`);
      const randomVariance = (Math.random() * 2 - 1) * range.variance * 3;
      data.push(range.base + randomVariance);
    }
  }
  
  return { labels, data };
};

const generateMarketAnalysisData = () => {
  return {
    labels: ['Trading Volume', 'Market Cap', 'Volatility', 'Sentiment', 'Development Activity', 'Social Engagement'],
    datasets: [
      {
        label: 'Bitcoin',
        data: [8, 9, 6, 7, 8, 9],
        fill: true,
        backgroundColor: 'rgba(54, 166, 186, 0.2)',
        borderColor: 'rgba(54, 166, 186, 1)',
        pointBackgroundColor: 'rgba(54, 166, 186, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(54, 166, 186, 1)'
      },
      {
        label: 'Ethereum',
        data: [7, 6, 5, 8, 9, 7],
        fill: true,
        backgroundColor: 'rgba(46, 204, 113, 0.2)',
        borderColor: 'rgba(46, 204, 113, 1)',
        pointBackgroundColor: 'rgba(46, 204, 113, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(46, 204, 113, 1)'
      },
      {
        label: 'Solana',
        data: [5, 5, 8, 6, 7, 8],
        fill: true,
        backgroundColor: 'rgba(155, 89, 182, 0.2)',
        borderColor: 'rgba(155, 89, 182, 1)',
        pointBackgroundColor: 'rgba(155, 89, 182, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(155, 89, 182, 1)'
      }
    ]
  };
};

const Statistics = () => {
  const [topBuys, setTopBuys] = useState([]);
  const [topSells, setTopSells] = useState([]);
  const [volumeData, setVolumeData] = useState({ labels: [], data: [] });
  const [blockchainData, setBlockchainData] = useState({ labels: [], data: [] });
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [priceHistory, setPriceHistory] = useState({ labels: [], data: [] });
  const [marketAnalysisData, setMarketAnalysisData] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '' });
  const [minPriceThreshold, setMinPriceThreshold] = useState(1000); // Default minimum price threshold
  const [transactions, setTransactions] = useState([]); // To store filtered transactions
  
  // Load initial data
  useEffect(() => {
    setTopBuys(generateTopTenCoins('buy'));
    setTopSells(generateTopTenCoins('sell'));
    setVolumeData(generateVolumeData());
    setBlockchainData(generateBlockchainVolumeData());
    setPriceHistory(generatePriceHistoryData('BTC', '7d'));
    setMarketAnalysisData(generateMarketAnalysisData());
    setTransactions(generateTransactions());
  }, []);
  
  // Update price history when timeframe or coin changes
  useEffect(() => {
    setPriceHistory(generatePriceHistoryData('BTC', selectedTimeframe));
  }, [selectedTimeframe]);
  
  // Chart data configurations
  const distributionData = {
    labels: ['Ethereum', 'Binance Smart Chain', 'Polygon', 'Avalanche'],
    datasets: [
      {
        data: [40, 30, 20, 10],
        backgroundColor: [
          'rgba(54, 166, 186, 0.8)',
          'rgba(46, 204, 113, 0.8)',
          'rgba(52, 152, 219, 0.8)',
          'rgba(155, 89, 182, 0.8)',
        ],
        borderColor: [
          'rgba(54, 166, 186, 1)',
          'rgba(46, 204, 113, 1)',
          'rgba(52, 152, 219, 1)',
          'rgba(155, 89, 182, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const volumeChartData = {
    labels: volumeData.labels,
    datasets: [
      {
        label: 'Transaction Volume',
        data: volumeData.data,
        backgroundColor: 'rgba(54, 166, 186, 0.6)',
        borderColor: 'rgba(54, 166, 186, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  const blockchainVolumeData = {
    labels: blockchainData.labels,
    datasets: [
      {
        label: 'Volume by Blockchain',
        data: blockchainData.data,
        backgroundColor: 'rgba(46, 204, 113, 0.6)',
        borderColor: 'rgba(46, 204, 113, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  // New price history chart data
  const priceHistoryChartData = {
    labels: priceHistory.labels,
    datasets: [
      {
        label: 'BTC Price (USD)',
        data: priceHistory.data,
        fill: true,
        backgroundColor: 'rgba(54, 166, 186, 0.1)',
        borderColor: 'rgba(54, 166, 186, 1)',
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };
  
  // Chart options
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: 'rgba(160, 178, 198, 1)',
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(13, 33, 52, 0.9)',
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 1)',
        borderColor: 'rgba(30, 57, 81, 1)',
        borderWidth: 1,
      },
    },
  };
  
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(13, 33, 52, 0.9)',
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 1)',
        borderColor: 'rgba(30, 57, 81, 1)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(30, 57, 81, 0.3)',
        },
        ticks: {
          color: 'rgba(160, 178, 198, 1)',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(160, 178, 198, 1)',
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };
  
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(13, 33, 52, 0.9)',
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 1)',
        borderColor: 'rgba(30, 57, 81, 1)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(30, 57, 81, 0.3)',
        },
        ticks: {
          color: 'rgba(160, 178, 198, 1)',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(160, 178, 198, 1)',
        },
      },
    },
  };
  
  const radarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: {
          color: 'rgba(30, 57, 81, 0.3)',
        },
        grid: {
          color: 'rgba(30, 57, 81, 0.3)',
        },
        pointLabels: {
          color: 'rgba(160, 178, 198, 1)',
        },
        ticks: {
          backdropColor: 'transparent',
          color: 'rgba(160, 178, 198, 1)',
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: 'rgba(160, 178, 198, 1)',
        },
      },
    },
  };
  
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
  
  const showInfoTooltip = (content, e) => {
    setTooltip({
      show: true,
      x: e.clientX,
      y: e.clientY - 100,
      content
    });
  };
  
  const hideTooltip = () => {
    setTooltip({ ...tooltip, show: false });
  };
  
  // Handle price threshold change
  const handlePriceThresholdChange = (e) => {
    setMinPriceThreshold(Number(e.target.value));
  };
  
  return (
    <StatisticsContainer>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <PageHeader title="Market" accentWord="Statistics">
          <TimeframeSelector>
            <button 
              className={selectedTimeframe === '24h' ? 'active' : ''} 
              onClick={() => setSelectedTimeframe('24h')}
            >
              24h
            </button>
            <button 
              className={selectedTimeframe === '7d' ? 'active' : ''} 
              onClick={() => setSelectedTimeframe('7d')}
            >
              7d
            </button>
            <button 
              className={selectedTimeframe === '30d' ? 'active' : ''} 
              onClick={() => setSelectedTimeframe('30d')}
            >
              30d
            </button>
            <button 
              className={selectedTimeframe === '1y' ? 'active' : ''} 
              onClick={() => setSelectedTimeframe('1y')}
            >
              1y
            </button>
          </TimeframeSelector>
        </PageHeader>
      </motion.div>
      
      {/* Price Threshold Filter */}
      <PriceThresholdFilter>
        <h2>Transaction Price Filter</h2>
        <p>Set a minimum price threshold to view transactions with values equal to or higher than your selection.</p>
        
        <div className="slider-container">
          <div className="slider-info">
            <span>Minimum Price:</span>
            <span className="price-display">${minPriceThreshold.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100000000"
            step="100000"
            value={minPriceThreshold}
            onChange={handlePriceThresholdChange}
          />
          <div className="slider-info">
            <span>$0</span>
            <span>$100M</span>
          </div>
        </div>
      </PriceThresholdFilter>
      
      {/* Transaction Table */}
      <ChartCard>
        <h2>Filtered Transactions (${minPriceThreshold}+ minimum)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px' }}>Time</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Coin</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Type</th>
              <th style={{ textAlign: 'right', padding: '10px' }}>Amount</th>
              <th style={{ textAlign: 'right', padding: '10px' }}>Price</th>
              <th style={{ textAlign: 'right', padding: '10px' }}>Network</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length > 0 ? (
              transactions.filter(tx => {
                // Parse the price string back to a number for comparison
                const priceNum = Number(tx.price.replace(/,/g, ''));
                return priceNum >= minPriceThreshold;
              }).map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid var(--secondary)' }}>
                  <td style={{ padding: '10px' }}>{tx.time}</td>
                  <td style={{ padding: '10px' }}>{tx.coin}</td>
                  <td style={{ padding: '10px', color: tx.type === 'Buy' ? '#2ecc71' : tx.type === 'Sell' ? '#e74c3c' : 'var(--primary)' }}>{tx.type}</td>
                  <td style={{ textAlign: 'right', padding: '10px' }}>{tx.amount}</td>
                  <td style={{ textAlign: 'right', padding: '10px' }}>${tx.price}</td>
                  <td style={{ textAlign: 'right', padding: '10px' }}>{tx.blockchain}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                  No transactions match the current price threshold. Try lowering the minimum price.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ChartCard>
      
      {/* Top Buys and Sells Grid - Moved up */}
      <GridContainer>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <StatsCard>
            <h2>Top Buys</h2>
            <table>
              <thead>
                <tr>
                  <th>Coin</th>
                  <th>%</th>
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
            <h2>Top Sells</h2>
            <table>
              <thead>
                <tr>
                  <th>Coin</th>
                  <th>%</th>
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
      
      <ChartSection>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <ChartCard>
            <h2>
              Blockchain Distribution
              <span 
                className="info-icon" 
                onMouseEnter={(e) => showInfoTooltip('Transaction distribution across blockchain networks', e)}
                onMouseLeave={hideTooltip}
              >
                ⓘ
              </span>
            </h2>
            <div className="chart-container">
              <Pie data={distributionData} options={pieChartOptions} />
            </div>
          </ChartCard>
        </motion.div>
        
        <ChartCard>
          <h2>
            Transaction Volume by Coin
            <span 
              className="info-icon" 
              onMouseEnter={(e) => showInfoTooltip('Transaction volume for each cryptocurrency', e)}
              onMouseLeave={hideTooltip}
            >
              ⓘ
            </span>
          </h2>
          <div className="chart-container">
            <Bar data={volumeChartData} options={barChartOptions} />
          </div>
        </ChartCard>
      </ChartSection>
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <BlockchainVolumeSection>
          <h2>Transaction Volume by Blockchain</h2>
          <div style={{ height: '300px' }}>
            <Bar data={blockchainVolumeData} options={barChartOptions} />
          </div>
        </BlockchainVolumeSection>
      </motion.div>
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.4 }}
      >
        <MarketAnalysisSection>
          <h2>Market Analysis Comparison</h2>
          <div className="radar-container">
            {marketAnalysisData && (
              <Radar data={marketAnalysisData} options={radarChartOptions} />
            )}
          </div>
        </MarketAnalysisSection>
      </motion.div>
      
      {/* Custom tooltip */}
      {tooltip.show && (
        <CustomTooltip x={tooltip.x} y={tooltip.y}>
          <p>{tooltip.content}</p>
        </CustomTooltip>
      )}
    </StatisticsContainer>
  );
};

export default Statistics; 