'use client'
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const Card = styled(motion.div)`
  background: linear-gradient(135deg, rgba(26, 40, 56, 0.9) 0%, rgba(15, 25, 38, 0.95) 100%);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  margin-top: 1.5rem;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  
  span {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
`

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(54, 166, 186, 0.15);
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const LiveDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2ecc71;
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }
`

const AlertsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(54, 166, 186, 0.3);
    border-radius: 3px;
  }
`

const AlertItem = styled(motion.div)`
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(30, 57, 81, 0.3);
  border: 1px solid rgba(54, 166, 186, 0.1);
  border-radius: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background: rgba(54, 166, 186, 0.1);
    border-color: rgba(54, 166, 186, 0.3);
    transform: translateX(4px);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`

const TokenBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.$color || 'rgba(54, 166, 186, 0.2)'};
  font-weight: 800;
  font-size: 1rem;
  color: white;
`

const AlertInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  
  .title {
    font-weight: 600;
    font-size: 1rem;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .subtitle {
    font-size: 0.85rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`

const Amount = styled.div`
  text-align: right;
  
  .value {
    font-weight: 800;
    font-size: 1.1rem;
    color: ${props => props.$type === 'exchange_out' ? '#2ecc71' : props.$type === 'exchange_in' ? '#e74c3c' : 'var(--text-primary)'};
  }
  
  .label {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
`

const TimeAgo = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  
  svg {
    width: 64px;
    height: 64px;
    fill: rgba(54, 166, 186, 0.3);
    margin-bottom: 1rem;
  }
  
  h3 {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
  }
`

const PremiumLock = styled.div`
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(54, 166, 186, 0.1) 0%, rgba(26, 40, 56, 0.6) 100%);
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 12px;
  
  h3 {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--primary);
    margin: 0 0 0.75rem 0;
  }
  
  p {
    color: var(--text-secondary);
    margin: 0 0 1.5rem 0;
    line-height: 1.6;
  }
  
  a {
    display: inline-block;
    background: linear-gradient(135deg, #36a6ba 0%, #2d8a9a 100%);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(54, 166, 186, 0.4);
    }
  }
`

const FilterButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
  
  button {
    padding: 0.5rem 1rem;
    background: rgba(30, 57, 81, 0.3);
    border: 1px solid rgba(54, 166, 186, 0.2);
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover, &.active {
      background: rgba(54, 166, 186, 0.2);
      border-color: rgba(54, 166, 186, 0.4);
      color: var(--primary);
    }
  }
`

// Token colors for visual variety
const tokenColors = {
  BTC: 'linear-gradient(135deg, #f7931a 0%, #e67a00 100%)',
  ETH: 'linear-gradient(135deg, #627eea 0%, #4a69bd 100%)',
  USDT: 'linear-gradient(135deg, #26a17b 0%, #1a8b6b 100%)',
  USDC: 'linear-gradient(135deg, #2775ca 0%, #1e5aa8 100%)',
  XRP: 'linear-gradient(135deg, #23292f 0%, #111518 100%)',
  TRX: 'linear-gradient(135deg, #ef0027 0%, #c9001f 100%)',
  DEFAULT: 'linear-gradient(135deg, #36a6ba 0%, #2d8a9a 100%)'
}

export default function WhaleAlertsCard({ isPremium = false }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  
  useEffect(() => {
    if (!isPremium) {
      setLoading(false)
      return
    }
    
    const fetchAlerts = async () => {
      try {
        const sb = supabaseBrowser()
        const { data: { session } } = await sb.auth.getSession()
        
        if (!session?.access_token) {
          setLoading(false)
          return
        }
        
        const res = await fetch('/api/whale-alerts?limit=20&hours=24', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        if (res.ok) {
          const data = await res.json()
          setAlerts(data.data || [])
        }
      } catch (err) {
        console.error('Error fetching whale alerts:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchAlerts()
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [isPremium])
  
  const formatAmount = (value) => {
    const num = Number(value)
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
    return `$${num.toFixed(2)}`
  }
  
  const timeAgo = (timestamp) => {
    const now = Date.now()
    const then = new Date(timestamp).getTime()
    const diffMs = now - then
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffMs / 86400000)}d ago`
  }
  
  const getTransactionType = (alert) => {
    if (alert.from_owner_type === 'exchange' && alert.to_owner_type !== 'exchange') {
      return 'exchange_out' // Potential accumulation
    }
    if (alert.to_owner_type === 'exchange' && alert.from_owner_type !== 'exchange') {
      return 'exchange_in' // Potential selling
    }
    return 'transfer'
  }
  
  const getTransactionLabel = (alert) => {
    const type = getTransactionType(alert)
    if (type === 'exchange_out') return '🟢 Exchange → Wallet'
    if (type === 'exchange_in') return '🔴 Wallet → Exchange'
    if (alert.from_owner_type === 'exchange' && alert.to_owner_type === 'exchange') {
      return '↔️ Exchange → Exchange'
    }
    return '📤 Transfer'
  }
  
  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true
    if (filter === 'accumulation') return getTransactionType(alert) === 'exchange_out'
    if (filter === 'distribution') return getTransactionType(alert) === 'exchange_in'
    return true
  })
  
  if (!isPremium) {
    return (
      <Card
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Header>
          <Title>
            <svg viewBox="0 0 24 24" style={{ width: '28px', height: '28px', fill: 'var(--primary)' }}>
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm-1.06 16.88L7.4 15.34l1.42-1.42 2.12 2.12 4.24-4.24 1.42 1.42-5.66 5.66z"/>
            </svg>
            <div>
              <h2>🐋 Whale Alerts</h2>
              <span>Real-time large transactions</span>
            </div>
          </Title>
        </Header>
        
        <PremiumLock>
          <h3>🔒 Premium Feature</h3>
          <p>
            Whale Alerts track large cryptocurrency transactions ($500k+) in real-time. 
            See when whales are accumulating or distributing, powered by Whale Alert API.
          </p>
          <a href="/subscribe">Upgrade to Pro - $7.99/month</a>
        </PremiumLock>
      </Card>
    )
  }
  
  return (
    <Card
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Header>
        <Title>
          <svg viewBox="0 0 24 24" style={{ width: '28px', height: '28px', fill: 'var(--primary)' }}>
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm-1.06 16.88L7.4 15.34l1.42-1.42 2.12 2.12 4.24-4.24 1.42 1.42-5.66 5.66z"/>
          </svg>
          <div>
            <h2>🐋 Whale Alerts</h2>
            <span>Real-time large transactions</span>
          </div>
        </Title>
        <Badge>
          <LiveDot />
          LIVE
        </Badge>
      </Header>
      
      <FilterButtons>
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          All ({alerts.length})
        </button>
        <button className={filter === 'accumulation' ? 'active' : ''} onClick={() => setFilter('accumulation')}>
          🟢 Accumulation
        </button>
        <button className={filter === 'distribution' ? 'active' : ''} onClick={() => setFilter('distribution')}>
          🔴 Distribution
        </button>
      </FilterButtons>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <p>Loading whale alerts...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <EmptyState>
          <svg viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <h3>No Whale Activity</h3>
          <p>No large transactions detected in the past 24 hours matching your filter.</p>
        </EmptyState>
      ) : (
        <AlertsList>
          <AnimatePresence>
            {filteredAlerts.map((alert, idx) => {
              const type = getTransactionType(alert)
              const color = tokenColors[alert.symbol?.toUpperCase()] || tokenColors.DEFAULT
              
              return (
                <AlertItem
                  key={alert.id || idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  onClick={() => {
                    if (alert.transaction_hash && alert.blockchain) {
                      // Open block explorer
                      const explorers = {
                        ethereum: `https://etherscan.io/tx/${alert.transaction_hash}`,
                        bitcoin: `https://blockchair.com/bitcoin/transaction/${alert.transaction_hash}`,
                        tron: `https://tronscan.org/#/transaction/${alert.transaction_hash}`,
                        ripple: `https://xrpscan.com/tx/${alert.transaction_hash}`
                      }
                      const url = explorers[alert.blockchain] || `https://blockchair.com/${alert.blockchain}/transaction/${alert.transaction_hash}`
                      window.open(url, '_blank')
                    }
                  }}
                >
                  <TokenBadge $color={color}>
                    {alert.symbol?.substring(0, 4) || '?'}
                  </TokenBadge>
                  
                  <AlertInfo>
                    <div className="title">
                      {formatAmount(alert.amount)} {alert.symbol}
                    </div>
                    <div className="subtitle">
                      {getTransactionLabel(alert)} • {alert.blockchain}
                    </div>
                  </AlertInfo>
                  
                  <Amount $type={type}>
                    <div className="value">{formatAmount(alert.amount_usd)}</div>
                    <div className="label">USD Value</div>
                  </Amount>
                  
                  <TimeAgo>{timeAgo(alert.timestamp)}</TimeAgo>
                </AlertItem>
              )
            })}
          </AnimatePresence>
        </AlertsList>
      )}
    </Card>
  )
}
