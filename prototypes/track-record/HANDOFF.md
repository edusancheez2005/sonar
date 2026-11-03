# Track Record: handoff

Prototype of www.roscap.co.uk/track-record with two changes: the **Our Transaction Footprint** map and the **Selected Transactions** deals. Everything else (hero, headings, copy, the call to action, footer, all 22 deals and their figures) is as live.

Files: `index.html`, `track.css`, `track.js`, `img/` (map, deal photos as WebP, hero), `webflow/` (paste-in code), `screenshots/` (prototype, and live next to prototype at 1440 and 390). The single-file version for review is `track-record.bundle.html`.

Copy rule note: in the live hero, "mixed-use schemes" is followed by a long dash. The prototype prints a comma there (copy rule for this work); on live, keep the text as it is.

## 0. In short

| | Live today | Proposed |
|---|---|---|
| Map | 6.66 MB drawing, loaded on computers only; a flat picture on phones and tablets; the pin and figure blink on only when the mouse is over a country | The same map at 166 KB (about 45 KB as Webflow sends it), on every screen, looking as it does today with nothing on top at rest; the countries light up in turn as it comes into view; hover or tap brings in the country's gold Roscap pin and its "Deals" label smoothly; nothing listed under the map |
| Deals | Two sliders with arrows and dots, four cards at a time | One grid of the same 22 cards: UK / Europe / North America filter, six cards first and "View all transactions", cards fade up as they appear |
| Page weight at 1440 (whole page scrolled) | 12.8 MB | 0.6 MB |
| Page weight at 390 | 6.4 MB | 0.5 MB |

The live figures were measured on the live page; the prototype figures with every file served uncompressed. Swiper (155 KB of script and 15 KB of styles) is no longer needed on this page.

## 1. Footprint map

### What it does
- Same outlines, colours and labels as the live map, and the same look at rest: teal countries and their names, with no pins on top. The file was redrawn from the live one with every point kept within half a pixel, so it looks the same and weighs 97% less.
- Entrance, once, when a third of the map is on screen: the United Kingdom fills from grey to teal, then Ireland, France, Spain, Italy, Albania and, after a short pause for the Atlantic, the USA (150 ms apart), each name fading in after its country. About 1.9 s in all.
- Nothing is listed under the map (owner's decision). The live map's figures (United Kingdom 52, Ireland 2, France 2, Spain 1, Italy 2, Albania 1, USA 1) sit in a short list that only screen readers read, because the map itself is a picture to them; the gold label takes its number from that list.
- Hover a country (or its name): as on live, the country's gold Roscap pin and its "Deals" label appear, but smoothly instead of blinking on. The country brightens a touch, the pin drops in and settles with a faint gold ripple at its point, and the label rises in just after it (about 0.4 s in all). Moving to another country, the label glides across while the pins hand over (crossing a border or a strip of sea does not make it blink off: it waits 160 ms before going); moving off the map, both fade away in about 0.2 s. Tap does the same on phones (tap again to clear). On a computer a click keeps the country shown after the pointer leaves, and Escape clears it.
- Reduced motion: the pin and the label simply fade in and out, in place, and the finished map shows at once. Without JavaScript the static map shows (noscript), with no pins.
- The map is fetched when it is about a screen away, not with the page.

### Install (Designer, Track Record page)
1. Assets panel: upload `img/footprint-map.svg`. Copy its URL.
2. In the map section (`section.pt-0` with `map-container`), delete the `svg-mapp` Code Embed and the `map-mobile` image.
3. In the same section add a Div with the live class `container`, and inside it a Code Embed. Paste `webflow/footprint-map-embed.html` (12.6 KB) and replace the two `REPLACE-WITH-UPLOADED-footprint-map.svg` URLs with the asset URL from step 1.
4. Page settings > Custom code > Inside head: delete the old map styles (`svg path { pointer-events: all; cursor: pointer; }` and the `[id^="pin-"]` rules). The first one gives every drawing on the page a hand cursor.
5. Optional: remove the "slide in" interaction from this section so the map's own entrance reads cleanly (the prototype holds this section still).
6. Figures: each country's line in the screen-reader list (`ul.fp-sr` in the embed) carries its figure twice, `data-n="52"` (what the gold label shows) and the text "United Kingdom: 52 deals". Change both if a figure changes. The figures are the live map's and stay as they are (owner, 3 November: the 22 deals listed below the map are a selection, so the map's totals are higher).

## 2. Selected Transactions

### What it does
- One grid of the same 22 CMS cards in the live card style (photo, "City | Amount", hairline, Product, Key Metrics, Asset Class, Capital): three across on a computer, two on a tablet, one on a phone.
- Filter: All, UK, Europe, North America (the three markets named in the live copy). The cards that stay glide to their new places and the new ones fade in.
- Six cards first (four on phones), then "View all transactions"; "Show fewer" folds them back and keeps the button where it was on screen.
- Cards fade up one after another as they come into view and the photo settles from a slight zoom. On a computer, hovering a card zooms its photo a little and draws a gold line under the title.
- Screen readers: the filter is a group of toggle buttons, and a polite status says how many transactions are shown after each change. Reduced motion: no movement. Without JavaScript all 22 cards show.

### Install (Designer, Track Record page)
1. Replace the two Collection Lists (`swiper-1` and `swiper-2`, with their arrows and dots) with one:
   - a Div Block with class `deals` and ID `deals`;
   - inside it, a Code Embed with `webflow/deals-filter-embed.html`;
   - then a Collection List of the same collection: Collection List class `deal-grid`, ID `deal-grid`, layout Grid, no item limit, same sort as today;
   - Collection Item class `deal` (no `swiper-slide`, `is-st` or `w-col` classes);
   - inside the item, the same card as today (`st-card-wrap`, `st-thumbnail-wrap`, `st-card-detail-wrap`, `st-price-wrap`, `st-features-wrap`, `st-features-card`) with three small changes: the location heading becomes an H3 with class `st-loc`; the amount becomes a Text Block with class `st-amt`; in each features card the label gets `st-k` and the value `st-v`;
   - after the list, a Code Embed with `webflow/deals-more-embed.html`.
2. Page settings > Custom code: paste `webflow/track-record-head.html` (4 KB) inside head and `webflow/track-record-footer.html` (6 KB) before the closing body tag. Delete the Swiper set-up script (`const slider1 = new Swiper(...)` to `slider2.controller.control = slider1;`) and, if nothing else on this page uses Swiper, the Swiper stylesheet link and script.
3. Region: the script reads it from the location line ("..., UK" or "London" is UK, "..., USA" is North America, the rest Europe). If a future deal does not fit that rule, add an Option field "Region" to the collection and bind a custom attribute `data-region` (values `uk`, `europe`, `na`) on the Collection Item.
4. Photos (recommended): the CMS photos are PNGs of 500 KB to 1 MB. `img/deals/*-lg.webp` are the same photos at 35 to 95 KB; uploading them to the 22 items cuts the photo weight by about 90%.
5. Optional: remove the "slide in" interaction from this section (the prototype holds it still so the cards' own entrance reads cleanly).

## 3. Checks run (all pass)
- Prototype, 31 checks: no pins on the map at rest; hovering each country shows its label and only its own pin; moving onto a pin keeps its country; a quick pass over a grey country keeps the label, a longer stay hides it; label hides when the pointer leaves; nothing shown under the map while screen readers get all seven figures; a click keeps a country shown and Escape clears it; phone tap and second tap; tap targets at least 44 px; four cards first on phones and 22 after "View all"; no sideways scrolling at 390; reduced motion (no pins at rest either); no JavaScript; axe-core 4.10: 0 violations; no console errors.
- Staging simulation: the saved live page with these files applied as above (live stylesheet, Webflow Collection markup, old map styles and Swiper removed): no errors; regions read from the location lines (16 UK, 5 Europe, 1 North America); three columns at 1440, one at 390; map fetched, entrance played, no pins at rest, Italy's pin and label on hover.

## 4. Test on staging
- [ ] Scroll to the map slowly: the countries light up one after another; scroll back up and down: no replay.
- [ ] At rest the map has no pins on it. Hover the UK: its pin drops in, then the label rises in. Move to France: the label glides across and the pins hand over. Nothing shows under the map.
- [ ] Phone: the map shows (not a flat picture); tap Italy: its pin and label show; tap again: cleared.
- [ ] Deals: six cards, filter Europe: five cards glide in; North America: one card; All: six again; "View all transactions": 22; "Show fewer": six, and the button is still under your finger.
- [ ] No hand cursor over grey countries.
