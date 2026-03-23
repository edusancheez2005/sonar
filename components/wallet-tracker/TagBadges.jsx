'use client'
import React, { useState } from 'react'
import styled from 'styled-components'
import { TAG_COLORS } from '@/lib/wallet-tracker'

const TAG_DESCRIPTIONS = {
  whale: 'Holds or moves extremely large positions. Typically top 0.1% by volume.',
  smart_money: 'Consistently profitable trading history with high win rate and good timing.',
  degen: 'High-frequency, high-risk trader. Often early to new tokens with large positions.',
  accumulator: 'Steadily buying and holding over time. Net inflows significantly exceed outflows.',
  distributor: 'Actively selling or distributing holdings. Net outflows exceed inflows.',
  market_maker: 'Provides liquidity with frequent two-sided trades. High volume, tight spreads.',
  institutional: 'Patterns suggest institutional or fund-level activity (large, regular, structured).',
}

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`

const BadgeWrapper = styled.span`
  position: relative;
  display: inline-block;
`

const Badge = styled.span`
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  cursor: help;
`

const Tooltip = styled.div`
  position: fixed;
  background: #1a2d42;
  border: 1px solid var(--secondary);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.45;
  width: max-content;
  max-width: 300px;
  z-index: 9999;
  pointer-events: none;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  white-space: normal;
  word-wrap: break-word;
`

function TagBadge({ tag }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = React.useRef(null)
  const style = TAG_COLORS[tag] || { bg: 'rgba(255,255,255,0.1)', color: '#fff' }
  const description = TAG_DESCRIPTIONS[tag]

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ x: rect.left + rect.width / 2, y: rect.top })
    }
    setShow(true)
  }

  return (
    <BadgeWrapper
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      <Badge $bg={style.bg} $color={style.color}>
        {tag.replace(/_/g, ' ')}
      </Badge>
      {show && description && (
        <Tooltip style={{ top: pos.y - 8, left: pos.x, transform: 'translate(-50%, -100%)' }}>
          {description}
        </Tooltip>
      )}
    </BadgeWrapper>
  )
}

export default function TagBadges({ tags }) {
  if (!tags || tags.length === 0) return null

  return (
    <BadgeRow>
      {tags.map((tag) => (
        <TagBadge key={tag} tag={tag} />
      ))}
    </BadgeRow>
  )
}
