# Cookie Policy and Privacy Policy wording (draft for compliance review)

Status: replacement text to paste into the Webflow rich text of /cookie-policy and /privacy-policy once the banner is live. Prepared to match what the banner actually does. This is for review by Roscap's compliance adviser; it is not legal advice. Items marked [confirm] need a decision or a fact from Roscap before publishing.

Why the current text has to change: the live Cookie Policy says non-essential cookies are used "only where you have provided consent via our cookie banner", that the "cookie banner/preference centre provides the current cookie list", and that choices can be changed "using the cookie preference link in the website footer (if enabled)". Until the banner ships none of that is true, and once it ships the cookie list belongs in the policy itself. Remove "(if enabled)".

Framework referenced in the review notes: UK GDPR and the Privacy and Electronic Communications Regulations 2003, regulation 6, as amended by the Data (Use and Access) Act 2025 (amendments in force February 2026). The DUAA exception for storage used solely for statistical purposes to improve the service is not relied on here, because the GA4 property is linked to Google Ads and the data is shared with Google for its own purposes. Consent is therefore sought for analytics as well as for advertising measurement.

---

## A. Cookie Policy: replacement sections

### What cookies are
Cookies are small text files placed on your device when you visit a website. Some are needed for the site to work. Others are optional and help us understand how the site is used or whether our advertising leads to enquiries. This page explains which cookies www.roscap.co.uk uses, why, and how you control them.

### Your choices
When you first visit, a banner asks whether we may use optional cookies. Nothing optional is set until you choose. You can accept all, reject all non-essential cookies, or pick categories under Manage preferences. Your choice is stored in a cookie called roscap_consent for 6 months, after which we ask again. We also ask again if we change the cookies we use or the purposes we use them for.

You can change or withdraw your choice at any time using the Cookie preferences link in the footer of every page. Withdrawing consent stops the optional cookies being used from that point and removes the Google cookies we control from your browser; it does not affect data collected while consent was in place.

### Essential cookies (always on)
These are needed for the website to work securely and to remember your cookie choice. They do not track you across sites and do not need consent.

### Analytics cookies (optional)
We use Google Analytics 4, provided by Google, to understand how visitors use the site, for example which pages are read and how people arrive at the site. Google Analytics 4 does not log or store IP addresses. The data is shared with Google, which may process it in the United States [confirm: safeguards relied on, see the Privacy Policy section below]. Reports are held in our Google Analytics account for [confirm: 2 months or 14 months, as set in GA4 Admin > Data settings > Data retention]. We have switched off Google Signals, so this data is not combined with Google account information for advertising personalisation.

### Marketing measurement cookies (optional)
If you arrive from one of our Google Ads adverts and then send an enquiry, Google Ads conversion measurement tells us that the enquiry came from that advert. We use this only to measure whether our advertising works. We do not use these cookies for remarketing or to show you personalised adverts.

### The cookies we use

| Cookie | Purpose | Provider | Duration | Category |
|---|---|---|---|---|
| roscap_consent | Remembers the cookie choice you made in the banner (version, analytics on or off, marketing on or off, date) | Roscap (first party) | 6 months | Essential |
| _cfuvid | Security and traffic management for the hosting platform; lets the host tell apart visitors sharing an IP address | Cloudflare, used by our host Webflow | Session (deleted when you close the browser) | Essential |
| _ga | Distinguishes visitors for Google Analytics 4 statistics | Google | 13 months | Analytics |
| _ga_H8HS2R6NLS | Keeps the Google Analytics 4 session state for this website | Google | 13 months | Analytics |
| _gcl_au | Google Ads conversion measurement: links an enquiry back to an advert click | Google | 90 days | Marketing measurement |
| _gcl_ls | Google Ads conversion measurement: stores advert click information used when an enquiry is recorded | Google | 90 days | Marketing measurement |

[confirm] Run a cookie scan on the staging site after the banner is installed and add any cookie that appears which is not in this table (for example Webflow form or session cookies). The table must match what is set.

### Other ways to control cookies
You can also delete or block cookies in your browser settings. Blocking essential cookies may stop parts of the site working. For more about Google's use of data from sites that use its services see https://policies.google.com/technologies/partner-sites.

### Changes to this policy
We will update this page when the cookies we use change. Last updated: [confirm date of publication].

---

## B. Privacy Policy: replacement section

Insert in place of the current "technical data" or analytics wording (the live text says technical data is collected "subject to your cookie preferences").

### Website analytics and advertising measurement
With your consent, given through the cookie banner on our website, we use Google Analytics 4 to understand how our website is used and Google Ads conversion measurement to learn whether enquiries come from our online adverts. These services are provided by Google [confirm contracting entity: Google Ireland Limited for UK and EEA customers] and place the cookies listed in our Cookie Policy. The information processed includes pages visited, approximate location derived from your IP address (the IP address itself is not stored by Google Analytics 4), device and browser details, how you reached the site and whether you sent an enquiry. We do not use these services to show you personalised adverts and we have not enabled Google Signals.

Lawful basis: your consent (UK GDPR Article 6(1)(a) and PECR regulation 6). You can withdraw consent at any time using the Cookie preferences link in the website footer; this does not affect processing that took place before you withdrew it. If you do not consent, the website works in the same way and only essential cookies are used.

International transfers: Google may process this data on servers outside the United Kingdom, including in the United States. [confirm the safeguard relied on, for example the UK Extension to the EU-US Data Privacy Framework if Google's relevant entity is certified, or the International Data Transfer Agreement or Addendum, and state it here.]

Retention: analytics reports are held in our Google Analytics account for [confirm: 2 months or 14 months]. Google Ads conversion data is held in our Google Ads account in aggregated form. Your cookie choice is held for 6 months.

[confirm] The Privacy Policy should also state the registered office address, the ICO registration number if Roscap is registered as a controller, and a last-updated date. These were missing in the October 2026 audit.

---

## C. Notes for the reviewer: what the banner actually does
- Before any choice: Google Consent Mode v2 default sets ad_storage, ad_user_data, ad_personalization and analytics_storage to denied, functionality_storage and security_storage to granted, with wait_for_update 500 ms. ads_data_redaction is on and url_passthrough is off. No Google cookie is written and no stored identifier is read.
- Basic consent mode: gtag.js is not loaded at all until the visitor allows analytics or marketing measurement, so no request reaches Google before a choice or after a rejection. Google Analytics is configured only when analytics is allowed, and the Google Ads tag only when marketing measurement is allowed.
- On Accept all: analytics_storage, ad_storage and ad_user_data become granted. ad_personalization stays denied, because the banner does not offer personalised advertising. Choosing per category updates the matching signals only.
- On Reject or withdrawal: all four stay or return to denied, and the banner deletes _ga, _ga_H8HS2R6NLS, _gcl_au and _gcl_ls for the rejected categories (Google does not remove its own cookies).
- The choice is stored in roscap_consent (6 months, SameSite=Lax, Secure, path=/) with a localStorage mirror, and carries a policy version. When Roscap changes the version, every visitor is asked again.
- Accept all and Reject non-essential are presented with identical size and style; nothing is pre-ticked; the page remains usable behind the banner (no cookie wall).
