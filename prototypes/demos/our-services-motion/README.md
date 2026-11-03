# Our Services: motion demos

For review only: not on the website and not in the before/after video. Open `our-services-motion-demos.bundle.html` in a browser, pick an option at the top and press Replay; `preview.mp4` shows all of them in 45 seconds.

The two card sections ("Roscap's experience covers" and "Roscap provides access to") are as live: same cards, icons and wording. Each option applies to both sections, so they behave the same way.

| Option | What happens | Feel |
|---|---|---|
| 1. In turn | The heading, then each card one after another; inside a card the icon, the title and the line arrive in that order, each sharpening from a soft blur. On a phone each card arrives as you reach it | Calm, the quietest |
| 2. With the scroll | The cards follow your scrolling, one by one (left to right on a computer), and go back if you scroll up | More playful; less predictable |
| 3. Signature | The gold Roscap R draws itself above the first heading, then the cards arrive in turn and each icon is revealed from the bottom up. The second section has no R, so it happens once | Calm, with one memorable moment |
| 4. Light pass | The cards arrive, then a thin gold light runs once around each card, handing over from card to card; on a computer a soft glow follows the pointer over a card | Sleek, the most "tech" |

Recommendation: option 3. It is option 1 (the calmest) plus the R once, which is the "favicon coming in" idea without anything loud. The second card section ("Roscap provides access to") gets the same in-turn entrance without the R, so the page stays consistent.

## Our Process: another shape

At the bottom of the demo: the live "A Structured Approach to Every Transaction" as a row of six steps with a gold line that fills from left to right as you scroll (on tablets it runs once; on phones the steps are cards you swipe through). Same live wording. Today Our Process and the proposed Partner Program timeline share the same shape (heading on the left, numbered steps going down the right); the row keeps them clearly different.

## Notes for building it later
- No libraries: CSS animations triggered by IntersectionObserver (options 1, 3, 4), CSS scroll-driven animation with a fallback to option 1 (option 2), and a few lines of JS for the pointer glow.
- Everything is static and complete under reduced motion and without JavaScript.
- Checks run: every option at 1440 and 390 ends with all cards fully visible, the R draws and fills, the process steps light up, no sideways scrolling, no console errors, axe-core 0 violations, reduced motion shows everything at once (21 checks).
