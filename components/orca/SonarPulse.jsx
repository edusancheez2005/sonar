'use client'
/**
 * SonarPulse
 * =============================================================================
 * Three small cyan dots that pulse in sequence. Used by `OrcaConversation`
 * as the streaming indicator while the orchestrator is thinking. Replaces
 * the static "Sending" label so the user has a sense the system is alive.
 *
 * See ORCA_UNIFIED_COPILOT_PROMPT_V4.md §4.1 ("streaming shimmer, SonarPulse").
 *
 * No emojis. No images. Pure styled-components animation.
 */
import styled, { keyframes } from 'styled-components'
import { tokens } from '@/lib/ui/tokens'

const pulse = keyframes`
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
  40%           { opacity: 1;    transform: scale(1.0); }
`

const Row = styled.span`
  display: inline-flex;
  gap: 5px;
  align-items: center;
  line-height: 0;
`

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${tokens.accent};
  display: inline-block;
  animation: ${pulse} 1.2s ${tokens.ease} infinite;
  animation-delay: ${(p) => p.$delay || '0s'};
`

export default function SonarPulse({ label = 'ORCA is thinking', className }) {
  return (
    <Row
      role="status"
      aria-live="polite"
      aria-label={label}
      className={className}
      data-testid="sonar-pulse"
    >
      <Dot $delay="0s" />
      <Dot $delay="0.18s" />
      <Dot $delay="0.36s" />
    </Row>
  )
}
