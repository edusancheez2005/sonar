# Handoff: Sonar Landing Page + Dashboard Preview

## Overview
This handoff is a complete redesign of the Sonar marketing site landing page — a hero featuring a rotating 3D wireframe/holographic Earth globe with orbiting crypto logos, data arcs, and sonar pulses, paired with a product preview section showing a mock Sonar dashboard.

## About the Design Files
The files in this bundle are **design references created in HTML** — interactive prototypes showing the intended look, motion, and behavior. They are **not production code to copy directly**.

The task is to **recreate this design inside the existing Sonar codebase**, following whatever framework, styling approach, and folder conventions are already in use (Next.js + Tailwind, React + CSS Modules, etc.). Port component names, structure, and behavior — but use the codebase's preferred tools and idioms.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, animations, and interactions are all decided. Recreate pixel-perfectly.

---

## Target pages to replace
1. **Landing page** — replace the existing hero + supporting sections with this design
2. **Product/dashboard preview section** — reuse the dashboard mock as the "see the product" section on the landing page

---

## Global Design Tokens

### Colors
```
--bg              #050B14   /* page background, deep navy-black */
--bg-2            #081420   /* secondary surfaces */
--teal            #7FE3F5   /* primary accent */
--teal-soft       rgba(125, 230, 245, 0.14)
--text            #E6F7FB   /* primary text */
--text-dim        rgba(220, 240, 250, 0.6)
--text-faint      rgba(180, 230, 245, 0.4)
--border          rgba(120, 220, 240, 0.14)
--green           #5DF0B0   /* live/up indicators only */
--orange          #F5A86B   /* down/alert (used sparingly) */
```
All-monochromatic teal aesthetic — no additional accent colors beyond the green/orange functional indicators.

### Typography
- **Sans (UI + display):** Inter (Google Fonts), weights 300/400/500/600/700
- **Mono (data, tickers, labels):** JetBrains Mono, weights 400/500

### Scale
- Hero headline: `clamp(44px, 5.4vw, 80px)`, weight 300, letter-spacing -0.025em
- Section titles: `clamp(32px, 3vw, 48px)`, weight 300
- Body: 16px / line-height 1.55
- Micro labels (monospace, uppercase): 10–11px, letter-spacing 1.4–1.8px
- Ticker/data: 11–12px monospace

### Spacing / radius / shadow
- Card radius: 10–14px
- Button radius: 999px (pill)
- Border: 1px solid var(--border)
- Primary button shadow: `0 10px 30px -8px rgba(125, 230, 245, 0.5)` + inner ring
- Card shadow: `0 40px 80px -40px rgba(0, 0, 0, 0.8)`

---

## Page Structure

### 1. Nav (sticky, top)
- Left: Sonar logo image (28px tall)
- Center: links — Product, Signals, Whales, Pricing, Docs
- Right: "Sign in" (ghost button) + "Launch app →" (primary teal pill button)
- Sticky, `backdrop-filter: blur(20px)`, translucent bg `rgba(5, 11, 20, 0.55)`, bottom border.

### 2. Hero (2-column grid)
Grid: `1fr 1fr`, align-items center, full viewport height.

**Left column — copy block:**
- Eyebrow pill: small monospace "Live · Tracking $12.4B in flows" with pulsing green dot
- Headline (3 lines):
  - Line 1: **"Sonar"** — teal gradient (`linear-gradient(180deg, #AFF0FA, #4EC5DB)`) clipped to text, weight 500
  - Line 2: "Real-Time Crypto" — white, weight 300
  - Line 3: "Intelligence" — white, weight 300
- Subcopy: "Your crypto market intelligence partner. Track whales. Read signals. Move first — across every chain, in real time."
- CTA row: "Launch app →" (primary) + "See live demo" (ghost)
- Trust chips row: "700+ traders", "2,000+ signals", "10M+ datapoints/day" — small monospace pills

**Right column — globe scene:**
- 720×720 canvas with wireframe Earth globe
- `margin-left: -160px` so it overlaps toward the text (feels integrated, not siloed)
- Globe draws: atmosphere glow, ocean sphere with radial shading, lat/lon wireframe, dense continent dots, terminator shadow, fresnel rim, animated sonar pulses, animated great-circle data arcs between hotspots, optional scanline (holographic style)
- Orbiting logos: BTC / ETH / SOL / XRP / BNB / DOGE on 3 tilted elliptical rings at different speeds, with depth-based scale/opacity

### 3. Crypto marquee (between hero and dashboard)
- Horizontally scrolling ticker, `animation: scroll 60s linear infinite`
- Monospace, shows coin symbols + prices + % deltas (green up, orange down)
- Duplicated track for seamless loop

### 4. Dashboard preview section
- Section label: "THE PRODUCT" (small monospace with teal leading line)
- Section title: "Every signal. Every chain. In one terminal." (teal accent on "Every chain.")
- Subcopy about aggregating on-chain + sentiment + news
- Full dashboard mock in a bordered card with traffic-light chrome:
  - **Top chrome:** mac-style traffic lights, URL bar (`sonar.app/dashboard`), avatar + "pro" badge
  - **Sidebar (200px):** Logo, nav items (Dashboard active, Whales, Signals, News, Alerts, Portfolio, Settings) with dotted indicators
  - **Main content:**
    - 3-up stat cards (Tracked volume / Whale txns / Signals fired) each with value + delta + sparkline
    - Tab bar (WHALES / SIGNALS / NEWS / ALERTS)
    - Big chart card: BTC/USD candlestick + line overlay + range selector (1H / 24H / 7D / 30D / ALL)
    - Bottom 2-col: whale movements table + active signals list (with BUY/WATCH/ALERT tags and confidence %)

### 5. Footer (4-column)
- Brand col: logo + tagline
- Product col, Company col, Resources col — standard marketing links
- Bottom bar: `© 2026 SONAR LABS` + "ALL SYSTEMS OPERATIONAL · ● LIVE"

---

## Components to Port

All component source files are in `./components/` as React JSX. Reimplement in your framework of choice.

### `CryptoIcons.jsx`
Pure SVG components for each coin (BTC, ETH, SOL, XRP, BNB, DOGE). All use `currentColor` so they tint with the teal theme. Also exports a `COINS` array with names, symbols, prices, and change %.
**Note on originality:** these glyphs are drawn from scratch (simple geometric marks — ₿, triangular ETH, triple-bar SOL chevron, etc.) to avoid copyrighted logo recreations. Swap in real brand logos only if you have licensing.

### `Globe.jsx`
Canvas-based 3D globe, ~260 lines. Key behaviors:
- Generates continent dots inside ellipse-shaped lat/lon blobs (N. America, S. America, Europe, Africa, Asia, India, SE Asia, Australia, Greenland, Scandinavia, Japan, Madagascar, NZ)
- Rotates around Y-axis continuously; tilted around X-axis by ~-20° (`-0.35` rad)
- Draws in layers: atmosphere → ocean sphere → lat/lon grid → continent dots (with light-from-upper-left shading) → terminator shadow → scanline (holographic only) → data arcs → sonar pulses → fresnel rim
- Three styles via `style` prop: `wireframe` | `dotted` | `holographic`
- Three motion levels via `motion` prop: `subtle` | `medium` | `cinematic` — affect rotation speed, pulse frequency, arc frequency
- Renders via `requestAnimationFrame` loop; cleans up timers on unmount
- Uses `devicePixelRatio` for retina sharpness

### `OrbitingLogos.jsx`
Overlay on top of globe canvas. Three tilted elliptical orbit rings (SVG dashed ellipses), 2 coins per ring:
- Ring 1: BTC + SOL, rx=0.48×size, ry=0.12×size, tilt=-18°, speed=0.08
- Ring 2: ETH + BNB, rx=0.58×size, ry=0.15×size, tilt=22°, speed=-0.06
- Ring 3: XRP + DOGE, rx=0.68×size, ry=0.18×size, tilt=-8°, speed=0.05
- Logos sorted by z-depth each frame so "front" logos overlap "back" ones
- Scale 0.7–1.2× and opacity 0.55–0.99 based on depth

### `DashboardPreview.jsx`
The full dashboard mock — stat cards with `SparkLine` component, `BigChart` candlestick chart (60 candles, generated data), whale table, signals list. Everything seeded with `useMemo` so it's stable across renders but different between sessions.

### Live/animated micro-components
- **Eyebrow pill:** pulsing green dot (`@keyframes pulse`)
- **Marquee:** CSS `@keyframes scroll` — 60s linear infinite, duplicated track

---

## Interactions & Behavior

| Element | Behavior |
|---|---|
| Globe | Continuous rotation; spawns random sonar pulses + data arcs on hotspots |
| Orbit logos | Continuous orbital motion, 3 rings at different speeds/tilts |
| Marquee | Infinite horizontal scroll |
| Eyebrow pill dot | Scale pulse 1.0 → 1.35 → 1.0 at 1.6s ease-in-out |
| Buttons | Primary lifts 1px on hover + stronger shadow; ghost adds bg tint |
| Dashboard tabs | Click to switch active tab (visual only in mock) |
| Nav links | Color transition to teal on hover |

### Responsive breakpoints
- `max-width: 1100px` → hero stacks to 1 column, globe shrinks to 520×520 and loses negative margin
- `max-width: 880px` → hide nav links, collapse dashboard sidebar, footer goes 2-col

---

## State Management
- `HeroCenter`: `globeStyle` + `motion` (from the Tweaks system; for production, pick one style/motion as default — recommend `holographic` + `medium`)
- `DashboardPreview`: `tab` state for tab switching; all data is static/seeded

No backend hooks needed for the marketing page — it's all presentational.

---

## Assets
- `assets/sonar-logo.png` — the "SONAR" wordmark with signal arcs, transparent background. Used in nav, dashboard sidebar, footer.

---

## Implementation Tips

1. **Globe performance:** it's drawn to a 2D canvas at `devicePixelRatio` scale. On lower-power devices, consider reducing hotspot counts (currently ~2k dots) or bumping `pulseInterval` up.
2. **Fonts:** preconnect + Google Fonts import for Inter + JetBrains Mono. If self-hosting, match weights 300/400/500/600/700 for Inter and 400/500 for JetBrains Mono.
3. **Globe as asset:** if your framework is React/Next, `components/Globe.jsx` drops in almost as-is — just convert `React.useRef/useEffect/useState` imports to ESM. For other frameworks, treat it as a spec: same layer order, same math, reimplement idiomatically.
4. **Dashboard data:** replace seeded random data with real API data when wiring up — structure matches what you'd want (OHLC for chart, tx rows for whales, signal objects).
5. **Motion preference:** honor `prefers-reduced-motion: reduce` — drop orbit animation to static positions, remove marquee scroll, keep sonar pulses at 1/4 frequency.

---

## Files in this bundle

```
design_handoff_sonar_landing/
├── README.md                           ← this file
├── Sonar Landing Page.html             ← full working prototype (open in browser)
├── assets/
│   └── sonar-logo.png
└── components/
    ├── CryptoIcons.jsx
    ├── Globe.jsx
    ├── OrbitingLogos.jsx
    └── DashboardPreview.jsx
```

Open `Sonar Landing Page.html` in a browser for the live reference. All component logic is annotated inline.
