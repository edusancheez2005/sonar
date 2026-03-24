'use client'
import React from 'react'
import styled from 'styled-components'

const Card = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  margin-bottom: 1.5rem;
`

const WarningIcon = styled.div`
  margin-bottom: 0.75rem;
  color: #e67e22;
`

const Message = styled.p`
  color: #e67e22;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`

const RetryBtn = styled.button`
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  border: 1px solid #e67e22;
  background: rgba(230, 126, 34, 0.1);
  color: #e67e22;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(230, 126, 34, 0.2);
  }
`

export default function ErrorCard({ message = 'Failed to load this section', onRetry }) {
  return (
    <Card>
      <WarningIcon>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M16 3L2 29h28L16 3z" stroke="currentColor" strokeWidth="2" fill="rgba(230,126,34,0.1)" />
          <text x="16" y="24" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="700">!</text>
        </svg>
      </WarningIcon>
      <Message>{message}</Message>
      {onRetry && <RetryBtn onClick={onRetry}>Retry</RetryBtn>}
    </Card>
  )
}
