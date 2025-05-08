import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '../components/PageHeader';
import WhaleBackground from '../components/Background';
import Footer from '../components/Footer';
import logo from '../assets/logo.png';

const NewsContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
`;

const SearchFilterBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchInput = styled.div`
  position: relative;
  max-width: 300px;
  width: 100%;
  
  input {
    width: 100%;
    background-color: var(--background-card);
    border: 1px solid var(--secondary);
    color: var(--text-primary);
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    border-radius: 4px;
    transition: all 0.3s ease;
    
    &:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(54, 166, 186, 0.2);
    }
  }
  
  svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: var(--text-secondary);
  }
`;

const FiltersWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    justify-content: space-between;
  }
`;

const FilterButton = styled.button`
  background-color: ${({ active }) => active ? 'var(--primary)' : 'var(--background-card)'};
  color: ${({ active }) => active ? '#fff' : 'var(--text-secondary)'};
  border: 1px solid ${({ active }) => active ? 'var(--primary)' : 'var(--secondary)'};
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: var(--primary);
    color: ${({ active }) => active ? '#fff' : 'var(--primary)'};
  }
`;

const CategoriesDropdown = styled.select`
  background-color: var(--background-card);
  border: 1px solid var(--secondary);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const NewsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.75rem;
  margin: 2rem 0 1.5rem;
  color: var(--text-primary);
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  
  &:after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, var(--secondary) 0%, transparent 100%);
    margin-left: 1rem;
  }
  
  .highlight {
    color: var(--primary);
    margin-left: 0.5rem;
  }
  
  .count {
    font-size: 1rem;
    color: var(--text-secondary);
    margin-left: 0.75rem;
    font-weight: normal;
  }
`;

const NewsCard = styled(motion.div)`
  background-color: var(--background-card);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
  }
`;

const CoinLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-bottom: 1px solid var(--secondary);
  
  .coin-symbol {
    background-color: var(--secondary);
    color: var(--primary);
    padding: 0.5rem;
    border-radius: 4px;
    font-weight: 500;
    letter-spacing: 1px;
    width: 60px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  h3 {
    margin: 0;
    font-size: 1.1rem;
  }
  
  .date {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-left: auto;
    display: flex;
    align-items: center;
    
    .dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: ${({ isNew }) => isNew ? 'var(--primary)' : 'transparent'};
      margin-right: 0.5rem;
    }
  }
`;

const NewsContent = styled.div`
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  
  h3 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
    color: var(--text-primary);
  }
  
  p {
    color: var(--text-secondary);
    margin-bottom: 1rem;
    line-height: 1.6;
    flex: 1;
  }
`;

const NewsFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  
  a {
    display: inline-flex;
    align-items: center;
    color: var(--primary);
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
    
    svg {
      margin-left: 0.5rem;
      width: 16px;
      height: 16px;
    }
  }
  
  .actions {
    display: flex;
    gap: 0.75rem;
    
    button {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      transition: color 0.2s ease;
      
      &:hover {
        color: var(--primary);
      }
      
      &.active {
        color: var(--primary);
      }
      
      svg {
        width: 16px;
        height: 16px;
      }
    }
  }
`;

const TrendingSection = styled.div`
  background-color: var(--background-card);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  
  h2 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    color: var(--primary);
  }
  
  .trending-items {
    display: flex;
    gap: 1rem;
    overflow-x: auto;
    padding-bottom: 1rem;
    
    &::-webkit-scrollbar {
      height: 4px;
    }
    
    &::-webkit-scrollbar-track {
      background: var(--secondary);
      border-radius: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: var(--primary);
      border-radius: 4px;
    }
  }
`;

const TrendingItem = styled(motion.div)`
  background: linear-gradient(135deg, var(--secondary), var(--background-card));
  border-radius: 8px;
  padding: 1rem;
  min-width: 200px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  .trending-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    
    .coin-symbol {
      font-weight: bold;
      color: var(--primary);
    }
    
    .trending-change {
      margin-left: auto;
      font-weight: bold;
      
      &.up {
        color: #2ecc71;
      }
      
      &.down {
        color: #e74c3c;
      }
    }
  }
  
  .trending-title {
    font-size: 0.9rem;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .trending-time {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  gap: 0.5rem;
`;

const PageButton = styled(motion.button)`
  background-color: ${({ active }) => active ? 'var(--primary)' : 'var(--background-card)'};
  color: ${({ active }) => active ? '#fff' : 'var(--text-secondary)'};
  border: 1px solid ${({ active }) => active ? 'var(--primary)' : 'var(--secondary)'};
  width: 40px;
  height: 40px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    border-color: var(--primary);
    color: ${({ active }) => active ? '#fff' : 'var(--primary)'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const LoadingContainer = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`;

const LoadingDot = styled(motion.div)`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--primary);
  margin: 0 6px;
`;

// Icon components
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

const BookmarkIcon = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const PrevIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const NextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// Loading animation component
const LoadingAnimation = () => (
  <LoadingContainer>
    {[0, 1, 2].map((index) => (
      <LoadingDot
        key={index}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          repeatType: "loop",
          delay: index * 0.2,
        }}
      />
    ))}
  </LoadingContainer>
);

// Expanded mock news data with categories and trending status
const generateNewsData = () => {
  const buyNews = [
    {
      id: 'dog-1',
      coin: 'DOG',
      coinFull: 'Dogecoin',
      date: 'April 5, 2024',
      timestamp: '2h ago',
      source: 'Dogeo',
      category: 'markets',
      isNew: true,
      trending: true,
      change: '+20.3%',
      title: 'Dogecoin Rallies 20% on Speculation of Tesla Integration',
      content: 'Dogecoin rallies Wednesday on speculation of Tesla integration. Market analysts suggest this could be tied to recent comments from Elon Musk hinting at potential further adoption of the cryptocurrency.',
    },
    {
      id: 'sol-1',
      coin: 'SOL',
      coinFull: 'Solana',
      date: 'April 4, 2024',
      timestamp: '23h ago',
      source: 'Solana',
      category: 'technology',
      isNew: true,
      trending: true,
      change: '+15.7%',
      title: 'Solana Surges as Network Activity Reaches All-Time High',
      content: 'Solana surges as network activity reaches all-time high. The blockchain has seen unprecedented adoption, with transaction counts exceeding previous records by 35% as multiple new dApps launch on the platform.',
    },
    {
      id: 'ada-1',
      coin: 'ADA',
      coinFull: 'Cardano',
      date: 'April 3, 2024',
      timestamp: '2d ago',
      source: 'ADA',
      category: 'development',
      isNew: false,
      trending: false,
      change: '+12.1%',
      title: 'Cardano Prices Climb 15% Amid Vasil Upgrade Optimism',
      content: 'Cardano prices climb 15% amid optimism around the upcoming Vasil upgrade. Developers suggest this will be the most significant enhancement to the network since the Alonzo hard fork, bringing substantial performance improvements.',
    },
    {
      id: 'eth-1',
      coin: 'ETH',
      coinFull: 'Ethereum',
      date: 'April 3, 2024',
      timestamp: '2d ago',
      source: 'EthHub',
      category: 'markets',
      isNew: false,
      trending: true,
      change: '+8.2%',
      title: 'Ethereum Shows Strength Following Successful Testnet Merge',
      content: 'Ethereum is showing significant market strength after developers successfully completed the final testnet merge before the mainnet transitions to Proof of Stake. Analysts expect continued price action as the main event approaches.',
    },
    {
      id: 'btc-1',
      coin: 'BTC',
      coinFull: 'Bitcoin',
      date: 'April 2, 2024',
      timestamp: '3d ago',
      source: 'BitNews',
      category: 'adoption',
      isNew: false,
      trending: true,
      change: '+3.5%',
      title: 'Major Retail Chain Announces Bitcoin Payment Integration',
      content: 'A Fortune 500 retail giant has announced plans to accept Bitcoin as payment across all its North American stores by the end of 2024. The move represents one of the largest mainstream adoptions of cryptocurrency payment infrastructure to date.',
    },
    {
      id: 'matic-1',
      coin: 'MATIC',
      coinFull: 'Polygon',
      date: 'April 1, 2024',
      timestamp: '4d ago',
      source: 'Polygon',
      category: 'partnerships',
      isNew: false,
      trending: false,
      change: '+11.3%',
      title: 'Polygon Partners With Major Social Media Platform for NFT Integration',
      content: 'Polygon has announced a strategic partnership with one of the world\'s largest social media companies to power their upcoming NFT marketplace. The scalability of the Polygon network was cited as the primary reason for selection.',
    },
  ];
  
  const sellNews = [
    {
      id: 'shib-1',
      coin: 'SHIB',
      coinFull: 'Shiba Inu',
      date: 'April 5, 2024',
      timestamp: '4h ago',
      source: 'Crypto Daily',
      category: 'markets',
      isNew: true,
      trending: true,
      change: '-18.2%',
      title: 'Shiba Inu Drops as Whale Investors Trim Their Holdings',
      content: 'Shiba Inu rupens as whale investors trim their holdings. On-chain analysis shows several wallets containing over 1 trillion SHIB tokens have reduced their positions by approximately 30%, triggering a market-wide selloff.',
    },
    {
      id: 'avax-1',
      coin: 'AVAX',
      coinFull: 'Avalanche',
      date: 'April 4, 2024',
      timestamp: '1d ago',
      source: 'Crypto News',
      category: 'technology',
      isNew: true,
      trending: true,
      change: '-12.5%',
      title: 'Avalanche Declines Following Mainnet Outage',
      content: 'Avalanche declines following a six-hour mainnet outage. The team has identified and resolved the issue, but investor confidence appears shaken in the short term as questions about network reliability surface.',
    },
    {
      id: 'xrp-1',
      coin: 'XRP',
      coinFull: 'Ripple',
      date: 'April 2, 2024',
      timestamp: '3d ago',
      source: 'Crypto Insight',
      category: 'regulation',
      isNew: false,
      trending: false,
      change: '-8.7%',
      title: 'Ripple Faces Sell-Off as SEC Lawsuit Concerns Grow',
      content: 'Ripple faces a significant sell-off as concerns grow regarding their ongoing lawsuit with the SEC. Legal analysts suggest upcoming court decisions could be unfavorable for the company, potentially impacting its long-term operations.',
    },
    {
      id: 'link-1',
      coin: 'LINK',
      coinFull: 'Chainlink',
      date: 'April 2, 2024',
      timestamp: '3d ago',
      source: 'Chain Report',
      category: 'markets',
      isNew: false,
      trending: false,
      change: '-6.3%',
      title: 'Chainlink Corrects After Recent Rally, Whale Movements Detected',
      content: 'Chainlink is undergoing a correction after its impressive rally last month. Blockchain analysts have detected significant movement from several whale wallets, potentially indicating profit-taking following the recent price surge.',
    },
    {
      id: 'luna-1',
      coin: 'LUNA',
      coinFull: 'Terra Luna',
      date: 'April 1, 2024',
      timestamp: '4d ago',
      source: 'Terra News',
      category: 'development',
      isNew: false,
      trending: true,
      change: '-15.9%',
      title: 'Terra Luna Drops as Developers Announce Protocol Change Delays',
      content: 'Terra Luna has experienced a significant price drop after the development team announced delays to their highly anticipated protocol upgrade. The timeline has been pushed back by at least two months, causing investor disappointment.',
    },
    {
      id: 'atom-1',
      coin: 'ATOM',
      coinFull: 'Cosmos',
      date: 'March 31, 2024',
      timestamp: '5d ago',
      source: 'Cosmos Hub',
      category: 'security',
      isNew: false,
      trending: false,
      change: '-7.2%',
      title: 'Cosmos Falls as Vulnerability is Discovered and Patched',
      content: 'Cosmos has fallen in value after security researchers discovered and disclosed a potential vulnerability in the network. While the issue was promptly patched before any exploitation, market confidence has temporarily weakened.',
    },
  ];
  
  return { buyNews, sellNews };
};

const News = () => {
  const [buyNews, setBuyNews] = useState([]);
  const [sellNews, setSellNews] = useState([]);
  const [trendingNews, setTrendingNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [bookmarkedNews, setBookmarkedNews] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      // Simulate API call with delay
      setLoading(true);
      
      setTimeout(() => {
        const { buyNews, sellNews } = generateNewsData();
        setBuyNews(buyNews);
        setSellNews(sellNews);
        setTrendingNews([...buyNews, ...sellNews].filter(news => news.trending));
        setLoading(false);
      }, 1500);
    };
    
    fetchData();
  }, []);
  
  // Filtered news for specific coin search
  const getFilteredNewsByCoin = (coinFilter) => {
    if (!coinFilter) return [];
    
    const term = coinFilter.toLowerCase();
    return [...buyNews, ...sellNews].filter(news => 
      news.coin.toLowerCase().includes(term) || 
      news.coinFull.toLowerCase().includes(term)
    );
  };
  
  // Get news for top buying coins
  const getTopBuyingCoinsNews = () => {
    return buyNews;
  };
  
  // Get news for top selling coins
  const getTopSellingCoinsNews = () => {
    return sellNews;
  };
  
  // Filtered news based on search term (if provided)
  const filteredNewsBySearch = searchTerm ? getFilteredNewsByCoin(searchTerm) : [];
  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };
  
  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setCurrentPage(1);
  };
  
  const toggleBookmark = (id) => {
    setBookmarkedNews(prev => 
      prev.includes(id)
        ? prev.filter(newsId => newsId !== id)
        : [...prev, id]
    );
  };
  
  const changePage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    },
    exit: { opacity: 0 }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  return (
    <>
      <PageHeader title="News" subtitle="Stay updated with the latest cryptocurrency news" />
      
      <NewsContainer>
        <SearchFilterBar>
          <SearchInput>
            <SearchIcon />
            <input
              type="text"
              placeholder="Search by coin name or symbol..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </SearchInput>
          
          <FiltersWrapper>
            <FilterButton
              active={filter === 'all'}
              onClick={() => handleFilterChange('all')}
            >
              All
            </FilterButton>
            <FilterButton
              active={filter === 'buy'}
              onClick={() => handleFilterChange('buy')}
            >
              Top Buys
            </FilterButton>
            <FilterButton
              active={filter === 'sell'}
              onClick={() => handleFilterChange('sell')}
            >
              Top Sells
            </FilterButton>
            <FilterButton
              active={filter === 'bookmarked'}
              onClick={() => handleFilterChange('bookmarked')}
            >
              Bookmarked
            </FilterButton>
          </FiltersWrapper>
        </SearchFilterBar>
        
        {loading ? (
          <LoadingAnimation />
        ) : (
          <>
            <TrendingSection>
              <h2>
                Trending Price Changes
              </h2>
              <div className="trending-items">
                {trendingNews.map((news) => (
                  <TrendingItem
                    key={`trending-${news.id}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="trending-header">
                      <span className="coin-symbol">{news.coin}</span>
                      <span className={`trending-change ${news.change.startsWith('+') ? 'up' : 'down'}`}>
                        {news.change}
                      </span>
                    </div>
                    <div className="trending-title">{news.title}</div>
                    <div className="trending-time">{news.timestamp}</div>
                  </TrendingItem>
                ))}
              </div>
            </TrendingSection>
            
            {searchTerm ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`search-${searchTerm}`}
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <SectionTitle>
                    Search Results for "{searchTerm}"
                    <span className="count">({filteredNewsBySearch.length} articles)</span>
                  </SectionTitle>
                  
                  {filteredNewsBySearch.length > 0 ? (
                    <NewsSection>
                      {filteredNewsBySearch.map((news) => (
                        <NewsCard
                          key={news.id}
                          variants={itemVariants}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <CoinLabel isNew={news.isNew}>
                            <div className="coin-symbol">{news.coin}</div>
                            <h3>{news.coinFull}</h3>
                            <div className="date">
                              <span className="dot" />
                              {news.timestamp} · {news.source}
                            </div>
                          </CoinLabel>
                          <NewsContent>
                            <h3>{news.title}</h3>
                            <p>{news.content}</p>
                            <NewsFooter>
                              <a href="#read-more">
                                Read more <ArrowRightIcon />
                              </a>
                              <div className="actions">
                                <button 
                                  className={bookmarkedNews.includes(news.id) ? 'active' : ''}
                                  onClick={() => toggleBookmark(news.id)}
                                >
                                  <BookmarkIcon active={bookmarkedNews.includes(news.id)} />
                                </button>
                                <button>
                                  <ShareIcon />
                                </button>
                              </div>
                            </NewsFooter>
                          </NewsContent>
                        </NewsCard>
                      ))}
                    </NewsSection>
                  ) : (
                    <div style={{ textAlign: 'center', margin: '3rem 0' }}>
                      <p>No results found for "{searchTerm}"</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            ) : (
              <>
                {/* Top Buying Coins News Section */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key="top-buying"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <SectionTitle>
                      Top Buying Coins News
                      <span className="count">({getTopBuyingCoinsNews().length} articles)</span>
                    </SectionTitle>
                    
                    <NewsSection>
                      {(filter === 'all' || filter === 'buy') && getTopBuyingCoinsNews().map((news) => (
                        <NewsCard
                          key={news.id}
                          variants={itemVariants}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <CoinLabel isNew={news.isNew}>
                            <div className="coin-symbol">{news.coin}</div>
                            <h3>{news.coinFull}</h3>
                            <div className="date">
                              <span className="dot" />
                              {news.timestamp} · {news.source}
                            </div>
                          </CoinLabel>
                          <NewsContent>
                            <h3>{news.title}</h3>
                            <p>{news.content}</p>
                            <NewsFooter>
                              <a href="#read-more">
                                Read more <ArrowRightIcon />
                              </a>
                              <div className="actions">
                                <button 
                                  className={bookmarkedNews.includes(news.id) ? 'active' : ''}
                                  onClick={() => toggleBookmark(news.id)}
                                >
                                  <BookmarkIcon active={bookmarkedNews.includes(news.id)} />
                                </button>
                                <button>
                                  <ShareIcon />
                                </button>
                              </div>
                            </NewsFooter>
                          </NewsContent>
                        </NewsCard>
                      ))}
                    </NewsSection>
                  </motion.div>
                </AnimatePresence>
                
                {/* Top Selling Coins News Section */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key="top-selling"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <SectionTitle>
                      Top Selling Coins News
                      <span className="count">({getTopSellingCoinsNews().length} articles)</span>
                    </SectionTitle>
                    
                    <NewsSection>
                      {(filter === 'all' || filter === 'sell') && getTopSellingCoinsNews().map((news) => (
                        <NewsCard
                          key={news.id}
                          variants={itemVariants}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <CoinLabel isNew={news.isNew}>
                            <div className="coin-symbol">{news.coin}</div>
                            <h3>{news.coinFull}</h3>
                            <div className="date">
                              <span className="dot" />
                              {news.timestamp} · {news.source}
                            </div>
                          </CoinLabel>
                          <NewsContent>
                            <h3>{news.title}</h3>
                            <p>{news.content}</p>
                            <NewsFooter>
                              <a href="#read-more">
                                Read more <ArrowRightIcon />
                              </a>
                              <div className="actions">
                                <button 
                                  className={bookmarkedNews.includes(news.id) ? 'active' : ''}
                                  onClick={() => toggleBookmark(news.id)}
                                >
                                  <BookmarkIcon active={bookmarkedNews.includes(news.id)} />
                                </button>
                                <button>
                                  <ShareIcon />
                                </button>
                              </div>
                            </NewsFooter>
                          </NewsContent>
                        </NewsCard>
                      ))}
                    </NewsSection>
                  </motion.div>
                </AnimatePresence>
                
                {/* Bookmarked News Section */}
                {filter === 'bookmarked' && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="bookmarked"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <SectionTitle>
                        Bookmarked News
                        <span className="count">({bookmarkedNews.length} articles)</span>
                      </SectionTitle>
                      
                      {bookmarkedNews.length > 0 ? (
                        <NewsSection>
                          {[...buyNews, ...sellNews]
                            .filter(news => bookmarkedNews.includes(news.id))
                            .map((news) => (
                              <NewsCard
                                key={news.id}
                                variants={itemVariants}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <CoinLabel isNew={news.isNew}>
                                  <div className="coin-symbol">{news.coin}</div>
                                  <h3>{news.coinFull}</h3>
                                  <div className="date">
                                    <span className="dot" />
                                    {news.timestamp} · {news.source}
                                  </div>
                                </CoinLabel>
                                <NewsContent>
                                  <h3>{news.title}</h3>
                                  <p>{news.content}</p>
                                  <NewsFooter>
                                    <a href="#read-more">
                                      Read more <ArrowRightIcon />
                                    </a>
                                    <div className="actions">
                                      <button 
                                        className="active"
                                        onClick={() => toggleBookmark(news.id)}
                                      >
                                        <BookmarkIcon active={true} />
                                      </button>
                                      <button>
                                        <ShareIcon />
                                      </button>
                                    </div>
                                  </NewsFooter>
                                </NewsContent>
                              </NewsCard>
                            ))}
                        </NewsSection>
                      ) : (
                        <div style={{ textAlign: 'center', margin: '3rem 0' }}>
                          <p>No bookmarked news yet. Click the bookmark icon on any news item to save it here.</p>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </>
            )}
          </>
        )}
      </NewsContainer>
    </>
  );
};

export default News; 