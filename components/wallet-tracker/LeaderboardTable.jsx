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

const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0.5rem 0.25rem;
  flex-wrap: wrap;
  gap: 0.75rem;
`

const PageInfo = styled.span`
  font-size: 0.82rem;
  color: var(--text-secondary);
`

const PageControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

const PageBtn = styled.button`
  min-width: 34px;
  height: 34px;
  padding: 0 0.5rem;
  border-radius: 6px;
  border: 1px solid ${({ $active }) => $active ? 'var(--primary)' : 'var(--secondary)'};
  background: ${({ $active }) => $active ? 'var(--primary)' : 'transparent'};
  color: ${({ $active }) => $active ? '#0a1621' : 'var(--text-secondary)'};
  font-size: 0.82rem;
  font-weight: ${({ $active }) => $active ? '700' : '500'};
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: var(--primary);
    color: ${({ $active }) => $active ? '#0a1621' : 'var(--primary)'};
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`

const Ellipsis = styled.span`
  color: var(--text-secondary);
  font-size: 0.82rem;
  padding: 0 0.2rem;
`

const PerPageSelect = styled.select`
  padding: 0.35rem 0.5rem;
  background: var(--background-dark);
  border: 1px solid var(--secondary);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: var(--primary);
  }
`

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = []
  pages.push(1)

  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')

  pages.push(total)
  return pages
}

export default function LeaderboardTable({ data, sortBy, sortAsc, onSortChange, page, totalPages, total, limit, onPageChange, onLimitChange }) {
  const handleSort = (field) => {
    if (onSortChange) onSortChange(field)
  }

  const renderSortArrow = (field) => {
    if (sortBy === field) return <SortArrow>{sortAsc ? '▲' : '▼'}</SortArrow>
    return null
  }

  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>No wallet data available</p>
  }

  const rankOffset = ((page || 1) - 1) * (limit || 50)
  const fromItem = rankOffset + 1
  const toItem = Math.min(rankOffset + data.length, total || data.length)
  const pageNums = getPageNumbers(page || 1, totalPages || 1)

  return (
    <>
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
                <td><Rank>{rankOffset + i + 1}</Rank></td>
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

      {totalPages > 1 && (
        <PaginationBar>
          <PageInfo>
            Showing {fromItem}–{toItem} of {total?.toLocaleString()} wallets
          </PageInfo>
          <PageControls>
            <PageBtn
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Prev
            </PageBtn>
            {pageNums.map((p, i) =>
              p === '...' ? (
                <Ellipsis key={`e${i}`}>...</Ellipsis>
              ) : (
                <PageBtn
                  key={p}
                  $active={p === page}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </PageBtn>
              )
            )}
            <PageBtn
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </PageBtn>
            <PerPageSelect value={limit} onChange={e => onLimitChange(Number(e.target.value))}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </PerPageSelect>
          </PageControls>
        </PaginationBar>
      )}
    </>
  )
}
