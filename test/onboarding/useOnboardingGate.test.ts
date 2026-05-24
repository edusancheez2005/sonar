import { describe, it, expect } from 'vitest';
import { evaluateOnboardingGate, REQUIRED_FIELDS } from '@/components/onboarding/useOnboardingGate';

const fullProfile = {
  experience_level: 'new',
  primary_goal: 'learn',
  risk_tolerance: 'balanced',
  time_horizon: 'swing',
  preferred_chains: ['bitcoin'],
  personalization_dismissed: false,
};

const session = { user: { id: 'user-abc' } };

describe('evaluateOnboardingGate', () => {
  it('hidden when no session', () => {
    expect(evaluateOnboardingGate({ session: null, profile: null })).toEqual({ state: 'hidden' });
  });

  it('show when authed and no profile row', () => {
    expect(evaluateOnboardingGate({ session, profile: null })).toEqual({
      state: 'show',
      userId: 'user-abc',
    });
  });

  it('hidden when profile is complete', () => {
    expect(evaluateOnboardingGate({ session, profile: fullProfile })).toEqual({ state: 'hidden' });
  });

  it('hidden when user dismissed personalisation', () => {
    expect(
      evaluateOnboardingGate({
        session,
        profile: { ...fullProfile, personalization_dismissed: true, experience_level: null },
      })
    ).toEqual({ state: 'hidden' });
  });

  for (const field of REQUIRED_FIELDS) {
    it(`show when ${field} is null on an otherwise complete profile`, () => {
      expect(
        evaluateOnboardingGate({ session, profile: { ...fullProfile, [field]: null } })
      ).toEqual({ state: 'show', userId: 'user-abc' });
    });
  }

  it('show when preferred_chains is an empty array (treated as missing)', () => {
    expect(
      evaluateOnboardingGate({ session, profile: { ...fullProfile, preferred_chains: [] } })
    ).toEqual({ state: 'show', userId: 'user-abc' });
  });
});
