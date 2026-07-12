# Sonar Instagram Content Playbook — Handover

**For:** Saif · **From:** Eduardo + Claude (Fable 5) · **Date:** 12 Jul 2026
**Status:** This system produced the approved July 11–12 content packs. Follow it exactly — the structure, prompts, and rules below are the product of several rejected iterations; deviating from them is how you get back to "AI slop."

**Live references (approved output):**
- Editorial carousels: https://claude.ai/code/artifact/a57c5f40-01b5-400f-b5a8-9acfe38256c3
- Trending pack (memes + receipts): https://claude.ai/code/artifact/3f9540ec-8415-4449-9442-c73ff63f1224
- First 8 posts, in posting order: https://claude.ai/code/artifact/25220178-bf77-4b09-b9ae-be6252bb4029
- PDFs (Eduardo's Desktop): `Sonar IG Carousels - Jul 11.pdf`, `other_content_for_sonar.pdf`
- Working templates + assets + build script: [`content/ig/`](content/ig/) in this repo

---

## 1 · The system in one paragraph

Three content pillars run on a 2-posts-per-day cadence: **(1) editorial news carousels** (authority + saves), **(2) meme × market singles** (reach + DM shares), **(3) whale receipts** (Sonar's unique data — the differentiator). Midday slot gets the data/news post, evening slot gets the shareable. Every post uses real, sourced numbers; every caption carries the "Comment WHALE" keyword CTA; everything renders from one dark design system so the grid reads as a single publication.

---

## 2 · Design system (do not restyle)

**Colors**

| Token | Hex | Use |
|---|---|---|
| Background | `#070b12` → `#0a1120` | slide + page backgrounds (near-black navy) |
| Card | `#0d141f` / `#0e1622` | X-post card, quote card |
| Ink | `#e9f0f7` | primary text |
| Muted | `#8595a8` / faint `#5c6b7e` | secondary/labels |
| Green | `#00e08a` | positive moves ONLY |
| Red | `#ff5b6b` | negative moves ONLY |
| Cyan | `#3bc9ee` | Sonar accent: assets, neutral analysis, links, NEWS badge |
| Amber | `#ffb43d` | rare warnings/thresholds |

Green/red/cyan are validated for colorblind separation on the dark surface (deutan ΔE ≈ 21 for the green/red pair). Charts always carry text labels (▲/▼, price tags) as secondary encoding — never color alone. Never use green on a series that's down over the window shown (we direction-color sparklines: `last >= first ? green : red`).

**Type**
- Headlines: **Anton** (Google Fonts, OFL). This is "the meme-page font" — all-caps, `line-height 1.06`, slight positive letter-spacing. Download: `https://fonts.googleapis.com/css2?family=Anton` (grab the *latin* subset woff2 and embed as a base64 data URI — Instagram screenshots must not depend on network fonts).
- Body/UI: Inter / system sans. Labels & data: monospace (`SF Mono` stack).
- Highlight 1–2 phrases per headline max: cyan for the asset/entity, green/red for the move. Never more.

**Brand marks**
- SONAR wordmark: `content/ig/assets/logo.png` — small, top-left of every slide, ~5.4% of slide width tall.
- Orca mascot (the Orca AI avatar): `content/ig/assets/orca-mascot.png` (256px; 1024px original on Eduardo's Desktop as `orca-mascot-1024.png`). Flat vector orca in a cyan sonar ring on dark navy. This is Orca's face everywhere: X-post card avatar, and as illustration material (see "orca walks into a bank" inset).

**Canvas:** all slides 4:5 (1080×1350). Text inside ~7% padding. Readable from the feed without zooming.

---

## 3 · Post formats (exact anatomy)

### Format 1 — Editorial news carousel · EXACTLY 4 slides
The master prompt for this format is reproduced in full in §4. Summary anatomy:

1. **Hero** — full-bleed editorial image (see §5), gradient to near-black lower third. Logo top-left, mono kicker top-right (`● BREAKING` / `MARKETS` / `REGULATION`), centered `— NEWS —` divider, Anton headline 6–12 words with 1–2 highlighted phrases, footer: source left / `Swipe →` right. **Nothing else.** The #1 rejected-draft mistake was cramming quote cards and stat chips onto this slide.
2. **Chart** — ONE chart. Big stat block above it (price + change). Max **3** annotations: low chip, high chip, dashed last-price line with tag. Source + timestamp in footer. Real data only.
3. **Orca AI** — X-post-style dark card. Avatar = orca mascot; name row "Orca AI ✓ · by Sonar · @sonartracker". Exactly three sections: `THE SIGNAL` / `WHY IT MATTERS` / `WHAT TO WATCH`, 45–75 words total, color-coded spans (cyan = assets/entities, green = bullish factors, red = bearish factors, grey = caveats). Timestamp line. No fake likes/reposts/views — ever.
4. **CTA** — minimal: logo over faint sonar rings, one value-prop line (≤16 words), `LEARN MORE AT / sonartracker.io`. Story-relevant CTA lines that are approved: "Track the wallets moving the market." / "Go beyond price. Follow the flows." / "See the signal before it becomes the headline." / "Comment "WHALE" and Orca DMs you the watchlist."

### Format 2 — Meme single · 1 slide
Full-bleed cinematic meme art (§5), logo top-left, Anton headline in the bottom third (~10.4% slide-width font size so the art stays visible), footer `@sonartracker / sonartracker.io`. The line must contain a REAL number or event ("WAKE UP BABE, A WHALE JUST MOVED $87M IN BITCOIN.") — the meme doubles as news; that's the Sonar twist on the format.

### Format 3 — Stat single · 1 slide
The daytrading "S&P record high" structure: dark slide, **quote card** top-left (coin badge, name, LIVE dot, big price, change line, sparkline canvas, timeframe pills), **circular illustration inset** overlapping the card's right edge (white ring border), `— NEWS —` divider, Anton headline, source footer. One number carries the post.

### Format 4 — Whale receipts carousel · 4 slides
Same skeleton as Format 1 but the voice is "receipts": Hero = "THE RECEIPTS: {amount} OUT THE DOOR SINCE {date}" over editorial art; Chart = the price reaction ("and the price didn't flinch"); Orca card = signal/why/watch on the flow; CTA = the comment-keyword slide. When Sonar's own whale data is wired in (see §9), this becomes the flagship daily format.

---

## 4 · The master prompt (editorial carousels)

Feed this to the model (Claude, ideally Fable 5) together with: the story, the sourced facts/figures, chart data, and the brand assets. It is the single most important artifact in this handover.

```
Create ONE premium Instagram carousel containing EXACTLY FOUR slides for Sonar,
a crypto and market-intelligence platform. Turn the supplied market event,
wallet movement, macro development, or breaking story into a professional
editorial post that is immediately understandable on mobile.

CORE DIRECTION — the result must feel: professional, editorial, financial,
data-driven, clean, restrained, premium; designed by a real financial-media
design team. Avoid anything that looks like generic AI content.

DO NOT USE: excessive text · multiple competing charts · random icons ·
glossy 3D · cartoonish imagery unless directly relevant · fake faces or
distorted hands · generic crypto coins floating in space · excessive neon ·
crowded layouts · long paragraphs · fake engagement statistics ·
sensational or unsupported claims. Every slide communicates ONE idea.

FORMAT: 1080×1350 (4:5). Generous mobile-safe margins (~60–80px). All text
readable from the feed without zooming.

DESIGN SYSTEM: near-black background; white primary text; Sonar aqua/cyan
accent; green ONLY for positive moves, red ONLY for negative; muted grey
secondary; bold condensed display headlines (Anton) + legible sans body;
Sonar logo consistent and subtle, never ad-sized.

SLIDE 1 — HERO & HOOK. Editorial hero image occupying the upper ~55–65%.
If the story centres on a recognisable public figure or institution, use a
professional editorial photograph of that subject; otherwise create a
sophisticated, realistic, cinematic conceptual image tied to the story.
Headline 6–12 words in the lower section; highlight only 1–2 phrases in
aqua/green/red. Small "Swipe →". No explanatory paragraphs. The hook must
be factual and specific — no clickbait the data doesn't support.

SLIDE 2 — THE CHART. ONE chart only (price line, candles, volume, wallet
balance, flows, OI, liquidations, or market cap — whichever fits the data).
Clean dark background, thin grid, one highlighted series, MAX THREE
annotations (e.g. "wallet entered position", "local high", "volume spike",
"current price"). One main statistic displayed prominently. Include asset,
timeframe, units, source and timestamp. NEVER fabricate missing values.

SLIDE 3 — ORCA AI EXPLANATION. A refined dark social-post-style card
(inspired by an X post, customised for Sonar). Author: "Orca AI by Sonar",
mascot avatar. No fake engagement counts. EXACTLY three concise sections:
1. THE SIGNAL — what actually happened
2. WHY IT MATTERS — why traders/the market cared
3. WHAT TO WATCH — what could confirm, weaken, or reverse it
45–75 words total. Colour selectively: aqua = assets/wallets/neutral terms,
green = bullish factors, red = bearish factors, white = main text, grey =
secondary. Explain cause and effect; sound like a market analyst, not a
chatbot. No financial advice; no false certainty.

SLIDE 4 — SONAR CTA. Extremely minimal: Sonar logo, one short value
proposition (≤12–16 words), sonartracker.io, one restrained visual element
(sonar rings / data texture). No feature lists.

CONTENT RULES. Use only supplied facts, figures, chart data and sources.
Never invent prices, dates, wallet identities, transaction values,
motivations, reactions, quotes, or sources. Under uncertainty use "may
indicate / suggests / coincided with / traders are watching / could become
significant if". Reduce the story to: what happened → why it moved the
market → what matters next. Don't repeat sentences across slides.

FINAL CHECK: exactly four slides · one idea per slide · headline instantly
readable · nothing overcrowded · chart uses real supplied data with ≤3
annotations · Orca has exactly three concise insights · consistent colour
coding · restrained branding · looks professionally art-directed · zero
"generic AI crypto" feel · grammar clean · all four slides one system.
```

---

## 5 · Image generation (gpt-image-1)

Saif has his own OpenAI key. Endpoint and settings used for everything:

```bash
curl -s https://api.openai.com/v1/images/generations \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-image-1",
    "prompt": "<one of the prompts below>",
    "size": "1024x1536",        # vertical for slide art; 1024x1024 for logos
    "quality": "high",
    "output_format": "jpeg"     # png for logos/mascots
  }'
# response: data[0].b64_json → base64-decode to file
```

### The two style families

**A · Editorial hero photos** (carousel slide 1). The look is *photojournalism, not concept art*. Every prompt must include, verbatim or near: *"Photojournalistic editorial photograph for a financial publication"*, a concrete physical scene, *"shallow depth of field"*, *"muted realistic Reuters-style color grade"*, *"Lower half/third of the frame falls into near-black shadow, clean for a headline overlay"*, and *"No text, no watermark, no logos, no people [unless a public figure is the story], no floating objects. Vertical composition."*

Approved examples (reuse and adapt the nouns, keep the scaffolding):
- *BTC / bearish corporate*: "…a single physical gold Bitcoin coin resting on a dark glass executive desk in a dimly lit corporate boardroom at night, out-of-focus monitors with faint red market charts glowing deep in the background, floor-to-ceiling windows with city lights bokeh…"
- *ETH / institutional bid*: "…a physical silver Ethereum coin standing upright on a dark reflective marble surface, cool teal and blue bokeh of a glass financial-district skyline at dusk behind it…"
- *Regulation / banking*: "Editorial photojournalism, architectural photography: an imposing neoclassical American bank building facade with tall marble columns photographed from a low angle at blue hour, a United States flag hanging between the columns…"

**B · Meme / illustration art** (singles + insets). Two sub-styles:
- *Cinematic 3D meme* ("wake up babe", "sold the bottom"): "High-production cinematic 3D render, premium meme-page art style: a green cartoon frog meme character …" + a specific emotional scene (bed + phone with green chart + sleeping partner; hoodie + rain window + tear) + "moody color grade like a film still. Lower third falls into near-black shadow, clean for a headline. No text, no watermark. Vertical composition."
- *Soft-shaded illustration* (circular insets, mascot moments): "Soft-shaded digital illustration in the style of comfy internet meme art: …" (group-hug relieved characters) or "Charming soft-shaded storybook illustration with premium finish: a small cute orca character wearing a tiny navy business suit and carrying a leather briefcase, walking up the marble steps of a grand neoclassical bank at dusk…" + "Centered composition that works cropped in a circle. No text, no watermark."

### Anti-slop rules (learned the hard way)
1. For flat logos/mascots you MUST spam constraints or the model produces glow-fog: *"STRICTLY flat design: solid color fills only, crisp hard vector edges, zero glow, zero blur, zero gradients, zero soft shading, zero fog, no 3D, no texture. Like an SVG exported at high resolution."* The first two mascot attempts without this language were unusable.
2. Never accept: floating coins in space, neon everything, fake human faces, glossy 3D blobs. Regenerate instead of settling — a regeneration costs cents; a slop post costs credibility.
3. Always demand dark/clean space where the headline will sit.
4. IP note: the frog character is Pepe-style (originally Matt Furie's character; meme pages use it ubiquitously, but know that before running it as paid ads). Anton is SIL OFL — free to embed. The orca mascot and all generated photos are ours.

---

## 6 · Orca AI voice (slide 3 / anywhere Orca speaks)

- Exactly three sections: `THE SIGNAL` (what happened, with the number), `WHY IT MATTERS` (mechanism — cause and effect, not restatement), `WHAT TO WATCH` (confirm/weaken/reverse). 45–75 words total.
- Color-code inline spans: cyan = tickers, companies, wallets; green = bullish factors/levels; red = bearish factors; grey = caveats ("custody powers first; no deposits or loans yet").
- Tone: a sharp analyst texting a friend. Allowed: "Someone kept bidding." Banned: "In conclusion", "It is important to note", certainty about causation, price targets, advice.
- Hedge honestly: *suggests / coincided with / traders are watching / could become significant if*.
- Sign-off line inside the card: `{date} · Orca AI by Sonar`. Footer of the slide: `NOT FINANCIAL ADVICE · sonartracker.io`.

---

## 7 · Data integrity (non-negotiable)

- **Sources used:** Binance public API for crypto candles (`GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=42` → 7 days of 4h candles), Yahoo Finance chart API for stocks (`GET https://query1.finance.yahoo.com/v8/finance/chart/CRCL?range=1mo&interval=1d`, send a browser User-Agent). Headlines: CoinDesk / Decrypt / Cointelegraph — name the source on the slide.
- **Verify every claimed number against the data before it ships.** Real example from this build: the draft said CRCL "popped ~10%" on the bank-charter news; the closing data showed **+5.0%** (63.01 → 66.14). The post shipped with +5%. Same discipline turned "ETH jumps 3%" into "ETH climbs 6% off the lows" because the day move was actually +1.6% but the bounce off the 7-day low ($1,713 → $1,825) was +6.5%.
- Chart annotations: max 3, factual only (7D LOW / 7D HIGH / last price / a dated event marker). Never place an event marker on a candle you can't source.
- Refresh data the day of posting. Every chart slide carries `Source · date · time UTC`.

---

## 8 · Captions + the keyword funnel

Structure (keep under ~60 words before hashtags):
1. First line = the hook restated with a keyword-rich phrasing (Instagram SEO reads captions).
2. One to two lines of substance — the real numbers again.
3. **CTA line: `Comment "WHALE" and Orca will DM you {the breakdown / the watchlist / who's absorbing the supply}.`** One keyword across ALL posts (WHALE) — it feeds one automation.
4. `Not financial advice.`
5. 5–7 hashtags, mixing big (#Bitcoin #CryptoNews) and niche (#WhaleAlert #OnChain #SmartMoney #Sonar).

Wire the keyword to a ManyChat (or similar) Instagram automation: trigger = comment containing "WHALE" → DM with the Orca breakdown + sonartracker.io link. Until that's live, reply to every WHALE comment manually by DM — comments are the ranking fuel, don't waste them.

---

## 9 · Posting schedule + automation

**Cadence: 2/day.** Midday (~11:00–13:00) = data/news post. Evening (~19:00–22:00) = shareable (meme/stat single). Pair them: the evening post riffs on the midday story.

| | Midday | Evening |
|---|---|---|
| Mon | News carousel (weekend recap) | Meme |
| Tue | Whale tape / receipts | Stat single |
| Wed | News carousel | Meme |
| Thu | Whale tape / receipts | Meme |
| Fri | News carousel (week wrap) | Stat single |
| Sat | Whale tape | Meme |
| Sun | Whale tape or story poll | Meme |

**Overrides:** breaking news posts within 2–4h and bumps the calendar; a huge whale move posts whenever it happens (third post is fine for a real event, never for filler). If the second post of a day would be mediocre, skip it.

**Metrics:** watch **shares and saves per format** in IG Insights weekly; shift the mix toward what gets forwarded. Ignore likes.

**Manual posting (today):** open the artifact on a phone → screenshot each 4:5 slide → post (carousels = 4 screenshots in order) → paste caption.

**Automated posting (next):** the step-by-step is in the "Sonar · Instagram Publishing Setup" artifact in Eduardo's account. Summary: IG account → Professional; link a Facebook Page; create Meta developer app; get the IG Business ID; mint a long-lived access token; store secrets in GitHub. Then a scheduled job can: pull fresh data → render slides (see §10) → publish via the Graph API (`/media` item containers → `/media` carousel container with `children` → `/media_publish`). Images must be hosted at public URLs for the API — a `public/ig/` folder on the deployed site works. Long-term: wire the receipts/whale-tape format straight to Sonar's Supabase whale data so the daily data post generates itself.

---

## 10 · Rendering pipeline (what actually produced the packs)

Everything lives in [`content/ig/`](content/ig/): placeholder HTML templates (`ig-carousels-v4.html`, `trending-pack.html`, `first8.html`), sample `data.js`, assets, and `build.py` which inlines assets/fonts/data into a self-contained final HTML. Charts are hand-drawn canvas (candles + annotation chips + sparklines) — no chart library.

```bash
cd content/ig
python3 build.py first8.html out.html     # inline everything
# preview / screenshot source:
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --window-size=520,16000 --screenshot=preview.png "file://$PWD/out.html"
# PDF (1080×1350 page per slide): append the @page print CSS (see build.py --pdf) then:
"...Google Chrome" --headless=new --no-pdf-header-footer \
  --virtual-time-budget=10000 --print-to-pdf=out.pdf "file://$PWD/out-print.html"
```

Print gotchas already solved in `build.py --pdf`: blurred `text-shadow`/`box-shadow`/`filter` rasterize as ugly boxes (disable in print CSS); CSS `background-size: cover` breaks in PDF export for small elements (use `<img object-fit:cover>` instead — the circular insets already do).

---

## 11 · Quality checklist (run before every post)

- [ ] Exactly the right slide count; ONE idea per slide
- [ ] Headline ≤12 words, 1–2 highlights, reads in under a second
- [ ] Every number on the slide matches the pulled data (recheck the day of posting)
- [ ] Chart: ≤3 annotations, source + timestamp, green/red semantics correct (down series is never green)
- [ ] Orca card: 3 sections, 45–75 words, color-coded, no fake engagement
- [ ] Caption: hook line, real numbers, `Comment "WHALE"`, NFA, 5–7 hashtags
- [ ] No AI-slop tells: no glow-fog, no floating coins, no fake faces, no neon vomit
- [ ] Logo small, consistent; grid coherence maintained
- [ ] **Eduardo previews before it posts** (house rule — nothing user-facing ships unseen)

---

## 12 · File map

```
IG_CONTENT_PLAYBOOK.md          ← this document
content/ig/
  README.md                     ← quickstart
  build.py                      ← inline assets → final HTML (+ --pdf variant)
  templates/
    ig-carousels-v4.html        ← editorial 4-slide carousels (3 stories)
    trending-pack.html          ← meme single + stat single + receipts carousel
    first8.html                 ← the first 8 posts, assembled in posting order
    data.js                     ← sample market data (Binance/Yahoo format)
  assets/
    logo.png                    ← SONAR wordmark
    orca-mascot.png             ← Orca AI avatar (256px)
    hero1.jpg hero2.jpg hero3.jpg       ← editorial heroes (BTC/ETH/bank)
    memeA.jpg memeB.jpg meme7.jpg       ← meme art
    orcabank.jpg                ← orca-at-the-bank illustration
```

Questions → Eduardo, or re-run the prompts above with Claude (Fable 5) + this playbook as context. The content is only "the same" if the rules in §3–§7 stay intact.
