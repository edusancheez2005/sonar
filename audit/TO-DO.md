# To do (Edu): after the review of 31 October 2026

Everything that is left, in order. The message for Clemente only carries his three questions; everything else is here. Every design has a `HANDOFF.md` in its folder under `prototypes/` with the exact Webflow steps. Rule for all of it: Webflow staging first, check, then publish.

## 1. Send to Clemente (today)

1. The message: `audit/MESSAGE-FOR-CLEMENTE.md` (or the "Copy message" button in the review file).
2. Attach the four pictures in `audit/evidence/` (numbered in the message as Picture 1 to 4):
   - Picture 1 `mowgli-about-us.png`
   - Picture 2 `manchester-track-record-card.png`
   - Picture 3 `manchester-case-study.png`
   - Picture 4 `equity-our-services.png`
3. Attach the video `prototypes/roscap-before-after.mp4`. Keep the review file (`prototypes/roscap-website-review.html`) for when he wants to click through the pages; email often blocks large HTML attachments.

## 2. Legal: cookies and privacy (this week; the site is exposed until these are done)

4. **Cookie banner.** Install `prototypes/cookie-consent/` (site head and footer code, the "Cookie preferences" footer link) on staging, test it as its handoff says, publish. Until then Google Analytics runs before visitors agree.
5. **Cookie Policy.** Replace it with `prototypes/legal-pages/cookie-policy.html` on the same day as the banner: your choices, the list of the six cookies, categories that match the banner, the Cookie preferences link, a last-updated date.
6. **Privacy Policy.** Replace it with `prototypes/legal-pages/privacy-policy.html` ("Highlight what is new" shows every addition). What it adds:
   - [ ] registered office: F17 Node Cowork, 1 Enterprise Road, Roundswell, Barnstaple, England, EX31 3YB
   - [ ] ICO registration number ZB399363, and that Roscap is the data controller
   - [ ] a "Last updated" date
   - [ ] the email as a working link (today it points to "#")
   - [ ] Partner Program data (partners, the clients they introduce, commission details) and why it is used
   - [ ] the legitimate interests relied on, and the right to object
   - [ ] website analytics and Google Ads measurement, only with cookie consent
   - [ ] the named providers: Webflow, Cloudflare, Amazon Web Services, jsDelivr, GitHub, Microsoft 365 (email), Google
   - [ ] the safeguard for United States providers (Data Privacy Framework or the UK transfer agreement)
   - [ ] retention periods: enquiries 2 years; mandate and due diligence records 5 years; accounting 6 years; contracts and commissions 6 years; marketing until unsubscribe; analytics 14 months; cookie choice 6 months
   - [ ] what happens if someone does not provide data
   - [ ] no automated decisions with legal effects
   - [ ] how to opt out of marketing
   - [ ] the ICO's complaint page and phone number
   - [ ] a link to the Cookie Policy
   - [ ] proper headings (one H1, an H2 per section)
7. **Settings the policies describe** (they must be true on the day you publish):
   - [ ] Google Analytics 4 > Admin > Data retention: 14 months
   - [ ] Google Analytics 4 > Admin > Google Signals: off
   - [ ] Google Ads: confirm the conversion ID AW-238397354910 and its label (cookie banner handoff)
   - [ ] after the banner is on staging, check the cookies set before and after "Accept all" match the table
8. **ICO register.** The entry for ZB399363 still shows 114 Westbourne Rd, Huddersfield. Change it to the Barnstaple registered office in the ICO online account (if you don't have the login, ask whoever paid the fee).
9. **Other legal pages.** Terms of Use, Disclaimer and Accessibility Statement: change the "#" email links to mailto:info@roscap.co.uk. Accessibility Statement: it claims WCAG 2.1 AA, which the site does not meet yet; restate it as partially conformant with a short dated list of known issues (`audit/REPORT.md`, IL-03).

## 3. Quick fixes on the live site (minutes each, staging first)

10. **Partner Program form**: on a computer Submit does nothing; the blog post template has the same fault. Fix: `prototypes/partner-program/HANDOFF.md` section 5.
11. **Leftover test script**: delete the `https://jj59l3.csb.app/script.js` tag from the custom code of About Us and Insights.
12. **Our Services, Equity paragraph**: delete the second copy of the first sentence (`audit/evidence/equity-our-services.png`).

## 4. Market rates panel (yours)

13. Add validation and the failure alert to the feed this week (`audit/RATES-PANEL-PLAN.md` section 3): no more "400.00%".
14. Euribor: **keep it on the panel for now** (decided 31 October). Open point to revisit: EMMI says showing it on a commercial site needs a licence (about 1,000 euros a year); the free swap is the ECB deposit facility rate. See the plan, section 4.
15. Later: the decision calendar, so the chip can say "Held at the 17 Sep 2026 decision".

## 5. Designs to ship (staging first, then publish)

16. **Home**: market rates panel wording, selected transactions with "All transactions", What We Do motion, smoother Asset Classes / Sources of Capital switch. `prototypes/homepage-track-record-and-rates/`
17. **Our Services**: the capital stack builds when it comes into view; Asset Classes entrance; the two card sections arrive in turn with the gold Roscap R (owner's choice, option 3 of the motion demos). Our Process stays as live. `prototypes/our-services/`
18. **Track Record** (new): the light map that lights up country by country, on every screen size; the deals grid with the region filter. Upload the 22 WebP photos to the CMS items. `prototypes/track-record/`
19. **Partner Program**: Why cards, How it works timeline, moving partner logos, working form. `prototypes/partner-program/`
20. **Speak to Us**: the contacts under the heading, shorter FAQ, form fixes. `prototypes/speak-to-us/`
21. **Page not found** (new): the 404 page with the menu and footer. `prototypes/page-not-found/`

## 6. After Clemente answers

22. Mowgli's title on About Us (card or bio).
23. Manchester: the Track Record card and the case study (product and amount).
24. WhatsApp on Speak to Us: keep the link or remove it.

## 7. Nice to have

25. Insights articles: shorter lines on a computer (about 70 characters), an author and a date, and a preview picture when a link is shared on LinkedIn or WhatsApp.
