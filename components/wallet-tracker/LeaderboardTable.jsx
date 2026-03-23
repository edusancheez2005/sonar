'use client'
import React from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { shortenAddress, formatUsd, timeAgo } from '@/lib/wallet-tracker'
import TagBadges from './TagBadges'
import SmartMoneyScore from './SmartMoneyScore'

const TableWrapper = styled.div`
  overflow-x: auto;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--secondary);
    white-space: nowrap;
  }

  th {
    color: var(--text-secondary);
    font-weight: 500;
    font-size: 0.85rem;
    cursor: pointer;
    user-select: none;

    &:hover {
      color: var(--primary);
    }
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.02);
  }
`

const Rank = styled.span`
  color: var(--text-secondary);
  font-size: 0.85rem;
`

const AddressLink = styled(Link)`
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--primary);

  &:hover {
    color: var(--text-primary);
  }
`

const EntityName = styled.span`
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
`

const ChainBadge = styled.span`
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: rgba(54, 166, 186, 0.15);
  color: var(--primary);
  text-transform: uppercase;
`

const SortArrow = styled.span`
  margin-left: 0.3rem;
  color: var(--primary);
`

export default function LeaderboardTable({ data, sortBy, onSortChange }) {
  const handleSort = (field) => {
    if (onSortChange) onSortChange(field)
  }

  const renderSortArrow = (field) => {
    if (sortBy === field) return <SortArrow>▼</SortArrow>
    return null
  }

  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>No wallet data available</p>
  }

  return (
    <TableWrapper>
      <Table>
        <thead>
          <tr>
            <th>#</th>
            <th>Address</th>
            <th>Chain</th>
            <th onClick={() => handleSort('smart_money_score')}>
              Score{renderSortArrow('smart_money_score')}
            </th>
            <th onClick={() => handleSort('total_volume_usd_30d')}>
              30d Volume{renderSortArrow('total_volume_usd_30d')}
            </th>
            <th onClick={() => handleSort('portfolio_value_usd')}>
              Portfolio{renderSortArrow('portfolio_value_usd')}
            </th>
            <th>Tags</th>
            <th>Last Active</th>
          </tr>
        </thead>
        <tbody>
          {data.map((wallet, i) => (
            <tr key={wallet.address + (wallet.chain || '')}>
              <td><Rank>{i + 1}</Rank></td>
              <td>
                <AddressLink href={`/wallet-tracker/${encodeURIComponent(wallet.address)}`}>
                  {shortenAddress(wallet.address)}
                </AddressLink>
                {wallet.entity_name && <EntityName>{wallet.entity_name}</EntityName>}
              </td>
              <td>{wallet.chain && <ChainBadge>{wallet.chain}</ChainBadge>}</td>
              <td><SmartMoneyScore score={wallet.smart_money_score} /></td>
              <td>{formatUsd(wallet.total_volume_usd_30d)}</td>
              <td>{formatUsd(wallet.portfolio_value_usd)}</td>
              <td><TagBadges tags={wallet.tags} /></td>
              <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {timeAgo(wallet.last_active)}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableWrapper>
  )
}
