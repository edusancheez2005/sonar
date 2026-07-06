/**
 * CRON: Sync Supabase users → Brevo contact list
 * Schedule: daily at 02:15 UTC (vercel.json).
 *
 * The weekly Brevo campaigns (weekly-insights, weekly-top-wallets) send to
 * list #3, but nothing ever added signed-up users to that list — so the
 * campaigns only reached whoever was imported by hand once. This cron
 * upserts every auth user into the list so the weekly emails reach the
 * whole user base.
 *
 * Compliance note: Brevo's /contacts/import does NOT re-subscribe contacts
 * who unsubscribed (blacklisted contacts stay blacklisted), so re-running
 * this daily never overrides an opt-out.
 *
 * Manual first run: GET /api/cron/sync-brevo-contacts?secret=<CRON_SECRET>
 */

import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request) {
  const url = new URL(request.url)
  const auth = request.headers.get('authorization')
  const secretOk =
    auth?.replace('Bearer ', '') === process.env.CRON_SECRET ||
    (url.searchParams.get('secret') && url.searchParams.get('secret') === process.env.CRON_SECRET)
  if (!process.env.CRON_SECRET || !secretOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const brevoKey = process.env.BREVO_API_KEY
  if (!brevoKey) return NextResponse.json({ error: 'BREVO_API_KEY not set' }, { status: 500 })

  const listId = Number(process.env.BREVO_LIST_ID || 3) // same list the weekly campaigns send to

  // Page through every auth user (800+ today; cap far above that as a guard)
  const contacts = []
  const perPage = 1000
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) {
      return NextResponse.json({ error: `listUsers failed: ${error.message}` }, { status: 500 })
    }
    const users = data?.users || []
    for (const u of users) {
      if (!u.email) continue
      contacts.push({
        email: u.email.toLowerCase(),
        attributes: { SIGNED_UP_AT: u.created_at ? u.created_at.slice(0, 10) : undefined },
      })
    }
    if (users.length < perPage) break
  }

  if (contacts.length === 0) {
    return NextResponse.json({ ok: true, users: 0, imported: false, reason: 'no_users' })
  }

  // Bulk import (async on Brevo's side — returns a processId)
  const importRes = await fetch('https://api.brevo.com/v3/contacts/import', {
    method: 'POST',
    headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonBody: contacts,
      listIds: [listId],
      updateExistingContacts: true,
      emptyContactsAttributes: false,
    }),
  })

  if (!importRes.ok) {
    const errText = await importRes.text()
    return NextResponse.json(
      { error: `Brevo import failed (${importRes.status}): ${errText.slice(0, 500)}` },
      { status: 502 }
    )
  }

  const result = await importRes.json()
  console.log(`✅ Brevo sync: ${contacts.length} users → list #${listId} (process ${result?.processId})`)
  return NextResponse.json({ ok: true, users: contacts.length, listId, processId: result?.processId ?? null })
}
