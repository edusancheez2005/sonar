import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingFlow, { ONBOARDING_STEPS } from '@/components/onboarding/OnboardingFlow';

/**
 * Stub Supabase client that records every upsert call so we can assert payloads.
 */
function makeStubClient(opts = {}) {
  const upsertCalls = [];
  const error = opts.error ?? null;
  const client = {
    from(table) {
      return {
        upsert(payload, options) {
          upsertCalls.push({ table, payload, options });
          return Promise.resolve({ data: null, error });
        },
      };
    },
  };
  return { client, upsertCalls };
}

const USER_ID = '00000000-0000-0000-0000-000000000001';

function renderModal(overrides = {}) {
  const { client, upsertCalls } = makeStubClient(overrides.clientOpts);
  const onComplete = vi.fn();
  const onDismiss = vi.fn();
  const utils = render(
    <OnboardingFlow
      userId={USER_ID}
      client={client}
      onComplete={onComplete}
      onDismiss={onDismiss}
    />
  );
  return { ...utils, upsertCalls, onComplete, onDismiss };
}

describe('OnboardingFlow', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders step 1 with the experience question and step counter', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(ONBOARDING_STEPS[0].title)).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-option-new')).toBeInTheDocument();
  });

  it('Next button is disabled until an option is selected', () => {
    renderModal();
    const next = screen.getByTestId('onboarding-next');
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByTestId('onboarding-option-new'));
    expect(next).not.toBeDisabled();
  });

  it('advances through all 5 steps and upserts the full profile on Finish', async () => {
    const user = userEvent.setup();
    const { upsertCalls, onComplete } = renderModal();

    // Step 1: experience
    await user.click(screen.getByTestId('onboarding-option-intermediate'));
    await user.click(screen.getByTestId('onboarding-next'));
    // Step 2: primary_goal
    await user.click(screen.getByTestId('onboarding-option-research'));
    await user.click(screen.getByTestId('onboarding-next'));
    // Step 3: risk_tolerance
    await user.click(screen.getByTestId('onboarding-option-balanced'));
    await user.click(screen.getByTestId('onboarding-next'));
    // Step 4: time_horizon
    await user.click(screen.getByTestId('onboarding-option-swing'));
    await user.click(screen.getByTestId('onboarding-next'));
    // Step 5: preferred_chains (multi)
    await user.click(screen.getByTestId('onboarding-option-bitcoin'));
    await user.click(screen.getByTestId('onboarding-option-solana'));
    expect(screen.getByTestId('onboarding-next')).toHaveTextContent(/finish/i);
    await user.click(screen.getByTestId('onboarding-next'));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());

    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0].table).toBe('user_profile');
    expect(upsertCalls[0].options).toEqual({ onConflict: 'user_id' });
    expect(upsertCalls[0].payload).toMatchObject({
      user_id: USER_ID,
      experience_level: 'intermediate',
      primary_goal: 'research',
      risk_tolerance: 'balanced',
      time_horizon: 'swing',
      preferred_chains: ['bitcoin', 'solana'],
    });
    expect(upsertCalls[0].payload.personalization_dismissed).toBeUndefined();
  });

  it('multi-select toggles values on the preferred_chains step', async () => {
    const user = userEvent.setup();
    renderModal();
    // Advance to step 5 with minimum valid answers.
    for (const value of ['new', 'learn', 'conservative', 'intraday']) {
      await user.click(screen.getByTestId(`onboarding-option-${value}`));
      await user.click(screen.getByTestId('onboarding-next'));
    }
    const btc = screen.getByTestId('onboarding-option-bitcoin');
    await user.click(btc);
    expect(btc).toHaveAttribute('aria-pressed', 'true');
    await user.click(btc);
    expect(btc).toHaveAttribute('aria-pressed', 'false');
  });

  it('Skip advances to the next step without selecting a value', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByTestId('onboarding-skip-step'));
    expect(screen.getByText(/step 2 of 5/i)).toBeInTheDocument();
  });

  it('Skip personalisation persists personalization_dismissed and calls onDismiss', async () => {
    const user = userEvent.setup();
    const { upsertCalls, onDismiss } = renderModal();
    await user.click(screen.getByTestId('onboarding-skip-all'));
    await waitFor(() => expect(onDismiss).toHaveBeenCalled());
    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0].payload).toMatchObject({
      user_id: USER_ID,
      personalization_dismissed: true,
    });
  });

  it('Escape key skips the current step', async () => {
    renderModal();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.getByText(/step 2 of 5/i)).toBeInTheDocument());
  });

  it('shows an error message when the upsert fails', async () => {
    const user = userEvent.setup();
    const { client, upsertCalls } = makeStubClient({ error: { message: 'boom' } });
    const onComplete = vi.fn();
    render(
      <OnboardingFlow userId={USER_ID} client={client} onComplete={onComplete} />
    );
    // Advance to last step.
    const values = ['new', 'learn', 'conservative', 'intraday', 'bitcoin'];
    for (const v of values) {
      const u = userEvent.setup();
      await u.click(screen.getByTestId(`onboarding-option-${v}`));
      // For the last step we click finish below; for the other 4 we click next.
      if (v !== 'bitcoin') await u.click(screen.getByTestId('onboarding-next'));
    }
    await user.click(screen.getByTestId('onboarding-next'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(onComplete).not.toHaveBeenCalled();
    expect(upsertCalls).toHaveLength(1);
  });

  it('contains no emoji characters anywhere in the rendered DOM', () => {
    renderModal();
    const text = document.body.textContent ?? '';
    // Conservative emoji regex covering the common Unicode emoji ranges.
    const emojiRegex =
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}]/u;
    expect(text).not.toMatch(emojiRegex);
  });

  it('the dialog is keyboard-focusable for screen readers', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'onboarding-title');
  });
});
