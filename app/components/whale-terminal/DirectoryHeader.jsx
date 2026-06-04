'use client'
// Compact header strip used inside the terminal shell on the
// Entities / Figures directory pages: a mono subtitle line plus an
// optional right-aligned action slot.
import React from 'react'
import styled from 'styled-components'
import { C, FONT_MONO } from '@/app/lib/terminalTheme'

const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`

const Subtitle = styled.div`
  font-family: ${FONT_MONO};
  font-size: 0.74rem;
  color: ${C.textMuted};
  letter-spacing: 0.4px;
`

export default function DirectoryHeader({ subtitle, right }) {
  return (
    <Bar>
      <Subtitle>{subtitle}</Subtitle>
      {right ? <div>{right}</div> : null}
    </Bar>
  )
}
