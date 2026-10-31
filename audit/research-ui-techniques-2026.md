# 2026 UI and motion techniques worth adopting for roscap.co.uk (Webflow)

Research date: 31 October 2026. Client: Roscap, UK boutique real estate capital advisory, Webflow site, brand cream #FFFCF5 / dark teal #043435 / gold #E1C979, Boska italic display + Switzer body. Constraints honoured throughout: lighter pages (9.8 MB homepage, mobile score 55 today), lazy media, prefers-reduced-motion, no scroll-jacking, CSS scroll-driven animations first with fallback, GSAP only where needed, Lenis must be justified or dropped, nothing that implies FCA authorisation.

Verification method: official pages were fetched directly where possible (Webflow Help Center via its public Zendesk API, webflow.com, gsap.com, caniuse.com, MDN, webkit.org, Firefox release notes, web.dev, W3C, EMMI, Bank of England, ECB Data Portal, npm registry, Cal.com, Calendly). Reference pages were fetched and confirmed to return HTTP 200 unless stated. Items that could not be verified are flagged inline and listed at the end.

---

## 1. Webflow + GSAP in 2026

What is native in Webflow "Interactions with GSAP" (default on all sites without Classic interactions; launched 10 July 2025):

- Horizontal timeline editor, advanced easing editor, reusable presets, component- and variant-scoped interactions, cross-site copy/paste. Sources: https://webflow.com/updates/introducing-webflow-interactions-powered-by-gsap ; https://help.webflow.com/hc/en-us/articles/42832301823635-Intro-to-Interactions-with-GSAP (updated 2 Sep 2026).
- ScrollTrigger natively: start/end positions, scrubbing, pinning, toggle actions on enter/leave, and a "Show scroll markers" canvas option. Source: Glossary for Interactions with GSAP, https://help.webflow.com/hc/en-us/articles/42861691922963 (updated 20 Jul 2026): "Scroll trigger: Start/End positions, Scrubbing, Pinning, Toggle actions".
- SplitText (letters, words, lines), staggers (total time or per-element delay), repeat and yoyo, From/To/FromTo tweens, Set actions (class toggles, display), Animate Variable, Lottie, Spline and Rive actions, Mouse move trigger with smoothing. Source: https://help.webflow.com/hc/en-us/articles/42832337629075-Actions-and-animations-in-Interactions-with-GSAP (updated 20 Jul 2026).
- Conditional playback: page scoping, breakpoints, and prefers-reduced-motion ("no animation" or "skip to end" per interaction). Shipped 30 Sep 2025: https://webflow.com/updates/more-control-over-interactions-with-gsap . Automatic FOUC prevention for From animations (Intro article above).
- Trigger types: Click, Hover, Mouse move, Page load, Scroll, Custom event. Source: https://help.webflow.com/hc/en-us/articles/42832349989395-Triggers-targets-in-Interactions-with-GSAP (updated 20 Jul 2026).

What still needs custom code or is unavailable:

- Webflow element-specific triggers (navbar, tabs, dropdown, slider change) are not supported in GSAP interactions; they remain Classic-only (Triggers article, and the comparison table at https://help.webflow.com/hc/en-us/articles/46300264646803 , updated 8 Sep 2026).
- No panel actions exist for Flip, Draggable, Inertia, MotionPath, DrawSVG, ScrollSmoother or ScrambleText (the six action types are Animation, Set, Lottie, Spline, Animate variable, Rive). These are custom-code only. Pin + scrub itself is native, so most "capital stack" scroll choreography does not need code.
- Mixing Classic and GSAP interactions loads two runtimes; Webflow ranks performance as GSAP-only > Classic-only > both (comparison article above). Roscap should be GSAP-only.
- Webflow serves GSAP from its own CDN on published sites: webflow.com itself loads https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js plus ScrollTrigger.min.js and SplitText.min.js (observed in the webflow.com HTML on 31 Oct 2026). GSAP latest on npm is 3.15.0 (13 Apr 2026). Whether Webflow officially exposes window.gsap / window.ScrollTrigger to custom code could not be verified in Webflow documentation; third-party guides claim it (https://www.rapidevelopers.com/webflow-tutorials/webflow-gsap-animations). Treat as unverified: if custom GSAP is used, guard with a check for window.gsap and only load extra plugins (for example Flip) from the same Webflow-hosted path or jsDelivr.

GSAP licensing today: GSAP Standard "No Charge" License, effective 30 Apr 2025 (last modified 30 May 2025). Commercial use is covered, all formerly paid plugins (SplitText, MorphSVG, etc.) are free; the only prohibited use is building no-code animation tools that compete with Webflow. Source: https://gsap.com/community/standard-license/ ; Webflow announcement: https://webflow.com/blog/gsap-becomes-free ("All GSAP plugins are now directly available in and hosted by Webflow").

Custom-code limits (Help Center, all updated 2 Sep 2026): Site settings Head code and Footer code each up to 50,000 characters; page-level head and before-body code each up to 50,000 characters; Code Embed element up to 50,000 characters. Longer code should be hosted externally and referenced. Sources: https://help.webflow.com/hc/en-us/articles/33961357265299-Custom-code-in-head-and-body-tags ; https://help.webflow.com/hc/en-us/articles/33961332238611-Custom-code-embed . Older figures (10,000 / 20,000) circulating in blogs are out of date. Custom code only runs on the published site, not on the Designer canvas.

---

## 2. CSS scroll-driven animations and View Transitions

Support for animation-timeline (scroll() and view()), per caniuse with September 2026 usage data (https://caniuse.com/mdn-css_properties_animation-timeline ):

- Chrome and Edge 115+, Opera 101+, Samsung Internet 23+: supported.
- Safari 26.0+ on macOS and iOS: supported. Confirmed by WebKit: "Scroll-driven animations" shipped in Safari 26.0, https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ .
- Firefox 159+: supported. Firefox 159.0 was released 27 Oct 2026 and the release notes state "Firefox now supports scroll-driven animations" (https://www.firefox.com/en-US/firefox/159.0/releasenotes/ ; MDN: https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/159 "enabled by default").
- Global usage: 88.25 percent. Safari 18.x and Firefox 158 and earlier do not support it, so a fallback remains mandatory for roughly one visitor in nine for the next few months.

Recommended fallback pattern (progressive enhancement, no JS):

```css
/* Default: everything visible and static. Never set opacity:0 outside @supports. */
.reveal { opacity: 1; transform: none; }
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .reveal {
      animation: reveal linear both;
      animation-timeline: view();
      animation-range: entry 10% entry 60%;
    }
    @keyframes reveal { from { opacity: 0; transform: translateY(16px); } }
  }
}
```

Chrome's guidance confirms the performance case: scroll-driven animations "run off the main thread" when animating compositor-friendly properties, unlike scroll-event JS (https://developer.chrome.com/docs/css-ui/scroll-driven-animations ). Animate only transform and opacity (Webflow University says the same: https://university.webflow.com/course-lesson/interactions-animations-accessible-performance-friendly-motion ).

When CSS is enough vs when GSAP ScrollTrigger is needed:

- CSS is enough for: fade/rise reveals, reading progress bars, parallax-lite on decorative layers, image reveal masks, sticky-stack cards, the capital-stack layers filling as you scroll (sticky container + view() timeline on each layer).
- GSAP ScrollTrigger (native Webflow panel) is needed for: pinning with multi-step sequenced timelines, SplitText reveals synced to scroll, toggle actions on enter/leave, animations that must coordinate several elements with one scrubbed timeline, and anything needing callbacks. Pure JS GSAP is only needed for Flip or physics.

View Transitions API: same-document view transitions (document.startViewTransition, view-transition-name, view-transition-class) are Baseline Newly available since 14 Oct 2025 with Firefox 144 (https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available ). Cross-document (MPA) transitions, which are what a Webflow site would use between pages, were still described as partial outside Chromium in 2026 sources; Firefox status for cross-document could not be verified (MDN overview: https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API ). Use only as a progressive enhancement (a 150 ms cross-fade via @view-transition { navigation: auto; } with a prefers-reduced-motion guard) and expect no effect in some browsers.

---

## 3. Lenis smooth scroll: verdict

- Current version: lenis 1.3.27 on npm (15 Oct 2026), MIT; a 2.0.0-dev line is in progress (2.0.0-dev.6 on 29 Oct 2026). Sources: npm registry; releases at https://github.com/darkroomengineering/lenis/releases .
- Accessibility: since 1.3.26 (5 Aug 2026) Lenis honours prefers-reduced-motion by default (respectReducedMotion: true disables smoothing and makes programmatic scrolls instant). It runs on native scroll so sticky, anchors and find-in-page keep working. README caveats: smooth scroll stops over iframes (relevant if a Cal.com or map iframe is embedded), syncTouch can be unstable on iOS, and GSAP ScrollTrigger needs explicit integration (lenis.on('scroll', ScrollTrigger.update) plus driving Lenis from gsap.ticker). Source: https://cdn.jsdelivr.net/gh/darkroomengineering/lenis@1.3.27/README.md .
- Mobile: on touch devices Lenis by default leaves native touch scrolling alone (syncTouch false), so the "smooth" feel is desktop-only anyway.
- Conflicts with Webflow: Webflow's own GSAP interactions do not know about a Lenis instance; the documented ScrollTrigger integration only applies to custom-code ScrollTriggers, so scrub timing in panel-built interactions may lag or stutter while Lenis interpolates. No official Webflow or Lenis source addresses this combination (unverified; based on the integration requirement in the README). Webflow's native "smooth scroll" is anchor-link scrolling only and already respects reduced motion (https://help.webflow.com/hc/en-us/articles/33961403269907 ).
- Conflicts with CSS scroll-driven animations: no source found. By construction, Lenis moves the real scroll position each frame from JS, so CSS timelines still follow it, but the smoothing work returns to the main thread, which cancels part of the performance reason for using CSS scroll-driven animations. Flag as reasoning, not a cited fact.

Verdict for Roscap: drop Lenis. It adds roughly 10 KB plus a rAF loop on every page, gives a desktop-only effect that conflicts with the "restrained" brief, is a scroll-behaviour change the owner has ruled out in spirit (no scroll-jacking), and complicates both panel-built ScrollTrigger interactions and CSS scroll-driven animations. Use native scroll, scroll-behavior: smooth for anchor links only under prefers-reduced-motion: no-preference.

---

## 4. "Magic UI" style effects and Webflow-native resources

Magic UI (https://magicui.design ) is MIT licensed, React + Tailwind + framer-motion (https://github.com/magicuidesign/magicui , 23k stars). Aceternity UI's component list was fetched (https://ui.aceternity.com/components ); third-party sources say the free components are MIT, but the official licence page (https://ui.aceternity.com/licence ) could not be read in this session, so treat that as unverified. Neither library can be dropped into Webflow (no React pipeline), so each effect below is reproduced in CSS or small vanilla JS.

Fits a restrained finance brand (adopt, with the reproduction):

1. Number ticker (stat counters). Magic UI's Number Ticker animates on in-view (https://magicui.design/docs/components/number-ticker ). Webflow: IntersectionObserver + requestAnimationFrame counting over 900 to 1200 ms with ease-out; render the final value in the HTML so it is correct without JS and under reduced motion; format with Intl.NumberFormat('en-GB'). About 25 lines in a page embed.
2. Logo marquee (partner logos). Magic UI Marquee is CSS keyframes with a duplicated track, --duration, pauseOnHover and reverse options (https://magicui.design/docs/components/marquee ). Webflow: two copies of the logo row inside an overflow-hidden flex container, @keyframes translateX(0) to translateX(-50%), animation-play-state: paused on hover and focus-within, mask-image fade at the edges, and a static wrapped grid under prefers-reduced-motion: reduce. Add aria-hidden="true" to the duplicate row. WCAG 2.2.2 requires a pause control if it runs more than 5 seconds, so include a small pause button or stop on hover plus the reduced-motion fallback.
3. Subtle border shine on one key card (for example the single featured mandate on Home). Magic UI Shine Border / Border Beam animate a conic gradient on a pseudo-element (https://magicui.design/docs/components/shine-border ; https://magicui.design/docs/components/border-beam ). Webflow: a ::before with background: conic-gradient(from var(--a), transparent 70%, #E1C979 85%, transparent 100%), padding: 1px, mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0) with mask-composite: exclude, and an @property --a rotation animation of 12 to 14 seconds; use only on hover or once on entry, and disable under reduced motion. One card only.
4. Text reveal. Magic UI Text Reveal is a sticky section whose words gain opacity on scroll (https://magicui.design/docs/components/text-reveal ). Webflow: use native SplitText (lines) with a short stagger on scroll-in for the hero and section intros. Keep line, not character, splits in Boska italic to avoid kerning artefacts, and set the interaction's reduced-motion option to "skip to end".
5. Animated underline on links and nav. Pure CSS: background-image: linear-gradient(currentColor, currentColor) with background-size transitioning 0 to 100 percent on hover and focus-visible, 200 ms. No JS.

Avoid for this brand: aurora and gradient blob backgrounds, meteors, sparkles, globe or world map, particle backgrounds, 3D tilt cards, spotlight cursors, typewriter and "encrypted text", bento grids with glow, infinite moving testimonial cards. They read as SaaS, cost GPU time on mobile, and several auto-move (2.2.2 and 2.3.3 exposure).

Webflow-native resources (verified facts):

- Finsweet Attributes v2.7.1 (25 May 2026), Apache-2.0, free and open source; the CMS Filter solution is now called "List Filter" and v1 is marked discontinued. Load the @finsweet/attributes@2 module script once and add fs-list-* attributes to the Collection List, filter inputs and tag elements. Supports URL query sync, fuzzy matching, debounce and active classes. Source: https://finsweet.com/attributes/list-filter ; live example with 13.2k clones: https://webflow.com/made-in-webflow/website/cms-filter-example-by-attributes . Fits Track Record filtering (22 deals) without a build step.
- Osmo Supply (https://www.osmo.supply/ ): paid "Vault" of copy-paste Webflow and GSAP resources, Webflow-native copy, 20 free demo resources, Lifetime plan removed 10 Jul 2026, recurring membership only; prices are rendered client-side and were not captured. Useful for one-off reference implementations; licence prohibits storing resources outside the Vault.
- Slater (https://slater.app/ ): hosted JS/CSS editor for Webflow custom code with AI assistance, free trial; its real value is keeping custom code out of the 50,000-character embeds and versioned. Optional.
- Flowbase (https://www.flowbase.co/ ): Webflow components, wireframes and "Boosters"; Relume (https://www.relume.io/ ): component library and site builder; Relume pricing page is JS-rendered and was not verified. Both are layout accelerators, not needed for a site that is already designed.
- Carousels: Swiper 14.4.0 (30 Oct 2026, MIT) with the opt-in a11y module (https://swiperjs.com/swiper-api#accessibility-a11y ); Splide 4.1.4 (last published 9 Nov 2022, MIT) follows the W3C carousel pattern with a live region (https://splidejs.com/guides/accessibility/ ) but is effectively unmaintained. Webflow's native Slider needs a visible focus style to be keyboard accessible (https://help.webflow.com/hc/en-us/articles/33961346219923 ), has autoplay and swipe settings (https://help.webflow.com/hc/en-us/articles/33961317173139 ), and its slide-change event cannot trigger GSAP interactions. W3C APG requires autoplaying carousels to stop on hover and focus and to offer a pause button (https://www.w3.org/WAI/ARIA/apg/patterns/carousel/ ). Recommendation: replace the 6-step carousel with a non-carousel layout (section 5); where a carousel is unavoidable use Swiper with a11y enabled and no autoplay.

---

## 5. Partner / introducer programme pages: references and the structure that works

Live references (all returned HTTP 200 on 31 Oct 2026):

1. Finbri, "Bridging and development finance introducers", https://www.finbri.co.uk/bridging-and-development-finance-introducers . Clear headline promise ("earn market-leading commission"), "How it works", two referral routes (introducer stays involved, or hands over) as numbered steps ending in "upon successful completion you receive your commission", repeat-business commission stated, what information to send per enquiry type, onboarding form. Weak on imagery and proof.
2. Commercial Trust, "Introducer Reward Scheme", https://www.commercialtrust.co.uk/introducers/ . One-paragraph positioning, who it is open to (letting agents, estate agents, IFAs, mortgage advisers, "other parties subject to due diligence"), commission "agreed in advance", a "why work with us" list with concrete proof points (80+ lenders, DIP in two hours), a dedicated BDM, Google review snippets, and a short partner-specific form with "when are you free for a call".
3. Brickflow, "Partner with us", https://brickflow.com/partner-with-us (plus https://brickflow.com/partner-with-us/ways-to-partner-with-us and https://brickflow.com/partner-with-us/land-estate-agents ). Strongest structure: one value statement, "who can partner" segmented by profession, four tiered ways to partner (refer, website click-through, white label, API) each with "best for", transparent economics (50 percent of commission on a client's first transaction and 25 percent thereafter on the referral route; 50/50 on white label; a £49 monthly fee in one scenario), marketing support (co-branded emails, downloadable guide), and a demo booking CTA.
4. SPF Private Clients, "Introducers", https://www.spf.co.uk/introducers/ . Short trust-led copy ("we pay away upon the successful completion of each transaction"), four value pillars, a minimal become-an-introducer form, and model regulatory footer wording.
5. Sirius Finance, "Partnerships", https://siriusfinance.co.uk/partnerships/ . Dedicated team per key partner account, bespoke SLAs with a stated 24-hour response pledge, transparent fee structure and bespoke introducer agreements, "real people, real meetings", Trustpilot proof, and two named partnership managers with direct numbers. Also https://www.ennessglobal.com/introducers (Private Client Advisers: counts of advisers and countries served, "explore possibilities free of charge, no-name basis", a become-an-adviser CTA).

Structure to adopt for Roscap's Partner Program page (replacing the text-over-stock-photo hero, icon cards and 6-step carousel):

- One value statement plus one proof number (deals closed or capital arranged), with a restrained photograph of a real asset or team, not stock.
- "Who we work with" as a short segmented list (agents, lawyers, accountants, wealth managers, other advisers) and the kinds of mandates Roscap takes (debt and equity for developers, investors, family offices).
- "How it works" as a vertical stepped timeline (sticky left label, right content with a small image or diagram per step) revealed by CSS view() animations, not a carousel. Six steps is fine as a column; pin + scrub only if the owner wants the sequence to feel guided on desktop.
- "What partners receive": fee basis in plain words (agreed in advance, paid on completion, repeat business honoured), response-time pledge, named relationship contact, status updates. Brickflow and Sirius show that stating economics and SLAs is the norm.
- Partner logos with context (one line on the type of firm) and one or two attributed testimonials; a Google or Trustpilot score only if real.
- Partner-specific form (firm, role, typical client, deal size range, "how do you want to work together") or a booking link into a partner-specific event type.

UK compliance flag (flag only, not advice): introductions and referral fees sit near regulated territory. RAO article 33 is the "Introducing" exclusion (https://www.legislation.gov.uk/uksi/2001/544/article/33 ) and FCA PERG 8.33 explains it (https://www.handbook.fca.org.uk/handbook/PERG/8/33.html ). Roscap is not FCA authorised, so the page must not imply authorisation, must make clear the scope is unregulated commercial real estate finance, and any paid-introducer wording should be checked by a regulatory adviser. SPF's footer shows how an authorised firm words the boundary ("The FCA does not regulate some forms of Buy-to-Let and commercial mortgages, most business finance"); Roscap's equivalent needs the opposite framing and legal review.

---

## 6. Contact / "Speak to us" pages for advisory firms

Verified references:

1. Buckingham Capital Consulting, https://www.buckinghamcapitalconsulting.com/contact . Headline "Speak to an expert", explicit promise ("We reply within three business hours, and your written proposal follows the same day"), a three-step "What happens next" block (message, written proposal, engagement letter), WhatsApp, Telegram and email alongside the form, and a "What do you need?" selector. Best single model for a response-time promise with an expectations list.
2. Sirius Finance, https://siriusfinance.co.uk/contact/ . Address and phone above the form, enquiry-type selector, "where did you hear about us" (now including ChatGPT, Claude, Gemini, Perplexity), explicit consent copy and separate marketing opt-ins; its partnerships page states a 24-hour response pledge.
3. Together (intermediaries), https://togethermoney.com/intermediaries/introducing-brokers . Opening hours plus "if you contact us by 2pm we'll do our best to get back to you the same day" next to the form.
4. Enness Global, https://www.ennessglobal.com/contact . Phone, email, "Start WhatsApp Chat" button, and a long FAQ accordion beneath the form.

Patterns that convert, mapped to Roscap:

- Named contact with photo and a response-time promise ("a director replies within one business day"). Keep the promise realistic and honoured.
- "What to prepare" checklist in three to five bullets (asset and location, loan or equity quantum, timeline, sponsor track record, business plan or appraisal if available) so the first call is productive; Finbri's enquiry-field list is a good source for the fields.
- Calendar booking: Cal.com offers inline, element-click popup and floating-button embeds via a Code Embed element in Webflow (https://cal.com/help/embedding/adding-embed.md ; Webflow integration page https://webflow.com/integrations/cal ). Webflow's embed editor can mangle double quotes inside data-cal-config, so use the inline or popup snippet from Cal.com's generator with single-quoted JSON (community report: https://discourse.webflow.com/t/embed-cal-com-pop-up-via-element-click/277487 ). Privacy: Cal.com states "no third-party cookies in the product" and acts as processor under its DPA at cal.com/dpa (https://cal.com/privacy ). Calendly shows its own cookie banner inside the embed; hide_gdpr_banner=1 hides it but "Calendly uses cookies even if the banner is hidden", so Calendly advises loading the widget only after consent (https://calendly.com/help/calendly-cookie-management-and-banner ). For a UK site Cal.com (EU-hosted option) or a click-to-load Calendly behind consent is the cleaner route; load the embed on click, not on page load, to protect the performance budget.
- FAQ accordion: use native details/summary or Webflow's accordion with aria-expanded, keep answers short. FAQPage structured data no longer earns a rich result anywhere: Google removed FAQ rich results entirely in May 2026 and has removed the documentation (https://developers.google.com/search/updates ). Keeping FAQPage JSON-LD is harmless and may still help machine readability, but do not design for it.
- WhatsApp click-to-chat: https://wa.me/447xxxxxxxxx?text=URL-encoded (international format, no zeros, brackets or dashes); the official FAQ is https://www.whatsapp.com/faq/en/general/26000030 (direct fetch returned HTTP 400 in this environment; format confirmed via search snippets of that page). Place it as a secondary CTA with business hours; avoid third-party chat widgets (Elfsight etc.) for weight.

---

## 7. Track record / transaction showcase patterns

Verified references:

1. Atelier Finance, "Case studies", https://atelierfinance.co.uk/case-studies/ . Filter bar by category (Bridging, Build-to-Rent, Care, PBSA, Residential) and by location, reset filter, cards with sector tag, one-line description, location, loan size and term ("Hammersmith, London, £46.1m, 18 months"). The closest model to a 22-deal grid with Finsweet List Filter.
2. Precede Capital Partners, "Portfolio", https://www.precedecapital.com/portfolio/ . Card fields: headline (scheme and loan, for example "£105.2m green loan"), Type, Units, Development partners, Funding partners, Location. Shows how structured metadata makes cards scannable without photography.
3. Sirius Finance, "Portfolio", https://siriusfinance.co.uk/portfolio/ . Narrative case cards with loan amount, structure, the named adviser and a short problem/solution story; no filters. Useful for the storytelling layer on a deal detail page.
4. Finsweet's own CMS filter demo (Made in Webflow, 13.2k clones), https://webflow.com/made-in-webflow/website/cms-filter-example-by-attributes , as the implementation reference.

Recommended for Roscap's 22 deals: a CMS Collection with fields for sector, capital type (senior, stretch, mezzanine, equity, JV), region, quantum band, year and a one-line outcome; Finsweet List Filter with tag-style filters and URL sync; cards that show quantum, capital type and location first; CSS view() entry reveal with the fallback above; a sticky summary strip (total arranged, number of deals, average size) using the number ticker. Map view: no verified real-estate advisory example with a filterable map was found; interactive maps cost 300 KB or more of JS and tiles, so if geography matters use a static SVG of the UK with dots generated from CMS fields, not a map library.

---

## 8. Live market rates on a Webflow site

Feasible architectures:

A. Scheduled job writing to the Webflow CMS (recommended). A daily Make or Zapier scenario fetches the sources, updates a "Rates" CMS item and publishes it. Zapier has ready templates ("Retrieve and update financial rates in Webflow daily using Schedule by Zapier, Webhooks, Code by Zapier", https://zapier.com/templates/details/a870884f486e0b7713400cb0ea3fc3fd26f7b5ce3bad6d957fabc931dc337959 ). Creating or updating an item does not publish it, so include a publish step. The strip renders server-side with an "as of" date and attribution; zero client JS.

B. Client-side fetch of a small JSON/CSV endpoint. Works only where the source sends CORS headers. Tested on 31 Oct 2026: the ECB Data Portal API returns access-control-allow-origin: * (client fetch possible); the Bank of England IADB CSV endpoint returns no CORS header (client fetch blocked), and FRED requires an API key that would be exposed in page source. So B is only viable for ECB data, and even then adds a request to every page view.

C. Webflow Cloud (GA, usage-based pricing on all site plans, Next.js or Astro on a Workers runtime, https://webflow.com/updates/webflow-cloud-ga and https://developers.webflow.com/webflow-cloud ) or a Cloudflare Worker could host a tiny cached proxy; a competitor page claims Webflow Cloud has no first-party scheduled jobs (https://vercel.com/kb/guide/vercel-vs-webflow-cloud ), not verified against Webflow docs. Overkill for three numbers; A is simpler.

Data sources and terms:

- Bank Rate: Bank of England IADB series IUDBEDR (Official Bank Rate, daily). Working CSV call tested 31 Oct 2026: https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Sep/2026&Dateto=now&SeriesCodes=IUDBEDR&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N returned "DATE,IUDBEDR" rows (3.75 on 1 Sep 2026). The endpoint is undocumented and community-maintained wrappers warn it can change (https://cran.r-project.org/web/packages/boe/readme/README.html ). Terms: the Bank's legal page states "Reproduction of data in the Database is subject to the terms of the UK Open Government Licence" (https://www.bankofengland.co.uk/legal ), which permits commercial reuse with attribution; a third-party copy of older IADB terms says commercial use needs permission, which could not be reconciled with the live legal page, so attribute as "Source: Bank of England" and keep a link.
- Fed funds target range: FRED series DFEDTARU (upper) and DFEDTARL (lower), daily, https://fred.stlouisfed.org/series/DFEDTARU and https://fred.stlouisfed.org/series/DFEDTARL . FRED API terms (https://fred.stlouisfed.org/docs/api/terms_of_use.html ) require a free API key, attribution, and state that FRED serves non-commercial, educational and personal uses with other (commercial) uses subject to additional restrictions, and that redistributing third-party proprietary series commercially needs the provider's permission. The FRED pages timed out from this environment; those points come from search snippets of the official terms and should be read in full before launch. The target range is Federal Reserve Board data (public domain), which is the easy case.
- 3M EURIBOR: EMMI's own FAQ says delayed Euribor data (24-hour delay, rolling 25 publication days) is free after registration "solely for non-commercial purposes", and "a Licensing Agreement with The European Money Market Institute is mandatory for all commercial use" of the data and trademark; any use of the name must indicate it is a registered trademark (https://www.emmi-benchmarks.eu/faq/euribor ; https://www.emmi-benchmarks.eu/faq/subscriptions/ ). The 2024-2025 fee schedule lists an Information Vendor "Delayed Data distribution" licence at €17,700 per year, unlimited sites (https://www.emmi-benchmarks.eu/globalassets/documents/pdf/subscriptions/d0196b-2024-2025-fee-schedule.pdf ); the 2021 pricing policy additionally listed "1.040€ per hosted website" (https://inte.emmi-benchmarks.eu/globalassets/documents/pdf/the-institute/pricing-policy-2021.pdf ). Showing the current 3M fixing on a commercial website is therefore not free of charge without a licence. Alternative tested: the ECB Data Portal publishes the monthly average 3M Euribor (series FM.M.U2.EUR.RT.MM.EURIBOR3MD_.HSTA; September 2026 = 2.635 percent) with CORS enabled, and ECB terms allow reproduction if the ECB is cited as source (https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html ); the series metadata says "provided by Refinitiv", so confirm redistribution rights with the ECB before relying on it. No daily Euribor series exists in the ECB portal (query returned 404).

Recommendation: show Bank Rate and the Fed target range daily via architecture A with "as of" dates and source lines; for EURIBOR either license from EMMI, show the ECB monthly average labelled as such with ECB attribution after confirming rights, or link out to EMMI. Never present the strip as advice, and do not add rate commentary that could read as regulated advice.

---

## 9. Accessibility and performance guardrails for motion

WCAG 2.2 (https://www.w3.org/TR/WCAG22/ ):

- 2.2.2 Pause, Stop, Hide (Level A): any moving, blinking or scrolling content that starts automatically and lasts more than five seconds needs a pause/stop/hide control. Applies to the hero video (Webflow's Background Video has a built-in play/pause toggle setting, https://help.webflow.com/hc/en-us/articles/33961364072851 ), logo marquees and any autoplay carousel.
- 2.3.3 Animation from Interactions (Level AAA): motion triggered by interaction, including parallax, can be disabled unless essential; satisfy it with prefers-reduced-motion and by avoiding non-essential parallax (https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html ).
- 2.3.1 Three Flashes or Below Threshold (Level A): no content flashes more than three times per second.
- 2.5.8 Target Size (Minimum) (Level AA, new in 2.2): pointer targets at least 24 by 24 CSS pixels or adequately spaced; filter chips, carousel dots, accordion toggles and footer links need this (https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html ).
- 1.4.3 Contrast (Minimum) (Level AA): 4.5:1 for text, 3:1 for large text. Computed for the brand: dark teal on cream 13.24:1 and cream on teal 13.24:1 (pass); gold #E1C979 on teal 8.29:1 (pass); gold on cream 1.60:1 (fails even for large text, so gold is a decorative accent on cream, never text or a sole focus indicator). If gold text on cream is wanted, a darkened gold such as #8A6D1F gives 4.78:1.

INP budget: Core Web Vitals "good" is at or below 200 ms at the 75th percentile, "needs improvement" 200 to 500 ms, "poor" above 500 ms (https://web.dev/articles/inp ). Implications: no scroll listeners doing layout work, no main-thread smooth scroll, filter and accordion handlers must stay short, and third-party embeds (calendar, chat, maps) should load on interaction.

prefers-reduced-motion implementation (https://web.dev/articles/prefers-reduced-motion ): author animations inside @media (prefers-reduced-motion: no-preference) so the default is static; in JS check window.matchMedia('(prefers-reduced-motion: reduce)') before starting counters or marquees; in Webflow set every GSAP interaction's reduced-motion option to "no animation" or "skip to end"; keep the hero poster static and skip autoplay when reduce is set.

Webflow performance facts to drive the budget: Background Video accepts files under 30 MB in webm, mp4, mov or ogg (https://help.webflow.com/hc/en-us/articles/33961278898323 ) and auto-generates a poster that is often oversized (community report, https://discourse.webflow.com/t/auto-generated-bg-video-posters-are-too-big/25817 ), so upload a compressed poster and a 6 to 10 second 720p loop of 2 to 3 MB or hide the video on tablet and below; images support Lazy and Eager loading settings (https://help.webflow.com/hc/en-us/articles/33961290329235 ); Webflow's own speed guidance names large images and excessive interactions as the top causes (https://help.webflow.com/hc/en-us/articles/33961401004819 ) and offers per-page and asynchronous JavaScript loading in publishing options (https://help.webflow.com/hc/en-us/articles/38265301927059 ). Lazy-loading below-the-fold background video needs custom code (Webflow example repo: https://github.com/Webflow-Examples/lazy-load-bg-video ).

---

## Recommended for Roscap (prioritised)

| # | Technique | Where | Why | Webflow implementation route | Risk / notes | Effort |
|---|-----------|-------|-----|------------------------------|--------------|--------|
| 1 | Hero media diet: static poster first, deferred 720p loop under 3 MB, hidden below tablet, play/pause toggle | Home hero | Biggest lever on the 9.8 MB page and LCP; satisfies 2.2.2 | Background Video element with custom poster, Include play/pause button, display none on tablet/mobile breakpoint; or image-only hero | Owner attachment to video; test LCP on 4G | S |
| 2 | CSS scroll-driven entry reveals with @supports and reduced-motion guards | All pages, section intros and cards | Off-main-thread, zero JS, now shipped in all engines (Firefox 159, Safari 26) | Site-wide style embed (one small CSS block) plus a .reveal class in Designer | 12 percent of visitors see static content; that is the intended fallback | S |
| 3 | Capital stack scroll animation | Our Services | Core explanatory moment; pin + scrub is native in GSAP interactions | Sticky container, Scroll trigger with scrub, staggered From animations per layer, reduced-motion set to skip to end; CSS view() version as fallback | Keep under 1.5 viewports of scroll; no horizontal hijack | M |
| 4 | Number ticker for stats and track-record totals | Home stats, Track Record summary | Light proof moment; values present without JS | 25-line vanilla JS in page embed, IntersectionObserver, final values hard-coded in HTML | Respect reduce; avoid implying returns or regulated figures | S |
| 5 | SplitText line reveal with stagger | Home hero headline, page intros | On-brand restraint; native, no custom code | GSAP interaction: Page load trigger, Animation From, split by lines, stagger 60 to 80 ms, skip to end under reduce | Split by lines not characters for Boska italic; check FOUC on slow devices | S |
| 6 | Partner Program rebuild: value statement, segmented audiences, vertical stepped timeline, transparent "what partners receive", logos with context, partner form or booking | Partner Program | Owner says page is dry; references (Brickflow, Sirius, Commercial Trust) show the pattern | Designer layout plus technique 2; CMS for steps and logos; Cal.com partner event type | Compliance wording around fees needs legal review; no implied FCA status | M |
| 7 | Track Record filters with Finsweet List Filter and structured deal cards | Track Record (22 deals) | Atelier and Precede show structured, filterable cards convert attention into credibility | Collection fields (sector, capital type, region, quantum, year), fs-list attributes, URL sync | Free, Apache-2.0, 2.7.1 maintained; test keyboard focus on filter chips (2.5.8) | M |
| 8 | Logo marquee, CSS only, pausable, static under reduce | Partner Program, Home | Familiar trust pattern at near-zero cost | Two duplicated logo rows, keyframes, pause on hover/focus, pause button | 2.2.2 pause control required; lazy-load logo SVGs | S |
| 9 | "Speak to us" upgrade: named contact, one-business-day promise, what-to-prepare list, click-to-load Cal.com, WhatsApp link, native FAQ accordion | Speak to Us | Buckingham, Sirius and Together show the pattern; booking removes back-and-forth | Code Embed for Cal.com popup loaded on click; details/summary FAQ; wa.me link | Cal.com DPA and privacy policy update; FAQPage schema optional, no rich result | M |
| 10 | Animated underline and 200 ms focus/hover transitions | Nav, links, buttons | Restrained polish, zero JS | CSS in site embed or Designer transitions | None | S |
| 11 | Market-rates strip via scheduled job into CMS with "as of" date and sources | Home strip | Accurate, cached, no client JS, licence-safe | Make or Zapier daily: BoE IADB CSV (IUDBEDR), FRED DFEDTARU/DFEDTARL with API key, publish item | EURIBOR needs EMMI licence or ECB monthly average with attribution; no rate commentary | M |
| 12 | One subtle gold border shine on a single featured card | Home track-record teaser | A single moment of craft that stays restrained | CSS conic-gradient pseudo-element, hover or one-time entry, off under reduce | Use once; gold passes contrast only on teal | S |

## Do not adopt

- Lenis or any smooth-scroll library: desktop-only effect, main-thread cost, interferes with panel-built ScrollTrigger scrub and with the point of CSS scroll-driven animations, and conflicts with the no-scroll-jacking rule.
- Horizontal scroll sections, scroll snapping between full-screen panels, or long pinned sequences: scroll-jacking by another name; GSAP's docs also note pinning delays on fast scroll.
- Classic and GSAP interactions on the same site: two runtimes, Webflow ranks it worst for performance.
- Aurora/gradient-blob/particle/meteor/sparkle backgrounds, 3D tilt cards, cursor spotlights, globes and world maps, typewriter or scramble text: SaaS vocabulary, GPU and INP cost, 2.2.2 and 2.3.3 exposure.
- Autoplaying carousels (including the current 6-step carousel) and the native Webflow Slider for content that matters: no GSAP triggers, focus styling needed, autoplay fails 2.2.2 without controls; a vertical timeline is more legible and lighter.
- Splide as a new dependency: last release November 2022.
- Interactive map library for 22 deals: hundreds of KB for little insight; use a static SVG or a plain list by region.
- Third-party chat widgets (Elfsight WhatsApp etc.) and always-on calendar iframes: weight and cookies; use a wa.me link and click-to-load booking.
- Gold #E1C979 as text or focus indicator on cream: 1.60:1 contrast.
- Showing live EURIBOR fixings without an EMMI licence, or any rate commentary that could read as advice: licensing cost (€17,700 per year vendor tier) and regulatory risk for a non-FCA-authorised firm.
- Cross-document View Transitions as a core experience: still partial outside Chromium; fine only as a guarded 150 ms cross-fade.

## Could not be verified in this session

- Whether Webflow officially exposes window.gsap and window.ScrollTrigger to custom code (only third-party guides say so; observed CDN paths on webflow.com are indirect evidence).
- Firefox support status for cross-document View Transitions; Safari 26.4 and 26.5 scroll-driven animation fixes claimed by one blog.
- Lenis behaviour alongside CSS scroll-driven animations and Webflow panel interactions (no official source either way).
- Aceternity UI licence text (site unreachable for the licence page), Osmo and Relume current prices (rendered client-side).
- FRED API terms were read via search snippets of the official page because fred.stlouisfed.org timed out from this environment; read in full before launch.
- WhatsApp official click-to-chat FAQ returned HTTP 400 here; the wa.me format was confirmed from search snippets of that page.
- The older "non-commercial only" IADB terms quoted by a third party versus the live Bank of England legal page (OGL); the live page governs.
- Webflow Cloud scheduled-job support (only a competitor page states there is none).
