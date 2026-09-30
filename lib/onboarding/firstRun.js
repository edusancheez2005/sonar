/**
 * First-run activation constants (2026-09-30 redesign).
 * =============================================================================
 * A brand-new account gets ONE thing at a time: the first screen after signup
 * is ORCA already answering a plain-English question, and the dashboard shows
 * a single dismissable welcome card. The 5-step questionnaire, the launch
 * spotlight, the auto-firing tutorial and the follow nudge no longer compete
 * for the first paint (see components/dashboard/FirstRunWelcome.jsx).
 *
 * Plain JS (not TS) so src/views/Landing.js can import it.
 */

/** The question ORCA answers automatically for a new account. */
// Probed live 2026-09-30 against 3 alternatives: this phrasing routes to whale
// flows and opens with a plain-English lead ("whales showed strong net buying
// in BTC… while net selling ETH") before the table; "biggest whales… keep it
// simple" produced a bare largest-transactions table with no sentence.
export const FIRST_QUESTION = 'In plain English, what have crypto whales been doing in the last 24 hours?'

/** `send=1` makes AskOrcaClient submit the prefilled question once. */
export const FIRST_QUESTION_URL = `/ai-advisor?q=${encodeURIComponent(FIRST_QUESTION)}&send=1`

/** localStorage key: the dashboard welcome card was dismissed in this browser. */
export const WELCOME_DISMISSED_KEY = 'sonar_welcome_v1'

/** Legacy key written by OrcaTutorial when the tour finishes / is skipped. */
export const TUTORIAL_DONE_KEY = 'sonar_tutorial_completed'

/**
 * True when this browser has been through the first run already — either the
 * new welcome card was dismissed, or (pre-redesign accounts) the old tutorial
 * ran here. Secondary surfaces (follow nudge, collapse hint) wait for this.
 */
export function hasSeenFirstRun() {
  try {
    return (
      localStorage.getItem(WELCOME_DISMISSED_KEY) === 'dismissed' ||
      Boolean(localStorage.getItem(TUTORIAL_DONE_KEY))
    )
  } catch {
    // Private mode / storage blocked: behave as a returning user so nothing
    // first-run-only is forced on a browser that cannot remember dismissals.
    return true
  }
}

/**
 * Signup form asks Beginner/Intermediate/Advanced/Professional (stored in
 * `profiles`), while ORCA calibrates on `user_profile.experience_level`
 * ('new' | 'intermediate' | 'advanced'). Map one to the other so nobody is
 * asked twice.
 */
export function mapSignupExperience(value) {
  const v = String(value || '').trim().toLowerCase()
  if (!v) return null
  if (v === 'beginner' || v === 'new' || v === 'novice') return 'new'
  if (v === 'intermediate') return 'intermediate'
  if (v === 'advanced' || v === 'professional' || v === 'expert' || v === 'pro') return 'advanced'
  return null
}
