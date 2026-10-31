# Cookie consent for roscap.co.uk: handoff for Shikhar

Prepared 31 October 2026. In-house banner and preferences dialog with Google Consent Mode v2, approved by Clemente (no third-party CMP). This document says where every snippet goes in Webflow, how to test on staging, what to change in Google Ads and GA4, and what remains for compliance review. British English, digits, no libraries.

## 1. Why this is needed (one paragraph for context)
Today gtag.js (GA4 G-H8HS2R6NLS) runs in the head of all 25 pages with no consent default, so _ga and _ga_H8HS2R6NLS are set and hits go to analytics.google.com and doubleclick.net on first paint. /contact-us-success also sets _gcl_au and _gcl_ls and fires Google Ads conversion pings. The Cookie Policy promises a banner and a footer preference link that do not exist. Under UK GDPR and PECR regulation 6 (as amended by the Data (Use and Access) Act 2025, in force February 2026) these optional cookies need consent, and because the GA4 property is linked to Google Ads the statistical-purposes exception is not relied on. Google's EU User Consent Policy (which covers the UK) requires Consent Mode v2 before Google Ads can restart. This handoff is for compliance review, not legal advice.

## 2. Files
Folder: `prototypes/cookie-consent/` in this repository. Open `cookie-consent.bundle.html` in a browser to try it; the state panel at the bottom of the demo shows the stored choice and every Google call in order.

| File | What it is | Where it goes |
|---|---|---|
| webflow/site-head.html | Consent Mode v2 default, a loader that fetches gtag.js only after a visitor allows analytics or marketing (basic consent mode), stored-choice replay, GA4 and Google Ads config (3,099 characters) | Site settings > Custom code > Head code, first script in the slot |
| webflow/site-footer.html | Banner and dialog markup, inline CSS and JS (17,412 characters, limit 50,000) | Site settings > Custom code > Footer code |
| webflow/footer-link-note.md | The "Cookie preferences" footer link: element, class, attribute | Footer Symbol, Legal column |
| webflow/cookie-policy-wording.md | Replacement Cookie Policy and Privacy Policy text with the cookie table | Rich text on /cookie-policy and /privacy-policy, after compliance review |
| consent.css, consent.js | The unbundled source of the CSS and JS inside site-footer.html (5,643 + 7,744 bytes, 13,387 total) | Reference only; edit these and rebuild if anything changes |
| index.html | Demo page (homepage stand-in) with a prototype-only state panel | Not for Webflow |
| cookie-consent.bundle.html | Single-file bundle of the demo for review in any browser | Not for Webflow |

## 3. Install in Webflow, in this order

### Step 0. Remove the existing Google tags first (important)
1. Site settings > Integrations > Google Analytics: delete the measurement ID G-H8HS2R6NLS and save. Webflow prints the Integrations tag before the custom Head code slot, so a tag added there would run before the consent default and set _ga before any choice. The ID moves into the head snippet instead.
2. Site settings > Custom code > Head code: delete the current gtag.js snippet (`<script async src="https://www.googletagmanager.com/gtag/js?id=G-H8HS2R6NLS">` and the `gtag('config', 'G-H8HS2R6NLS')` block). It is replaced by site-head.html.
3. Check every page's Page settings > Custom code (all 25 pages, in particular Home, Contact and /contact-us-success) for a second gtag.js loader or `gtag('config', ...)` and remove them. Keep the conversion event on /contact-us-success (see step 4).
4. If a Google Ads tag was ever added through Integrations or a Webflow app, remove it the same way. Only one gtag.js loader may exist, and it must be the one in site-head.html.

### Step 1. Head code
Paste the whole of webflow/site-head.html at the very top of Site settings > Custom code > Head code, above anything else (fonts, Swiper CSS and so on can follow). Check the Google Ads ID in the `gtag('config', 'AW-...')` line: AW-238397354910 was found in the account as conversion tracking id 238397354910. Confirm it in Google Ads > Tools > Data manager (Tag setup) before publishing; if it differs, change the one value.

### Step 2. Footer code
Paste the whole of webflow/site-footer.html into Site settings > Custom code > Footer code. If the slot already holds site-wide scripts, paste this block after them. The script relocates the banner and dialog to the top of `<body>` at runtime so they sit straight after any skip link in the tab order; no change to page structure is needed. The policy links inside it point at /cookie-policy (relative), which works on staging and production.

### Step 3. Footer link
Follow webflow/footer-link-note.md: a Text Link "Cookie preferences" in the footer Symbol's Legal column with href `#cookie-preferences`, combo class `cookie-preferences` and custom attribute `data-rc="open"`. The Cookie Policy already refers to this link.

### Step 4. /contact-us-success conversion event
Keep the Google Ads conversion snippet on that page's footer custom code in this form only, so it fires only for visitors who allowed marketing measurement:
```html
<script>
(function () {
  try {
    var m = document.cookie.match(/(?:^|; )roscap_consent=([^;]*)/), c = m && JSON.parse(decodeURIComponent(m[1]));
    if (c && c.marketing) gtag('event', 'conversion', { send_to: 'AW-238397354910/CONVERSION_LABEL' });
  } catch (e) {}
})();
</script>
```
Do not add a second gtag.js loader on that page. In basic mode the Google tag is not even loaded for a visitor who has not said yes, and the Ads destination is configured only for visitors who allowed marketing, so nothing reaches Google Ads without consent. The GA4 key event generate_lead needs no change (it is built in GA4 from page_view, which only exists when analytics is allowed).

### Step 5. Policy text
After compliance review, paste the text from webflow/cookie-policy-wording.md into /cookie-policy and /privacy-policy. Remove "(if enabled)" and the sentence saying the banner provides the cookie list. Add a last-updated date.

### Step 6. Publish to staging only
Publish to roscap-site.webflow.io and run section 4 before publishing to www.roscap.co.uk.

## 4. Test on staging (roscap-site.webflow.io)
Use a fresh incognito window for each run.
1. First visit, no interaction. DevTools > Application > Cookies: only _cfuvid (Cloudflare) should be present. No _ga, no _ga_H8HS2R6NLS, no _gcl_*. No roscap_consent yet either (it is written only when a choice is made). Network tab: no request at all to googletagmanager.com, google-analytics.com or doubleclick.net before a choice (basic consent mode).
2. Tag Assistant (tagassistant.google.com): before a choice it finds no Google tag on the page, which is correct in basic mode. If it does find one, a leftover tag from step 0 is still present. After Accept all, connect again: the Consent tab must show the default (analytics_storage, ad_storage, ad_user_data and ad_personalization denied) followed by the update to granted, both before the G-H8HS2R6NLS and AW-238397354910 tags fire.
3. Click Accept all: roscap_consent appears (JSON with version, analytics, marketing, timestamp; 6 months; SameSite Lax; Secure; path /), _ga and _ga_H8HS2R6NLS appear, Tag Assistant shows a consent update to granted (ad_personalization stays denied), the banner disappears. Reload: no banner, consent update appears before the GA4 tag.
4. Fresh incognito, click Reject non-essential: roscap_consent stored with both false; no _ga; no request to Google on this or any later page. Fresh incognito, Manage preferences, analytics on and marketing off, Save choices: _ga appears, the GA4 tag fires, and no Google Ads request is made.
5. Footer link "Cookie preferences": dialog opens with "Your choice: analytics on, marketing off. Saved 31 October 2026." style status. Escape closes without saving and returns focus to the link. Switch marketing on and Save choices: _gcl cookies may now be set on /contact-us-success after a form submission.
6. Switch analytics off and save after it was on: _ga and _ga_H8HS2R6NLS are deleted by the banner.
7. Keyboard only: Tab from the top of the page reaches the banner straight after the skip link (Cookie Policy link, Accept all, Reject non-essential, Manage preferences). In the dialog, Tab and Shift+Tab stay inside, Space toggles a switch, Escape closes.
8. Phone (or 390 px emulation): banner is a full-width bottom sheet, the page scrolls behind it, no horizontal scroll, every control at least 44 px tall.
9. System setting "reduce motion" on: the banner appears without sliding.
10. Policy version test: in DevTools console run `localStorage.setItem('roscap_consent', JSON.stringify({version:0,analytics:true,marketing:true,timestamp:new Date().toISOString()}))`, reload: the banner asks again and no update is sent from the stale value.
11. Send one test enquiry on staging only (never on production) and check in Google Ads that the conversion registers with consent granted, and in GA4 DebugView that generate_lead arrives with consent state granted.

## 5. Google Ads and GA4 settings to change or confirm
Google Ads
- Consent Mode v2 is active once step 1 is live; Google Ads > Goals > Conversions > Diagnostics reports it after a few days of traffic (as basic mode). Nothing to switch on in the account. Basic mode means Google does not model conversions for visitors who decline; Google only models above about 700 ad clicks over 7 days for a country and domain grouping, which Roscap's budget is far below, so nothing is lost.
- ad_personalization is never granted by this banner, so remarketing lists will not populate. That is deliberate: the banner describes measurement only. If Roscap later wants remarketing, the category text and the Privacy Policy must change first, then ad_personalization can be tied to the marketing switch (one line in consent.js and one in site-head.html).
- Confirm the conversion ID (AW-238397354910) and the conversion label used on /contact-us-success.

GA4 (property for G-H8HS2R6NLS)
- Admin > Data collection: keep Google Signals switched off. The config also passes allow_google_signals: false so Signals stays off even if the setting is toggled by mistake. Signals combines data with Google accounts for personalised advertising, which the banner does not offer.
- Admin > Data collection > Consent settings: after publishing, this page should show that consent signals are being received.
- Admin > Data settings > Data retention: set it deliberately (2 or 14 months) and put the same figure in the policy text ([confirm] in cookie-policy-wording.md).
- Cookie lifetime: the config sets cookie_expires to 34,128,000 seconds (13 months) so _ga lasts 13 months in every browser, matching the policy. Without it Safari and Firefox would keep _ga for 2 years while Chrome caps it at 400 days.

## 6. Retention and re-consent
- roscap_consent lasts 180 days (6 months). After that the banner asks again.
- To ask everyone again earlier (new cookie, new purpose, new vendor), change `VERSION = 1` to `2` in both site-head.html and the script inside site-footer.html, and publish. A stored choice with an older version is ignored, no consent update is sent from it, and the banner shows.
- Withdrawal: Reject or switching a category off deletes the matching Google cookies (_ga, _ga_H8HS2R6NLS, _gcl_au, _gcl_ls) on the current host and on the parent domain.

## 7. Basic consent mode (as shipped) and why
The head snippet sets the denied default but does not load gtag.js. `rcTags()` loads it once, on the first "yes" (from a stored choice in the head, or from the banner via `signal()` in the consent script), then configures GA4 only if analytics is allowed and the Google Ads tag only if marketing is allowed. A visitor who rejects, or has not chosen yet, sends nothing to Google at all.

Why basic rather than advanced: in advanced mode gtag.js loads for everyone and sends cookieless pings before consent so Google can model conversions. Those pings still send device and page information to Google before any choice, which is the harder position to defend under PECR and the ICO's guidance on storage and access technologies, and the modelling they enable needs about 700 ad clicks over 7 days, which Roscap does not reach. Basic mode therefore costs nothing measurable and keeps the compliance story simple.

To switch to advanced mode later (only if the budget grows past the modelling threshold and the reviewer agrees): call `w.rcTags({analytics: true, marketing: true})` unconditionally at the end of the head snippet instead of only for a stored choice; the consent default keeps cookies off until a grant.

## 8. Accessibility and quality results (prototype bundle, Playwright, Chromium)
- 72 automated checks, 0 failed, plus 9 checks of the once-per-visit behaviour (first page shows it, the next page does not, a saved choice hides it, an old version asks again, a new visit asks again) (includes basic-mode checks: no loader and no config before a choice or after Reject; analytics-only loads GA4 without Google Ads; Accept all configures Google Ads once) (results: `audit/qa/cookie-consent-verify.json`).
- axe-core 4.10: 0 violations of any impact at 1440x900 and 390x844, banner state and dialog state.
- 0 console errors; 0 third-party requests from the banner, dialog or demo page.
- Tab order: skip link, then banner. Dialog: focus moves to the dialog, Tab and Shift+Tab are trapped, Escape closes without saving and restores focus, the rest of the page is inert while the dialog is open.
- Banner does not take focus on load; position fixed, so no layout shift; one 450 ms rise only when the visitor allows motion; no transition under prefers-reduced-motion.
- Position and size (owner's feedback, 31 Oct): bottom right on desktop, 384 px wide and 24 px from the edges, so it never covers the hero heading (bottom left); on phones a compact bottom sheet with the two buttons side by side.
- Shown once per visit (owner's choice): the banner appears on the first page a visitor opens. If they ignore it, it is not shown again on the following pages of that visit (a sessionStorage flag); nothing optional runs without a yes, the footer link opens the choices at any time, and the next visit asks again. A choice saved under an older version asks again straight away.
- Contrast: teal #043435 text and buttons on cream #FFFCF5 (about 12:1), white on teal (about 12:1), grey #4F5B5B body text on cream (about 7:1). Gold is not used on cream. Switch "off" state is an outlined teal track so the control itself meets 3:1.
- Hover (31 October, owner feedback): the solid teal buttons shift one shade lighter and the outlined buttons in the dialog take a faint teal tint; nothing else changes. This fixes a rule that made the outlined Accept all and Reject non-essential buttons turn into underlined links on hover. The owner tried an all-gold version and preferred this teal one.
- Tap targets: all banner and dialog controls at least 44 px tall (buttons 46 px, switches 60 x 44 px, close 44 x 44 px).
- No horizontal overflow at 390 px; dialog fits a 390 x 844 screen without inner scrolling.
- Cookie behaviour (over http://localhost because file:// cannot set cookies): nothing stored before a choice; after Accept the cookie holds `{"version":1,"analytics":true,"marketing":true,"timestamp":"..."}`, Path=/, SameSite=Lax, about 180 days, with a matching localStorage mirror; Reject stores both false; reset removes it; a stale version re-asks; _ga and _gcl_au are removed on reject. Secure is added when the page is served over https (production and staging both are).
- Size: consent.css 5,643 bytes + consent.js 7,744 bytes = 13,387 bytes (13.1 KiB) unminified; head snippet 3,099 characters; demo bundle 254,576 bytes (fonts and images included).

## 9. Assumptions (log)
1. The GA4 ID is added through the Head code slot today, not through Integrations. Step 0 covers both cases; the Integrations caveat is the reason the snippet cannot simply be appended.
2. The Google Ads conversion ID is AW-238397354910 (conversion tracking id found in the account). The conversion label is not known and is left as CONVERSION_LABEL.
3. Only one Google Ads purpose exists: conversion measurement. No remarketing, no enhanced conversions, no personalised advertising, so ad_personalization stays denied in every state. Changing this needs a policy change first.
4. The Cookie Policy durations: _ga and _ga_H8HS2R6NLS 13 months (set explicitly by cookie_expires), _gcl_au and _gcl_ls 90 days (as observed), roscap_consent 6 months, _cfuvid session.
5. _cfuvid is treated as essential (Cloudflare security on Webflow hosting). A scan of staging after installation should confirm no other cookies exist; add any that do to the table.
6. The cookie is host-only (no Domain attribute), so www.roscap.co.uk and roscap.co.uk do not share a choice. The site canonicalises to www, so this should not matter; if the apex serves pages, add `; Domain=roscap.co.uk` in the `cookie()` function.
7. The banner heading is an h2 placed before the page h1. This is valid HTML and passes axe; if a heading-order tool complains, change `<h2 class="rc-h">` to `<p class="rc-h">` and add `aria-labelledby`.
8. The demo page hero uses the static poster image rather than the homepage video to keep the bundle small; nothing in the banner depends on it.
9. Webflow prints Site settings head code before Page settings head code, so a page-level gtag snippet would run after the default; it is still removed in step 0 to avoid a duplicate config.
10. Dates in the dialog status use the visitor's browser locale rules for en-GB ("31 October 2026").

## 10. QA checklist (tick before production publish)
- [ ] Integrations GA ID removed; no other gtag.js loader anywhere (view source of Home, Contact, /contact-us-success, one blog post)
- [ ] site-head.html is the first script in Head code; AW ID confirmed
- [ ] site-footer.html in Footer code; on a first visit the banner shows on whichever page the visitor lands on (Home, inner page, blog post, legal page); ignored, it does not show again on the next pages of that visit; a new visit (new browser session) asks again
- [ ] Footer link present on desktop and mobile, opens the dialog, keyboard accessible
- [ ] Fresh incognito: only _cfuvid before a choice, and no request to any Google host until a choice is made
- [ ] Accept all sets _ga and roscap_consent; Reject sets roscap_consent only; reload keeps the choice without showing the banner
- [ ] Switching analytics off removes _ga cookies
- [ ] Keyboard pass (Tab order, trap, Escape, Space on switches) and screen reader pass (dialog name, switch states, "Preferences saved" announcement)
- [ ] 390 px: bottom sheet, no horizontal scroll, controls 44 px
- [ ] Reduced motion: no slide
- [ ] Policy text updated and dated; "(if enabled)" removed; cookie table matches a staging scan
- [ ] Google Ads: consent mode active in Diagnostics; GA4: Signals off, retention set, Consent settings receiving signals
- [ ] Test enquiry on staging only, conversion and generate_lead received with consent granted
