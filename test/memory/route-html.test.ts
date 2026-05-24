/**
 * Memory route HTML negotiation tests (W1.2 of ORCA_AGENTIC_REDESIGN_PROMPT.md).
 *
 * Verifies the GET handler returns a tiny inline HTML landing for unauthenticated
 * browser requests (Accept: text/html), but still returns the JSON 401 for API
 * clients that did not negotiate HTML.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/app/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      delete: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        then: undefined,
      })),
    })),
  },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      // No valid token \u2192 authenticate() returns 401.
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('no token') }),
    },
  })),
}))

const ENV_BACKUP = { ...process.env }

beforeEach(() => {
  process.env = {
    ...ENV_BACKUP,
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  }
})

describe('GET /api/orca/memory \u2014 HTML negotiation', () => {
  it('returns the inline HTML landing when an unauthenticated browser asks for text/html', async () => {
    const { GET } = await import('@/app/api/orca/memory/route')
    const req = new Request('https://example.com/api/orca/memory', {
      headers: { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type') || '').toContain('text/html')
    const html = await res.text()
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('/dashboard/personal/memory')
    expect(html).not.toMatch(/<script\b/i)
  })

  it('still returns JSON 401 for API clients that do not negotiate HTML', async () => {
    const { GET } = await import('@/app/api/orca/memory/route')
    const req = new Request('https://example.com/api/orca/memory', {
      headers: { accept: 'application/json' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('unauthenticated')
  })

  it('returns JSON 401 when no Accept header is sent (curl default)', async () => {
    const { GET } = await import('@/app/api/orca/memory/route')
    const req = new Request('https://example.com/api/orca/memory')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
