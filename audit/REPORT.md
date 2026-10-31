# roscap.co.uk website audit

Date: 31 October 2026. Prepared for Edu (Roscap SEO and web programme) and Clemente. Status: complete; verification of the Home and About findings (batch 6) is noted inline where still pending.

## 0. Standing rules applied to this work

- Copy must never state or imply that Roscap is FCA authorised or regulated. Any live copy that could read that way is flagged in section 3.
- Nothing on the live site, in Webflow, GitHub or any connected account was changed. Everything here is read-only analysis plus prototypes in this repository. Anything that ships goes to Webflow staging (roscap-site.webflow.io) first.
- No live form was submitted, no account created, no load testing. Where something was blocked, it is noted rather than worked around.
- Performance budget: the homepage is 9.8 MB and scores 55 to 66 on mobile; every prototype must make it lighter.
- Copy style: British English, digits for numbers, no em dashes, no exclamation marks, discreet institutional tone, no invented facts or testimonials.

## 1. Scope and method

Pages: all 25 sitemap URLs (7 main pages, 6 legal pages, 12 blog posts). Inputs: live site (Playwright at 1440, 1024 and 390 px, axe-core 4.10, Lighthouse 13.6 mobile and desktop), the owner's homepage concepts D, E and F plus the earlier concept video, the setup log (SETUP_LOG.md), Google Ads read-only data via Windsor.ai, and the live rates feed (edusancheez2005.github.io/roscap-rates/rates.json).

Eight auditors worked in parallel (home and about; services and track record; partner programme and contact and forms; insights and legal and site-wide compliance wording; technical SEO and performance; data and claims and rates; concepts D, E, F; Google Ads funnel). Every critical or high finding was then handed to independent verifiers whose job was to refute it. Findings marked "verified" below survived that pass; "partly" means the core is real but the detail or severity was corrected.

## 2. Assumptions log

1. "[FILE NAME]" in the brief is read as the odometer "Current market rates" panel. It is identical in concepts D, E and F, so concept F carries both approved pieces (rates panel and deal list).
2. The client is Clemente; Edu is the day-to-day contact; Shikhar is the Webflow developer who will implement handoff notes.
3. The repository for deliverables is this one (edusancheez2005/sonar), branch claude/funny-einstein-1203xt, folders audit/ and prototypes/.
4. The rates panel should bind to the existing GitHub Pages feed rather than a new backend, since the live Home page already reads it.
5. Our Services keeps no enquiry form, phone number or email (Edu's decision of 7 September 2026); the capital stack prototype respects that.
6. Partner programme claims ("hundreds of current partners", "commissions in perpetuity") are treated as unconfirmed pending Clemente's answer, and prototypes do not amplify them.

## 3. Findings (prioritised)

158 findings were recorded by the eight auditors (after verification: 7 critical, 41 high, 81 medium, 29 low) plus 51 enhancement opportunities. Every critical and high finding was handed to an independent verifier whose brief was to refute it; 62 were checked, none was refuted, 24 had their severity or detail corrected and those corrections are applied below. The full list with evidence for every item is in `audit/FINDINGS-DETAIL.md`; the raw auditor files are in `audit/data/`. Overlapping findings from different auditors are merged here under one heading.

### 3.1 Fix this week (small effort, high value)

| # | Finding | Evidence (verified) | Fix in Webflow | Effort |
|---|---|---|---|---|
| 1 | **Analytics runs before consent and the Cookie Policy describes a banner that does not exist.** gtag.js (G-H8HS2R6NLS) loads in the head of all 25 pages with no consent default; analytics.google.com and doubleclick collect hits fire on first paint; _ga and _ga_H8HS2R6NLS cookies are set for about 13 months; /contact-us-success also sets _gcl_au and fires 3 generate_lead conversion pings on any direct load. The Cookie Policy says non-essential cookies are used "only where you have provided consent via our cookie banner" and refers to a footer preference link; neither exists. For compliance review under UK GDPR and PECR; it also gates the Google Ads restart (Google's EU User Consent Policy names the UK) | 20 fresh contexts, no interaction, cookies and requests captured (TS-17, PC-02, IL-01, SH-01, HA-03) | Build the in-house banner Clemente approved with Consent Mode v2 defaults set before gtag, equal Accept and Reject, a footer "Cookie preferences" link; update the Cookie and Privacy policies to name GA4 and Google Ads | M |
| 2 | **The Partner Program enquiry form cannot be sent on desktop or tablet.** The real submit button has class `formbuttonhide-desktop` (display none at 992 px and above); the visible gold "Submit" is an anchor with `fs-mirrorclick-element="trigger"` that needs Finsweet Attributes, which /partner-program does not load (zero event listeners on the link). The blog post template has the same dead pattern | CDP getEventListeners, computed styles at 1440 and 1024 (PC-01) | Show the native submit button and delete the mirror-click link on both the partner page and the Blogs template | S |
| 3 | **Contact page form basics.** The required Subject field is `type="tel"` (numeric keypad on phones, which carry 95 percent of past paid clicks); no form on the site has a `<label>` (placeholders at 2.85:1); no autocomplete; Phone is required but Message optional; the footer newsletter submit has `value=""` (axe critical) and no label; the tel link exists but is hidden by the `hide` class at every width | live DOM at 390 and 1440 (ADS-05, PC-07, ADS-06, HA-06) | Field settings: Subject to Plain text (or the enquiry-type select in the prototype); add labels; autocomplete; make Phone optional; name the newsletter button; unhide the phone number if Clemente agrees | S |
| 4 | **About Us team dialog is a keyboard trap.** Opening a "Read more" by keyboard cycles focus between two links, Escape does nothing, the close control is an unlabelled image, ids are duplicated | keyboard run (HA-04, verification pending) | Add role="dialog", a labelled close button, Escape to close, focus return; or replace with an inline expand | M |
| 5 | **Production script served from a CodeSandbox preview.** /insights and /about-us load `https://jj59l3.csb.app/script.js` (1.5 KB, no SRI, no-store). It targets elements that exist only on Home, so it is dead code on both pages | runtime check (IL-13, HA-05) | Delete the script tag from both pages; drop Swiper from Insights too | S |
| 6 | **Home hero downloads two videos and hides its headline until the video paints.** A custom-code embed pulls a 6.77 MB MP4 from S3 (HTTP/1.1, no cache header, no poster) in full on desktop and mobile; a hidden Webflow background video (`.hero-bg.hide`) still downloads a further 1.55 MB; the hero section has a transparent background, so the white H1 sits on cream and is invisible until the first frame (and the H1 starts at opacity 0 until IX2 runs). 8.1 MB of the 9.8 MB page | network capture, screenshot with video blocked (TS-01, HA-01, HA-02, TS-05) | Delete the hidden video element; one 720p loop under 1.5 MB on Webflow assets with a WebP poster; teal background on the hero section; no autoplay on phones or under reduced motion; preload the poster | M |

### 3.2 Page weight and speed (the mobile scores)

| Finding | Evidence | Fix | Effort |
|---|---|---|---|
| Track Record is 13.4 MB on desktop and 7.0 MB on mobile: a 6.66 MB uncompressed map SVG fetched from S3 on desktop (274 paths, 841k coordinates, no Cache-Control, re-downloaded on every visit) and 22 deal PNGs of 0.5 to 1.05 MB served at full size to phones because the only srcset variant is 500w | network capture, SVG download (TS-02, TR-02, TR-03) | Simplify the map geometry (1-decimal rounding alone gives 4.8 MB, 1.2 MB gzipped) and host it on Webflow, or replace with a light inline SVG with pins; re-export deal photos as WebP at 2x display size, under 150 KB | M |
| Deal photographs are visibly stretched: `object-fit: cover` sits on the wrapper and the img is `fill` at 614x380 against 765x594 natural | computed styles (TR-01) | Move object-fit to the image | S |
| Insights is 12.4 MB: two stacked full-bleed hero images (a 1.55 MB PNG covering an unused AVIF), the same PNG again as the first card with no srcset, and 1 MB 1600 px PNG covers chosen for 400 px cards by `sizes="100vw"` | network capture (IL-04, TS-03) | One hero image; thumbnail field with responsive variants; correct sizes attribute | M |
| GSAP and three plugins load on all 25 pages from the site footer, Swiper on 5, gtag 195 KB in the head: 424 to 495 KB of JS per page, TBT 280 to 820 ms on mobile, 0.7 to 2.1 s render-blocking | Lighthouse and network (TS-04) | Move GSAP and Swiper to page-level footer code on the pages that use them (Home, Services, Track Record), load deferred | M |
| Every image on the site is `loading="lazy"`, including the hero LCP image on 7 pages; lcp-discovery fails on 15 of 18 Lighthouse runs | Lighthouse JSON (TS-05, HA-09) | Hero images Eager with fetchpriority high | S |
| /contact-us (the paid landing page): mobile 67, LCP 5.9 s on a 203 KB lazy-loaded decorative SVG, 435 KB of JS it does not use | Lighthouse and network (TS-06, ADS-08) | Eager or smaller hero graphic; no GSAP on this page; see the Speak to Us prototype | M |

### 3.3 Claims, wording and legal pages (for Clemente and compliance review)

No page states or implies that Roscap is FCA authorised, and the footer disclaimer is present on all 25 URLs. The items below are for review, not findings of breach.

| Finding | Where | Suggested handling |
|---|---|---|
| "Join hundreds of current partners" beside 8 logos; "commissions in perpetuity"; brochure terms and conditions quote a 25 percent introductory fee then 10 percent in perpetuity with exclusivity | /partner-program and the brochure PDF (PC-04) | Confirm or remove the count; move fee terms to the partner agreement; the prototype uses neutral wording marked for confirmation |
| Brochure describes Roscap as "a real estate private equity and debt firm" and quotes "Interest Rate: Starting from 4% p.a." and "Loan-to-Value Ratio: Up to 90%"; the page says "minimal work" | brochure PDF, /partner-program (PC-05) | Reissue the brochure (it is also 9.2 MB with no text layer, 85 percent zero padding, and its "download gate" is cosmetic because the PDF URL is in the page source) |
| Lender-style wording: "private investment firm", "co-investing", "our portfolio", "projects funded", "we fund", "underwrite", "apply for property finance through Roscap"; Home promises "ensuring every client ... secures" | Home, /contact-us FAQ, /our-services (HA-17, PC-11, IL-12) | A regulatory adviser should look at the cluster; the FAQ timescales ("5 to 10 working days", "6 to 8 weeks") are for Clemente to stand behind or soften |
| Privacy Policy is undated, has no registered office, ICO number, named processors or retention periods; info@ links are `href="#"` on 4 legal pages | /privacy-policy and 3 others (IL-02) | Complete the policy; fix the links |
| Accessibility Statement claims contrast, clear labels, link text and WCAG 2.1 AA that the pages do not meet (26 contrast failures on Insights, unnamed icon links, placeholder-only forms, no main landmark) | /accessibility-statement (IL-03) | Restate as partially conformant with a dated list of known issues; fix the cheap ones |
| Euribor shown on a commercial site: EMMI says delayed data is free only for non-commercial use and a licence is mandatory for commercial use; the live card credits a third-party scraper and omits the trademark notice | Home rates panel (DR-01) | Licence and attribute EMMI, swap the card for the ECB deposit facility rate, or link out |
| Live rates tooltips misdescribe the numbers (the Dec 2025 cut is called "the last Bank of England decision"; the Fed date is FRED's effective date; the Euribor tooltip names the current fixing as the previous one) | Home rates panel (DR-02) | Wording fixed in the prototype; apply to the live footer script |
| Feed printed "400.00% - 400.00%" for about 12 hours on 21 Oct 2026 after FRED returned HTML; nothing validates values | roscap-rates feed and Home (DR-03) | Range, format and date validation in fetch_rates.py and in the page script (done in the prototype) |
| Copy errors: the Equity paragraph on Our Services repeats its sentence; "Head of Southern Europe" vs "Head of Western Europe"; the Manchester case study (£2.665m bridging loan) does not match the Track Record's Manchester card (£2.7m commercial mortgage); map popups claim 52 UK deals against 16 listed | /our-services, /about-us, /track-record (OS-01, HA-19, DR-11, TR-04) | Edit; reconcile the Manchester figures with Clemente |

### 3.4 Content and trust

- About Us is thin on trust signals: no founding year, office or company number, two team members without photos, no mention of the 2026 National Property Awards finalist places (HA-18, verification pending). A facts strip and one team-card pattern would fix it.
- Partner Program reads as dry for measurable reasons: a 900 px hero carrying a 57-word paragraph with no CTA, four 312x394 icon cards that are mostly empty, six steps in a carousel that shows three, no imagery or proof below the fold, and the generic contact form (PC-03). The prototype addresses each.
- Home offers one generic CTA path ("Explore Our Services") with no step for investors or introducers (HA-21). Paid traffic landed almost entirely on this page (98.6 percent of clicks) with a hero that never mentions bridging or development finance (ADS-02).
- Insights article template: body text runs 1308 px wide at 16 px (about 164 characters a line), H2 and H3 share one size, no author, read time or related posts, Article schema without dates or image, no Open Graph image anywhere on the site (IL-05, IL-06, TS-07).
- The Capital Stack on Our Services is an outlined SVG with no text layer and empty alt, so the page's central diagram is invisible to assistive technology and to search, and its labels render at 7 to 9 px on phones (OS-02). The capital stack prototype replaces it with real HTML layers.
- Track Record presents 22 deals in two synced carousels with controls only on the first, ending on an empty slot, with no dates, filters, sorting or links; labels vary ("Bridge Loan" vs "Bridging Loan") (TR-05 to TR-10). A Transactions CMS collection with Finsweet List Filter is the structural fix and would also feed the approved homepage module.
- The 404 page is Webflow's unbranded default with no navigation (PC-19).

### 3.5 Google Ads (read-only, account 443-916-9682)

- One Performance Max campaign ran 29 Jul to 10 Aug 2026 and has been paused since: £193.42, 13,749 impressions, 436 clicks, 0 conversions. 92 percent of clicks came from Display, YouTube and Discover, 95 percent from mobile or tablet; Search was 34 clicks at £2.25 each (ADS-01, ADS-03).
- 98.6 percent of clicks landed on the homepage via the non-www final URL (one 301; attribution parameters survive) (ADS-02, ADS-04).
- Conversion tracking is entirely GA4-imported, with two primary actions that can double count; no Google Ads tag is on any page; the actions were created after the campaign stopped, so the zero conversions is a tracking gap rather than evidence about the site. The tracking id in the account is 238397354910; one auditor's suggested tag id was wrong and must not be used (ADS-09, corrected on verification).
- Before any restart landing on /contact-us: the consent banner (3.1.1), the contact form fixes (3.1.3), the hidden phone number, and a verified generate_lead that fires once per enquiry.

### 3.6 Restrained enhancements worth doing (from the auditors' opportunity lists)

1. Audience strip under the Home hero: three quiet links, "Raising capital for a project", "Deploying capital", "Introducing a client".
2. Counters as a reveal rather than a count-up, with the real figures in the HTML (today the HTML says "0+").
3. Static two-column grid for Asset Classes and Sources of Capital at desktop instead of the slider.
4. A facts strip on About Us (founded, London, Roscap Limited 13536901, awards finalist 2026) and one team-card pattern for all four people.
5. Track Record: one sorted grid with three filter chips and a summary strip computed from the listed deals (22 transactions, 7 countries, £108m, €37m and $4m), plus a 23rd card for the Manchester case study.
6. Our Services: layer-to-card wayfinding from the capital stack, the process line filling with scroll, and a "See completed transactions" link under the debt cards.
7. Contents list on long guides; related posts and breadcrumbs on the blog template; a default Open Graph image.
8. Branded 404 with navigation.
9. Footer newsletter: visible label, named button, one-line privacy note.
10. Site-wide: per-image weight budget in the Asset manager (photos under 150 KB, SVGs under 50 KB, video under 1.5 MB with poster) and a reduced-motion rule for every Webflow interaction.

## 4. Lighthouse baseline (31 October 2026, Lighthouse 13.6, throttled mobile and desktop presets)

| Page | Device | Perf | A11y | Best practices | SEO | LCP | TBT | CLS | Page weight |
|---|---|---|---|---|---|---|---|---|---|
| / | mobile | 66 | 85 | 100 | 100 | 5.8 s | 300 ms | 0 | 9,793 KiB |
| / | desktop | 87 | 85 | 100 | 100 | 2.0 s | 0 ms | 0 | 9,874 KiB |
| /about-us | mobile | 64 | 88 | 96 | 100 | 6.3 s | 340 ms | 0.004 | 1,553 KiB |
| /about-us | desktop | 86 | 88 | 96 | 100 | 1.7 s | 0 ms | 0.007 | 1,614 KiB |
| /our-services | mobile | 76 | 83 | 100 | 100 | 4.8 s | 280 ms | 0.001 | 609 KiB |
| /our-services | desktop | 94 | 83 | 100 | 100 | 1.3 s | 0 ms | 0.002 | 679 KiB |
| /track-record | mobile | 74 | 82 | 96 | 100 | 4.2 s | 380 ms | 0.002 | 7,001 KiB |
| /track-record | desktop | 95 | 82 | 96 | 100 | 1.0 s | 10 ms | 0.004 | 13,390 KiB |
| /partner-program | mobile | 71 | 85 | 100 | 100 | 4.3 s | 350 ms | 0.001 | 693 KiB |
| /partner-program | desktop | 94 | 85 | 100 | 100 | 1.2 s | 10 ms | 0.001 | 860 KiB |
| /insights | mobile | 62 | 85 | 96 | 100 | 6.5 s | 320 ms | 0 | 3,649 KiB |
| /insights | desktop | 83 | 85 | 96 | 100 | 2.6 s | 0 ms | 0 | 12,389 KiB |
| /contact-us | mobile | 67 | 87 | 100 | 100 | 5.9 s | 330 ms | 0 | 764 KiB |
| /contact-us | desktop | 85 | 87 | 100 | 100 | 1.3 s | 220 ms | 0 | 764 KiB |
| /blogs/choosing-the-right-finance-structure... | mobile | 50 | 83 | 96 | 100 | 5.9 s | 820 ms | 0 | 1,450 KiB |
| /blogs/choosing-the-right-finance-structure... | desktop | 89 | 83 | 100 | 100 | 2.1 s | 30 ms | 0 | 1,454 KiB |
| /blogs/how-real-estate-debt-advisory-works-in-the-uk | mobile | 65 | 86 | 96 | 100 | 5.5 s | 360 ms | 0 | 2,164 KiB |
| /blogs/how-real-estate-debt-advisory-works-in-the-uk | desktop | 86 | 86 | 100 | 100 | 2.5 s | 0 ms | 0.009 | 2,243 KiB |

An earlier single run of the homepage on mobile scored 55 (LCP 4.6 s, TBT 840 ms), which matches the owner's figure; scores vary run to run, the weight does not.

## 5. Concepts D, E, F and the market-rates panel

Approved direction: concept F (deal list with a preview pane) for the Track Record module and the odometer "Current market rates" panel. These were audited for build readiness, not redesigned.

### What F gets right

- Renders without console errors at 1440, 1024 and 390 px; no horizontal overflow; zero layout shift from the odometer.
- Keyboard model is correct: roving tabindex, arrow keys move and select with wrap-around, Enter and Space work, visible 2 px gold focus ring.
- Odometer accessibility is right: the real value sits in a visually hidden span and the rolling strips are aria-hidden, so the 0.00 start never reaches a screen reader.
- prefers-reduced-motion is respected across the module: no canvas, no clip, final digits, chips visible, hero video removed.
- Fully server-rendered markup, so a script failure still shows a complete static module.
- Visually premium and restrained at both widths: five deals visible at once with amounts, places and products.

### Must fix before build (all addressed in the build-ready prototype, see section 6)

| Ref | Issue | Evidence |
|---|---|---|
| CP-01 | Rates chips say "Held" with decision dates (17 Sep, 28 Oct 2026) and a hard-coded "Updated 28 Oct 2026" and "Down 2.0 bps". The live feed only carries the size and date of the last change (change, changed_on, as_of), so "Held" and meeting dates cannot be rendered truthfully | feed JSON 31 Oct 2026; mock lines 493 to 509 |
| CP-02 | On phones the tab panel is moved inside the tab list: axe critical aria-required-children | axe at 390 px |
| CP-03 | Odometer re-rolls from 0.00 on every re-entry; on phones the true value flashes before snapping to 0.00 | screenshots at 300 ms after re-entry |
| CP-04 | Wave canvas redraws at 60 fps while visible: 0.90 s of CPU per 3 s at 1440 (180 draws) | CDP metrics, draw counter |
| CP-05 | Ships Lenis (4 non-passive window listeners) and a second GSAP and ScrollTrigger; the live Home already loads GSAP 3.15, ScrollTrigger, SplitText, TextPlugin and Swiper 12 | listener probe, live script tags |
| CP-06 | Inactive deal amounts at 2.98:1 contrast (axe serious) | computed styles |
| CP-07 | At 1024 px the list rows grow to 116 px with wrapped names and the EURIBOR chip wraps under its value | screenshots at 1024 |
| CP-08 | No loading, stale or error state for the feed; a pulsing dot implies live data | feed stale fields |

Should fix: hover should preview rather than select (sweeping to the CTA leaves row 5 selected); add aria-controls and aria-labelledby and aria-hidden on inactive photos; transparent tap highlight; let an open row collapse on phones; replace the clip-path scrub with a transform or CSS scroll-driven animation; roll from the previous value rather than 0.00; photos as img elements with alt and srcset; bind deals and the "22" count to the CMS.

### The rates panel versus the feed

| Element in the mock | What the feed provides (31 Oct 2026) | Renderable |
|---|---|---|
| Updated 28 Oct 2026 | updated_display "31 October 2026" (check time, not data date) | Yes, labelled as "Checked" |
| BoE 3.75, chip "Held, 17 Sep 2026 decision" | value 3.75; change -0.25; changed_on 2025-12-18 | Value yes; chip must read "Cut 25 bps, 18 Dec 2025" |
| Fed 3.75 to 4.00, chip "Held, 28 Oct 2026 decision" | range 3.75 to 4.00; change +0.25; changed_on 2026-09-17 (FRED effective date; the FOMC decision was 16 Sep) | Value yes; chip "Raised 25 bps, from 17 Sep 2026" |
| EURIBOR 2.618, "Down 2.0 bps, 27 Oct 2026 fixing" | value 2.643; change +0.025; as_of 2026-10-29 | Yes: "Up 2.5 bps, 29 Oct 2026 fixing" |
| Stale state | stale array and per-rate boolean | Needs a design (done in the prototype) |

To show "Held, 6 Nov 2026 decision" truthfully the feed would need last_decision_date and last_decision_outcome (driven by a small calendar of published MPC and FOMC dates), plus previous_value for a roll from the previous level. These are recommendations for the roscap-rates repository; nothing there was changed.

Two matters for Clemente on the rates panel: (1) EMMI states that commercial display of Euribor data requires a licence (delayed data is free only for non-commercial use); the live site already shows the 3-month fixing, sourced from a third-party site. Options: take the EMMI delayed-data licence and attribute EMMI, replace the third card with the ECB deposit facility rate (a policy rate like the other two), or link out. (2) On 21 Oct 2026 a FRED outage made the feed print "400.00% - 400.00%" on the live page for several hours; the prototype validates every value and date before rendering and keeps the static placeholders otherwise, and the same guard should be added to the feed script and the live footer code.

### D and E (not approved), briefly

- D fanned deck: the most delightful, but it pins the page for about 1,040 px of scroll (scroll-jacking under the owner's rules), shows one deal at a time, and selection follows scroll progress so keyboard users cannot step through deals. Worth keeping: its info sheet with large metric tiles is the clearest terms layout of any concept and has been borrowed for F's facts card.
- E swipe deck: keeps the page free and has a good affordance (arrows, dots, a fading hint), but the deck is small, clipped at the right edge and hijacks horizontal wheel input; the deal story is the least clear.
- From the earlier video round: B's dark fourth card ("22 transactions across 7 countries") is a good treatment for F's CTA, and the rate ladder's idea of marking the previous level is worth carrying into the odometer's roll-from-previous-value.

| Concept | Deal story clarity | Delight | Brand fit and restraint | Mobile | Accessibility | Ease of build |
|---|---|---|---|---|---|---|
| F deal list (approved) | 5 | 3 | 5 | 4 | 4 after fixes | 4 |
| D fanned deck | 3 | 5 | 3 | 3 | 2 | 2 |
| E swipe deck | 3 | 4 | 3 | 3 | 3 | 2 |
| Rates: odometer panel (approved) | 4 | 4 | 5 | 5 | 4 | 4 |
| Rates: ladder (video only) | 5 | 3 | 4 | 2 | 3 | 3 |

## 6. Prototypes delivered

All prototypes live in `prototypes/` (source, a self-contained `*.bundle.html` to open in a browser, screenshots at 390 and 1440 px, and a `HANDOFF.md` for Shikhar). They share `prototypes/shared/` (brand tokens rebuilt from the live stylesheet, nav and footer with the live disclaimer, fonts, images). Every prototype was verified with Playwright and axe-core: 0 console errors, 0 axe violations, no horizontal overflow at 390 px, prefers-reduced-motion honoured, forms switched off. None loads Lenis; only the Home prototype touches GSAP, and only by reusing the copy the live Home page already loads.

| Prototype | What it does | Technique | Bundled size | Status |
|---|---|---|---|---|
| `our-services-capital-stack/` | The Capital Stack builds layer by layer as the four narrations scroll past, in the live order (Common Equity, Preferred Equity, Mezzanine Debt, Senior Debt); brackets and the risk and return axis draw in; layers are keyboard buttons with a live region; complete static stack without JS or under reduced motion | Pure CSS scroll-driven animation (view timelines on a sticky card) with an IntersectionObserver fallback; zero libraries; ready-to-paste Webflow files included | 566 KB (live page 609 KB mobile, 679 KB desktop) | Ready for review |
| `partner-program/` | New hero with one value statement and the client's own photograph, a who-we-work-with strip, four tight benefit blocks, a vertical six-step how-it-works timeline with a visual per step, logos with context, a labelled partner form with a brochure option | CSS scroll-driven reveal with fallback; no libraries | 641 KB (live 693 KB mobile, 860 KB desktop) | Ready for review; 8 claims marked for Clemente |
| `speak-to-us/` | Direct actions (email, call, WhatsApp) above the fold on mobile, a labelled form with an enquiry-type select replacing the mistyped Subject field, a what-to-have-to-hand checklist, one real transaction card, FAQs as an accessible accordion with FAQPage JSON-LD | One CSS reveal via IntersectionObserver; no libraries | 261 KB (live 764 KB) | Ready for review; WhatsApp, response time and booking marked for Clemente |
| `homepage-track-record-and-rates/` | Build-ready concept F deal list and the odometer rates panel bound to the live feed, with the must-fix list from section 5 applied | CSS-first, feed-validated, no Lenis | see folder | In progress |

Open items for the owner on the prototypes are listed in each HANDOFF.md under "Assumptions" and "Confirm with Clemente".

## 7. Blocked or not done

- No form was submitted and nothing was changed on the live site, in Webflow, GitHub, Google Ads or GA4. The partner form defect (3.1.2) was established from markup, computed styles and event listeners, not by submitting.
- Some auditors could not reach primary sources directly from this environment (bankofengland.co.uk, federalreserve.gov, emmi-benchmarks.eu, fred.stlouisfed.org, euribor-rates.eu, the PageSpeed Insights API quota); those facts were corroborated through web search results, pre-fetched copies and the feed's own history, and are marked as such in `audit/data/`. Nothing was routed through archives or proxy services.
- Search Console and GA4 were not queried (not connected in this session); indexing statements come from the setup log.
- Lighthouse was run once per page and device from this container; scores vary by run (the homepage scored 55 and 66 on mobile in two runs). The byte weights do not vary.
- The 2026 to 2027 EMMI fee schedule could not be read; the licence figures quoted are from the 2021 to 2022 and 2024 to 2025 schedules.
- Webflow's official statement on whether `window.gsap` is exposed to custom code could not be found; the prototypes do not depend on it.
