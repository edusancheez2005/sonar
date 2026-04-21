# Sonar Tracker SEO Launch Kit

Three actions to take RIGHT NOW (15 minutes total):

---

## 1. Submit Sitemap to Google Search Console (5 min)

### Step A — Verify ownership
1. Go to https://search.google.com/search-console
2. Add property → **URL prefix** → `https://www.sonartracker.io`
3. Choose **HTML tag** verification method
4. Copy the meta tag content value (e.g. `abc123def456...`)
5. Add to Vercel env: `GOOGLE_SITE_VERIFICATION=abc123def456...`
6. Paste it into `app/layout.jsx` metadata `verification.google` (or use the env var pattern below)

Add to `app/layout.jsx` metadata export:
```js
export const metadata = {
  // ...existing
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: { 'msvalidate.01': process.env.BING_SITE_VERIFICATION },
  },
}
```

### Step B — Submit sitemap
After verification:
- Search Console → **Sitemaps** → enter `sitemap.xml` → Submit
- Should index 2,500+ URLs (whales, tokens, blog posts, glossary, landing pages)

### Step C — Request indexing for key pages
- Inspect URL → `https://www.sonartracker.io/`
- Click **Request indexing**
- Repeat for `/whales/leaderboard`, `/blog`, `/nansen-alternative`, `/arkham-alternative`

---

## 2. Submit to Bing Webmaster (3 min)

1. https://www.bing.com/webmasters → Sign in
2. **Import from Google Search Console** (one-click since you just set it up) ← easiest
3. Or manual: Add Site → verify via meta tag → submit `sitemap.xml`

Bing also feeds DuckDuckGo, Yahoo, and ChatGPT search results.

---

## 3. Backlink Submission Kit (30 min, 30+ backlinks)

### Listing copy — paste into each directory

**Name:** Sonar Tracker
**Tagline:** AI Crypto Whale Tracker — Real-time On-Chain Intelligence
**Short description (160 chars):** Track crypto whale wallets in real-time across Bitcoin, Ethereum, Solana. AI on-chain analysis, sentiment, and alerts from $7.99/mo. Informational only.
**Long description (500 chars):** Sonar Tracker is the AI-powered crypto whale tracking platform built for users who want professional on-chain analytics at retail prices. Track whale wallets in real-time across Bitcoin, Ethereum, Solana, and 10+ chains. Get AI-generated inflow/outflow classification, sentiment analysis, customizable alerts, and access ORCA — our AI on-chain data summarisation tool that translates blockchain data into plain English. Free tier available. Premium from $7.99/mo (vs $150+ for Nansen). Informational only — not financial advice.

**Logo URL:** https://www.sonartracker.io/logo2.png
**Screenshot URL:** https://www.sonartracker.io/screenshots/stats-dashboard.png
**Pricing:** Free / $7.99 / $19.99
**Categories:** Crypto, Trading, Analytics, AI, Blockchain, Web3

### Free directories (DR 50+, no login often required)

**Tier 1 — High DR, high impact**
1. https://www.producthunt.com/posts/new — Submit as launch (DR 91)
2. https://alternativeto.net — Add as alternative to Nansen, Arkham, Whale Alert (DR 88)
3. https://www.saashub.com/submit — SaaS comparison site (DR 75)
4. https://betalist.com/submit — Free product launch (DR 79)
5. https://www.g2.com/products/new — Software marketplace (DR 91, takes review)
6. https://www.capterra.com/vendors — Software directory (DR 92)
7. https://www.getapp.com — Software discovery (DR 89)

**Tier 2 — Crypto-specific (most impactful for SEO)**
8. https://cryptoslate.com/coin-database/ — Add Sonar to tools section (DR 81)
9. https://www.coingecko.com/en/publications — Submit guest content (DR 91)
10. https://coinmarketcap.com/community — Build profile, share insights (DR 92)
11. https://cryptopanic.com/users/submit — Add Sonar as news source (DR 78)
12. https://defipulse.com — DeFi tools listing (DR 77)
13. https://www.dappradar.com/discover — DApp directory (DR 81)
14. https://www.stateofthedapps.com — DApp listing (DR 70)
15. https://cryptominded.com/tools/ — Crypto tools (DR 55)

**Tier 3 — Indie hacker / startup directories**
16. https://www.indiehackers.com/products — Build profile (DR 82)
17. https://www.startupblink.com — Free startup listing (DR 70)
18. https://launchingnext.com/submit/ — Free (DR 60)
19. https://www.uneed.best/submit-a-tool — Tool directory (DR 50)
20. https://www.toolify.ai/submit-tool — AI tool directory (DR 65)
21. https://theresanaiforthat.com/submit/ — AI tool directory (DR 78)
22. https://www.futuretools.io — AI tools (DR 65)
23. https://www.aitoolnet.com/submit — AI tools (DR 50)
24. https://www.openalternative.co — Open-source alternatives (DR 60)
25. https://crozdesk.com/products/new — SaaS marketplace (DR 75)

**Tier 4 — Reddit + community (slow but compounds)**
26. r/CryptoCurrency — Share data insights (NOT promotional)
27. r/CryptoMoonShots — Whale movement analyses
28. r/ethtrader — Weekly whale reports
29. r/SatoshiStreetBets — Educational content with brand mention
30. Hacker News — Show HN: Sonar Tracker (Saturday morning best time)

### Outreach template (for podcast/blog mentions)

> Subject: Free whale tracking data for [Their Newsletter/Podcast]
>
> Hi [Name],
>
> I built Sonar Tracker — a real-time crypto whale tracker that's free for the basics (vs Nansen's $150/mo). It surfaces large on-chain moves with AI-generated context.
>
> If it's useful for your audience, I'd love to:
> - Provide free Pro accounts for your team
> - Generate a custom weekly whale report you can publish
> - Be a guest on [their podcast] to talk on-chain analysis
>
> Examples of recent calls we caught: [link to top whale tracker article]
>
> No strings — just want to put real data in front of people who care about crypto.
>
> Thanks,
> Eduardo

---

## What to expect (timeline)

- **Week 1:** Sitemap submitted, Search Console crawling 500–2,000 URLs/day
- **Week 2:** First impressions in Search Console (still no clicks)
- **Week 3-4:** First clicks on long-tail queries from blog + glossary
- **Month 2:** Backlinks starting to compound, 500+ impressions/day
- **Month 3:** Programmatic whale/token pages start ranking ("vitalik wallet", "binance hot wallet", "$BTC whales")
- **Month 6:** 5K-15K monthly organic visits if content quality stays high

## Track progress

Set up Google Analytics 4 + connect to Search Console. Weekly check:
- Impressions (target: +50%/week first 3 months)
- Average position on top 10 keywords
- Indexed pages count (target: 2,000+ within 30 days)
