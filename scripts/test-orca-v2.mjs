#!/usr/bin/env node
/**
 * ORCA v2 smoke test — hits the deployed v2 endpoint and pretty-prints the SSE stream.
 *
 * Usage:
 *   node scripts/test-orca-v2.mjs                   # local dev (http://localhost:3000)
 *   node scripts/test-orca-v2.mjs --prod            # production (https://www.sonartracker.io)
 *   node scripts/test-orca-v2.mjs --message "What's happening with ETH?"
 *
 * Auth: /api/orca/v2 now requires a Supabase Bearer token. Provide one of:
 *   ORCA_TEST_BEARER=...    # a real Supabase access_token (preferred for --prod)
 *   ORCA_V2_DEV_BYPASS=1    # dev-only bypass; only honoured by the server when
 *                            # NODE_ENV !== 'production' AND the same env var is
 *                            # set on the server. Has NO effect against --prod.
 */

const args = process.argv.slice(2)
const isProd = args.includes('--prod')
const msgIdx = args.indexOf('--message')
const message = msgIdx >= 0 ? args[msgIdx + 1] : 'What is happening with BTC?'
const base = isProd ? 'https://www.sonartracker.io' : 'http://localhost:3000'
const url = `${base}/api/orca/v2`

const bearer = process.env.ORCA_TEST_BEARER
const headers = { 'Content-Type': 'application/json' }
if (bearer) headers['Authorization'] = `Bearer ${bearer}`

console.log(`POST ${url}`)
console.log(`message: ${message}`)
console.log(`auth: ${bearer ? 'Bearer (env ORCA_TEST_BEARER)' : 'NONE — server will 401 unless dev-bypass'}`)
console.log('---')

const t0 = Date.now()
const res = await fetch(url, {
  method: 'POST',
  headers,
  body: JSON.stringify({ message, userId: 'smoke-test-orca-v2' }),
})

if (!res.ok || !res.body) {
  console.error(`HTTP ${res.status}`)
  console.error(await res.text())
  process.exit(1)
}

const reader = res.body.getReader()
const decoder = new TextDecoder()
let buf = ''
let firstToken = 0
let tokenCount = 0
let charCount = 0

while (true) {
  const { value, done } = await reader.read()
  if (done) break
  buf += decoder.decode(value, { stream: true })
  const events = buf.split('\n\n')
  buf = events.pop() || ''
  for (const evt of events) {
    if (!evt.startsWith('data:')) continue
    let payload
    try {
      payload = JSON.parse(evt.slice(5).trim())
    } catch {
      continue
    }
    if (payload.type === 'status') {
      const extra = payload.latency_ms != null ? ` (${payload.latency_ms}ms ok=${payload.ok})` : ''
      console.log(`[status] ${payload.step}${extra}${payload.detail ? ' — ' + payload.detail : ''}`)
    } else if (payload.type === 'token') {
      if (firstToken === 0) {
        firstToken = Date.now() - t0
        console.log(`\n[stream] first token at ${firstToken}ms\n--- BEGIN ANSWER ---`)
      }
      process.stdout.write(payload.delta)
      tokenCount++
      charCount += payload.delta.length
    } else if (payload.type === 'done') {
      console.log(`\n--- END ANSWER ---`)
      console.log(`[done] tokens streamed=${tokenCount} chars=${charCount}`)
      console.log(`[telemetry]`, JSON.stringify(payload.telemetry, null, 2))
    } else if (payload.type === 'error') {
      console.error(`\n[error] ${payload.error}`)
    }
  }
}
console.log(`\n[total] ${Date.now() - t0}ms`)
