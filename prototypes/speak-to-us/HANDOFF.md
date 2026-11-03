# Speak to us v2 (/contact-us): handoff for Shikhar

Prototype, one file you can open in a browser: `speak-to-us.bundle.html`.
Source: `prototypes/speak-to-us/` (`index.html`, `speak.css`, `speak.js`, `img/`).
Build on staging (roscap-site.webflow.io) first, check it with the list in section 7, then publish to www.roscap.co.uk.

The owner prefers the current page to the earlier redesign, so this version keeps the live page exactly as it is and makes three changes only. Nothing else on the page moves.

## 1. What changes versus live

| Area | Live today | Change |
| --- | --- | --- |
| Contact line under the heading | `div.c-social-wrap`: email and Instagram links on one line. A phone link is on the page but hidden (combo class `hide`). | The same line in the same live style (gold line icon, white Switzer 500), now with all four contacts two by two: email, phone, WhatsApp, Instagram; text 16 px instead of 14 px. The phone number becomes visible. WhatsApp is new. |
| FAQs | Heading "FAQs" plus 5 large Webflow Dropdowns (`.faqs-acc`, white cards, 22px questions) | Same heading, untouched. The 5 Dropdowns become one compact accordion (native `details` and `summary`, one answer open at a time). Copy unchanged. FAQPage JSON-LD added to the page head. |
| Contact form | Placeholder-only fields, no labels, Subject set to the Phone text type (`type="tel"`), no autocomplete | Invisible fixes only: visually hidden labels, Subject as plain text, autocomplete on Name, Email and Phone, an off-screen honeypot. |

Unchanged: the section and its wave background, the heading text and style, the divider, the form look and spacing, the required fields, the "Submit" button, the success and error blocks, the redirect to `/contact-us-success`, the page title and description, the nav and the footer.

Live values measured with Playwright at 1440px and 390px wide on 31 Oct 2026 and matched in the prototype: heading Boska 500 at 40px/52px (24px/31.2px under 768px), left column 524px wide, 51px padding and 51px margin around the divider line (32px under 480px), inputs 72px tall with 24px padding and Switzer Light 18px (50px tall, 10px left padding and 16px under 480px), Message 136px tall, Submit 84 by 41px with a 28px top margin.

## 2. Change 1: the four contacts, in the live style

Where: inside `.contact-hero-left`, below the heading and divider, exactly where `div.c-social-wrap` sits today. The look stays the live one (gold line icon, white Switzer 500 text); the changes are that it now holds all four contacts, slightly larger (16 px text and 24 px icons instead of 14 px and 22 to 24 px), arranged two by two because four items do not fit on one line in that column.

| Item | Text shown | Link |
|---|---|---|
| Email | info@roscap.co.uk | `mailto:info@roscap.co.uk` (as live) |
| Phone | +44 7850 522789 | `tel:+447850522789`. This link already exists on live (`a.c-social-card.hide`) and is hidden by the `hide` combo class: remove `hide` and space the number |
| WhatsApp | WhatsApp | `https://wa.me/447850522789?text=...` (new tab). Confirm with Clemente that the number is on WhatsApp |
| Instagram | @roscap.uk | `https://www.instagram.com/roscap.uk/` (new tab, as live) |

Steps in Webflow (on /contact-us only):

1. In `div.c-social-wrap`, remove the `hide` class from the phone card and change its text to "+44 7850 522789".
2. Duplicate the phone card for WhatsApp: href `https://wa.me/447850522789?text=Hello%20Roscap%2C%20I%20would%20like%20to%20discuss%20a%20funding%20requirement.`, open in new tab, WhatsApp icon (the SVG below), text "WhatsApp". Order: email, phone, WhatsApp, Instagram.
3. Add the combo class `is-four` to `c-social-wrap` and paste the CSS from section 5 (it sets the two-by-two grid, 16 px text, 24 px icons, gold icon colour and a quiet gold underline on hover). Native Designer settings are equally fine: Grid 2 columns (auto width), gaps 12 px by 40 px (8 px by 28 px on mobile), text 16 px / 24 px weight 500.

Markup as in the prototype (for reference or for an Embed):

```html
<!-- CHANGED: the live .c-social-wrap (email and Instagram on one line; the phone link exists but is hidden by class "hide")
               now carries all four contacts in the same style: gold line icon, white Switzer 500, a little larger, two by two. -->
          <ul class="c-social-wrap is-four" aria-label="Direct contact">
            <li><a class="c-social-card" href="mailto:info@roscap.co.uk"><svg class="c-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg><span>info@roscap.co.uk</span></a></li>
            <li><a class="c-social-card" href="tel:+447850522789"><svg class="c-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg><span>+44 7850 522789</span></a></li>
            <!-- CONFIRM WITH CLEMENTE: +44 7850 522789 is on WhatsApp. If it is not, delete this item. -->
            <li><a class="c-social-card" href="https://wa.me/447850522789?text=Hello%20Roscap%2C%20I%20would%20like%20to%20discuss%20a%20funding%20requirement." target="_blank" rel="noopener"><svg class="c-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z"/><path d="M9 8.6c.3-.5.6-.5.9-.5h.4c.2 0 .4.1.5.4l.7 1.7c.1.2 0 .4-.1.6l-.5.6c-.1.2-.1.3 0 .5.6 1 1.4 1.8 2.4 2.4.2.1.4.1.5 0l.6-.6c.2-.2.4-.2.6-.1l1.7.8c.3.1.4.3.4.5v.4c0 .3-.1.6-.5.9-.5.4-1.2.6-1.9.5-1.6-.3-3-1.2-4.2-2.4S8.6 11.5 8.3 9.9c-.1-.5.1-1 .7-1.3z"/></svg><span>WhatsApp</span></a></li>
            <li><a class="c-social-card" href="https://www.instagram.com/roscap.uk/" target="_blank" rel="noopener"><svg class="c-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="3.9"/><circle class="dot" cx="17.1" cy="6.9" r=".7"/></svg><span>@roscap.uk</span></a></li>
          </ul>
```

## 3. Change 2: FAQ accordion

1. Keep `.heading-wrap.is-center` with `h2.heading-style-h1` "FAQs" exactly as it is (Boska italic, centred).
2. Replace `div.faqs-content-wrap` (the 5 `.faqs-acc` Dropdowns) with one Code Embed containing the markup below (2,693 characters). The copy is the live copy, verbatim, including the en dashes in "5–10" and "6–8" and the missing full stop at the end of the fifth answer.
3. Paste the CSS block and the footer script from section 5. `<details name="faq">` keeps one answer open at a time in current browsers; the script does the same in older ones.
4. Paste the FAQPage JSON-LD from section 5 into the page head code. If an answer is ever edited, edit it in both places.

Look: a 56rem column centred under the heading, 55px below it (the live gap), thin rgba(4,52,53,.14) lines between rows, questions in Switzer 500 18px ink #12161D (17px under 768px), a teal chevron that turns when open, answers in Switzer 300 17px grey #61656E (16px under 768px) with at most 68 characters per line. Closed rows are 68px tall (60px under 768px). The section keeps the live `.section` padding and cream background. At 1440px the FAQ section goes from 1,012px to 690px tall.

```html
<div class="acc">
  <details name="faq">
    <summary><span>What does Roscap do as a real estate capital advisory firm?</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div class="ans"><p>Roscap sources and structures property finance, including development finance, bridging loans, commercial mortgages, mezzanine finance, and preferred equity. We work with UK and international lenders to secure competitive terms for residential, commercial, and mixed-use real estate projects.</p></div>
  </details>
  <details name="faq">
    <summary><span>How quickly can Roscap arrange development finance or a bridging loan?</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div class="ans"><p>For urgent acquisitions, Roscap can secure bridging loans in as little as 5–10 working days, subject to valuation and legal readiness. Development finance and commercial mortgages typically complete within 6–8 weeks, depending on lender due diligence and asset complexity.</p></div>
  </details>
  <details name="faq">
    <summary><span>What types of projects and assets does Roscap fund?</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div class="ans"><p>We arrange funding for residential developments, BTR schemes, commercial buildings, mixed-use projects, hotel and leisure assets, industrial/logistics units, and specialist sectors such as supported living and student accommodation. We also fund international projects through our global capital network.</p></div>
  </details>
  <details name="faq">
    <summary><span>What information do I need to apply for property finance through Roscap?</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div class="ans"><p>To underwrite a deal, we typically require a summary of the asset, development appraisals or financial models, borrower background, planning status, valuations, rent roll (for income assets), and exit strategy. Clear information helps us source faster, sharper terms from our lending partners.</p></div>
  </details>
  <details name="faq">
    <summary><span>Does Roscap work with both UK and international lenders?</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div class="ans"><p>Yes. Roscap works with UK challenger banks, private credit funds, family offices, specialist lenders, and institutional capital, alongside European and US investors. This global network enables us to structure bespoke, competitive finance for both UK and international real estate projects</p></div>
  </details>
</div>
```

## 4. Change 3: invisible form fixes

Nothing visible changes. The Form Block, its name ("Contact Form"), field names, placeholders, required fields (Name, Email, Phone and Subject required, Message optional, as live), the button text "Submit", the wait text "Please wait...", the redirect `/contact-us-success` and the success and error blocks all stay as they are.

| Field (ID) | Change |
| --- | --- |
| Name (`name`) | Hidden label "Name"; custom attribute `autocomplete` = `name` |
| Email (`email`) | Hidden label "Email"; custom attribute `autocomplete` = `email` |
| Phone (`Phone`) | Hidden label "Phone"; custom attribute `autocomplete` = `tel` |
| Subject (`Subject`) | Hidden label "Subject"; Settings > Text type: Plain. Live uses the Phone type (`type="tel"`), so phones show a number pad for a free-text subject. |
| Message (`Message`) | Hidden label "Message" |

Hidden labels: add a Form Label directly above each field with the text in the table and the class `sr-only`. Link it to its field the way Webflow's accessibility guide describes: select the Label, Settings > Custom attributes, name `for`, value = the field ID (`name`, `email`, `Phone`, `Subject`, `Message`). The `sr-only` rule in the CSS block hides the label on screen and keeps it for screen readers. Keep the placeholders.

Honeypot: inside the form, add a Div with the class `hp` and the custom attribute `aria-hidden` = `true`. Inside it, a Form Label "Leave this field empty" (`for` = `website`) and a Text Field with name and ID `website`, not required, custom attributes `tabindex` = `-1` and `autocomplete` = `off`. The `.hp` rule moves it off screen, so people never see or reach it. Webflow does not act on a honeypot by itself, so the footer script stops the submission when the field has a value. Webflow also offers bot blocking and spam filtering in Site settings > Apps & Integrations > Cloudflare Turnstile spam protection; they apply to every form on the site and load a Cloudflare script, so check them against the cookie and privacy policies before switching them on.

Optional and invisible (the last two rules before the media queries in the CSS block; delete them if not wanted):
- The live Submit hover adds a 1px border, so the button grows from 84 by 41px to 86 by 43px and the whole hero moves up 2px while the pointer is on it (measured on live). The CSS draws the same gold line inside the button, so nothing moves.
- On live the Message box can be dragged wider than its column (`resize: both`). The CSS limits resizing to height.

## 5. Code to paste, and the 50,000 character limit

Webflow allows up to 50,000 characters in each custom code slot: site head, site footer, page head, page footer and each Code Embed. Everything here goes on the /contact-us page only and uses a small part of each slot.

| Slot | Content | Characters |
| --- | --- | --- |
| Page settings > Custom code > Head code | CSS block in `<style>` plus the FAQPage JSON-LD | 6,129 |
| Page settings > Custom code > Footer code | FAQ fallback and honeypot guard in `<script>` | 745 |
| Code Embed in `.contact-hero-left` (only if not built natively) | contact markup (section 2) | 1,681 |
| Code Embed in `.faqs-wrap` | accordion markup (section 3) | 2,693 |

Head code, part 1: CSS (identical to part C of `speak.css`; plain values, no prototype variables).

```html
<style>
/* Contact details: the live .c-social-wrap look (gold line icons, white Switzer 500) with all four contacts,
   a little larger than live (16 px text, 24 px icons), two by two. Replaces the one-line email and Instagram row. */
.c-social-wrap.is-four{display:grid;grid-template-columns:repeat(2,max-content);gap:12px 40px;margin:0;padding:0;list-style:none}
.c-social-wrap.is-four li{margin:0;padding:0}
.c-social-card{display:inline-flex;align-items:center;gap:10px;min-height:32px;color:#fff;text-decoration:none;font:500 16px/24px Switzer,Arial,sans-serif}
.c-social-card .c-ico{display:block;flex:none;width:24px;height:24px;fill:none;stroke:#E1C979;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
.c-social-card .c-ico .dot{fill:#E1C979;stroke:none}
.c-social-card span{text-decoration:underline;text-decoration-color:transparent;text-underline-offset:5px;transition:text-decoration-color .2s}
.c-social-card:hover span{text-decoration-color:rgba(225,201,121,.8)}
.c-social-card:focus-visible{outline:2px solid #E1C979;outline-offset:4px;border-radius:2px}
@media (max-width:767px){.c-social-wrap.is-four{gap:8px 28px}}
@media (max-width:379px){.c-social-wrap.is-four{grid-template-columns:max-content}}
/* FAQ accordion: div.acc replaces div.faqs-content-wrap (the 5 dropdowns) under the "FAQs" heading */
.acc{max-width:56rem;margin:55px auto 0;border-bottom:1px solid rgba(4,52,53,.14);text-align:left}
.acc details{border-top:1px solid rgba(4,52,53,.14)}
.acc summary{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:68px;padding:22px 4px;cursor:pointer;list-style:none;font-size:18px;font-weight:500;line-height:1.4;color:#12161D;transition:color .2s}
.acc summary::-webkit-details-marker{display:none}
.acc summary::marker{content:""}
.acc summary:hover{color:#043435}
.acc summary:focus-visible{outline:2px solid #043435;outline-offset:-2px;border-radius:4px}
.acc summary svg{flex:none;width:22px;height:22px;fill:none;stroke:#043435;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;transition:transform .35s cubic-bezier(.22,.61,.36,1)}
.acc details[open] summary svg{transform:rotate(180deg)}
.acc .ans{max-width:68ch;padding:0 4px 26px}
.acc .ans p{margin:0;font-size:17px;font-weight:300;line-height:1.65;color:#61656E}
@media (prefers-reduced-motion:no-preference){.acc details[open] .ans{animation:accIn .4s cubic-bezier(.22,.61,.36,1)}}
@keyframes accIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
/* Form helpers: visually hidden labels and the off-screen honeypot */
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}
.hp{position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden}
/* Optional, invisible: textarea resizes in height only; hover border drawn inside so the hero does not shift 2px */
.input-field.height-135{resize:vertical}
.button.golden.contact:hover{border:0;box-shadow:inset 0 0 0 1px #E1C979}
@media (prefers-reduced-motion:reduce){
  .c-social-card span,.acc summary,.acc summary svg{transition:none}
}
@media (max-width:767px){
  .acc summary{font-size:17px;min-height:60px;padding:18px 2px}
  .acc .ans{padding:0 2px 22px}
  .acc .ans p{font-size:16px}
}
</style>
```

Head code, part 2: FAQPage JSON-LD (the same text as the visible FAQ, checked by script in the prototype). Google has not shown FAQ rich results for most commercial sites since 2023, so treat this as clean structured data for search engines and AI tools rather than a rich-result play. Check it with the Schema Markup Validator (validator.schema.org) on staging.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What does Roscap do as a real estate capital advisory firm?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Roscap sources and structures property finance, including development finance, bridging loans, commercial mortgages, mezzanine finance, and preferred equity. We work with UK and international lenders to secure competitive terms for residential, commercial, and mixed-use real estate projects."
      }
    },
    {
      "@type": "Question",
      "name": "How quickly can Roscap arrange development finance or a bridging loan?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "For urgent acquisitions, Roscap can secure bridging loans in as little as 5–10 working days, subject to valuation and legal readiness. Development finance and commercial mortgages typically complete within 6–8 weeks, depending on lender due diligence and asset complexity."
      }
    },
    {
      "@type": "Question",
      "name": "What types of projects and assets does Roscap fund?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We arrange funding for residential developments, BTR schemes, commercial buildings, mixed-use projects, hotel and leisure assets, industrial/logistics units, and specialist sectors such as supported living and student accommodation. We also fund international projects through our global capital network."
      }
    },
    {
      "@type": "Question",
      "name": "What information do I need to apply for property finance through Roscap?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "To underwrite a deal, we typically require a summary of the asset, development appraisals or financial models, borrower background, planning status, valuations, rent roll (for income assets), and exit strategy. Clear information helps us source faster, sharper terms from our lending partners."
      }
    },
    {
      "@type": "Question",
      "name": "Does Roscap work with both UK and international lenders?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Roscap works with UK challenger banks, private credit funds, family offices, specialist lenders, and institutional capital, alongside European and US investors. This global network enables us to structure bespoke, competitive finance for both UK and international real estate projects"
      }
    }
  ]
}
</script>
```

Footer code:

```html
<script>
/* FAQ: one answer open at a time in browsers without <details name> support */
(function () {
  var items = [].slice.call(document.querySelectorAll('.acc details'));
  items.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      items.forEach(function (o) { if (o !== d && o.open) o.open = false; });
    });
  });
})();
/* Honeypot: drop the contact form submission when the hidden "website" field is filled (bots) */
document.addEventListener('submit', function (e) {
  var f = e.target;
  if (!f || f.id !== 'wf-form-Contact-Form') return;
  var hp = f.querySelector('[name="website"]');
  if (hp && hp.value) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
</script>
```

## 6. Confirm with Clemente before publishing

1. WhatsApp: is +44 7850 522789 on WhatsApp (or WhatsApp Business)? If not, delete the WhatsApp row (an HTML comment marks it in the prototype). The prefilled message is "Hello Roscap, I would like to discuss a funding requirement."
2. Phone number in public: the live page already contains the number but hides it. The Call row shows it to everyone. Confirm it may be shown, and that someone answers it.
3. FAQ timescales: "as little as 5–10 working days" (bridging) and "within 6–8 weeks" (development finance and commercial mortgages) are kept verbatim from live, in the visible answers and in the schema. They read as timescale promises; confirm they still hold.
4. Success text: the live success block says "Thank you!", with an exclamation mark, which the house style avoids. It is kept as live because visitors normally land on /contact-us-success first. Change it only if Clemente wants to.

## 7. QA checklist (staging first, then live)

- [ ] 1440px: heading, divider and form exactly where they were; the four contacts under the divider, two by two, starting where the live email line starts; the hero is still one screen tall.
- [ ] 390px phone: order is heading, divider, the four contacts (two by two; one column under 380 px), form; no sideways scrolling.
- [ ] Each row opens the right thing: mail app; phone dialler; WhatsApp with the prefilled text (test on iOS and Android, and on desktop); Instagram in a new tab.
- [ ] The old one-line email and Instagram links are gone from /contact-us only; other pages unchanged.
- [ ] Keyboard: Tab reaches the four contacts (gold ring), the 5 fields, Submit, then the 5 FAQ questions; the honeypot is skipped; Enter and Space open and close a question; opening one closes the one that was open.
- [ ] Screen reader: each field announces its label (Name, Email, Phone, Subject, Message); contacts read as "info@roscap.co.uk", "+44 7850 522789", "WhatsApp" and "@roscap.uk" inside the "Direct contact" list.
- [ ] On a phone, Subject opens the normal keyboard, not the number pad; Name, Email and Phone offer autofill.
- [ ] Empty submit is still blocked by the browser on Name, Email, Phone and Subject, as before.
- [ ] A real test submission on staging lands on /contact-us-success, appears in Webflow Forms (with an empty `website` field), sends the notification email to info@roscap.co.uk, and the GA4 key event `generate_lead` still fires.
- [ ] Honeypot: type into the `website` field from dev tools and submit: nothing is sent and no entry appears in Forms.
- [ ] FAQ: 5 questions, copy identical to before; one open at a time; chevron turns; with reduced motion switched on there is no animation.
- [ ] Schema Markup Validator: one FAQPage with 5 questions, no errors.
- [ ] axe or Lighthouse accessibility on /contact-us: no serious or critical issues.
- [ ] No em dashes and no new exclamation marks in the page copy; footer disclaimer unchanged.

## 8. What the prototype shows that is not a Webflow change

- Nav and footer are the shared prototype versions used by every prototype, not copies of the live symbols. Leave the live nav and footer as they are.
- The hero background in the prototype is the live wave SVG with the three live overlay gradients baked in, re-encoded as two small WebP files (`img/hero-waves-desktop.webp` 17.7 KB, `img/hero-waves-mobile.webp` 7.7 KB) in place of the live 455 KB SVG and the three `.hero-bg-overlay` divs. Below the nav, the prototype hero matches the live render within 9 of 255 colour levels at both widths, apart from the new rows. Nothing to change in Webflow for this brief. Optional later: the live SVG (`img.hero-bg.is-contact`) is `loading="lazy"` although it is in the first screen; these WebP files could replace it and the overlay divs.
- The prototype sends nothing. After a valid submit it shows the live "Thank you!" block in place of the form, as Webflow does. On live, the redirect to /contact-us-success normally fires first. For information only: the live success block (`.contact-us-ss`) is positioned absolutely, centred across both columns and 30% above the grid, so if the redirect ever failed it would cover part of the heading.
- Form fields keep the live focus style (blue #3898ec border). The contacts and the FAQ questions have their own visible focus rings.

## 9. Visible differences from the live page

1. Under the heading divider, the live contact line now holds all four contacts (email, phone, WhatsApp, Instagram) two by two at 16 px, in the live style; the phone number is now visible.
2. FAQs: a compact accordion with thin lines and 18px questions replaces the 5 large white cards with 22px questions. Same heading, same copy.
3. Optional: hovering Submit no longer moves the hero 2px; the Message box resizes in height only.
4. Prototype only, not part of the change: the shared nav and footer (logo and link positions, small gold capitals for the footer column headings, two social icons instead of three, a full stop at the end of the second disclaimer paragraph) and the "Prototype · Speak to us" label at the bottom right.

## 10. Verification of the prototype (bundle, Chromium via Playwright, 31 Oct 2026)

- Console: 0 errors or warnings, 0 page errors, 0 failed requests (1440px, 390px and reduced-motion runs).
- axe-core: 0 serious and 0 critical at 1440px; 0 serious and 0 critical at 390px. No violations of any level in any of the 5 states checked (1440 default, 1440 FAQ open, 1440 success, 390 default, 390 FAQ open).
- Overflow: scrollWidth 390 at a 390px viewport; no element past the right edge.
- Layout at 1440px: hero 900px tall (live 900), heading at y 287 (live 287), inputs at y 287, 369, 451, 533 and 615 (live identical), Submit 84 by 41px at y 779 (live 84 by 41 at 779); contacts at y 598 (first row, as the live line) and 644, each 32px tall.
- Layout at 390px: heading at y 100 (live 100); contacts at y 290 (as the live line) and 332; form from y 390; inputs 50px and Message 136px as live; hero 925px (live 873, the second contact row adds 52px).
- Keyboard (Tab from the top): skip link, logo, 6 nav links, Speak to Us, the four contacts, Name, Email, Phone, Subject, Message, Submit, the 5 FAQ questions, footer. Honeypot skipped. Enter and Space toggle a question; opening one closes the other.
- Form: empty submit is blocked by the browser and focus goes to Name (as live); a valid submit hides the form and shows "Thank you!" in place, with focus on it. Subject is `type="text"`.
- Reduced motion: contacts, chevrons and Submit have 0s transitions and no animation; the success block appears at once.
- Copy: 0 em dashes in visible text (the one em dash in the bundle is in a code comment at the top of the shared `base.css`); the only exclamation mark is the live "Thank you!" in the success state; the FCA is mentioned only in the footer disclaimer saying Roscap is not authorised.
- JSON-LD: parses as FAQPage with 5 questions; text identical to the visible FAQ.
- Bundle `speak-to-us.bundle.html`: 283,308 bytes, fonts, logos and both wave images inlined.

