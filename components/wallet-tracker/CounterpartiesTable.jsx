'use client'
import React from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { shortenAddress, formatUsd } from '@/lib/wallet-tracker'

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

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 0.6rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--secondary);
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

export default function CounterpartiesTable({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <Title>Top Counterparties</Title>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 0' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem' }}>No counterparty data available</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem' }}>Transaction counterparties will appear here once detected</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <Title>Top Counterparties</Title>
      <Table>
        <thead>
          <tr>
            <th>Address</th>
            <th>Transactions</th>
            <th>Total Volume</th>
          </tr>
        </thead>
        <tbody>
          {data.map((cp) => (
            <tr key={cp.address}>
              <td>
                <Link href={`/wallet-tracker/${encodeURIComponent(cp.address)}`}
                  style={{ fontFamily: 'monospace', color: 'var(--primary)', fontSize: '0.85rem' }}>
                  {cp.label || shortenAddress(cp.address)}
                </Link>
              </td>
              <td>{cp.tx_count}</td>
              <td>{formatUsd(cp.total_volume)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}
