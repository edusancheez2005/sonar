/**
 * SONAR Marketing — Automated Screenshot Capture
 * 
 * Takes screenshots of live Sonar pages + renders them into branded marketing images.
 * Pulls real data from the API and feeds it into templates.
 * 
 * Usage:
 *   node scripts/marketing/screenshot.js                    # all pages
 *   node scripts/marketing/screenshot.js --page dashboard   # specific page
 *   node scripts/marketing/screenshot.js --branded          # screenshot + overlay branding
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const OUTPUT_DIR = path.join(__dirname, 'output', 'screenshots');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── TAKE A SCREENSHOT OF A LIVE PAGE ───────────────────────────

async function screenshotPage(browser, pageConfig, options = {}) {
  const page = await browser.newPage();
  const { viewport } = config.screenshots;

  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 2,
  });

  // Set dark mode preference (our app is terminal-themed)
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'dark' },
  ]);

  const url = `${config.siteUrl}${pageConfig.path}`;
  console.log(`📸 Navigating to ${url}...`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for dynamic content to load
    await new Promise(r => setTimeout(r, 3000));

    // If a selector is specified, screenshot just that element
    let screenshotOptions = { type: 'png' };
    if (pageConfig.selector && !options.fullPage) {
      try {
        const element = await page.$(pageConfig.selector);
        if (element) {
          screenshotOptions.clip = await element.boundingBox();
        }
      } catch (e) {
        console.log(`  ⚠ Selector ${pageConfig.selector} not found, using full page`);
      }
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${pageConfig.name}-${timestamp}.png`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    screenshotOptions.path = outputPath;
    await page.screenshot(screenshotOptions);

    console.log(`  ✅ Saved: ${outputPath}`);
    await page.close();

    return outputPath;
  } catch (err) {
    console.error(`  ❌ Failed: ${err.message}`);
    await page.close();
    return null;
  }
}

// ─── ADD BRANDING OVERLAY TO SCREENSHOT ─────────────────────────

async function addBrandingOverlay(browser, screenshotPath) {
  const imageData = fs.readFileSync(screenshotPath);
  const base64 = imageData.toString('base64');
  const ext = path.extname(screenshotPath).slice(1);

  const page = await browser.newPage();

  const html = `
    <html><head><style>
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { position: relative; display: inline-block; }
      img { display: block; max-width: 1080px; }
      .overlay {
        position: absolute; bottom: 0; left: 0; right: 0;
        background: linear-gradient(transparent, rgba(0,0,0,0.85));
        padding: 40px 32px 24px;
        display: flex; justify-content: space-between; align-items: flex-end;
      }
      .brand { font-family: 'JetBrains Mono', monospace; font-size: 22px;
        font-weight: 700; color: #00ff88; letter-spacing: 3px; }
      .cta { font-family: 'JetBrains Mono', monospace; font-size: 14px;
        color: rgba(255,255,255,0.7); }
      .top-bar {
        position: absolute; top: 0; left: 0; right: 0;
        background: linear-gradient(rgba(0,0,0,0.6), transparent);
        padding: 16px 24px; display: flex; justify-content: space-between;
      }
      .live { font-family: 'JetBrains Mono', monospace; font-size: 12px;
        color: #00ff88; display: flex; align-items: center; gap: 6px; }
      .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #00ff88; }
    </style></head>
    <body>
      <img src="data:image/${ext};base64,${base64}" />
      <div class="top-bar">
        <div class="live"><span class="live-dot"></span> LIVE DATA</div>
      </div>
      <div class="overlay">
        <div class="brand">▲ SONAR</div>
        <div class="cta">sonar-app.vercel.app</div>
      </div>
    </body></html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);

  const body = await page.$('body');
  const box = await body.boundingBox();

  const brandedPath = screenshotPath.replace('.png', '-branded.png');
  await page.screenshot({
    path: brandedPath,
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
  });

  await page.close();
  console.log(`  🏷️  Branded: ${brandedPath}`);
  return brandedPath;
}

// ─── FETCH LIVE DATA FOR TEMPLATES ──────────────────────────────

async function fetchLiveData() {
  try {
    const baseUrl = config.siteUrl;

    // Fetch dashboard data
    const dashRes = await fetch(`${baseUrl}/api/dashboard`);
    const dashboard = dashRes.ok ? await dashRes.json() : null;

    // Fetch whale alerts
    const whaleRes = await fetch(`${baseUrl}/api/whale-alerts`);
    const whales = whaleRes.ok ? await whaleRes.json() : null;

    // Fetch trending
    const trendRes = await fetch(`${baseUrl}/api/tokens/trending`);
    const trending = trendRes.ok ? await trendRes.json() : null;

    return { dashboard, whales, trending };
  } catch (err) {
    console.log('⚠ Could not fetch live data, using defaults');
    return {};
  }
}

// ─── MAIN ───────────────────────────────────────────────────────

async function run() {
  const args = process.argv.slice(2);
  const pageFilter = args.includes('--page') ? args[args.indexOf('--page') + 1] : null;
  const branded = args.includes('--branded');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const pages = pageFilter
    ? config.screenshots.pages.filter(p => p.name === pageFilter)
    : config.screenshots.pages;

  if (pages.length === 0) {
    console.error(`❌ No page found matching: ${pageFilter}`);
    console.log(`Available: ${config.screenshots.pages.map(p => p.name).join(', ')}`);
    await browser.close();
    process.exit(1);
  }

  const results = [];
  for (const pageConfig of pages) {
    const screenshotPath = await screenshotPage(browser, pageConfig);
    if (screenshotPath) {
      results.push(screenshotPath);
      if (branded) {
        const brandedPath = await addBrandingOverlay(browser, screenshotPath);
        results.push(brandedPath);
      }
    }
  }

  await browser.close();

  console.log(`\n📦 Generated ${results.length} images in ${OUTPUT_DIR}`);
  return results;
}

if (require.main === module) {
  run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}

module.exports = { screenshotPage, addBrandingOverlay, fetchLiveData };
