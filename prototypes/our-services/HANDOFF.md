# Our Services: Webflow handoff

For Shikhar. Build and check on staging (roscap-site.webflow.io) first, then publish.

- Prototype (single file, open locally): `our-services.bundle.html` (this folder)
- Source: `index.html`, `services.css`, `services.js`, `img/` (shared nav, footer and fonts in `../shared`)
- Paste-ready Webflow code: `webflow/capital-stack-embed.html`, `webflow/page-head.html`, `webflow/page-footer.html`
- Screenshots: `screenshots/` (`compare-live-vs-prototype-*` images are live on the left, prototype on the right)

The owner's brief (31 October): keep Our Services as it is today. The earlier capital stack prototype with four narration panels was too much; the only new motion is the capital stack building itself, and the Asset Classes section stays the same as live with a better entrance. No copy changes apart from one duplicated sentence.

## 0. What changes, section by section

| Section | Change | Effort |
|---|---|---|
| Hero | None | - |
| Our expertise (two-column grid) | The capital stack image `img.wwa-image` ("Group 1597880904.svg", 37.7 KB of outlined shapes with empty alt text) is replaced by the same graphic as inline SVG with real text (3.0 KB). It looks the same and builds once, bottom up, when it comes into view | S |
| Debt funding and its cards | None | - |
| Equity funding | Text fix: the first sentence is printed twice on live; it is printed once | S |
| Equity cards | None | - |
| Asset Classes | Same section, same icons, same grid. Only the entrance changes: the eight cards fade up one after another instead of each icon jumping 100 px | S |
| Our Process, CTA, footer | None | - |

How the prototype was checked against live (Playwright, 1440 and 390 wide): every section was captured side by side with the live page and compared (`screenshots/compare-live-vs-prototype-*`); section positions and heights match live except the Equity paragraph (one sentence shorter) and the shared prototype footer. The capital stack graphic matches the live image in size and position (641 x 645 at 1440, 358 x 360 at 390).

## 1. Capital stack: same graphic, real text, a short build

Steps:
1. In the Our expertise two-column grid, select the image `img.wwa-image` and replace it with a Code Embed. Paste `webflow/capital-stack-embed.html` (3,007 characters).
2. Page settings > Custom code > Inside head tag: paste `webflow/page-head.html` (4,533 characters; it holds this block and section 3).
3. Page settings > Custom code > Before body tag: paste `webflow/page-footer.html` (2,019 characters).

What the visitor sees: when 40% of the card is on screen, the four layers drop into place from the bottom up (Senior Debt, then Mezzanine Debt, Preferred Equity and Common Equity, 0.34 s each, 0.24 s apart), then the Debt and Equity brackets and the risk and return axis draw in and their labels fade in. About 1.6 s, once; scrolling back does not replay it. Before that moment the stack is held at its start; if the script does not run, or the visitor prefers reduced motion, the complete stack simply shows.

Why real text: the live image is outlined shapes, so screen readers and search engines get nothing from the page's central diagram, and its labels become 7 to 9 px on phones. The SVG keeps the live geometry and colours and uses Switzer text, so it scales exactly like the image did. Screen readers hear "The Capital Stack, Common Equity, Preferred Equity, Mezzanine Debt, Senior Debt, Equity, Debt, High risk, High return, Low risk, Low return".

No-code alternative for the build: an Interactions "scroll into view" trigger on the embed (play once) with the same order and timings does the same job; then only steps 1 and the head CSS's static styles are needed.

## 2. Equity text fix

Live prints: "We raise and structure equity for developers, sponsors, and family offices seeking joint ventures, preferred equity, or direct co-investment.We raise and structure equity for developers, sponsors, and family offices seeking joint venture, preferred equity, or direct co-investment." In the Designer, delete the second copy so the paragraph reads once: "We raise and structure equity for developers, sponsors, and family offices seeking joint ventures, preferred equity, or direct co-investment." The second paragraph stays as it is.

## 3. Asset Classes: same section, better entrance

On live, the grid section slides up 100 px and, at the same time, each icon slides up another 100 px. The prototype keeps the section, the eight icons, the labels, the grid lines and the hover (icon scales to 1.25) exactly as live; only the entrance changes: the grid and its lines stay still, and the cards fade up 24 px one after another, 70 ms apart, icon then label, as they come into view (all eight in about 1.2 s at desktop; one by one on phones as each scrolls in).

Steps:
1. Interactions panel: remove the scroll-into-view (slide in) animation from the Assets Icon elements. Keep their hover interaction.
2. The CSS is in `webflow/page-head.html` (ASSET CLASSES ENTRANCE block) and the script in `webflow/page-footer.html`. The CSS holds the grid section (`section.section.pt-0.icon-grid`) still with `!important` over the page-wide section slide-in, so the grid lines do not move.
3. Nothing is hidden unless the footer script has run (it adds `as-armed` to the grid first). Reduced motion: no animation, everything visible.

## 4. QA checklist (staging)

- [ ] Every section looks identical to live at 1440, 1024, 768 and 390 (compare with `screenshots/compare-live-vs-prototype-*`), apart from the one-sentence Equity paragraph.
- [ ] Capital stack: scroll down slowly; the stack builds once from the bottom up when it is about half on screen; scroll back up and down: no replay. Labels are selectable text.
- [ ] Asset Classes: the grid lines stay still; the cards fade up one after another; hovering a card still enlarges its icon.
- [ ] Reduced motion on (macOS Accessibility > Display > Reduce motion; Windows Settings > Accessibility > Visual effects): the complete stack and all eight cards show at once, nothing moves.
- [ ] No console errors; axe DevTools 0 violations at 1440 and 390; no horizontal scroll at 390.
- [ ] Screen reader: the capital stack is read as one image with its full text (VoiceOver or NVDA).

## 5. Results (prototype bundle, Playwright, Chromium)

- 0 console errors; axe 0 violations at 1440 and 390, with and without reduced motion; no horizontal overflow (scrollWidth 1440 and 390).
- Capital stack: held at its start until 40% of the card is visible, then fully built in order (Senior Debt about 0.1 s, Mezzanine 0.35 s, Preferred 0.53 s, Common Equity 0.77 s, labels 1.6 s after the trigger). Reduced motion: complete at once.
- Asset cards at 1440: all eight visible in order within about 1.2 s; hover still scales the icon to 1.25.
- No narration panels or extra text anywhere on the page.

## 6. Performance

- The capital stack drops from a 37.7 KB SVG image request to 3.0 KB of inline SVG.
- Added code: 4.5 KB of CSS and 2.0 KB of JS inline, no libraries, no extra requests. Both animations are time-based, run once and use opacity and transforms only.

## 7. Prototype-only differences (ignore when building)

- Nav and footer are the shared prototype versions, not the live symbols.
- The live "slide in" interactions on the sections and the process step highlighting are re-created in the prototype's CSS and JS so the page feels the same; on live they already exist in Interactions, nothing to build.
- The "Prototype · Our Services" label.
- The prototype uses `.wf-container` where live uses `.container`.
