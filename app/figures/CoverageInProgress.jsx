'use client'
// "Coverage in progress" section for the Figures directory: curated
// figures that are approved but don't yet have verified addresses.
// Rendered as muted, non-linking cards so users can see what the
// pipeline is working on without hitting dead deeplinks.
import React from 'react'
import styled from 'styled-components'
import EntityAvatar from '@/app/components/entities/EntityAvatar'
import { categoryStyle, categoryLabel } from '@/app/lib/entityHelpers'
import { C, FONT_MONO } from '@/app/lib/terminalTheme'

const Section = styled.div`
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px dashed ${C.borderSubtle};
`

const Heading = styled.div`
  font-family: ${FONT_MONO};
  font-size: 0.72rem;
  font-weight: 700;
  color: ${C.textMuted};
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  &::before { content: '//'; color: ${C.amber}; }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.85rem;
`

const Card = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.015);
  opacity: 0.85;
`

const Name = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${C.textPrimary};
  line-height: 1.2;
  margin-bottom: 0.3rem;
  word-break: break-word;
`

const Pending = styled.span`
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-family: ${FONT_MONO};
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: ${C.amber};
  background: rgba(255, 171, 0, 0.08);
  border: 1px solid rgba(255, 171, 0, 0.18);
`

export default function CoverageInProgress({ figures = [] }) {
  if (!figures.length) return null
  return (
    <Section>
      <Heading>Coverage in progress · {figures.length}</Heading>
      <Grid>
        {figures.map((f) => {
          const style = categoryStyle(f.category)
          return (
            <Card key={f.slug}>
              <EntityAvatar
                avatarUrl={f.avatar_url}
                twitterHandle={f.twitter_handle}
                displayName={f.display_name}
                category={f.category}
                size={30}
              />
              <div style={{ minWidth: 0 }}>
                <Name>{f.display_name}</Name>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.12rem 0.4rem',
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                      borderRadius: '999px',
                      color: style.color,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      letterSpacing: '0.4px',
                      textTransform: 'capitalize',
                    }}
                  >
                    {categoryLabel(f.category)}
                  </span>
                  <Pending>Pending addresses</Pending>
                </div>
              </div>
            </Card>
          )
        })}
      </Grid>
    </Section>
  )
}
