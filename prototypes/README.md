# Roscap website prototypes

**Start here: `roscap-before-after.mp4`** (an 86-second video: the live site and the proposed version side by side, page by page) **and `roscap-website-review.html`** is one self-contained file with every redesigned page (Home, Our Services, Partner Program, Speak to Us), the cookie banner on each page, a desktop/phone switch, and a "Changes and message" tab with the full message for Clemente and a copy button. Open it in any browser.

Static HTML prototypes for roscap.co.uk, built with the site's own colours, type and copy rules. Each folder holds the source (index.html plus its CSS and JS, referencing ../shared), a self-contained `*.bundle.html` you can open directly in a browser, screenshots at 390 px and 1440 px, and a `HANDOFF.md` for the Webflow developer (staging first, then publish).

| Prototype | Folder | Status |
|---|---|---|
| Speak to us (contact page) | `speak-to-us/` | Revised after owner review: the live page; the contact line under the heading keeps the live style and shows email, phone, WhatsApp and Instagram; a smaller FAQ |
| Our Services | `our-services/` | Rebuilt after owner review: the live page section by section; the capital stack is the live graphic in real text and builds once, bottom up; Asset Classes as live with a staggered entrance; no narration |
| Home: market-rates panel, Track Record deal list (concept F) with a sixth "All transactions" row and a mosaic of all 22 deals; Who We Are, What We Do and the contact block as live, with a smoother Asset Classes / Sources of Capital switch | `homepage-track-record-and-rates/` | Verified (0 errors, axe 0 once settled, keyboard and tap, lazy tiles, hero plays) |
| Partner Program | `partner-program/` | Revised twice after owner review: the live page and live wording, tighter Why cards, the How it works timeline with the six live step titles word for word and one short line under each, partner logos that glide slowly (pause on hover, keyboard focus or tap) |
| Cookie consent banner and preferences (site-wide) | `cookie-consent/` | Built and verified (72 checks plus 9 for the once-per-visit behaviour); teal, bottom right, shown on the first page of a visit only; basic consent mode; policy wording for compliance review |

`shared/` holds the brand tokens and base styles rebuilt from the live stylesheet (base.css), the shared nav and footer markup, fonts (Boska, Switzer), images taken from the owner's concept files, and the small shared script (nav, reveals, mock forms). Forms in the prototypes are switched off; nothing is sent anywhere.

Rules every prototype follows: no copy that states or implies FCA authorisation; British English, digits for numbers, no em dashes, no exclamation marks; lighter than the live page it replaces; prefers-reduced-motion respected; no scroll-jacking; CSS scroll-driven animation first, GSAP only where needed, no Lenis.

QA and verification reports are in `../audit/qa/` (the `-v1-superseded` files cover the first Partner Program and Speak to us versions, replaced after the owner's review). Items marked CONFIRM in a prototype or its handoff need Clemente's sign-off before publishing. Wording on the live site is kept exactly as Roscap wrote it (owner's decision, 31 October).
