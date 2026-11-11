# Webflow build: change log and undo steps

Site: Roscap (`693e84a885fe6122f0427916`). Staging: https://roscap-site.webflow.io. Live: https://www.roscap.co.uk.

## How a mistake is undone

1. **The switch (whole redesign).** The site head starts with a small script (`rc-switch.html`). On the staging address it shows the new design, and on www.roscap.co.uk it shows today's design until `LIVE` is set to `true`. Every new element carries `data-rc="new"`, every element it replaces carries `data-rc="old"`, and each page's new CSS and script only switch on in the new view.
   - Compare on staging: add `?rc=old` to any address for today's design, or `?rc=new` for the new one (it lasts for that browser tab).
   - Go-live: set `LIVE=true` in the site head and publish. Done on 10 Nov 2026 at 23:44 UTC (section 14).
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
| New contact block after it | `2a8b0d69-7877-af04-7b98-8d93d1053575` (`data-rc="new"`), Code Embed `b29a7d7b-f1cb-806a-eaf2-baf28326fea4` | `speak-to-us/contacts-embed.html`: phone and email side by side, Instagram centred below them (WhatsApp was added in 11 and taken out again in 12, at the owner's request) | Delete the block |
| FAQ dropdowns `div.faqs-content-wrap` | `e8b98bfe-13ab-a7ed-83e6-cf568ba0d48e` | Attribute `data-rc="old"` | Remove the attribute |
| New FAQ block after it | `ddff09f2-493a-0441-98b6-8dcc3e075af6` (`data-rc="new"`), Code Embed `02ca1044-811e-a432-0c77-0c9677b34347` | `speak-to-us/faq-embed.html`: the compact accordion, live copy word for word | Delete the block |
| Page head code | | Was the Finsweet Attributes tag only (`speak-to-us/page-head.before.html`). Now `speak-to-us/page-head.html`: the same tag, then `<style id="rc-css-speak" media="not all">` (new view only) and the FAQPage JSON-LD | Set it back to `page-head.before.html` |
| Page footer code | | Was empty. Now `speak-to-us/page-footer.html`, run in the new view only: hidden labels on the five fields, Subject as plain text, autocomplete on Name, Email and Phone, the honeypot field and its guard, one FAQ answer open at a time | Clear the page footer code |

The FAQPage JSON-LD is not behind the switch: it holds the same five questions and answers the old dropdowns show, so it is right in both views.

How this differs from the handoff: the handoff edits the live form in the Designer (labels, Subject type, autocomplete, honeypot). Here the form is untouched and the new-view script makes the same changes in the browser, so the switch also turns them off. After go-live they can be made in the Designer and the script lines dropped.

Checked on staging (Playwright, 1440 and 390 wide). New view: the first contact row sits where the live line is (y 598 at 1440, y 290 at 390); the hero is 900 px at 1440 as live, 925 px at 390 (live 873: the second contact row); 5 FAQ questions, identical to the live dropdowns, one open at a time; the JSON-LD matches the visible FAQ; 5 hidden labels, Subject is `type="text"`, autocomplete name, email and tel; the honeypot is off screen and its guard cancels a submit when it is filled (tested with a synthetic event while every outgoing request was blocked: nothing was sent). Old view: the live line, the dropdowns and the form as live. Live site: unchanged.

Still to do on this page before go-live (owner): confirm the FAQ timescales still hold. The test enquiry was sent on 10 Nov 2026: it reached /contact-us-success and is in Webflow's form submissions; the notification email is the owner's to check. WhatsApp: confirmed by the owner on 10 Nov 2026 and added (see 11).

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

The new-view script does, in the browser, what the handoff does in the Designer: it moves the live closing line and its Download button into the new band and the brochure pop-up to the end of the page (before Webflow's interactions start, so Download still opens it); renames the pop-up form's ids so no id is repeated (its form name for submissions stayed "Contact Form", so notifications and filters saw no change; it was renamed "Brochure Form" later at the owner's request, see 11); gives the contact form hidden labels and autocomplete and turns its desktop Submit, a link that relied on a script this page never loads, into a real submit button; and builds the moving logo strip from the live grid (classes, a track, an aria-hidden copy, the firm names as alt text). The Why cards' spacing is page CSS instead of class edits. So the live elements, their classes and the shared "Contact Form Section" component are untouched, and the switch turns all of it off. Swiper still loads because the old view uses it; it goes after go-live.

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

Still to do before go-live (owner): after go-live, check with Tag Assistant (handoff section 4, test 2) and one test enquiry with consent granted.

Answered by the owner on 10 Nov 2026: the Google Analytics settings (data retention 14 months, Google Signals off) are done. Google Ads: both conversions, "Roscap (web) generate_lead" and "Contact Us", are imported from Google Analytics, so no conversion label and no extra code on /contact-us-success are needed; they count only for visitors who accept analytics. The site never sends a `generate_lead` event itself, so that event must be created inside Google Analytics (for example from the /contact-us-success page view); worth a look under Admin > Events in Google Analytics. The Ads account showed an overdue balance, so no ads were running.

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

Not done: the Accessibility Statement still claims WCAG 2.1 AA. The plan restates it as partially conformant (audit IL-03), but that needs new text, a list of known issues and a target date, which only the owner can give. It is left as it is (the owner's decision, 10 Nov 2026).

### 11. The owner's review, round 2 (10 Nov 2026)
The owner checked staging, answered the two open questions (Mowgli: "Southern Europe"; Manchester: "£2.66m is correct", a land bridge) and confirmed WhatsApp. These are the changes that followed. Where a file had already changed in an earlier step, the version before this step is in git: `git show 33cc48a:webflow-build/<file>`.

| What | Where | Change | Undo |
| --- | --- | --- | --- |
| Mowgli's bio | About Us (`6945320290c61958e6e7ae91`), paragraph `3f8bbcb1-5ace-be89-3199-b1df50408ff6` | "Head of Western Europe" now reads "Head of Southern Europe", as his card says. An approved error fix, so not behind the switch | Set the text back to the old text below |
| Leftover test script | About Us and Insights (`69456f172ca40e1b1a9f748c`), page footer code | `<script src="https://jj59l3.csb.app/script.js">` removed (it changes nothing on either page). Was `about-us/page-footer.before.html` and `insights/page-footer.before.html`, now the `page-footer.html` beside each. An approved error fix, so not behind the switch | Set each page footer back to its `page-footer.before.html` |
| Blog posts: desktop Submit | Blogs Template (`694571d3016b9c2b2ec786f4`), page footer code | On a computer the contact block's Submit is a link that relies on a script blog posts never load, so it did nothing on all 12 posts (the Partner Program fault). After the live share script, a new-view script turns it into a real submit button tied to the form and adds hidden labels and autocomplete, as on Home and Partner Program. Was `blog-posts/page-footer.before.html`, now `blog-posts/page-footer.html` | Set the page footer back to `page-footer.before.html` |
| Brochure pop-up layout | Partner Program page head | Full Name across both columns again, as live. The new view renames the pop-up's field ids (so no id is repeated on the page) and the live grid rules are tied to the old ids, so the three rules are copied for the new ids at the end of `rc-css-partner` | Delete the three `#brochure-` rules at the end of `rc-css-partner` |
| FAQ answer width | Speak to Us page head | Answers run as far as the question text, 50 px short of the right edge, so the gap before the arrow is small (it was a 68-character column). Phones unchanged | Set `.acc .ans` back to `{max-width:68ch;padding:0 4px 26px}` |
| WhatsApp | Speak to Us, Code Embed `b29a7d7b-f1cb-806a-eaf2-baf28326fea4` | Added after the phone line: `https://wa.me/447850522789` with a short opening message, so the four contacts sit two by two | Delete the WhatsApp line (`speak-to-us/contacts-whatsapp-item.html` holds it) |
| Manchester card | Track Record page footer | New view: £2.66m and Product "Land Bridge", in place of the CMS item's £2.7m and "Commercial Mortgage". Only that old wording is replaced, so these lines do nothing once the CMS item is corrected. The CMS item is not changed here, because publishing a CMS item sends it straight to the live site | Delete the Manchester lines from the script |
| Rates sources line | Home, Code Embed `41aa8413-a1fd-291f-aeee-45c36970e12f` | Removed. First it moved out of the panel into the small print at the foot of Home; then, at the owner's second request ("don't want the source"), the small-print line went too, so no sources line shows anywhere | Paste back the earlier embed (`git show 33cc48a:webflow-build/home/rates-embed.html`) for the line in the panel |
| Brochure form name | Partner Program, the pop-up's Form element `f059f806-9b19-9127-825b-c2e3916b1054` | Form name "Contact Form" is now "Brochure Form", and its id `wf-form-Contact-Form` is now `wf-form-Brochure-Form` (owner's request: its notification emails looked like enquiries). The PDF redirect is unchanged. Not behind the switch, so it holds in both views; brochure requests are now filed under "Brochure Form", while earlier ones stay under "Contact Form". An email rule or automation that looks for "Contact Form" no longer catches brochure requests. The page footer script's comment says so; its code is unchanged | In the Designer, select the pop-up form and set its name back to "Contact Form" and its ID back to `wf-form-Contact-Form` |
| Deal list hover | Home, Code Embed `9d43b833-966e-bff4-198a-e0cad3bd7daf` | On a computer the row last hovered stays in the pane and becomes the selected row, instead of springing back when the pointer leaves the list. Hovering is still not read out by screen readers; clicks, arrow keys and phones work as before | Paste back the earlier embed (`git show 33cc48a:webflow-build/home/deals-embed.html`) |

Old bio text: "Mowgli was born in the snowy French alps. He graduated from Skema business school in Lille in 1995. He has since lived and worked in very diverse industries in London, Paris, Los Angeles and Lisbon. He founded one of the first real estate crowdfunding platforms in France, raising more than €50m before he sold it in 2023. He is now the Head of Western Europe for Roscap, sourcing Real Estate opportunities seeking development or bridge finance."

Checked on staging after one publish to the staging address only. Every file above is in the published pages byte for byte. Playwright at 1440 and 390, every non-GET and Google request cancelled: the pop-up fields match live to the pixel (Full Name and Company Name 638 px at 1440, Email and Phone 311 px side by side; 318 px each on a phone); the first FAQ answer now ends 54 px before the arrow at 1440; the four contacts sit two by two, WhatsApp under the email; Manchester shows £2.66m and Land Bridge in the new view (the old view keeps the CMS wording, as live); the sources line is gone from the panel and sits in the small print (14 px, the same grey); Birmingham, then All transactions, then Rome each stay in the pane after the pointer leaves the list, and the arrow keys and a click still select; on a phone a tap opens the row; the blog Submit is a button of the live size (84 x 41 px) tied to the form, and an empty Submit is stopped by the browser at Name with nothing sent; About Us and Insights make no request to csb.app, the team pop-up opens and closes, and "Western Europe" appears nowhere; the Equity sentence on Our Services appears once. All 16 pages: no console errors, no sideways scrolling, no Google request before a choice. Insights' own desktop Submit already works (that page loads the script blog posts lack), so it is unchanged. Live site: unchanged.

EURIBOR stays on the rates panel, at the owner's choice. EMMI, which runs EURIBOR, allows free use of its delayed rates for non-commercial purposes only and licenses commercial use (https://emmi-benchmarks.eu/faq/euribor, fee schedule https://www.emmi-benchmarks.eu/globalassets/documents/pdf/subscriptions/d0167a-2026---2027-fee-schedule.pdf). The risk is a request to license or remove it, possibly with back fees, not a regulator's fine. Options: ask EMMI (info@emmi-benchmarks.eu) for a licence or a written confirmation, show the ECB deposit facility rate instead, or remove the third rate.

Follow-up the same evening. The owner asked for no sources line at all, so the small-print line was removed as well (Home rates embed, published to the staging address only; checked byte for byte; the panel still fills from the feed at 1440 and 390, no text names a source, no console errors; old view unchanged). The owner made a Webflow backup ("November 10th"), sent one test enquiry on staging (it reached the thank-you page and is in Webflow's form submissions at 19:13 UTC, as is the brochure pop-up test from Partner Program at 18:57), confirmed that the Google Analytics event `generate_lead` exists, and decided to keep EURIBOR. Go-live: as soon as possible, on the owner's word.

Still to do before go-live (owner): an agreement that no one else publishes until go-live; check that the notification email for the test enquiry arrived; the "Last updated" date on both policies is 10 November 2026, so it needs changing only if go-live is on a later day.

### 12. The owner's phone review, round 3 (10 Nov 2026)
The owner went through staging on a phone and asked for these changes. Where a file had already changed in an earlier step, the version before this step is in git: `git show d1641a6:webflow-build/<file>`.

| What | Where | Change | Undo |
| --- | --- | --- | --- |
| Why Partner With Us entrance | Partner Program page head and page footer (section 5 of the script) | The Our Services entrance: the gold R (the logo's mark, the same paths as on Our Services) draws itself above the heading and fills, then the heading, its gold line and the intro arrive, then the four cards one after another, then Join The Program. New view only; static under reduced motion. The site-wide section slide-in is held still on these two sections so they do not move twice | Delete section 5 of the footer script and the "Why Partner With Us" block in the head |
| Logo in the How it works cards | Partner Program, Code Embed `12def11f-7e27-e4c0-a466-43ef1270c0c6`, and the page head | The two "Roscap" boxes (Join the Program, Referral) show the ROSCAP wordmark and the two circles in Progress updates show the gold R, both cut from the site logo file the menu bar already loads (`Logo.svg`), so they match the logo exactly and add no download | Paste back the earlier embed (`git show d1641a6:webflow-build/partner-program/how-embed.html`) and delete the `.vis-wm` and `.vis-r` rules |
| Room before the contact block | Partner Program page head and page footer (one line in section 3) | The Our Partners section ends with 130 px (computers), 104 px (tablets) or 72 px (phones) instead of 100, 72 and 32 px | Delete the `.partners-sec` rules and the line that adds the class |
| Contact details | Speak to Us, Code Embed `b29a7d7b-f1cb-806a-eaf2-baf28326fea4`, and the page head | No WhatsApp (owner: a boutique feel). Phone and email side by side, Instagram centred under them; on the narrowest phones the three stack | Paste back the earlier embed and head (`git show d1641a6:webflow-build/speak-to-us/contacts-embed.html` and `page-head.html`) |
| Asset Classes and Sources of Capital on phones | Home page head | Up to 767 px: the two headings become an even pair of tabs on one line (the one shown in ink over a gold line, the other grey, in a fixed order), the arrows give way to the tabs and a swipe, and the four cards sit two by two with the icon above the name. Tablets and computers unchanged | Delete the "What We Do on phones" block at the end of the head CSS |
| Phone and tablet menu | Site head (a small style block after the switch) | Every link at one size (24 px, was 32 px with the current page at 40 px) with a fine line between them; the page you are on in gold at the same size with a small gold dot; a slimmer Speak With Us button. New view only, scoped by the switch | Delete that style block and its comment |
| Roscap provides access to | Our Services page head | Between 480 and 991 px, where the cards sit two by two, the third card is centred under the other two instead of leaving an empty space beside it | Delete the block at the end of the head CSS |
| Two double spaces | The shared menu component (NAVV) and Home | "About  Us" (two non-breaking spaces; its hover copy also began with one) now reads "About Us" in both copies, like the other links; "Commercial  Banks" on Home reads "Commercial Banks". Text fixes, not behind the switch | In the Designer, put the old texts back: `About&nbsp;&nbsp;Us`, `&nbsp;About&nbsp;&nbsp;Us` and `Commercial&nbsp; Banks` |

Checked on staging after one publish to the staging address only. Every file above is in the published pages byte for byte. Playwright, every non-GET and Google request cancelled, nothing typed or submitted: on a phone the tabs are 179 px each at 22 px, the arrows are hidden, the cards sit two by two and a tap on Sources of Capital shows Commercial Banks first; the old view and computers keep the live headings, arrows and rows. The menu links are all 24 px with Home in gold (the old view keeps 32 and 40 px). Our Services at 600 px: the third card sits centred (172 to 428 px of 36 to 564); 390 and 1440 unchanged. Partner Program: the R draws and fills, the cards arrive, both sections stay at full opacity (no double slide), the wordmark and the R show from the logo file, the gap before the contact block is 130 px at 1440 and 72 px at 390, and the brochure pop-up still opens with Full Name across both columns. Speak to Us: phone and email side by side, Instagram centred under them, no WhatsApp link. All 16 pages at 1440 and 390: no console errors, no sideways scrolling, no Google request before a choice. Live site: unchanged.

### 13. The owner's review, round 4 (10 Nov 2026)
The owner checked staging again on a computer and a phone. The version before this step is in git: `git show 8ff9e03:webflow-build/<file>`.

| What | Where | Change | Undo |
| --- | --- | --- | --- |
| How it works step links | Partner Program page footer (section 4 of the script) | A click on a step in the list lights it at once and moves the page in about a third of a second, up or down, so that the step sits in the middle of the window, where the indicator reads it (at once with reduced motion). Before, Webflow's link scroll waited about 0.7 s and then lined the step's top up with the top of the window, where the indicator read the next step: 01 from 02 moved the page down and lit 03. The clicked step stays lit until the reader scrolls on; from the keyboard, focus moves to the step. The address no longer gains #step-n | Paste back the earlier footer (`git show 8ff9e03:webflow-build/partner-program/page-footer.html`) |
| Brochure link shown twice | Partner Program, Code Embed `12def11f-7e27-e4c0-a466-43ef1270c0c6` | The "Download our brochure" text link under the step list is gone. The Download button further down, after "For more information, download our brochure or contact us below.", stays and still opens the brochure pop-up. The `.how-brochure` rules in the page head are left in place, unused, so the undo is one paste | Paste back the earlier embed (`git show 8ff9e03:webflow-build/partner-program/how-embed.html`) |
| 25+ Years of combined experience | Home page head | From 480 to 991 px, where the three figures sit two by two: the two columns now fit the page (each figure was a fixed 320 px wide, so below 728 px the second ran off the edge and the page scrolled sideways, on live too), each figure fills its column, the large numbers scale down below 728 px so that £120m+ fits, and the third figure is centred under the first two, as on Our Services. Phones (one column) and computers (one row) unchanged | Delete the "Who We Are figures" block near the end of the head CSS |
| What We Do lifecycle | Home page head and page footer (section 5 of the script) | "Roscap sources capital for projects at all stages of their lifecycle:" now has the paragraph style (it was set heavier), and the six stages have the paragraph font, weight, size and grey (they were darker and heavier, and 14 px on phones). The teal number circles become light rings joined by a fine gold line, read 1 to 3 and then 4 to 6 (one column on phones). The first time the list comes into view the line runs through the rings and lights them one after another; pointing at a stage, or tapping it on a phone, fills its ring with gold and turns its name teal. No new wording. Reduced motion: shown lit, no run. Old view unchanged | Delete the "What We Do lifecycle" block at the end of the head CSS and section 5 of the footer script |
| Lifecycle spacing (owner's follow-up) | Home page head and page footer (section 5 of the script) | Stages 3 and 6 sat further down than the others, because the two columns shared rows and "Pre-stabilised but completed assets" ran to two lines. The script now puts stages 1 to 3 and 4 to 6 in a column each, so each column stacks on its own; the second column takes the width its longest name needs, so on computers (1366 px and up) every name stays on one line and all six sit 50 px apart; where the list is narrower than 536 px it is one column, 1 to 6, with the line running through. Rings 28 px (were 30). The live grid's top-to-bottom flow is reset for the new columns | Paste back the round 4 head and footer (`git show 0f37fb1:webflow-build/home/page-head.html` and `page-footer.html`) |

Checked on staging after two publishes to the staging address only (the second moved the step's focus to keyboard use only, after the first check showed an outline round the step on a click). Every file above is in the published pages byte for byte. Playwright, every non-GET and Google request cancelled, nothing typed or submitted. How it works at 1440 px: from 02, a click on 01 starts moving on the next frame (17 ms) and ends with step 1 centred and 01 lit; 03, 06 and back up to 02 the same; a mouse click leaves no outline, Enter from the keyboard moves focus to the step; scrolling on after a click hands the indicator back; with reduced motion the jump is instant. Under the steps only the Download button remains, and it opens the pop-up. Home: the lead-in line, the stages and the paragraphs all read Switzer 300, 18 px, rgb(40, 40, 40); the rings start unlit and are lit when checked 3.7 s after the list comes into view; pointing at stage 4 fills its ring; on a phone a tap picks a stage and a second tap clears it; the old view keeps the teal circles. The figures at 480, 600, 768 and 991 px: the third is centred (216 to 552 px of 36 to 732 at 768), no sideways scroll; 390 and 1440 unchanged. All 16 pages at 1440 and 390: no page errors, no sideways scrolling, no Google request before a choice. Live site: unchanged.

Spacing follow-up, checked on staging after one more publish to the staging address only, files byte for byte: the rings sit 50 px apart in both columns at 1440, 1366, 1280 and 768 px (at 1280 only "Developments & conversions" runs to two lines, the last in its column, so nothing moves), and in one column of six at 1100, 600 and 390 px; they still light up in order, pointing and tapping still work, reduced motion shows them lit, the old view is unchanged, no page errors.

### 14. Go-live (10 Nov 2026)
The owner approved after reviewing round 4 and started a Webflow backup ("backup in progress. publish it!").

| What | Where | Change | Undo (roll back) |
| --- | --- | --- | --- |
| The switch | Site head, first script | `var LIVE=false` became `var LIVE=true`, so www.roscap.co.uk and roscap.co.uk show the new design. Nothing else in the site head changed (it was read back first and matched the repository word for word) | Set `LIVE=false` in the site head and publish to the live domains. The old design returns at once: nothing old has been deleted, and `?rc=old` on the live site still shows it intact (checked after go-live) |

Steps. Webflow showed an edit at 23:38 UTC, after the last staging publish (23:31), most likely the owner's backup, so the build was checked again before the live publish: the switch was set, the site published to the staging address only, and every build file (47 file checks over 11 pages, site head and footer included) was found in the published pages byte for byte, with `LIVE=true`; the 16-page sweep at 1440 and 390 px showed the new design on every page, no page errors, no sideways scrolling and no Google request before a choice. Then the site was published to www.roscap.co.uk, roscap.co.uk and the staging address at 23:44 UTC (Webflow: lastPublished 2026-11-10T23:44:00Z on both domains).

Checked on the live site straight after, read-only (GET only, every Google and non-GET request cancelled, no form touched): the same 47 file checks, byte for byte, with `LIVE=true`; roscap.co.uk redirects (301) to https://www.roscap.co.uk/; the 16-page sweep at 1440 and 390 px: new design on every page, the cookie banner on the first page of a visit only, no page errors, no sideways scrolling, no Google request before a choice; Home: the lifecycle in two columns, lit, the rates panel and the deal list in place; Partner Program: a click on 01 lights it within 150 ms and centres the step, no brochure text link; `?rc=old`: the old design intact with the new blocks hidden.

The policies' "Last updated 10 November 2026" stands: go-live was on 10 November (UK time).

Still to do after go-live (owner): the Tag Assistant check and one enquiry with cookies accepted (section 8); check that enquiry notifications arrive; confirm the Speak to Us FAQ timescales; the EURIBOR licence question stays open (section 7). Then, with a fresh backup, the clean-up below.

### 15. After go-live: the Federal Reserve status on phones (11 Nov 2026)
Suleman (Samsung) and the owner (iPhone 14) saw the Federal Reserve rate's status (the "Held" chip and its date) drop under the figure on phones, while the Bank of England and EURIBOR statuses sit beside theirs. The range "3.75–4.00%" is wider than the other figures: at 360 to 400 px it missed fitting by up to 31 px.

| What | Where | Change | Undo |
| --- | --- | --- | --- |
| Rates panel on phones | Home page head | Up to 479 px: the range figure scales down just enough (26 px at 360, 32 px at 390, unchanged from about 430 px up), the gap between each figure and its status is 12 px on all three (was 18), and under 360 px the date line wraps beside the figure instead of the status dropping. The Bank of England and EURIBOR figures, tablets and computers are unchanged | Delete the "Phones (the team's request, 11 Nov 2026)" block, straight after the rates panel's 860 px block in the head CSS |

Checked on staging (published to the staging address only): every build file in the published pages byte for byte; at 320, 360, 375, 384, 390, 412, 430 and 479 px all three statuses sit beside their figures, 10 px or more to spare from 360 px up (at 320 the Federal Reserve date runs to two lines), no sideways scrolling, no page errors; 480, 600 and 1440 px as before.

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
| 10 Nov 2026 | Staging only | The owner's review, round 2 (section 11) |
| 10 Nov 2026 | Staging only | Round 2 follow-up: no rates sources line anywhere (section 11) |
| 10 Nov 2026 | Staging only | The brochure pop-up form renamed "Brochure Form" (section 11) |
| 10 Nov 2026 | Staging only | The owner's phone review, round 3 (section 12) |
| 10 Nov 2026 | Staging only | The owner's review, round 4 (section 13), then the step links' focus for keyboard use only |
| 10 Nov 2026 | Staging only | Round 4 follow-up: the lifecycle stages evenly spaced (section 13) |
| 10 Nov 2026, 23:40 UTC | Staging only | The switch set to `LIVE=true`, checked before going live (section 14) |
| 10 Nov 2026, 23:44 UTC | **Live**: www.roscap.co.uk, roscap.co.uk, and staging | Go-live, on the owner's approval (section 14) |
| 11 Nov 2026 | Staging only | The Federal Reserve status on phones (section 15) |

Before go-live, the live domains had last been published on 17 Oct 2026, before this work started.

## After go-live: clean-up (later, with a fresh backup)
- Delete the elements marked `data-rc="old"`, and remove the `data-rc` attributes from the new ones.
- Replace each `data-rc-class` with a real class, then drop the switch checks from the page code.
- Speak to Us: make the form fixes in the Designer (labels, Subject type, autocomplete, honeypot), then drop those lines from the page footer script.
- Track Record: build the deals Collection List as the handoff describes, put the WebP photos into the CMS items, then delete the two sliders, Swiper, the old map embed and image, and the old map styles.
- Partner Program: make the handoff's Designer changes (move the closing line and pop-up, the marquee classes and copy, alt texts, form ids, labels, the submit button in the shared contact component, the Why card class values), then delete the carousel section, the hidden timeline section, Swiper and the timeline styles, and drop the script lines.
- Home: put the deal list into the CMS as the handoff describes (or keep the static rows), make the Designer edits (wrap the What We Do photo, remove its fade-in and the heading's, type the counters, the form fixes in the shared contact component, the Who We Are photo as WebP), then delete the rate cards, the three Track Record cards, the old rates and slider code and Swiper, and drop the script lines.
- Site-wide: delete today's Google tag block (old view only) from the site head, drop the switch checks around the consent code, add the "Cookie preferences" link in the footer Symbol and drop the script lines that add it.
- Policies: paste the text into the Rich Text as the legal handoff describes (or keep the embeds), then delete the old text.
- Track Record: correct the Manchester CMS item (£2.66m, Land Bridge), then delete the Manchester lines from the page footer script.
- Blog posts: make the Submit fix in the shared contact component (with Home and Partner Program), then drop the blog page footer script.
- Home: drop the unused `.rates-src` style from the page head.
- Remove the replaced interactions in the Interactions panel.
- Remove the switch from the site head.
