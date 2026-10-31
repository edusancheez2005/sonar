# Message for Clemente: the full website review

Hi Clemente,

I've gone through the whole Roscap website, page by page, on computers and on phones. Below is everything I found, what I've already redesigned, and a few questions only you can answer.

The good news first: the site looks right, and nothing on it says or implies that Roscap is FCA authorised; the disclaimer is on every page. Nothing on the live site has been changed. Every fix and new design goes to the staging site first so we can check it before it is published.

## Fix first

**1. Cookie banner.** Google Analytics starts recording every visitor the moment they arrive, before anyone has agreed, and the Cookie Policy says consent is collected "via our cookie banner", which does not exist. This is the one item with legal exposure under UK privacy rules (UK GDPR and PECR), and Google Ads should not restart until it is fixed. The banner is designed and ready, together with updated Cookie and Privacy Policy wording that whoever handles compliance should read before it goes live.

**2. Partner Program form.** On a computer, pressing Submit does nothing: the button relies on a script that page never loads. It only works on phones, so anyone filling it in on a computer cannot send it, and we would never know they tried. The form at the bottom of the blog posts has the same fault. It is a small fix, and the new design already has it working.

**3. Contact page.** The phone number is on the page but hidden by a style setting, so visitors only see the email and Instagram. The Subject box brings up a number keypad on phones and tablets, where 95% of past ad clicks came from. The form fields have no labels for screen readers, and the newsletter button in the footer has no name. All small fixes.

**4. Euribor licence.** The homepage shows the 3-month Euribor rate. EMMI, which publishes Euribor, says showing it on a commercial website needs a paid licence (the free version is for non-commercial use only), and "Euribor" is a registered trademark. The risk is low: if they ever noticed, the likely outcome is a request to take a licence or take it down. Three options:
- take the licence (about 1,000 euros a year per website at the last price we could find);
- swap it for the European Central Bank's deposit rate, which is free to show and an official rate like the other two;
- remove it.

The swap is the easiest.

**5. Market rates panel.** On 21 October the panel showed "400.00%" for about 12 hours after a data glitch, because nothing checks the numbers before they are shown. The small notes that appear when you hover over the rates also describe them wrongly; for example, they call December's cut "the last Bank of England decision", but the last decision, in September, was a hold. The new version checks every number and date before showing it and uses the right wording.

**6. About Us team profiles.** If someone opens a profile using the keyboard, they get stuck: Escape does nothing and the close button cannot be reached. It needs a proper close button.

**7. A leftover test script.** About Us and Insights load a small script from a temporary test website (CodeSandbox). It does nothing on those pages, but code from a test site should not be on the live site. It just needs deleting.

## Corrections to check

- **Manchester.** The Track Record page shows a £2.7m commercial mortgage (65% LTV, 6.90%). The case study in Insights describes a £2.665m bridging loan in Burnage with Recognise Bank at 65% LTV. It looks like the same deal described two ways.
- **Mowgli's title.** "Head of Southern Europe" in one place, "Head of Western Europe" in another.
- **Our Services.** The Equity paragraph repeats the same sentence twice.
- **Track Record map.** The map says 52 UK deals; the page lists 16.
- **Privacy Policy.** No date, registered office, ICO registration number, list of service providers or how long data is kept. The email links on four of the legal pages do not work.
- **Accessibility Statement.** It says the site meets standards it does not yet meet. Better to call it partly compliant and list what is being fixed.

## Speed

- **Track Record** is the heaviest page: 13.4 MB on a computer. The map file alone is 6.7 MB, and the 22 deal photos are up to 1 MB each and look slightly stretched.
- **Insights** is 12.4 MB, mostly the same large picture loaded twice and article images far bigger than they are shown.
- The animation and slider code loads on all 25 pages, including the ones that do not use it.
- Every image waits until last to load, including the main picture at the top of each page, which makes pages feel slower than they are.
- The **contact page**, where ads would send people, scores 67 out of 100 for speed on phones.
- The partner **brochure** is a 9.2 MB scan with no selectable text, and the "fill in the form to download" step does not actually protect it, because the file's address is visible in the page.

## Google Ads

The one campaign (29 July to 10 August) spent £193 for 436 clicks and recorded no enquiries. That is a tracking gap, not a verdict on the site: conversion tracking was set up after the campaign had stopped. 92% of the clicks came from Display, YouTube and Discover rather than Google search, almost all on phones, and nearly all landed on the homepage. Before restarting: the cookie banner, the contact page fixes, and one tested enquiry conversion.

## Nice to have

- A branded "page not found" page; today it is Webflow's default, with no menu.
- Insights articles: lines run very long on a computer (about 160 characters), there is no author or date, and no preview picture appears when a link is shared on LinkedIn or WhatsApp.
- About Us: a few facts (founded, London, company number) and the same card style for all four team members.
- Track Record: one grid with simple filters instead of two carousels.

## What I've redesigned (each checked on computer and phone)

- **Homepage:** the same panther video, but much lighter to load and sharper, the headline no longer disappears while it loads, and there is a small pause button. The market rates panel with rolling numbers, and the list of selected transactions, ending with "All transactions", which opens a picture grid of all 22 deals. "View 22 selected transactions", the contact block and the Who We Are and What We Do sections stay as they are, with a smoother switch between Asset Classes and Sources of Capital.
- **Our Services:** the page stays as it is. The capital stack graphic now builds up layer by layer, from Senior Debt to Common Equity, when you reach it, and its labels are real text that search engines and screen readers can read. Asset Classes looks the same, with a smoother entrance. The Equity sentence that appears twice is printed once.
- **Partner Program:** the same page and the same wording. The "Why partner" cards lose their empty space, the six steps become a clear timeline instead of a slider, with your exact step titles and one short line under each, the partner logos glide slowly across, and the form works on computers.
- **Speak to Us:** the same page, with email, phone, WhatsApp and Instagram under the heading, a shorter FAQ, and the form fixes.
- **Cookie banner:** "Accept all" and "Reject non-essential" side by side with equal weight, in the site's teal, a "Cookie preferences" link in the footer so people can change their mind, and nothing goes to Google until they say yes.

## Questions for you

1. Manchester: is it a bridging loan or a commercial mortgage?
2. Is +44 7850 522789 on WhatsApp? If not, we leave WhatsApp out.
3. Euribor: licence, swap for the ECB rate, or remove?
4. Mowgli: Southern or Western Europe?
5. The Track Record map: what is the right number of UK deals?

Each design comes with step-by-step notes for Shikhar, and everything goes to the staging site first.

Edu
