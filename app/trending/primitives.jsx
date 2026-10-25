'use client'
/**
 * Layout pieces for /trending: the terminal-style panels and coin cards the
 * page used before 2026-10-25 (Eduardo prefers them to a table), grouped
 * into sections.
 */
import styled from 'styled-components'
import { FONT_SANS, FONT_MONO } from '@/src/styles/fontStacks'

export const COLORS = {
  cyan: '#00e5ff', green: '#00e676', red: '#ff1744', amber: '#ffab00',
  textPrimary: '#e0e6ed', textMuted: '#5a6a7a', textBody: '#8a9ab0',
  panelBg: 'rgba(13, 17, 28, 0.8)', borderSubtle: 'rgba(0, 229, 255, 0.08)',
}

export const Page = styled.main`
  min-height: 100vh;
  padding: 2rem;
  @media (max-width: 760px) { padding: 1rem 0.75rem 3rem; }
`
export const Container = styled.div`
  max-width: 1440px;
  margin: 0 auto;
`
export const PageTitle = styled.div`
  display: flex; align-items: baseline; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;
`
export const TitleText = styled.h1`
  font-family: ${FONT_MONO}; font-size: 0.95rem; font-weight: 700;
  color: ${COLORS.cyan}; letter-spacing: 1.5px; text-transform: uppercase; margin: 0;
  &::before { content: '> '; color: ${COLORS.green}; font-weight: 800; }
`
export const Muted = styled.span`
  font-family: ${FONT_MONO}; font-size: 0.7rem; color: ${COLORS.textMuted}; letter-spacing: 0.5px;
`
export const Panel = styled.section`
  background: ${COLORS.panelBg}; backdrop-filter: blur(12px);
  border: 1px solid ${COLORS.borderSubtle}; border-radius: 8px;
  padding: 1.5rem; margin-bottom: 1.5rem;
  @media (max-width: 760px) { padding: 1rem; }
`
export const PanelHead = styled.div`
  display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem 1rem; margin-bottom: 1.25rem;
  .right { margin-left: auto; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
`
export const TerminalPrompt = styled.h2`
  font-family: ${FONT_MONO}; font-size: 0.85rem; font-weight: 700;
  color: ${(p) => p.$color || COLORS.cyan}; letter-spacing: 1px; text-transform: uppercase;
  margin: 0; display: flex; align-items: center; gap: 0.5rem;
  &::before { content: '>'; color: ${COLORS.green}; font-weight: 800; }
`
export const Note = styled.p`
  margin: -0.5rem 0 1.1rem; font-family: ${FONT_SANS}; font-size: 0.78rem; line-height: 1.5; color: ${COLORS.textMuted};
  a { color: ${COLORS.cyan}; }
`
export const FilterButton = styled.button`
  background: ${(p) => (p.$active ? 'rgba(0, 229, 255, 0.15)' : 'transparent')};
  color: ${(p) => (p.$active ? COLORS.cyan : COLORS.textMuted)};
  border: 1px solid ${(p) => (p.$active ? 'rgba(0, 229, 255, 0.3)' : COLORS.borderSubtle)};
  border-radius: 4px; padding: 0.35rem 0.75rem; font-size: 0.72rem;
  font-weight: 600; font-family: ${FONT_MONO}; cursor: pointer;
  transition: all 0.15s ease;
  &:hover { border-color: rgba(0, 229, 255, 0.2); color: ${COLORS.textPrimary}; }
`
export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
`
export const CoinCard = styled.a`
  display: block;
  background: rgba(0, 229, 255, 0.02);
  border: 1px solid ${COLORS.borderSubtle};
  border-radius: 6px; padding: 1.15rem 1.25rem; text-decoration: none;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
  &:hover { border-color: rgba(0, 229, 255, 0.18); background: rgba(0, 229, 255, 0.04); transform: translateY(-1px); }
  &:focus-visible { outline: 2px solid ${COLORS.cyan}; outline-offset: 2px; }
`
export const CoinHeader = styled.div`
  display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;
`
export const CoinInfo = styled.div`flex: 1; min-width: 0;`
export const CoinName = styled.div`
  font-size: 0.95rem; font-weight: 700; color: ${COLORS.textPrimary};
  font-family: ${FONT_SANS}; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`
export const CoinSymbol = styled.div`
  font-size: 0.72rem; color: ${COLORS.textMuted}; text-transform: uppercase;
  font-family: ${FONT_MONO}; letter-spacing: 0.5px;
`
export const Rank = styled.div`
  background: rgba(0, 229, 255, 0.08); color: ${COLORS.cyan};
  padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.7rem;
  font-weight: 700; font-family: ${FONT_MONO};
  border: 1px solid rgba(0, 229, 255, 0.12);
`
export const CoinMetrics = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;
`
export const Metric = styled.div`display: flex; flex-direction: column; gap: 2px; min-width: 0;`
export const MetricLabel = styled.div`
  font-size: 0.6rem; color: ${COLORS.textMuted}; text-transform: uppercase;
  letter-spacing: 1.5px; font-family: ${FONT_SANS}; font-weight: 600;
`
export const MetricValue = styled.div`
  font-size: 0.9rem; font-weight: 700; color: ${(p) => p.$color || COLORS.textPrimary};
  font-family: ${FONT_MONO}; white-space: nowrap;
`
export const WhaleBadge = styled.div`
  display: inline-flex; align-items: center; gap: 0.3rem;
  font-size: 0.65rem; font-weight: 700; font-family: ${FONT_MONO};
  padding: 0.2rem 0.5rem; border-radius: 4px; margin-top: 0.8rem;
  color: ${COLORS.textBody};
  background: rgba(0, 229, 255, 0.04);
  border: 1px solid ${COLORS.borderSubtle};
  letter-spacing: 0.3px;
`
export const EmptyNote = styled.div`
  padding: 1.5rem 0; text-align: center; font-family: ${FONT_SANS}; font-size: 0.85rem; color: ${COLORS.textMuted};
`
