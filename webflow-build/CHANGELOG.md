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

### 5. Track Record (`6947c1c57991169cd74afd2c`) (10 Nov 2026)
Source: `prototypes/track-record/` (the footprint map and the Selected Transactions grid).

| What | Element | Change | Undo |
|---|---|---|---|
| Old map `div.map-container` | `26260c28-9616-6014-9a65-98b3a177faea` | Attribute `data-rc="old"` | Remove the attribute |
| Old map embed `svg-mapp` | `34c52d5a-7822-77e3-bbbd-b95dca5b77cf` | One condition added to the first line of its script, so it stops at once in the new view and the 6.66 MB map is not fetched there (`track-record/old-map-embed.html`). In the old view it runs as before | Paste `track-record/old-map-embed.before.html` back |
| New map block | `506d112c-b072-f2bd-2b31-0c4119e91ed2` (class `container`, `data-rc="new"`), Code Embed `3d535fa3-3afa-b484-ecf8-b8d8f0f3ba0f` | `track-record/map-embed.html`; its script runs in the new view only. The map file is the asset `6af3427ce4b4f0db826ddc30_footprint-map.svg` (166 KB) | Delete the block |
| Map section | `d6cdb4bb-ee3b-295e-b3e6-ee2ce276a29e` | `data-rc-class="fp-section"` | Remove the attribute |
| Slider 1, with its arrows and dots | `bbdc237e-c1a8-48e8-2410-20d11be599a7` | Attribute `data-rc="old"` | Remove the attribute |
| Slider 2, with its arrows and dots | `b21d550b-3ff6-57a0-536c-8e3e85dfcaf3` | Attribute `data-rc="old"` | Remove the attribute |
| New deals block | `23234589-ba14-a97e-389e-070be768ca2e` (class `container`, `data-rc="new"`), Code Embed `36697734-1299-394b-05be-6c4a8a484ae0` | `track-record/deals-embed.html`: the filter, an empty grid, the screen-reader status and the button | Delete the block |
| Deals section | `ccc15f3f-e44e-43bc-8036-b9c97a6a68dd` | `data-rc-class="deals-section"` | Remove the attribute |
| Page head code | | Was `track-record/page-head.before.html` (the Swiper stylesheet and the old map styles). Now `track-record/page-head.html`: the same, with the `svg path` rule limited to the old view by `:where()`, which keeps its specificity, then `<style id="rc-css-track" media="not all">` | Set it back to `page-head.before.html` |
| Page footer code | | Was `track-record/page-footer.before.html` (Swiper and the two sliders). Now `track-record/page-footer.html`: the new-view script first (it moves the 22 rendered cards into the grid, gives them the WebP photos and runs the filter and the button), then the live code unchanged | Set it back to `page-footer.before.html` |
| 22 deal photos as WebP | the assets listed in `track-record/deal-photos.json` | Uploaded to Assets and used by the new-view script only. The CMS items and their photos are unchanged | Delete the 22 assets, but only once nothing uses them |

How this differs from the handoff, and why: the handoff rebuilds the deals as one new Collection List with new classes, replaces the CMS photos with the WebPs and deletes the old map styles and Swiper. Here the CMS, both Collection Lists and their classes stay as they are, so the old view and a rollback are exact: in the new view the script moves the 22 cards the CMS has already rendered into the grid, in CMS order, before Swiper starts (on hidden sliders Swiper would otherwise load every photo), and points their photos at WebP copies. A deal added later without a WebP keeps its CMS photo. After go-live the handoff's Designer version can replace the script, and Swiper can go.

Checked on staging (Playwright, 1440 and 390 wide). New view: the map is fetched when near, lights up once, shows no pins at rest; the UK on hover (computer) or tap (phone) shows its pin and "Deals 52"; grey countries have the normal cursor; the old map file is not fetched. The 22 cards in CMS order, 6 at first (4 on phones); Europe 5, North America 1, UK 16 (6 shown until "View all"); "View all transactions" shows 22 and "Show fewer" keeps the button where it was. Card text, card size and the divider match the prototype at both widths. Whole page with every card opened: 1.3 MB at 1440 (old view 12.9 MB) and 1.0 MB at 390 (old view 1.3 MB). No console errors, no sideways scrolling. Old view: the map, both sliders and their arrows as live, page CSS off. Live site: unchanged.

### 6. Partner Program (`6948341649f1d7eb6aca1cd0`) (10 Nov 2026)
Source: `prototypes/partner-program/` (HANDOFF.md sections 2 to 5: Why cards spacing, the new How it works, the moving Our Partners logos, the contact form fixes).

| What | Element | Change | Undo |
|---|---|---|---|
| The How it works carousel section `section [COPY ME] join` | `31a88887-dd02-51a2-8815-5d8e1c65b2e2` | Attribute `data-rc="old"` | Remove the attribute |
| New How it works block after it | `a489f654-8f21-210d-cdaf-a3f05527be20` (`data-rc="new"`), Code Embed `12def11f-7e27-e4c0-a466-43ef1270c0c6` | `partner-program/how-embed.html`: the sticky column, the six steps (live titles word for word, the approved short lines) and an empty `#brochure` for the live closing line | Delete the block |
| Page head code | | Was `partner-program/page-head.before.html`. Now `partner-program/page-head.html`: the same, then `<style id="rc-css-partner" media="not all">` (new view only). Its texture is the asset `6af34e604c652d3c92d5c74f_texture-waves.webp` (6 KB) | Set it back to `page-head.before.html` |
| Page footer code | | Was `partner-program/page-footer.before.html` (Swiper and the carousel). Now `partner-program/page-footer.html`: the new-view script first, then the live code unchanged | Set it back to `page-footer.before.html` |

The new-view script does, in the browser, what the handoff does in the Designer: it moves the live closing line and its Download button into the new band and the brochure pop-up to the end of the page (before Webflow's interactions start, so Download still opens it); renames the pop-up form's ids so no id is repeated (its form name for submissions stays "Contact Form", so notifications and filters see no change); gives the contact form hidden labels and autocomplete and turns its desktop Submit, a link that relied on a script this page never loads, into a real submit button; and builds the moving logo strip from the live grid (classes, a track, an aria-hidden copy, the firm names as alt text). The Why cards' spacing is page CSS instead of class edits. So the live elements, their classes and the shared "Contact Form Section" component are untouched, and the switch turns all of it off. Swiper still loads because the old view uses it; it goes after go-live.

Checked on staging (Playwright, 1440 and 390 wide). New view: the six step titles match the live carousel word for word, each with its line; one visible H1 (the old carousel's H1 is hidden with it); the closing line and Download sit at the foot of the band, and Download opens the brochure pop-up and its close works (the menu stays above the overlay, as on live); the forms are Contact, Footer Subscription and Brochure with no repeated id on the page; the desktop Submit is a button of the live size (84 x 41 px) tied to the contact form, and an empty Submit is stopped by the browser with the focus on Name (nothing was sent: every outgoing request was blocked); five hidden labels and autocomplete; Why cards 287 px high at 1440 with 32 px between icon and text (28 px on phones); the logos move as one strip of two copies, pause on hover, and carry the eight firm names; no console errors, no sideways scrolling. Old view: the carousel, the pop-up in its place, the link Submit and the static logo grid, all as live. Live site: unchanged.

Still to do on this page before go-live (owner): one test enquiry from a computer through the contact form (its Submit works for the first time on desktop), and one brochure request to check the redirect to the PDF.

### 7. Home (`693e84aa85fe6122f0427972`) (10 Nov 2026)
Source: `prototypes/homepage-track-record-and-rates/HANDOFF.md`: the rates panel, the deal list with row 06 and its mosaic, the What We Do motion and switch, the counters, and the contact form fixes. The hero, Who We Are, the wording, the menu bar and the footer are unchanged. Where the prototype reworded live text (the Track Record paragraph, the dashes in What We Do), the live text stays.

| What | Element | Change | Undo |
| --- | --- | --- | --- |
| Rate cards `div.baserate-cards-wrap` | `5dda6b2b-82e0-046e-0902-fed57f136b46` | Attribute `data-rc="old"` | Remove the attribute |
| New rates block after them | `442a59bd-f3ec-70b2-cbd8-8cf5e35f8f68` (`data-rc="new"`), Code Embed `41aa8413-a1fd-291f-aeee-45c36970e12f` | `home/rates-embed.html`: the odometer panel and its script (new view only). Its ids start with `rc-`; in the new view the script hands it the live ids `baserate-*`, `changerate-*` and `rates-updated`, so the old view's cards keep theirs. The fallback text (shown only if the feed fails) is the feed as read on 10 Nov 2026 | Delete the block |
| Track Record cards `div.track-record-cards-wrapper` | `7aac6a27-0e64-d181-9475-ad8ef4ba8923` | Attribute `data-rc="old"` | Remove the attribute |
| New deal list block after them | `e8b26100-a185-0662-92da-4fb497dbc4af` (`data-rc="new"`), Code Embed `9d43b833-966e-bff4-198a-e0cad3bd7daf` | `home/deals-embed.html`: the five rows, row 06 "All transactions" with the 22-photo mosaic, the pane, "View 22 selected transactions" (to /track-record) and the deal list script (new view only) | Delete the block |
| Page head code | | Was `home/page-head.before.html` (the Swiper stylesheet and Finsweet). Now `home/page-head.html`: the same, then `<style id="rc-css-home" media="not all">` and its switch, which in the new view also points the Who We Are photo at its WebP copy before it loads | Set it back to `page-head.before.html` |
| Page footer code | | Was `home/page-footer.before.html`. Now `home/page-footer.html`: the new-view script first (the What We Do photo in its frame without its fade-in, the heading without its fade-in, the counters carrying 60, 120 and 25, the contact form fixes, the reveal fallback, the What We Do switch and counters), then the live code, its two scripts now wrapped in an old-view check | Set it back to `page-footer.before.html` |
| 28 photos as WebP | the assets in `home/photos.json` | Uploaded to Assets: 5 deal photos, 22 mosaic tiles, and the Who We Are photo (93 KB instead of the 891 KB PNG, audit HA-10) | Delete the assets, but only once nothing uses them |

How this differs from the handoff, and why: the handoff binds the deal list to the CMS (new fields Featured, Sort order, Terms line, Mosaic tile) and makes Designer edits (wrap the photo, remove two interactions, type the counters). Here the CMS is not touched: the five rows and the mosaic are static HTML in the embed with the prototype's data, and the Designer edits are made by the new-view script before Webflow's interactions start. So the old view and a rollback are exact. Two small additions fit the prototype code to the live page: the deal list script measures the live menu bar (`.nav_fixed-2`) when it brings a tapped row into view on phones, and the prototype's base reset, scoped to the two new blocks, stops Webflow's default list bullets and indents. Swiper still loads because the old view uses it; it goes after go-live.

Checked on staging (Playwright, 1440 and 390 wide). New view: rates 4.00, 3.75 to 4.00 and 2.773 from the feed, chips "Raised 25 bps / on 5 Nov 2026", "Held / since the 17 Sep 2026 rise" and "Down 2.1 bps / fixing of 9 Nov 2026", "Checked 10 Nov 2026"; with the feed blocked the fallback text stays, the Checked line hides and nothing errors; with reduced motion the numbers show at once, nothing slides in and the counters read 60, 120, 25. Deal list: six rows aligned with the button, no bullets; Rome selected by click and by the arrow keys, hover previews London and the pane returns on leaving; row 06 shows all 22 tiles inside the frame with "UK, Europe and North America" and "22 transactions in 7 countries"; no tile loads with the page; on a phone a tap opens the row below the menu bar (row top 126 px, bar bottom 98 px) and a second tap closes it. What We Do: the arrows and headings switch Asset Classes and Sources of Capital, Swiper does not start, the photo frame is in place. Contact: the desktop Submit is a real button tied to the form, five hidden labels, autocomplete, and an empty form is stopped by the browser (every outgoing request was blocked, nothing was sent). No repeated ids, no console errors, no sideways scrolling. Old view and live: the rate cards, the three Track Record cards, Swiper, the counters and the link Submit as today. Weight, same steps for both views (load, then scroll to the end): phone 3,061 KB against 3,572 KB, computer 3,061 KB against 3,574 KB; at first load 2,376 KB against 3,145 KB. Live site: unchanged.

Still to do on this page before go-live (owner): one test enquiry from a computer through the contact form (its desktop Submit becomes a real button, as on Partner Program). Open since the handoff (section 6): the licence for showing the EURIBOR figure, which the live cards already show.

### 8. Site-wide: cookie banner (10 Nov 2026)
Source: `prototypes/cookie-consent/HANDOFF.md` section 3 (approved banner, preferences dialog and Google Consent Mode v2 in basic mode).

| What | Element | Change | Undo |
| --- | --- | --- | --- |
| Site head code | | Was `site/site-head.before.html` (the switch, then today's Google tag). Now `site/site-head.html`: the switch unchanged; today's Google tag, same ID and settings, now run in the old view only (loaded from a script so the new view can skip it); then the handoff's consent default and tag loader, new view only | Set it back to `site-head.before.html` |
| Site footer code | | Was `site/site-footer.before.html` (the menu bar script). Now `site/site-footer.html`: the same, then the banner and dialog in a `data-rc="new"` block, `<style id="rc-css-consent" media="not all">` and the consent script (new view only). The script also adds the "Cookie preferences" link after "Cookie Policy" in the footer's Legal column, so the shared footer component is not edited | Set it back to `site-footer.before.html` |

How this differs from the handoff, and why: the handoff deletes today's Google tag and adds the footer link in the footer Symbol. Here today's tag stays for the old view, so a rollback is exact, and the link is added by the script in the new view. No Google Analytics ID is set under Integrations (every page carries only the one tag from the site head). The conversion event on /contact-us-success (handoff step 4) is not added: that page has no Google Ads code today and the conversion label is not known.

Checked on staging (Playwright, fresh browser for each run, every Google request recorded and then cancelled so nothing reached Google). New view: on a first visit the banner shows bottom right on a computer (384 px wide, 24 px from the edges) and as a bottom sheet on a phone, first in the page; no cookie and no Google request before a choice, on any of 16 pages; it shows on the first page of a visit only. Accept all: roscap_consent (version 1, both true), the consent default, the update, then the Google Analytics and Google Ads configuration; after a reload no banner. Reject: both false, no Google request on that page or the next. Analytics only: Google Analytics configured, Google Ads not. The footer link, reached by keyboard, opens the dialog with "Your choice: analytics off, marketing off. Saved 10 November 2026."; Escape closes it and returns focus to the link; the page address does not change. The Cookie Policy's own "Cookie preferences" link opens it too. No console errors, no sideways scrolling, on all 16 pages at 1440 and 390. Old view and live: today's Google tag loads at once and is configured as before; no banner, no footer link.

Still to do before go-live (owner): confirm the Google Ads ID AW-238397354910 and send the conversion label, so the consent-aware conversion event can go on /contact-us-success; in Google Analytics, data retention 14 months and Google Signals off (both stated in the policies); after go-live, check with Tag Assistant (handoff section 4, test 2) and one test enquiry with consent granted.

### 9. Privacy Policy (`696052dc56c8f2832361bd16`) and Cookie Policy (`696055ce5a6158c485b5141b`) (10 Nov 2026)
Source: `prototypes/legal-pages/` (HANDOFF.md section 4). The text is the prototype's, word for word, with the review highlights removed.

| What | Element | Change | Undo |
| --- | --- | --- | --- |
| Old text, Rich Text `div.text-rich-text` | `5e962168-6720-f6f2-e1fd-a2ae1fdf388a` on each page | Attribute `data-rc="old"` | Remove the attribute |
| Privacy Policy, new text block after it | `89d65a2b-1f24-896f-3265-966c72f45ba3` (`data-rc="new"`), Code Embed `bc7be928-74b9-c34b-77e6-8c021a5161d1` | `legal/privacy-policy-embed.html` | Delete the block |
| Cookie Policy, new text block after it | `dfa21229-e04e-483d-be21-70c4dd914f03` (`data-rc="new"`), Code Embed `bc1ee37b-e617-07c3-26a8-18152e0092ca` | `legal/cookie-policy-embed.html`, with the cookie table and the two "Cookie preferences" links | Delete the block |
| Page head code, both pages | | Was empty. Now `legal/page-head.html`: `<style id="rc-css-legal" media="not all">` (the policy text and table styles from `legal.css`) | Clear the page head code |

The "Last updated" date on both pages is 10 November 2026. If go-live is on a later day, change both dates to that day. The links between the two policies are relative, so they work the same on staging and live. Checked on staging at 1440 and 390: one H1, 18 sections on the Privacy Policy and 8 on the Cookie Policy, no "#" links in the text, the cookie table scrolls inside its own box on phones, a 46rem reading column, no sideways scrolling; old view: the old text as live.

### 10. Email links on four legal pages (10 Nov 2026)
"info@roscap.co.uk" linked to "#". It now links to mailto:info@roscap.co.uk. An approved error fix (plan step 1), so it is not behind the switch.

| Page | Link element | Undo |
| --- | --- | --- |
| Website Terms of Use (`696056001a08cf7c6f25b239`) | `afec7167-7954-cc8d-614e-761a32b24fcb` | Set the link back to the URL `#` |
| Disclaimer (`69605649e2c655da9eccb3f3`) | `e8674f29-5a34-34f0-f3e8-f72b47ea1a7f` | Set the link back to the URL `#` |
| Accessibility Statement (`69605691f9530751aff13d75`) | `c3371590-c5f1-6ff4-9b64-16c7b0a3cf23` | Set the link back to the URL `#` |
| Privacy Policy, old text (`696052dc56c8f2832361bd16`) | `dc5b0b22-735f-6591-7c9b-f7c829bd68c7` | Set the link back to the URL `#` |

Not done: the Accessibility Statement still claims WCAG 2.1 AA. The plan restates it as partially conformant (audit IL-03), but that needs new text, a list of known issues and a target date, which only the owner can give. It is left as it is.

## Publishes

| When (UTC) | Where | What |
|---|---|---|
| 10 Nov 2026 | Staging only | The switch (check that it works) |
| 10 Nov 2026 | Staging only | Our Services pilot |
| 10 Nov 2026 | Staging only | Page not found |
| 10 Nov 2026 | Staging only | Page not found spacing fix, Speak to Us |
| 10 Nov 2026 | Staging only | Track Record, then three fixes found in checking (WebP photos, cards moved instead of copied, the divider on phones) |
| 10 Nov 2026 | Staging only | Partner Program |
| 10 Nov 2026 | Staging only | Home, then two fixes found in checking (the Who We Are photo as WebP, the reset for the two new blocks) |
| 10 Nov 2026 | Staging only | Cookie banner, both policies, the email links, then the old Privacy Policy text's email link |

The live domains were last published on 17 Oct 2026, before this work started.

## After go-live: clean-up (later, with a fresh backup)
- Delete the elements marked `data-rc="old"`, and remove the `data-rc` attributes from the new ones.
- Replace each `data-rc-class` with a real class, then drop the switch checks from the page code.
- Speak to Us: make the form fixes in the Designer (labels, Subject type, autocomplete, honeypot), then drop those lines from the page footer script.
- Track Record: build the deals Collection List as the handoff describes, put the WebP photos into the CMS items, then delete the two sliders, Swiper, the old map embed and image, and the old map styles.
- Partner Program: make the handoff's Designer changes (move the closing line and pop-up, the marquee classes and copy, alt texts, form ids, labels, the submit button in the shared contact component, the Why card class values), then delete the carousel section, the hidden timeline section, Swiper and the timeline styles, and drop the script lines.
- Home: put the deal list into the CMS as the handoff describes (or keep the static rows), make the Designer edits (wrap the What We Do photo, remove its fade-in and the heading's, type the counters, the form fixes in the shared contact component, the Who We Are photo as WebP), then delete the rate cards, the three Track Record cards, the old rates and slider code and Swiper, and drop the script lines.
- Site-wide: delete today's Google tag block (old view only) from the site head, drop the switch checks around the consent code, add the "Cookie preferences" link in the footer Symbol and drop the script lines that add it.
- Policies: paste the text into the Rich Text as the legal handoff describes (or keep the embeds), then delete the old text.
- Remove the replaced interactions in the Interactions panel.
- Remove the switch from the site head.
