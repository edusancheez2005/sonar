# Page not found (404): handoff

Live today: Webflow's default utility page (a grey icon, "Page Not Found", one "Go Home" button, no menu and no footer), so a visitor who follows an old link lands on a page that does not look like Roscap and has nowhere to go but home. It already returns the right status (404).

Proposed: the site's menu and footer around the live call-to-action panel (teal with the gold waves), a large gold "404", the live wording ("Page Not Found", "The page you are looking for doesn’t exist or has been moved.", "Go Home"), and a second button to Speak to Us. A quiet entrance plays once (the panel settles and the lines rise in turn); none with reduced motion.

Files: `index.html`, `nf.css`, `img/` (the live CTA waves and circles), `screenshots/`.

## Install (Webflow)
1. Pages > Utility pages > 404. Delete the default `utility-page_component` block.
2. Add the Navbar component (the nav is locked green on this page, as on the legal pages: the live nav script already does this for pages outside its list).
3. Add a Section, then a Container, then a copy of the CTA block from any page (`subscribe-form-wrap is-about` with `subs-bg` and `subs-circle-bg`). Inside `ab-banner-head-wrap`: a Paragraph "404" (Boska italic, about 9.5rem, gold gradient text as `text-color-yellow`), a Heading H1 "Page Not Found", a Paragraph with the sentence, and the two buttons: "Go Home" (`button golden`, link /) and "Speak to Us" (an outline button, link /contact-us).
4. Add the Footer component.
5. Page settings: title "Page Not Found | Roscap". Publish to staging and visit any made-up address, for example /old-page.

## Checks run
1440 and 390: axe-core 0 violations, no sideways scrolling, one H1, buttons at least 44 px tall.
