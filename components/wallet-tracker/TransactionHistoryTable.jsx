'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { shortenAddress, formatUsd, timeAgo, getTxExplorerUrl } from '@/lib/wallet-tracker'

const Card = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`

const Title = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
`

const TableWrapper = styled.div`
  overflow-x: auto;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 0.6rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--secondary);
    white-space: nowrap;
    font-size: 0.85rem;
  }

  th {
    color: var(--text-secondary);
    font-weight: 500;
  }

  tr:last-child td {
    border-bottom: none;
  }
`

const TypeBadge = styled.span`
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ $type }) =>
    $type === 'BUY' ? 'rgba(54, 166, 186, 0.15)' :
    $type === 'SELL' ? 'rgba(231, 76, 60, 0.15)' :
    'rgba(52, 152, 219, 0.15)'};
  color: ${({ $type }) =>
    $type === 'BUY' ? 'var(--buy-color)' :
    $type === 'SELL' ? 'var(--sell-color)' :
    'var(--transfer-color)'};
`

const ChainBadge = styled.span`
  font-size: 0.7rem;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  background: rgba(54, 166, 186, 0.1);
  color: var(--primary);
  text-transform: uppercase;
`

const LoadMoreBtn = styled.button`
  display: block;
  width: 100%;
  padding: 0.75rem;
  margin-top: 1rem;
  background: transparent;
  border: 1px solid var(--secondary);
  border-radius: 8px;
  color: var(--primary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary);
    background: rgba(54, 166, 186, 0.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ExternalLink = styled.a`
  color: var(--primary);
  font-family: monospace;
  font-size: 0.8rem;

  &:hover {
    color: var(--text-primary);
  }
`

export default function TransactionHistoryTable({ address, chain }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const limit = 50

  const fetchTransactions = useCallback(async (currentOffset) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(currentOffset) })
      if (chain) params.set('chain', chain)
      const res = await fetch(`/api/wallet-tracker/${encodeURIComponent(address)}/transactions?${params}`)
      const json = await res.json()
      const newData = json.data || []
      if (currentOffset === 0) {
        setTransactions(newData)
      } else {
        setTransactions(prev => [...prev, ...newData])
      }
      setHasMore(newData.length === limit)
    } catch {
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [address, chain])

  useEffect(() => {
    setOffset(0)
    fetchTransactions(0)
  }, [fetchTransactions])

  const loadMore = () => {
    const newOffset = offset + limit
    setOffset(newOffset)
    fetchTransactions(newOffset)
  }

  return (
    <Card>
      <Title>Transaction History</Title>
      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <th>Chain</th>
              <th>Token</th>
              <th>USD Value</th>
              <th>Type</th>
              <th>Counterparty</th>
              <th>Time</th>
              <th>Tx</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => {
              const counterparty = tx.from_address === address ? tx.to_address : tx.from_address
              const type = (tx.classification || 'TRANSFER').toUpperCase()
              const explorerUrl = getTxExplorerUrl(tx.blockchain, tx.transaction_hash)

              return (
                <tr key={tx.transaction_hash || i}>
                  <td><ChainBadge>{tx.blockchain}</ChainBadge></td>
                  <td style={{ fontWeight: 600 }}>{tx.token_symbol || '—'}</td>
                  <td>{formatUsd(tx.usd_value)}</td>
                  <td><TypeBadge $type={type}>{type}</TypeBadge></td>
                  <td>
                    {counterparty ? (
                      <Link href={`/wallet-tracker/${encodeURIComponent(counterparty)}`}
                        style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--primary)' }}>
                        {shortenAddress(counterparty, 4)}
                      </Link>
                    ) : '—'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{timeAgo(tx.timestamp)}</td>
                  <td>
                    {explorerUrl ? (
                      <ExternalLink href={explorerUrl} target="_blank" rel="noopener noreferrer">
                        {shortenAddress(tx.transaction_hash, 4)}
                      </ExternalLink>
                    ) : '—'}
                  </td>
                </tr>
              )
            })}
            {transactions.length === 0 && !loading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem' }}>No transactions found</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem' }}>Transactions will appear here as they are indexed</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableWrapper>
      {hasMore && (
        <LoadMoreBtn onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </LoadMoreBtn>
      )}
    </Card>
  )
}
