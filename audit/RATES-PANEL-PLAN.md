# Market rates panel: the plan

The panel on the homepage reads the feed at https://edusancheez2005.github.io/roscap-rates/rates.json (the `roscap-rates` repository). This plan covers what the panel says, where the numbers come from, and what has to change so it is right on every day.

## 1. Checked on 31 October 2026

| Rate | Panel shows | Official position | Verdict |
|---|---|---|---|
| Bank of England Bank Rate | 3.75% | 3.75%. Last change: cut of 25 bps on 18 Dec 2025. Held at every decision since; latest decision 17 Sep 2026 (held, 6 to 3); next decision 5 Nov 2026 | Number right. The old chip "Cut 25 bps since 18 Dec 2025" read as if the latest decision was a cut |
| Fed funds target range | 3.75% to 4.00% | 3.75% to 4.00%. Raised 25 bps on 16 Sep 2026 (effective 17 Sep); held on 28 Oct 2026 (10 to 2) | Number right. The old chip "Raised 25 bps since 17 Sep 2026" read as if the latest decision was a rise |
| Euribor 3-month | 2.676% (fixing of 30 Oct 2026) | Daily fixing by EMMI | Number in line with the fixing; licensing question (section 4) |

Sources: Bank of England, "The interest rate (Bank Rate)" and the Bank Rate history table (bankofengland.co.uk, read 31 Oct 2026); Federal Reserve press release of 28 Oct 2026 (federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm); the feed itself.

Anyone checking with a chatbot may get an older figure: those answers are often months out of date. The Bank of England page is the reference.

## 2. Wording (done in the prototype)

The chip now says something true on every day, using only what the feed already has:
- In the 30 days after a move: "Cut 25 bps" or "Raised 25 bps", with "on 18 Dec 2025".
- After that: "Held", with "since the 18 Dec 2025 cut" (or "since the 17 Sep 2026 rise").
- Euribor: "Up 3.3 bps", with "fixing of 30 Oct 2026".

Today the panel reads: Bank of England "Held, since the 18 Dec 2025 cut"; Fed "Held, since the 17 Sep 2026 rise"; Euribor "Up 3.3 bps, fixing of 30 Oct 2026".

## 3. Feed changes (roscap-rates repository)

1. Decision calendar. Add a small `calendar.json` with the Bank of England MPC and FOMC decision dates for this year and next (both are published a year ahead). From it the feed adds, per rate: `last_decision_date`, `last_decision_outcome` (held, cut or raised), `next_decision_date`. The panel can then say "Held at the 17 Sep 2026 decision" and, if wanted, "Next decision 5 Nov 2026".
2. Fed date. Use the FOMC announcement date (16 Sep 2026) for wording, keeping the effective date (17 Sep) as data.
3. Validation before publishing. Reject a value outside a sane range (0 to 15%), a non-numeric value, a date in the future or more than 10 days old, or a change larger than 1 percentage point; keep the last good value and mark it stale. This is what would have stopped the "400.00%" shown on 21 Oct 2026, when the Fed source returned an HTML page instead of data.
4. Alert. Let the GitHub Action fail loudly (email from GitHub) when validation rejects a value, so it is fixed the same day.
5. Euribor freshness. The fixing arrives one to two days late because it is scraped from a third-party web page. If Euribor stays, take it from a licensed source; if it is swapped (section 4), the ECB Data Portal publishes the deposit facility rate as data.

## 4. Euribor decision (in the message to Clemente)

EMMI, which publishes Euribor, says showing it on a commercial website needs a licence; the free delayed data is for non-commercial use only, and "Euribor" is a registered trademark that must be marked. Options:
- Swap the card for the ECB deposit facility rate: free to show with attribution, a policy rate like the other two, so the "Held / Cut / Raised" wording works the same way. Recommended.
- Keep Euribor and take EMMI's licence (about 1,000 euros a year per website at the last published price), credit EMMI and add the trademark notice.
- Remove the third card.

## 5. On the page

- The panel never shows a number that failed validation; it keeps the placeholder instead (done in the prototype).
- Replace the hover tooltips (title attributes, which phones and keyboards cannot reach) with the visible chip and date line (done in the prototype).
- The wave lines drift slowly and no longer react to the mouse (done in the prototype).

## 6. Order of work

1. Ship the prototype's panel with the new wording (Shikhar, with the homepage handoff).
2. Add validation and the alert to the feed (Edu, this week).
3. Euribor: act on Clemente's answer.
4. Add the decision calendar and switch the wording to "Held at the <date> decision" (Edu, when convenient).
