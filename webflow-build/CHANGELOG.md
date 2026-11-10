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

## Publishes

| When (UTC) | Where | What |
|---|---|---|
| 10 Nov 2026 | Staging only | The switch (check that it works) |
| 10 Nov 2026 | Staging only | Our Services pilot |

The live domains were last published on 17 Oct 2026, before this work started.

## After go-live: clean-up (later, with a fresh backup)
- Delete the elements marked `data-rc="old"`, and remove the `data-rc` attributes from the new ones.
- Replace each `data-rc-class` with a real class, then drop the switch checks from the page code.
- Remove the replaced interactions in the Interactions panel.
- Remove the switch from the site head.
