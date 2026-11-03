# Webflow build plan: the approved designs

Approved by Clemente and Suleman on 3 November 2026. This is the order and the time for building everything in Webflow. The steps for each page are in its `prototypes/<page>/HANDOFF.md`, and the code to paste is in its `webflow/` folder.

**Total: about 19 to 24 hours in Webflow**, plus 1.5 to 2 hours for the rates feed, which lives outside Webflow. That works out at three long days or four normal ones. The times include testing on staging. They assume the handoff steps work first time, so keep an hour spare.

## Ground rules

- **Staging first.** Publish to roscap-site.webflow.io only, run the page's checklist, then publish to the live domain.
- **Webflow publishes the whole site at once, not one page.** Finish a page completely before you stop for the day, so a publish (yours or anyone's) never ships half-built work.
- **Agree a no-publish window** with Clemente and Suleman (and whoever posts Insights articles) for the days you are building.
- **Never press Publish on a single CMS item.** It goes straight to the live site. Save items and publish the site to staging instead.
- **Send test form entries on staging only,** never on the live site.
- **Make a backup first:** Site settings > Backups > Create backup.

## Time at a glance

| # | Block | Main work | Time |
|---|---|---|---|
| 0 | Before you start | Backup, no-publish window, Google Ads conversion label, files open | 20 min |
| 1 | Cookies and legal | Old Google tags out, banner code in, footer link, both policies, GA4 settings, other legal pages, staging tests, ICO register | 3.5 to 4 h |
| 2 | Quick fixes | Leftover test script (About Us, Insights) | 10 min |
| 3 | Our Services | Capital stack embed, Equity sentence, Asset Classes entrance, gold R and the card sections | 1 to 1.5 h |
| 4 | Page not found | New 404 utility page with menu, panel and footer | 30 to 45 min |
| 5 | Speak to Us | Four contacts, FAQ accordion, form fixes | 1.5 to 2 h |
| 6 | Track Record | New map, one deals grid with the filter, 22 WebP photos into the CMS | 2.5 to 3 h |
| 7 | Partner Program | Why card spacing, the new How it works section, logo marquee, working form | 4 to 5 h |
| 8 | Home | Rates panel, CMS fields and the deal list with row 06 and the mosaic, What We Do | 5 to 6 h |
| 9 | Final publish and live checks | Publish, check the live pages, PageSpeed | 45 min to 1 h |
| | **Total in Webflow** | | **about 19 to 24 h** |
| 10 | Rates feed (roscap-rates, not Webflow) | Validation and the failure alert | 1.5 to 2 h |

Not in the total: Clemente's three answers, if they are still open (Mowgli's title, the Manchester deal, WhatsApp), about 20 minutes once he replies. The nav needs nothing: the prototypes copy the live one.

## Suggested schedule

| Day | Blocks | Time | Publish at the end |
|---|---|---|---|
| Saturday | 0, 1, 2, 3, 4 | 6 to 7 h | Yes: the cookie banner and both policies go live together |
| Sunday | 5, 6, and 10 if there is time | 4 to 5 h (5.5 to 7 h with the feed) | Yes |
| Monday | 7 | 4 to 5 h | Yes |
| Tuesday | 8, 9 | 6 to 7 h | Yes, then the live checks |

The cookie banner goes first because the site is exposed until it is live: Google Analytics runs before visitors agree. Home goes last because it is the biggest block and touches the CMS.

## The blocks

### 0. Before you start (20 min)
- Backup (Site settings > Backups).
- Get the Google Ads conversion label for the /contact-us-success snippet (Google Ads > Goals > Conversions), and confirm the ID AW-238397354910.
- Open the repo folder: `prototypes/<page>/HANDOFF.md` and `prototypes/<page>/webflow/`.

### 1. Cookies and legal (3.5 to 4 h)
Steps: `prototypes/cookie-consent/HANDOFF.md` section 3 and `prototypes/legal-pages/HANDOFF.md` section 4.
- Remove the Google Analytics ID from Integrations and the old gtag snippet from the site head. Check the custom code of all 25 pages for a second loader (30 min).
- Paste `site-head.html` at the top of the site head and `site-footer.html` in the site footer. Add the "Cookie preferences" link to the footer Symbol and the consent-aware conversion snippet on /contact-us-success (30 min).
- Privacy Policy and Cookie Policy: paste the text into the Rich Text, add the cookie table as an embed and the "Cookie preferences" links, fill in the dates (1 h).
- GA4: data retention 14 months, Google Signals off (15 min).
- Terms of Use, Disclaimer, Accessibility Statement: make the "#" email links mailto links, and restate the accessibility claim as partially conformant (30 min).
- Staging tests: the 11 checks in the cookie handoff (section 4), in incognito, with Tag Assistant, and one test enquiry on staging (1 h).
- ICO register: change the address on ZB399363 to the Barnstaple registered office (15 min, outside Webflow).

### 2. Quick fixes (10 min)
- Delete the `https://jj59l3.csb.app/script.js` tag from the custom code of About Us and Insights.
- The repeated Equity sentence is fixed in block 3, and the Partner Program form in block 7.

### 3. Our Services (1 to 1.5 h)
Steps: `prototypes/our-services/HANDOFF.md` sections 1 to 5.
- Replace the capital stack image with `capital-stack-embed.html`. Paste `page-head.html` and `page-footer.html`.
- Delete the second copy of the Equity sentence.
- Remove the slide-in interaction from the Asset Classes icons (keep their hover).
- Add `signature-r-embed.html` above "Roscap's experience covers". Add the classes `svc-cards`, `cover-h` and `cover-end` to the two card sections.
- Check at 1440, 1024, 768 and 390, and with reduced motion.

### 4. Page not found (30 to 45 min)
Steps: `prototypes/page-not-found/HANDOFF.md`.
- Utility pages > 404: delete the default block. Add the Navbar component, a copy of the CTA panel with "404", the live wording and two buttons, and the Footer component. Set the page title.
- Check by visiting a made-up address on staging.

### 5. Speak to Us (1.5 to 2 h)
Steps: `prototypes/speak-to-us/HANDOFF.md` sections 2 to 7.
- Show the phone number, and add WhatsApp only if Clemente confirmed the number is on WhatsApp. Add the `is-four` class and the CSS.
- Replace the five FAQ dropdowns with the accordion embed. Paste the CSS, the footer script and the FAQ JSON-LD.
- Form: hidden labels for the five fields, Subject as plain text, autocomplete, the honeypot field.
- Send a test enquiry on staging and check the redirect to /contact-us-success.

### 6. Track Record (2.5 to 3 h)
Steps: `prototypes/track-record/HANDOFF.md` sections 1 and 2.
- Map: upload `footprint-map.svg`, replace the old map embed and the phone image with `footprint-map-embed.html`, and delete the old map styles from the page head (30 min).
- Deals: replace the two sliders with one Collection List (`deal-grid`) and the two small embeds. Rename the card classes as listed, paste the page head and footer code, and delete the Swiper set-up (1 h).
- Upload the 22 WebP photos to the CMS items, replacing the PNGs (30 to 45 min).
- Run the staging checklist (section 4) (30 min).

### 7. Partner Program (4 to 5 h)
Steps: `prototypes/partner-program/HANDOFF.md` sections 2 to 7.
- Why cards: six spacing values on three classes (10 min).
- How it works: remove the carousel, the hidden timeline section and the Swiper code. Build the new section from the structure in 3.2: the sticky column, the six steps with their short lines and card embeds, then move the brochure line and pop-up into it. Paste the code from 3.4 and upload the wave texture (2 to 2.5 h, the biggest Designer job).
- Our Partners: add the marquee classes and attributes, duplicate the logo grid, and set the alt texts (30 to 45 min).
- Contact form: the real Submit button, rename the brochure form and its field ids, hidden labels, autocomplete (30 min).
- Run the staging checklist (section 7), including a test enquiry and Safari (45 min to 1 h).

### 8. Home (5 to 6 h)
Steps: `prototypes/homepage-track-record-and-rates/HANDOFF.md` sections 1 to 3 and 7.
- Rates panel: replace the three cards with the new structure (`rates-panel.markup.html`), set the ids and placeholders, and remove the three fade-in interactions (1 h).
- CMS: add the new fields (Featured, Sort order, Terms line, Photo alt text, Mosaic tile). Fill in the five featured deals and the alt text and mosaic tile for all 22 (1 to 1.25 h).
- Deal list: the Collection List with the bound attributes, the pane, row 06 "All transactions" and the mosaic list (1.25 to 1.5 h).
- What We Do: wrap the photograph in `wwd-media`, remove its two fade-ins, type 60, 120 and 25 into the counters, and replace the Swiper set-up with `what-we-do-slider.html` (30 min).
- Paste `home-head.html` and `home-footer.html`, replacing the old rates script. Stay under the 50,000 character limit: about 38,300 in the footer (15 min).
- Run the staging checklist (section 7): the rates states, the deal list with keyboard and on a phone, the mosaic, the What We Do switch, reduced motion (1 h).

### 9. Final publish and live checks (45 min to 1 h)
- Publish to the live domain. In a fresh incognito window: the cookie banner on the first visit, no Google requests before a choice, every changed page loads without console errors, the 404 on a made-up address.
- Do not send test enquiries on the live site.
- PageSpeed Insights on Home and Track Record, to confirm the weight went down.

### 10. Rates feed (1.5 to 2 h, roscap-rates repository)
Steps: `audit/RATES-PANEL-PLAN.md` section 3, items 3 and 4.
- Validation before publishing (range, numbers only, dates, size of change), keeping the last good value and marking it stale.
- The GitHub Action fails loudly when a value is rejected, so GitHub sends an email.
- Later, when convenient: the decision calendar ("Held at the 17 Sep 2026 decision") and the Euribor licence point.
