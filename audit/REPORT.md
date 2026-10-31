# roscap.co.uk website audit

Date: 31 October 2026. Prepared for Edu (Roscap SEO and web programme) and Clemente. Status: DRAFT SKELETON, findings being consolidated.

## 0. Standing rules applied to this work

- Copy must never state or imply that Roscap is FCA authorised or regulated. Any live copy that could read that way is flagged in section 3.
- Nothing on the live site, in Webflow, GitHub or any connected account was changed. Everything here is read-only analysis plus prototypes in this repository. Anything that ships goes to Webflow staging (roscap-site.webflow.io) first.
- No live form was submitted, no account created, no load testing. Where something was blocked, it is noted rather than worked around.
- Performance budget: the homepage is 9.8 MB and scores 55 to 66 on mobile; every prototype must make it lighter.
- Copy style: British English, digits for numbers, no em dashes, no exclamation marks, discreet institutional tone, no invented facts or testimonials.

## 1. Scope and method

Pages: all 25 sitemap URLs (7 main pages, 6 legal pages, 12 blog posts). Inputs: live site (Playwright at 1440, 1024 and 390 px, axe-core 4.10, Lighthouse 13.6 mobile and desktop), the owner's homepage concepts D, E and F plus the earlier concept video, the setup log (SETUP_LOG.md), Google Ads read-only data via Windsor.ai, and the live rates feed (edusancheez2005.github.io/roscap-rates/rates.json).

Eight auditors worked in parallel (home and about; services and track record; partner programme and contact and forms; insights and legal and site-wide compliance wording; technical SEO and performance; data and claims and rates; concepts D, E, F; Google Ads funnel). Every critical or high finding was then handed to independent verifiers whose job was to refute it. Findings marked "verified" below survived that pass; "partly" means the core is real but the detail or severity was corrected.

## 2. Assumptions log

1. "[FILE NAME]" in the brief is read as the odometer "Current market rates" panel. It is identical in concepts D, E and F, so concept F carries both approved pieces (rates panel and deal list).
2. The client is Clemente; Edu is the day-to-day contact; Shikhar is the Webflow developer who will implement handoff notes.
3. The repository for deliverables is this one (edusancheez2005/sonar), branch claude/funny-einstein-1203xt, folders audit/ and prototypes/.
4. The rates panel should bind to the existing GitHub Pages feed rather than a new backend, since the live Home page already reads it.
5. Our Services keeps no enquiry form, phone number or email (Edu's decision of 7 September 2026); the capital stack prototype respects that.
6. Partner programme claims ("hundreds of current partners", "commissions in perpetuity") are treated as unconfirmed pending Clemente's answer, and prototypes do not amplify them.

## 3. Findings (prioritised)

Pending consolidation.

## 4. Lighthouse baseline (31 October 2026, Lighthouse 13.6, throttled mobile and desktop presets)

| Page | Device | Perf | A11y | Best practices | SEO | LCP | TBT | CLS | Page weight |
|---|---|---|---|---|---|---|---|---|---|
| / | mobile | 66 | 85 | 100 | 100 | 5.8 s | 300 ms | 0 | 9,793 KiB |
| / | desktop | 87 | 85 | 100 | 100 | 2.0 s | 0 ms | 0 | 9,874 KiB |
| /about-us | mobile | 64 | 88 | 96 | 100 | 6.3 s | 340 ms | 0.004 | 1,553 KiB |
| /about-us | desktop | 86 | 88 | 96 | 100 | 1.7 s | 0 ms | 0.007 | 1,614 KiB |
| /our-services | mobile | 76 | 83 | 100 | 100 | 4.8 s | 280 ms | 0.001 | 609 KiB |
| /our-services | desktop | 94 | 83 | 100 | 100 | 1.3 s | 0 ms | 0.002 | 679 KiB |
| /track-record | mobile | 74 | 82 | 96 | 100 | 4.2 s | 380 ms | 0.002 | 7,001 KiB |
| /track-record | desktop | 95 | 82 | 96 | 100 | 1.0 s | 10 ms | 0.004 | 13,390 KiB |
| /partner-program | mobile | 71 | 85 | 100 | 100 | 4.3 s | 350 ms | 0.001 | 693 KiB |
| /partner-program | desktop | 94 | 85 | 100 | 100 | 1.2 s | 10 ms | 0.001 | 860 KiB |
| /insights | mobile | 62 | 85 | 96 | 100 | 6.5 s | 320 ms | 0 | 3,649 KiB |
| /insights | desktop | 83 | 85 | 96 | 100 | 2.6 s | 0 ms | 0 | 12,389 KiB |
| /contact-us | mobile | 67 | 87 | 100 | 100 | 5.9 s | 330 ms | 0 | 764 KiB |
| /contact-us | desktop | 85 | 87 | 100 | 100 | 1.3 s | 220 ms | 0 | 764 KiB |
| /blogs/choosing-the-right-finance-structure... | mobile | 50 | 83 | 96 | 100 | 5.9 s | 820 ms | 0 | 1,450 KiB |
| /blogs/choosing-the-right-finance-structure... | desktop | 89 | 83 | 100 | 100 | 2.1 s | 30 ms | 0 | 1,454 KiB |
| /blogs/how-real-estate-debt-advisory-works-in-the-uk | mobile | 65 | 86 | 96 | 100 | 5.5 s | 360 ms | 0 | 2,164 KiB |
| /blogs/how-real-estate-debt-advisory-works-in-the-uk | desktop | 86 | 86 | 100 | 100 | 2.5 s | 0 ms | 0.009 | 2,243 KiB |

An earlier single run of the homepage on mobile scored 55 (LCP 4.6 s, TBT 840 ms), which matches the owner's figure; scores vary run to run, the weight does not.

## 5. Concepts D, E, F and the market-rates panel

Pending consolidation.

## 6. Prototypes delivered

Pending.

## 7. Blocked or not done

Pending.
