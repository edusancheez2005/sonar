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

/**
 * localStorage key PREFIX for "welcome card dismissed". Keyed per user id:
 * Eduardo created a second account in his own browser on 2026-09-30 and the
 * card never showed, because a browser-wide key had already been set by his
 * first account. Everything first-run is per account now.
 */
export const WELCOME_DISMISSED_KEY = 'sonar_welcome_v1'
export function welcomeKeyFor(userId) {
  return userId ? `${WELCOME_DISMISSED_KEY}:${userId}` : WELCOME_DISMISSED_KEY
}

/** sessionStorage flag: ask FIRST_QUESTION automatically on the next /ai-advisor mount. */
const FIRST_QUESTION_ARMED_KEY = 'sonar_first_question_armed'
/** Call right before an OAuth redirect (Google sign-up) — the flag survives the round trip in the same tab. */
export function armFirstQuestion() {
  try { sessionStorage.setItem(FIRST_QUESTION_ARMED_KEY, '1') } catch { /* ignore */ }
}
/** Returns true once, then clears the flag. */
export function consumeFirstQuestion() {
  try {
    if (sessionStorage.getItem(FIRST_QUESTION_ARMED_KEY) !== '1') return false
    sessionStorage.removeItem(FIRST_QUESTION_ARMED_KEY)
    return true
  } catch { return false }
}

/** Legacy key written by OrcaTutorial when the tour finishes / is skipped. */
export const TUTORIAL_DONE_KEY = 'sonar_tutorial_completed'

/**
 * True when THIS ACCOUNT dismissed the welcome card in this browser.
 * Secondary surfaces (follow nudge) wait for this. Deliberately ignores the
 * browser-wide legacy tutorial key — that is what hid the card from a second
 * account in the same browser.
 */
export function hasSeenFirstRun(userId) {
  try {
    return localStorage.getItem(welcomeKeyFor(userId)) === 'dismissed'
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
