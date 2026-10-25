'use client'
/**
 * Layout pieces for /trending, styled from lib/ui/tokens (the same dark
 * theme as the Personal page): a page shell, cards with a header row, and a
 * dense table that drops optional columns on phones.
 */
import styled from 'styled-components'
import { T } from '@/lib/ui/tokens'

export const Page = styled.main`
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px 24px 64px;
  color: ${T.body};
  font-family: ${T.font.sans};
  @media (max-width: 760px) { padding: 16px 12px 48px; }
`
export const H1 = styled.h1`
  margin: 0 0 16px;
  font-size: 22px;
  font-weight: 600;
  color: ${T.ink};
`
export const Card = styled.section`
  margin-bottom: 16px;
  border: 1px solid ${T.hairlineStrong};
  border-radius: ${T.radius.md};
  background: ${T.surface};
  overflow: hidden;
`
export const CardHead = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 14px 16px 10px;
  h2 { margin: 0; font-size: 15px; font-weight: 600; color: ${T.ink}; }
  .right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
`
export const Note = styled.div`
  padding: 0 16px 12px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${T.muted};
  details summary { cursor: pointer; color: ${T.body}; }
  a { color: ${T.accent}; }
`
export const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: ${T.radius.sm};
  border: 1px solid ${T.hairlineStrong};
  font-size: 11.5px;
  color: ${T.body};
  white-space: nowrap;
`
export const Muted = styled.span`
  font-size: 12px;
  color: ${T.muted};
`
export const Tabs = styled.div`
  display: inline-flex;
  padding: 2px;
  border-radius: ${T.radius.md};
  border: 1px solid ${T.hairlineStrong};
  background: ${T.surface2};
  button {
    height: 26px;
    padding: 0 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: ${T.muted};
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  button[aria-selected='true'] { background: ${T.accentSoft}; color: ${T.ink}; }
`
export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th {
    padding: 8px 12px;
    text-align: left;
    font-size: 11.5px;
    font-weight: 500;
    color: ${T.muted};
    border-top: 1px solid ${T.hairline};
    border-bottom: 1px solid ${T.hairline};
    white-space: nowrap;
  }
  td {
    padding: 9px 12px;
    border-bottom: 1px solid ${T.hairline};
    color: ${T.body};
    white-space: nowrap;
  }
  tr.group td {
    padding: 10px 12px 6px;
    font-size: 11.5px;
    font-weight: 600;
    color: ${T.muted};
    border-bottom: none;
  }
  .num { text-align: right; }
  td.num { font-family: ${T.font.mono}; font-variant-numeric: tabular-nums; }
  a { color: inherit; text-decoration: none; }
  a.act { color: ${T.accent}; font-size: 12px; }
  a.act:hover, a.tok:hover { text-decoration: underline; }
  @media (max-width: 900px) { .opt { display: none; } }
  @media (max-width: 760px) {
    th, td { padding-left: 8px; padding-right: 8px; }
    .opt2 { display: none; }
  }
`
export const Split = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
  > section { margin-bottom: 0; }
`
