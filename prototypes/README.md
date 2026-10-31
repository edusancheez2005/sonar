# Roscap website prototypes

Static HTML prototypes for roscap.co.uk, built with the site's own colours, type and copy rules. Each folder holds the source (index.html plus its CSS and JS, referencing ../shared), a self-contained `*.bundle.html` you can open directly in a browser, screenshots at 390 px and 1440 px, and a `HANDOFF.md` for the Webflow developer (staging first, then publish).

| Prototype | Folder | Status |
|---|---|---|
| Speak to us (contact page) | `speak-to-us/` | Revised after owner review: the live page; the contact line under the heading keeps the live style and shows email, phone, WhatsApp and Instagram; a smaller FAQ |
| Our Services capital stack (scroll animation) | `our-services-capital-stack/` | QA passed (ship, 8 of 10) |
| Home: Track Record deal list (concept F) and market-rates panel, build-ready | `homepage-track-record-and-rates/` | QA passed (ship, 9 of 10) |
| Partner Program | `partner-program/` | Revised twice after owner review: the live page and live wording, tighter Why cards, the How it works timeline with the six live steps word for word, partner logos that glide slowly (pause on hover, keyboard focus or tap) |
| Cookie consent banner and preferences (site-wide) | `cookie-consent/` | Built and verified (72 checks); the site's gold buttons with a subtle darker hover; basic consent mode; policy wording for compliance review |

`shared/` holds the brand tokens and base styles rebuilt from the live stylesheet (base.css), the shared nav and footer markup, fonts (Boska, Switzer), images taken from the owner's concept files, and the small shared script (nav, reveals, mock forms). Forms in the prototypes are switched off; nothing is sent anywhere.

Rules every prototype follows: no copy that states or implies FCA authorisation; British English, digits for numbers, no em dashes, no exclamation marks; lighter than the live page it replaces; prefers-reduced-motion respected; no scroll-jacking; CSS scroll-driven animation first, GSAP only where needed, no Lenis.

QA and verification reports are in `../audit/qa/` (the `-v1-superseded` files cover the first Partner Program and Speak to us versions, replaced after the owner's review). Items marked CONFIRM in a prototype or its handoff need Clemente's sign-off before publishing. Wording on the live site is kept exactly as Roscap wrote it (owner's decision, 31 October).
