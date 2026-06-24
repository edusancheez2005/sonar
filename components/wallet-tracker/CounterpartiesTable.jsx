'use client'
import React from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { shortenAddress, formatUsd } from '@/lib/wallet-tracker'

const Card = styled.div`
  position: relative;
  background: linear-gradient(180deg, rgba(13, 33, 52, 0.72) 0%, rgba(8, 16, 25, 0.62) 100%);
  border: 1px solid var(--neon-border);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.04);
`

const Title = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.74rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 1.4px;
  font-weight: 700;
  color: var(--neon-bright);
  margin-bottom: 1rem;

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--neon-cyan);
    box-shadow: 0 0 10px var(--neon-glow);
  }
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
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontSize: '0.85rem' }}>
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
