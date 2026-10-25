'use client'
/**
 * First paint of the Personal page while the session check and the first
 * /api/personal/feed call are in flight. Same grid as the page, so nothing
 * jumps when the data arrives.
 */
import React from 'react'
import styled, { keyframes } from 'styled-components'
import { T } from '@/lib/ui/tokens'

const shimmer = keyframes`
  0% { opacity: 0.55; }
  50% { opacity: 1; }
  100% { opacity: 0.55; }
`
const Page = styled.main`
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px 24px 64px;
  @media (max-width: 760px) { padding: 16px 16px 48px; }
`
const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  @media (max-width: 1080px) { grid-template-columns: minmax(0, 1fr); }
`
const Col = styled.div`
  display: grid;
  gap: 12px;
  align-content: start;
`
const Box = styled.div`
  height: ${(p) => p.$h}px;
  border-radius: ${T.radius.md};
  border: 1px solid ${T.hairline};
  background: ${T.surface};
  animation: ${shimmer} 1.6s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`
const Bar = styled.div`
  height: 22px;
  width: ${(p) => p.$w};
  border-radius: ${T.radius.sm};
  background: ${T.surface2};
  animation: ${shimmer} 1.6s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`

export default function PersonalSkeleton() {
  return (
    <Page data-testid="personal-skeleton" aria-busy="true" aria-label="Loading your page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <Bar $w="120px" />
        <Bar $w="90px" />
      </div>
      <Grid>
        <Col>
          <Box $h={420} />
        </Col>
        <Col>
          <Box $h={200} />
          <Box $h={160} />
          <Box $h={120} />
        </Col>
      </Grid>
    </Page>
  )
}
