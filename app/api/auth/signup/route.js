import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

function isValidEmail(email) {
  if (typeof email !== 'string') return false
  const e = email.trim()
  if (!e || e.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

export async function POST(req) {
  try {
    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')

    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Create a confirmed user (bypass email verification)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (error) {
      const msg = String(error?.message || '')
      if (/already\s*(been\s*)?registered/i.test(msg) || /user.*already.*exists/i.test(msg)) {
        // User exists: find by email and update password to the provided one
        try {
          // Iterate through users (small userbase expected). Adjust perPage if needed.
          let page = 1
          const perPage = 1000
          let found = null
          // Limit to 10 pages to avoid long loops
          while (!found && page <= 10) {
            const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
            const users = list?.users || list || []
            found = users.find(u => String(u?.email || '').toLowerCase() === email)
            if (found) break
            if (!users.length) break
            page += 1
          }

          if (found?.id) {
            const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(found.id, {
              password,
              email_confirm: true,
            })
            if (updErr) {
              return NextResponse.json({ ok: false, error: String(updErr.message || 'Failed to update existing user') }, { status: 400 })
            }
            return NextResponse.json({ ok: true, alreadyExists: true, userId: found.id, passwordUpdated: true })
          }
          // If not found, return soft-ok so client can attempt login or recovery
          return NextResponse.json({ ok: true, alreadyExists: true, userId: null, passwordUpdated: false })
        } catch (scanErr) {
          return NextResponse.json({ ok: false, error: String(scanErr?.message || 'Failed to handle existing user') }, { status: 500 })
        }
      }
      return NextResponse.json({ ok: false, error: msg || 'Failed to create user' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, userId: data?.user?.id || null })
  } catch (err) {
    const msg = (err && typeof err.message === 'string') ? err.message : 'Server error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
