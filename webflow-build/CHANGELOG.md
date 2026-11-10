# Webflow build: change log and undo steps

Site: Roscap (`693e84a885fe6122f0427916`). Staging: https://roscap-site.webflow.io. Live: https://www.roscap.co.uk.

## How a mistake is undone

1. **The switch (whole redesign).** The site head starts with a small script (`rc-switch.html`). On the staging address it shows the new design, and on www.roscap.co.uk it shows today's design until `LIVE` is set to `true`. Every new element carries `data-rc="new"`, every element it replaces carries `data-rc="old"`, and each page's new CSS and script only switch on in the new view.
   - Compare on staging: add `?rc=old` to any address for today's design, or `?rc=new` for the new one (it lasts for that browser tab).
   - Go-live: set `LIVE=true` in the site head and publish.
   - Roll back after go-live: set `LIVE=false` and publish. The old design returns at once, because nothing old has been deleted.
2. **Each change below** lists its exact undo. The text, attributes and code as they were are saved in the repository.
3. **Snapshots.** `webflow-snapshots/2026-11-10-before-build/` holds every published page from the live site and staging as it was before any change: the HTML, the stylesheet, the site head and footer code word for word, and a manifest with checksums. Take a new snapshot with `python3 -I webflow-snapshots/snapshot.py <folder>` (it needs `urls.txt` in that folder).
4. **Webflow backup.** Site settings > Backups > Create backup. This is the owner's step; the connector cannot make backups.
5. **Publishing.** Everything goes to the staging address only (`publishToWebflowSubdomain: true`, no custom domains). The live domains get nothing until the owner approves.

## Changes

### 1. Site head: the switch (10 Nov 2026)
- Added `rc-switch.html` at the top of Site settings > Custom code > Head. The Google tag below it is unchanged.
- Later the same day the address test was widened from `webflow.io` to `webflow.io` or `webflow.com`, so the Designer preview (with "Enable custom code" on) shows the new design, as staging does. www.roscap.co.uk is not affected.
- Undo: set the site head back to `webflow-snapshots/2026-11-10-before-build/custom-code/site-head.html`.

### 2. Our Services (`69478f02f85886b991518a84`) (10 Nov 2026)
Source: `prototypes/our-services/` (capital stack, Asset Classes entrance, service cards with the gold R, Equity fix).

| What | Element | Change | Undo |
|---|---|---|---|
| Page head code | | Was empty. Now `our-services/page-head.html`: the handoff CSS in `<style id="rc-css-services" media="not all">`, switched on in the new view only | Clear the page head code |
| Page footer code | | Was empty. Now `our-services/page-footer.html`: the handoff script, run in the new view only, plus a line that adds each `data-rc-class` value as a class | Clear the page footer code |
| Capital stack image `img.wwa-image` | `28cfabf6-7237-b7a3-466e-911601ffa30e` | Attribute `data-rc="old"` | Remove the attribute |
| New block after that image | `e3fdecfc-f4cf-5353-e81f-3882a3d511a7` (`data-rc="new"`), Code Embed `56832e24-54f2-2a4a-6f51-830413310d2a` | The capital stack as real text (`prototypes/our-services/webflow/capital-stack-embed.html`) | Delete the block |
| New block before "Roscap's experience covers:" | `98b004d7-bab4-366d-ab5a-fa6e174c1396` (`data-rc="new"`), Code Embed `380fbff2-cd14-2745-20d9-71df8fa8c1c2` | The gold R (`signature-r-embed.html`) | Delete the block |
| The two card sections | `30c5cfbb-7ba7-c1f4-3633-c8467952ba6c`, `a135bd4b-356e-f0c8-d849-6fa4b36915c9` | `data-rc-class="svc-cards"` | Remove the attribute |
| Their headings (H2) | `fad9c8fd-05a2-562a-a3e4-6e332fb301e6`, `a135bd4b-356e-f0c8-d849-6fa4b36915cc` | `data-rc-class="cover-h"` | Remove the attribute |
| Their closing lines (H3) | `9b7f8b53-6725-ecf8-642b-9bf122163c9d`, `a135bd4b-356e-f0c8-d849-6fa4b36915ed` | `data-rc-class="cover-end"` | Remove the attribute |
| Equity paragraph | `416d5703-eed6-663f-1e74-91ab39eac65a` | First sentence printed once. This approved correction is not behind the switch | Set the text back to the old text below |

Old Equity text: "We raise and structure equity for developers, sponsors, and family offices seeking joint ventures, preferred equity, or direct co-investment.We raise and structure equity for developers, sponsors, and family offices seeking joint venture, preferred equity, or direct co-investment."

How this differs from the handoff, and why: the handoff adds the classes `svc-cards`, `cover-h` and `cover-end` in the Designer and replaces the image. Here the classes are set as `data-rc-class` attributes, which the new-view script turns into classes, and the image is kept and hidden in the new view. That way the live classes, interactions and image stay untouched until go-live. The Asset Classes "slide in" interaction is still there, held still in the new view by the page CSS (`!important`), as the handoff's CSS already does. Removing it in the Interactions panel is part of the clean-up after go-live.

Checked on staging (Playwright, 1440 and 390 wide). New view: the stack builds, the R draws, all 7 cards come in, the Equity sentence appears once, nothing overflows sideways. Old view (`?rc=old`): page CSS off, image shown, no R and no new classes. Live site: unchanged (17 Oct build).

### 3. Page not found (`693e84aa85fe6122f0427974`) (10 Nov 2026)
Source: `prototypes/page-not-found/` (the menu, the site's call-to-action panel with "404" and the live wording, two buttons, the footer).

| What | Element | Change | Undo |
|---|---|---|---|
| Default block `div.utility-page_component` | `60d3fe8d16a07670a7e520bfaN` | Attribute `data-rc="old"` | Remove the attribute |
| New wrapper | `957e4eed-67b4-2bdd-4f11-8d619fb5601e` (`data-rc="new"`) | Holds Global Styles `90d5b75b-95eb-a3c3-b8cb-967ad5efb09a`, the menu (NAVV) `a37fab3a-3918-7f58-36c0-b9a2b4e51b3a`, a copy of the call-to-action section `aa0a71a0-54d8-3295-b453-d4acebfd9dd8` (`data-nf="section"`, unlinked on this page only; the component itself is unchanged) and the Footer `63d73d7b-0d10-e500-eb95-634883ed1f71` | Delete the wrapper |
| Inside the panel | "404" `a0a33bae-4c50-9e9c-312f-f435b8dc5741` (`data-nf="code"`, `aria-hidden`), heading `3cf15658-d419-c353-e17c-7af645ced468` "Page Not Found", sentence `88a07560-c811-a940-1cad-c7dfa22d3967`, buttons `84e5ed78-0160-69d0-e835-52d007822c10`: Go Home (Home) and Speak to Us (Contact Us, `data-nf="ghost"`) | The live wording | Goes with the wrapper |
| Page head code | | Was empty. Now `404/page-head.html`: `<style id="rc-css-404" media="not all">`, switched on in the new view only | Clear the page head code |
| SEO title | | "Not Found" became "Page Not Found \| Roscap". Not behind the switch | Set it back to "Not Found" |

How this differs from the handoff: the handoff deletes the default block; here it is kept and hidden in the new view. The outline style of "Speak to Us" comes from the page CSS (`data-nf="ghost"`), not a new class.

Checked on staging (Playwright, 1440 and 390 wide). The address still answers with HTTP 404. New view: menu, "404", heading, sentence, both buttons (to `/` and `/contact-us`), footer, nothing overflows; the panel starts below the menu bar (133 px from the top at 1440, 122 px at 390). The first publish had the panel under the bar, because the live rule `.section.ctasection{padding-top:0}` outranked the page rule; the page rule now names those classes and wins. Old view: the default block, page CSS off. Live site: unchanged.

### 4. Speak to Us (`694554806631ee41c901c01a`) (10 Nov 2026)
Source: `prototypes/speak-to-us/` (HANDOFF.md sections 2 to 5).

| What | Element | Change | Undo |
|---|---|---|---|
| Contact line `div.c-social-wrap` | `9fc0899f-113e-b6e9-897e-1ae465850469` | Attribute `data-rc="old"` | Remove the attribute |
| New contact block after it | `2a8b0d69-7877-af04-7b98-8d93d1053575` (`data-rc="new"`), Code Embed `b29a7d7b-f1cb-806a-eaf2-baf28326fea4` | `speak-to-us/contacts-embed.html`: email, phone (now shown) and Instagram, two by two. WhatsApp is left out until Clemente confirms the number; `speak-to-us/contacts-whatsapp-item.html` is the line to add | Delete the block |
| FAQ dropdowns `div.faqs-content-wrap` | `e8b98bfe-13ab-a7ed-83e6-cf568ba0d48e` | Attribute `data-rc="old"` | Remove the attribute |
| New FAQ block after it | `ddff09f2-493a-0441-98b6-8dcc3e075af6` (`data-rc="new"`), Code Embed `02ca1044-811e-a432-0c77-0c9677b34347` | `speak-to-us/faq-embed.html`: the compact accordion, live copy word for word | Delete the block |
| Page head code | | Was the Finsweet Attributes tag only (`speak-to-us/page-head.before.html`). Now `speak-to-us/page-head.html`: the same tag, then `<style id="rc-css-speak" media="not all">` (new view only) and the FAQPage JSON-LD | Set it back to `page-head.before.html` |
| Page footer code | | Was empty. Now `speak-to-us/page-footer.html`, run in the new view only: hidden labels on the five fields, Subject as plain text, autocomplete on Name, Email and Phone, the honeypot field and its guard, one FAQ answer open at a time | Clear the page footer code |

The FAQPage JSON-LD is not behind the switch: it holds the same five questions and answers the old dropdowns show, so it is right in both views.

How this differs from the handoff: the handoff edits the live form in the Designer (labels, Subject type, autocomplete, honeypot). Here the form is untouched and the new-view script makes the same changes in the browser, so the switch also turns them off. After go-live they can be made in the Designer and the script lines dropped.

Checked on staging (Playwright, 1440 and 390 wide). New view: the first contact row sits where the live line is (y 598 at 1440, y 290 at 390); the hero is 900 px at 1440 as live, 925 px at 390 (live 873: the second contact row); 5 FAQ questions, identical to the live dropdowns, one open at a time; the JSON-LD matches the visible FAQ; 5 hidden labels, Subject is `type="text"`, autocomplete name, email and tel; the honeypot is off screen and its guard cancels a submit when it is filled (tested with a synthetic event while every outgoing request was blocked: nothing was sent). Old view: the live line, the dropdowns and the form as live. Live site: unchanged.

Still to do on this page before go-live (owner): send one test enquiry on staging and check it reaches /contact-us-success, appears in Webflow Forms and sends the notification email; confirm WhatsApp; confirm the FAQ timescales still hold.

## Publishes

| When (UTC) | Where | What |
|---|---|---|
| 10 Nov 2026 | Staging only | The switch (check that it works) |
| 10 Nov 2026 | Staging only | Our Services pilot |
| 10 Nov 2026 | Staging only | Page not found |
| 10 Nov 2026 | Staging only | Page not found spacing fix, Speak to Us |

The live domains were last published on 17 Oct 2026, before this work started.

## After go-live: clean-up (later, with a fresh backup)
- Delete the elements marked `data-rc="old"`, and remove the `data-rc` attributes from the new ones.
- Replace each `data-rc-class` with a real class, then drop the switch checks from the page code.
- Speak to Us: make the form fixes in the Designer (labels, Subject type, autocomplete, honeypot), then drop those lines from the page footer script.
- Remove the replaced interactions in the Interactions panel.
- Remove the switch from the site head.
