# Privacy Policy and Cookie Policy: handoff

Full replacement text for www.roscap.co.uk/privacy-policy and www.roscap.co.uk/cookie-policy, in the live page layout. Roscap's existing wording is kept; the additions are what UK GDPR (Articles 13 and 14) and PECR need and the live pages lack, plus what the cookie banner actually does. Open either page and press "Highlight what is new" (bottom left) to see every addition in gold.

This is a drafting aid, not legal advice. Publish the Cookie Policy on the same day as the cookie banner (`prototypes/cookie-consent/`), so the two match.

## 1. Privacy Policy: what is added (the checklist)

Facts from the public registers (checked 31 October 2026) and the site itself:
- [ ] **Registered office**: F17 Node Cowork, 1 Enterprise Road, Roundswell, Barnstaple, England, EX31 3YB (Companies House).
- [ ] **Company registered in England and Wales**, number 13536901 (already on the page).
- [ ] **ICO registration number ZB399363** (data protection fee paid, Tier 1, current until 3 October 2027), and "we are the data controller".
- [ ] **Contact email** as a working link: info@roscap.co.uk (today the email links on four legal pages point to "#").
- [ ] **Last updated** date at the top (set it on the day you publish).
- [ ] **Partner Program**: partners' details, the clients they introduce and the details needed to pay commission; the purpose (recording introductions, paying commissions) and its lawful basis.
- [ ] **Legitimate interests** named (running the business, managing relationships and records, security), with the right to object.
- [ ] **Website analytics and advertising measurement** (Google Analytics 4 and Google Ads conversion measurement, only with consent through the cookie banner; Google Signals off; no personalised adverts).
- [ ] **Named website and email providers**: Webflow (hosting, forms), Cloudflare (security, the _cfuvid cookie), Amazon Web Services (website files and the homepage video), jsDelivr (code libraries), GitHub (the market rates feed), Microsoft 365 (email; from the domain's public mail records), Google (analytics and ads measurement, with consent).
- [ ] **International transfers**: the safeguard for United States providers (UK Extension to the EU-US Data Privacy Framework where certified, otherwise the UK International Data Transfer Agreement or the UK Addendum).
- [ ] **Retention periods** (a guide under the existing paragraph): enquiries 2 years; mandate and due diligence records 5 years after the deal or relationship ends; accounting and tax 6 years; contracts including Partner Program and commissions 6 years; marketing until you unsubscribe; analytics 14 months; cookie choice 6 months.
- [ ] **If you do not provide personal data**: what happens (we may not be able to act for you).
- [ ] **Automated decisions**: none with legal or similar effects. Check this stays true if screening software ever decides on its own.
- [ ] **Opting out of marketing** by email.
- [ ] **ICO complaint details**: ico.org.uk/make-a-complaint, 0303 123 1113.
- [ ] **Link to the Cookie Policy**.
- [ ] Headings: one H1 ("Privacy Policy") and an H2 for each section. Today the title is an H3 and the sections are bold lines, so screen readers and search engines see no structure.

Kept word for word: Who we are (first line), Scope, Our business, Key principles, Personal data we collect, How we collect data, Purposes and lawful bases, Sharing and disclosures, International transfers (first paragraph), Data retention (first paragraph), Your rights, How to exercise your rights and complaints, Security, Changes to this Privacy Policy.

## 2. Cookie Policy: what changes
- [ ] **Your choices** (new): how the banner works, the roscap_consent cookie for 6 months, asking again when the cookies change, how to withdraw.
- [ ] **Cookie list** (new): the six cookies the site sets, with purpose, provider, duration and category. The live page says the banner "provides the current cookie list", which is not true today.
- [ ] **Categories** now match the banner: Strictly necessary, Analytics (Google Analytics 4 described), Marketing measurement (Google Ads conversion measurement, no remarketing). "Functional" is removed because the site sets no functional cookies.
- [ ] "(if enabled)" is removed from Managing your preferences: the Cookie preferences link exists once the banner is installed. Both mentions open the preferences dialog (`data-rc="open"`).
- [ ] **Changes to this policy** and a **Last updated** date.
- [ ] Email as a working link.
- [ ] One H1 and H2 sections, as above.

Kept word for word: the opening two paragraphs, What are cookies?, the Strictly necessary and Analytics category lines, Managing your preferences (except "(if enabled)"), Third-party cookies, Contact.

## 3. Settings that must match the text (Edu)
- [ ] Google Analytics 4 > Admin > Data collection and modification > Data retention: **14 months**.
- [ ] Google Analytics 4 > Admin > Data collection: **Google Signals off**.
- [ ] After the banner is on staging, scan the cookies (browser dev tools > Application > Cookies, before and after Accept all) and check the table still matches. Add any cookie that appears and is not listed.
- [ ] ICO register: change the address on ZB399363 from 114 Westbourne Rd, Huddersfield to the registered office (ICO online account), so the two registers agree.

## 4. Install (Webflow)
1. Open the prototype page in a browser, press "Highlight what is new" so the highlights are off, select the text from the H1 to the end, copy.
2. In the Designer, Privacy Policy page: select the Rich Text block (`text-rich-text` inside `bi-internal`), delete its content and paste. Webflow keeps the headings, bold text, lists and links. Check the H1 came across as H1 and the section headings as H2.
3. Fill in the Last updated date.
4. Cookie Policy page: the same. The table does not paste into Rich Text: add it as an Embed inside the Rich Text (the "+" in the Rich Text toolbar > HTML embed) and paste the `<div class="legal-table">` block from `cookie-policy.html`, with the `.legal-table` styles from `legal.css` in the page's head code. The two "Cookie preferences" links work once the banner script is on the site; inside Rich Text add them as HTML embeds: `<a href="#cookie-preferences" data-rc="open">Cookie preferences</a>`.
5. Optional, for reading comfort: limit the Rich Text to about 46rem wide (live runs the full container width, about 170 characters a line).
6. Publish to staging, check, then publish.

## 5. Checks run
Both pages at 1440 and 390: axe-core 0 violations, no sideways scrolling (the cookie table scrolls inside its own box on phones), one H1, H2 sections (Privacy 18, Cookie 8), no "#" links, no long dashes or exclamation marks.
