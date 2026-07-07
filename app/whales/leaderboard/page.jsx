import React from 'react'
import { getWhaleLeaderboard } from '@/app/lib/leaderboardData'

// ISR, matching the working token page — NOT force-dynamic, which bailed the
// whole page to client-side render (empty SSR HTML). 30s cache is fine for a
// 24h rolling window and cuts DB load.
export const revalidate = 30

export const metadata = {
  title: 'Whale Leaderboard — Top Net Flow Wallets (24h)',
  description: 'See the top crypto whale wallets by 24h net USD flow, tokens traded, buy/sell balance, and Whale Score. Featuring named entities like Vitalik, Justin Sun, Wintermute.',
  alternates: { canonical: 'https://www.sonartracker.io/whales/leaderboard' }
}

// ─── Server-side formatting helpers ─────────────────────────────────────────

function fmtUsdCompact(n) {
  const num = Number(n || 0)
  const abs = Math.abs(num)
  let s
  if (abs >= 1e9) s = `$${(abs / 1e9).toFixed(2)}B`
  else if (abs >= 1e6) s = `$${(abs / 1e6).toFixed(2)}M`
  else if (abs >= 1e3) s = `$${(abs / 1e3).toFixed(1)}K`
  else s = `$${Math.round(abs).toLocaleString()}`
  return num < 0 ? `-${s}` : num > 0 ? `+${s}` : s
}

function fmtUsdPlain(n) {
  const num = Number(n || 0)
  const abs = Math.abs(num)
  if (abs >= 1e9) return `$${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `$${(abs / 1e3).toFixed(1)}K`
  return `$${Math.round(abs).toLocaleString()}`
}

function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  if (!Number.isFinite(diff) || diff < 0) return '—'
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// Deterministic avatar gradient per address, so identities are recognizable
// across visits without storing anything.
function avatarHues(str) {
  let h = 0
  for (let i = 0; i < (str || '').length; i++) h = ((h * 31) + str.charCodeAt(i)) >>> 0
  const h1 = h % 360
  const h2 = (h1 + 45 + ((h >> 8) % 70)) % 360
  return [h1, h2]
}

function monogram(row) {
  if (row.entity_name) {
    const words = row.entity_name.trim().split(/\s+/)
    return (words[0][0] + (words[1]?.[0] || words[0][1] || '')).toUpperCase()
  }
  return (row.address || '0x??').slice(2, 4).toUpperCase()
}

const C = {
  bg: '#0a0e17',
  panel: 'rgba(13, 17, 28, 0.8)',
  border: 'rgba(0, 229, 255, 0.08)',
  text: '#e0e6ed',
  muted: '#8a9ab0',
  faint: '#5a6a7a',
  cyan: '#00e5ff',
  green: '#00e676',
  red: '#ff5252',
  gold: '#f1c40f',
  mono: "var(--font-mono, ui-monospace, Menlo, monospace)",
}

const css = `
.wlb-shell { min-height: 100vh; background: ${C.bg}; padding: 2rem 2rem 4rem; }
.wlb-wrap { max-width: 1240px; margin: 0 auto; }
.wlb-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
.wlb-title { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin: 0; font-size: 1.35rem; font-weight: 650; color: ${C.text}; letter-spacing: -0.01em; }
.wlb-chip { font-family: ${C.mono}; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em; color: ${C.cyan}; background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.18); border-radius: 999px; padding: 0.22rem 0.65rem; }
.wlb-live { display: inline-flex; align-items: center; gap: 0.35rem; font-family: ${C.mono}; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em; color: ${C.green}; }
.wlb-live::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: ${C.green}; box-shadow: 0 0 8px rgba(0,230,118,0.6); }
.wlb-sub { margin: 0.4rem 0 0; font-size: 0.9rem; color: ${C.muted}; max-width: 62ch; line-height: 1.55; }
.wlb-entities { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1.1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; color: #0a1621; text-decoration: none; background: linear-gradient(135deg, #7af8ff 0%, #22d3ee 60%, #36a6ba 100%); box-shadow: 0 4px 18px rgba(34,211,238,0.22); white-space: nowrap; }
.wlb-entities:hover { filter: brightness(1.07); color: #0a1621; }
.wlb-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.9rem; margin-bottom: 1.25rem; }
@media (max-width: 860px) { .wlb-stats { grid-template-columns: repeat(2, 1fr); } }
.wlb-stat { background: ${C.panel}; border: 1px solid ${C.border}; border-radius: 10px; padding: 0.9rem 1.1rem; }
.wlb-stat .label { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${C.faint}; margin-bottom: 0.35rem; }
.wlb-stat .value { font-family: ${C.mono}; font-size: 1.3rem; font-weight: 700; color: ${C.text}; line-height: 1; }
.wlb-stat .hint { font-size: 0.72rem; color: ${C.faint}; margin-top: 0.35rem; }
.wlb-panel { background: ${C.panel}; backdrop-filter: blur(12px); border: 1px solid ${C.border}; border-radius: 12px; overflow: hidden; }
.wlb-scroll { overflow-x: auto; }
.wlb-table { width: 100%; border-collapse: collapse; margin: 0; }
.wlb-table thead th { position: static; padding: 0.7rem 1rem; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${C.faint}; text-align: left; background: rgba(0,229,255,0.03); border-bottom: 1px solid ${C.border}; white-space: nowrap; }
.wlb-table thead th.r { text-align: right; }
.wlb-table thead th.c { text-align: center; }
.wlb-table tbody tr { border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.12s ease; }
.wlb-table tbody tr:hover { background: rgba(0,229,255,0.045); }
.wlb-table tbody tr:last-child { border-bottom: none; }
.wlb-table td { padding: 0.65rem 1rem; font-size: 0.88rem; color: ${C.text}; white-space: nowrap; vertical-align: middle; border-bottom: none; }
.wlb-table td.r { text-align: right; }
.wlb-table td.c { text-align: center; }
.wlb-rank { font-family: ${C.mono}; font-size: 0.8rem; font-weight: 700; color: ${C.faint}; width: 44px; }
.wlb-rank.top1 { color: ${C.gold}; }
.wlb-rank.top2 { color: #c0c8d4; }
.wlb-rank.top3 { color: #cd7f32; }
.wlb-who { display: flex; align-items: center; gap: 0.7rem; text-decoration: none; min-width: 210px; }
.wlb-avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: ${C.mono}; font-size: 0.72rem; font-weight: 800; color: rgba(8,14,22,0.85); border: 1px solid rgba(255,255,255,0.14); }
.wlb-name { font-weight: 600; color: ${C.text}; line-height: 1.2; display: flex; align-items: center; gap: 0.4rem; }
.wlb-who:hover .wlb-name { color: ${C.cyan}; }
.wlb-name .star { color: ${C.gold}; font-size: 0.8rem; }
.wlb-cat { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${C.muted}; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; padding: 0.08rem 0.35rem; }
.wlb-addr { display: block; font-family: ${C.mono}; font-size: 0.72rem; color: ${C.faint}; margin-top: 0.15rem; }
.wlb-num { font-family: ${C.mono}; font-weight: 600; font-variant-numeric: tabular-nums; }
.wlb-pos { color: ${C.green}; }
.wlb-neg { color: ${C.red}; }
.wlb-zero { color: ${C.faint}; }
.wlb-vol { color: ${C.muted}; }
.wlb-trades { font-size: 0.7rem; color: ${C.faint}; margin-top: 0.12rem; font-family: ${C.mono}; }
.wlb-bs { display: inline-flex; flex-direction: column; align-items: flex-end; gap: 0.28rem; }
.wlb-bsbar { width: 72px; height: 5px; border-radius: 999px; overflow: hidden; display: flex; background: rgba(255,255,255,0.06); }
.wlb-bsbar .b { background: ${C.green}; height: 100%; }
.wlb-bsbar .s { background: ${C.red}; height: 100%; }
.wlb-bslabel { font-family: ${C.mono}; font-size: 0.68rem; color: ${C.faint}; }
.wlb-tokens { display: flex; gap: 0.3rem; flex-wrap: nowrap; }
.wlb-tk { font-family: ${C.mono}; font-size: 0.68rem; font-weight: 600; color: ${C.cyan}; background: rgba(0,229,255,0.06); border: 1px solid rgba(0,229,255,0.12); border-radius: 4px; padding: 0.14rem 0.4rem; }
.wlb-tk.more { color: ${C.faint}; background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
.wlb-score { display: inline-flex; align-items: center; gap: 0.45rem; justify-content: flex-end; }
.wlb-scorebar { width: 42px; height: 4px; border-radius: 999px; background: rgba(255,255,255,0.07); overflow: hidden; }
.wlb-scorebar .f { height: 100%; border-radius: 999px; }
.wlb-time { font-family: ${C.mono}; font-size: 0.78rem; color: ${C.muted}; }
.wlb-foot { padding: 0.8rem 1.25rem; font-size: 0.75rem; color: ${C.faint}; border-top: 1px solid ${C.border}; display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
@media (max-width: 980px) {
  .wlb-shell { padding: 1.25rem 1rem 3rem; }
  .wlb-hide-md { display: none; }
}
`

export default async function WhalesLeaderboardPage() {
  // Query the data directly (shared server-only function), the same pattern as
  // the token page. Importing the route handler instead bailed the whole page
  // to client-side render and served empty HTML.
  let rows = []
  try {
    rows = await getWhaleLeaderboard()
  } catch (err) {
    console.error('whales/leaderboard data load failed:', err?.message)
  }

  const totalVolume = rows.reduce((s, r) => s + Number(r.totalVolume || 0), 0)
  const totalNet = rows.reduce((s, r) => s + Number(r.netUsd || 0), 0)
  const accumulating = rows.filter(r => Number(r.netUsd || 0) > 0).length
  const distributing = rows.filter(r => Number(r.netUsd || 0) < 0).length

  return (
    <main className="wlb-shell">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="wlb-wrap">

        <div className="wlb-head">
          <div>
            <h1 className="wlb-title">
              Whale Leaderboard
              <span className="wlb-chip">24H WINDOW</span>
              <span className="wlb-live">LIVE</span>
            </h1>
            <p className="wlb-sub">
              The most active whale wallets over the last 24 hours, ranked by trading
              volume. Stablecoins and exchange-owned wallets are filtered out.
            </p>
          </div>
          <a href="/whales/entities" className="wlb-entities">View Named Entities →</a>
        </div>

        <div className="wlb-stats">
          <div className="wlb-stat">
            <div className="label">Whales Ranked</div>
            <div className="value">{rows.length}</div>
            <div className="hint">2+ trades in 24h</div>
          </div>
          <div className="wlb-stat">
            <div className="label">Combined Volume</div>
            <div className="value">{fmtUsdPlain(totalVolume)}</div>
            <div className="hint">buys + sells, non-stablecoin</div>
          </div>
          <div className="wlb-stat">
            <div className="label">Combined Net Flow</div>
            <div className="value" style={{ color: totalNet > 0 ? C.green : totalNet < 0 ? C.red : C.text }}>
              {fmtUsdCompact(totalNet)}
            </div>
            <div className="hint">{totalNet >= 0 ? 'net accumulation' : 'net distribution'}</div>
          </div>
          <div className="wlb-stat">
            <div className="label">Accumulating vs Distributing</div>
            <div className="value">
              <span style={{ color: C.green }}>{accumulating}</span>
              <span style={{ color: C.faint, fontSize: '0.9rem' }}> / </span>
              <span style={{ color: C.red }}>{distributing}</span>
            </div>
            <div className="hint">wallets net buying / net selling</div>
          </div>
        </div>

        <div className="wlb-panel">
          <div className="wlb-scroll">
            <table className="wlb-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Whale</th>
                  <th className="r">Net Flow</th>
                  <th className="r wlb-hide-md">Volume</th>
                  <th className="r wlb-hide-md">Buy / Sell</th>
                  <th className="wlb-hide-md">Tokens</th>
                  <th className="r">Score</th>
                  <th className="r">Active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const rank = idx + 1
                  const displayName = r.entity_name || `${r.address?.slice(0, 6)}…${r.address?.slice(-4)}`
                  const net = Number(r.netUsd || 0)
                  const netCls = net > 0 ? 'wlb-pos' : net < 0 ? 'wlb-neg' : 'wlb-zero'
                  const bv = Number(r.buyVolume || 0)
                  const sv = Number(r.sellVolume || 0)
                  const buyPct = bv + sv > 0 ? Math.round((bv / (bv + sv)) * 100) : null
                  const [h1, h2] = avatarHues(r.address || '')
                  const score = r.whaleScore != null ? Math.max(0, Math.min(100, Number(r.whaleScore))) : null
                  const scoreColor = score == null ? C.faint : score >= 75 ? C.green : score >= 45 ? C.cyan : C.muted
                  const tokens = r.tokens || []
                  return (
                    <tr key={`${r.address}-${idx}`}>
                      <td className={`wlb-rank ${rank === 1 ? 'top1' : rank === 2 ? 'top2' : rank === 3 ? 'top3' : ''}`}>{rank}</td>
                      <td>
                        <a className="wlb-who" href={`/wallet-tracker/${encodeURIComponent(r.address || '-')}`}>
                          <span
                            className="wlb-avatar"
                            style={{ background: `linear-gradient(135deg, hsl(${h1} 75% 62%), hsl(${h2} 70% 38%))` }}
                          >
                            {monogram(r)}
                          </span>
                          <span>
                            <span className="wlb-name">
                              {r.is_famous && <span className="star">★</span>}
                              {displayName}
                              {r.entity_name && r.entity_category && (
                                <span className="wlb-cat">{r.entity_category}</span>
                              )}
                            </span>
                            <span className="wlb-addr">
                              {r.entity_name
                                ? `${r.address?.slice(0, 8)}…${r.address?.slice(-6)}`
                                : 'Unnamed wallet'}
                            </span>
                          </span>
                        </a>
                      </td>
                      <td className={`r wlb-num ${netCls}`}>{fmtUsdCompact(net)}</td>
                      <td className="r wlb-hide-md">
                        <span className="wlb-num wlb-vol">{fmtUsdPlain(r.totalVolume)}</span>
                        <div className="wlb-trades">{r.tradeCount} trades</div>
                      </td>
                      <td className="r wlb-hide-md">
                        {buyPct == null ? (
                          <span className="wlb-zero wlb-num">—</span>
                        ) : (
                          <span className="wlb-bs">
                            <span className="wlb-bsbar">
                              <span className="b" style={{ width: `${buyPct}%` }} />
                              <span className="s" style={{ width: `${100 - buyPct}%` }} />
                            </span>
                            <span className="wlb-bslabel">{buyPct}% buys</span>
                          </span>
                        )}
                      </td>
                      <td className="wlb-hide-md">
                        <span className="wlb-tokens">
                          {tokens.slice(0, 3).map(t => (
                            <span key={t} className="wlb-tk">{t}</span>
                          ))}
                          {tokens.length > 3 && (
                            <span className="wlb-tk more">+{tokens.length - 3}</span>
                          )}
                        </span>
                      </td>
                      <td className="r">
                        <span className="wlb-score">
                          {score != null && (
                            <span className="wlb-scorebar">
                              <span className="f" style={{ width: `${score}%`, background: scoreColor }} />
                            </span>
                          )}
                          <span className="wlb-num" style={{ color: scoreColor, fontSize: '0.8rem' }}>
                            {score != null ? score : '—'}
                          </span>
                        </span>
                      </td>
                      <td className="r">
                        <span className="wlb-time" title={r.lastSeen || ''}>{timeAgo(r.lastSeen)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="wlb-foot">
            <span>Ranked by 24h buy + sell volume · refreshes about every 30 seconds</span>
            <span>Click any whale to open its full profile</span>
          </div>
        </div>

      </div>
    </main>
  )
}
