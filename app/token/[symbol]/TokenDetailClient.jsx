'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'

const defaultSentimentStats = {
  total: 0,
  breakdown: {
    bullish: 0,
    bearish: 0,
    neutral: 0
  }
}

const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1621 0%, #0f1922 50%, #0a1621 100%);
  padding: 2rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(54, 166, 186, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(46, 204, 113, 0.06) 0%, transparent 50%);
    pointer-events: none;
  }
`

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateX(-4px);
    color: #5dd5ed;
  }
`

const Header = styled.div`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`

const TokenTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`

const TokenImage = styled.img`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid var(--primary);
  box-shadow: 0 4px 12px rgba(54, 166, 186, 0.3);
  background: rgba(255, 255, 255, 0.05);
  padding: 4px;
`

const TokenName = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`

const SentimentBadge = styled.div`
  padding: 0.5rem 1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.95rem;
  color: #0a1621;
  background: ${props => props.$color || '#f39c12'};
  box-shadow: 0 4px 12px ${props => props.$color || '#f39c12'}33;
  cursor: help;
`

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`

const Price = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
`

const PriceChange = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${props => props.$positive ? '#2ecc71' : '#e74c3c'};
`

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`

const MetricCard = styled.div`
  background: rgba(30, 57, 81, 0.4);
  border: 1px solid rgba(54, 166, 186, 0.15);
  border-radius: 12px;
  padding: 1rem;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(54, 166, 186, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(54, 166, 186, 0.2);
  }
`

const MetricLabel = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
`

const MetricValue = styled.div`
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
`

const TimeFilters = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const TimeButton = styled(Link)`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: ${props => props.$active ? 'var(--primary)' : 'rgba(30, 57, 81, 0.6)'};
  color: ${props => props.$active ? '#0a1621' : 'var(--text-primary)'};
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  border: 1px solid ${props => props.$active ? 'var(--primary)' : 'rgba(54, 166, 186, 0.2)'};

  &:hover {
    background: ${props => props.$active ? '#5dd5ed' : 'rgba(54, 166, 186, 0.2)'};
    transform: translateY(-2px);
  }
`

const DeepDiveSection = styled(motion.div)`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`

// (Removed TLDR styled components per request)

const DeepDiveContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`

const AnalysisBlock = styled.div`
  background: rgba(30, 57, 81, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(54, 166, 186, 0.15);
`

const BlockTitle = styled.h4`
  color: var(--primary);
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const BlockSubtitle = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-style: italic;
  margin-bottom: 1rem;
`

const BlockContent = styled.div`
  color: var(--text-primary);
  line-height: 1.8;
  
  p {
    margin: 0 0 1rem 0;
    
    &:last-child {
      margin-bottom: 0;
    }
  }

  strong {
    color: var(--primary);
    font-weight: 700;
  }

  em {
    color: var(--text-secondary);
    font-style: italic;
  }
`

const ConclusionBox = styled.div`
  background: linear-gradient(135deg, rgba(155, 89, 182, 0.1) 0%, rgba(54, 166, 186, 0.1) 100%);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(155, 89, 182, 0.3);
`

const ConclusionTitle = styled.h4`
  color: #9b59b6;
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
`

const ConclusionText = styled.div`
  color: var(--text-primary);
  line-height: 1.8;
  
  strong {
    color: var(--primary);
  }
`

const DisclaimerText = styled.div`
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-style: italic;
  text-align: center;
  margin-top: 1.5rem;
  opacity: 0.7;
`

const SentimentSection = styled(motion.div)`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`

const SectionTitle = styled.h2`
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0 0 1.5rem 0;
  color: var(--primary);
`

const ReasonsGrid = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
`

const ReasonCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: rgba(30, 57, 81, 0.4);
  border: 1px solid rgba(54, 166, 186, 0.15);
  border-radius: 12px;
  padding: 1.25rem;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(54, 166, 186, 0.4);
    transform: translateX(4px);
  }
`

const ReasonIcon = styled.div`
  font-size: 1.5rem;
  flex-shrink: 0;
`

const ReasonContent = styled.div`
  flex: 1;
`

const ReasonTitle = styled.div`
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.25rem;
`

const ReasonText = styled.div`
  color: var(--text-secondary);
  line-height: 1.6;
`

const CommunitySentimentSection = styled(SentimentSection)`
  margin-top: -0.5rem;
`

const SentimentStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`

const SentimentStatCard = styled.div`
  background: rgba(30, 57, 81, 0.4);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
`

const SentimentStatLabel = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
`

const SentimentStatValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: ${props => props.$variant === 'bullish' ? '#2ecc71' : props.$variant === 'bearish' ? '#e74c3c' : 'var(--text-primary)'};
  line-height: 1.2;
`

const SentimentStatSubtext = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
`

const VoteForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const VoteOptions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
`

const VoteToggle = styled.button`
  border: 1px solid ${props => props.$active ? 'rgba(54,166,186,0.6)' : 'rgba(54,166,186,0.3)'};
  background: ${props => props.$active ? 'rgba(54,166,186,0.15)' : 'transparent'};
  color: ${props => props.$active ? 'var(--text-primary)' : 'var(--text-secondary)'};
  border-radius: 12px;
  padding: 0.85rem 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const VoteInput = styled.input`
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(54, 166, 186, 0.3);
  background: rgba(10, 22, 33, 0.7);
  padding: 0.9rem 1rem;
  color: var(--text-primary);
  font-size: 0.95rem;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(54, 166, 186, 0.2);
  }

  &:disabled {
    opacity: 0.6;
  }
`

const VoteTextarea = styled.textarea`
  width: 100%;
  min-height: 110px;
  border-radius: 12px;
  border: 1px solid rgba(54, 166, 186, 0.3);
  background: rgba(10, 22, 33, 0.7);
  padding: 0.9rem 1rem;
  color: var(--text-primary);
  font-size: 0.95rem;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(54, 166, 186, 0.2);
  }

  &:disabled {
    opacity: 0.6;
  }
`

const VoteHelperText = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
`

const VoteStatusMessage = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.$type === 'error' ? '#e74c3c' : '#2ecc71'};
`

const VoteSubmitButton = styled.button`
  border: none;
  border-radius: 12px;
  padding: 0.95rem 1rem;
  background: linear-gradient(135deg, #36a6ba 0%, #2ecc71 100%);
  color: white;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const SentimentNote = styled.p`
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
`

const OrcaButton = styled(motion.button)`
  width: 100%;
  padding: 1.25rem 2rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #9b59b6 0%, #36a6ba 100%);
  color: white;
  font-size: 1.1rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(155, 89, 182, 0.3);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(155, 89, 182, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`

const ModalContent = styled(motion.div)`
  background: linear-gradient(135deg, #0d2134 0%, #1a2f42 100%);
  border: 2px solid rgba(54, 166, 186, 0.3);
  border-radius: 20px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 9999;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(30, 57, 81, 0.3);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--primary);
    border-radius: 4px;
  }
`

const CloseButton = styled.button`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: rgba(231, 76, 60, 0.2);
  border: 1px solid rgba(231, 76, 60, 0.4);
  color: #e74c3c;
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(231, 76, 60, 0.4);
    transform: rotate(90deg);
  }
`

const AnalysisContent = styled.div`
  h3 {
    color: var(--primary);
    font-size: 1.5rem;
    font-weight: 800;
    margin: 2rem 0 1rem 0;
    
    &:first-child {
      margin-top: 0;
    }
  }

  p {
    color: var(--text-secondary);
    line-height: 1.8;
    margin: 1rem 0;
  }

  ul, ol {
    color: var(--text-secondary);
    line-height: 2;
    padding-left: 1.5rem;
  }

  li {
    margin: 0.5rem 0;
  }

  strong {
    color: var(--text-primary);
    font-weight: 700;
  }
`

const RecommendationCard = styled.div`
  background: ${props => 
    props.$type === 'BUY' ? 'linear-gradient(135deg, rgba(46,204,113,0.15) 0%, rgba(46,204,113,0.05) 100%)' :
    props.$type === 'AVOID' ? 'linear-gradient(135deg, rgba(231,76,60,0.15) 0%, rgba(231,76,60,0.05) 100%)' :
    'linear-gradient(135deg, rgba(243,156,18,0.15) 0%, rgba(243,156,18,0.05) 100%)'
  };
  border: 1px solid ${props => 
    props.$type === 'BUY' ? 'rgba(46,204,113,0.3)' :
    props.$type === 'AVOID' ? 'rgba(231,76,60,0.3)' :
    'rgba(243,156,18,0.3)'
  };
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
`

const RecType = styled.div`
  font-size: 1.2rem;
  font-weight: 800;
  color: ${props => 
    props.$type === 'BUY' ? '#2ecc71' :
    props.$type === 'AVOID' ? '#e74c3c' :
    '#f39c12'
  };
  margin-bottom: 0.5rem;
`

const RecConfidence = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
`

const TransactionsSection = styled.div`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 0.5rem;

  thead tr {
    background: rgba(30, 57, 81, 0.6);
  }

  th {
    padding: 1rem;
    text-align: left;
    font-weight: 700;
    color: var(--primary);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border: none;

    &:first-child {
      border-top-left-radius: 8px;
      border-bottom-left-radius: 8px;
    }

    &:last-child {
      border-top-right-radius: 8px;
      border-bottom-right-radius: 8px;
    }
  }

  tbody tr {
    background: rgba(30, 57, 81, 0.3);
    transition: all 0.3s ease;

    &:hover {
      background: rgba(54, 166, 186, 0.1);
      transform: translateX(4px);
    }
  }

  td {
    padding: 1rem;
    color: var(--text-secondary);
    border: none;

    &:first-child {
      border-top-left-radius: 8px;
      border-bottom-left-radius: 8px;
    }

    &:last-child {
      border-top-right-radius: 8px;
      border-bottom-right-radius: 8px;
    }
  }

  a {
    color: var(--primary);
    text-decoration: none;
    transition: color 0.3s ease;

    &:hover {
      color: #5dd5ed;
    }
  }
`

const TxBadge = styled.span`
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  background: ${props => props.$type === 'BUY' ? 'rgba(46,204,113,0.2)' : props.$type === 'SELL' ? 'rgba(231,76,60,0.2)' : 'rgba(243,156,18,0.2)'};
  color: ${props => props.$type === 'BUY' ? '#2ecc71' : props.$type === 'SELL' ? '#e74c3c' : '#f39c12'};
  border: 1px solid ${props => props.$type === 'BUY' ? 'rgba(46,204,113,0.4)' : props.$type === 'SELL' ? 'rgba(231,76,60,0.4)' : 'rgba(243,156,18,0.4)'};
`

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

const getInsightIcon = (iconName) => {
  const iconMap = {
    'flow': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/></svg>,
    'pressure-up': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="14" width="4" height="6" fill="#2ecc71"/><rect x="10" y="10" width="4" height="10" fill="#2ecc71"/><rect x="16" y="6" width="4" height="14" fill="#2ecc71"/></svg>,
    'pressure-down': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="6" width="4" height="14" fill="#e74c3c"/><rect x="10" y="10" width="4" height="10" fill="#e74c3c"/><rect x="16" y="14" width="4" height="6" fill="#e74c3c"/></svg>,
    'whales-high': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="var(--primary)"/></svg>,
    'whales-low': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="var(--text-secondary)" strokeWidth="2" fill="none"/><circle cx="12" cy="10" r="3" fill="var(--text-secondary)"/></svg>,
    'trend-up': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" fill="#2ecc71"/></svg>,
    'trend-down': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6h-6z" fill="#e74c3c"/></svg>,
    'volume-high': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" fill="var(--primary)"/><path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="var(--primary)"/></svg>
  }
  return iconMap[iconName] || <span style={{ fontSize: '1.5rem' }}>●</span>
}

export default function TokenDetailClient({ symbol, sinceHours, data, whaleMetrics, sentiment }) {
  const [priceData, setPriceData] = useState(null)
  const [orcaAnalysis, setOrcaAnalysis] = useState(null)
  const [showOrcaModal, setShowOrcaModal] = useState(false)
  const [loadingOrca, setLoadingOrca] = useState(false)
  const [communityStats, setCommunityStats] = useState(defaultSentimentStats)
  const [statsLoading, setStatsLoading] = useState(true)
  const [voteForm, setVoteForm] = useState({ email: '', comment: '', vote: 'bullish' })
  const [voteSending, setVoteSending] = useState(false)
  const [voteStatus, setVoteStatus] = useState(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [fingerprint, setFingerprint] = useState(null)

  const sentimentStorageKey = `sonar_sentiment_${symbol}`
  const emailStorageKey = 'sonar_feedback_email'

  // Generate CMC-style Deep Dive analysis using heuristics
  const generateDeepDive = () => {
    if (whaleMetrics.totalVolume === 0) return null

    const buyPct = sentiment.details.buyPct
    const sellPct = 100 - buyPct
    const netFlow = whaleMetrics.netFlow
    const uniqueWhales = whaleMetrics.uniqueWhales
    const totalVolume = whaleMetrics.totalVolume
    const avgTxSize = whaleMetrics.totalVolume / (whaleMetrics.buys + whaleMetrics.sells)
    
    // Price changes
    const priceChange24h = priceData?.price_change_percentage_24h || 0
    const priceChange7d = priceData?.price_change_percentage_7d || 0
    
    // Determine overall performance
    const priceDirection = priceChange24h > 0 ? 'up' : 'down'
    const priceChangeAbs = Math.abs(priceChange24h)
    
    // (Removed TLDR computation per request)
    
    // (Removed TLDR points)
    
    // 2. Price Performance
    // (Removed TLDR points)
    
    // 3. Volume & Liquidity
    // (Removed TLDR points)
    
    // Deep Dive Blocks
    const blocks = []
    
    // Block 1: Whale Accumulation/Distribution
    blocks.push({
      title: `${buyPct > 60 ? 'Whale Accumulation' : sellPct > 60 ? 'Whale Distribution' : 'Whale Trading Balance'}`,
      impact: buyPct > 65 ? 'Bullish Impact' : sellPct > 65 ? 'Bearish Impact' : 'Neutral Impact',
      content: `
        <p><strong>Overview:</strong> Whale wallets (transactions $50K+) have executed <strong>${whaleMetrics.buys} buy orders</strong> versus <strong>${whaleMetrics.sells} sell orders</strong> in the last ${sinceHours} hours, resulting in a <strong>${buyPct.toFixed(1)}% / ${sellPct.toFixed(1)}%</strong> buy/sell ratio.</p>
        
        <p><strong>What this means:</strong> ${
          buyPct > 65 
            ? `Institutional players are <strong>heavily accumulating</strong> ${symbol}, signaling strong conviction. The ${formatUSD(netFlow)} net inflow suggests whales are positioning for upside. This level of buying pressure (${buyPct.toFixed(1)}%) typically precedes price appreciation if sustained.`
            : sellPct > 65
            ? `Whales are <strong>aggressively distributing</strong> ${symbol}, with ${formatUSD(Math.abs(netFlow))} flowing out. This selling pressure (${sellPct.toFixed(1)}%) indicates institutional players are de-risking or taking profits. Continued outflows could pressure prices lower.`
            : `Trading activity is <strong>balanced</strong> between buyers and sellers. The relatively neutral flow (${formatUSD(Math.abs(netFlow))}) suggests indecision among institutional players. Watch for a breakout in either direction as whales pick a side.`
        }</p>
        
        <p><em>Key metric: ${uniqueWhales} unique whale addresses actively trading ${symbol}${uniqueWhales > 20 ? ' – exceptionally high institutional interest.' : uniqueWhales > 10 ? ' – strong institutional participation.' : ' – moderate whale activity.'}</em></p>
      `
    })
    
    // Block 2: Technical Analysis
    if (priceData) {
      const nearATH = priceData.ath_change_percentage > -10
      const nearATL = priceData.atl_change_percentage < 10
      const pricePosition = priceData.high_24h && priceData.low_24h 
        ? ((priceData.current_price - priceData.low_24h) / (priceData.high_24h - priceData.low_24h) * 100).toFixed(1)
        : null
      
      blocks.push({
        title: 'Technical Positioning',
        impact: priceChange24h > 5 ? 'Bullish Momentum' : priceChange24h < -5 ? 'Bearish Momentum' : 'Consolidation',
        content: `
          <p><strong>Overview:</strong> ${symbol} is trading at <strong>${formatPrice(priceData.current_price)}</strong>, ${priceChange24h > 0 ? 'up' : 'down'} <strong>${Math.abs(priceChange24h).toFixed(2)}%</strong> in the last 24 hours${pricePosition ? `, currently at ${pricePosition}% of its 24h range` : ''}.</p>
          
          <p><strong>What this means:</strong> ${
            nearATH 
              ? `Price is near all-time highs (${priceData.ath_change_percentage.toFixed(2)}% from ATH of ${formatUSD(priceData.ath)}). This suggests strong momentum but also potential resistance. Profit-taking could emerge at these levels.`
              : nearATL
              ? `Price is close to all-time lows (${priceData.atl_change_percentage.toFixed(2)}% from ATL of ${formatUSD(priceData.atl)}). This could represent a value opportunity if fundamentals remain strong, but further downside is possible.`
              : priceChange24h > 5
              ? `Strong bullish momentum is building. The ${priceChange24h.toFixed(2)}% 24h gain aligns with ${netFlow > 0 ? 'positive' : 'negative'} whale flows, ${netFlow > 0 ? 'reinforcing' : 'contradicting'} the price action.`
              : priceChange24h < -5
              ? `Bearish pressure is mounting. The ${priceChange24h.toFixed(2)}% 24h decline ${netFlow < 0 ? 'matches' : 'contradicts'} whale outflows, ${netFlow < 0 ? 'confirming' : 'suggesting potential reversal if'} smart money continues selling.`
              : `Price is consolidating in a tight range. The lack of strong directional movement suggests market indecision. Watch for a breakout on volume.`
          }</p>
          
          <p><em>24h Range: ${formatUSD(priceData.low_24h)} - ${formatUSD(priceData.high_24h)}</em></p>
        `
      })
    }
    
    // Block 3: Market Context
    blocks.push({
      title: 'Institutional Activity',
      impact: avgTxSize > 500000 ? 'High Conviction' : avgTxSize > 200000 ? 'Moderate Activity' : 'Lower Conviction',
      content: `
        <p><strong>Overview:</strong> The average whale transaction size is <strong>${formatUSD(avgTxSize)}</strong>, with total institutional volume of <strong>${formatUSD(totalVolume)}</strong> over the last ${sinceHours} hours.</p>
        
        <p><strong>What this means:</strong> ${
          avgTxSize > 500000
            ? `Exceptionally large transaction sizes indicate <strong>high conviction</strong> from institutional players. These are not retail trades – whales are making significant capital commitments${netFlow > 0 ? ', betting on upside' : ', exiting positions'}. This level of activity often precedes major price moves.`
            : avgTxSize > 200000
            ? `Average transaction sizes suggest <strong>moderate institutional interest</strong>. Whales are active but not making outsized bets. This represents normal institutional trading flow${netFlow > 0 ? ' with a bullish bias' : ' with selling pressure'}.`
            : `Smaller average transaction sizes may indicate <strong>cautious positioning</strong> or lower conviction. Whales are participating but sizing trades conservatively, suggesting uncertainty about ${symbol}'s near-term direction.`
        }</p>
        
        <p><em>Total ${whaleMetrics.buys + whaleMetrics.sells} whale transactions executed by ${uniqueWhales} unique addresses.</em></p>
      `
    })
    
    // Conclusion
    let conclusion = ''
    if (buyPct > 65 && priceChange24h > 3) {
      conclusion = `${symbol}'s outlook appears <strong>bullish</strong> with strong alignment between whale accumulation (${buyPct.toFixed(1)}% buys) and positive price action (+${priceChange24h.toFixed(2)}%). Key support: watch ${priceData?.low_24h ? formatUSD(priceData.low_24h) : 'recent lows'}. Key resistance: ${priceData?.high_24h ? formatUSD(priceData.high_24h) : 'recent highs'}. Continued whale buying could push prices higher.`
    } else if (sellPct > 65 && priceChange24h < -3) {
      conclusion = `${symbol} faces <strong>bearish pressure</strong> from both whale distribution (${sellPct.toFixed(1)}% sells) and negative price momentum (${priceChange24h.toFixed(2)}%). ${formatUSD(Math.abs(netFlow))} in net outflows suggests institutional capitulation. Watch for support at ${priceData?.low_24h ? formatUSD(priceData.low_24h) : 'recent lows'}. A break below could trigger further selling.`
    } else if (buyPct > 60 && priceChange24h < -3) {
      conclusion = `Interesting divergence: whales are <strong>accumulating on weakness</strong> (${buyPct.toFixed(1)}% buys) despite ${priceChange24h.toFixed(2)}% price decline. This suggests smart money sees value at current levels. If buying continues, expect a reversal. Monitor for price stabilization.`
    } else if (sellPct > 60 && priceChange24h > 3) {
      conclusion = `Concerning divergence: price is rising (+${priceChange24h.toFixed(2)}%) while whales distribute (${sellPct.toFixed(1)}% sells). This suggests retail buying into institutional selling – a classic distribution pattern. Caution advised as whale exits could pressure prices lower once retail demand fades.`
    } else {
      conclusion = `${symbol} is in a <strong>consolidation phase</strong> with balanced whale activity (${buyPct.toFixed(1)}% / ${sellPct.toFixed(1)}%) and modest price movement (${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(2)}%). Watch for directional breakout. ${uniqueWhales} whales are actively trading – institutional interest remains. Support: ${priceData?.low_24h ? formatUSD(priceData.low_24h) : 'N/A'}. Resistance: ${priceData?.high_24h ? formatUSD(priceData.high_24h) : 'N/A'}.`
    }
    
    return { blocks, conclusion }
  }

  const loadCommunitySentiment = useCallback(async () => {
    try {
      setStatsLoading(true)
      const res = await fetch(`/api/sentiment/vote?symbol=${symbol}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setCommunityStats({
          total: data.total || 0,
          breakdown: {
            bullish: data.breakdown?.bullish || 0,
            bearish: data.breakdown?.bearish || 0,
            neutral: data.breakdown?.neutral || 0
          }
        })
      } else {
        setCommunityStats(defaultSentimentStats)
      }
    } catch (error) {
      console.error('Failed to fetch community sentiment:', error)
      setCommunityStats(defaultSentimentStats)
    } finally {
      setStatsLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    loadCommunitySentiment()
  }, [loadCommunitySentiment])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedVote = localStorage.getItem(sentimentStorageKey)
    setHasVoted(Boolean(storedVote))

    const storedEmail = localStorage.getItem(emailStorageKey)
    if (storedEmail) {
      setVoteForm(prev => ({ ...prev, email: storedEmail }))
    }
  }, [symbol, sentimentStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let fp = localStorage.getItem('sonar_fp')
    if (!fp && window.crypto?.randomUUID) {
      fp = crypto.randomUUID()
      localStorage.setItem('sonar_fp', fp)
    }
    setFingerprint(fp)
  }, [])

  // Fetch live price data
  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch(`/api/token/price?symbol=${symbol}`)
        if (res.ok) {
          const data = await res.json()
          setPriceData(data)
        }
      } catch (error) {
        console.error('Failed to fetch price:', error)
      }
    }
    fetchPrice()
    const interval = setInterval(fetchPrice, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [symbol])

  // Fetch Orca analysis
  async function handleAskOrca() {
    if (loadingOrca) return
    
    setLoadingOrca(true)
    try {
      const res = await fetch('/api/orca/token-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      })
      
      if (res.ok) {
        const analysis = await res.json()
        setOrcaAnalysis(analysis)
        setShowOrcaModal(true)
      }
    } catch (error) {
      console.error('Orca analysis failed:', error)
    } finally {
      setLoadingOrca(false)
    }
  }

  const handleVoteSubmit = async (event) => {
    event.preventDefault()
    if (!voteForm.email.trim()) {
      setVoteStatus({ type: 'error', message: 'Email is required to vote.' })
      return
    }

    setVoteSending(true)
    setVoteStatus(null)
    try {
      const res = await fetch('/api/sentiment/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenSymbol: symbol,
          vote: voteForm.vote,
          email: voteForm.email.trim(),
          comment: voteForm.comment.trim(),
          fingerprint
        })
      })

      const body = await res.json()
      if (!res.ok) {
        throw new Error(body.error || 'Unable to submit vote.')
      }

      setVoteStatus({ type: 'success', message: 'Vote recorded. Thanks for sharing your view!' })
      setCommunityStats({
        total: body.stats?.total || 0,
        breakdown: {
          bullish: body.stats?.breakdown?.bullish || 0,
          bearish: body.stats?.breakdown?.bearish || 0,
          neutral: body.stats?.breakdown?.neutral || 0
        }
      })
      setHasVoted(true)
      if (typeof window !== 'undefined') {
        localStorage.setItem(sentimentStorageKey, 'true')
        localStorage.setItem(emailStorageKey, voteForm.email.trim())
      }
    } catch (error) {
      setVoteStatus({ type: 'error', message: error.message })
    } finally {
      setVoteSending(false)
    }
  }

  const formatUSD = (value) => {
    const num = Number(value)
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`
    if (num >= 1) return `$${num.toFixed(4)}`
    if (num >= 0.0001) return `$${num.toFixed(4)}`
    if (num > 0) return `$${num.toFixed(8)}` // For very small prices
    return `$${num.toFixed(4)}`
  }

  const totalVotes = communityStats.total || 0
  const bullishCount = communityStats.breakdown?.bullish || 0
  const bearishCount = communityStats.breakdown?.bearish || 0
  const bullishPct = totalVotes ? Math.round((bullishCount / totalVotes) * 100) : 0
  const bearishPct = totalVotes ? Math.round((bearishCount / totalVotes) * 100) : 0
  const voteDisabled = voteSending || hasVoted
  const sentimentNote = statsLoading
    ? 'Updating sentiment...'
    : totalVotes
      ? `Based on ${totalVotes} community votes.`
      : 'Be the first to share your sentiment.'

  const formatNumber = (value) => {
    const num = Number(value)
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const formatPrice = (value) => {
    const num = Number(value)
    if (!num || num === 0) return '$0.0000'
    
    // For very large numbers, use K/M/B notation
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
    if (num >= 10000) return `$${(num / 1000).toFixed(2)}K`
    
    // For prices >= $1, show 4 decimals
    if (num >= 1) return `$${num.toFixed(4)}`
    
    // For prices < $1 but >= $0.0001, show 4 decimals
    if (num >= 0.0001) return `$${num.toFixed(4)}`
    
    // For very small prices, show 8 decimals
    if (num > 0) return `$${num.toFixed(8)}`
    
    return '$0.0000'
  }

  // Compute deep dive AFTER helpers are defined to avoid TDZ
  const deepDive = generateDeepDive()

  return (
    <PageWrapper>
      <Container>
        <BackLink href="/dashboard">← Back to Dashboard</BackLink>

        <Header>
          <TokenTitle>
            {priceData?.image ? (
              <TokenImage 
                src={priceData.image} 
                alt={symbol}
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            ) : (
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: '2px solid var(--primary)',
                background: 'linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'white',
                boxShadow: '0 4px 12px rgba(54, 166, 186, 0.3)'
              }}>
                {symbol.slice(0, 2)}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <TokenName>{symbol}</TokenName>
              {priceData?.name && priceData.name !== symbol && (
                <span style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '1rem', 
                  fontWeight: 500,
                  marginTop: '-0.5rem'
                }}>
                  {priceData.name}
                </span>
              )}
            </div>
            <SentimentBadge 
              $color={sentiment.color}
              title={`Score: ${sentiment.score} | Buy%: ${sentiment.details.buyPct}% | Net Flow: ${formatUSD(sentiment.details.net)}`}
            >
              <span style={{ marginRight: '0.5rem' }}>●</span>{sentiment.label}
            </SentimentBadge>
          </TokenTitle>

          {priceData && (
            <>
              <PriceRow>
                <Price>{formatPrice(priceData.price)}</Price>
                <PriceChange $positive={priceData.change24h >= 0}>
                  {priceData.change24h >= 0 ? '+' : ''}{priceData.change24h?.toFixed(2)}% (24h)
                </PriceChange>
              </PriceRow>

              <MetricsGrid>
                <MetricCard>
                  <MetricLabel>Market Cap {priceData.marketCapRank && `#${priceData.marketCapRank}`}</MetricLabel>
                  <MetricValue>{formatUSD(priceData.marketCap)}</MetricValue>
                  {priceData.marketCapChangePercentage24h !== 0 && (
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: priceData.marketCapChangePercentage24h >= 0 ? '#2ecc71' : '#e74c3c',
                      marginTop: '0.25rem'
                    }}>
                      {priceData.marketCapChangePercentage24h >= 0 ? '+' : ''}{priceData.marketCapChangePercentage24h?.toFixed(2)}% (24h)
                    </div>
                  )}
                </MetricCard>
                <MetricCard>
                  <MetricLabel>24h Volume</MetricLabel>
                  <MetricValue>{formatUSD(priceData.volume24h)}</MetricValue>
                  {priceData.volumeMarketCapRatio > 0 && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Vol/MCap: {(priceData.volumeMarketCapRatio * 100).toFixed(2)}%
                    </div>
                  )}
                </MetricCard>
                <MetricCard>
                  <MetricLabel>24h High</MetricLabel>
                  <MetricValue>{formatPrice(priceData.high24h)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>24h Low</MetricLabel>
                  <MetricValue>{formatPrice(priceData.low24h)}</MetricValue>
                </MetricCard>
              </MetricsGrid>

              {/* Additional Market Data */}
              <MetricsGrid style={{ marginTop: '1rem' }}>
                {priceData.fullyDilutedValuation > 0 && (
                  <MetricCard>
                    <MetricLabel>Fully Diluted Valuation</MetricLabel>
                    <MetricValue>{formatUSD(priceData.fullyDilutedValuation)}</MetricValue>
                  </MetricCard>
                )}
                <MetricCard>
                  <MetricLabel>Circulating Supply</MetricLabel>
                  <MetricValue>{formatNumber(priceData.circulatingSupply)} {symbol}</MetricValue>
                  {priceData.totalSupply > 0 && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {((priceData.circulatingSupply / priceData.totalSupply) * 100).toFixed(1)}% of total
                    </div>
                  )}
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Total Supply</MetricLabel>
                  <MetricValue>{priceData.totalSupply > 0 ? `${formatNumber(priceData.totalSupply)} ${symbol}` : 'N/A'}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Max Supply</MetricLabel>
                  <MetricValue>{priceData.maxSupply ? `${formatNumber(priceData.maxSupply)} ${symbol}` : 'Unlimited'}</MetricValue>
                </MetricCard>
              </MetricsGrid>

              {/* All-Time High/Low */}
              {(priceData.athPrice > 0 || priceData.atlPrice > 0) && (
                <MetricsGrid style={{ marginTop: '1rem' }}>
                  {priceData.athPrice > 0 && (
                    <MetricCard>
                      <MetricLabel>All-Time High</MetricLabel>
                      <MetricValue>{formatPrice(priceData.athPrice)}</MetricValue>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#e74c3c',
                        marginTop: '0.25rem'
                      }}>
                        {priceData.athChangePercentage?.toFixed(1)}% from ATH
                      </div>
                      {priceData.athDate && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {new Date(priceData.athDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </MetricCard>
                  )}
                  {priceData.atlPrice > 0 && (
                    <MetricCard>
                      <MetricLabel>All-Time Low</MetricLabel>
                      <MetricValue>{formatPrice(priceData.atlPrice)}</MetricValue>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#2ecc71',
                        marginTop: '0.25rem'
                      }}>
                        +{priceData.atlChangePercentage?.toFixed(1)}% from ATL
                      </div>
                      {priceData.atlDate && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {new Date(priceData.atlDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </MetricCard>
                  )}
                  {priceData.change30d !== undefined && (
                    <MetricCard>
                      <MetricLabel>30d Change</MetricLabel>
                      <MetricValue style={{ color: priceData.change30d >= 0 ? '#2ecc71' : '#e74c3c' }}>
                        {priceData.change30d >= 0 ? '+' : ''}{priceData.change30d?.toFixed(2)}%
                      </MetricValue>
                    </MetricCard>
                  )}
                  {priceData.change1y !== undefined && (
                    <MetricCard>
                      <MetricLabel>1y Change</MetricLabel>
                      <MetricValue style={{ color: priceData.change1y >= 0 ? '#2ecc71' : '#e74c3c' }}>
                        {priceData.change1y >= 0 ? '+' : ''}{priceData.change1y?.toFixed(2)}%
                      </MetricValue>
                    </MetricCard>
                  )}
                </MetricsGrid>
              )}

              {/* Links & Resources */}
              {(priceData.homepage || priceData.blockchainSite || priceData.twitterHandle || priceData.subredditUrl) && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1.5rem',
                  background: 'rgba(30, 57, 81, 0.3)',
                  border: '1px solid rgba(54, 166, 186, 0.2)',
                  borderRadius: '12px'
                }}>
                  <h3 style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 600, 
                    marginBottom: '1rem',
                    color: 'var(--primary)'
                  }}>
                    Resources & Links
                  </h3>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '1rem',
                    fontSize: '0.95rem'
                  }}>
                    {priceData.homepage && (
                      <a 
                        href={priceData.homepage} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          color: 'var(--primary)', 
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          background: 'rgba(54, 166, 186, 0.1)',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(54, 166, 186, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(54, 166, 186, 0.1)'}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                        </svg>
                        Official Website
                      </a>
                    )}
                    {priceData.blockchainSite && (
                      <a 
                        href={priceData.blockchainSite} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          color: 'var(--primary)', 
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          background: 'rgba(54, 166, 186, 0.1)',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(54, 166, 186, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(54, 166, 186, 0.1)'}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm8.5 9H2v2h19v-2zm-2.5-9h-2v7h2v-7zm-7-6.74L16.71 6H6.29l5.21-2.74m0-2.26L2 6v2h19V6l-9.5-5z"/>
                        </svg>
                        Explorer
                      </a>
                    )}
                    {priceData.twitterHandle && (
                      <a 
                        href={`https://twitter.com/${priceData.twitterHandle}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          color: 'var(--primary)', 
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          background: 'rgba(54, 166, 186, 0.1)',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(54, 166, 186, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(54, 166, 186, 0.1)'}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.46 6c-.85.38-1.78.64-2.75.76 1-.6 1.76-1.55 2.12-2.68-.93.55-1.96.95-3.06 1.17-.88-.94-2.13-1.53-3.52-1.53-2.67 0-4.84 2.17-4.84 4.84 0 .38.04.75.13 1.1-4.02-.2-7.58-2.13-9.97-5.06-.42.72-.66 1.55-.66 2.44 0 1.68.85 3.16 2.15 4.03-.79-.02-1.54-.24-2.19-.6v.06c0 2.34 1.67 4.3 3.88 4.74-.41.11-.84.17-1.28.17-.31 0-.62-.03-.92-.08.62 1.94 2.42 3.35 4.55 3.39-1.67 1.31-3.77 2.09-6.05 2.09-.39 0-.78-.02-1.17-.07 2.18 1.4 4.77 2.21 7.55 2.21 9.06 0 14-7.5 14-14 0-.21 0-.42-.02-.63.96-.69 1.8-1.56 2.46-2.55z"/>
                        </svg>
                        Twitter
                      </a>
                    )}
                    {priceData.subredditUrl && (
                      <a 
                        href={priceData.subredditUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          color: 'var(--primary)', 
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          background: 'rgba(54, 166, 186, 0.1)',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(54, 166, 186, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(54, 166, 186, 0.1)'}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14.238 15.348c.085.084.085.221 0 .306-.465.462-1.194.687-2.231.687l-.008-.002-.008.002c-1.036 0-1.766-.225-2.231-.688-.085-.084-.085-.221 0-.305.084-.084.222-.084.307 0 .379.377 1.008.561 1.924.561l.008.002.008-.002c.915 0 1.544-.184 1.924-.561.085-.084.223-.084.307 0zm-3.44-2.418c0-.507-.414-.919-.922-.919-.509 0-.923.412-.923.919 0 .506.414.918.923.918.508.001.922-.411.922-.918c0-.507-.413-.919-.922-.919z"/>
                        </svg>
                        Reddit
                      </a>
                    )}
                    {priceData.githubRepo && (
                      <a 
                        href={priceData.githubRepo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          color: 'var(--primary)', 
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          background: 'rgba(54, 166, 186, 0.1)',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(54, 166, 186, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(54, 166, 186, 0.1)'}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <MetricsGrid>
            <MetricCard>
              <MetricLabel>
                {whaleMetrics.totalVolume > 0 ? `Whale Volume (${sinceHours}h)` : '24h Trading Volume'}
              </MetricLabel>
              <MetricValue>
                {whaleMetrics.totalVolume > 0 
                  ? formatUSD(whaleMetrics.totalVolume)
                  : priceData?.volume24h 
                    ? formatUSD(priceData.volume24h)
                    : '$0.0000'
                }
              </MetricValue>
              {whaleMetrics.totalVolume === 0 && priceData?.volume24h > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Total market volume
                </div>
              )}
            </MetricCard>
            <MetricCard>
              <MetricLabel>
                {whaleMetrics.totalVolume > 0 ? 'Whale Net Flow' : 'Market Cap Change'}
              </MetricLabel>
              <MetricValue style={{ 
                color: whaleMetrics.totalVolume > 0 
                  ? (whaleMetrics.netFlow >= 0 ? '#2ecc71' : '#e74c3c')
                  : (priceData?.marketCapChangePercentage24h >= 0 ? '#2ecc71' : '#e74c3c')
              }}>
                {whaleMetrics.totalVolume > 0 
                  ? formatUSD(whaleMetrics.netFlow)
                  : priceData?.marketCapChangePercentage24h !== undefined
                    ? `${priceData.marketCapChangePercentage24h >= 0 ? '+' : ''}${priceData.marketCapChangePercentage24h.toFixed(2)}%`
                    : 'N/A'
                }
              </MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>
                {whaleMetrics.totalVolume > 0 ? 'Whale Buys / Sells' : 'Price Change (24h)'}
              </MetricLabel>
              <MetricValue style={{
                color: whaleMetrics.totalVolume === 0 && priceData?.change24h !== undefined
                  ? (priceData.change24h >= 0 ? '#2ecc71' : '#e74c3c')
                  : 'inherit'
              }}>
                {whaleMetrics.totalVolume > 0 
                  ? `${whaleMetrics.buys} / ${whaleMetrics.sells}`
                  : priceData?.change24h !== undefined
                    ? `${priceData.change24h >= 0 ? '+' : ''}${priceData.change24h.toFixed(2)}%`
                    : 'N/A'
                }
              </MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>
                {whaleMetrics.totalVolume > 0 ? 'Unique Whales' : 'Circulating Supply'}
              </MetricLabel>
              <MetricValue>
                {whaleMetrics.totalVolume > 0 
                  ? whaleMetrics.uniqueWhales
                  : priceData?.circulatingSupply > 0
                    ? formatNumber(priceData.circulatingSupply)
                    : 'N/A'
                }
              </MetricValue>
              {whaleMetrics.totalVolume === 0 && priceData?.circulatingSupply > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {symbol}
                </div>
              )}
            </MetricCard>
          </MetricsGrid>

          <TimeFilters>
            <TimeButton href={`/token/${encodeURIComponent(symbol)}?sinceHours=1`} $active={sinceHours === 1}>1h</TimeButton>
            <TimeButton href={`/token/${encodeURIComponent(symbol)}?sinceHours=6`} $active={sinceHours === 6}>6h</TimeButton>
            <TimeButton href={`/token/${encodeURIComponent(symbol)}?sinceHours=24`} $active={sinceHours === 24}>24h</TimeButton>
            <TimeButton href={`/token/${encodeURIComponent(symbol)}?sinceHours=72`} $active={sinceHours === 72}>3d</TimeButton>
            <TimeButton href={`/token/${encodeURIComponent(symbol)}?sinceHours=168`} $active={sinceHours === 168}>7d</TimeButton>
          </TimeFilters>
        </Header>

        {/* CMC-Style Deep Dive Analysis */}
        {deepDive && (
          <DeepDiveSection
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SectionTitle>Sonar Deep Dive</SectionTitle>

            {/* Deep Dive Blocks */}
            <DeepDiveContent>
              {deepDive.blocks.map((block, idx) => (
                <AnalysisBlock key={idx}>
                  <BlockTitle>
                    {idx + 1}. {block.title}
                    <span style={{ 
                      marginLeft: 'auto', 
                      fontSize: '0.85rem', 
                      fontWeight: '600',
                      color: block.impact.includes('Bullish') ? '#2ecc71' : block.impact.includes('Bearish') ? '#e74c3c' : '#f39c12',
                      padding: '0.25rem 0.75rem',
                      background: `${block.impact.includes('Bullish') ? '#2ecc71' : block.impact.includes('Bearish') ? '#e74c3c' : '#f39c12'}22`,
                      borderRadius: '999px'
                    }}>
                      {block.impact}
                    </span>
                  </BlockTitle>
                  <BlockContent dangerouslySetInnerHTML={{ __html: block.content }} />
                </AnalysisBlock>
              ))}
            </DeepDiveContent>

            {/* Conclusion */}
            <ConclusionBox>
              <ConclusionTitle>Conclusion</ConclusionTitle>
              <ConclusionText dangerouslySetInnerHTML={{ __html: deepDive.conclusion }} />
            </ConclusionBox>

            <DisclaimerText>
              Sonar Deep Dive analysis is generated using proprietary whale transaction data and technical indicators. Not financial advice.
            </DisclaimerText>
          </DeepDiveSection>
        )}

        {whaleMetrics.totalVolume > 0 && (
          <SentimentSection
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SectionTitle>Why is {symbol} {sentiment.label}?</SectionTitle>
            
            <ReasonsGrid>
            <ReasonCard>
              <ReasonIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="14" width="4" height="6" fill="var(--primary)"/>
                  <rect x="10" y="10" width="4" height="10" fill="var(--primary)"/>
                  <rect x="16" y="6" width="4" height="14" fill="var(--primary)"/>
                </svg>
              </ReasonIcon>
              <ReasonContent>
                <ReasonTitle>Buy/Sell Pressure</ReasonTitle>
                <ReasonText>
                  {sentiment.details.buyPct}% buy pressure ({whaleMetrics.buys} buys vs {whaleMetrics.sells} sells).
                  {sentiment.details.buyPct > 60 ? ' Strong accumulation detected.' : sentiment.details.buyPct < 40 ? ' Heavy distribution in progress.' : ' Balanced trading activity.'}
                </ReasonText>
              </ReasonContent>
            </ReasonCard>

            <ReasonCard>
              <ReasonIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="2" fill="none"/>
                  <path d="M12 7v5l3 3" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </ReasonIcon>
              <ReasonContent>
                <ReasonTitle>Net Capital Flow</ReasonTitle>
                <ReasonText>
                  {whaleMetrics.netFlow >= 0 ? 'Net inflow' : 'Net outflow'} of {formatUSD(Math.abs(whaleMetrics.netFlow))} in the last {sinceHours}h.
                  {Math.abs(whaleMetrics.netFlow) > 5000000 ? ' Exceptional whale activity.' : Math.abs(whaleMetrics.netFlow) > 1000000 ? ' Significant capital movement.' : ' Moderate trading volume.'}
                </ReasonText>
              </ReasonContent>
            </ReasonCard>

            <ReasonCard>
              <ReasonIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="var(--primary)"/>
                </svg>
              </ReasonIcon>
              <ReasonContent>
                <ReasonTitle>Whale Participation</ReasonTitle>
                <ReasonText>
                  {whaleMetrics.uniqueWhales} unique whales actively trading.
                  {whaleMetrics.uniqueWhales > 15 ? ' High institutional interest.' : whaleMetrics.uniqueWhales > 8 ? ' Moderate whale activity.' : ' Limited institutional participation.'}
                </ReasonText>
              </ReasonContent>
            </ReasonCard>

            {sentiment.details.last6Net - sentiment.details.prev6Net !== 0 && (
              <ReasonCard>
                <ReasonIcon>
                  {sentiment.details.last6Net > sentiment.details.prev6Net ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" fill="#2ecc71"/>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6h-6z" fill="#e74c3c"/>
                    </svg>
                  )}
                </ReasonIcon>
                <ReasonContent>
                  <ReasonTitle>Recent Momentum</ReasonTitle>
                  <ReasonText>
                    {sentiment.details.last6Net > sentiment.details.prev6Net ? 'Positive' : 'Negative'} momentum shift in the last 6 hours 
                    ({formatUSD(Math.abs(sentiment.details.last6Net - sentiment.details.prev6Net))} change).
                    {Math.abs(sentiment.details.last6Net - sentiment.details.prev6Net) > 1000000 ? ' Strong trend developing.' : ' Watch for continuation.'}
                  </ReasonText>
                </ReasonContent>
              </ReasonCard>
            )}
          </ReasonsGrid>

          <OrcaButton
            onClick={handleAskOrca}
            disabled={loadingOrca}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loadingOrca ? (
              <>
                <LoadingSpinner />
                Analyzing with Orca AI...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem' }}>
                  <path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16 6.5 6.5 0 0 1 3 9.5 6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5z"/>
                </svg>
                Ask Orca for Detailed Analysis
              </>
            )}
          </OrcaButton>
          </SentimentSection>
        )}

        <CommunitySentimentSection
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <SectionTitle>Community Sentiment</SectionTitle>
          <SentimentNote>{sentimentNote}</SentimentNote>

          <SentimentStatsGrid>
            <SentimentStatCard>
              <SentimentStatLabel>🐂 Bullish</SentimentStatLabel>
              <SentimentStatValue $variant="bullish">
                {statsLoading ? '—' : `${bullishPct}%`}
              </SentimentStatValue>
              <SentimentStatSubtext>
                {statsLoading ? 'Updating...' : `${bullishCount} votes`}
              </SentimentStatSubtext>
            </SentimentStatCard>
            <SentimentStatCard>
              <SentimentStatLabel>🐻 Bearish</SentimentStatLabel>
              <SentimentStatValue $variant="bearish">
                {statsLoading ? '—' : `${bearishPct}%`}
              </SentimentStatValue>
              <SentimentStatSubtext>
                {statsLoading ? 'Updating...' : `${bearishCount} votes`}
              </SentimentStatSubtext>
            </SentimentStatCard>
            <SentimentStatCard>
              <SentimentStatLabel>Total Votes</SentimentStatLabel>
              <SentimentStatValue>
                {statsLoading ? '—' : totalVotes}
              </SentimentStatValue>
              <SentimentStatSubtext>Last 24 hours</SentimentStatSubtext>
            </SentimentStatCard>
          </SentimentStatsGrid>

          <VoteForm onSubmit={handleVoteSubmit}>
            <VoteOptions>
              {['bullish', 'bearish'].map(option => (
                <VoteToggle
                  key={option}
                  type="button"
                  $active={voteForm.vote === option}
                  disabled={voteDisabled}
                  onClick={() => {
                    if (voteDisabled) return
                    setVoteForm(prev => ({ ...prev, vote: option }))
                  }}
                >
                  {option === 'bullish' ? '🐂 Bullish' : '🐻 Bearish'}
                </VoteToggle>
              ))}
            </VoteOptions>

            <VoteInput
              placeholder="Email *"
              type="email"
              value={voteForm.email}
              disabled={voteDisabled}
              onChange={(e) => setVoteForm(prev => ({ ...prev, email: e.target.value }))}
              required
            />

            <VoteTextarea
              placeholder="Add context (optional)"
              value={voteForm.comment}
              disabled={voteDisabled}
              onChange={(e) => setVoteForm(prev => ({ ...prev, comment: e.target.value }))}
            />

            <VoteHelperText>
              {hasVoted
                ? 'You have already voted in the past 24 hours.'
                : 'One vote per email every 24 hours. Used only for sentiment analysis.'}
            </VoteHelperText>

            {voteStatus && (
              <VoteStatusMessage $type={voteStatus.type}>
                {voteStatus.message}
              </VoteStatusMessage>
            )}

            <VoteSubmitButton type="submit" disabled={voteDisabled}>
              {voteSending ? 'Submitting...' : hasVoted ? 'Vote Recorded' : 'Submit Sentiment'}
            </VoteSubmitButton>
          </VoteForm>
        </CommunitySentimentSection>

        <TransactionsSection>
          <SectionTitle>Recent Whale Transactions</SectionTitle>
          {data.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Side</th>
                  <th style={{ textAlign: 'right' }}>USD Value</th>
                  <th>Whale Score</th>
                  <th>Whale Address</th>
                  <th>Chain</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 50).map(tx => (
                  <tr key={tx.transaction_hash}>
                    <td>{new Date(tx.timestamp).toLocaleString()}</td>
                    <td>
                      <TxBadge $type={(tx.classification || '').toUpperCase()}>
                        {tx.classification || 'TRANSFER'}
                      </TxBadge>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatUSD(tx.usd_value)}
                    </td>
                    <td>
                      <span style={{ 
                        color: tx.whale_score >= 80 ? '#2ecc71' : tx.whale_score >= 60 ? '#f39c12' : 'var(--text-secondary)',
                        fontWeight: 700
                      }}>
                        {tx.whale_score || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <Link href={`/whale/${encodeURIComponent(tx.from_address || '-')}`}>
                        {tx.from_address?.slice(0, 6)}...{tx.from_address?.slice(-4)}
                      </Link>
                    </td>
                    <td>{tx.blockchain}</td>
                    <td>
                      <a href={`#`} target="_blank" rel="noopener noreferrer">
                        {tx.transaction_hash?.slice(0, 6)}...{tx.transaction_hash?.slice(-4)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: 'rgba(30, 57, 81, 0.3)',
              border: '1px solid rgba(54, 166, 186, 0.2)',
              borderRadius: '12px',
              marginTop: '1rem'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🐋</div>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 600, 
                marginBottom: '0.5rem',
                color: 'var(--text-primary)'
              }}>
                No Whale Activity Detected
              </h3>
              <p style={{ 
                fontSize: '1rem', 
                color: 'var(--text-secondary)',
                maxWidth: '500px',
                margin: '0 auto',
                lineHeight: '1.6'
              }}>
                We haven't detected any whale transactions for {symbol} in the selected time period. 
                This could mean low whale activity or that this token isn't being tracked yet.
              </p>
              <div style={{ 
                marginTop: '2rem',
                padding: '1.5rem',
                background: 'rgba(54, 166, 186, 0.1)',
                borderRadius: '8px',
                maxWidth: '600px',
                margin: '2rem auto 0'
              }}>
                <h4 style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 600, 
                  marginBottom: '1rem',
                  color: 'var(--primary)'
                }}>
                  Market Data Available
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  textAlign: 'left'
                }}>
                  {priceData?.volume24h > 0 && (
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>24h Volume</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)' }}>
                        {formatUSD(priceData.volume24h)}
                      </div>
                    </div>
                  )}
                  {priceData?.marketCap > 0 && (
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Market Cap</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)' }}>
                        {formatUSD(priceData.marketCap)}
                      </div>
                    </div>
                  )}
                  {priceData?.change24h !== undefined && (
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>24h Change</div>
                      <div style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: 600, 
                        color: priceData.change24h >= 0 ? '#2ecc71' : '#e74c3c'
                      }}>
                        {priceData.change24h >= 0 ? '+' : ''}{priceData.change24h.toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </TransactionsSection>

        {/* Orca Analysis Modal */}
        <AnimatePresence>
          {showOrcaModal && orcaAnalysis && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOrcaModal(false)}
            >
              <ModalContent
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <CloseButton onClick={() => setShowOrcaModal(false)}>×</CloseButton>
                
                <div style={{ marginBottom: '2rem' }}>
                  <h2 style={{ 
                    fontSize: '2rem', 
                    fontWeight: 800, 
                    background: 'linear-gradient(135deg, #9b59b6 0%, #36a6ba 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="url(#orcaGradient)" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="orcaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#9b59b6"/>
                          <stop offset="100%" stopColor="#36a6ba"/>
                        </linearGradient>
                      </defs>
                      <path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16 6.5 6.5 0 0 1 3 9.5 6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5z"/>
                    </svg>
                    ORCA 2.0 Analysis: {symbol}
                  </h2>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Professional Trading Intelligence • Real-Time Data
                  </div>
                </div>

                <AnalysisContent>
                  <h3>Market Sentiment</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <SentimentBadge $color={orcaAnalysis.sentiment === 'BULLISH' ? '#2ecc71' : orcaAnalysis.sentiment === 'BEARISH' ? '#e74c3c' : '#f39c12'}>
                      <span style={{ marginRight: '0.5rem' }}>●</span>{orcaAnalysis.sentiment}
                    </SentimentBadge>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Signal: <strong style={{ color: 'var(--primary)' }}>{orcaAnalysis.signal}</strong>
                    </span>
                  </div>

                  <h3>Key Metrics (Last 24h)</h3>
                  <MetricsGrid>
                    <MetricCard>
                      <MetricLabel>Total Transactions</MetricLabel>
                      <MetricValue>{orcaAnalysis.metrics.totalTxs}</MetricValue>
                    </MetricCard>
                    <MetricCard>
                      <MetricLabel>Buy Pressure</MetricLabel>
                      <MetricValue style={{ color: '#2ecc71' }}>
                        {orcaAnalysis.metrics.buyPct.toFixed(1)}%
                      </MetricValue>
                    </MetricCard>
                    <MetricCard>
                      <MetricLabel>Net Flow</MetricLabel>
                      <MetricValue style={{ color: orcaAnalysis.metrics.netFlow >= 0 ? '#2ecc71' : '#e74c3c' }}>
                        {formatUSD(orcaAnalysis.metrics.netFlow)}
                      </MetricValue>
                    </MetricCard>
                    <MetricCard>
                      <MetricLabel>Unique Whales</MetricLabel>
                      <MetricValue>{orcaAnalysis.metrics.uniqueWhales}</MetricValue>
                    </MetricCard>
                  </MetricsGrid>

                  {orcaAnalysis.insights && orcaAnalysis.insights.length > 0 && (
                    <>
                      <h3>Key Insights</h3>
                      <ReasonsGrid>
                        {orcaAnalysis.insights.map((insight, i) => (
                          <ReasonCard key={i}>
                            <ReasonIcon>{getInsightIcon(insight.icon)}</ReasonIcon>
                            <ReasonContent>
                              <ReasonTitle>{insight.title}</ReasonTitle>
                              <ReasonText>{insight.description}</ReasonText>
                            </ReasonContent>
                          </ReasonCard>
                        ))}
                      </ReasonsGrid>
                    </>
                  )}

                  {orcaAnalysis.recommendation && (
                    <>
                      <h3>Professional Trading Recommendation</h3>
                      <RecommendationCard $type={orcaAnalysis.recommendation.type}>
                        <RecType $type={orcaAnalysis.recommendation.type}>
                          {orcaAnalysis.recommendation.type === 'BUY' ? '● BUY SIGNAL' :
                           orcaAnalysis.recommendation.type === 'AVOID' ? '● AVOID / SHORT' :
                           orcaAnalysis.recommendation.type === 'WAIT' ? '● WAIT FOR CONFIRMATION' :
                           '● CAUTIOUS ENTRY'}
                        </RecType>
                        <RecConfidence>
                          Confidence: <strong>{orcaAnalysis.recommendation.confidence}</strong>
                        </RecConfidence>
                        <p><strong>Reasoning:</strong> {orcaAnalysis.recommendation.reasoning}</p>
                        <div style={{ marginTop: '1rem' }}>
                          <strong style={{ color: 'var(--primary)' }}>Action Items:</strong>
                          <ul style={{ marginTop: '0.5rem' }}>
                            {orcaAnalysis.recommendation.actions.map((action, i) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      </RecommendationCard>
                    </>
                  )}

                  {orcaAnalysis.topBuys && orcaAnalysis.topBuys.length > 0 && (
                    <>
                      <h3>Top Whale Buys</h3>
                      {orcaAnalysis.topBuys.map((buy, i) => (
                        <div key={i} style={{ 
                          background: 'rgba(46,204,113,0.1)', 
                          border: '1px solid rgba(46,204,113,0.3)',
                          borderRadius: '8px',
                          padding: '1rem',
                          marginBottom: '0.5rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#2ecc71', fontWeight: 700 }}>{formatUSD(buy.value)}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              {new Date(buy.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Whale Score: <strong>{buy.whaleScore || 'N/A'}</strong>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  <div style={{ 
                    marginTop: '2rem', 
                    padding: '1rem', 
                    background: 'rgba(155,89,182,0.1)',
                    border: '1px solid rgba(155,89,182,0.3)',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic'
                  }}>
                    <strong>Disclaimer:</strong> This analysis is generated from real-time blockchain data. 
                    Cryptocurrency markets are highly volatile. Always conduct independent research and never 
                    risk more than you can afford to lose. Past performance does not guarantee future results.
                  </div>
                </AnalysisContent>
              </ModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>
      </Container>
    </PageWrapper>
  )
}

