'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const MONO = "'JetBrains Mono', 'Fira Code', monospace"
const SANS = "'Inter', 'Segoe UI', sans-serif"
const C = { cyan: '#00e5ff', green: '#00e676', red: '#ff1744', amber: '#ffab00', muted: '#5a6a7a', text: '#e0e6ed', border: 'rgba(0,229,255,0.08)', panelBg: 'rgba(13,17,28,0.8)' }

export default function SmartMoneyPanel() {
  const [data, setData] = useState(null)

  useEffect(() => {
    const load = () => {
      fetch('/api/dashboard/smart-money').then(r => r.json()).then(d => {
        if (d?.tokens?.length > 0) setData(d)
      }).catch(() => {})
    }
    load()
    const t = setInterval(load, 120000)
    return () => clearInterval(t)
  }, [])

  if (!data?.tokens?.length) return null

  return (
    <div style={{ marginTop: '1rem', background: C.panelBg, backdropFilter: 'blur(12px)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '1rem 1.25rem', transition: 'border-color 0.2s' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span style={{ fontFamily: MONO, fontSize: '0.72rem', fontWeight: 700, color: C.cyan, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Smart Money</span>
        </div>
        <span style={{ fontSize: '0.6rem', fontFamily: MONO, color: C.muted, background: 'rgba(0,229,255,0.04)', padding: '0.1rem 0.4rem', borderRadius: '3px', border: `1px solid ${C.border}` }}>LIVE</span>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.65rem', fontFamily: MONO }}>
        <span style={{ color: C.green }}>{data.summary.bullishCount} bullish</span>
        <span style={{ color: C.muted }}>/</span>
        <span style={{ color: C.red }}>{data.summary.bearishCount} bearish</span>
        <span style={{ color: C.muted }}>/</span>
        <span style={{ color: C.muted }}>{data.summary.neutralCount} aligned</span>
      </div>

      {/* Token rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {data.tokens.slice(0, 8).map((t, i) => {
          const divColor = t.divergence > 5 ? C.green : t.divergence < -5 ? C.red : C.muted
          const smColor = t.smartMoney.longPct > 55 ? C.green : t.smartMoney.longPct < 45 ? C.red : C.amber
          const rtColor = t.retail.longPct > 55 ? C.green : t.retail.longPct < 45 ? C.red : C.amber

          return (
            <motion.div key={t.symbol} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => window.location.href = `/token/${t.symbol.toLowerCase()}`}
              style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 45px', gap: '0.4rem', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Symbol */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.text, fontFamily: MONO }}>{t.symbol}</span>
                {t.signal !== 'aligned' && (
                  <svg width="6" height="6" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill={t.signal === 'bullish_divergence' ? C.green : C.red} /></svg>
                )}
              </div>

              {/* Smart Money bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${t.smartMoney.longPct}%` }} transition={{ duration: 0.6, delay: i * 0.04 }}
                    style={{ height: '100%', borderRadius: '2px', background: smColor }} />
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 600, color: smColor, fontFamily: MONO, minWidth: '28px', textAlign: 'right' }}>{t.smartMoney.longPct}%</span>
              </div>

              {/* Retail bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${t.retail.longPct}%` }} transition={{ duration: 0.6, delay: i * 0.04 }}
                    style={{ height: '100%', borderRadius: '2px', background: rtColor }} />
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 600, color: rtColor, fontFamily: MONO, minWidth: '28px', textAlign: 'right' }}>{t.retail.longPct}%</span>
              </div>

              {/* Divergence */}
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: divColor, fontFamily: MONO, textAlign: 'right' }}>
                {t.divergence > 0 ? '+' : ''}{t.divergence}%
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Labels */}
      <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 45px', gap: '0.4rem', marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: `1px solid ${C.border}` }}>
        <span />
        <span style={{ fontSize: '0.55rem', color: C.muted, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top 20%</span>
        <span style={{ fontSize: '0.55rem', color: C.muted, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Retail</span>
        <span style={{ fontSize: '0.55rem', color: C.muted, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Gap</span>
      </div>
    </div>
  )
}
