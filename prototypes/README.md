# Roscap website prototypes

Static HTML prototypes for roscap.co.uk, built with the site's own colours, type and copy rules. Each folder holds the source (index.html plus its CSS and JS, referencing ../shared), a self-contained `*.bundle.html` you can open directly in a browser, screenshots at 390 px and 1440 px, and a `HANDOFF.md` for the Webflow developer (staging first, then publish).

| Prototype | Folder | Status |
|---|---|---|
| Speak to us (contact page) | `speak-to-us/` | Ready for review |
| Our Services capital stack (scroll animation) | `our-services-capital-stack/` | In progress |
| Home: Track Record deal list (concept F) and market-rates panel, build-ready | `homepage-track-record-and-rates/` | In progress |
| Partner Program | `partner-program/` | In progress |

`shared/` holds the brand tokens and base styles rebuilt from the live stylesheet (base.css), the shared nav and footer markup, fonts (Boska, Switzer), images taken from the owner's concept files, and the small shared script (nav, reveals, mock forms). Forms in the prototypes are switched off; nothing is sent anywhere.

Rules every prototype follows: no copy that states or implies FCA authorisation; British English, digits for numbers, no em dashes, no exclamation marks; lighter than the live page it replaces; prefers-reduced-motion respected; no scroll-jacking; CSS scroll-driven animation first, GSAP only where needed, no Lenis.
