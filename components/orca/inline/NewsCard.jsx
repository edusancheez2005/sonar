'use client'
// Card replacement for a news link inside the **News and Market Impact**
// section. Two actions: Open ↗ (new tab) and Explain → (dispatches
// orca:reask event with intent=article_explain). Degrades to plain link
// if no listener.
import React from 'react'
import { TILE } from './tileTokens'
import { logTileEvent } from './telemetryClient'

function domainOf(href) {
  try { return new URL(href).hostname.replace(/^www\./, '') } catch { return '' }
}

function pipColor(s) {
  if (s == null) return TILE.grey
  if (s > 0.15) return TILE.green
  if (s < -0.15) return TILE.red
  return TILE.grey
}

export function NewsCard({ href, title, sentiment = null, source }) {
  const display = source || domainOf(href)
  const onExplain = (e) => {
    e.preventDefault()
    logTileEvent('news_explain', { url: href })
    let handled = false
    try {
      const ev = new CustomEvent('orca:reask', { detail: { intent: 'article_explain', url: href, headline: title } })
      handled = window.dispatchEvent(ev)
    } catch {}
    if (!handled) {
      try { window.open(href, '_blank', 'noopener,noreferrer') } catch {}
    }
  }
  return (
    <span
      role="group"
      data-testid="news-card"
      style={{
        display: 'block',
        margin: '8px 0',
        padding: '10px 12px 10px 14px',
        borderLeft: `3px solid ${TILE.cyan}`,
        background: 'rgba(0,229,255,0.04)',
        borderRadius: TILE.radiusPanel,
        fontFamily: TILE.mono,
      }}
    >
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: TILE.cyan }}>{display}</span>
        <span title={sentiment != null ? `sentiment ${sentiment}` : 'sentiment unknown'}
              style={{ width: 8, height: 8, borderRadius: '50%', background: pipColor(sentiment), display: 'inline-block' }} />
      </span>
      <span style={{ display: 'block', color: '#dce8f3', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.45 }}>
        {title || href}
      </span>
      <span style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11 }}>
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: TILE.cyanText, textDecoration: 'none' }}>
          Open ↗
        </a>
        <button type="button" onClick={onExplain} style={{ all: 'unset', cursor: 'pointer', color: TILE.cyan }}>
          Explain →
        </button>
      </span>
    </span>
  )
}

export default NewsCard
