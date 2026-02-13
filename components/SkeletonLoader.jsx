'use client'

import React from 'react'
import styled, { keyframes } from 'styled-components'

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
`

const SkeletonBar = styled.div`
  background: linear-gradient(90deg, rgba(0, 229, 255, 0.03) 25%, rgba(0, 229, 255, 0.06) 50%, rgba(0, 229, 255, 0.03) 75%);
  background-size: 200px 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: ${props => props.$radius || '4px'};
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '16px'};
`

const SkeletonRow = styled.div`
  display: flex;
  gap: ${props => props.$gap || '0.75rem'};
  align-items: center;
  padding: ${props => props.$padding || '0.5rem 0'};
`

const SkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(${props => props.$cols || 4}, 1fr);
  gap: ${props => props.$gap || '0'};
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(${props => props.$mobileCols || 2}, 1fr);
  }
`

const SkeletonCell = styled.div`
  padding: 1rem 1.25rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
`

export function SkeletonKPIStrip() {
  return (
    <SkeletonGrid $cols={4} $mobileCols={2} style={{
      background: 'rgba(13, 17, 28, 0.8)',
      border: '1px solid rgba(0, 229, 255, 0.08)',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '1.5rem',
    }}>
      {[0,1,2,3].map(i => (
        <SkeletonCell key={i} style={{ borderRight: i < 3 ? '1px solid rgba(0, 229, 255, 0.08)' : 'none' }}>
          <SkeletonBar $width="60px" $height="10px" />
          <SkeletonBar $width="50px" $height="28px" />
          <SkeletonBar $width="80px" $height="10px" />
        </SkeletonCell>
      ))}
    </SkeletonGrid>
  )
}

export function SkeletonBarRows({ count = 6 }) {
  return (
    <div style={{ padding: '0.5rem 0' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} $padding="0.5rem 0" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
          <SkeletonBar $width="60px" $height="14px" />
          <SkeletonBar $width="100%" $height="6px" />
          <SkeletonBar $width="60px" $height="14px" />
        </SkeletonRow>
      ))}
    </div>
  )
}

export function SkeletonMetrics({ count = 4 }) {
  return (
    <SkeletonGrid $cols={count} $mobileCols={2} style={{
      background: 'rgba(13, 17, 28, 0.8)',
      border: '1px solid rgba(0, 229, 255, 0.08)',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '1.5rem',
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCell key={i} style={{ borderRight: i < count - 1 ? '1px solid rgba(0, 229, 255, 0.08)' : 'none' }}>
          <SkeletonBar $width="80px" $height="10px" />
          <SkeletonBar $width="60px" $height="20px" />
        </SkeletonCell>
      ))}
    </SkeletonGrid>
  )
}

export function SkeletonTableRows({ count = 5, cols = 6 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} $padding="0.65rem 1rem" $gap="1rem" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonBar key={j} $width={j === 0 ? '80px' : j === cols - 1 ? '50px' : '100%'} $height="14px" />
          ))}
        </SkeletonRow>
      ))}
    </div>
  )
}

export default SkeletonBar
