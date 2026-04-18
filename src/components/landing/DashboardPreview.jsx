'use client'
import React, { useState, useMemo } from 'react'
import styled from 'styled-components'

/* ── helpers ── */
function gen(n, start, vol) {
  const out = [start]
  for (let i = 1; i < n; i++) out.push(out[i - 1] * (1 + (Math.random() - 0.45) * vol))
  return out
}

/* ── SparkLine ── */
function SparkLine({ points, color = '#7FE3F5', height = 40, width = 120 }) {
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const id = `spark-${color.replace('#', '')}-${width}`
  const path = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width
    const y = height - ((p - min) / range) * height
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}

/* ── BigChart ── */
function BigChart() {
  const W = 720, H = 220, n = 60
  const data = useMemo(() => {
    let p = 104000
    const arr = []
    for (let i = 0; i < n; i++) {
      const open = p
      const close = open * (1 + (Math.random() - 0.42) * 0.012)
      const high = Math.max(open, close) * (1 + Math.random() * 0.004)
      const low = Math.min(open, close) * (1 - Math.random() * 0.004)
      arr.push({ open, close, high, low })
      p = close
    }
    return arr
  }, [])

  const allVals = data.flatMap(d => [d.high, d.low])
  const max = Math.max(...allVals)
  const min = Math.min(...allVals)
  const rng = max - min
  const y = (v) => H - ((v - min) / rng) * (H - 20) - 10
  const cw = W / n

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${i * cw + cw / 2},${y(d.close)}`).join(' ')

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7FE3F5" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#7FE3F5" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.2, 0.4, 0.6, 0.8].map(t => (
        <line key={t} x1="0" x2={W} y1={H * t} y2={H * t}
          stroke="rgba(120, 220, 240, 0.08)" strokeDasharray="2 4" />
      ))}
      {data.map((d, i) => {
        const up = d.close >= d.open
        const color = up ? '#5DF0B0' : '#F5A86B'
        const ccx = i * cw + cw / 2
        return (
          <g key={i} opacity="0.85">
            <line x1={ccx} x2={ccx} y1={y(d.high)} y2={y(d.low)} stroke={color} strokeOpacity="0.5" />
            <rect x={i * cw + 2} y={Math.min(y(d.open), y(d.close))}
              width={cw - 4} height={Math.max(1.5, Math.abs(y(d.open) - y(d.close)))}
              fill={color} fillOpacity={up ? 0.8 : 0.5} />
          </g>
        )
      })}
      <path d={`${linePath} L${W},${H} L0,${H} Z`} fill="url(#chart-area)" />
      <path d={linePath} fill="none" stroke="#7FE3F5" strokeWidth="1.5" />
      <circle cx={(n - 1) * cw + cw / 2} cy={y(data[n - 1].close)} r="4" fill="#7FE3F5" />
      <circle cx={(n - 1) * cw + cw / 2} cy={y(data[n - 1].close)} r="8" fill="none" stroke="#7FE3F5" strokeOpacity="0.4" />
    </svg>
  )
}

/* ── styled ── */
const Wrap = styled.div`
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: #071320;
  border: 1px solid rgba(120, 220, 240, 0.18);
  box-shadow: 0 80px 160px -40px rgba(0, 0, 0, 0.8), 0 0 120px -20px rgba(125, 230, 245, 0.15);
  max-width: 1280px;
  margin: 0 auto;
`

const TopChrome = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20px;
  padding: 14px 18px;
  background: rgba(5, 12, 20, 0.9);
  border-bottom: 1px solid var(--landing-border, rgba(120, 220, 240, 0.14));
`

const Traffic = styled.div`
  display: flex; gap: 8px;
  span { width: 10px; height: 10px; border-radius: 50%; background: rgba(120, 220, 240, 0.2); }
  span:nth-child(2) { background: rgba(120, 220, 240, 0.35); }
  span:nth-child(3) { background: rgba(125, 230, 245, 0.6); }
`

const UrlBar = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: rgba(220, 240, 250, 0.6);
  text-align: center;
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(8, 20, 32, 0.8);
  border: 1px solid var(--landing-border, rgba(120, 220, 240, 0.14));
  max-width: 280px;
  margin: 0 auto;
`

const Account = styled.div`
  display: flex; align-items: center; gap: 8px;
`

const Avatar = styled.span`
  width: 24px; height: 24px; border-radius: 50%;
  background: linear-gradient(135deg, #7FE3F5, #4EC5DB);
`

const Body = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  min-height: 560px;
  @media (max-width: 880px) { grid-template-columns: 1fr; }
`

const Sidebar = styled.div`
  padding: 20px 14px;
  border-right: 1px solid var(--landing-border, rgba(120, 220, 240, 0.14));
  background: rgba(5, 12, 20, 0.4);
  @media (max-width: 880px) { display: none; }
`

const NavItem = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 6px;
  font-size: 12px;
  color: ${({ $active }) => $active ? '#7FE3F5' : 'rgba(220, 240, 250, 0.6)'};
  background: ${({ $active }) => $active ? 'rgba(125, 230, 245, 0.12)' : 'transparent'};
  margin-bottom: 2px; cursor: pointer;
  &:hover { background: rgba(125, 230, 245, 0.06); }
`

const NavDot = styled.span`
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor;
  opacity: ${({ $active }) => $active ? 1 : 0.5};
  ${({ $active }) => $active && 'box-shadow: 0 0 6px #7FE3F5;'}
`

const Main = styled.div`
  padding: 20px;
  display: flex; flex-direction: column; gap: 16px;
`

const StatRow = styled.div`
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`

const StatCard = styled.div`
  padding: 14px; border-radius: 10px;
  background: rgba(8, 20, 32, 0.7);
  border: 1px solid var(--landing-border, rgba(120, 220, 240, 0.14));
`

const StatLabel = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; letter-spacing: 1.4px;
  text-transform: uppercase;
  color: rgba(180, 230, 245, 0.4);
  margin-bottom: 10px;
`

const StatVal = styled.div`
  font-size: 22px; font-weight: 600;
  color: #E6F7FB;
  letter-spacing: -0.01em;
`

const Tabs = styled.div`
  display: flex; gap: 4px;
  border-bottom: 1px solid var(--landing-border, rgba(120, 220, 240, 0.14));
`

const Tab = styled.div`
  background: transparent; border: none; cursor: default;
  padding: 10px 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 1.4px;
  color: ${({ $active }) => $active ? '#7FE3F5' : 'rgba(180, 230, 245, 0.4)'};
  border-bottom: 2px solid ${({ $active }) => $active ? '#7FE3F5' : 'transparent'};
  margin-bottom: -1px;
`

const ChartCard = styled.div`
  padding: 18px; border-radius: 10px;
  background: rgba(8, 20, 32, 0.7);
  border: 1px solid var(--landing-border, rgba(120, 220, 240, 0.14));
`

const BottomGrid = styled.div`
  display: grid; grid-template-columns: 1.3fr 1fr; gap: 12px;
  @media (max-width: 880px) { grid-template-columns: 1fr; }
`

const TableCard = styled.div`
  padding: 14px; border-radius: 10px;
  background: rgba(8, 20, 32, 0.7);
  border: 1px solid var(--landing-border, rgba(120, 220, 240, 0.14));
`

const TableTitle = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 1.4px;
  text-transform: uppercase;
  color: rgba(180, 230, 245, 0.4);
  margin-bottom: 10px;
`

const TableRow = styled.div`
  display: grid; grid-template-columns: 90px 50px 80px 1fr auto;
  align-items: center; gap: 10px;
  padding: 7px 4px;
  font-size: 11px;
  border-bottom: 1px solid rgba(120, 220, 240, 0.06);
  color: #E6F7FB;
  &:last-child { border-bottom: none; }
  @media (max-width: 640px) {
    grid-template-columns: 1fr 1fr 1fr;
    span:nth-child(4) { display: none; }
  }
`

const SignalRow = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid rgba(120, 220, 240, 0.06);
  &:last-child { border-bottom: none; }
`

/* ── component ── */
const SIDEBAR_ITEMS = ['Dashboard', 'Whales', 'Signals', 'News', 'Alerts', 'Portfolio', 'Settings']

const WHALES = [
  ['0x4f…29a1', 'BTC', '1,240.5', 'Binance → Cold', '+$134M'],
  ['0x8a…02b7', 'ETH', '48,200', 'Unknown → Kraken', '+$198M'],
  ['0x21…ab39', 'SOL', '920K', 'Coinbase → Unknown', '+$228M'],
  ['0xc2…4f70', 'USDT', '55M', 'Tether Treasury', '+$55M'],
]

const SIGNALS = [
  { tag: 'BUY', sym: 'SOL', txt: 'Bullish divergence · 1H', conf: 87 },
  { tag: 'WATCH', sym: 'ETH', txt: 'Large exchange inflow', conf: 64 },
  { tag: 'ALERT', sym: 'BTC', txt: 'Whale accumulation pattern', conf: 92 },
]

export default function DashboardPreview() {
  const [tab, setTab] = useState('whales')

  const series = useMemo(() => ({
    btc: gen(40, 108000, 0.01),
    eth: gen(40, 4100, 0.012),
    sol: gen(40, 248, 0.02),
  }), [])

  return (
    <Wrap>
      {/* Top chrome */}
      <TopChrome>
        <Traffic><span /><span /><span /></Traffic>
        <UrlBar>
          <span style={{ opacity: 0.4 }}>sonar.app</span>
          <span style={{ opacity: 0.7 }}>/dashboard</span>
        </UrlBar>
        <Account>
          <Avatar />
          <span style={{ fontSize: 11, color: 'rgba(220, 240, 250, 0.6)', fontFamily: "'JetBrains Mono', monospace" }}>pro</span>
        </Account>
      </TopChrome>

      <Body>
        {/* Sidebar */}
        <Sidebar>
          <img src="/assets/sonar-logo.png" alt="" style={{ width: 88, marginBottom: 18, opacity: 0.9 }} />
          {SIDEBAR_ITEMS.map((item, i) => (
            <NavItem key={item} $active={i === 0}>
              <NavDot $active={i === 0} />{item}
            </NavItem>
          ))}
        </Sidebar>

        <Main>
          {/* Stat row */}
          <StatRow>
            {[
              { label: 'Tracked volume 24h', val: '$12.4B', spark: series.btc, delta: '+4.2%' },
              { label: 'Whale txns', val: '2,155', spark: series.eth, delta: '+11.8%' },
              { label: 'Signals fired', val: '94', spark: series.sol, delta: '+2.1%' },
            ].map((s, i) => (
              <StatCard key={i}>
                <StatLabel>{s.label}</StatLabel>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <StatVal>{s.val}</StatVal>
                    <div style={{ fontSize: 11, color: '#5DF0B0', fontFamily: "'JetBrains Mono', monospace" }}>{s.delta}</div>
                  </div>
                  <SparkLine points={s.spark} width={80} height={32} />
                </div>
              </StatCard>
            ))}
          </StatRow>

          {/* Tabs */}
          <Tabs>
            {['whales', 'signals', 'news', 'alerts'].map(t => (
              <Tab key={t} $active={tab === t}>
                {t.toUpperCase()}
              </Tab>
            ))}
          </Tabs>

          {/* Chart */}
          <ChartCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(180, 230, 245, 0.55)' }}>BTC / USD</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#E6F7FB' }}>
                  $108,420.50{' '}
                  <span style={{ fontSize: 13, color: '#5DF0B0', fontFamily: "'JetBrains Mono', monospace", fontWeight: 400 }}>+2.41%</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                {['1H', '24H', '7D', '30D', 'ALL'].map((r, i) => (
                  <span key={r} style={{
                    padding: '4px 10px', borderRadius: 4,
                    background: i === 1 ? 'rgba(125, 230, 245, 0.14)' : 'transparent',
                    color: i === 1 ? '#7FE3F5' : 'rgba(180, 230, 245, 0.5)',
                    cursor: 'pointer',
                  }}>{r}</span>
                ))}
              </div>
            </div>
            <BigChart />
          </ChartCard>

          {/* Bottom grid */}
          <BottomGrid>
            <TableCard>
              <TableTitle>Top whale movements</TableTitle>
              {WHALES.map((r, i) => (
                <TableRow key={i}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{r[0]}</span>
                  <span style={{ color: '#7FE3F5' }}>{r[1]}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{r[2]}</span>
                  <span style={{ color: 'rgba(220, 240, 250, 0.65)' }}>{r[3]}</span>
                  <span style={{ color: '#5DF0B0', fontFamily: "'JetBrains Mono', monospace" }}>{r[4]}</span>
                </TableRow>
              ))}
            </TableCard>

            <TableCard>
              <TableTitle>Active signals</TableTitle>
              {SIGNALS.map((s, i) => (
                <SignalRow key={i}>
                  <div style={{
                    padding: '3px 7px', borderRadius: 3, fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: 1,
                    border: `1px solid ${s.tag === 'BUY' ? 'rgba(93,240,176,0.4)' : s.tag === 'ALERT' ? 'rgba(245,168,107,0.4)' : 'rgba(125,230,245,0.3)'}`,
                    color: s.tag === 'BUY' ? '#5DF0B0' : s.tag === 'ALERT' ? '#F5A86B' : '#7FE3F5',
                  }}>{s.tag}</div>
                  <div style={{ flex: 1, fontSize: 12 }}>
                    <div style={{ color: '#E6F7FB' }}>{s.sym} <span style={{ color: 'rgba(180,230,245,0.6)' }}>· {s.txt}</span></div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#7FE3F5' }}>{s.conf}%</div>
                </SignalRow>
              ))}
            </TableCard>
          </BottomGrid>
        </Main>
      </Body>
    </Wrap>
  )
}
