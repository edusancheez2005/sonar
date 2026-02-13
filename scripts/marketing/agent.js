/**
 * SONAR Marketing — Autonomous Agent Orchestrator
 * 
 * The "brain" that runs everything on autopilot. Schedules and executes:
 *   - Daily whale briefs (screenshot + template → tweet + IG post)
 *   - Whale alert posts (triggered by big moves)
 *   - Token spotlights (weekly curated picks)
 *   - Weekly recaps
 *   - TikTok brute force repurposing
 * 
 * Usage:
 *   node scripts/marketing/agent.js           # start the autonomous agent
 *   node scripts/marketing/agent.js --once     # run one cycle and exit
 *   node scripts/marketing/agent.js --dry-run  # generate content but don't post
 */

const cron = require('node-cron');
const path = require('path');
const config = require('./config');
const { renderTemplate } = require('./templates');
const { screenshotPage, addBrandingOverlay, fetchLiveData } = require('./screenshot');
const { postToAll, generateCaption } = require('./social');
const { runPipeline: runRepurpose } = require('./repurpose');

const DRY_RUN = process.argv.includes('--dry-run');

function log(emoji, msg) {
  const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
  console.log(`[${ts}] ${emoji} ${msg}`);
}

// ─── DAILY WHALE BRIEF ─────────────────────────────────────────

async function dailyBrief() {
  log('📊', 'Generating Daily Whale Brief...');

  try {
    // 1. Fetch live data from Sonar API
    const liveData = await fetchLiveData();

    // 2. Build template data from live API response
    const templateData = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      txCount: liveData.dashboard?.whaleCount?.toString() || '247',
      txChange: '+18%',
      volume: `$${((liveData.dashboard?.totalVolume || 1200000000) / 1e9).toFixed(1)}B`,
      tokenCount: liveData.trending?.length?.toString() || '43',
      topMove: '$24.5M ETH',
      topDirection: 'Exchange → Cold Wallet',
      sentiment: liveData.dashboard?.sentiment?.label || 'BULLISH',
      sentimentColor: (liveData.dashboard?.sentiment?.label || '').includes('BEAR') ? 'red' : 'green',
      confidence: liveData.dashboard?.sentiment?.confidence?.toString() || '78',
    };

    // 3. Render the template to PNG
    const imagePath = await renderTemplate('daily-brief', templateData);
    log('✅', `Template rendered: ${imagePath}`);

    // 4. Generate caption + post
    if (!DRY_RUN) {
      await postToAll(imagePath, {
        type: 'daily-brief',
        data: templateData,
      });
      log('✅', 'Daily brief posted to all platforms');
    } else {
      const caption = await generateCaption({ type: 'daily-brief', data: templateData });
      log('🏜️', `DRY RUN — would post:\n${caption}`);
    }
  } catch (err) {
    log('❌', `Daily brief failed: ${err.message}`);
  }
}

// ─── WHALE ALERT (event-driven) ─────────────────────────────────

async function checkWhaleAlerts() {
  log('🐋', 'Checking for big whale moves...');

  try {
    const res = await fetch(`${config.siteUrl}/api/whale-alerts`);
    if (!res.ok) return;
    const data = await res.json();

    // Find recent big moves (>$1M, last 30 min)
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    const bigMoves = (data.alerts || []).filter(a => {
      const amount = parseFloat(a.usd_amount || a.amount || 0);
      const time = new Date(a.created_at || a.timestamp).getTime();
      return amount >= 1_000_000 && time >= thirtyMinAgo;
    });

    if (bigMoves.length === 0) {
      log('😴', 'No big whale moves in the last 30 min');
      return;
    }

    // Post the biggest one
    const biggest = bigMoves.sort((a, b) => 
      parseFloat(b.usd_amount || b.amount) - parseFloat(a.usd_amount || a.amount)
    )[0];

    const amount = parseFloat(biggest.usd_amount || biggest.amount);
    const templateData = {
      amount: `$${(amount / 1e6).toFixed(1)}M`,
      token: biggest.token || biggest.symbol || 'BTC',
      direction: biggest.direction || 'OUT',
      address: biggest.from_address
        ? `${biggest.from_address.slice(0, 6)}...${biggest.from_address.slice(-4)}`
        : '0x1234...abcd',
    };

    const imagePath = await renderTemplate('whale-alert', templateData);

    if (!DRY_RUN) {
      await postToAll(imagePath, {
        type: 'whale-alert',
        data: templateData,
      });
      log('✅', `Whale alert posted: ${templateData.amount} ${templateData.token}`);
    } else {
      log('🏜️', `DRY RUN — would post whale alert: ${templateData.amount} ${templateData.token}`);
    }
  } catch (err) {
    log('❌', `Whale alert check failed: ${err.message}`);
  }
}

// ─── TOKEN SPOTLIGHT (curated weekly) ───────────────────────────

async function tokenSpotlight() {
  log('🔍', 'Generating Token Spotlight...');

  try {
    // Pick a trending token
    const trendRes = await fetch(`${config.siteUrl}/api/tokens/trending`);
    const trending = trendRes.ok ? await trendRes.json() : null;
    const token = trending?.tokens?.[0] || { symbol: 'ETH', name: 'Ethereum' };

    // Get token data
    const tokenRes = await fetch(`${config.siteUrl}/api/token/price?symbol=${token.symbol}`);
    const tokenData = tokenRes.ok ? await tokenRes.json() : {};

    const price = tokenData.price || tokenData.current_price;
    const change24h = tokenData.price_change_percentage_24h || 0;

    const templateData = {
      name: token.name || token.symbol,
      symbol: token.symbol,
      price: `$${price ? Number(price).toLocaleString() : '0'}`,
      change: `${change24h >= 0 ? '+' : ''}${change24h.toFixed(1)}%`,
      changeDir: change24h >= 0 ? 'up' : 'down',
      mcap: tokenData.market_cap ? `$${(tokenData.market_cap / 1e9).toFixed(1)}B` : 'N/A',
      volume: tokenData.total_volume ? `$${(tokenData.total_volume / 1e9).toFixed(1)}B` : 'N/A',
      whaleTxns: '156',
      galaxy: tokenData.galaxy_score?.toString() || '72',
      socialVol: '24.5K',
      sentiment: change24h >= 2 ? 'BULLISH' : change24h <= -2 ? 'BEARISH' : 'NEUTRAL',
      sentColor: change24h >= 2 ? '#00ff88' : change24h <= -2 ? '#ff4757' : '#ffa502',
      score: 74,
      scoreColor: '#00ff88',
      scoreLabel: 'BUY',
      insight: `Whales are ${change24h >= 0 ? 'accumulating' : 'distributing'} ${token.symbol}. Key on-chain signals suggest ${change24h >= 0 ? 'continued upside momentum' : 'caution in the near term'}.`,
    };

    const imagePath = await renderTemplate('token-spotlight', templateData);

    if (!DRY_RUN) {
      await postToAll(imagePath, { type: 'token-spotlight', data: templateData });
      log('✅', `Token spotlight posted: ${token.symbol}`);
    } else {
      log('🏜️', `DRY RUN — would post spotlight: ${token.symbol}`);
    }
  } catch (err) {
    log('❌', `Token spotlight failed: ${err.message}`);
  }
}

// ─── WEEKLY RECAP ───────────────────────────────────────────────

async function weeklyRecap() {
  log('📈', 'Generating Weekly Recap...');

  try {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const week = `Week of ${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const templateData = { week };
    const imagePath = await renderTemplate('weekly-recap', templateData);

    if (!DRY_RUN) {
      await postToAll(imagePath, { type: 'weekly-recap', data: templateData });
      log('✅', 'Weekly recap posted');
    } else {
      log('🏜️', 'DRY RUN — would post weekly recap');
    }
  } catch (err) {
    log('❌', `Weekly recap failed: ${err.message}`);
  }
}

// ─── TIKTOK BRUTE FORCE ─────────────────────────────────────────

async function tikTokBruteForce() {
  log('📱', 'Starting TikTok brute force pipeline...');
  try {
    await runRepurpose({ post: !DRY_RUN });
    log('✅', 'TikTok pipeline complete');
  } catch (err) {
    log('❌', `TikTok pipeline failed: ${err.message}`);
  }
}

// ─── SCHEDULE ALL JOBS ──────────────────────────────────────────

function startAgent() {
  log('🤖', '═══════════════════════════════════════════════');
  log('🤖', '  SONAR Marketing Agent — ONLINE');
  log('🤖', `  Mode: ${DRY_RUN ? 'DRY RUN (no posting)' : 'LIVE'}`);
  log('🤖', '═══════════════════════════════════════════════');
  log('', '');

  // ─── Twitter schedules ───
  if (config.twitter.enabled) {
    // Daily brief at 8 AM
    cron.schedule(config.twitter.schedule.dailyBrief, dailyBrief);
    log('⏰', `Daily Brief scheduled: ${config.twitter.schedule.dailyBrief}`);

    // Whale alerts every 30 min
    cron.schedule(config.twitter.schedule.whaleAlert, checkWhaleAlerts);
    log('⏰', `Whale Alert checks: ${config.twitter.schedule.whaleAlert}`);

    // Weekly recap Monday 10 AM
    cron.schedule(config.twitter.schedule.weeklyRecap, weeklyRecap);
    log('⏰', `Weekly Recap: ${config.twitter.schedule.weeklyRecap}`);
  }

  // ─── Instagram schedules ───
  if (config.instagram.enabled) {
    // Token spotlight at noon
    cron.schedule(config.instagram.schedule.dailyPost, tokenSpotlight);
    log('⏰', `Token Spotlight: ${config.instagram.schedule.dailyPost}`);

    // Repurposed TikToks at 6 PM
    cron.schedule(config.instagram.schedule.reels, tikTokBruteForce);
    log('⏰', `TikTok Repurpose: ${config.instagram.schedule.reels}`);
  }

  log('', '');
  log('🟢', 'Agent is running. Press Ctrl+C to stop.');
  log('', 'Schedule overview:');
  log('', '  08:00  Daily Whale Brief    → Twitter + IG');
  log('', '  */30   Whale Alert Check    → Twitter + IG (if big move)');
  log('', '  12:00  Token Spotlight      → Instagram');
  log('', '  18:00  TikTok Repurpose     → IG Reels');
  log('', '  Mon 10 Weekly Recap         → Twitter + IG');
}

// ─── SINGLE RUN MODE ────────────────────────────────────────────

async function runOnce() {
  log('🤖', 'Running single cycle...\n');

  await dailyBrief();
  await checkWhaleAlerts();
  await tokenSpotlight();

  // Only weekly recap on Mondays
  if (new Date().getDay() === 1) {
    await weeklyRecap();
  }

  log('✅', 'Single cycle complete');
}

// ─── MAIN ───────────────────────────────────────────────────────

if (require.main === module) {
  if (process.argv.includes('--once')) {
    runOnce().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
  } else {
    startAgent();
  }
}

module.exports = { dailyBrief, checkWhaleAlerts, tokenSpotlight, weeklyRecap, tikTokBruteForce };
