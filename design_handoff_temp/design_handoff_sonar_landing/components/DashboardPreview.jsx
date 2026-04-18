// Live product preview — a stylized dashboard screenshot mock.
// Shows what Sonar looks like inside.

function SparkLine({ points, color = '#7FE3F5', height = 40, width = 120 }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const path = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#spark-${color})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function gen(n, start, vol) {
  const out = [start];
  for (let i = 1; i < n; i++) out.push(out[i-1] * (1 + (Math.random() - 0.45) * vol));
  return out;
}

function DashboardPreview() {
  const [tab, setTab] = React.useState('whales');
  const series = React.useMemo(() => ({
    btc: gen(40, 108000, 0.01),
    eth: gen(40, 4100, 0.012),
    sol: gen(40, 248, 0.02),
  }), []);

  return (
    <div className="dashboard">
      {/* Top chrome */}
      <div className="dash-top">
        <div className="dash-traffic">
          <span /><span /><span />
        </div>
        <div className="dash-url">
          <span style={{ opacity: 0.4 }}>sonar.app</span><span style={{ opacity: 0.7 }}>/dashboard</span>
        </div>
        <div className="dash-account">
          <span className="dash-avatar" />
          <span style={{ fontSize: 11, color: 'rgba(220, 240, 250, 0.6)', fontFamily: 'var(--mono)' }}>pro</span>
        </div>
      </div>

      {/* Sidebar + content */}
      <div className="dash-body">
        <div className="dash-sidebar">
          <img src="assets/sonar-logo.png" alt="" style={{ width: 88, marginBottom: 18, opacity: 0.9 }} />
          {['Dashboard', 'Whales', 'Signals', 'News', 'Alerts', 'Portfolio', 'Settings'].map((item, i) => (
            <div key={item} className={`nav-item ${i === 0 ? 'nav-item-active' : ''}`}>
              <span className="nav-dot" />{item}
            </div>
          ))}
        </div>

        <div className="dash-main">
          {/* Stat row */}
          <div className="stat-row">
            {[
              { label: 'Tracked volume 24h', val: '$12.4B', spark: series.btc, delta: '+4.2%' },
              { label: 'Whale txns', val: '2,155', spark: series.eth, delta: '+11.8%' },
              { label: 'Signals fired', val: '94', spark: series.sol, delta: '+2.1%' },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div className="stat-val">{s.val}</div>
                    <div style={{ fontSize: 11, color: '#5DF0B0', fontFamily: 'var(--mono)' }}>{s.delta}</div>
                  </div>
                  <SparkLine points={s.spark} width={80} height={32} />
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="tabs">
            {['whales', 'signals', 'news', 'alerts'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`tab ${tab === t ? 'tab-active' : ''}`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Main chart area */}
          <div className="chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(180, 230, 245, 0.55)' }}>BTC / USD</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#E6F7FB' }}>$108,420.50 <span style={{ fontSize: 13, color: '#5DF0B0', fontFamily: 'var(--mono)', fontWeight: 400 }}>+2.41%</span></div>
              </div>
              <div style={{ display: 'flex', gap: 4, fontFamily: 'var(--mono)', fontSize: 10 }}>
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
            {/* Big chart */}
            <BigChart />
          </div>

          {/* Bottom rows */}
          <div className="bottom-grid">
            <div className="table-card">
              <div className="table-title">Top whale movements</div>
              {[
                ['0x4f…29a1', 'BTC', '1,240.5', 'Binance → Cold', '+$134M'],
                ['0x8a…02b7', 'ETH', '48,200', 'Unknown → Kraken', '+$198M'],
                ['0x21…ab39', 'SOL', '920K', 'Coinbase → Unknown', '+$228M'],
                ['0xc2…4f70', 'USDT', '55M', 'Tether Treasury', '+$55M'],
              ].map((r, i) => (
                <div key={i} className="table-row">
                  <span style={{ fontFamily: 'var(--mono)' }}>{r[0]}</span>
                  <span style={{ color: '#7FE3F5' }}>{r[1]}</span>
                  <span style={{ fontFamily: 'var(--mono)' }}>{r[2]}</span>
                  <span style={{ color: 'rgba(220, 240, 250, 0.65)' }}>{r[3]}</span>
                  <span style={{ color: '#5DF0B0', fontFamily: 'var(--mono)' }}>{r[4]}</span>
                </div>
              ))}
            </div>

            <div className="signals-card">
              <div className="table-title">Active signals</div>
              {[
                { tag: 'BUY', sym: 'SOL', txt: 'Bullish divergence · 1H', conf: 87 },
                { tag: 'WATCH', sym: 'ETH', txt: 'Large exchange inflow', conf: 64 },
                { tag: 'ALERT', sym: 'BTC', txt: 'Whale accumulation pattern', conf: 92 },
              ].map((s, i) => (
                <div key={i} className="signal-row">
                  <div style={{
                    padding: '3px 7px', borderRadius: 3, fontSize: 9, fontFamily: 'var(--mono)',
                    letterSpacing: 1, border: '1px solid rgba(125, 230, 245, 0.3)',
                    color: s.tag === 'BUY' ? '#5DF0B0' : s.tag === 'ALERT' ? '#F5A86B' : '#7FE3F5',
                    borderColor: s.tag === 'BUY' ? 'rgba(93,240,176,0.4)' : s.tag === 'ALERT' ? 'rgba(245,168,107,0.4)' : 'rgba(125,230,245,0.3)',
                  }}>{s.tag}</div>
                  <div style={{ flex: 1, fontSize: 12 }}>
                    <div style={{ color: '#E6F7FB' }}>{s.sym} <span style={{ color: 'rgba(180,230,245,0.6)' }}>· {s.txt}</span></div>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#7FE3F5' }}>{s.conf}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BigChart() {
  // Build a nice-looking candle + line chart
  const W = 720, H = 220;
  const n = 60;
  const data = React.useMemo(() => {
    let p = 104000;
    const arr = [];
    for (let i = 0; i < n; i++) {
      const open = p;
      const close = open * (1 + (Math.random() - 0.42) * 0.012);
      const high = Math.max(open, close) * (1 + Math.random() * 0.004);
      const low = Math.min(open, close) * (1 - Math.random() * 0.004);
      arr.push({ open, close, high, low });
      p = close;
    }
    return arr;
  }, []);
  const allVals = data.flatMap(d => [d.high, d.low]);
  const max = Math.max(...allVals);
  const min = Math.min(...allVals);
  const rng = max - min;
  const y = (v) => H - ((v - min) / rng) * (H - 20) - 10;
  const cw = W / n;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${i * cw + cw/2},${y(d.close)}`).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7FE3F5" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#7FE3F5" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {[0.2, 0.4, 0.6, 0.8].map(t => (
        <line key={t} x1="0" x2={W} y1={H * t} y2={H * t}
          stroke="rgba(120, 220, 240, 0.08)" strokeDasharray="2 4" />
      ))}
      {/* Candles */}
      {data.map((d, i) => {
        const up = d.close >= d.open;
        const color = up ? '#5DF0B0' : '#F5A86B';
        const cx = i * cw + cw / 2;
        return (
          <g key={i} opacity="0.85">
            <line x1={cx} x2={cx} y1={y(d.high)} y2={y(d.low)} stroke={color} strokeOpacity="0.5" />
            <rect x={i * cw + 2} y={Math.min(y(d.open), y(d.close))}
              width={cw - 4} height={Math.max(1.5, Math.abs(y(d.open) - y(d.close)))}
              fill={color} fillOpacity={up ? 0.8 : 0.5} />
          </g>
        );
      })}
      {/* Area */}
      <path d={`${linePath} L${W},${H} L0,${H} Z`} fill="url(#chart-area)" />
      <path d={linePath} fill="none" stroke="#7FE3F5" strokeWidth="1.5" />
      {/* Last dot */}
      <circle cx={(n - 1) * cw + cw / 2} cy={y(data[n - 1].close)} r="4" fill="#7FE3F5" />
      <circle cx={(n - 1) * cw + cw / 2} cy={y(data[n - 1].close)} r="8" fill="none" stroke="#7FE3F5" strokeOpacity="0.4" />
    </svg>
  );
}

window.DashboardPreview = DashboardPreview;
