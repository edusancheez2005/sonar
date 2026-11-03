# Handoff: Home page, market rates panel and Track Record deal list

For Shikhar (Webflow). Build on roscap-site.webflow.io first, check the QA list, then publish.
Approved design: concept F (deal list with preview) plus the odometer rates panel. Nothing was redesigned; this is the production version.
The hero is not part of this work: it stays exactly as it is on the live site (owner's decision, 31 Oct 2026).
Owner's requests of 31 Oct 2026, also built: the contact block is the live one again (section 2.2), and the deal list has a sixth row, "All transactions", that shows a mosaic of all 22 transaction photographs (section 2.1). "View 22 selected transactions" stays under the list.
Also from 31 Oct 2026: "Who We Are" and "What We Do" (with the Asset Classes / Sources of Capital cards) are the live sections again; the only change there is the switch between the two card sets and the counters' easing (section 2.3). The hero's "Explore Our Services" links to /our-services, as live.

## Files

| What | Path |
| --- | --- |
| Working prototype (open index.html; shared assets in ../shared) | index.html, home.css, home.js, rates.js, deal-list.js, media/ (copy of the live hero clip for offline review; deals/ the 22 mosaic tiles, 260,914 bytes in all; contact/ the live contact card texture) |
| Single-file bundle for review (it carries a copy of the hero clip so the page plays offline; nothing changes in the live hero) | homepage-track-record-and-rates.bundle.html |
| What We Do entrance, Asset Classes / Sources of Capital switch and counters (section 2.3) | webflow/what-we-do-slider.html (11,614 chars) |
| Paste-ready Webflow code | webflow/home-head.html (14,558 chars), home-footer.html (31,973 chars), rates-panel.markup.html, track-record.markup.html |
| Screenshots | `screenshots/` in this folder (1440, 1024 and 390 widths, the All transactions mosaic, the contact block compared with live, reduced motion, feed blocked, feed corrupted) |
| Test reports | `audit/qa/homepage-F.json`, `audit/qa/homepage-v3-verify.json` |

## 0. Hero: no change

Leave the hero exactly as it is on the live site. (The prototype carries a copy of the same clip only so the page can be reviewed offline.)

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

Designer placeholders (what the page shows before the script runs, and if the feed fails): BoE `3.75` / chip `Cut 25 bps` / `since 18 Dec 2025`; Fed `3.75–4.00` / `Raised 25 bps` / `since 17 Sep 2026`; EURIBOR `2.643` / `Up 2.5 bps` / `fixing of 29 Oct 2026`; `Checked 31 Oct 2026`. Update them to the day's values when you publish; the script overwrites them within a second anyway.

Replacement footer script: the first `<script>` in `webflow/home-footer.html` (rates.js) replaces the current rates block (the one starting `document.addEventListener("DOMContentLoaded"... const FEED =`). Leave the Swiper and GSAP code above it untouched. What the new script does:

- Fetches the feed once, validates every rate (numbers within 0 to 25, `display` matching `^\d+(\.\d+)?%( - \d+(\.\d+)?%)?$`, dates `YYYY-MM-DD`, `change` within 5 points, `changed_on` present for BoE and Fed), honours `rate.stale` and the top-level `stale` array, and treats `as_of` older than 10 days as stale.
- Writes BoE and Fed as "Cut 25 bps" or "Raised 25 bps" with "since {changed_on}" (for the Fed this is FRED's effective date, 17 Sep 2026, not the FOMC meeting date, so the word "decision" is never used). There is no separate "As of" line: the owner asked for the "since" date alone (31 Oct 2026); the `#asof-*` elements stay empty and hidden unless a rate goes stale. EURIBOR gets "Up 2.5 bps" or "Down x bps" from `change` and "fixing of {as_of}". "Held" is never written: the feed only carries the last change.
- "Checked 31 Oct 2026" is the feed's check time (the date part of the ISO `updated` stamp, written in the same short style as the rate dates; `updated_display` is the fallback), shown only after every rate validated. If any rate fails validation its placeholder stays and the Checked line is hidden (this is what the 21 Oct 2026 FRED incident needed). If the fetch fails, all placeholders stay and the Checked line is hidden. Never NaN or empty digits.
- States for styling: `#rates-panel[data-state="loading|live|stale|error"]`. Stale rates show "Last data {as_of}, awaiting update" in gold.
- Odometer rolls once when the panel enters the viewport (IntersectionObserver, 22 percent from the bottom); screen readers get the final value only ("3.75", "3.75 to 4.00", "2.643" plus the "%" unit).
- Gold wave lines: drawn on a canvas with the edge fade baked into the stroke. On desktop they drift slowly (24 fps) while the panel is on screen and the tab is visible; they do not react to the mouse (owner's feedback, 31 Oct: the lines bending round the cursor looked off). Phones and reduced motion get the still drawing. Off screen: 0 frames.

Optional feed improvement (not required): add `last_decision_on` and `last_decision` ("hold", "cut", "raise") for BoE and Fed so a truthful "Held · 5 Nov 2026" chip becomes possible.

### 1.1 Chip wording (31 Oct 2026)

Checked against the Bank of England's own page on 31 Oct 2026: Bank Rate 3.75%, last changed by a 25 bp cut on 18 Dec 2025, held at every decision since (latest 17 Sep 2026; next 5 Nov 2026). The Fed held at 3.75% to 4.00% on 28 Oct 2026 after a 25 bp rise in September. The old chips ("Cut 25 bps since 18 Dec 2025", "Raised 25 bps since 17 Sep 2026") were true about the last move but read as if the latest decision had been a cut or a rise. `rates.js` now writes "Held" with "since the 18 Dec 2025 cut" once a move is more than 30 days old, and names the move ("Cut 25 bps", "on <date>") in the 30 days after it. Both are true on every day with the feed as it is. Naming the latest decision ("Held at the 17 Sep 2026 decision") needs decision dates in the feed: see `audit/RATES-PANEL-PLAN.md`.

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

Designer-native: structure, classes, CMS binding, copy, images, the facts card, the CTA. Custom code: the CSS in the head (14,558 chars) and the two scripts in the footer (31,973 chars). Limits are 50,000 characters for each of the site or page head, the page footer and a Code Embed; the current Home footer code is about 6,300 chars, so the footer total stays near 38,300. Minify before pasting if you prefer, or host `rates.js` and `deal-list.js` on the roscap-rates GitHub Pages origin and paste two `<script defer src>` lines instead. Check the limit your Designer actually shows on the Home page footer field before pasting: if it is the older 10,000-character limit, use the hosted-file option. Webflow's native Interactions with GSAP (ScrollTrigger scrub, staggers, a per-interaction reduced-motion option) could replace the CSS reveals of the heading, rows and pane if you prefer to keep those in the Designer; the odometer, the chips, the wave canvas and the tab logic stay in code.

### 2.1 Row 06 "All transactions" and the mosaic

What the visitor sees: under the five featured rows, a sixth row in the same style: "06", the figure "22" in the amount style, the title "All transactions" and the gold sub-label "UK, Europe & North America", with the same arrow. Selecting it (click, keyboard or tap) fills the photo area with a mosaic of all 22 transaction photographs on a dark teal frame with 4 px gaps: 6 columns at desktop, the two largest deals (Kensington and Sheffield) as double-width tiles in the first row, 22 tiles in all; 4 columns under 860 px. The facts card under it shows two items only, both already published by Roscap: "Markets: UK, Europe and North America" and "Record: 22 transactions in 7 countries". "View 22 selected transactions" stays under the list and links to /track-record.

Designer structure (reference markup in `webflow/track-record.markup.html`):
- Row 06 is static Designer content placed after the Collection List of the five featured rows, inside the same `.dl-list` Div: a Div `.dl-item` holding a Div `.dl-row` with the custom attributes shown in the markup file (`data-name`, `data-amount`, `data-product`, `data-label` and `data-mosaic="all"`). The head CSS makes the Collection List wrappers `display: contents`, so the CMS rows and row 06 form one list for the keyboard and for screen readers.
- The mosaic is a second Collection List inside `.dl-photo`: Collection List Wrapper `.dl-mosaic` (custom attribute `aria-hidden` = `true`), Collection List `.dl-mosaic-grid`, Collection Item `.dl-tile`, Image `.dl-tile-img` bound to a new Image field "Mosaic tile" (about 240 px wide WebP, quality 60; the prototype's 22 tiles are in `media/deals/`). Source: Transactions, all items, no filter, sorted by Sort order ascending. The first two items get the class `is-wide` from the script (the Designer cannot give a class to the first two CMS items only).
- Second facts card: a static `dl.dl-facts.is-all` after the first facts card, with the two items above. CSS shows one card or the other.

Behaviour: the tiles do not load with the page. The script loads them once the list is within about 300 px of the viewport, or on the first hover or focus of row 06, whichever comes first (measured: 0 tile requests at load and 650 px away, all 22 at 200 px away). Every tile has width and height, so nothing shifts. The mosaic is decorative (aria-hidden, empty alt); the pane heading announces "All transactions, 22 transactions in 7 countries" when row 06 is selected. Reduced motion: no crossfade, instant switch.

Verified on the bundle (Playwright, Chromium): row 06 reachable with the arrow keys and selected with Enter or Space; click selects it at 1440 and 1024; on a phone a tap opens the mosaic under the row and a second tap closes it; all 22 tiles inside the frame at 1440, 1024 and 390; no horizontal scroll; 0 console errors; axe 0 violations with row 06 open at 390, and 0 at 1440 and 390 once the page has settled (a mid-fade sample can catch the facts text at partial opacity).

### 2.2 Contact block: the live one

The prototype's earlier contact section is replaced by the live homepage contact block, unchanged in look: the teal rounded card with the wave texture, the form on the left (Name, Email, Phone, Subject, Message), the small gold "Contact" label, the heading "Let's discuss your next transaction, funding requirement, or investment opportunity." and the gold Submit at the bottom right. Compared with live in pixels at 1440 and 390 (`screenshots/compare-live-vs-prototype-contact-*.png`, live on the left). Invisible fixes only, the same as on the Partner Program page: the visible Submit is a real submit button tied to the form (`<button type="submit" form="wf-form-Contact-Form">`), visually hidden labels for the five fields, Subject set to a plain text field, autocomplete on Name, Email and Phone. If this block is the shared Component used on other pages, these fixes apply there too.

### 2.3 Who We Are and What We Do: the live sections, smoother switch

The prototype first used the owner's concept versions of these two sections. They are now the live sections, rebuilt from the live markup and stylesheet and compared side by side with live at 1440 and 390 (`screenshots/compare-live-vs-prototype-who-we-are-*`, `-what-we-do-*`, `-sources-of-capital-1440`): same classes, wording, photographs, icons, teal cards, arrows, headings and "Explore Our Services" button. Two live dashes are printed as a comma and a colon in the prototype (copy rule); on live, keep the text as it is.

Designer changes are small: wrap the What We Do photograph in a Div with the class `wwd-media`, remove the Interactions fade-in on that photograph and on the What We Do heading, and (optional) type the real figures (60, 120, 25) into the three counters instead of 0. Everything else is in `webflow/what-we-do-slider.html` (11,614 characters, Home > Custom code > Before body), which replaces the live Swiper set-up, the heading code and the counters code (the file's header says exactly which blocks to delete). Tested on a copy of the live homepage with the live stylesheet: same look, the switch, the heading swap, keyboard and the counters all work, no console errors.

What changes for the visitor:
- Switching between Asset Classes and Sources of Capital (arrows, headings or a swipe): the four cards slide 24 px and fade out while the new four slide in from the other side one after another, 55 ms apart; the headings fade, swap and come back as on live. There is never an empty frame and the section height never jumps. Live uses a plain Swiper slide.
- The headings and arrows become real keyboard controls (Tab, Enter, Space; Left and Right arrows on a heading).
- The inactive heading sits at 55% opacity instead of 40%, so it meets WCAG contrast for large text (3.4:1 instead of 2.55:1). Barely visible.
- Counters: same count-up over 2 s when the figures reach 80% of the screen, eased out instead of eased in. With the real figures in the Designer, visitors without JavaScript, search engines and screen readers get 60, 120 and 25 rather than 0.
- What We Do gets more life through motion only (owner's request, 31 Oct): the tag, heading, gold line and text come in once in reading order, the six points follow one by one with their numbers popping in, the photograph settles from a slight zoom as it scrolls in, and the asset cards lift a little on hover with their divider turning gold. Designer, once: wrap the What We Do photograph in a Div with the class `wwd-media`, and remove the Interactions fade-in on that photograph and on the heading so the motion is not doubled.
- Reduced motion: no entrance, no zoom, the switch is instant and the counters show the final figures.

## 3. Exact CSS and JS to paste

- Head: `webflow/home-head.html` (one `<script>` that adds the `js` class, one `<style>`). It repeats the design tokens and the few shared bits (`.sr`, `.odo*`, `.chip`, `.btn`) so it does not depend on prototype files. Fonts: the site already serves Boska and Switzer; the CSS only references the family names.
- Footer: `webflow/home-footer.html` (rates.js then deal-list.js). Replace the existing rates block; keep Swiper and GSAP code.
- Markup references: `webflow/rates-panel.markup.html`, `webflow/track-record.markup.html`.

## 4. Performance notes

- Prototype bundle: 4,951,495 bytes as one file. Most of it is there only so the single file works offline: the two hero clips (2,194,824 bytes, base64) and the fonts and images, all inlined. Webflow keeps serving the live clip and the site's own fonts. Source files: index.html 36.5 KB, home.css 27.9 KB, rates.js 17.8 KB, deal-list.js 14.0 KB, home.js 9.7 KB. No Lenis (18.8 KB), no extra GSAP or ScrollTrigger (117 KB); the live page keeps its own GSAP 3.15 for Swiper headings.
- Images: every below-the-fold image has `width`, `height`, `loading="lazy"` and `decoding="async"`; deal photos are 628 to 720 px wide WebP (34 to 96 KB each); the contact background was resized to 1200 px (116 KB instead of 443 KB). Replace the 893 KB PNG on the live page with the CMS WebP variant.
- Motion: reveals and the panel clip use CSS scroll-driven animations (`animation-timeline: view()`) behind `@supports`, with an IntersectionObserver fallback that adds `.is-vis`; the odometer is CSS transitions; the stats count-up is a 2 s requestAnimationFrame; the wave canvas runs only on screen, on fine pointers, at 30 fps, and idles after 8 s. Measured: 0 requestAnimationFrame callbacks per second with the panel off screen or just below the fold, 60 with it on screen (30 draws).

## 5. Reduced motion and mobile

- `prefers-reduced-motion: reduce`: no reveals, no clip animation, odometer shows final values immediately, chips visible at once, waves static, no pulse, no photo crossfade, instant scrolling. Verified by computed styles and screenshots (`screenshots/1440-rates-reduced-motion.png`).
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

1. Rates: numbers match rates.json (on 31 Oct 2026: BoE 3.75, Fed 3.75 to 4.00, EURIBOR 2.676); chips read "Held" (BoE, "since the 18 Dec 2025 cut"), "Held" (Fed, "since the 17 Sep 2026 rise") and "Up 3.3 bps" (EURIBOR, "fixing of 30 Oct 2026"); within 30 days of a rate move the chip names the move instead ("Raised 25 bps", "on 5 Nov 2026"); "Checked 31 Oct 2026" (the day's date) visible.
2. Block rates.json in DevTools (or go offline): placeholders stay, Checked line hidden, no console error from the page (only the browser's failed request line).
3. Scroll the panel into view once: digits roll once, chips fade in after the roll; scroll away and back: nothing re-rolls.
4. Reduced motion on (macOS Accessibility or Chrome rendering emulation): no roll, no reveals, static waves.
5. Keyboard: Tab to the first row, Arrow Down twice selects Rome and moves focus, Enter and Space select, Home and End work, the pane heading is announced by VoiceOver or NVDA on selection only (not while hovering), focus ring is teal on the rows and the pane (gold would be 1.6:1 on cream) and gold on the dark panel.
6. Mouse: hovering a row previews it, moving off the list returns the pane to the selected row, clicking selects.
7. Phone: tapping a row opens the pane under it and brings the row to the top; tapping the open row closes it; no horizontal scroll; tap rows at least 44 px.
8. axe DevTools: 0 violations at 1440 and 390 (the prototype scored 0 and 0, also with Div rows in place of the buttons).
9. Row 06: arrow keys reach "All transactions" and Enter selects it; the mosaic shows all 22 photographs with the two wide tiles first; the facts card reads "UK, Europe and North America" and "22 transactions in 7 countries"; on a phone a tap opens it under the row and a second tap closes it; in the Network tab no tile loads until the list is near the screen.
10. Who We Are and What We Do look the same as live at 1440 and 390; Asset Classes and Sources of Capital switch with the arrows, the headings, Enter or Space on a focused heading or arrow, and a swipe on a phone; the cards cascade in and never leave an empty frame; the counters end on 60, 120 and 25.
11. Contact block: looks the same as live; on desktop an empty Submit shows the browser's required-field messages and a valid one sends (notification arrives, success state as today).
12. Publish to staging, repeat 1 to 11 on the staging URL, then publish to production and repeat 1 and 2.

## Audit items resolved (concepts audit, data audit, coordinator notes)

- Chips and dates derive from the feed; no hard-coded "Held", "Updated 28 Oct 2026" or "Down 2.0 bps".
- Pane never sits inside a tablist: tabs from 860 px, disclosure semantics on phones; CSS order instead of a DOM move. The only scroll adjustment left is a one-line anchor correction when the pane above a tapped row collapses, followed by a native smooth scroll (no Lenis).
- Odometer: roll once, start digits set before the number is shown (`.num` hidden until built), no re-roll on re-entry.
- Waves: a slow drift on desktop (24 fps) while on screen, no reaction to the mouse, still on phones and under reduced motion.
- No Lenis, no second GSAP.
- Inactive amounts and inactive slider tabs use solid #4F7879 (4.8:1 on cream). Gold is never used as text on cream.
- 1024 px: two equal columns, tighter rows, stacked rate lines.
- Loading, live, stale and error states exposed; pulse limited to three cycles after a live result.
- Hover previews only; aria-controls, aria-labelledby, aria-hidden on inactive photos; tap highlight removed; tapping an open row closes it; clip reveal is a CSS scroll-driven animation; `img` elements instead of background spans; roll-from-previous available as an option.
- Webflow: Div rows supported (roles, tabindex, Enter and Space in JS; role="button" in the accordion so aria-expanded is valid); baserate and changerate ids kept; 50,000-character limits noted; hosting on the roscap-rates origin suggested.
- Independent QA (31 Oct 2026): live heading updates on selection only, not on hover; teal focus ring on rows and pane; "Checked" date in the same short style as the rate dates.
- Fed date labelled "since", EURIBOR "fixing of", "Checked" instead of "Updated", "View 22 selected transactions", "p.a." for rate metrics, EURIBOR licensing flagged.
- Also worth considering later: concept D's facts card with large metric tiles for the Terms row; not applied to keep the approved F layout.
