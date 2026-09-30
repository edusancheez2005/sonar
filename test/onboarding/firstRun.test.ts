import { describe, it, expect } from 'vitest'
import { mapSignupExperience, FIRST_QUESTION_URL, FIRST_QUESTION } from '../../lib/onboarding/firstRun'

describe('mapSignupExperience', () => {
  it('maps the signup vocabulary onto user_profile.experience_level', () => {
    expect(mapSignupExperience('beginner')).toBe('new')
    expect(mapSignupExperience('Intermediate')).toBe('intermediate')
    expect(mapSignupExperience('advanced')).toBe('advanced')
    expect(mapSignupExperience('professional')).toBe('advanced')
  })
  it('returns null for blank or unknown values', () => {
    expect(mapSignupExperience('')).toBeNull()
    expect(mapSignupExperience(undefined)).toBeNull()
    expect(mapSignupExperience('whale')).toBeNull()
  })
})

describe('FIRST_QUESTION_URL', () => {
  it('lands on /ai-advisor with the question prefilled and send=1', () => {
    expect(FIRST_QUESTION_URL.startsWith('/ai-advisor?q=')).toBe(true)
    expect(FIRST_QUESTION_URL.endsWith('&send=1')).toBe(true)
    expect(decodeURIComponent(FIRST_QUESTION_URL)).toContain(FIRST_QUESTION)
  })
})
