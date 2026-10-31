# Our Services: The Capital Stack, built as you scroll

Handoff for Shikhar (Webflow). Build in the Designer on the Our Services page, publish to the staging domain roscap-site.webflow.io first, and run the QA checklist at the end before the owner signs it off for roscap.co.uk.

## 1. What changes on the page

Only the "Our expertise" section changes. The static Capital Stack SVG becomes a live diagram that assembles layer by layer as the visitor scrolls, in the same order as today: Common Equity, Preferred Equity, Mezzanine Debt, Senior Debt. Each layer arrives together with a short narration on the left that ties it to a Roscap service. The Equity and Debt brackets and the risk and return axis draw in as their layers arrive. Nothing else on the page moves.

Reference files (prototype, not Webflow exports):

- Bundled prototype, open in a browser: `proto/dist/our-services-capital-stack.html`. Add `?cs=fallback` to the URL to see the no-scroll-driven-animation path.
- Source: `proto/our-services-capital-stack/index.html`, `capital-stack.css`, `capital-stack.js`.
- Paste-ready snippets: `proto/our-services-capital-stack/webflow-paste/` (head script, module CSS, module JS, module markup).

## 2. Technique, in one paragraph

The build is CSS scroll-driven animations, with no library. Each narration block on the left contains an invisible 1px wide, 30vh tall trigger. The trigger owns a named view timeline (`--cs-n1` to `--cs-n4`), exposed to the whole module through `timeline-scope` on the module wrapper. The layers, bracket segments and axis segments inside the sticky card animate on those timelines over `animation-range: entry 0% entry 100%`, so every layer takes exactly 30vh of scroll to build, whatever the length of its text, and it unbuilds when the visitor scrolls back. A 5 KB script handles state only: which layer is current (`aria-current`), the polite live region, the layer buttons that scroll to their narration, keyboard arrows, and, in browsers without scroll-driven animations, an IntersectionObserver that toggles `.is-on` classes so CSS transitions build the stack step by step. With `prefers-reduced-motion: reduce` the page shows the completed stack and the four narrations with no choreography. Without JavaScript the HTML is the completed stack. The visitor's scroll is never hijacked: the card is `position: sticky`, nothing is pinned by script, and no smooth-scroll library is involved.

Why not GSAP here: Our Services does not load GSAP today (Home does, through page custom code), the choreography is 4 opacity and transform tweens that CSS runs on the compositor, and the whole module costs 7.6 KB of code against roughly 115 KB for GSAP plus ScrollTrigger. See section 5 for the Interactions-panel alternative if you would rather build it without code.

Browser support for the CSS path: Chrome and Edge 115+ (`timeline-scope` 116+), Safari 26+, Firefox 159+, about 88 percent of users. Everyone else gets the IntersectionObserver path, which looks the same but steps rather than scrubs.

## 3. Element structure and class names

Webflow-native elements throughout. Classes are the ones the CSS targets; keep them exactly. Attributes in brackets are set in Element settings, Custom attributes.

```
Section .sec .pg .cs-sec  [id=expertise]
  Div .container
    Div .cs  [id=capital-stack]                      module wrapper (grid on desktop, block below 992px)
      Div .stack .cs-intro                           tag pill, H2, gold divider, 3 paragraphs (existing content)
      Div .cs-stage                                  position: sticky; the card
        Div .cs-card
          H3 .cs-title                               "The Capital Stack"
          Div .cs-diagram                            4-column grid: bracket | layers | axis | labels
            Div .cs-bracket .is-equity  [aria-hidden=true]
              Div .cs-seg  [data-on=1]
              Div .cs-seg  [data-on=2]
              Div .cs-bracket-label  [data-on=1]     "Equity"
            Div .cs-bracket .is-debt  [aria-hidden=true]
              Div .cs-seg  [data-on=3]
              Div .cs-seg  [data-on=4]
              Div .cs-bracket-label  [data-on=3]     "Debt"
            Div .cs-layers  [role=group] [aria-label=Capital stack layers, top to bottom. Select a layer to read how Roscap works in it.]
              Button .cs-layer .is-common     [type=button] [data-on=1] [data-i=1] [aria-controls=cs-note-1]
                Span .cs-layer-t                     "Common Equity"
              Button .cs-layer .is-preferred  [type=button] [data-on=2] [data-i=2] [aria-controls=cs-note-2]
              Button .cs-layer .is-mezz       [type=button] [data-on=3] [data-i=3] [aria-controls=cs-note-3]
              Button .cs-layer .is-senior     [type=button] [data-on=4] [data-i=4] [aria-controls=cs-note-4]
            Div .cs-axis  [aria-hidden=true]
              Div .cs-seg  [data-on=1] ... Div .cs-seg  [data-on=4]
            Paragraph .cs-axis-label .is-top     [data-on=1] [aria-hidden=true]   "High risk, High return" (line break between)
            Paragraph .cs-axis-label .is-bottom  [data-on=4] [aria-hidden=true]   "Low risk, Low return"
        Paragraph .sr  [id=cs-live] [aria-live=polite]   visually hidden live region, empty
      Div .cs-steps
        H3 .cs-steps-h                               "Where Roscap works in the stack"
        List (ordered) .cs-notes
          List item .cs-note  [id=cs-note-1]
            Div .cs-trigger  [aria-hidden=true]      empty, absolutely positioned, 30vh tall
            Paragraph .cs-note-k                     Span .cs-note-n "1" + "Common Equity"
            H4 .cs-note-h                            service title
            Paragraph .cs-note-p                     narration
            Link .cs-note-a  [href=#equity or #debt] "Equity and co-investment" / "Real estate debt advisory" + arrow icon
          List item .cs-note  [id=cs-note-2] ... [id=cs-note-4]
```

`data-on="N"` means "this part is built once layer N has arrived". The layer buttons, the two bracket segments per bracket, the four axis segments, the bracket labels and the two axis labels all carry it. The script reads it in fallback mode; the CSS maps it to a timeline.

DOM order matters: intro, then stage, then steps. On desktop the grid places the stage in the right column spanning both rows; below 992px the wrapper is `display: block`, so the card sits between the intro and the narrations and stays sticky under the nav while the narrations scroll beneath it.

Webflow Designer settings that replace CSS where you prefer the panel: `.cs-stage` Position Sticky, Top `calc(var(--nav-h) + 56px)` on desktop and `calc(var(--nav-h) + 10px)` below 992px (6px below 768px); `.cs` Grid 2 columns on desktop; `.cs-card` background #FFF8E6, 1px border rgba(225,201,121,.6), radius 8px. Everything under "motion paths" in the CSS has to be code.

## 4. Where the code goes

Webflow custom code fields take 50,000 characters each (site head and footer, page head and before body, Code Embed; Help Center, September 2026). Our pieces are far below that.

| Piece | Where | Size |
| --- | --- | --- |
| Mode script (sets `data-cs-mode` on `<html>` before first paint) | Page settings, Custom code, Inside `<head>` tag, first | 781 characters |
| Module CSS, wrapped in `<style>` | Page settings, Inside `<head>` tag, after the mode script | 12,274 characters |
| Module JS, wrapped in `<script defer>` or placed before `</body>` | Page settings, Before `</body>` tag | 5,131 characters |

The mode script must run before the page paints, so it goes in the head and not in the footer. The CSS relies on the site tokens already used by the live stylesheet (`--teal`, `--gold-ink`, `--ink`, `--black2`, `--grey`, `--cream-deep`, `--line`, `--ease`, `--f-body`, `--f-display`, `--nav-h`); if the live site does not define them as custom properties, replace each `var()` with the hex value from the prototype's base.css.

### 4.1 Mode script (head)

```html
<script>
(function () {
  var h = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var forced = /(\?|&)cs=fallback(&|$)/.test(location.search);
  var css = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()') && CSS.supports('timeline-scope: --cs-n1'));
  h.setAttribute('data-cs-mode', reduce ? 'static' : (css && !forced ? 'css' : 'fallback'));
})();
</script>
```

### 4.2 Module CSS (head)

Paste `webflow-paste/module.css` inside a `<style>` tag. It has 4 parts: tokens (`:root` with the tuning knobs), layout (`.cs-*`), the 3 motion paths (`@supports` block for CSS scroll-driven animations, `html[data-cs-mode="fallback"]` transitions, `@media (prefers-reduced-motion: reduce)` safety net), and the responsive overrides. The parts you are most likely to tune:

```css
:root{
  --cs-h:80px;        /* layer height (72px under 1180px, 60px under 992px, 44px under 768px) */
  --cs-g:12px;        /* gap between layers */
  --cs-inset:30%;     /* a layer starts building when its narration's top crosses 70% of the viewport (78% on mobile) */
  --cs-run:30vh;      /* scroll distance one layer takes to build */
  --cs-line:.52;      /* viewport fraction where a narration becomes current (aria-current); .58 on mobile */
  --cs-anchor:.42;    /* where a narration lands when its layer button is pressed; .5 on mobile */
  --cs-ghost:#56706C; /* unbuilt layer label, 5.0:1 on the card's cream */
}
```

The heart of the CSS path, for reference:

```css
@supports (animation-timeline: view()) and (timeline-scope: --cs-n1) {
  html[data-cs-mode="css"] .cs{timeline-scope:--cs-n1,--cs-n2,--cs-n3,--cs-n4}
  html[data-cs-mode="css"] .cs-trigger{view-timeline-axis:block;view-timeline-inset:0 var(--cs-inset)}
  html[data-cs-mode="css"] .cs-note:nth-child(1) .cs-trigger{view-timeline-name:--cs-n1}   /* ... to 4 */
  html[data-cs-mode="css"] [data-on="1"]{--tl:--cs-n1}                                        /* ... to 4 */
  html[data-cs-mode="css"] .cs-layer::before{animation:cs-fill var(--ease) both;animation-timeline:var(--tl);animation-range:entry 0% entry 100%}
  html[data-cs-mode="css"] .cs-layer-t{animation:cs-ink linear both;animation-timeline:var(--tl);animation-range:entry 10% entry 90%}
  html[data-cs-mode="css"] .cs-seg::before{animation:cs-draw linear both;animation-timeline:var(--tl);animation-range:entry 0% entry 100%}
}
@keyframes cs-fill{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes cs-ink{from{color:var(--cs-ghost)}to{color:var(--on)}}
@keyframes cs-draw{from{transform:scaleY(0)}to{transform:none}}
```

### 4.3 Module JS (before body end)

Paste `webflow-paste/module.js` inside `<script>`. It is the whole of `capital-stack.js`: no dependencies, no build step, 5,131 characters. It does nothing harmful if the markup is missing (it returns early).

## 5. Webflow-native versus code

| Part | Native | Code |
| --- | --- | --- |
| Section, grid, sticky card, typography, colours, radii, borders | Designer | |
| Layer buttons (Button element, type button), group role, aria attributes, data attributes | Designer, Custom attributes | |
| Ordered list of narrations, anchor links to #debt and #equity | Designer | |
| Layer and bracket build on scroll, ghost state, current marker | | CSS (head) |
| aria-current, live region, keyboard arrows, scroll-to-layer, IntersectionObserver fallback | | JS (footer) |
| Reduced-motion static state | | mode script + CSS |

Alternative without custom CSS: Webflow's native Interactions with GSAP now include ScrollTrigger with scrubbing and pinning, staggers, SplitText, and a per-interaction prefers-reduced-motion choice (no animation, or skip to end). You could build the 4 arrivals in the panel: 4 "while scrolling in view" interactions, each triggered by one narration block (start when its top hits 70 percent of the viewport, end at 40 percent), animating that layer's fill opacity and 14px rise plus its bracket and axis segments (scaleY 0 to 1), with the sticky card unchanged. Set each one's reduced-motion option to skip to end. What the panel cannot do is the button behaviour, aria-current and the live region, so the JS stays either way, and this route loads GSAP and ScrollTrigger on Our Services. Our recommendation is the CSS path above; the panel route is the fallback if the owner prefers everything editable in the Designer.

## 6. Copy to enter

Narration blocks (new copy for the owner's approval; British English, no em dashes, no numbers invented):

1. Common Equity. Title: "Joint venture equity and co-investment". Text: "The top of the stack: the position that takes the first loss and carries the upside. Roscap raises joint venture equity and arranges direct co-investment for developers, sponsors and family offices, in shared-risk structures with aligned upside and objectives that stay consistent from entry to exit." Link: "Equity and co-investment" to #equity.
2. Preferred Equity. Title: "Preferred equity". Text: "Sits behind the senior lender and ahead of the common equity. Roscap structures fixed-return positions behind senior debt with potential profit participation, typically used to reduce the sponsor's own equity requirement while the senior facility stays conventional." Link: "Equity and co-investment" to #equity.
3. Mezzanine Debt. Title: "Mezzanine finance". Text: "The top of the debt. Roscap arranges mezzanine finance as subordinated capital to enhance leverage or bridge equity requirements, negotiated alongside the senior facility so that the intercreditor terms work for both lenders and the sponsor." Link: "Real estate debt advisory" to #debt.
4. Senior Debt. Title: "Development finance, bridging finance, and commercial and BTL mortgages". Text: "The foundation of the stack, secured by a first charge over the asset. This is where most of Roscap's debt advisory sits: development finance for ground-up, conversion or renovation projects, bridging finance for acquisitions, refinancing or equity release, and income-based term lending for stabilised assets. Stretch-senior facilities sit here too, taking the senior position further up the stack." Link: "Real estate debt advisory" to #debt.

Steps heading: "Where Roscap works in the stack". Live region text pattern (set by the script): "Preferred Equity, layer 2 of 4. Preferred equity".

Two tidy-ups elsewhere on the page, already in the prototype: the Equity and Co-Investment intro repeats its first sentence on the live page, use it once; the closing line of the equity band has an em dash, make it "We focus on transparency and alignment between sponsor and investor, ensuring objectives are consistent from entry to exit."

## 7. Accessibility, reduced motion, mobile

- Layers are real buttons, 80px tall on desktop and 44px on mobile, so tap targets stay at 44px or more. Tab reaches each layer; Enter or Space scrolls the page so that layer's narration lands at the anchor line and the layer builds; Up, Down, Left, Right, Home and End move between layers and activate them. `aria-current="true"` marks the current layer and a visually hidden `aria-live="polite"` paragraph announces "Name, layer N of 4. Service title".
- Colour: white text only on the 2 teal layers; dark ink (#12161D) on gold and pale gold. Unbuilt labels use #56706C, 5.0:1 on the cream card. Gold #E1C979 is 1.6:1 on cream, so it is never used for text or as the only state or focus indicator on cream: the current-layer diamond and the active narration rule use the darker gold #7A6318 (5.6:1), and focus rings on light backgrounds are 2px teal with a 3px offset (gold rings stay on the dark bands and nav, where gold on teal is 8.3:1).
- Reduced motion: the mode script sets `data-cs-mode="static"`, no rule animates or transitions, the completed stack and all four narrations show statically. The `@media (prefers-reduced-motion: reduce)` block repeats this in CSS in case the script is ever removed. The script also switches to static if the visitor turns reduced motion on while the page is open.
- No JavaScript: the HTML is the completed stack with all four narrations. The build only ever subtracts from the static state, so nothing is hidden by default.
- Mobile (767px and below): no tall pin. The card becomes compact (44px layers, 6px gaps, 11px labels), sticks 6px under the 64px nav and occupies about 39 percent of a 390 by 844 viewport; the narrations scroll beneath it and build their layers as they rise past 78 percent of the viewport. No horizontal overflow: `scrollWidth` is 390 at 390px wide. Tablet (768 to 991px) is the same single column with a 60px-layer card, maximum width 640px, centred.
- Layout shift: zero from the module. Layer rows have fixed heights, the fill is a pseudo-element, the build changes only opacity, transform and colour.

## 8. Performance

- Added to the page: module CSS 12.3 KB raw (whole page stylesheet 20.5 KB raw, 5.6 KB gzip) and JS 5.1 KB raw (2.0 KB gzip). No images were added for the module; the SVG graphic it replaces is no longer needed. No library, no fonts beyond the site's Boska and Switzer.
- Animated properties are opacity, transform and colour only; the sticky card is one layer. No scroll listeners in the CSS path except `scrollend`, which fires once per scroll; the fallback uses one IntersectionObserver on 4 elements.
- The bundled prototype is 579,166 bytes (566 KB) in one file: 5 woff2 fonts, the hero photograph (what-we-do-thames.webp, 167 KB), the small hero poster from the shared stylesheet, 9 SVG icons and logos, and about 70 KB of HTML, CSS and JS. No video.
- Below-the-fold images carry `loading="lazy"` and explicit width and height.

## 9. Assumptions

- Hero photograph: the live page's construction photograph was not in the shared image set, so the prototype uses the Thames aerial with the same teal overlay. Keep the live photograph in Webflow.
- Card icons: 3 debt and equity icons and 4 asset-class icons were not in the shared set and are drawn as simple gold line SVGs in the prototype; keep the live SVGs in Webflow.
- Layer colours sampled from the live graphic: Common Equity #043435, Preferred Equity #044446, Mezzanine Debt #E1C979, Senior Debt #FFEBAA, card #FFF8E6.
- Narration copy is new and describes the position of each layer in general terms with no figures, rates or ratios; "typically used to reduce the sponsor's own equity requirement" (Preferred Equity) and "secured by a first charge" (Senior Debt) are the two statements the owner should confirm are how Roscap wants the products described.
- Per the owner's decision, the page carries no enquiry form, phone number or visible email; the existing "Get in Touch" buttons link to /contact-us and the footer newsletter form stays as it is on the live site.
- The scroll distance between narrations (about 32vh plus the text) sets the pace; it is deliberately calm and can be tightened by lowering the `.cs-notes` gap.

## 10. QA checklist (staging, roscap-site.webflow.io)

1. Chrome, Safari 26 and Firefox 159 or later: scroll through the section once at normal speed. Layers fill in order, each over roughly 30vh of scroll; brackets and axis draw as their layers arrive; the diamond marker sits beside the current layer; scrolling back up unbuilds in reverse.
2. Chrome with `?cs=fallback` appended (or an older Safari): same result, stepped rather than scrubbed, no console errors.
3. DevTools, Rendering, Emulate prefers-reduced-motion: the completed stack shows immediately and nothing moves; `<html>` has `data-cs-mode="static"`.
4. Disable JavaScript: the completed stack and all four narrations show.
5. Keyboard only: Tab to the first layer, press Enter, then Down, Down, End, Up. Focus follows the arrows, the page scrolls with each press, `aria-current` moves, and a screen reader hears "Name, layer N of 4. Title".
6. 390px wide: no horizontal scroll, card sticks under the nav, every label fits, 44px layers.
7. 820px wide: single column, card centred, narrations beneath.
8. Lighthouse accessibility on staging has no colour-contrast or heading-order findings (the prototype passes axe-core with 0 violations at 1440px and 390px, at the top of the page and mid-module).
9. The prototype label (fixed pill, bottom right) is prototype-only; do not add it to Webflow.
10. Publish to staging only; the owner approves on staging before roscap.co.uk.
