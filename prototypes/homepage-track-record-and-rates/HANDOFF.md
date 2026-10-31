# Handoff: Home page, market rates panel and Track Record deal list

For Shikhar (Webflow). Build on roscap-site.webflow.io first, check the QA list, then publish.
Approved design: concept F (deal list with preview) plus the odometer rates panel. Nothing was redesigned; this is the production version.

## Files

| What | Path |
| --- | --- |
| Working prototype (open index.html; shared assets in ../shared) | proto/homepage-track-record-and-rates/index.html, home.css, home.js, rates.js, deal-list.js, hero.mp4 |
| Single-file bundle for review (1,406 KB; the hero video stays a separate file next to it) | proto/dist/homepage-track-record-and-rates.html |
| Paste-ready Webflow code | proto/homepage-track-record-and-rates/webflow/home-head.html (12,745 chars), home-footer.html (27,951 chars), rates-panel.markup.html, track-record.markup.html |
| Screenshots | shots/home-F/*.png (1440, 1024 and 390 widths, reduced motion, feed blocked, feed corrupted) |
| Test script and report | tools/verify-home.js, shots/home-F/report.json |

## 1. Rates panel: mapping onto the existing Home section

The live Home page has `section.is-baserate > .container.is-baserate > .baserate-cards-wrap > .baserate-card` x3, with `p#baserate-boe|fed|euribor` and `p#changerate-*`, and a footer script that fetches rates.json and writes `display` and `change_display` into those ids.

Keep the section and container. Replace `.baserate-cards-wrap` with the structure in `webflow/rates-panel.markup.html`:

- `div#rates-panel.rates-panel` with custom attribute `data-feed` = `https://edusancheez2005.github.io/roscap-rates/rates.json`.
- `.rates-content` > `.rates-head` (`h2.rates-h` "Current market rates" and `p#rates-updated.upd` > `i` + `span.upd-t`), then `ul.rate-list` with three `li.rate`, then `p.rates-src`.
- Each `li.rate`: `p.rate-name` (name + `span` sub-label), `.rate-line` > `p.rate-val` (`span.num#baserate-{key}` + `span.unit` "%") and `p.rate-move` (`span.chip#changerate-{key}` > svg + `span.chip-t`, `span.rate-date#changedate-{key}`, `span.rate-asof#asof-{key}`).
- The ids `baserate-*` and `changerate-*` are kept, so the current footer script would still fill the number and chip if the new script were ever removed. New ids: `changedate-*`, `asof-*`; `rates-updated` is the id the current script already uses.
- `data-from` on the number spans sets the odometer start digits: `0.00` (BoE), `0.00–0.00` (Fed, en dash), `0.000` (EURIBOR). Setting `data-roll-from="previous"` on `#rates-panel` rolls from the previous value (value minus last change) instead.
- Remove the three Webflow interactions that set `opacity:0` on the cards (`data-w-id`); the entrance is CSS now.
- No canvas element is needed in the Designer: `rates.js` creates the wave canvas itself.

Designer placeholders (what the page shows before the script runs, and if the feed fails): BoE `3.75` / chip `Cut 25 bps` / `since 18 Dec 2025` / `As of 31 Oct 2026`; Fed `3.75–4.00` / `Raised 25 bps` / `since 17 Sep 2026` / `As of 30 Oct 2026`; EURIBOR `2.643` / `Up 2.5 bps` / `fixing of 29 Oct 2026`; `Checked 31 Oct 2026`. Update them to the day's values when you publish; the script overwrites them within a second anyway.

Replacement footer script: the first `<script>` in `webflow/home-footer.html` (rates.js) replaces the current rates block (the one starting `document.addEventListener("DOMContentLoaded"... const FEED =`). Leave the Swiper and GSAP code above it untouched. What the new script does:

- Fetches the feed once, validates every rate (numbers within 0 to 25, `display` matching `^\d+(\.\d+)?%( - \d+(\.\d+)?%)?$`, dates `YYYY-MM-DD`, `change` within 5 points, `changed_on` present for BoE and Fed), honours `rate.stale` and the top-level `stale` array, and treats `as_of` older than 10 days as stale.
- Writes BoE and Fed as "Cut 25 bps" or "Raised 25 bps" with "since {changed_on}" (for the Fed this is FRED's effective date, 17 Sep 2026, not the FOMC meeting date, so the word "decision" is never used) and "As of {as_of}". EURIBOR gets "Up 2.5 bps" or "Down x bps" from `change` and "fixing of {as_of}". "Held" is never written: the feed only carries the last change.
- "Checked 31 Oct 2026" is the feed's check time (the date part of the ISO `updated` stamp, written in the same short style as the rate dates; `updated_display` is the fallback), shown only after every rate validated. If any rate fails validation its placeholder stays and the Checked line is hidden (this is what the 21 Oct 2026 FRED incident needed). If the fetch fails, all placeholders stay and the Checked line is hidden. Never NaN or empty digits.
- States for styling: `#rates-panel[data-state="loading|live|stale|error"]`. Stale rates show "Last data {as_of}, awaiting update" in gold.
- Odometer rolls once when the panel enters the viewport (IntersectionObserver, 22 percent from the bottom); screen readers get the final value only ("3.75", "3.75 to 4.00", "2.643" plus the "%" unit).
- Gold wave lines: drawn once on a canvas with the edge fade baked into the stroke. They animate only on fine-pointer devices, at 30 fps, while the panel is on screen, and stop after 8 s without pointer movement. Off screen: 0 frames (measured).

Optional feed improvement (not required): add `last_decision_on` and `last_decision` ("hold", "cut", "raise") for BoE and Fed so a truthful "Held · 5 Nov 2026" chip becomes possible.

## 2. Track Record module

CMS collection "Transactions" (22 items):

| Field | Type | Used for |
| --- | --- | --- |
| Name | Plain text (e.g. "Kensington, London") | row title, `data-name` |
| Slug | auto | |
| Location | Plain text | optional, same as Name on the home list |
| Country | Plain text | track record page filters |
| Region | Option (UK, Europe, USA) | track record page filters |
| Amount display | Plain text ("£27.5m") | row amount, `data-amount` |
| Amount value | Number (27.5) | sorting on the track record page |
| Currency | Option (GBP, EUR, USD) | |
| Product | Plain text ("Development Finance") | row sub-label, `data-product` |
| Asset | Plain text | pane "Asset", `data-asset` |
| Capital source | Plain text | pane "Capital", `data-capital` |
| Metric 1 value, Metric 1 label, Metric 2 value, Metric 2 label, Metric 3 value, Metric 3 label | Plain text | track record page |
| Terms line | Plain text ("70% LTC · 58% LTV · 8.5% p.a.") | pane "Terms", `data-terms` (one field is simpler than composing the three metrics in the Designer) |
| Photo | Image | pane photo |
| Photo alt text | Plain text, describes the building | `data-alt` and the image alt |
| Featured | Switch | the five on the home page |
| Sort order | Number | order of the home list |

Collection List: filter Featured = on, sort Sort order ascending, limit 5. Structure (see `webflow/track-record.markup.html`):

- Collection List wrapper: class `dl-list`. Collection Item: class `dl-item`. Inside the item one Div with class `dl-row` and the custom attributes `data-name`, `data-amount`, `data-product`, `data-asset`, `data-capital`, `data-terms`, `data-alt` bound to the fields, and `data-img` bound to the Photo field (Webflow offers image fields in the attribute binding picker as the asset URL; if it does not in your Designer, put a hidden Image element bound to Photo inside the row with custom attribute `data-pane-img` and the script reads its src and alt instead).
- Row contents: `span.dl-n` (leave empty, the script writes 01 to 05), `span.dl-amt` (Amount display), `span.dl-meta` > `b` (Name) and `span` (Product), `span.dl-go` with the arrow svg (Embed, 24x24 viewBox, aria-hidden).
- Webflow outputs a Div, not a button. The script sets `role` (`tab` from 860 px, `button` in the accordion so that `aria-expanded` is valid on a Div), `tabindex`, `aria-selected`, `aria-expanded` and `aria-controls` at runtime and handles Enter and Space, so nothing else is needed on the row. Ids `dl-tab-1..5` are assigned by the script when missing. Verified with axe on a Div-row copy of the prototype: 0 violations at 1440 and 390.
- Pane (static Designer elements, outside the Collection List, a sibling of it inside `div#dl.dl`): `div#dl-pane.dl-pane` with custom attributes `tabindex="0"`; inside: `h3.sr.dl-pane-h` with `aria-live="polite"` (visually hidden, announces "Rome, Italy, €4.6m, Bridge Loan" when a row is selected by click, tap or keyboard; hover previews never update it), `figure.dl-photo` > `img.dl-img.is-on` (set to the first featured deal's photo and alt text), `dl.dl-facts` with three `div` > `dt` + `dd` where the dd ids are `dl-asset`, `dl-cap`, `dl-terms`.
- CTA after the pane: `a.btn.dl-cta` "View 22 selected transactions" to /track-record (the count is text; keep it in step with the collection or bind it to a site-wide text field).

Behaviour (deal-list.js): from 860 px the rows are tabs (roving tabindex, arrow keys, Home and End, Enter and Space), hovering a row only previews it in the pane and the pane returns to the selected row when the pointer leaves the list; clicking selects. Up to 859 px the list is an accordion: the pane sits under the open row by CSS `order` (no DOM move), rows are `aria-expanded` buttons controlling a `region`, tapping the open row closes it, tapping another row opens it there and brings the row to the top of the screen. Photos crossfade after decoding (old layer removed, inactive layers `aria-hidden`); the other photos are prefetched at low priority once the module is on screen.

Designer-native: structure, classes, CMS binding, copy, images, the facts card, the CTA. Custom code: the CSS in the head (12,745 chars) and the two scripts in the footer (27,951 chars). Limits are 50,000 characters for each of the site or page head, the page footer and a Code Embed; the current Home footer code is about 6,300 chars, so the total stays near 47,000. Minify before pasting if you prefer, or host `rates.js` and `deal-list.js` on the roscap-rates GitHub Pages origin and paste two `<script defer src>` lines instead. Check the limit your Designer actually shows on the Home page footer field before pasting: if it is the older 10,000-character limit, use the hosted-file option. Webflow's native Interactions with GSAP (ScrollTrigger scrub, staggers, a per-interaction reduced-motion option) could replace the CSS reveals of the heading, rows and pane if you prefer to keep those in the Designer; the odometer, the chips, the wave canvas and the tab logic stay in code.

## 3. Exact CSS and JS to paste

- Head: `webflow/home-head.html` (one `<script>` that adds the `js` class, one `<style>`). It repeats the design tokens and the few shared bits (`.sr`, `.odo*`, `.chip`, `.btn`) so it does not depend on prototype files. Fonts: the site already serves Boska and Switzer; the CSS only references the family names.
- Footer: `webflow/home-footer.html` (rates.js then deal-list.js). Replace the existing rates block; keep Swiper and GSAP code.
- Markup references: `webflow/rates-panel.markup.html`, `webflow/track-record.markup.html`.

## 4. Performance notes

- Live Home (Lighthouse, this session): 9,793 KiB on mobile, score 66 (87 desktop), LCP 5.8 s mobile. 8,128 KiB of that is two videos (a 6.6 MB mp4 from S3 plus a 1.5 MB Webflow-hosted copy, both requested at load), 1,039 KiB images (one 893 KB PNG), 472 KiB scripts.
- Prototype bundle: 1,439,547 bytes as one file including base64 fonts (115 KB raw) and all images (about 600 KB raw). Source files: index.html 24 KB, home.css 12.5 KB, rates.js 17.8 KB, deal-list.js 10.0 KB, home.js 4.9 KB. No Lenis (18.8 KB), no extra GSAP or ScrollTrigger (117 KB); the live page keeps its own GSAP 3.15 for Swiper headings.
- Hero video pattern: `<video preload="none" poster=... data-src="hero.mp4" muted loop playsinline>`; `home.js` sets `src` after `window.load` only when the viewport is at least 992 px, `prefers-reduced-motion` is not set and `saveData` is off, and pauses it when the hero leaves the viewport. On the live site serve one compressed mp4 (the prototype file is 1.55 MB, 962x720, 17.7 s) and remove the second copy; phones then download no video at all, which removes about 8 MB from the mobile page.
- Images: every below-the-fold image has `width`, `height`, `loading="lazy"` and `decoding="async"`; deal photos are 628 to 720 px wide WebP (34 to 96 KB each); the contact background was resized to 1200 px (116 KB instead of 443 KB). Replace the 893 KB PNG on the live page with the CMS WebP variant.
- Motion: reveals and the panel clip use CSS scroll-driven animations (`animation-timeline: view()`) behind `@supports`, with an IntersectionObserver fallback that adds `.is-vis`; the odometer is CSS transitions; the stats count-up is a 2 s requestAnimationFrame; the wave canvas runs only on screen, on fine pointers, at 30 fps, and idles after 8 s. Measured: 0 requestAnimationFrame callbacks per second with the panel off screen or just below the fold, 60 with it on screen (30 draws).

## 5. Reduced motion and mobile

- `prefers-reduced-motion: reduce`: no hero video, no reveals, no clip animation, odometer shows final values immediately, chips visible at once, waves static, no pulse, no photo crossfade, instant scrolling. Verified by computed styles and screenshots (`rates-reduced-1440.png`, `rates-reduced-390.png`).
- 390 px: single-column rates (one rate per row, chip and dates beside the number), accordion list with 81 to 95 px tap rows, 44 px slider arrows, no horizontal overflow (scrollWidth 390). 1024 px: two equal columns, rows 72 to 86 px, rate chips stacked under the numbers.
- No hover effects on touch (`@media (hover: hover)`), `-webkit-tap-highlight-color: transparent`.

## 6. Assumptions and open questions

- "View 22 selected transactions" (the track record page calls them Selected Transactions; the stats say 60+ projects funded): confirm the number source and whether the count should come from the CMS.
- Featured five are a selection, not the five largest: the copy never says "largest".
- Licensing to confirm for the EURIBOR figure: EMMI states that commercial display of Euribor data needs a licence agreement (delayed data is free for non-commercial use only). Options: EMMI licence, the ECB monthly average with ECB attribution, or a link out. Bank of England data is under the Open Government Licence (the sources line attributes it); the Fed target range is public domain via FRED. The panel is information only and never reads as advice.
- Fed date: the feed's `changed_on` is the FRED effective date (17 Sep 2026); the FOMC met on 16 Sep 2026. The panel says "since 17 Sep 2026".
- The odometer rolls in from 0.00 by default (the approved look). `data-roll-from="previous"` is available; it was not made the default because the previous value would be visible as the start state until the roll triggers.
- Footer: the shared partial (LinkedIn and Instagram links, the two-paragraph disclaimer) was pasted as supplied; the live footer links mail and LinkedIn only. Confirm the Instagram account.
- Copy follows the live site (British English, digits, no em dashes, no exclamation marks). "Checked" replaced "Updated" because the feed timestamp is a check time.
- Prototype only: forms are mocked, the nav links go to the live pages, the label bottom right is removed on the live site.
- Tooling note: the bundler (tools/inline.py) now also inlines `data-img` paths; base.css lost the concept-only `.ph/.dN` background rules and the Lenis helper.

## 7. QA checklist (staging first)

1. Rates: numbers match rates.json (BoE 3.75, Fed 3.75 to 4.00, EURIBOR 2.643 on 31 Oct 2026); chips read "Cut 25 bps", "Raised 25 bps", "Up 2.5 bps"; dates "since 18 Dec 2025", "since 17 Sep 2026", "fixing of 29 Oct 2026"; "Checked 31 Oct 2026" (the day's date) visible.
2. Block rates.json in DevTools (or go offline): placeholders stay, Checked line hidden, no console error from the page (only the browser's failed request line).
3. Scroll the panel into view once: digits roll once, chips fade in after the roll; scroll away and back: nothing re-rolls.
4. Reduced motion on (macOS Accessibility or Chrome rendering emulation): no roll, no reveals, static waves, no video.
5. Keyboard: Tab to the first row, Arrow Down twice selects Rome and moves focus, Enter and Space select, Home and End work, the pane heading is announced by VoiceOver or NVDA on selection only (not while hovering), focus ring is teal on the rows and the pane (gold would be 1.6:1 on cream) and gold on the dark panel.
6. Mouse: hovering a row previews it, moving off the list returns the pane to the selected row, clicking selects.
7. Phone: tapping a row opens the pane under it and brings the row to the top; tapping the open row closes it; no horizontal scroll; tap rows at least 44 px.
8. axe DevTools: 0 violations at 1440 and 390 (the prototype scored 0 and 0, also with Div rows in place of the buttons).
9. Lighthouse mobile: no video request, total weight well under 2 MB with the live images, LCP improved; check CLS stays 0.
10. Publish to staging, repeat 1 to 9 on the staging URL, then publish to production and repeat 1 and 2.

## Audit items resolved (concepts audit, data audit, coordinator notes)

- Chips and dates derive from the feed; no hard-coded "Held", "Updated 28 Oct 2026" or "Down 2.0 bps".
- Pane never sits inside a tablist: tabs from 860 px, disclosure semantics on phones; CSS order instead of a DOM move. The only scroll adjustment left is a one-line anchor correction when the pane above a tapped row collapses, followed by a native smooth scroll (no Lenis).
- Odometer: roll once, start digits set before the number is shown (`.num` hidden until built), no re-roll on re-entry.
- Waves: static by default, 30 fps when animating, fade baked into the stroke, stop off screen and after 8 s idle.
- No Lenis, no second GSAP.
- Inactive amounts and inactive slider tabs use solid #4F7879 (4.8:1 on cream). Gold is never used as text on cream.
- 1024 px: two equal columns, tighter rows, stacked rate lines.
- Loading, live, stale and error states exposed; pulse limited to three cycles after a live result.
- Hover previews only; aria-controls, aria-labelledby, aria-hidden on inactive photos; tap highlight removed; tapping an open row closes it; clip reveal is a CSS scroll-driven animation; `img` elements instead of background spans; roll-from-previous available as an option.
- Webflow: Div rows supported (roles, tabindex, Enter and Space in JS; role="button" in the accordion so aria-expanded is valid); baserate and changerate ids kept; 50,000-character limits noted; hosting on the roscap-rates origin suggested.
- Independent QA (31 Oct 2026): live heading updates on selection only, not on hover; teal focus ring on rows and pane; "Checked" date in the same short style as the rate dates.
- Fed date labelled "since", EURIBOR "fixing of", "Checked" instead of "Updated", "View 22 selected transactions", "p.a." for rate metrics, EURIBOR licensing flagged.
- Also worth considering later: concept D's facts card with large metric tiles for the Terms row; not applied to keep the approved F layout.
