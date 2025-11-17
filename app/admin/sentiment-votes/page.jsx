'use client'

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import AuthGuard from '@/app/components/AuthGuard'

const Container = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  background: var(--background);
`

const Header = styled.div`
  background: linear-gradient(135deg, #0d2134 0%, #1a2f42 100%);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
`

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
`

const Subtitle = styled.p`
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
`

const FilterSection = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
`

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 8px;
  background: rgba(13, 33, 52, 0.6);
  color: var(--text-primary);
  font-size: 0.95rem;
  min-width: 200px;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`

const Select = styled.select`
  padding: 0.75rem 1rem;
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 8px;
  background: rgba(13, 33, 52, 0.6);
  color: var(--text-primary);
  font-size: 0.95rem;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--primary) 0%, #2980b9 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(54, 166, 186, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`

const StatCard = styled.div`
  background: linear-gradient(135deg, rgba(13, 33, 52, 0.8) 0%, rgba(26, 47, 66, 0.6) 100%);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
`

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const StatValue = styled.div`
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: rgba(13, 33, 52, 0.6);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 12px;
  overflow: hidden;
  
  th {
    background: rgba(13, 33, 52, 0.9);
    padding: 1rem;
    text-align: left;
    font-weight: 700;
    color: var(--text-primary);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  td {
    padding: 1rem;
    border-top: 1px solid rgba(54, 166, 186, 0.1);
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
  
  tr:hover {
    background: rgba(54, 166, 186, 0.05);
  }
`

const Badge = styled.span`
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  background: ${props => {
    if (props.type === 'bullish') return 'rgba(46, 204, 113, 0.2)'
    if (props.type === 'bearish') return 'rgba(231, 76, 60, 0.2)'
    return 'rgba(149, 165, 166, 0.2)'
  }};
  color: ${props => {
    if (props.type === 'bullish') return '#2ecc71'
    if (props.type === 'bearish') return '#e74c3c'
    return '#95a5a6'
  }};
  border: 1px solid ${props => {
    if (props.type === 'bullish') return 'rgba(46, 204, 113, 0.3)'
    if (props.type === 'bearish') return 'rgba(231, 76, 60, 0.3)'
    return 'rgba(149, 165, 166, 0.3)'
  }};
`

const ErrorMessage = styled.div`
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 8px;
  padding: 1rem;
  color: #e74c3c;
  margin-bottom: 1rem;
`

const LoadingMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  font-size: 1.1rem;
`

export default function SentimentVotesAdmin() {
  const [votes, setVotes] = useState([])
  const [aggregated, setAggregated] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    symbol: '',
    days: '7',
    limit: '100'
  })

  const fetchVotes = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (filters.symbol) params.append('symbol', filters.symbol)
      params.append('days', filters.days)
      params.append('limit', filters.limit)
      
      const res = await fetch(`/api/admin/sentiment-votes?${params}`)
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch votes')
      }
      
      setVotes(data.votes || [])
      setAggregated(data.aggregated || {})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVotes()
  }, [])

  const totalVotes = votes.length
  const uniqueTokens = Object.keys(aggregated).length
  const uniqueEmails = new Set(votes.filter(v => v.email !== 'Anonymous').map(v => v.email)).size

  return (
    <AuthGuard>
      <Container>
        <Header>
          <Title>🗳️ Sentiment Votes Admin</Title>
          <Subtitle>View and analyze community sentiment votes</Subtitle>
        </Header>

        <FilterSection>
          <Input
            type="text"
            placeholder="Token Symbol (e.g., BTC)"
            value={filters.symbol}
            onChange={(e) => setFilters({ ...filters, symbol: e.target.value.toUpperCase() })}
          />
          <Select
            value={filters.days}
            onChange={(e) => setFilters({ ...filters, days: e.target.value })}
          >
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
          <Select
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: e.target.value })}
          >
            <option value="50">50 records</option>
            <option value="100">100 records</option>
            <option value="250">250 records</option>
            <option value="500">500 records</option>
          </Select>
          <Button onClick={fetchVotes} disabled={loading}>
            {loading ? 'Loading...' : 'Apply Filters'}
          </Button>
        </FilterSection>

        {error && (
          <ErrorMessage>
            <strong>Error:</strong> {error}
          </ErrorMessage>
        )}

        <StatsGrid>
          <StatCard>
            <StatLabel>Total Votes ({filters.days}d)</StatLabel>
            <StatValue>{totalVotes}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Unique Tokens</StatLabel>
            <StatValue>{uniqueTokens}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Unique Voters</StatLabel>
            <StatValue>{uniqueEmails}</StatValue>
          </StatCard>
        </StatsGrid>

        {loading ? (
          <LoadingMessage>Loading votes...</LoadingMessage>
        ) : votes.length === 0 ? (
          <LoadingMessage>No votes found for the selected filters.</LoadingMessage>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Token</th>
                <th>Vote</th>
                <th>Email</th>
                <th>Fingerprint</th>
                <th>Comment</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {votes.map((vote) => (
                <tr key={vote.id}>
                  <td>{new Date(vote.timestamp).toLocaleString()}</td>
                  <td style={{ fontWeight: '700', color: 'var(--primary)' }}>
                    {vote.token}
                  </td>
                  <td>
                    <Badge type={vote.vote}>{vote.vote}</Badge>
                  </td>
                  <td style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '0.85rem',
                    color: vote.email === 'Anonymous' ? 'var(--text-secondary)' : 'var(--text-primary)'
                  }}>
                    {vote.email}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {vote.fingerprint || '—'}
                  </td>
                  <td style={{ maxWidth: '300px', wordWrap: 'break-word' }}>
                    {vote.comment || '—'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {vote.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Container>
    </AuthGuard>
  )
}

