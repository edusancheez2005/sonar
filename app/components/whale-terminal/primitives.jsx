'use client'
// Reusable terminal-styled primitives shared across every Whale
// Intelligence Terminal section (feed, entities/figures, polymarket).
// Extracted from the /statistics aesthetic (src/views/Statistics.js).
import styled, { keyframes } from 'styled-components'
import { C, FONT_MONO, FONT_SANS } from '@/app/lib/terminalTheme'

export const pulseGlow = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 4px ${C.green}; }
  50% { opacity: 0.4; box-shadow: 0 0 8px ${C.green}, 0 0 16px rgba(0, 230, 118, 0.3); }
`

export const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${C.pageBg};
  padding: 2rem;
  position: relative;

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 229, 255, 0.008) 2px, rgba(0, 229, 255, 0.008) 4px);
    pointer-events: none;
    z-index: 0;
  }

  @media (max-width: 768px) { padding: 1rem; }
`

export const Container = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`

export const PageTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
  font-family: ${FONT_MONO};
  flex-wrap: wrap;
`

export const TitleText = styled.h1`
  font-family: ${FONT_MONO};
  font-size: 0.9rem;
  font-weight: 700;
  color: ${C.cyan};
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin: 0;
  &::before { content: '> '; color: ${C.green}; font-weight: 800; }
`

export const LiveDot = styled.span`
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.7rem; font-weight: 600; color: ${C.green};
  text-transform: uppercase; letter-spacing: 1px; font-family: ${FONT_MONO};
  &::before {
    content: ''; width: 7px; height: 7px; border-radius: 50%;
    background: ${C.green}; animation: ${pulseGlow} 2s ease-in-out infinite;
  }
`

export const Panel = styled.div`
  background: ${C.panelBg};
  backdrop-filter: blur(12px);
  border: 1px solid ${C.borderSubtle};
  border-radius: 0;
  padding: 1.5rem;
  @media (max-width: 768px) { padding: 1rem; }
`

// ── Terminal panel: hairline border + mono header strip ─────────────
// The core building block of the Whale Terminal modules. Square corners,
// uppercase CLI label, optional live pulse dot and right-aligned meta.
const TermPanelFrame = styled.section`
  border: 1px solid ${C.borderSubtle};
  background: rgba(10, 14, 23, 0.72);
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const TermPanelHead = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0.42rem 0.7rem;
  border-bottom: 1px solid ${C.borderSubtle};
  background: rgba(0, 229, 255, 0.025);
  .tp-label {
    font-family: ${FONT_MONO};
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: ${C.cyan};
    display: inline-flex;
    align-items: center;
    gap: 7px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .tp-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${C.green};
    animation: ${pulseGlow} 2s ease-in-out infinite;
    flex-shrink: 0;
  }
  .tp-meta {
    font-family: ${FONT_MONO};
    font-size: 0.58rem;
    letter-spacing: 0.5px;
    color: ${C.textMuted};
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const TermPanelBody = styled.div`
  flex: 1;
  min-height: 0;
`

export function TermPanel({ label, meta, live, children, style, bodyStyle, className }) {
  return (
    <TermPanelFrame style={style} className={className}>
      <TermPanelHead>
        <span className="tp-label">
          {live ? <span className="tp-dot" aria-hidden /> : null}
          {label}
        </span>
        {meta ? <span className="tp-meta">{meta}</span> : null}
      </TermPanelHead>
      <TermPanelBody style={bodyStyle}>{children}</TermPanelBody>
    </TermPanelFrame>
  )
}

// ── KPI tile ─────────────────────────────────────────────────────────
const KpiFrame = styled.div`
  border: 1px solid ${C.borderSubtle};
  background: rgba(10, 14, 23, 0.72);
  padding: 0.55rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  .kpi-label {
    font-family: ${FONT_MONO};
    font-size: 0.56rem;
    font-weight: 700;
    letter-spacing: 1.1px;
    text-transform: uppercase;
    color: ${C.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .kpi-row { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
  .kpi-value {
    font-family: ${FONT_MONO};
    font-size: 1.14rem;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .kpi-delta { font-family: ${FONT_MONO}; font-size: 0.62rem; font-weight: 600; white-space: nowrap; }
`

export function Kpi({ label, value, delta, tone, children }) {
  const col =
    tone === 'pos' ? C.green : tone === 'neg' ? C.red : tone === 'cyan' ? C.cyan : C.textPrimary
  const deltaNeg = typeof delta === 'string' && delta.trim().startsWith('-')
  return (
    <KpiFrame>
      <span className="kpi-label">{label}</span>
      <span className="kpi-row">
        <span className="kpi-value" style={{ color: col }}>{value}</span>
        {delta ? (
          <span className="kpi-delta" style={{ color: deltaNeg ? C.red : C.green }}>{delta}</span>
        ) : null}
      </span>
      {children}
    </KpiFrame>
  )
}

// ── Filter tab strip (square, CLI-style) ─────────────────────────────
export const FilterTabs = styled.div`
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
`

export const FilterTab = styled.button`
  padding: 0.45rem 0.85rem;
  background: ${(p) => (p.$active ? 'rgba(0, 229, 255, 0.06)' : 'none')};
  border: none;
  border-right: 1px solid rgba(0, 229, 255, 0.05);
  box-shadow: ${(p) => (p.$active ? `inset 0 -2px 0 ${C.cyan}` : 'none')};
  color: ${(p) => (p.$active ? C.cyan : C.textMuted)};
  font-family: ${FONT_MONO};
  font-size: 0.6rem;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  &:hover { color: ${(p) => (p.$active ? C.cyan : C.textPrimary)}; }
`

export const PanelTitle = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap;
  h2 {
    margin: 0; font-family: ${FONT_MONO}; font-size: 0.78rem; font-weight: 700;
    color: ${C.cyan}; letter-spacing: 1.2px; text-transform: uppercase;
  }
`

export const PillInput = styled.input`
  background: ${C.inputBg};
  border: 1px solid ${C.borderSubtle};
  color: ${C.textPrimary};
  padding: 0.55rem 0.75rem;
  border-radius: 0;
  outline: none;
  transition: border-color 0.15s ease;
  font-size: 0.85rem;
  font-family: ${FONT_MONO};
  height: 36px;
  &::placeholder { color: ${C.textMuted}; opacity: 0.5; }
  &:focus { border-color: ${C.cyan}; box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.08); }
`

export const PillSelect = styled.select`
  appearance: none;
  background: ${C.inputBg};
  border: 1px solid ${C.borderSubtle};
  color: ${C.textPrimary};
  padding: 0.55rem 2rem 0.55rem 0.75rem;
  border-radius: 0;
  outline: none;
  transition: border-color 0.15s ease;
  font-size: 0.85rem;
  font-family: ${FONT_MONO};
  height: 36px;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 20 20'%3E%3Cpath fill='%2300e5ff' d='M5.5 7l4.5 6 4.5-6z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  &:focus { border-color: ${C.cyan}; box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.08); }
  option { background: ${C.pageBg}; color: ${C.textPrimary}; }
`

export const GhostButton = styled.button`
  background: transparent;
  color: ${(p) => (p.$danger ? C.red : C.cyan)};
  border: 1px solid ${(p) => (p.$danger ? 'rgba(255, 23, 68, 0.2)' : C.borderSubtle)};
  border-radius: 0;
  padding: 0.4rem 0.85rem;
  font-weight: 600;
  font-size: 0.75rem;
  font-family: ${FONT_MONO};
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex; align-items: center; gap: 0.4rem;

  &:hover { border-color: ${(p) => (p.$danger ? 'rgba(255, 23, 68, 0.4)' : 'rgba(0, 229, 255, 0.3)')}; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  svg { width: 14px; height: 14px; }
`

export const DataTable = styled.div`
  width: 100%; overflow-x: auto;
  table { width: 100%; border-collapse: collapse; font-family: ${FONT_MONO}; }
  thead th {
    padding: 0.75rem 1rem; text-align: left; font-size: 0.7rem; font-weight: 600;
    color: ${C.textMuted}; text-transform: uppercase; letter-spacing: 1px;
    border-bottom: 1px solid rgba(0, 229, 255, 0.06); background: rgba(0, 229, 255, 0.02);
    white-space: nowrap; font-family: ${FONT_SANS};
  }
  thead th.right { text-align: right; }
  tbody tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    transition: background 0.15s ease; cursor: default;
  }
  tbody tr:hover { background: rgba(0, 229, 255, 0.04); }
  tbody td {
    padding: 0.65rem 1rem; font-size: 0.8rem; color: ${C.textPrimary}; white-space: nowrap;
  }
  tbody td.right { text-align: right; }
  tbody td.muted { color: ${C.textMuted}; }
  a { color: ${C.cyan}; text-decoration: none; font-weight: 600; }
  a:hover { text-decoration: underline; }
`

export const Badge = styled.span`
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 0;
  font-weight: 600;
  font-size: 0.7rem;
  font-family: ${FONT_MONO};
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &.buy, &.in { color: ${C.green}; background: rgba(0, 230, 118, 0.08); border: 1px solid rgba(0, 230, 118, 0.12); }
  &.sell, &.out { color: ${C.red}; background: rgba(255, 23, 68, 0.08); border: 1px solid rgba(255, 23, 68, 0.12); }
  &.transfer { color: ${C.cyan}; background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.12); }
  &.defi, &.neutral { color: ${C.amber}; background: rgba(255, 171, 0, 0.08); border: 1px solid rgba(255, 171, 0, 0.12); }
`

export const ChainBadge = styled.span`
  display: inline-block;
  padding: 0.18rem 0.45rem;
  border-radius: 0;
  font-weight: 600;
  font-size: 0.65rem;
  font-family: ${FONT_MONO};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${C.textMuted};
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
`

// Muted notice block used for empty / loading / error states.
export const Notice = styled.div`
  text-align: center;
  padding: 2.5rem 1rem;
  font-family: ${FONT_MONO};
  font-size: 0.82rem;
  color: ${C.textMuted};
  border: 1px dashed ${C.borderSubtle};
  border-radius: 0;
  background: rgba(0, 229, 255, 0.015);
`

export const ErrorNotice = styled(Notice)`
  color: ${C.red};
  border-color: rgba(255, 23, 68, 0.2);
  background: rgba(255, 23, 68, 0.03);
`
