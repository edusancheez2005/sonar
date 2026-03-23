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
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No counterparty data available</p>
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
