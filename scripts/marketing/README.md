# SONAR Marketing Automation Agent 🤖

Autonomous marketing system that generates branded content from live Sonar data and posts across social media platforms.

## What It Does

| Feature | How It Works | Schedule |
|---------|-------------|----------|
| **Daily Whale Brief** | Fetches live data → renders branded template → posts with AI caption | 8 AM daily |
| **Whale Alert Posts** | Monitors API for moves >$1M → generates alert image → auto-posts | Every 30 min |
| **Token Spotlight** | Picks trending token → generates detailed infographic → posts | 12 PM daily |
| **Weekly Recap** | Aggregates weekly whale data → renders recap template → posts | Mon 10 AM |
| **TikTok Repurpose** | Downloads trending crypto TikToks → adds SONAR branding → posts as IG Reels | 6 PM daily |

## Architecture

```
scripts/marketing/
├── config.js       # All API keys, schedules, settings
├── agent.js        # Autonomous orchestrator (the brain)
├── templates.js    # HTML → PNG marketing templates (replaces Canva)
├── screenshot.js   # Puppeteer screenshots of live Sonar pages
├── social.js       # Twitter/IG posting + AI caption generation
├── repurpose.js    # TikTok download → brand → repost pipeline
└── output/         # Generated images and videos
    ├── screenshots/
    └── repurpose/
        ├── raw/
        └── branded/
```

## Quick Start

### 1. Install Dependencies

```bash
# Node packages
npm install puppeteer twitter-api-v2 node-cron

# System tools (for TikTok repurposing)
pip install yt-dlp
# Download ffmpeg from https://ffmpeg.org/download.html
```

### 2. Set Environment Variables

```bash
# OpenAI (for AI captions)
OPENAI_API_KEY=sk-...

# Twitter/X (get from developer.twitter.com)
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...

# Instagram (get from developers.facebook.com)
IG_ACCESS_TOKEN=...
IG_BUSINESS_ID=...

# Supabase (already in your .env)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Run

```bash
# Start autonomous agent (runs forever)
node scripts/marketing/agent.js

# Dry run (generates content but doesn't post)
node scripts/marketing/agent.js --dry-run

# Run one cycle and exit
node scripts/marketing/agent.js --once

# Run one cycle, dry run
node scripts/marketing/agent.js --once --dry-run
```

## Individual Scripts

### Templates (Canva replacement)

```bash
# Generate a daily brief image
node scripts/marketing/templates.js --type daily-brief

# Generate whale alert with custom data
node scripts/marketing/templates.js --type whale-alert --data '{"amount":"$5M","token":"ETH","direction":"IN"}'

# Generate token spotlight
node scripts/marketing/templates.js --type token-spotlight --data '{"symbol":"SOL","name":"Solana","price":"$145","change":"+8.2%"}'

# Available types: daily-brief, whale-alert, token-spotlight, weekly-recap, prediction
```

### Screenshots

```bash
# Screenshot all configured pages
node scripts/marketing/screenshot.js

# Screenshot specific page
node scripts/marketing/screenshot.js --page dashboard

# With branding overlay
node scripts/marketing/screenshot.js --branded
```

### Social Posting

```bash
# Post to Twitter
node scripts/marketing/social.js --platform twitter --image ./output/daily-brief.png

# Post to Instagram
node scripts/marketing/social.js --platform instagram --image ./output/whale-alert.png

# Post to all platforms
node scripts/marketing/social.js --platform all --image ./output/daily-brief.png

# Custom caption
node scripts/marketing/social.js --platform twitter --image ./output/img.png --caption "🐋 Whales are moving!"
```

### TikTok Brute Force

```bash
# Full auto pipeline: search → download → brand → post
node scripts/marketing/repurpose.js --post

# Dry run (download + brand, don't post)
node scripts/marketing/repurpose.js

# Custom search term
node scripts/marketing/repurpose.js --search "bitcoin whale alert"

# Brand a specific TikTok URL
node scripts/marketing/repurpose.js --url https://tiktok.com/@user/video/123

# Just add branding to an existing video
node scripts/marketing/repurpose.js --brand-only ./my-video.mp4
```

## Template Gallery

### Daily Brief (1080×1080)
Dark terminal-style grid background, 4 KPI cards (Whale Txns, Volume, Top Move, Sentiment), SONAR branding.

### Whale Alert (1080×1080)
Red-tinted alert style with pulsing rings, whale emoji, large amount display, direction indicator.

### Token Spotlight (1080×1350)
Portrait format for IG, 6 metrics grid, AI insight section, Sonar Score bar, full-width.

### Weekly Recap (1080×1350)
Purple-tinted grid, big stats row, top 5 whale-moved tokens ranking.

### Prediction (1080×1080)
Green gradient, AI prediction badge, signal direction, 3 reasoning bullets, confidence percentage.

## API Keys Setup Guide

### Twitter/X
1. Go to [developer.twitter.com](https://developer.twitter.com)
2. Create a project → App → get API keys
3. Set up OAuth 1.0a with read+write permissions
4. Generate access tokens

### Instagram
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create an app → Add Instagram Graph API
3. Connect your Instagram Business/Creator account
4. Get a long-lived access token (60 days, auto-refresh)
5. Get your Instagram Business Account ID

### TikTok (optional)
1. Go to [developers.tiktok.com](https://developers.tiktok.com)
2. Apply for Content Posting API access
3. Create an app and get access token

## Running 24/7

### Option A: PM2 (recommended for VPS)
```bash
npm install -g pm2
pm2 start scripts/marketing/agent.js --name sonar-marketing
pm2 save
pm2 startup
```

### Option B: GitHub Actions (free, scheduled)
Create `.github/workflows/marketing.yml`:
```yaml
name: Marketing Agent
on:
  schedule:
    - cron: '0 8 * * *'     # 8 AM UTC
    - cron: '0 12 * * *'    # noon UTC  
    - cron: '0 18 * * *'    # 6 PM UTC
    - cron: '0 10 * * 1'    # Monday 10 AM UTC
jobs:
  post:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install puppeteer twitter-api-v2
      - run: node scripts/marketing/agent.js --once
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          TWITTER_API_KEY: ${{ secrets.TWITTER_API_KEY }}
          TWITTER_API_SECRET: ${{ secrets.TWITTER_API_SECRET }}
          TWITTER_ACCESS_TOKEN: ${{ secrets.TWITTER_ACCESS_TOKEN }}
          TWITTER_ACCESS_SECRET: ${{ secrets.TWITTER_ACCESS_SECRET }}
          IG_ACCESS_TOKEN: ${{ secrets.IG_ACCESS_TOKEN }}
          IG_BUSINESS_ID: ${{ secrets.IG_BUSINESS_ID }}
```

### Option C: Vercel Cron (since you're already on Vercel)
Add marketing endpoints in `app/api/cron/marketing/route.ts` and use Vercel Cron.

## Content Calendar (Auto-generated)

| Time | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|------|-----|-----|-----|-----|-----|-----|-----|
| 8AM | Brief | Brief | Brief | Brief | Brief | Brief | Brief |
| 12PM | Spotlight | Spotlight | Spotlight | Spotlight | Spotlight | Spotlight | Spotlight |
| 6PM | TikTok | TikTok | TikTok | TikTok | TikTok | TikTok | TikTok |
| 10AM | Recap | — | — | — | — | — | — |
| */30m | Whale alerts (if >$1M move detected) |

## Notes

- **Templates replace Canva** — you control the design in code, no manual design needed
- **AI captions** — GPT-4o-mini generates platform-specific captions with hashtags
- **TikTok repurposing is gray area** — only repurpose content that allows it, or create original content
- **Instagram requires a Business/Creator account** for API posting
- **Twitter Free tier** allows 1,500 tweets/month — plenty for our schedule
- All images are generated at 2x DPI for crisp social media display
