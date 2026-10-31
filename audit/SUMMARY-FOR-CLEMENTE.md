# Roscap website review: the one-page summary

Date: 31 October 2026. Prepared by Edu with Claude. Nothing on the live site has been changed. Everything below is either a finding with evidence or a prototype you can open in a browser.

## The short version

The site looks and feels right. The design is calm, consistent and premium, and nothing on it claims that Roscap is FCA authorised. The problems are underneath: the pages are far heavier than they need to be, a handful of things are broken for visitors, the legal pages describe a cookie banner that does not exist, and a few numbers and phrases need your sign-off. All of it is fixable in Webflow without touching the design.

## Five things to fix first

1. The Partner Program form cannot be sent on a desktop or tablet. The visible Submit button depends on a script that page never loads. The same pattern is on every blog post. Fix: show the real button. Ten minutes of work.
2. There is no cookie banner, but Google Analytics starts measuring the moment anyone arrives, and the Cookie Policy says consent is collected "via our cookie banner". This is the item with legal exposure under UK rules and it also blocks the Google Ads restart. Fix: the in-house banner you approved in September, plus matching wording in the Cookie and Privacy policies.
3. The homepage downloads two videos, 8 MB in total, on every phone, and until the video appears the headline is white on cream and invisible. Fix: one compressed video with a still image behind it, no autoplay on phones. The Track Record page has the same problem with a 6.5 MB map and 22 oversized photos.
4. On the contact page the phone number is hidden by a styling class, the "Subject" box is typed as a telephone field (phones show a number keypad), and no field has a label. Google Ads will land on this page. Fix: three small changes; the Speak to Us prototype shows the result.
5. On the About Us page, opening a team member's profile with the keyboard traps the visitor; Escape does nothing and there is no labelled close button. Fix: standard dialog behaviour.

## Decisions only you can make

- Partner Program claims: "Join hundreds of current partners" (8 logos are shown) and "commissions in perpetuity". Keep, reword or remove. The brochure also quotes "Interest Rate: Starting from 4% p.a." and "Loan-to-Value up to 90%", which belong in a partner agreement rather than marketing.
- Contact page promises: "bridging loans in as little as 5 to 10 working days" and "6 to 8 weeks" for development finance. Keep only if you are happy to be held to them.
- Euribor on the homepage: the organisation that publishes Euribor says showing it on a commercial website needs a licence. Options: take the licence (about 1,000 euros a year at the last published price), swap that card for the ECB rate, or link out.
- Wording that reads like a lender or investor rather than an intermediary: "private investment firm", "co-investing", "our portfolio", "projects funded", "we fund", "underwrite", "apply for finance through Roscap". None says FCA authorised, but a regulatory adviser should look at the cluster.
- Two small facts: Mowgli is "Head of Southern Europe" in one place and "Head of Western Europe" in another; the Manchester case study (£2.665m bridging loan) does not match the Manchester card on the Track Record page (£2.7m commercial mortgage).

## What you approved, and where it stands

- Market rates panel (odometer) and the Track Record "deal list": both are good. The build-ready version fixes the things that would have gone wrong in production: the "Held" labels and dates that the live data cannot actually supply, a phone-layout accessibility error, a wave animation that was burning a third of a processor core, and a missing "data unavailable" state. One incident is worth knowing about: on 21 October the live rates widget showed "400.00%" for several hours after a data outage. The new version checks every number before showing it.
- Our Services capital stack: now builds layer by layer as you scroll, in the same order as today's graphic, with no libraries and a plain static version for anyone who prefers reduced motion. Open `prototypes/our-services-capital-stack/our-services-capital-stack.bundle.html`.
- Partner Program and Speak to Us: redesigned prototypes are ready to open in the same way. Anything we could not verify is marked "Confirm" rather than asserted.

## What happens next

Shikhar receives a handoff note for each prototype (Webflow structure, code to paste, a test checklist). Everything goes to the staging site first. Google Ads should not restart until the cookie banner and the contact-page fixes are live.

The full report with evidence for every finding is `audit/REPORT.md`.
