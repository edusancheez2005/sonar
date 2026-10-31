# Speak to us (/contact-us): handoff for Shikhar

Prototype: `proto/dist/speak-to-us.html` (single file, open in a browser). Source: `proto/speak-to-us/` (index.html, speak.css, speak.js) on top of the shared scaffold in `proto/shared/`.
Build on the staging site first (roscap-site.webflow.io), then publish to roscap.co.uk.

## 1. What changes, in one screen

| Area | Live today | Prototype |
| --- | --- | --- |
| h1 | "Speak with our team to discuss your next transaction, funding requirement, or investment opportunity." | "Speak to us" plus one supporting line |
| Direct contact | Email and Instagram shown; phone link present but hidden (class `hide`) | Three equal actions: Email, Call, WhatsApp, in a panel; response-time line (placeholder) and a Book a call link (placeholder) |
| Form | Placeholder-only fields, no labels, Subject field is `type="tel"`, all fields required, no privacy line | Visible labels, correct types and autocomplete, Enquiry type select replaces Subject, only Name, Email, Message required, privacy line, announced errors, honeypot |
| Beside the form | Nothing | "Useful to have to hand" checklist (from the FAQ answer) and a Recent transaction card linking to the Manchester case study |
| FAQs | Webflow dropdowns, no schema | Same 5 Q&As verbatim, accessible accordion, FAQPage JSON-LD in the head |
| Naming | Nav "Speak to Us", title "Contact Roscap - Real Estate Capital Advisory", h1 "Speak with our team" | "Speak to us" throughout, title "Speak to Us | Roscap" |

Keep the URL `/contact-us` (Google Ads lands here, GA4 key event fires on `/contact-us-success`). Do not create a new page.

Why it matters: this page converts landing sessions at about 7.5 percent while /our-services converts none, and 95 percent of past Ads clicks came from phones and tablets. On the live page the phone link is `display:none` at every width (class `hide`), so visitors see only email and Instagram; the form has no `<label>` elements, a generic "Submit" button, no reassurance line, and a Subject field typed as `tel`. The prototype fixes each of these.

## 2. Page settings

- Title: `Speak to Us | Roscap` (20 characters). Longer option if wanted: `Speak to Us | Roscap Real Estate Finance` (40 characters). Keep under 60.
- Meta description: `Speak to Roscap about development finance, bridging loans, commercial mortgages, mezzanine or equity. Email, call or WhatsApp the team, or send a short enquiry.` (159 characters)
- Open Graph title: same as the page title.
- The prototype carries `<meta name="robots" content="noindex">` because it is a mock-up. Do not copy that to Webflow.
- Nav CTA: keep "Speak to Us" (already matches). Footer and "Contact" labels elsewhere can stay.

## 3. Webflow structure and classes

Page order inside the Body: Navbar (existing symbol), `main` wrapper, Footer (existing symbol).

```
section.hero-c                      Section, background #043435, padding top nav + 5.5rem, bottom 5.5rem
  div.container.hero-c-in           Grid 2 columns (1.05fr / 0.95fr), gap 4 to 6rem, align center; 1 column under 991px
    div.hero-copy
      h1                            "Speak to us" (Boska italic 500, clamp 3rem to 4.75rem; "us" in the gold gradient text style)
      p.lead                        "Outline your transaction or funding requirement and one of the team will reply."
    div.direct                      Panel: rgba(255,252,245,.05) fill, 1px rgba(225,201,121,.28) border, radius 14px, padding 8px
      ul.rail > li > a.rail-a       3 link blocks, each min-height 72px, grid 44px / 1fr / 20px
        span.rail-i                 44px circle, gold stroke icon (envelope, handset, WhatsApp)
        span.rail-t > .k + .v       Label (11.5px uppercase gold) and value
        span.rail-go                Arrow
      div.direct-foot               Row: p.resp (response line with .confirm chip) and a.btn.ghost "Book a call"

section.enq                         Cream section, padding 5.5rem / 5rem
  div.container.enq-grid            Grid 7fr / 5fr, gap 2.5 to 5.5rem; 1 column under 991px
    div.form-wrap
      h2.h2                         "Send a message"
      p.para.form-intro             "Share what you can. A few lines on the asset and the funding you need is enough to start."
      ol.steps                      "What happens next": 3 numbered items in a row (1 column on phones), 14px grey, 26px teal number circles, 1px rules above and below
                                    1 "You send a short note about the transaction." 2 "One of the team replies by email or phone, whichever you prefer." 3 "We tell you which lenders are likely to fit and what they will need to see."
      Form Block (.w-form)          Native Webflow Form Block, see section 4
    aside.side                      Sticky at nav + 28px on desktop; 2 columns at tablet, 1 column on phones
      div.card.prep                 h3 "Useful to have to hand", intro, ul.checks (7 items)
      article.card.deal             "Recent transaction" card, see section 6

section.faq                         White section, 1px top border, padding 4.5rem / 6.5rem
  div.container.faq-in              max-width 56rem
    div.faq-head                    h2.h2 "Frequently asked questions" + div.gdiv (gold rule)
    div.acc                         Accordion, see section 5
```

Fonts and colours are the live ones: Boska (display, italic 500), Switzer (body), cream #FFFCF5, teal #043435, gold #E1C979, gold text on cream #7A6318, grey #61656E. All values are in `proto/shared/base.css` and `proto/speak-to-us/speak.css`.

Mobile order is the same as the DOM: heading, direct contact panel, form, checklist, transaction card, FAQs. The three direct actions sit above the fold on a 390px phone (panel ends at about 475px).

## 4. Form specification

Use the existing Webflow Form Block so submissions keep arriving in the Webflow Forms tab and the redirect keeps working. Form name: `Speak to Us` (data-name). Method: POST (Webflow default). Redirect URL: `/contact-us-success`.

| Field label | `name` | Element | `type` | Required | `autocomplete` | `inputmode` | Hint (aria-describedby) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Name | `Name` | input | text | yes | `name` | | |
| Email | `Email` | input | email | yes | `email` | `email` | |
| Phone (optional) | `Phone` | input | tel | no | `tel` | `tel` | "Include the country code if you are outside the UK." |
| Enquiry type (optional) | `Enquiry type` | select | | no | | | "Helps us route your enquiry to the right person." |
| Message | `Message` | textarea, 5 rows, maxlength 5000 | | yes | | | "The asset, the amount and the timing, if you know them." |
| (hidden) | `website` | input | text | no | `off` | | Honeypot, see below |

Select options, in this order: `Please select` (empty value, default), `Development finance`, `Bridging finance`, `Commercial or BTL mortgage`, `Mezzanine or equity`, `Partner programme`, `Other`.

Rules
- Every field has a visible `<label for>` (Webflow: Label element, set "For" to the field ID). Keep placeholders empty.
- Remove `required` from Phone and from the select. Remove the old Subject field.
- Submit button text: `Send message`. Waiting text: `Please wait`. No exclamation marks anywhere on the page.
- Privacy line under the button, 13px grey: "By sending this form you agree to our privacy policy. We use your details only to reply to your enquiry." Link `privacy policy` to `/privacy-policy`.
- Success block (.w-form-done): "Thank you." (Boska italic) then "Your message has reached the team and one of us will come back to you." In practice the redirect to `/contact-us-success` fires first; the block is a fallback.
- Error block (.w-form-fail): "Sorry, your message could not be sent. Please email info@roscap.co.uk or call +44 7850 522789." (both linked).
- Field errors: a 13.5px line under the field in #9A2A20 with a red field border (#B3261E). Copy: "Please enter your name." / "Please enter an email address we can reply to." / "Please check the email address, for example name@company.co.uk." / "Please check the phone number, or leave it blank." / "Please tell us a little about your enquiry."
- Form-level summary above the fields, `role="alert"`: "3 fields need attention: Name, Email and Message." Focus moves to the first invalid field.

Honeypot
- A visually hidden text input named `website` (wrapper `aria-hidden="true"`, input `tabindex="-1"`, `autocomplete="off"`, positioned off screen). People never see it; bots fill it.
- Webflow does not filter on a honeypot server side. Two options: (a) the small script in section 7 refuses to submit when `website` has a value; (b) turn on Webflow's spam filtering in Site settings > Forms. Use both. Do not add reCAPTCHA; it adds a Google script and a visible badge.
- Webflow form settings to check: notification email goes to info@roscap.co.uk; the form name in the dashboard reads "Speak to Us"; redirect `/contact-us-success` set on the form element (Settings panel, Redirect URL); `/contact-us-success` stays noindex and out of the sitemap (already the case).

## 5. FAQ accordion and FAQPage schema

Two ways to build it.

1. Webflow native Dropdown (what the page uses today). Keeps the questions editable in the Designer and is keyboard operable out of the box (toggle is focusable, Enter and Space open it). Style it as in `speak.css` (.acc summary, .acc .ans): 1px dividers, 68px minimum row height, chevron rotating 180 degrees when open, answer in 1.0625rem Switzer 300 grey, max-width 68ch. Keep one answer open at a time if the Dropdown settings allow; otherwise independent is fine.
2. HTML Embed with `<details name="faq"><summary>...</summary><div class="ans">...</div></details>` as in the prototype. Smaller and native, but the copy then lives in an embed, which is less convenient for editors.

Recommendation: option 1 for editability, with the prototype styling. The copy is the live copy, verbatim, including the 5 questions and answers. Do not change the timing figures ("5–10 working days", "6–8 weeks") without Clemente's confirmation (section 8).

Schema: paste the `<script type="application/ld+json">` block from `proto/speak-to-us/index.html` (the FAQPage object) into Page settings > Custom code > Head code for `/contact-us`. This is the same mechanism already used for the Article schema on the blog template, so nothing new is needed at site level. The visible text and the schema text must stay identical; if a FAQ is edited, edit both. Google removed FAQ rich results in May 2026, so this is hygiene for machine readers, not a ranking or rich-result play. Check it parses with the Schema Markup Validator (validator.schema.org) after publishing to staging.

Webflow custom-code limits: 50,000 characters per box (site head, site footer, page head, page footer, and each Code Embed). The CSS in section 7 is about 13,000 characters and the JS about 5,500, so both fit in the page boxes with room to spare.

## 6. Recent transaction card

Facts taken from the live case study page on 31 Oct 2026 (https://www.roscap.co.uk/blogs/roscap-bridging-loan-manchester): £2.665m bridging loan, Burnage, Manchester, 65% LTV, 12-month facility, lender Recognise Bank, planning for 66 homes, refinance releasing capital for the next phase, article dated 01 Jul 2026. The card uses only those facts. No testimonials, no quote. Link text: "Read the case study". When a newer case study is published, swap the figures and the link; nothing else needs to change.

## 7. CSS and JS to paste

- CSS: all of `proto/speak-to-us/speak.css`, in Page settings > Custom code > Head code inside `<style>`, or recreated as Webflow classes. It only depends on the token names in `base.css` (`--teal`, `--gold`, `--cream`, `--line`, `--ease`, `--f-display`, `--f-body`, `--nav-h`); if the site does not define those variables, replace them with the hex values listed in section 3.
- JS: `proto/speak-to-us/speak.js`, in Page settings > Custom code > Footer code inside `<script>`, with one change. The prototype mocks submission; on Webflow the script must only stop the submit when a field is invalid, then let Webflow's own handler send the form and redirect. Replace the body of the submit listener with:

```js
form.addEventListener('submit', function (e) {
  attempted = true;
  var bad = validate();
  var hp = form.querySelector('[name="website"]');
  if (hp && hp.value) { e.preventDefault(); return; }   /* honeypot filled: drop silently */
  if (!bad.length) { status.textContent = ''; status.classList.remove('is-on'); return; }  /* let Webflow submit */
  e.preventDefault();
  status.innerHTML = '';
  var b = document.createElement('b');
  b.textContent = bad.length === 1 ? '1 field needs attention: ' : bad.length + ' fields need attention: ';
  status.appendChild(b);
  status.appendChild(document.createTextNode(joinLabels(bad) + '.'));
  status.classList.add('is-on');
  var first = document.getElementById(bad[0].id);
  first.focus({ preventScroll: true });
  first.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
});
```

- Keep `novalidate` on the form so the browser's default bubbles do not fight the inline errors. Field IDs in the script: `f-name`, `f-email`, `f-phone`, `f-msg`; error IDs `e-name`, `e-email`, `e-phone`, `e-msg`; status `form-status`. Match them in Webflow or edit the script.
- Reveal animation: the `.rv` blocks fade and rise once, 0.75s, driven by an IntersectionObserver that adds `.is-in`. It is wrapped in `@media (prefers-reduced-motion: no-preference)` and in `html.js`, so it is off for people who ask for less motion and when JavaScript fails. No GSAP, Lenis or other library is needed on this page.

## 8. Confirm with Clemente before publishing

1. WhatsApp: is +44 7850 522789 on WhatsApp (Business)? The link is `https://wa.me/447850522789?text=...` with a prefilled "Hello Roscap, I would like to discuss a funding requirement." If not, remove the third action and show Email and Call only.
2. Phone visibility: the live page hides the phone link (class `hide`). The prototype shows it. Confirm the number can be public.
3. Response time: "We reply within 1 working day." is a placeholder marked CONFIRM. Publish it only if the team will keep to it; otherwise remove the line.
4. Book a call: choose a booking tool, or drop the button. The prototype links out (no script on the page). If a tool is adopted, prefer Cal.com: it can open as a click-to-load popup from a Code Embed, states that it sets no third-party cookies, and acts as processor under its DPA. Calendly sets cookies even with its banner hidden, so it would have to load only after consent. Either way, load nothing until the visitor clicks Book a call, and name the provider in the privacy policy.
5. FAQ timing claims: "as little as 5–10 working days" for bridging and "within 6–8 weeks" for development finance and commercial mortgages. Both are in the visible copy and in the schema. Confirm they still hold.
6. Enquiry type list: six options as in section 4. Confirm "Partner programme" belongs here, or route partners to /partner-program instead.
7. Recent transaction card: confirm the Manchester case study is the one to feature and that the facts (section 6) may be repeated on this page.

## 9. SEO notes

- Title and description in section 2. Keep `/contact-us` as the canonical URL; no redirect, no new slug.
- FAQPage schema: optional and harmless. Google no longer shows FAQ rich results (removed May 2026), so do not expect a search gain from it.
- Colour: gold #E1C979 on cream is 1.6:1, so never use it for text on cream or white. Gold text appears only on teal (hero panel labels, Confirm chip); on cream the page uses gold-ink #7A6318 for small labels and keeps #E1C979 for decorative rules, borders and the button fill (with dark text).
- One h1 ("Speak to us"), h2 for Send a message and Frequently asked questions, h3 inside the sidebar cards and the footer columns.
- The Recent transaction card gives an internal link to the case study; the checklist repeats the FAQ answer in plain language, which is fine for search.

## 10. Performance, reduced motion and mobile notes

Performance (live page audit: mobile LCP 5.9 s, 763 KiB transferred)
- The hero background SVG (`img.hero-bg.is-contact`, 202 KiB) is `loading="lazy"` while sitting in the first viewport, which delays LCP. Either load it eagerly (`loading="eager"`, `fetchpriority="high"`) or drop it. The prototype uses a CSS gradient with faint rings instead of an image, which costs nothing.
- Four GSAP scripts load on this page and nothing on it needs them. Remove GSAP, ScrollTrigger and the smooth-scroll script from `/contact-us` (page-level custom code, or exclude this page from the site-wide embed). The reveal in section 7 is plain CSS plus a 20-line IntersectionObserver.
- Fonts: keep Boska 400/500 and Switzer 300/400/500 only, with `font-display: swap`.
- Target after the change: under 300 KiB on first load and LCP under 2.5 s on a mid-range phone. The bundled prototype (fonts and logos inlined) is 261 KB.

Reduced motion
- All reveal and accordion animations are inside `prefers-reduced-motion: no-preference`. Verified with emulation: every block visible at load, transition duration 0s.

Mobile (390px, where most Ads traffic lands)
- The three direct actions (Email, Call, WhatsApp) sit above the fold: the panel ends at about 475px on an 844px-tall viewport, before any scrolling.
- No horizontal scroll; the Book a call button and the submit button go full width; the sidebar cards stack below the form; accordion rows are at least 60px tall.
- Tap targets: rail rows 64 to 72px, buttons 44 to 56px, inputs 56px, accordion rows 60 to 68px, nav links padded to 45px, footer links padded to about 31px with 10px spacing (shared footer, visual unchanged). The footer links could be made 44px if the shared footer is reworked.
- Phone keypad: Phone uses `type="tel"` with `inputmode="tel"`; Email uses `inputmode="email"`; the old Subject field (wrongly `type="tel"`) is gone.

## 11. Assumptions

- No new photography; the hero uses a CSS gradient with faint concentric rings, in keeping with the line pattern on the live site. The 443 KB contact background image from the live site was not used, which keeps the page light.
- "Speak to us" sentence case in the h1 and the page body; the nav keeps "Speak to Us" title case as on the live site.
- Webflow field names: `Name`, `Email`, `Phone`, `Enquiry type`, `Message` so the notification emails read clearly.
- The Instagram link moved out of the hero (it stays in the footer). Instagram is not a direct contact action.
- The prototype footer uses the disclaimer text from `proto/shared/footer.html` (the shared scaffold). The live footer carries a longer two-paragraph version; keep whichever Compliance prefers.
- The fifth FAQ answer on the live page has no full stop at the end. Copied verbatim; add the full stop in both the page and the schema if you like.

## 12. QA checklist (staging, then live)

- [ ] Title, description and canonical as in section 2; no `noindex` on `/contact-us`.
- [ ] h1 reads "Speak to us"; only one h1 on the page.
- [ ] Email, Call and WhatsApp links open the right app (test on iOS and Android). WhatsApp prefilled text appears.
- [ ] Book a call link goes to the chosen booking page, or the button is removed.
- [ ] Response-time line published only if confirmed.
- [ ] Every field has a visible label; Phone and Enquiry type are optional; Subject field gone.
- [ ] Submit with empty fields: summary and inline errors appear, focus moves to Name, screen reader announces the summary.
- [ ] Valid submission on staging: lands on `/contact-us-success`; entry appears in Webflow Forms with the Enquiry type; notification email received at info@roscap.co.uk; GA4 key event recorded.
- [ ] Honeypot filled (set the hidden field via dev tools): no submission.
- [ ] FAQ: each row opens and closes with mouse, Enter and Space; chevron rotates; copy matches the schema.
- [ ] Rich Results Test shows a valid FAQPage with 5 questions.
- [ ] Phone (390px): no horizontal scroll; contact panel above the form; buttons full width.
- [ ] Reduced motion (OS setting on): no fades or movement.
- [ ] Lighthouse accessibility 100 or axe with no serious or critical issues; colour contrast AA on cream and teal.
- [ ] No em dashes or exclamation marks in page copy.
- [ ] Footer disclaimer unchanged from the approved text.
