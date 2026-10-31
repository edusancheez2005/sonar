# Partner Program page: Webflow handoff

For Shikhar. Build on staging (roscap-site.webflow.io) first. Prototype: `proto/dist/partner-program.html` (single file, open locally), source in `proto/partner-program/`.

Brand tokens used: cream `#FFFCF5`, cream deep `#FFF8E6`, teal `#043435`, teal deep `#022526`, gold `#E1C979`, gold ink `#7A6318` (labels on cream; plain gold text on cream fails contrast at 1.6:1), ink `#12161D`, grey `#61656E`. Display: Boska 500 italic. Body: Switzer 300/400/500. Easing `cubic-bezier(.22,.61,.36,1)`.

## 1. Page structure (top to bottom)

| # | Section | Webflow build | Classes (prototype names, map to site naming) |
|---|---------|---------------|-----------------------------------------------|
| 1 | Hero, split: copy left on teal, image right, "Who we work with" strip across the bottom | Designer-native. Section > Grid (7fr / 5fr, min-height 100svh). Image: `who-we-are-columns.webp` (already in Assets), cover, object-position 70% 50%, two overlay divs (teal at 55% with blend mode Color; gradient left to right). Strip is a second grid row spanning both columns | `p-hero`, `p-hero-copy`, `p-hero-h` (H1), `p-hero-p`, `p-hero-cta`, `p-hero-media`, `who`, `who-h` (H2), `who-list` |
| 2 | Why partner with Roscap: centred header, 4 benefit columns with 2px gold top rule, two CTAs | Designer-native. Reuse existing `section`, `container`, `button golden`. The 4 icons are the existing `pr-icon` SVGs | `sec-head`, `why-grid` (4 cols, 2 at tablet, 1 at mobile), `why`, `why-icon`, `why-cta` |
| 3 | How the partner program works: teal band, sticky left column (tag, H2, lead, 6-item step indicator, brochure link), vertical 6-step timeline right, one visual card per step | Designer-native layout + custom code for the reveal. Sticky: position sticky, top = nav height + 2rem (Designer supports this). Step cards are plain divs (no images). Reveal and indicator: Embed CSS + JS below | `how`, `how-grid`, `how-aside`, `how-nav`, `steps`, `step`, `step-seg`, `step-dot`, `step-copy`, `step-num`, `vis`, `vis-card` |
| 4 | Trust: "Firms that introduce clients to Roscap" + "What you can expect" list left, logo grid right (4 x 2, hairlines, caption only where evident from the logo) | Designer-native. Existing 8 logo assets | `trust-grid`, `trust-copy`, `expect-h`, `expect`, `logos` |
| 5 | Partner form card (teal, wave texture at 22% opacity) | Designer-native Form Block. See section 3 | `pform-wrap` (reuse `contact-banner-wrap` styling), `pform`, `pf`, `pf-check`, `pf-privacy`, `pform-done` (`w-form-done`), `pform-fail` (`w-form-fail`) |
| 6 | Footer | Existing symbol, unchanged. Disclaimer text unchanged | |

Remove from the current page: the 6-card slider (`section-copy-me-join`, `joinslidersliddd`), the brochure pop-up form (`leadgen-popup-overlay`, form with PDF redirect) and the hidden `section bg-green hide` timeline (`pr-timeline-wrap`). The generic contact form at the bottom is replaced by the partner form.

Heading order: one H1 (hero). H2: Who we work with (visually small), Why partner with Roscap, How the partner program works, Firms that introduce clients to Roscap, form heading. H3: the 4 benefits, the 6 steps, "What you can expect". Footer column titles are H3 (currently H4 on the live site, which trips axe heading-order).

## 2. Motion: what goes where

Designer Interactions panel (native, GSAP-based):
- Section reveals (`.rv` in the prototype): "Scroll into view" trigger, fade + move up 22px, 0.9s, play once. Tick the interaction's reduced-motion option.
- Hero entrance: "Page load" trigger, staggered fade on tag, H1, paragraph, CTAs (0.08s stagger), image scale 1.05 to 1 over 1.8s.
- The step indicator highlight can be done in the panel with "While scrolling in view" per step, but the JS below is simpler and keeps the active state in sync with the CSS reveal.

Custom code (page settings > head, limit 50,000 characters each for head and footer; the whole block below is under 3,000):
- Timeline reveal uses CSS scroll-driven animations (`animation-timeline: view()`) inside `@supports`, with an IntersectionObserver fallback for Safari and Firefox. No library. No scroll-jacking. Every step is fully visible once it is 55% inside the viewport, so nothing is hidden behind scrolling tricks.
- Under `prefers-reduced-motion: reduce` nothing animates and everything is visible. Without JS everything is visible.

### CSS to paste (page head, inside `<style>`)

```css
[hidden]{display:none !important}
ol{list-style:none;margin:0;padding:0}
html{scroll-padding-top:calc(72px + 1rem)}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
.how-aside{position:sticky;top:calc(72px + 2rem);align-self:start}
.step{position:relative}
.step-seg{position:absolute;left:11px;top:0;bottom:0;width:1px;background:rgba(225,201,121,.55);transform-origin:top}
.step-dot{position:absolute;left:0;top:calc(2.5rem + 2px);width:23px;height:23px;border-radius:50%;border:1px solid #E1C979;background:#043435;display:grid;place-items:center}
.step-dot::after{content:"";width:9px;height:9px;border-radius:50%;background:#E1C979;transform:scale(0);transition:transform .5s cubic-bezier(.22,.61,.36,1)}
.step.is-in .step-dot::after{transform:scale(1)}
.how-nav li.is-active a{color:#fff}
.how-nav li.is-active a span{opacity:1}
.how-nav li.is-active a::after{content:"";margin-left:auto;width:22px;height:1px;background:#E1C979}
@supports (animation-timeline: view()){
  @media (prefers-reduced-motion:no-preference){
    .step-copy,.step .vis{animation:step-in linear both;animation-timeline:view();animation-range:entry 12% entry 55%}
    .step .vis{animation-range:entry 20% entry 65%}
    .step-seg{animation:seg-grow linear both;animation-timeline:view();animation-range:entry 0% entry 80%}
    .step-dot::after{transition:none;animation:dot-in linear both;animation-timeline:view();animation-range:entry 30% entry 50%}
  }
}
@supports not (animation-timeline: view()){
  @media (prefers-reduced-motion:no-preference){
    html.js .step .step-copy,html.js .step .vis{opacity:0;transform:translateY(26px);transition:opacity .8s cubic-bezier(.22,.61,.36,1),transform .8s cubic-bezier(.22,.61,.36,1)}
    html.js .step .vis{transition-delay:.12s}
    html.js .step.is-in .step-copy,html.js .step.is-in .vis{opacity:1;transform:none}
    html.js .step .step-seg{transform:scaleY(0);transition:transform 1s cubic-bezier(.22,.61,.36,1)}
    html.js .step.is-in .step-seg{transform:none}
  }
}
@keyframes step-in{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
@keyframes seg-grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes dot-in{from{transform:scale(0)}to{transform:scale(1)}}
@media (max-width:991px){.how-aside{position:static}.how-nav{display:none}}
```

### JS to paste (page footer, before `</body>`, inside `<script>`)

```js
(function(){
  var root=document.documentElement; root.classList.add('js');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var steps=[].slice.call(document.querySelectorAll('.step'));
  var items=[].slice.call(document.querySelectorAll('.how-nav li'));
  if(reduce||!('IntersectionObserver' in window)){steps.forEach(function(s){s.classList.add('is-in')});}
  else{
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -12% 0px',threshold:.12});
    steps.forEach(function(s){io.observe(s)});
  }
  function setActive(id){items.forEach(function(li){var a=li.querySelector('a');var on=a&&a.getAttribute('href')==='#'+id;li.classList.toggle('is-active',on);if(a){on?a.setAttribute('aria-current','step'):a.removeAttribute('aria-current')}})}
  if(steps.length&&items.length&&'IntersectionObserver' in window){
    var cur=null,io2=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)cur=e.target.id});if(cur)setActive(cur)},{rootMargin:'-40% 0px -45% 0px',threshold:0});
    steps.forEach(function(s){io2.observe(s)}); setActive(steps[0].id);
  }
  var brochure=document.getElementById('pf-brochure');
  [].forEach.call(document.querySelectorAll('[data-brochure]'),function(a){a.addEventListener('click',function(){if(brochure)brochure.checked=true})});
  var form=document.querySelector('.pform');
  if(form){form.addEventListener('submit',function(e){var hp=document.getElementById('pf-website');if(hp&&hp.value){e.preventDefault();e.stopImmediatePropagation();form.reset();}},true);}
})();
```

Element requirements for the code to attach: steps are `<li class="step" id="step-1">` to `step-6` inside `<ol class="steps">`, each containing `.step-seg`, `.step-dot`, `.step-copy`, `.vis`. Indicator is `<nav class="how-nav"><ol><li><a href="#step-1">` etc. Brochure links carry the custom attribute `data-brochure`.

## 3. Partner form spec

Webflow Form Block, name "Partner Form", method POST (Webflow default), redirect URL `/contact-us-success`. Replace both the brochure pop-up form and the generic contact form. Every input has a visible Label element (not placeholder-only). Required marker: asterisk inside the label, with the note "Required fields are marked with an asterisk" above the fields.

| Label | name | Type | Required | autocomplete | Notes |
|-------|------|------|----------|--------------|-------|
| Full name | `name` | text | yes | `name` | maxlength 256 |
| Company | `Company` | text | yes | `organization` | |
| Role | `Role` | select | yes | `organization-title` | Options: Broker, Solicitor, Accountant, Architect or Designer, Estate or Letting Agent, Wealth Manager, Other. First option "Select your role" with empty value |
| Email | `email` | email | yes | `email` | inputmode email |
| Phone (optional) | `Phone` | tel | no | `tel` | inputmode tel |
| Message (optional) | `Message` | textarea | no | | placeholder "The kind of clients you work with, or a current requirement", maxlength 5000 |
| Send me the partner brochure as well | `Brochure` | checkbox, value Yes | no | | Replaces the separate brochure form. Links with `data-brochure` pre-tick it |
| Website (honeypot) | `website` | text | no | off | Wrapper positioned off screen (`left:-10000px`), `tabindex="-1"`, `aria-hidden="true"` on the wrapper. Webflow has no server-side honeypot; the JS above blocks the submit client-side when it is filled. Keep Webflow reCAPTCHA off unless spam appears; if a filter is needed, route notifications through Make/Zapier and drop submissions where `website` is not empty |

Privacy line under the checkbox: "By submitting this form you agree to the privacy policy. We use your details only to respond to your enquiry." Link to `/privacy-policy`.

Submit button text: "Become a partner". Waiting text: "Please wait".

Success (`w-form-done`, `role="status"`): "Thank you. Your details have been received and a member of the Roscap team will be in touch to arrange a conversation." If the brochure box was ticked, follow with "We will send the partner brochure with our reply." (Webflow cannot vary the message natively; either keep one message that covers both, or send the PDF from the notification workflow.)

Error (`w-form-fail`, `role="alert"`): "Something went wrong and your message was not sent. Please try again, or email info@roscap.co.uk."

Form notification: send to the same inbox as the contact form; include the Role field in the subject so partner enquiries can be filtered.

## 4. Claims to confirm with Clemente

Every item below is marked in the prototype source with `<!-- CONFIRM WITH CLEMENTE -->` or `<!-- COMPLIANCE REVIEW -->`.

| Current wording (live site) | Risk | Prototype wording | Alternative if not confirmed |
|---|---|---|---|
| "Join hundreds of current partners" | Quantitative claim; owner unsure it is accurate | Removed | Keep removed, or "Join the firms already introducing clients to Roscap" |
| "Earn an additional recurring revenue stream with minimal work" | Reads as an income promise; "recurring" and "minimal work" are not defensible | "A referral fee on completed transactions. Paid when a transaction you introduced completes, on the terms set out in the partner agreement." Flagged COMPLIANCE REVIEW | "Referral fees on transactions that complete, as agreed in writing" |
| "receive commissions in perpetuity" | Absolute claim; owner unsure | "If Roscap goes on to complete subsequent transactions with the same client, you receive a referral fee on those as well, as set out in the partner agreement." | "Fees on repeat transactions for the period set out in the partner agreement" |
| "Exclusively refer clients to Roscap" | Programme condition; must match the agreement | "you introduce them to Roscap on an exclusive basis" | Drop "exclusive" if the agreement does not require it |
| "Upon deal completion, receive your referral commissions" | Timing and basis of payment | "Once the transaction completes, the referral fee is calculated and paid on the terms set out in the partner agreement." | Add "within [n] days of completion" only if that is contractual |
| New: "followed by the partner agreement" (step 01) and "Fee terms are set out in writing before the first introduction" | Assumes a written agreement exists for every partner | As stated | "Terms are confirmed in writing" |
| New: "Every introduction is handled in confidence" | Commitment not stated on the live site | As stated | Remove the line |
| New: "Your client relationship remains yours" | Commitment not stated on the live site | As stated | "We keep you informed throughout" |
| New: "A named contact at Roscap for every introduction" | Operational promise | As stated | Remove the line |
| New (optional, not in prototype): "No cost to the client for the introduction" | Only true if the client pays nothing extra because of the referral | Not used | Add only if confirmed [CONFIRM] |
| New (optional, not in prototype): response pledge, e.g. "We reply within 1 working day" | Time-bound promise | Not used | Add only if the team commits to it [CONFIRM] |
| "Roscap has arranged over £120m of real estate finance" | Figure taken from the live About Us page; must be current | Used once in the Why section, flagged | Remove the number: "Roscap has arranged transactions across the UK, Europe and North America" |
| Logo captions: ANYO "Architects and interior designers", Capio Consult "Accounting and tax", Design Space 2 "Architecture", Cambridge Finance "Finance" | Taken from text inside the logos themselves | As stated; other 4 logos have no caption | Remove any caption the firm objects to; confirm all 8 firms have agreed to appear |

Compliance flag for the whole page: introductions and referral fees sit close to regulated territory (RAO article 33 introducing exclusion; FCA PERG 8.33 on introducers). Wording should be checked by Roscap's regulatory adviser before publishing. Nothing on the page may imply FCA authorisation or regulated advice; the footer disclaimer is unchanged. Avoid "earn", "income", "guaranteed", "passive" and any fee percentage on the page.

## 5. Reduced motion and mobile

- Reduced motion: hero, section reveals and timeline are static and fully visible (verified with emulated `prefers-reduced-motion: reduce`: all step opacities 1, no running animations). Tick the reduced-motion option on every Designer interaction.
- Mobile (390): hero stacks image (46svh, max 420px) above copy; "Who we work with" shows the 6 professions in 2 columns without descriptors; benefits stack; the step indicator is hidden and the aside is static; each step shows copy then its visual card at full width; logos 2 columns; form single column with full-width button. No horizontal overflow (scrollWidth 390).
- Tap targets: all new controls are at least 44px tall (links, checkbox label, contact links). Shared nav links (desktop only) and footer links come from site components; footer links are set to 44px rows on mobile in this page's CSS and should be fixed site-wide.

## 6. Performance

- No new libraries. The prototype loads base CSS, one page CSS, one small JS. The live page can drop Swiper and the pop-up code.
- Hero image: existing `who-we-are-columns.webp` (90 KB, 660 x 646), `fetchpriority="high"`, explicit width/height. Serve a 1320px version for retina if available.
- Everything below the fold is `loading="lazy"` with width/height set (icons, logos, wave texture).
- Wave texture re-encoded at 900px, 6 KB. Logos: 8 files, 143 KB total; ask the firms for SVG or transparent PNG at 2x where the current files are soft (RYRE, Capio).
- Bundled prototype: 641,274 bytes including all fonts and images (limit 1.5 MB).
- No video on this page.

## 7. Assumptions

- The partner agreement exists as a written document and governs fee basis, timing and exclusivity. If not, soften the three lines that reference it (see table).
- Brochure delivery is manual (or via the notification workflow) rather than an instant PDF download, because the current PDF redirect bypasses the form confirmation and leaks the file URL. If instant download is wanted, keep the checkbox and redirect only brochure requests to the PDF via a small custom script.
- Logos stay as a static grid (no marquee). If a marquee is added later: CSS only, pause on hover and focus, a visible pause button (WCAG 2.2.2), static under reduced motion.
- The contact email and phone shown in the form card are the ones on the live Contact page.
- Social URLs are the ones in the live footer code.

## 8. QA checklist (staging)

- [ ] One H1; heading order H1 > H2 > H3 with no skips (footer titles H3).
- [ ] Nav highlights Partner Program; both CTAs scroll to `#partner-form`; "How it works" scrolls to `#how-it-works` with the sticky nav offset.
- [ ] Timeline: steps reveal on scroll in Chrome and Edge (native), Safari and Firefox (fallback); indicator follows the active step; indicator links scroll to each step.
- [ ] Reduced motion (OS setting): no animation, all content visible.
- [ ] Keyboard: Tab reaches every field in order (Full name, Company, Role, Email, Phone, Message, Brochure, privacy link, Submit); honeypot is skipped; focus ring visible on teal and on cream.
- [ ] Form: submit with empty required fields shows browser validation; valid submit redirects to `/contact-us-success`; notification email includes Role and Brochure; success and error messages match the copy above.
- [ ] Brochure links pre-tick the checkbox.
- [ ] axe DevTools: 0 serious or critical issues.
- [ ] 390px width: no horizontal scroll; tap targets 44px.
- [ ] Lighthouse mobile: LCP element is the hero image or H1; no layout shift from images without dimensions.
- [ ] All CONFIRM items in section 4 signed off by Clemente before publishing.
