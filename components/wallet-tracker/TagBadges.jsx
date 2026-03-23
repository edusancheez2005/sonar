'use client'
import React from 'react'
import styled from 'styled-components'
import { TAG_COLORS } from '@/lib/wallet-tracker'

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
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
`

export default function TagBadges({ tags }) {
  if (!tags || tags.length === 0) return null

  return (
    <BadgeRow>
      {tags.map((tag) => {
        const style = TAG_COLORS[tag] || { bg: 'rgba(255,255,255,0.1)', color: '#fff' }
        return (
          <Badge key={tag} $bg={style.bg} $color={style.color}>
            {tag.replace(/_/g, ' ')}
          </Badge>
        )
      })}
    </BadgeRow>
  )
}
