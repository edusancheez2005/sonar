'use client'

/**
 * ExperimentalBadge — applied to every UI surface that renders any signal-
 * derived directional view (composite score, derived BULLISH/BEARISH context,
 * tier sub-scores). Per PROMPT_SIGNAL_EXECUTION.md §2.2 (Workstream A
 * demote, 2026-05-24, n=4,465 verdict).
 *
 * Default tooltip is the verbatim methodology copy specified in the Opus 4.7
 * decision memo §2.2 and reproduced in PROMPT_SIGNAL_EXECUTION.md. Do not
 * paraphrase — this is the user-facing legal-safe framing.
 *
 * Design notes:
 *   - Codebase uses styled-components (no Tailwind), so the visual treatment
 *     mirrors the Tailwind class chip described in the prompt rather than
 *     using the class name directly.
 *   - Tooltip is render-on-hover via the native title attribute as a
 *     no-dependency fallback. Components that already have a tooltip system
 *     (TokenDetailClient) may pass their own tooltip implementation by
 *     wrapping <ExperimentalBadge tooltip={null} /> and rendering the prop
 *     `defaultTooltipText` themselves.
 */

import React from 'react'
import styled from 'styled-components'

export const EXPERIMENTAL_METHODOLOGY_COPY =
  "Sonar's composite aggregates whale flow, momentum, derivatives positioning, " +
  'and sentiment into a contextual score. It is a research tool, not investment ' +
  'advice. Historical accuracy has been mixed; use as input to your own analysis, ' +
  'not as a trade trigger.'

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 500;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.10);
  color: rgb(217, 119, 6);
  border: 1px solid rgba(245, 158, 11, 0.20);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1;
  cursor: help;
  user-select: none;
`

export default function ExperimentalBadge({ tooltip = EXPERIMENTAL_METHODOLOGY_COPY, label = 'Experimental' }) {
  return (
    <Chip title={tooltip || undefined} aria-label={label}>
      {label}
    </Chip>
  )
}
