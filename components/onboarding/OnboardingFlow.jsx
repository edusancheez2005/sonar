'use client'
/**
 * OnboardingFlow
 * =============================================================================
 * Five-step personalisation modal shown the first time a logged-in user lands
 * on the dashboard without a `user_profile` row.
 *
 * Trigger logic (see `useOnboardingGate` for the testable version):
 *   1. Mount only inside an authenticated context (the parent already
 *      enforces this via AuthGuard).
 *   2. Query `user_profile` for `user_id = current user`.
 *   3. If the row is missing AND `personalization_dismissed` is false:
 *        → render the modal.
 *      Else: render nothing.
 *   4. Modal is dismissable (Skip personalisation) — that sets
 *      `personalization_dismissed = true` so it stops reappearing.
 *   5. Completing all five steps writes the full profile and closes the modal.
 *
 * Locked decisions (ORCA_COPILOT_BUILD_PROMPT.md §7):
 *   - We do NOT collect dollar amounts here (§7.1).
 *   - We do NOT collect jurisdiction here (§7.5). That comes later, at the
 *     trading-waitlist signup only.
 *
 * House Rules (§3.5.2): no emojis. Styled-components inherit the dark theme
 * already in use across `app/dashboard` and `components/onboarding`.
 *
 * Testing seam: the Supabase client is injected via the `client` prop with a
 * `supabaseBrowser()` default, so component tests can pass a stub.
 * =============================================================================
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

/* ── Step definitions ───────────────────────────────────────────────────── */

const STEPS = [
  {
    field: 'experience_level',
    title: 'How would you describe your crypto experience?',
    subtitle: 'We will tune explanations to the right level of detail.',
    multi: false,
    options: [
      { value: 'new', label: 'New to crypto', desc: 'I am still learning the basics.' },
      { value: 'intermediate', label: 'Intermediate', desc: 'I have traded or held for a while.' },
      { value: 'advanced', label: 'Advanced', desc: 'I am comfortable with on-chain and derivatives.' },
    ],
  },
  {
    field: 'primary_goal',
    title: 'What are you here to do?',
    subtitle: 'Pick whichever fits best — you can change it later.',
    multi: false,
    options: [
      { value: 'learn', label: 'Learn the market', desc: 'Understand what is happening and why.' },
      { value: 'track', label: 'Track positions', desc: 'Monitor tokens I already hold.' },
      { value: 'research', label: 'Research opportunities', desc: 'Find signals before they are crowded.' },
      { value: 'trade', label: 'Trade actively', desc: 'Make decisions on a short horizon.' },
    ],
  },
  {
    field: 'risk_tolerance',
    title: 'How much risk do you want to see surfaced?',
    subtitle: 'This filters how loud the copilot gets, not what we hide.',
    multi: false,
    options: [
      { value: 'conservative', label: 'Conservative', desc: 'Majors only. Skip meme-coin noise.' },
      { value: 'balanced', label: 'Balanced', desc: 'Mix of majors and mid-caps.' },
      { value: 'aggressive', label: 'Aggressive', desc: 'Show me the long tail.' },
    ],
  },
  {
    field: 'time_horizon',
    title: 'What time horizon do you care about?',
    subtitle: 'Determines which signal windows we prioritise.',
    multi: false,
    options: [
      { value: 'intraday', label: 'Intraday', desc: 'Minutes to hours.' },
      { value: 'swing', label: 'Swing', desc: 'Days to a couple of weeks.' },
      { value: 'position', label: 'Position', desc: 'Weeks to a few months.' },
      { value: 'long_term', label: 'Long term', desc: 'Quarters to years.' },
    ],
  },
  {
    field: 'preferred_chains',
    title: 'Which chains do you care about most?',
    subtitle: 'Pick as many as apply. You can change this any time.',
    multi: true,
    options: [
      { value: 'bitcoin', label: 'Bitcoin' },
      { value: 'ethereum', label: 'Ethereum' },
      { value: 'solana', label: 'Solana' },
      { value: 'base', label: 'Base' },
      { value: 'arbitrum', label: 'Arbitrum' },
      { value: 'polygon', label: 'Polygon' },
      { value: 'bsc', label: 'BNB Chain' },
      { value: 'tron', label: 'Tron' },
      { value: 'xrp', label: 'XRP Ledger' },
      { value: 'other', label: 'Other' },
    ],
  },
]

/* ── Styled primitives (matches OrcaTutorial palette) ──────────────────── */

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(5, 9, 16, 0.72);
  backdrop-filter: blur(6px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

const Card = styled(motion.div)`
  width: 100%;
  max-width: 560px;
  background: rgba(13, 20, 33, 0.98);
  border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
  font-family: var(--font-sans);
  color: #e0e6ed;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
`

const Header = styled.div`
  padding: 24px 28px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const StepEyebrow = styled.div`
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b7a8c;
`

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
  color: #e0e6ed;
`

const Subtitle = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: #8896a6;
`

const Body = styled.div`
  padding: 16px 28px 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Option = styled.button`
  appearance: none;
  font: inherit;
  text-align: left;
  background: ${(p) => (p.$selected ? 'rgba(0, 229, 255, 0.10)' : 'rgba(255, 255, 255, 0.02)')};
  border: 1px solid ${(p) => (p.$selected ? 'rgba(0, 229, 255, 0.55)' : 'rgba(255, 255, 255, 0.06)')};
  border-radius: 10px;
  padding: 14px 16px;
  color: #e0e6ed;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover { background: rgba(0, 229, 255, 0.06); }
  &:focus-visible {
    outline: 2px solid #00e5ff;
    outline-offset: 2px;
  }
`

const OptionLabel = styled.span`
  font-size: 14px;
  font-weight: 600;
`

const OptionDesc = styled.span`
  font-size: 12px;
  color: #8896a6;
  line-height: 1.45;
`

const Footer = styled.div`
  padding: 16px 28px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
`

const Dots = styled.div`
  display: flex;
  gap: 6px;
`

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(p) => (p.$on ? '#00e5ff' : 'rgba(0, 229, 255, 0.18)')};
`

const Actions = styled.div`
  display: flex;
  gap: 8px;
`

const Btn = styled.button`
  appearance: none;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  padding: 9px 16px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &:focus-visible {
    outline: 2px solid #00e5ff;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const PrimaryBtn = styled(Btn)`
  background: linear-gradient(135deg, #36a6ba, #2d8a9a);
  color: #ffffff;

  &:hover:not(:disabled) {
    filter: brightness(1.08);
  }
`

const GhostBtn = styled(Btn)`
  background: transparent;
  color: #8896a6;
  border-color: rgba(255, 255, 255, 0.08);

  &:hover {
    color: #e0e6ed;
    border-color: rgba(255, 255, 255, 0.18);
  }
`

const SkipAllRow = styled.div`
  padding: 0 28px 18px;
  text-align: center;
`

const SkipAllBtn = styled.button`
  appearance: none;
  background: none;
  border: none;
  font: inherit;
  font-size: 12px;
  color: #6b7a8c;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover { color: #8896a6; }
  &:focus-visible {
    outline: 2px solid #00e5ff;
    outline-offset: 2px;
    border-radius: 4px;
  }
`

/* ── Component ─────────────────────────────────────────────────────────── */

export default function OnboardingFlow({
  userId,
  onComplete,
  onDismiss,
  client,
}) {
  const sb = useMemo(() => client ?? supabaseBrowser(), [client])
  const [stepIdx, setStepIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const cardRef = useRef(null)

  const step = STEPS[stepIdx]
  const isLast = stepIdx === STEPS.length - 1
  const value = answers[step.field]
  const hasValue = step.multi ? Array.isArray(value) && value.length > 0 : Boolean(value)

  const selectOption = useCallback(
    (val) => {
      setAnswers((prev) => {
        if (step.multi) {
          const current = Array.isArray(prev[step.field]) ? prev[step.field] : []
          const next = current.includes(val)
            ? current.filter((v) => v !== val)
            : [...current, val]
          return { ...prev, [step.field]: next }
        }
        return { ...prev, [step.field]: val }
      })
    },
    [step]
  )

  const writeProfile = useCallback(
    async (extra = {}) => {
      if (!userId) {
        // Without a user_id we cannot write. Surface and let parent decide.
        throw new Error('Missing user id')
      }
      const payload = {
        user_id: userId,
        experience_level: answers.experience_level ?? null,
        primary_goal: answers.primary_goal ?? null,
        risk_tolerance: answers.risk_tolerance ?? null,
        time_horizon: answers.time_horizon ?? null,
        preferred_chains: answers.preferred_chains ?? null,
        ...extra,
      }
      const { error: upsertError } = await sb
        .from('user_profile')
        .upsert(payload, { onConflict: 'user_id' })
      if (upsertError) throw upsertError
    },
    [answers, sb, userId]
  )

  const handleNext = useCallback(async () => {
    setError(null)
    if (!isLast) {
      setStepIdx((i) => i + 1)
      return
    }
    setSaving(true)
    try {
      await writeProfile()
      setSaving(false)
      onComplete?.()
    } catch (err) {
      setSaving(false)
      setError('Could not save. Try again.')
    }
  }, [isLast, onComplete, writeProfile])

  const handleSkipStep = useCallback(() => {
    setError(null)
    if (!isLast) {
      setStepIdx((i) => i + 1)
      return
    }
    // Last step skipped: still write whatever we have collected.
    setSaving(true)
    writeProfile()
      .then(() => {
        setSaving(false)
        onComplete?.()
      })
      .catch(() => {
        setSaving(false)
        setError('Could not save. Try again.')
      })
  }, [isLast, onComplete, writeProfile])

  const handleSkipAll = useCallback(async () => {
    setError(null)
    setSaving(true)
    try {
      await writeProfile({ personalization_dismissed: true })
      setSaving(false)
      onDismiss?.()
    } catch (err) {
      setSaving(false)
      setError('Could not save. Try again.')
    }
  }, [onDismiss, writeProfile])

  // Esc handler — counts as "skip this step" for keyboard users.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleSkipStep()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSkipStep])

  // Focus the card on mount and when the step changes (a11y).
  useEffect(() => {
    cardRef.current?.focus()
  }, [stepIdx])

  if (typeof window === 'undefined') return null

  const modal = (
    <AnimatePresence>
      <Backdrop
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        role="presentation"
      >
        <Card
          ref={cardRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
        >
          <Header>
            <StepEyebrow>
              Step {stepIdx + 1} of {STEPS.length}
            </StepEyebrow>
            <Title id="onboarding-title">{step.title}</Title>
            <Subtitle>{step.subtitle}</Subtitle>
          </Header>

          <Body role="group" aria-label={step.title}>
            {step.options.map((opt) => {
              const selected = step.multi
                ? Array.isArray(value) && value.includes(opt.value)
                : value === opt.value
              return (
                <Option
                  key={opt.value}
                  type="button"
                  $selected={selected}
                  aria-pressed={selected}
                  onClick={() => selectOption(opt.value)}
                  data-testid={`onboarding-option-${opt.value}`}
                >
                  <OptionLabel>{opt.label}</OptionLabel>
                  {opt.desc ? <OptionDesc>{opt.desc}</OptionDesc> : null}
                </Option>
              )
            })}
          </Body>

          {error ? (
            <SkipAllRow role="alert">
              <OptionDesc style={{ color: '#ff7a7a' }}>{error}</OptionDesc>
            </SkipAllRow>
          ) : null}

          <Footer>
            <Dots aria-hidden="true">
              {STEPS.map((_, i) => (
                <Dot key={i} $on={i <= stepIdx} />
              ))}
            </Dots>
            <Actions>
              <GhostBtn
                type="button"
                onClick={handleSkipStep}
                disabled={saving}
                data-testid="onboarding-skip-step"
              >
                Skip
              </GhostBtn>
              <PrimaryBtn
                type="button"
                onClick={handleNext}
                disabled={saving || (!hasValue && !isLast)}
                data-testid="onboarding-next"
              >
                {saving ? 'Saving' : isLast ? 'Finish' : 'Next'}
              </PrimaryBtn>
            </Actions>
          </Footer>

          <SkipAllRow>
            <SkipAllBtn
              type="button"
              onClick={handleSkipAll}
              disabled={saving}
              data-testid="onboarding-skip-all"
            >
              Skip personalisation
            </SkipAllBtn>
          </SkipAllRow>
        </Card>
      </Backdrop>
    </AnimatePresence>
  )

  return createPortal(modal, document.body)
}

export { STEPS as ONBOARDING_STEPS }
