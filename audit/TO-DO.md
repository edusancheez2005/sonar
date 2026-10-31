# To do (Edu)

Working list after the review of 31 October 2026. The message for Clemente (`MESSAGE-FOR-CLEMENTE.md`) only carries the questions he has to answer; everything else is here.

## Fix

1. **Cookie banner** (legal exposure under UK GDPR and PECR). Install `prototypes/cookie-consent/` as its handoff describes, with the new Cookie Policy wording. Google Analytics must not run before a visitor says yes.
2. **Partner Program form.** On a computer the Submit button does nothing; the blog post template has the same fault. Fix: `prototypes/partner-program/HANDOFF.md` section 5.
3. **Leftover test script.** About Us and Insights load `https://jj59l3.csb.app/script.js` (a CodeSandbox preview). Delete the script tag from both pages' custom code.
4. **Privacy Policy.** Add the facts and wording in `PRIVACY-POLICY-ADDITIONS.md`; update the address on the ICO register; fix the "#" email links on the legal pages.
5. **Market rates.** Follow `RATES-PANEL-PLAN.md`: add validation and an alert to the feed this week; Euribor per Clemente's answer; decision dates later.
6. **Our Services, Equity paragraph.** The first sentence appears twice (screenshot: `evidence/equity-our-services.png`). Delete the second copy so it reads: "We raise and structure equity for developers, sponsors, and family offices seeking joint ventures, preferred equity, or direct co-investment."
7. **Track Record map.** Three countries say "1 DEALS"; make it "1 deal".

## After Clemente answers

8. Mowgli's title on About Us (`evidence/mowgli-about-us.png`).
9. The Manchester card on Track Record and the case study (`evidence/manchester-track-record-card.png`, `evidence/manchester-case-study.png`).
10. The UK figure on the Track Record map (`evidence/track-record-map-52-deals.png`).
11. WhatsApp on Speak to Us (keep or remove the WhatsApp link).

## Designs to ship (staging first, then publish)

12. Home: market rates panel, the selected transactions list with "All transactions", What We Do motion and the smoother Asset Classes / Sources of Capital switch.
13. Our Services: the capital stack builds when it comes into view; Asset Classes entrance.
14. Partner Program: Why cards, How it works timeline, moving partner logos, working form.
15. Speak to Us: the four contacts under the heading (phone number visible), shorter FAQ, form fixes.

Each has a `HANDOFF.md` in its folder under `prototypes/`.

## Nice to have

16. Insights articles: shorter lines on a computer (about 70 characters), an author and a date, and a preview picture when a link is shared on LinkedIn or WhatsApp.
17. A branded "page not found" page with the menu.
