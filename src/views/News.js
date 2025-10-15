'use client'

import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '../components/PageHeader';

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

function timeAgo(iso) {
  try {
    const d = new Date(iso);
    const diff = Math.max(0, Date.now() - d.getTime());
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

function titleCase(word) {
  return word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '';
}

function inferSourceFromUrl(urlStr) {
  try {
    if (!urlStr) return 'Unknown';
    const u = new URL(urlStr);
    let host = u.hostname || '';
    // Strip common subdomains
    host = host.replace(/^www\./i, '');
    const parts = host.split('.');
    if (parts.length < 2) return titleCase(host);
    // Handle blog.<brand>.tld
    if (parts[0].toLowerCase() === 'blog' && parts.length >= 3) {
      return `${titleCase(parts[1])} Blog`;
    }
    const sld = parts[parts.length - 2];
    const tld = parts[parts.length - 1];
    const base = titleCase(sld);
    // Friendly remaps
    const map = {
      coindesk: 'CoinDesk',
      cointelegraph: 'Cointelegraph',
      decrypt: 'Decrypt',
      benzinga: 'Benzinga',
      bloomberg: 'Bloomberg',
      reuters: 'Reuters',
      yahoo: 'Yahoo Finance',
      forbes: 'Forbes',
      finance: 'Yahoo Finance',
      medium: 'Medium',
      substack: 'Substack',
      reddit: 'Reddit',
      youtube: 'YouTube',
      x: 'X',
      twitter: 'X',
    };
    const key = sld.toLowerCase();
    return map[key] || (tld.toLowerCase() === 'io' || tld.toLowerCase() === 'com' ? base : `${base}.${tld}`);
  } catch {
    return 'Unknown';
  }
}

const News = ({ initialNews = [] }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKind, setFilterKind] = useState('all'); // all|news|media
  const [bookmarkedNews, setBookmarkedNews] = useState([]);
  
  useEffect(() => {
    setItems(Array.isArray(initialNews) ? initialNews : []);
        setLoading(false);
  }, [initialNews]);

  const tokensTrending = useMemo(() => {
    const scoreByToken = new Map();
    for (const it of items) {
      const votes = Number(it?.votes?.positive || 0) + Number(it?.votes?.important || 0) + Number(it?.votes?.comments || 0);
      const instruments = Array.isArray(it?.instruments) ? it.instruments : [];
      for (const ins of instruments) {
        const code = String(ins?.code || '').toUpperCase();
        if (!code) continue;
        scoreByToken.set(code, (scoreByToken.get(code) || 0) + votes + 1);
      }
    }
    return Array.from(scoreByToken.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([code]) => code);
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (filterKind !== 'all') list = list.filter(it => (it.kind || 'news') === filterKind);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(it => {
        const inTitle = (it.title || '').toLowerCase().includes(q);
        const inDesc = (it.description || '').toLowerCase().includes(q);
        const inTokens = (it.instruments || []).some(ins => String(ins.code || '').toLowerCase().includes(q) || String(ins.title || '').toLowerCase().includes(q));
        return inTitle || inDesc || inTokens;
      });
    }
    return list;
  }, [items, filterKind, searchTerm]);

  const handleSearch = (e) => setSearchTerm(e.target.value);
  const toggleBookmark = (id) => {
    setBookmarkedNews(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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
              placeholder="Search by coin, keyword, or source..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </SearchInput>
          
          <FiltersWrapper>
            <FilterButton active={filterKind === 'all'} onClick={() => setFilterKind('all')}>All</FilterButton>
            <FilterButton active={filterKind === 'news'} onClick={() => setFilterKind('news')}>News</FilterButton>
            <FilterButton active={filterKind === 'media'} onClick={() => setFilterKind('media')}>Media</FilterButton>
            <FilterButton active={false} onClick={() => {}} style={{ opacity: 0.6, cursor: 'default' }}>Bookmarked ({bookmarkedNews.length})</FilterButton>
          </FiltersWrapper>
        </SearchFilterBar>
        
        {loading ? (
          <LoadingAnimation />
        ) : (
          <>
            {tokensTrending.length > 0 && (
            <TrendingSection>
                <h2>Trending Tokens In News</h2>
              <div className="trending-items">
                  {tokensTrending.map(tok => (
                    <Link key={tok} href={`/statistics?token=${encodeURIComponent(tok)}&sinceHours=24`}>
                      <TrendingItem whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                        {tok}
                  </TrendingItem>
                    </Link>
                ))}
              </div>
            </TrendingSection>
            )}
            
              <AnimatePresence mode="wait">
                <motion.div
                key={`list-${filterKind}-${searchTerm}`}
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <SectionTitle>
                  Latest Headlines
                  <span className="count">({filtered.length} articles)</span>
                  </SectionTitle>
                {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', margin: '3rem 0' }}>
                    <p>No news found.</p>
                    </div>
                ) : (
                    <NewsSection>
                    {filtered.map((it) => {
                      const firstToken = (it.instruments && it.instruments[0]?.code) ? it.instruments[0].code.toUpperCase() : 'NEWS';
                      const displaySource = it.source && it.source !== 'Unknown' ? it.source : inferSourceFromUrl(it.url);
                      return (
                        <NewsCard key={it.id} variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <CoinLabel>
                            <div className="coin-symbol">{firstToken}</div>
                            <h3>{displaySource || 'Source'}</h3>
                            <div className="date">
                              <span className="dot" />
                              {timeAgo(it.published_at)}
                            </div>
                          </CoinLabel>
                          <NewsContent>
                            <h3>{it.title}</h3>
                            <p>{it.description}</p>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              {(it.instruments || []).slice(0, 4).map((ins, idx) => (
                                <span key={`${it.id}-ins-${idx}`} style={{ marginRight: '0.75rem' }}>
                                  {ins.code}
                                  {typeof ins.price_usd === 'number' && (
                                    <>
                                      {' '}· ${ins.price_usd.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                    </>
                                  )}
                                  {typeof ins.change24h === 'number' && (
                                    <>
                                      {' '}(<span style={{ color: ins.change24h >= 0 ? '#2ecc71' : '#e74c3c' }}>{ins.change24h.toFixed(2)}%</span>)
                                    </>
                                  )}
                                </span>
                              ))}
                            </div>
                            <NewsFooter>
                              {it.url ? (
                                <a href={it.url} target="_blank" rel="noreferrer">
                                  Read original <ArrowRightIcon />
                              </a>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)' }}>Original link unavailable</span>
                              )}
                              <div className="actions">
                                <button 
                                  className={bookmarkedNews.includes(it.id) ? 'active' : ''}
                                  onClick={() => toggleBookmark(it.id)}
                                  aria-label="Bookmark"
                                >
                                  <BookmarkIcon active={bookmarkedNews.includes(it.id)} />
                                </button>
                                <button onClick={() => navigator?.share?.({ title: it.title, url: it.url }).catch(() => {})} aria-label="Share">
                                  <ShareIcon />
                                </button>
                              </div>
                            </NewsFooter>
                          </NewsContent>
                        </NewsCard>
                      );
                    })}
                    </NewsSection>
                      )}
                    </motion.div>
                  </AnimatePresence>
          </>
        )}
      </NewsContainer>
    </>
  );
};

export default News; 