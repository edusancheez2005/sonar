/**
 * SONAR Marketing — HTML Template Renderer
 * 
 * Generates Canva-style marketing images from HTML templates.
 * Uses Puppeteer to render HTML → PNG at exact social media dimensions.
 * 
 * Usage:
 *   node scripts/marketing/templates.js --type daily-brief --data '{"topWhale":"0x1234","amount":"$2.4M","token":"ETH"}'
 *   node scripts/marketing/templates.js --type whale-alert --data '{"address":"0xabc","amount":"$5M","token":"BTC","direction":"IN"}'
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── TEMPLATE DEFINITIONS ──────────────────────────────────────

const TEMPLATES = {

  // ━━━ DAILY BRIEF ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  'daily-brief': (data) => `
    <html>
    <head><style>
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: 1080px; height: 1080px;
        background: linear-gradient(160deg, #0a0a0f 0%, #0d1117 40%, #0a1628 100%);
        font-family: 'Inter', sans-serif; color: #e6edf3;
        display: flex; flex-direction: column; padding: 60px;
        position: relative; overflow: hidden;
      }
      .grid-bg {
        position: absolute; inset: 0;
        background-image: 
          linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px);
        background-size: 40px 40px;
      }
      .glow { position: absolute; width: 400px; height: 400px; border-radius: 50%;
        background: radial-gradient(circle, rgba(0,255,136,0.08) 0%, transparent 70%);
        top: -100px; right: -100px; }
      .header { display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 40px; position: relative; z-index: 1; }
      .logo { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700;
        color: #00ff88; letter-spacing: 3px; }
      .date { font-family: 'JetBrains Mono', monospace; font-size: 16px; color: #7d8590; }
      .title { font-size: 42px; font-weight: 700; margin-bottom: 12px;
        background: linear-gradient(135deg, #fff 0%, #00ff88 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        position: relative; z-index: 1; }
      .subtitle { font-size: 18px; color: #7d8590; margin-bottom: 48px; position: relative; z-index: 1; }
      .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
        flex: 1; position: relative; z-index: 1; }
      .stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(0,255,136,0.15);
        border-radius: 16px; padding: 28px; display: flex; flex-direction: column; gap: 8px; }
      .stat-label { font-size: 13px; color: #7d8590; text-transform: uppercase; letter-spacing: 2px;
        font-family: 'JetBrains Mono', monospace; }
      .stat-value { font-size: 36px; font-weight: 700; color: #fff; }
      .stat-value.green { color: #00ff88; }
      .stat-value.red { color: #ff4757; }
      .stat-sub { font-size: 14px; color: #7d8590; }
      .footer { display: flex; justify-content: space-between; align-items: center;
        margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06);
        position: relative; z-index: 1; }
      .cta { font-size: 16px; color: #00ff88; font-family: 'JetBrains Mono', monospace; }
      .tag { font-size: 13px; color: #7d8590; }
    </style></head>
    <body>
      <div class="grid-bg"></div>
      <div class="glow"></div>
      <div class="header">
        <div class="logo">▲ SONAR</div>
        <div class="date">${data.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
      </div>
      <div class="title">Daily Whale Brief</div>
      <div class="subtitle">24-hour whale activity intelligence report</div>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-label">Whale Transactions</div>
          <div class="stat-value">${data.txCount || '247'}</div>
          <div class="stat-sub">${data.txChange || '+18%'} vs yesterday</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Volume Moved</div>
          <div class="stat-value green">${data.volume || '$1.2B'}</div>
          <div class="stat-sub">across ${data.tokenCount || '43'} tokens</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Top Whale Move</div>
          <div class="stat-value">${data.topMove || '$24.5M ETH'}</div>
          <div class="stat-sub">${data.topDirection || 'Exchange → Cold Wallet'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Market Sentiment</div>
          <div class="stat-value ${(data.sentimentColor) || 'green'}">${data.sentiment || 'BULLISH'}</div>
          <div class="stat-sub">Confidence: ${data.confidence || '78'}%</div>
        </div>
      </div>
      <div class="footer">
        <div class="cta">sonar-app.vercel.app</div>
        <div class="tag">#CryptoWhales #WhaleAlert #Sonar</div>
      </div>
    </body></html>`,

  // ━━━ WHALE ALERT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  'whale-alert': (data) => `
    <html>
    <head><style>
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: 1080px; height: 1080px;
        background: linear-gradient(160deg, #0a0a0f 0%, #1a0a0a 40%, #0d1117 100%);
        font-family: 'Inter', sans-serif; color: #e6edf3;
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; text-align: center;
        position: relative; overflow: hidden;
      }
      .pulse { position: absolute; width: 600px; height: 600px; border-radius: 50%;
        border: 1px solid rgba(255,71,87,0.1); top: 50%; left: 50%;
        transform: translate(-50%,-50%); }
      .pulse:nth-child(2) { width: 500px; height: 500px; border-color: rgba(255,71,87,0.15); }
      .pulse:nth-child(3) { width: 400px; height: 400px; border-color: rgba(255,71,87,0.2); }
      .alert-badge { background: rgba(255,71,87,0.15); border: 1px solid rgba(255,71,87,0.4);
        border-radius: 30px; padding: 8px 24px; font-family: 'JetBrains Mono', monospace;
        font-size: 14px; color: #ff4757; letter-spacing: 3px; text-transform: uppercase;
        margin-bottom: 32px; position: relative; z-index: 1; }
      .icon { font-size: 72px; margin-bottom: 24px; position: relative; z-index: 1; }
      .amount { font-size: 72px; font-weight: 700; color: #fff;
        margin-bottom: 12px; position: relative; z-index: 1; }
      .token { font-size: 32px; font-weight: 600; color: #ff4757;
        margin-bottom: 32px; position: relative; z-index: 1; }
      .detail { font-size: 18px; color: #7d8590; line-height: 1.8;
        max-width: 600px; position: relative; z-index: 1; }
      .detail strong { color: #e6edf3; }
      .addr { font-family: 'JetBrains Mono', monospace; font-size: 14px;
        color: #7d8590; background: rgba(255,255,255,0.04);
        padding: 12px 20px; border-radius: 8px; margin-top: 32px;
        position: relative; z-index: 1; }
      .brand { position: absolute; bottom: 48px; font-family: 'JetBrains Mono', monospace;
        font-size: 18px; color: #00ff88; letter-spacing: 3px; z-index: 1; }
    </style></head>
    <body>
      <div class="pulse"></div><div class="pulse"></div><div class="pulse"></div>
      <div class="alert-badge">⚠ Whale Alert</div>
      <div class="icon">🐋</div>
      <div class="amount">${data.amount || '$5,000,000'}</div>
      <div class="token">${data.token || 'ETH'} ${data.direction === 'IN' ? 'moved to exchange' : 'moved to cold wallet'}</div>
      <div class="detail">
        A whale just moved <strong>${data.amount || '$5M'}</strong> worth of 
        <strong>${data.token || 'ETH'}</strong>.<br>
        ${data.direction === 'IN' ? 'Possible sell pressure incoming.' : 'Accumulation signal detected.'}
      </div>
      <div class="addr">${data.address || '0x1234...abcd'}</div>
      <div class="brand">▲ SONAR</div>
    </body></html>`,

  // ━━━ TOKEN SPOTLIGHT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  'token-spotlight': (data) => `
    <html>
    <head><style>
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: 1080px; height: 1350px;
        background: linear-gradient(160deg, #0a0a0f 0%, #0d1117 40%, #0a1628 100%);
        font-family: 'Inter', sans-serif; color: #e6edf3;
        display: flex; flex-direction: column; padding: 60px;
        position: relative; overflow: hidden;
      }
      .grid-bg { position: absolute; inset: 0;
        background-image: linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px);
        background-size: 40px 40px; }
      .header { display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 48px; position: relative; z-index: 1; }
      .logo { font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 700;
        color: #00ff88; letter-spacing: 3px; }
      .badge { background: rgba(0,255,136,0.12); border: 1px solid rgba(0,255,136,0.3);
        border-radius: 20px; padding: 6px 16px; font-size: 13px; color: #00ff88;
        font-family: 'JetBrains Mono', monospace; }
      .token-header { display: flex; align-items: center; gap: 20px;
        margin-bottom: 16px; position: relative; z-index: 1; }
      .token-name { font-size: 48px; font-weight: 700; }
      .token-symbol { font-size: 24px; color: #7d8590; font-family: 'JetBrains Mono', monospace; }
      .price-row { display: flex; align-items: baseline; gap: 16px;
        margin-bottom: 48px; position: relative; z-index: 1; }
      .price { font-size: 56px; font-weight: 700; }
      .change { font-size: 24px; font-weight: 600; }
      .change.up { color: #00ff88; }
      .change.down { color: #ff4757; }
      .metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;
        margin-bottom: 40px; position: relative; z-index: 1; }
      .metric { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 12px; padding: 20px; }
      .metric-label { font-size: 11px; color: #7d8590; text-transform: uppercase;
        letter-spacing: 2px; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; }
      .metric-val { font-size: 22px; font-weight: 600; }
      .section-title { font-size: 14px; color: #00ff88; text-transform: uppercase;
        letter-spacing: 3px; margin-bottom: 20px; font-family: 'JetBrains Mono', monospace;
        position: relative; z-index: 1; }
      .insight { background: rgba(0,255,136,0.04); border-left: 3px solid #00ff88;
        border-radius: 0 12px 12px 0; padding: 24px; margin-bottom: 16px;
        font-size: 18px; line-height: 1.6; color: #c9d1d9; position: relative; z-index: 1; }
      .score-bar { display: flex; align-items: center; gap: 16px; margin-top: 40px;
        position: relative; z-index: 1; }
      .score-track { flex: 1; height: 12px; background: rgba(255,255,255,0.06);
        border-radius: 6px; overflow: hidden; }
      .score-fill { height: 100%; border-radius: 6px;
        background: linear-gradient(90deg, #ff4757 0%, #ffa502 30%, #00ff88 70%, #00ff88 100%); }
      .score-num { font-size: 36px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
      .score-label { font-size: 14px; color: #7d8590; margin-top: 8px;
        font-family: 'JetBrains Mono', monospace; position: relative; z-index: 1; }
      .footer { margin-top: auto; display: flex; justify-content: space-between;
        align-items: center; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06);
        position: relative; z-index: 1; }
      .cta { color: #00ff88; font-family: 'JetBrains Mono', monospace; font-size: 15px; }
      .tags { color: #7d8590; font-size: 13px; }
    </style></head>
    <body>
      <div class="grid-bg"></div>
      <div class="header">
        <div class="logo">▲ SONAR</div>
        <div class="badge">TOKEN SPOTLIGHT</div>
      </div>
      <div class="token-header">
        <div class="token-name">${data.name || 'Ethereum'}</div>
        <div class="token-symbol">${data.symbol || 'ETH'}</div>
      </div>
      <div class="price-row">
        <div class="price">${data.price || '$3,456.78'}</div>
        <div class="change ${(data.changeDir || 'up')}">${data.change || '+5.2%'}</div>
      </div>
      <div class="metrics">
        <div class="metric"><div class="metric-label">Market Cap</div><div class="metric-val">${data.mcap || '$415B'}</div></div>
        <div class="metric"><div class="metric-label">24h Volume</div><div class="metric-val">${data.volume || '$18.2B'}</div></div>
        <div class="metric"><div class="metric-label">Whale Txns</div><div class="metric-val">${data.whaleTxns || '156'}</div></div>
        <div class="metric"><div class="metric-label">Galaxy Score</div><div class="metric-val">${data.galaxy || '72'}</div></div>
        <div class="metric"><div class="metric-label">Social Vol</div><div class="metric-val">${data.socialVol || '24.5K'}</div></div>
        <div class="metric"><div class="metric-label">Sentiment</div><div class="metric-val" style="color:${data.sentColor || '#00ff88'}">${data.sentiment || 'BULLISH'}</div></div>
      </div>
      <div class="section-title">AI Insight</div>
      <div class="insight">${data.insight || 'Whales are accumulating aggressively. Net flow shows $45M moved to cold wallets in the last 24h — a strong holder conviction signal.'}</div>
      <div class="section-title">SONAR Score</div>
      <div class="score-bar">
        <div class="score-track"><div class="score-fill" style="width:${data.score || 74}%"></div></div>
        <div class="score-num" style="color:${data.scoreColor || '#00ff88'}">${data.score || 74}</div>
      </div>
      <div class="score-label">${data.scoreLabel || 'BUY'}</div>
      <div class="footer">
        <div class="cta">sonar-app.vercel.app</div>
        <div class="tags">#${data.symbol || 'ETH'} #CryptoWhales #Sonar</div>
      </div>
    </body></html>`,

  // ━━━ WEEKLY RECAP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  'weekly-recap': (data) => `
    <html>
    <head><style>
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: 1080px; height: 1350px;
        background: linear-gradient(160deg, #0a0a0f 0%, #0d1117 40%, #0a0a2e 100%);
        font-family: 'Inter', sans-serif; color: #e6edf3;
        padding: 60px; position: relative; overflow: hidden;
      }
      .grid-bg { position: absolute; inset: 0;
        background-image: linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px);
        background-size: 40px 40px; }
      .header { display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 48px; position: relative; z-index: 1; }
      .logo { font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 700;
        color: #00ff88; letter-spacing: 3px; }
      .week { font-size: 14px; color: #7d8590; font-family: 'JetBrains Mono', monospace; }
      .title { font-size: 40px; font-weight: 700; margin-bottom: 48px;
        background: linear-gradient(135deg, #fff 0%, #6366f1 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        position: relative; z-index: 1; }
      .row { display: flex; gap: 20px; margin-bottom: 20px; position: relative; z-index: 1; }
      .big-stat { flex: 1; background: rgba(255,255,255,0.03); border: 1px solid rgba(99,102,241,0.15);
        border-radius: 16px; padding: 28px; }
      .big-stat .label { font-size: 12px; color: #7d8590; text-transform: uppercase;
        letter-spacing: 2px; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; }
      .big-stat .val { font-size: 32px; font-weight: 700; }
      .section { margin-top: 36px; position: relative; z-index: 1; }
      .section-title { font-size: 13px; color: #6366f1; text-transform: uppercase;
        letter-spacing: 3px; margin-bottom: 20px; font-family: 'JetBrains Mono', monospace; }
      .rank-item { display: flex; align-items: center; gap: 16px; padding: 16px 0;
        border-bottom: 1px solid rgba(255,255,255,0.04); }
      .rank-num { font-size: 24px; font-weight: 700; color: #6366f1; width: 40px;
        font-family: 'JetBrains Mono', monospace; }
      .rank-token { font-size: 20px; font-weight: 600; flex: 1; }
      .rank-change { font-size: 18px; font-weight: 600; font-family: 'JetBrains Mono', monospace; }
      .rank-change.up { color: #00ff88; }
      .rank-change.down { color: #ff4757; }
      .footer { margin-top: auto; display: flex; justify-content: space-between;
        align-items: center; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06);
        position: relative; z-index: 1; position: absolute; bottom: 60px; left: 60px; right: 60px; }
      .cta { color: #00ff88; font-family: 'JetBrains Mono', monospace; font-size: 15px; }
    </style></head>
    <body>
      <div class="grid-bg"></div>
      <div class="header">
        <div class="logo">▲ SONAR</div>
        <div class="week">${data.week || 'Week of Feb 10-16, 2026'}</div>
      </div>
      <div class="title">Weekly Whale Recap</div>
      <div class="row">
        <div class="big-stat"><div class="label">Total Whale Volume</div><div class="val" style="color:#00ff88">${data.totalVol || '$8.4B'}</div></div>
        <div class="big-stat"><div class="label">Transactions</div><div class="val">${data.totalTx || '1,847'}</div></div>
      </div>
      <div class="row">
        <div class="big-stat"><div class="label">Biggest Single Move</div><div class="val">${data.biggestMove || '$142M BTC'}</div></div>
        <div class="big-stat"><div class="label">Most Active Token</div><div class="val">${data.mostActive || 'ETH'}</div></div>
      </div>
      <div class="section">
        <div class="section-title">Top Whale-Moved Tokens</div>
        ${(data.topTokens || [
          { rank: 1, name: 'Bitcoin (BTC)', change: '+12.4%', dir: 'up' },
          { rank: 2, name: 'Ethereum (ETH)', change: '+8.7%', dir: 'up' },
          { rank: 3, name: 'Solana (SOL)', change: '+22.1%', dir: 'up' },
          { rank: 4, name: 'XRP', change: '-3.2%', dir: 'down' },
          { rank: 5, name: 'Cardano (ADA)', change: '+5.8%', dir: 'up' },
        ]).map(t => `
          <div class="rank-item">
            <div class="rank-num">${t.rank}</div>
            <div class="rank-token">${t.name}</div>
            <div class="rank-change ${t.dir}">${t.change}</div>
          </div>
        `).join('')}
      </div>
      <div class="footer">
        <div class="cta">sonar-app.vercel.app</div>
      </div>
    </body></html>`,

  // ━━━ PREDICTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  'prediction': (data) => `
    <html>
    <head><style>
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: 1080px; height: 1080px;
        background: linear-gradient(160deg, #0a0a0f 0%, #0d1117 50%, #0a2818 100%);
        font-family: 'Inter', sans-serif; color: #e6edf3;
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; text-align: center;
        position: relative; overflow: hidden;
      }
      .grid-bg { position: absolute; inset: 0;
        background-image: linear-gradient(rgba(0,255,136,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,136,0.02) 1px, transparent 1px);
        background-size: 40px 40px; }
      .badge { background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.3);
        border-radius: 24px; padding: 8px 20px; font-size: 13px; color: #00ff88;
        font-family: 'JetBrains Mono', monospace; letter-spacing: 2px;
        margin-bottom: 32px; z-index: 1; position: relative; }
      .token { font-size: 64px; font-weight: 700; margin-bottom: 8px; z-index: 1; position: relative; }
      .signal { font-size: 28px; font-weight: 600; margin-bottom: 40px;
        font-family: 'JetBrains Mono', monospace; z-index: 1; position: relative; }
      .signal.bullish { color: #00ff88; }
      .signal.bearish { color: #ff4757; }
      .signal.neutral { color: #ffa502; }
      .reasons { max-width: 700px; z-index: 1; position: relative; }
      .reason { display: flex; align-items: center; gap: 16px; padding: 16px 24px;
        background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 12px;
        text-align: left; font-size: 17px; color: #c9d1d9; }
      .reason-icon { font-size: 24px; flex-shrink: 0; }
      .conf { margin-top: 40px; z-index: 1; position: relative; }
      .conf-label { font-size: 13px; color: #7d8590; text-transform: uppercase;
        letter-spacing: 2px; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; }
      .conf-val { font-size: 48px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
      .brand { position: absolute; bottom: 48px; font-family: 'JetBrains Mono', monospace;
        font-size: 18px; color: #00ff88; letter-spacing: 3px; z-index: 1; }
    </style></head>
    <body>
      <div class="grid-bg"></div>
      <div class="badge">AI PREDICTION</div>
      <div class="token">${data.token || 'ETH'}</div>
      <div class="signal ${data.signalClass || 'bullish'}">${data.signal || '▲ BULLISH'}</div>
      <div class="reasons">
        ${(data.reasons || [
          { icon: '🐋', text: 'Whales accumulated $45M in the last 24h' },
          { icon: '📊', text: 'Social sentiment surged +34% this week' },
          { icon: '💰', text: 'Exchange outflows at 3-month high' },
        ]).map(r => `<div class="reason"><div class="reason-icon">${r.icon}</div><div>${r.text}</div></div>`).join('')}
      </div>
      <div class="conf">
        <div class="conf-label">Confidence</div>
        <div class="conf-val" style="color:${data.confColor || '#00ff88'}">${data.confidence || '82'}%</div>
      </div>
      <div class="brand">▲ SONAR</div>
    </body></html>`,
};

// ─── RENDERER ───────────────────────────────────────────────────

async function renderTemplate(type, data = {}, options = {}) {
  const templateFn = TEMPLATES[type];
  if (!templateFn) throw new Error(`Unknown template: ${type}. Available: ${Object.keys(TEMPLATES).join(', ')}`);

  const html = templateFn(data);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Set viewport based on template dimensions
  const isPortrait = type === 'token-spotlight' || type === 'weekly-recap';
  await page.setViewport({
    width: 1080,
    height: isPortrait ? 1350 : 1080,
    deviceScaleFactor: 2, // retina quality
  });

  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  const timestamp = Date.now();
  const filename = options.filename || `${type}-${timestamp}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  await page.screenshot({ path: outputPath, type: 'png' });
  await browser.close();

  console.log(`✅ Rendered: ${outputPath}`);
  return outputPath;
}

// ─── CLI ────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const typeIdx = args.indexOf('--type');
  const dataIdx = args.indexOf('--data');

  const type = typeIdx >= 0 ? args[typeIdx + 1] : 'daily-brief';
  const data = dataIdx >= 0 ? JSON.parse(args[dataIdx + 1]) : {};

  renderTemplate(type, data)
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { renderTemplate, TEMPLATES };
