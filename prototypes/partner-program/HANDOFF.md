# Partner Program v2: Webflow handoff (faithful version)

For Shikhar. Build and check on staging (roscap-site.webflow.io) first, then publish.

- Prototype (single file, open locally): `proto/dist/partner-program-v2.html`
- Source: `proto/partner-program-v2/` (`index.html`, `partner.css`, `partner.js`, `img/`)
- Screenshots: `shots/partner-v2/` (side-by-sides `sbs-*.png` are live on the left, prototype on the right)

This replaces the first Partner Program prototype (`proto/partner-program/`), which the owner rejected because it changed the page structure. His brief: keep the page as it is; keep the hero; keep "Why Partner With Us?" and its wording but remove the empty space between the icon and the text; use the new "How it works" section; keep "Our Partners" but let the logos move slowly from side to side. Nothing else changes, and no copy changes.

## 0. What changes, section by section

| # | Section (live classes) | Change | Effort |
|---|---|---|---|
| 1 | Hero (`section is-header is-center`) | None | - |
| 2 | Why Partner With Us? heading block | None | - |
| 3 | Why cards (`pr-cards-grid`, `pr-cards`, `pr-para-wrap`) | Spacing only: 5 property changes on 3 classes | S |
| 4 | How Our Partner Program Works (`section-copy-me-join`, Swiper carousel) | Replaced by the new How it works section. The live closing line, its Download button and the brochure pop-up stay | M |
| 5 | Our Partners heading block | None | - |
| 6 | Our Partners logos (`assets-card-content-wrap`) | Slow CSS marquee with a pause button. With reduced motion the visitor sees today's grid | M |
| 7 | Contact block (`subscribe-form-wrap`) | Invisible fixes: working desktop Submit, hidden labels, autocomplete, unique ids | S |
| 8 | Footer symbol, nav symbol | None | - |
| 9 | Page custom code | Remove Swiper and the hidden-timeline styles; add the two blocks in section 3.4 | S |

How the prototype was checked against live (Playwright, 1440 and 390 wide):
- Pixel comparison of live vs prototype: "Why Partner With Us?" heading block and "Our Partners" heading are identical (0.0 mean difference) at both widths; the hero is identical below the nav at 1440 apart from the prototype label; the contact block differs by about 1 level in 255 (texture raster).
- Computed styles of 26 matched elements compared one by one: everything matches except the requested changes and three properties with no visible effect (image vertical-align, button appearance, and the opacity of the pre-composited contact texture, see section 9).
- "Staging simulation": the steps in this document were applied to a copy of the live page HTML, loaded with the live Webflow stylesheet and scripts. Result: the Why cards and the reduced-motion logo grid are pixel-identical to the prototype, the How it works band differs on 0.11% of pixels, no console errors, no duplicate ids. So the code below works with the live CSS, not only with the prototype CSS.

## 1. Hero: no change

Nothing to do. Optional, invisible performance fix: the hero image (`hero-bg`) is set to lazy-load on live, which delays the largest paint. In its image settings set Load to Eager and add the custom attribute `fetchpriority` = `high`. The prototype does this; the look is unchanged.

## 2. Why Partner With Us: card spacing only

Live cards are 312 x 394 px with about 150 px of empty space between the icon and the text, because the grid has a fixed aspect ratio and the card pushes its two children apart. Change only these values (all three classes are used on this page only; checked on Home, About, Our Services, Track Record, Insights and Contact):

| Class | Breakpoint | Property | Live now | Change to |
|---|---|---|---|---|
| `pr-cards-grid` | Desktop (base) | Aspect ratio | 1361 / 394 | Auto (clear it) |
| `pr-cards-grid` | Desktop (base) | Min height | 394px | None (clear it) |
| `pr-cards` | Desktop (base) | Justify (Flex, vertical) | Space between | Start |
| `pr-cards` | Desktop (base) | Gap (row) | none | 32px |
| `pr-cards` | Mobile portrait (479) | Gap (row) | 24px | 28px |
| `pr-para-wrap` | Desktop (base) | Min height | 100px | None (clear it) |

Everything else stays: 4 columns with a 20px gap (2 at tablet, 1 at mobile portrait), white card, 6px radius, no shadow, 32 x 28 px padding, 2px gold border on hover, icon 83px high (48px on mobile portrait), text Switzer Light 22px / 36px in #282828. Equal heights per row come from the grid's default stretch. Result at 1440: cards 287px high (were 394px), icon, then 32px, then the text. See `shots/partner-v2/why-cards-before-after-1440.png` and `-390.png`.

## 3. How it works: replace the carousel with the new section

### 3.1 Remove

- The heading H1 "How Our Partner Program Works", the Swiper block (`swiper join-swiper`, the six `swiper-slide` cards, `swiper-nav-wrap`) and the Embed with the slider dot styles. All inside `section-copy-me-join`.
- The hidden section `section bg-green hide` (id `pr-timeline-section`, the old arrows timeline).
- Page custom code, head: the `<link ... swiper-bundle.min.css>` and the `<style>` with `.pr-timeline-para-wrap` / `.pr-arrow-wrap img`.
- Page custom code, before body: `<script src=".../swiper-bundle.min.js">` and the `new Swiper(".join-swiper", ...)` script.

Keep: `white-divider horiz`, `partner-div botoom` (the line "For more information, download our brochure or contact us below." and the Download button with its interaction), and `leadgen-popup-overlay` (the brochure pop-up form). They move into the new section (3.2).

Removing Swiper saves 155 KB of JavaScript (43.7 KB gzipped) and 14.6 KB of CSS (2.9 KB gzipped), plus two requests.

### 3.2 Build (Designer structure)

Build it where `section-copy-me-join` was (between the Why cards section and the "Our Partners" heading section). Copy every text exactly from the prototype source (`proto/partner-program-v2/index.html`, the block that starts at `<section class="how pg" id="how-it-works"`). The text is the owner-approved copy from prototype v1; do not use the old carousel text.

```
Section            class how            id how-it-works      attribute aria-labelledby = how-h
  Div              class how-grid
    Div (tag aside)  class how-aside
      Div          class how-aside-in
        Paragraph  classes tag on-dark          "How it works"
        Heading H2 classes h2 on-dark   id how-h  "How the Partner Program works"
        Paragraph  class how-lead               "6 steps, from the first conversation to completed transactions. You are kept informed at each one."
        Div (tag nav) class how-nav   attribute aria-label = Steps
          List (ordered), 6 List Items, each a Link Block href #step-1 ... #step-6
            containing a Text Span "01" ... "06" followed by the label (Join the Partner Program, Introduce your clients, ...)
        Paragraph  class how-brochure   "Prefer to read it first? " + Link (class p-link, href #brochure) "Download our brochure"
    List (ordered)  class steps
      6 x List Item  class step   id step-1 ... step-6
        Div  class step-seg   attribute aria-hidden = true
        Div  class step-dot   attribute aria-hidden = true
        Div  class step-copy
          Paragraph  class step-num   attribute aria-hidden = true   "01"
          Heading H3                   step title
          Paragraph                    step text
        Embed (Code Embed)   the step's decorative card: copy the <div class="vis" aria-hidden="true"> ... </div> block of that step
  Div              class how-more       id brochure
    (move here) the existing white-divider horiz
    (move here) the existing partner-div botoom with its text and Download button (keep its interaction: it opens the pop-up)
  (move here) the existing leadgen-popup-overlay
```

Notes:
- The six visual cards are decorative (aria-hidden), contain small SVGs and inline `--w` values, so Code Embeds are the simplest way to keep them exact. Everything a reader needs is in the step text.
- The old carousel heading was a second H1 on the page; the new heading is an H2, so the page keeps one H1.
- Upload `proto/partner-program-v2/img/texture-waves.webp` (6 KB) to Assets and put its URL into the CSS where it says `ASSET-URL/texture-waves.webp`, or set it on the `how` class in the Designer (Backgrounds: image, cover, centre) and delete that url from the CSS.
- The sticky column clears the live nav (85px high): `top: calc(85px + 2rem)`, and `calc(85px + .75rem)` on short laptops. Measured: the column is 582 to 636px high, so it fits at 1280 x 720 and above.

### 3.3 Brochure line

The live closing line stays verbatim at the bottom of the teal band ("For more information, download our brochure or contact us below." and the gold Download button), spaced as live: faint full-width rule, 50px, the line, 16px, the button, 56px to the end of the band (checked in pixels against live at 1440 and 390). The sticky column's link now reads "Download our brochure" and jumps to it (`#brochure`); that label is the only new visible text on the page. On live, the Download button keeps opening the existing brochure pop-up form, which redirects to the PDF after submission. In the prototype it links straight to the PDF only because the pop-up is not rebuilt there.

### 3.4 Page custom code (CSS and JS to paste)

Page settings > Custom code. Webflow allows 50,000 characters per slot. The head block below is 15,893 characters and the footer block 3,902 characters, so both fit with room to spare. They contain the How it works styles and behaviour and the Our Partners marquee (section 4). They were generated from the tested prototype files and validated in the staging simulation (section 0).

Inside the head tag:

```html
<!-- Partner Program v2: paste into Page settings > Custom code > Inside <head> tag -->
<script>document.documentElement.classList.add('js')</script>
<style>
/* tokens used by the new How it works section (scoped; the site has no such variables) */
.how{--teal:#043435;--gold:#E1C979;--cream:#FFFCF5;--gold-ink:#7A6318;--grey:#61656E;--ink:#12161D;--line:rgba(4,52,53,.14);--line-dark:rgba(225,201,121,.3);--ease:cubic-bezier(.22,.61,.36,1);--f-display:Boska,Arial,sans-serif;--nav-h:85px;--gutter:2.5rem}
html{scroll-padding-top:calc(85px + 1rem)} /* anchors (#step-n, #brochure) land below the fixed nav (85px on live) */
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
/* prototype base styles the section relies on (scoped to .how) */
.how{padding-left:var(--gutter);padding-right:var(--gutter)}
.how-grid{width:100%;max-width:80rem;margin-left:auto;margin-right:auto}
/* element resets with element-level specificity (0,0,1): they beat the site's h2/p/ul/li rules by source order, but not the section's class rules */
:where(.how) h2,:where(.how) h3,:where(.how) p,:where(.how) dl,:where(.how) dd,:where(.how) li{margin:0}
:where(.how) ol,:where(.how) ul{list-style:none;margin:0;padding:0}
.how .tag{display:inline-flex;align-items:center;width:max-content;padding:8px 20px;border:1px solid var(--gold);border-radius:30px;font-size:15px;line-height:1.3}
.how .h2{font:italic 500 2.5rem/1.3 var(--f-display);text-wrap:balance}
.how :focus-visible{outline:2px solid var(--gold);outline-offset:3px}
/* ---------- how it works (from prototype v1, unchanged) ---------- */
.tag.on-dark{color:#fff}
.h2.on-dark{color:#fff}
.p-link{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 4px;color:#fff;font-size:15px;font-weight:500;border-bottom:1px solid rgba(225,201,121,.65);transition:border-color .2s,color .2s}
.p-link:hover{border-color:var(--gold)}
.p-link svg{width:16px;height:16px;fill:none;stroke:var(--gold);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:transform .3s var(--ease)}
.p-link:hover svg{transform:translateY(3px)}
.p-link.dark{color:var(--teal);border-color:rgba(4,52,53,.35)}
.p-link.dark:hover{border-color:var(--teal)}
/* ---------- how it works ---------- */
.how{position:relative;padding-block:6.25rem;background:var(--teal) url("ASSET-URL/texture-waves.webp") /* upload img/texture-waves.webp to Assets and paste its URL here */ center/cover no-repeat;color:#fff;isolation:isolate}
.how::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(4,52,53,.55),rgba(4,52,53,.85) 40%,rgba(4,52,53,.92))}
.how-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(3rem,7vw,7.5rem);align-items:start}
.how-aside{position:sticky;top:calc(var(--nav-h) + 2rem);align-self:start}
.how-aside-in{display:flex;flex-direction:column;align-items:flex-start;gap:22px}
.how-lead{font-weight:300;font-size:1.125rem;line-height:1.6;color:rgba(255,255,255,.82);max-width:30rem}
.how-nav{width:100%;max-width:24rem;margin-top:14px;border-top:1px solid var(--line-dark)}
.how-nav li{border-bottom:1px solid var(--line-dark)}
.how-nav a{display:flex;align-items:center;gap:16px;min-height:46px;padding:4px 2px;font-size:15px;color:rgba(255,255,255,.58);transition:color .3s}
.how-nav a span{font:400 .9375rem/1 var(--f-display);color:var(--gold);opacity:.75;width:1.9em;flex:none;letter-spacing:.04em;transition:opacity .3s} /* .75 keeps the dimmed numbers at 5.3:1 on teal (.65 measured 4.35:1) */
.how-nav a:hover{color:#fff}
.how-nav li.is-active a{color:#fff}
.how-nav li.is-active a span{opacity:1}
.how-nav li.is-active a::after{content:"";margin-left:auto;width:22px;height:1px;background:var(--gold)}
.how-brochure{font-size:15px;color:rgba(255,255,255,.72);margin-top:8px}
.how-brochure .p-link{min-height:44px}

.steps{position:relative;display:grid;padding-top:8px}
.step{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,19rem);gap:2.5rem;align-items:center;padding:2.5rem 0 2.5rem 3.25rem}
.step:first-child{padding-top:.5rem}
.step:last-child{padding-bottom:.5rem}
.step-seg{position:absolute;left:11px;top:0;bottom:0;width:1px;background:linear-gradient(180deg,rgba(225,201,121,.55),rgba(225,201,121,.55));transform-origin:top}
.step:first-child .step-seg{top:calc(.5rem + 12px)}
.step:last-child .step-seg{bottom:auto;height:calc(.5rem + 12px)}
.step-dot{position:absolute;left:0;top:calc(2.5rem + 2px);width:23px;height:23px;border-radius:50%;border:1px solid var(--gold);background:var(--teal);display:grid;place-items:center}
.step:first-child .step-dot{top:calc(.5rem + 2px)}
.step-dot::after{content:"";width:9px;height:9px;border-radius:50%;background:var(--gold);transform:scale(0);transition:transform .5s var(--ease)}
.step-copy{display:flex;flex-direction:column;gap:12px;min-width:0}
.step-num{font:400 .9375rem/1 var(--f-display);color:var(--gold);letter-spacing:.06em}
.step h3{font:italic 500 1.75rem/1.25 var(--f-display);color:#fff;text-wrap:balance}
.step-copy p:not(.step-num){font-weight:300;font-size:1.0625rem;line-height:1.6;color:rgba(255,255,255,.82);max-width:34rem}

/* step visuals: small brand cards built from CSS, no figures */
.vis{min-width:0}
.vis-card{background:var(--cream);color:var(--teal);border-radius:10px;padding:20px 22px 22px;display:flex;flex-direction:column;gap:12px;box-shadow:0 30px 50px -36px rgba(0,0,0,.6)}
.vis-k{font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--gold-ink);line-height:1.3}
.vis-t{font:italic 500 1.125rem/1.3 var(--f-display);color:var(--teal);margin-top:-6px}
.vis-lines{display:grid;gap:7px;margin-top:2px}
.vis-lines i{display:block;height:6px;width:var(--w,80%);border-radius:3px;background:rgba(4,52,53,.12)}
.vis-row{display:flex;justify-content:space-between;gap:12px;margin-top:4px}
.vis-row.small{font-size:12px;color:var(--grey);border-top:1px solid var(--line);padding-top:10px}
.vis-sig{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--grey);flex:1}
.vis-sig b{display:block;height:1px;background:var(--teal);opacity:.55;width:100%}
.vis-chip{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;padding:5px 11px;border-radius:999px;border:1px solid var(--line);font-size:12px;font-weight:500;color:var(--teal)}
.vis-chip.ok{border-color:transparent;background:var(--gold);color:var(--ink)}
.vis-chip svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.vis-path{display:flex;align-items:center;gap:10px;margin-top:2px}
.vis-node{flex:1;text-align:center;padding:10px 8px;border:1px solid var(--line);border-radius:6px;font-size:13px;font-weight:500}
.vis-node.is-teal{background:var(--teal);color:#fff;border-color:var(--teal)}
.vis-arrow{width:34px;height:12px;fill:none;stroke:var(--gold-ink);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round;flex:none}
.vis-dl{display:grid;gap:6px;margin:0}
.vis-dl div{display:flex;justify-content:space-between;gap:12px;font-size:13px;border-bottom:1px solid var(--line);padding-bottom:6px}
.vis-dl dt{color:var(--grey)}
.vis-dl dd{margin:0;font-weight:500}
.vis-stack{display:grid;gap:6px;margin-top:2px}
.vis-stack span{display:flex;align-items:center;padding:0 12px;border-radius:4px;font-size:12.5px;font-weight:500;letter-spacing:.02em}
.vis-stack .l1{height:46px;background:var(--teal);color:#fff}
.vis-stack .l2{height:30px;background:rgba(4,52,53,.14);color:var(--teal)}
.vis-stack .l3{height:24px;background:var(--gold);color:var(--ink)}
.vis-checks{display:grid;gap:9px;margin-top:2px}
.vis-checks li{position:relative;display:flex;align-items:center;gap:10px;font-size:13.5px;color:var(--grey)}
.vis-checks li::before{content:"";width:16px;height:16px;border-radius:50%;border:1px solid rgba(4,52,53,.32);flex:none;background:center/9px no-repeat}
.vis-checks li.done{color:var(--teal)}
.vis-checks li.done::before{background-color:var(--teal);border-color:var(--teal);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%23fff' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2.5 6.5l2.3 2.3L9.6 4'/%3E%3C/svg%3E")}
.vis-checks li.now{color:var(--teal);font-weight:500}
.vis-checks li.now::before{border-color:var(--gold);background-color:var(--gold);box-shadow:inset 0 0 0 3px var(--cream)}
.vis-flow{display:grid;margin-top:2px}
.vis-flow li{position:relative;display:flex;align-items:flex-start;gap:12px;padding:0 0 14px 0;font-size:13.5px;color:var(--teal)}
.vis-flow li:last-child{padding-bottom:0}
.vis-flow li b{flex:none;width:10px;height:10px;border-radius:50%;background:rgba(4,52,53,.42);margin-top:5px}
.vis-flow li::before{content:"";position:absolute;left:4.5px;top:15px;bottom:-1px;width:1px;background:var(--line)}
.vis-flow li:last-child::before{display:none}
.vis-flow li.gold{font-weight:500}
.vis-flow li.gold b{background:var(--gold);box-shadow:0 0 0 3px rgba(225,201,121,.3)}
.vis-seq{display:grid;gap:8px;margin-top:2px}
.vis-seq li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;border:1px solid var(--line);border-radius:6px;font-size:13px}
.vis-seq em{font-style:normal;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--ink);background:var(--gold);padding:3px 8px;border-radius:999px}

/* scroll-driven reveal: native where supported */
@supports (animation-timeline: view()){
  @media (prefers-reduced-motion:no-preference){
    .step-copy,.step .vis{animation:step-in linear both;animation-timeline:view();animation-range:entry 12% entry 55%}
    .step .vis{animation-range:entry 20% entry 65%}
    .step-seg{animation:seg-grow linear both;animation-timeline:view();animation-range:entry 0% entry 80%}
    .step-dot::after{transition:none;animation:dot-in linear both;animation-timeline:view();animation-range:entry 30% entry 50%}
  }
}
/* fallback: IntersectionObserver toggles .is-in (JS only; without JS everything is visible) */
@supports not (animation-timeline: view()){
  @media (prefers-reduced-motion:no-preference){
    html.js .step .step-copy,html.js .step .vis{opacity:0;transform:translateY(26px);transition:opacity .8s var(--ease),transform .8s var(--ease)}
    html.js .step .vis{transition-delay:.12s}
    html.js .step.is-in .step-copy,html.js .step.is-in .vis{opacity:1;transform:none}
    html.js .step .step-seg{transform:scaleY(0);transition:transform 1s var(--ease)}
    html.js .step.is-in .step-seg{transform:none}
  }
}
.step.is-in .step-dot::after{transform:scale(1)}
@keyframes step-in{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
@keyframes seg-grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes dot-in{from{transform:scale(0)}to{transform:scale(1)}}
/* live closing line moved into the band: the existing .white-divider.horiz and .partner-div.botoom elements, spaced as live
   (rule, 50px, line, 16px, Download, 56px to the end of the band). Bottom spacing is the section's padding, not a child margin. */
.how-more{margin-top:4.5rem}
.how-more .white-divider{width:auto;margin-left:calc(-1 * var(--gutter));margin-right:calc(-1 * var(--gutter))}
.how .partner-div.botoom{margin-top:50px;margin-bottom:0}
/* short laptops (1280x720, 1366x768, 1024x768): shorter sticky column so the brochure link is never clipped (from v1) */
@media (min-width:992px) and (max-height:820px){
  .how-aside{top:calc(var(--nav-h) + .75rem)}
  .how-aside-in{gap:16px}
  .how-nav{margin-top:8px}
  .how-nav a{min-height:42px}
}
@media (max-width:1180px){
  .step{grid-template-columns:minmax(0,1fr) minmax(0,16rem);gap:1.75rem}
}
@media (max-width:991px){
  .how{--gutter:2rem}
  .how{padding-block:4.5rem}
  .how-grid{grid-template-columns:minmax(0,1fr);gap:3rem}
  .how-aside{position:static}
  .how-nav{display:none}
  .steps{padding-top:0}
  .step{grid-template-columns:minmax(0,1fr);gap:1.5rem;align-items:start;padding:2rem 0 2rem 2.75rem}
  .step .vis{max-width:26rem}
}
@media (max-width:767px){
  .how{--gutter:1.25rem}
  .how .h2{font-size:2rem}
  .how-more{margin-top:3rem}
  .how{padding-block:3.5rem}
  .how-grid{gap:2.25rem}
  .step{padding:1.5rem 0 1.5rem 2.25rem}
  .step h3{font-size:1.5rem}
  .step .vis{max-width:none}
  .step-dot{top:calc(1.5rem + 2px);width:19px;height:19px}
  .step-seg{left:9px}
  .step:first-child .step-dot{top:calc(.5rem + 2px)}
  .step:first-child .step-seg{top:calc(.5rem + 10px)}
  .step:last-child .step-seg{height:calc(.5rem + 10px)}
}
.how{padding-bottom:3.5rem} /* 56px under the Download button, as live; placed after the v1 padding-block rules on purpose */

/* ---------- our partners: CHANGED vs live. MARQUEE BLOCK START (paste-ready, see HANDOFF.md) ----------
   Combo classes on the live elements: .assets-card-content-wrap.marquee, .container.marquee-viewport, .assets-card-grid.marquee-group,
   plus a new .marquee-track between them and a second, aria-hidden copy of the grid. Everything that moves sits inside
   prefers-reduced-motion:no-preference, so with reduced motion the untouched live 4 x 2 grid shows (second copy and button hidden).
   Slow loop (45s at 1440 = 8 tiles x 327px), edge fade, pauses on hover, on focus inside the strip and with the toggle (WCAG 2.2.2). */
.marquee{--tile:327px;--loop:45s;--fade:clamp(32px,8%,128px)}
@keyframes marquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}
@media (prefers-reduced-motion:no-preference){
  .assets-card-content-wrap.marquee{padding-left:0;padding-right:0}
  .marquee .marquee-viewport{max-width:calc(var(--tile) * 8);padding-left:0;padding-right:0;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 var(--fade),#000 calc(100% - var(--fade)),transparent);mask-image:linear-gradient(90deg,transparent,#000 var(--fade),#000 calc(100% - var(--fade)),transparent)}
  .marquee .marquee-track{display:flex;width:max-content;animation:marquee var(--loop) linear infinite;will-change:transform}
  .marquee .marquee-group{display:flex;flex:none;overflow:visible}
  .marquee .marquee-group .assets-card-new{flex:none;width:var(--tile);height:var(--tile);aspect-ratio:auto;padding-top:0;padding-bottom:0;border-style:solid;border-color:rgba(40,40,40,.2);border-width:0 0 0 1px}
  .marquee .assets-mid-divider{display:none}
  .marquee:hover .marquee-track,.marquee:focus-within .marquee-track,.marquee.is-paused .marquee-track{animation-play-state:paused}
  /* an explicit press of "play" wins over hover/focus until the pointer and focus have left the strip (see the JS) */
  .marquee.is-playing:not(.is-paused) .marquee-track{animation-play-state:running}
  html.js .marquee .marquee-toggle{display:grid}
}
@media (prefers-reduced-motion:reduce){.marquee .marquee-group[aria-hidden="true"]{display:none}}
/* pause/play toggle: quiet teal outline on cream, 44px target, just below the strip on the right; only shown when JS runs and motion is allowed */
.marquee-toggle{display:none;position:absolute;right:max(16px,calc((100% - 1380px) / 2 + 2.25rem));top:calc(100% + 12px);bottom:auto;z-index:2;width:44px;height:44px;place-items:center;padding:0;border:1px solid #043435;border-radius:50%;background-color:#FFFCF5;color:#043435;cursor:pointer;transition:background-color .2s,color .2s}
.marquee-toggle:hover{background-color:#043435;color:#FFFCF5}
.marquee-toggle:focus-visible{outline:2px solid #043435;outline-offset:3px}
.marquee-toggle svg{display:block;width:16px;height:16px;fill:currentColor}
.marquee-toggle .i-play,.marquee-toggle[aria-pressed="true"] .i-pause{display:none}
.marquee-toggle[aria-pressed="true"] .i-play{display:block}
@media (max-width:991px){.marquee{--tile:240px;--loop:34s}}
@media (max-width:767px){.marquee{--tile:200px;--loop:30s;--fade:64px}.marquee-toggle{right:16px}}
@media (max-width:767px) and (prefers-reduced-motion:no-preference){html.js .assets-card-content-wrap.marquee{margin-bottom:44px}} /* room for the pause button below the strip */
</style>
```

Before the closing body tag:

```html
<!-- Partner Program v2: paste into Page settings > Custom code > Before </body> tag -->
<script>
/* Roscap Partner Program: How it works section and Our Partners marquee. No libraries.
   Everything here is progressive enhancement: without JS the page is fully readable and the marquee still runs
   (CSS only, pauses on hover); only the pause button needs JS, so it is shown only when JS runs. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var revealOnce = function (els, opts) {
    if (reduce || !hasIO) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, opts);
    els.forEach(function (el) { io.observe(el); });
  };

  /* 1. How it works (from prototype v1): reveal fallback for browsers without scroll-driven animations,
     and the sticky step indicator that highlights the step nearest the middle of the viewport. */
  var steps = $$('.step');
  revealOnce(steps, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  var navItems = $$('.how-nav li');
  var setActive = function (id) {
    navItems.forEach(function (li) {
      var a = $('a', li);
      var on = a && a.getAttribute('href') === '#' + id;
      li.classList.toggle('is-active', on);
      if (a) { if (on) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); }
    });
  };
  if (steps.length && navItems.length) {
    if (hasIO) {
      var current = null;
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) current = e.target.id; });
        if (current) setActive(current);
      }, { rootMargin: '-40% 0px -45% 0px', threshold: 0 });
      steps.forEach(function (s) { io2.observe(s); });
    }
    setActive(steps[0].id);
  }

  /* 2. Our Partners marquee: pause/play toggle (WCAG 2.2.2). CSS does the motion and the hover/focus pause.
     aria-pressed="true" means paused. An explicit "play" overrides the hover/focus pause until pointer and focus leave. */
  var strip = $('[data-marquee]');
  var toggle = strip && $('.marquee-toggle', strip);
  if (toggle) {
    toggle.addEventListener('click', function () {
      var paused = toggle.getAttribute('aria-pressed') !== 'true';
      toggle.setAttribute('aria-pressed', String(paused));
      strip.classList.toggle('is-paused', paused);
      strip.classList.toggle('is-playing', !paused);
    });
    var release = function () { strip.classList.remove('is-playing'); };
    strip.addEventListener('mouseleave', function () { if (!strip.contains(document.activeElement)) release(); });
    strip.addEventListener('focusout', function (e) { if (!strip.contains(e.relatedTarget) && !strip.matches(':hover')) release(); });
  }
  /* logos stay lazy, but load all of them once the strip is within 800px of the viewport: native lazy loading never
     starts a logo that is still outside the strip's horizontal clip, so it would pop in while sliding into view */
  if (strip) {
    var logos = $$('img[loading="lazy"]', strip);
    var eager = function () { logos.forEach(function (im) { im.loading = 'eager'; }); };
    if (hasIO) {
      var io3 = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { eager(); io3.disconnect(); }
      }, { rootMargin: '800px 0px' });
      io3.observe(strip);
    } else eager();
  }

})();
</script>
```

What the code does:
- Steps reveal on scroll with CSS scroll-driven animations (`animation-timeline: view()`) inside `@supports`, with an IntersectionObserver fallback for browsers without it (Safari and Firefox at the time of writing). No library, no scroll-jacking. Without JS everything is visible.
- The step indicator in the sticky column highlights the step nearest the middle of the viewport (`aria-current="step"`).
- `prefers-reduced-motion: reduce`: nothing moves, all steps are fully visible.
- The first line (`document.documentElement.classList.add('js')`) must stay in the head so the start states apply before the first paint.
- The element resets inside the block use `:where(.how)`, so they beat the site's `h2`, `p`, `ul` and `li` rules (for example `li { margin-bottom: .25rem }`) without overriding the section's own classes. This was the one adjustment the staging simulation needed.

## 4. Our Partners: slow marquee

### 4.1 Designer steps (the live elements stay, with combo classes)

```
Section  section pt-0                                         (existing)
  Div    assets-card-content-wrap + combo class marquee       (existing)   attribute data-marquee = true
    Div  container + combo class marquee-viewport             (existing)
      Div  marquee-track                                      (NEW wrapper, no Designer styles)
        Div  assets-card-grid + combo class marquee-group     (existing grid)   attributes role = list, aria-labelledby = partners-h
          8 x assets-card-new                                 (existing tiles, keep is-last on tile 3 and lasst on tiles 4 and 8)
               attribute role = listitem; set each logo's alt text to the firm name
        Div  assets-card-grid marquee-group                   (DUPLICATE of the grid above)   attribute aria-hidden = true
               set the 8 images in this copy to decorative (empty alt)
    Div  assets-mid-divider hide-mobile-landscape             (existing)
    Code Embed: the pause button (below)
```

- Give the "Our Partners" heading the id `partners-h` (element settings), so the list is announced as "Our Partners".
- Alt texts for the first copy: Revere, ANYO, Cambridge Finance, Capio Consult, Alliance Capital, Crown Investments, RYRE, Design Space 2 (live has empty alts today).
- Pause button Code Embed:

```html
<button class="marquee-toggle" type="button" aria-pressed="false" aria-label="Pause partner logos">
  <svg class="i-pause" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4.5 3h2.25v10H4.5zM9.25 3h2.25v10H9.25z"/></svg>
  <svg class="i-play" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5 2.75v10.5L13.25 8z"/></svg>
</button>
```

The CSS (marquee part of the head block) and the JS (toggle and logo loading, in the footer block) are in section 3.4.

### 4.2 Behaviour

- Pure CSS: `@keyframes` translateX(-50%) on the track holding two identical copies, so the loop is seamless. One loop takes 45s at 992px and wider (8 tiles x 327px, about 58px per second), 34s with 240px tiles at 768 to 991px, 30s with 200px tiles on phones. Tiles keep the live look: hairline left border, square, logos at their live sizes (max 204 x 108, Capio 150 x 130; max width 140 below 992px).
- Edge fade with `mask-image` (8% each side, at most 128px; 64px on phones). The top and bottom hairlines stay full width.
- Pauses on hover, when anything inside the strip has keyboard focus, and with the button. The button (44 x 44 px, teal outline on cream, just below the strip on the right) uses `aria-pressed` (true = paused) and keeps the accessible name "Pause partner logos" (WCAG 2.2.2 Pause, Stop, Hide). An explicit press of play restarts it even while hovered or focused.
- `prefers-reduced-motion: reduce`: no animation at all. The second copy and the button are hidden, and because every moving rule sits inside `prefers-reduced-motion: no-preference`, the untouched live 4 x 2 grid shows (2 columns at tablet, 1 on phones). Pixel-identical to today's grid in the prototype and in the staging simulation.
- Screen readers hear one list of 8 firm names; the copy is `aria-hidden`.
- Logos stay lazy, but the script switches them to eager when the strip is within 800px of the viewport. Native lazy loading never starts a logo that is still outside the strip's horizontal clip, so without this the logos would pop in while sliding into view. The copy reuses the same image URLs, so nothing is downloaded twice.

## 5. Contact block: make Submit work (no visible change)

### 5.1 The problem on live

On desktop (992px and wider) the visible Submit is `<a fs-mirrorclick-element="trigger" href="#">`. It relies on Finsweet Attributes mirror-click to click the hidden native submit, but /partner-program never loads that script (Home, About, Insights and Contact Us do). So desktop visitors cannot send this form; the link only jumps to the top of the page. Below 992px the native submit is shown and works.

### 5.2 Fix (choose one)

A. Recommended, no third-party script: in `contact-button-wrap`, replace the link with a Code Embed:

```html
<button type="submit" form="wf-form-Contact-Form" class="button golden w-button">Submit</button>
```

Same class, same look (84 x 41 px, same position; verified). The `form` attribute ties it to the form, so the browser validates the required fields and Webflow's normal submission runs (notification, success message). Do 5.3 first, otherwise `form="wf-form-Contact-Form"` points at the brochure pop-up form, which comes first in the page.

B. Quickest: load Finsweet Attributes on this page as Contact Us does (page head):

```html
<script async type="module" src="https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js" fs-mirrorclick></script>
```

Then remove `fs-mirrorclick-element="target"` from the brochure pop-up's submit button (it carries the same attribute), or pair the contact trigger and target with a shared `fs-mirrorclick-instance` value, so the visible Submit clicks only the contact form. The visible control stays a link (less robust for keyboard and screen reader users), which is why A is preferred.

C. Show the native submit on desktop as well and remove the link: simplest, but the button moves under the Message field, which changes the look. Not recommended.

If the contact block is a Component shared with Home and Insights, option A applies there too and works with or without Finsweet.

### 5.3 Unique ids on this page

Both forms on this page are named "Contact Form", so both render `id="wf-form-Contact-Form"`, and the pop-up's fields reuse the ids `name`, `email` and `Phone`. Rename the brochure pop-up form to "Brochure Form" (Form settings > Name) and its field ids to `brochure-name`, `brochure-email`, `brochure-phone` (element settings > ID). Leave the fields' Name settings alone so submission data keeps its keys. Note: from then on, brochure leads appear under "Brochure Form" in Webflow's form submissions; update any Make, Zapier or notification filter that matches on the form name.

### 5.4 Hidden labels, autocomplete, Subject

- Add a Label element before each contact field, For = the field id (`name`, `email`, `Phone`, `Subject`, `Message`), text = the placeholder (Name, Email, Phone, Subject, Message), class `sr-only`:
  position absolute; width 1px; height 1px; padding 0; margin -1px; overflow hidden; clip rect(0,0,0,0); white-space nowrap; border 0.
  The placeholders and the look stay exactly as they are.
- Custom attributes: Name field `autocomplete` = `name`; Email field `autocomplete` = `email`; Phone field `autocomplete` = `tel`.
- Subject: already "Plain" (`type="text"`) on this page; keep it. The Contact Us page form still has `type="tel"` on Subject, which is a separate item already in the audit.

## 6. Claims for Clemente (unchanged, still open)

The owner asked to keep the wording, so these stay exactly as live and remain open questions in the audit:
- Hero: "Join hundreds of current partners who are successfully working with Roscap ...". Unconfirmed number.
- Why card 2: "Earn an additional recurring revenue stream with minimal work". "recurring" and "minimal work" read as an income promise.
- "commissions in perpetuity" was in step 06 of the live carousel. The owner-approved How it works section replaces the carousel, so that phrase is no longer on the page. Its step 06 reads "If Roscap goes on to complete subsequent transactions with the same client, you receive a referral fee on those as well, as set out in the partner agreement." That wording, and the section's other statements (written partner agreement, exclusive introductions, confidentiality, fee basis and timing), still need Clemente's confirmation. Each is marked `<!-- CONFIRM WITH CLEMENTE -->` in `index.html`.
- Unchanged elsewhere: the meta description ("receive a referral commission when the deal completes") and the footer disclaimer. Nothing on the page states or implies FCA authorisation; the disclaimer says Roscap is not authorised or regulated by the FCA.

## 7. QA checklist (staging)

- [ ] Hero, Why heading, Our Partners heading and the contact block look identical to live at 1440, 1024, 768 and 390 (compare with `shots/partner-v2/sbs-*.png`).
- [ ] Why cards: icon, 32px, text; equal heights per row; 287px high at 1440; 1 column on phones with 28px between icon and text; gold border on hover as before.
- [ ] Swiper gone: no swiper files in the Network panel, no console errors.
- [ ] How it works: sticky column at 992px and wider; the indicator follows the steps; indicator links scroll to each step below the nav; steps reveal in Chrome and Edge (scroll-driven) and in Safari and Firefox (fallback); "Download our brochure" scrolls to the closing line; Download opens the brochure pop-up and its form still redirects to the PDF.
- [ ] One H1 on the page (Partner Program); How it works heading is an H2.
- [ ] Our Partners: logos move slowly right to left without a jump at the loop point; pause on hover; Tab reaches the pause button and the strip pauses; Enter or Space toggles pause and play (`aria-pressed` flips); no logo pops in at the right edge.
- [ ] Reduced motion (macOS: Accessibility > Display > Reduce motion; Windows: Settings > Accessibility > Visual effects > Animation effects off): logos show today's 4 x 2 grid, no pause button, How it works fully visible, nothing animates.
- [ ] Contact, desktop: empty Submit shows the browser's required-field messages; a valid Submit sends (notification email arrives, success state as today); Enter in a field also submits.
- [ ] Contact, mobile: the in-form Submit works as before.
- [ ] Screen reader: fields announced as Name, Email, Phone, Subject, Message; the partner list read once (8 names).
- [ ] No duplicate ids (Chrome DevTools console: `[...document.querySelectorAll('[id]')].map(e=>e.id).filter((v,i,a)=>a.indexOf(v)!==i)` returns an empty list).
- [ ] axe DevTools: 0 serious or critical issues at 1440 and 390.
- [ ] 390px: no horizontal scroll.
- [ ] Short laptops (1280 x 720, 1366 x 768): the sticky column, including "Download our brochure", stays fully visible while the steps scroll.

## 8. Performance

- Removed: Swiper JS and CSS (about 47 KB gzipped, 2 requests) and the hidden timeline markup.
- Added: about 16,000 characters of CSS and 4,000 of JS inline, and one 6 KB texture. Logos are the same 8 files (143 KB), lazy, no second download for the copy.
- Optional (invisible, not part of this brief): hero image Eager with `fetchpriority=high` (section 1). The contact card's wave texture is a 684 KB SVG on live; the prototype shows the same look with a 47 KB WebP (101 KB at 2x) pre-composited on teal (`img/contact-waves.webp`, `img/contact-waves@2x.webp`). Swapping it would affect every page that uses the contact block, so it needs its own decision.

## 9. Prototype-only differences (ignore when building)

- Nav and footer are the shared prototype versions, not the live symbols (live nav is a floating translucent bar; the live footer has a mail icon and a different layout). Nothing changes in the live symbols.
- On a 1x 390px screen the prototype's hero photo looks sharper (it serves the 800w file, live picks its 500w file). Phones with 2x or 3x screens get the 1080w or 1600w file on live, so real visitors see the same.
- The live "slide in from the bottom" interaction on every section is re-created in the prototype's CSS and JS so the page feels the same; on live it already exists in Interactions, nothing to build.
- The contact texture is the pre-composited raster mentioned in section 8.
- The form is a mock (`data-mock`): nothing is sent; a note appears after a valid submit.
- The "Prototype · Partner Program" label.
- The prototype uses `.wf-container` where live uses `.container` (the shared prototype stylesheet already owns `.container`).
