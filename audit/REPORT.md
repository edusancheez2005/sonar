# roscap.co.uk website audit

Date: 31 October 2026. Prepared for Edu (Roscap SEO and web programme) and Clemente. Status: DRAFT SKELETON, findings being consolidated.

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

Pending consolidation.

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

Pending.
