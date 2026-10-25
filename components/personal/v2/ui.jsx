'use client'
/**
 * Shared primitives for the Personal page (v2). Colours come from
 * lib/ui/tokens.ts only. Text is sans; numbers are mono with tabular figures.
 */
import React from 'react'
import styled from 'styled-components'
import { T } from '@/lib/ui/tokens'

export const Card = styled.section`
  background: ${T.surface};
  border: 1px solid ${T.hairlineStrong};
  border-radius: ${T.radius.md};
  padding: 16px;
  min-width: 0;
`

const HeadRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  min-height: 22px;
`
const HeadTitle = styled.h2`
  margin: 0;
  font-family: ${T.font.sans};
  font-size: 14px;
  font-weight: 600;
  color: ${T.ink};
`
const HeadCount = styled.span`
  font-family: ${T.font.mono};
  font-size: 12px;
  color: ${T.muted};
`
export function SecHead({ title, count, right, as }) {
  return (
    <HeadRow>
      <HeadTitle as={as}>{title}</HeadTitle>
      {count != null && <HeadCount>{count}</HeadCount>}
      {right && <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>{right}</span>}
    </HeadRow>
  )
}

export const Muted = styled.span`
  color: ${T.muted};
`
export const Num = styled.span`
  font-family: ${T.font.mono};
  font-variant-numeric: tabular-nums;
`

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: ${T.radius.sm};
  border: 1px solid ${(p) => (p.$primary ? T.accent : T.hairlineStrong)};
  background: ${(p) => (p.$primary ? T.accent : 'transparent')};
  color: ${(p) => (p.$primary ? T.bg : T.ink)};
  font-family: ${T.font.sans};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  &:hover:not(:disabled) { border-color: ${T.accent}; }
  &:disabled { opacity: 0.5; cursor: default; }
  &:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; }
`

export const TextLink = styled.a`
  color: ${T.accent};
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  &:hover { text-decoration: underline; }
`

export const Input = styled.input`
  height: 32px;
  flex: 1;
  min-width: 0;
  padding: 0 10px;
  border-radius: ${T.radius.sm};
  border: 1px solid ${T.hairlineStrong};
  background: ${T.surface2};
  color: ${T.ink};
  font-family: ${T.font.sans};
  font-size: 13px;
  &::placeholder { color: ${T.muted}; }
  &:focus { outline: none; border-color: ${T.accent}; }
`

const AvatarBox = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${(p) => p.$size}px;
  height: ${(p) => p.$size}px;
  border-radius: ${T.radius.pill};
  overflow: hidden;
  background: ${T.surface2};
  border: 1px solid ${T.hairlineStrong};
  color: ${T.body};
  font-size: ${(p) => Math.round(p.$size * 0.38)}px;
  font-weight: 600;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`
export function Avatar({ src, name, size = 28 }) {
  const initials = String(name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <AvatarBox $size={size} aria-hidden>
      {src ? <img src={src} alt="" decoding="async" /> : initials}
    </AvatarBox>
  )
}

export function Spark({ points, tone = 'flat', width = 64, height = 20 }) {
  const pts = (points || []).filter((p) => Number.isFinite(p))
  if (pts.length < 2) return <span style={{ display: 'inline-block', width, height }} />
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const span = max - min || 1
  const d = pts.map((p, i) => `${((i / (pts.length - 1)) * width).toFixed(1)},${(height - ((p - min) / span) * (height - 2) - 1).toFixed(1)}`).join(' ')
  const color = tone === 'up' ? T.posMark : tone === 'down' ? T.negMark : T.muted
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ display: 'block', flexShrink: 0 }}>
      <polyline points={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function fmtUsd(n, signed = false) {
  const v = Number(n) || 0
  const a = Math.abs(v)
  const s = signed ? (v > 0 ? '+' : v < 0 ? '-' : '') : v < 0 ? '-' : ''
  // $1M, $4.2M, $25K: no trailing zeros.
  const short = (x, d) => String(Number(x.toFixed(d)))
  if (a >= 1e9) return `${s}$${short(a / 1e9, 2)}B`
  if (a >= 1e6) return `${s}$${short(a / 1e6, a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2)}M`
  if (a >= 1e3) return `${s}$${short(a / 1e3, a >= 1e5 ? 0 : 1)}K`
  return `${s}$${Math.round(a)}`
}

export function fmtPrice(p) {
  const v = Number(p)
  if (!Number.isFinite(v)) return '—'
  if (v >= 1000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (v >= 1) return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `$${v.toPrecision(3)}`
}

export function fmtPct(p) {
  const v = Number(p)
  if (!Number.isFinite(v)) return '—'
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
}

export function hhmmUtc(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`
}

export function timeAgo(iso, nowMs = Date.now()) {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  const m = Math.max(0, Math.round((nowMs - t) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} d ago`
}

export function toneColor(tone) {
  return tone === 'in' || tone === 'up' ? T.posText : tone === 'out' || tone === 'down' ? T.negText : T.neuText
}
