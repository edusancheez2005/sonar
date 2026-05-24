/**
 * Tests for /api/orca/sessions (v4 ORCA foundations).
 *
 * Strategy: stub @supabase/supabase-js so authenticate() is a controllable
 * one-liner, then stub @/app/lib/supabaseAdmin with a chainable mock whose
 * terminal `.single()` / awaited `.limit()` returns our scripted rows.
 *
 * NOTE: we never use vi.useFakeTimers() here — fetch-on-mount style code
 * paths in route handlers serialize on real microtasks and timers deadlock
 * them (see /memories/repo/orca-redesign-2026-05-24.md).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Per-test mutable state for the supabase mocks.
// ---------------------------------------------------------------------------
type Single = { data: any; error: any }
type Many   = { data: any[]; error: any }

const state = {
  // auth: getUser response
  authUser: null as null | { id: string },
  authError: null as null | Error,
  // sessions table: result of .select(...).single() or terminal awaits
  sessionsSelectSingle: { data: null as any, error: null as any } as Single,
  sessionsSelectMany:   { data: [] as any[], error: null as any } as Many,
  sessionsInsertSingle: { data: { id: '11111111-1111-1111-1111-111111111111' }, error: null } as Single,
  sessionsUpdateResult: { error: null as any },
  sessionsDeleteResult: { error: null as any },
  messagesSelectMany:   { data: [] as any[], error: null as any } as Many,
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockImplementation(async () =>
        state.authUser
          ? { data: { user: state.authUser }, error: null }
          : { data: { user: null }, error: state.authError ?? new Error('no token') }
      ),
    },
  })),
}))

vi.mock('@/app/lib/supabaseAdmin', () => {
  /**
   * Builder is both chainable AND thenable. Mode flag chooses which scripted
   * result to resolve when awaited or .single()/.maybeSingle() is called.
   */
  function makeBuilder(table: 'orca_sessions' | 'orca_messages') {
    const b: any = { __table: table, __mode: 'list' as 'list' | 'insert' | 'update' | 'delete' }
    const ret = () => b
    b.select = vi.fn(ret)
    b.eq = vi.fn(ret)
    b.lt = vi.fn(ret)
    b.order = vi.fn(ret)
    b.limit = vi.fn(ret)
    b.insert = vi.fn(() => { b.__mode = 'insert'; return b })
    b.update = vi.fn(() => { b.__mode = 'update'; return b })
    b.delete = vi.fn(() => { b.__mode = 'delete'; return b })
    b.single = vi.fn(() => {
      if (b.__mode === 'insert') return Promise.resolve(state.sessionsInsertSingle)
      return Promise.resolve(state.sessionsSelectSingle)
    })
    b.maybeSingle = vi.fn(() => Promise.resolve(state.sessionsSelectSingle))
    b.then = (resolve: any, reject?: any) => {
      let result: any
      if (b.__mode === 'update') result = state.sessionsUpdateResult
      else if (b.__mode === 'delete') result = state.sessionsDeleteResult
      else if (table === 'orca_sessions') result = state.sessionsSelectMany
      else result = state.messagesSelectMany
      return Promise.resolve(result).then(resolve, reject)
    }
    return b
  }
  return {
    supabaseAdmin: {
      from: vi.fn((table: string) => makeBuilder(table as any)),
    },
  }
})

const ENV_BACKUP = { ...process.env }
const USER_ID = '00000000-0000-0000-0000-0000000000aa'
const SESSION_ID = '00000000-0000-0000-0000-0000000000bb'

beforeEach(() => {
  process.env = {
    ...ENV_BACKUP,
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  }
  state.authUser = null
  state.authError = null
  state.sessionsSelectSingle = { data: null, error: null }
  state.sessionsSelectMany = { data: [], error: null }
  state.sessionsInsertSingle = { data: { id: '11111111-1111-1111-1111-111111111111' }, error: null }
  state.sessionsUpdateResult = { error: null }
  state.sessionsDeleteResult = { error: null }
  state.messagesSelectMany = { data: [], error: null }
  vi.resetModules()
})

function req(url: string, init: RequestInit = {}): Request {
  return new Request(url, init)
}

function authed(extra: RequestInit = {}): RequestInit {
  return {
    ...extra,
    headers: { ...(extra.headers as any), authorization: 'Bearer good-token' },
  }
}

// ---------------------------------------------------------------------------
// GET /api/orca/sessions
// ---------------------------------------------------------------------------
describe('GET /api/orca/sessions', () => {
  it('returns 401 without a bearer token', async () => {
    const { GET } = await import('@/app/api/orca/sessions/route')
    const res = await GET(req('https://e.com/api/orca/sessions'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('unauthenticated')
  })

  it('returns the caller\'s sessions on a valid token', async () => {
    state.authUser = { id: USER_ID }
    state.sessionsSelectMany = {
      data: [
        { id: SESSION_ID, title: 'BTC chat', surface_seed: 'drawer', updated_at: '2026-06-03T10:00Z', created_at: '2026-06-03T09:00Z', archived: false },
      ],
      error: null,
    }
    const { GET } = await import('@/app/api/orca/sessions/route')
    const res = await GET(req('https://e.com/api/orca/sessions', authed()))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessions).toHaveLength(1)
    expect(body.sessions[0].id).toBe(SESSION_ID)
    expect(res.headers.get('cache-control')).toMatch(/no-store/)
  })

  it('returns 500 with opaque error on db failure (no leak)', async () => {
    state.authUser = { id: USER_ID }
    state.sessionsSelectMany = { data: [], error: { message: 'inner detail' } }
    const { GET } = await import('@/app/api/orca/sessions/route')
    const res = await GET(req('https://e.com/api/orca/sessions', authed()))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('internal_error')
    expect(JSON.stringify(body)).not.toContain('inner detail')
  })
})

// ---------------------------------------------------------------------------
// POST /api/orca/sessions
// ---------------------------------------------------------------------------
describe('POST /api/orca/sessions', () => {
  it('returns 401 without auth', async () => {
    const { POST } = await import('@/app/api/orca/sessions/route')
    const res = await POST(req('https://e.com/api/orca/sessions', { method: 'POST' }))
    expect(res.status).toBe(401)
  })

  it('creates a session and returns the new id', async () => {
    state.authUser = { id: USER_ID }
    state.sessionsInsertSingle = { data: { id: SESSION_ID }, error: null }
    const { POST } = await import('@/app/api/orca/sessions/route')
    const res = await POST(req('https://e.com/api/orca/sessions', authed({
      method: 'POST',
      body: JSON.stringify({ surface_seed: 'drawer', title: 'BTC question' }),
    })))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe(SESSION_ID)
  })

  it('silently ignores invalid surface_seed (insert still succeeds with null)', async () => {
    state.authUser = { id: USER_ID }
    state.sessionsInsertSingle = { data: { id: SESSION_ID }, error: null }
    const { POST } = await import('@/app/api/orca/sessions/route')
    const res = await POST(req('https://e.com/api/orca/sessions', authed({
      method: 'POST',
      body: JSON.stringify({ surface_seed: 'evil' }),
    })))
    expect(res.status).toBe(201)
  })

  it('returns 500 on insert failure (no leak)', async () => {
    state.authUser = { id: USER_ID }
    state.sessionsInsertSingle = { data: null, error: { message: 'rls violation' } }
    const { POST } = await import('@/app/api/orca/sessions/route')
    const res = await POST(req('https://e.com/api/orca/sessions', authed({
      method: 'POST', body: '{}',
    })))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('internal_error')
  })
})

// ---------------------------------------------------------------------------
// /api/orca/sessions/[id]
// ---------------------------------------------------------------------------
describe('GET /api/orca/sessions/[id]', () => {
  it('returns 400 on invalid uuid', async () => {
    state.authUser = { id: USER_ID }
    const { GET } = await import('@/app/api/orca/sessions/[id]/route')
    const res = await GET(req('https://e.com/api/orca/sessions/not-a-uuid', authed()), { params: { id: 'not-a-uuid' } })
    expect(res.status).toBe(400)
  })

  it('returns 404 when no session matches', async () => {
    state.authUser = { id: USER_ID }
    state.sessionsSelectSingle = { data: null, error: null }
    const { GET } = await import('@/app/api/orca/sessions/[id]/route')
    const res = await GET(req('https://e.com/api/orca/sessions/' + SESSION_ID, authed()), { params: { id: SESSION_ID } })
    expect(res.status).toBe(404)
  })

  it('returns session + messages on success', async () => {
    state.authUser = { id: USER_ID }
    state.sessionsSelectSingle = {
      data: { id: SESSION_ID, title: 't', surface_seed: 'drawer', archived: false, created_at: 'x', updated_at: 'y' },
      error: null,
    }
    state.messagesSelectMany = {
      data: [{ id: 1, role: 'user', content: 'hi', tool_calls: null, sources: null, follow_ups: null, focus: null, confirm: null, created_at: 'z' }],
      error: null,
    }
    const { GET } = await import('@/app/api/orca/sessions/[id]/route')
    const res = await GET(req('https://e.com/api/orca/sessions/' + SESSION_ID, authed()), { params: { id: SESSION_ID } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.session.id).toBe(SESSION_ID)
    expect(body.messages).toHaveLength(1)
  })
})

describe('PATCH /api/orca/sessions/[id]', () => {
  it('rejects no-op patches with 400', async () => {
    state.authUser = { id: USER_ID }
    const { PATCH } = await import('@/app/api/orca/sessions/[id]/route')
    const res = await PATCH(
      req('https://e.com/api/orca/sessions/' + SESSION_ID, authed({ method: 'PATCH', body: '{}' })),
      { params: { id: SESSION_ID } }
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('no_changes')
  })

  it('updates title + archived and returns ok', async () => {
    state.authUser = { id: USER_ID }
    state.sessionsUpdateResult = { error: null }
    const { PATCH } = await import('@/app/api/orca/sessions/[id]/route')
    const res = await PATCH(
      req('https://e.com/api/orca/sessions/' + SESSION_ID, authed({
        method: 'PATCH',
        body: JSON.stringify({ title: 'renamed', archived: true }),
      })),
      { params: { id: SESSION_ID } }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})

describe('DELETE /api/orca/sessions/[id]', () => {
  it('returns 401 without auth', async () => {
    const { DELETE } = await import('@/app/api/orca/sessions/[id]/route')
    const res = await DELETE(req('https://e.com/api/orca/sessions/' + SESSION_ID, { method: 'DELETE' }), { params: { id: SESSION_ID } })
    expect(res.status).toBe(401)
  })

  it('returns {deleted:true} on success', async () => {
    state.authUser = { id: USER_ID }
    state.sessionsDeleteResult = { error: null }
    const { DELETE } = await import('@/app/api/orca/sessions/[id]/route')
    const res = await DELETE(req('https://e.com/api/orca/sessions/' + SESSION_ID, authed({ method: 'DELETE' })), { params: { id: SESSION_ID } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(true)
  })
})
