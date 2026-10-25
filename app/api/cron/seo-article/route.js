// CRON: SEO article generator — long-form guides with covers.
// Schedule: days 1, 4, 7 … 28 at 08:00 UTC (vercel.json). Eduardo capped the
// cadence at ~10 articles a month on 29 Aug 2026: do not raise it.
//
// One run: (1) self-heal — give the newest published post without a cover a
// cover; (2) pick the first topic in lib/blog/topics.ts whose slug is not
// published; (3) write the article and its cover in parallel under a 100 s
// deadline; (4) lint, upsert on slug, attach the cover; (5) log the run in
// app_cache `blog_last_run` (read by the daily health email).
//
// ?dry_run=1 writes nothing: it reports the topic that would run, whether the
// text and image models are reachable, and the self-heal target.
// SEO_ARTICLE_ENABLED=false pauses the cron without a vercel.json change.

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import { supabaseAdminFresh as sb } from '@/app/lib/supabaseAdmin'
import { TOPIC_POOL, INTERNAL_LINKS, EXTERNAL_ALLOWLIST, nextTopic } from '@/lib/blog/topics'
import { lintArticle, wordCount } from '@/lib/blog/lint'
import { generateCover, coverPrompt, resolveCoverModel, withCover } from '@/lib/blog/cover'
import { isNoiseRow, isExchangeInternalRow } from '@/lib/orca/junk-addresses'
import { STABLECOINS } from '@/lib/wallet/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SITE = 'https://www.sonartracker.io'
const DEADLINE_MS = 100_000
const SELF_HEAL_MS = 45_000
const MIN_WORDS = 1100 // the prompt asks for 1,400–2,200; clearly short output is rejected
const MAX_USD = 150_000_000 // sanity cap, as ORCA uses
const WBTC_FAMILY = new Set(['WBTC', 'CBBTC', 'TBTC'])
const ENTITY_FOR_TOPIC = {
  'binance-wallet-activity-explained': 'binance',
  'market-maker-wallets-explained': 'wintermute',
  'ethereum-foundation-wallet-activity': 'ethereum-foundation',
}

function withDeadline(promise, ms, label) {
  let timer
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms) })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function textProvider() {
  const override = process.env.BLOG_WRITER_MODEL
  const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY
  if (xaiKey) return { client: new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' }), model: override || 'grok-4.3', provider: 'xai' }
  if (process.env.OPENAI_API_KEY) return { client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), model: override || 'gpt-4.1-mini', provider: 'openai' }
  return null
}

async function modelReachable(client, model) {
  try { await client.models.retrieve(model); return true } catch { /* fall through */ }
  try {
    const list = await client.models.list()
    for await (const m of list) { if (m.id === model) return true }
  } catch { /* unreachable */ }
  return false
}

async function writeLastRun(value) {
  try {
    // Carry the last successful run forward so a failed run cannot hide it.
    const { data: prev } = await sb.from('app_cache').select('value').eq('key', 'blog_last_run').maybeSingle()
    const last_success_at = value.ok ? value.at : (prev?.value?.last_success_at || null)
    const last_success_slug = value.ok ? value.slug : (prev?.value?.last_success_slug || null)
    await sb.from('app_cache').upsert({ key: 'blog_last_run', value: { ...value, last_success_at, last_success_slug }, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  } catch { /* logging must never fail the run */ }
}

function fmtUsd(n) {
  const v = Math.abs(Number(n) || 0)
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  return `$${Math.round(v).toLocaleString('en-US')}`
}

function day(iso) { return String(iso || '').slice(0, 10) }

/** Dated, computed figures from Sonar's tables. Never raw rows. */
async function platformFacts(topic) {
  const now = new Date()
  const since = new Date(now.getTime() - 7 * 86400e3).toISOString()
  const range = `the 7 days to ${day(now.toISOString())}`
  const rows = []
  for (let page = 0; page < 6; page++) {
    const { data, error } = await sb
      .from('all_whale_transactions')
      .select('transaction_hash, token_symbol, usd_value, from_address, to_address, whale_address, from_label, to_label, timestamp')
      .eq('blockchain', 'ethereum')
      .gte('timestamp', since)
      .gte('usd_value', 1_000_000)
      .order('usd_value', { ascending: false })
      .range(page * 1000, page * 1000 + 999)
    if (error) throw new Error(`tape read: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  const flash = rows.filter((r) => isNoiseRow(r)).length
  const internal = rows.filter((r) => !isNoiseRow(r) && isExchangeInternalRow(r)).length
  const clean = rows.filter((r) => !isNoiseRow(r) && !isExchangeInternalRow(r) && Number(r.usd_value) <= MAX_USD)
  const facts = []
  if (clean.length) {
    const total = clean.reduce((s, r) => s + Number(r.usd_value || 0), 0)
    facts.push(`In ${range}, Sonar's Ethereum whale tape recorded ${clean.length.toLocaleString('en-US')} transfers of $1M or more, totalling ${fmtUsd(total)} (exchange-internal transfers and flash-loan legs removed).`)
    const byToken = {}
    for (const r of clean) { const t = String(r.token_symbol || '?').toUpperCase(); byToken[t] = (byToken[t] || 0) + 1 }
    const top = Object.entries(byToken).sort((a, b) => b[1] - a[1]).slice(0, 5)
    facts.push(`Most frequent tokens among those transfers in ${range}: ${top.map(([t, n]) => `${t} (${n})`).join(', ')}.`)
    const big = clean[0]
    facts.push(`Largest single transfer in ${range}: ${fmtUsd(big.usd_value)} of ${String(big.token_symbol || '').toUpperCase()} on ${day(big.timestamp)} (transaction ${big.transaction_hash}).`)
    const stable = clean.filter((r) => STABLECOINS.has(String(r.token_symbol || '').toUpperCase())).length
    facts.push(`Stablecoins were ${Math.round((100 * stable) / clean.length)}% of those transfers in ${range}.`)
    const wb = clean.filter((r) => WBTC_FAMILY.has(String(r.token_symbol || '').toUpperCase()))
    if (wb.length) facts.push(`Wrapped Bitcoin on Ethereum (WBTC, cbBTC, tBTC): ${wb.length} transfers of $1M or more in ${range}, ${fmtUsd(wb.reduce((s, r) => s + Number(r.usd_value || 0), 0))} in total.`)
    const sorted = clean.map((r) => Number(r.usd_value)).sort((a, b) => a - b)
    facts.push(`Median size of a $1M+ transfer in ${range}: ${fmtUsd(sorted[Math.floor(sorted.length / 2)])}.`)
  }
  facts.push(`Removed before counting in ${range}: ${internal} exchange-internal transfers (both sides labelled as exchange wallets) and ${flash} flash-loan legs (Morpho Blue and Balancer Vault).`)

  const entitySlug = ENTITY_FOR_TOPIC[topic.slug]
  if (entitySlug) {
    try {
      const { data } = await sb.from('curated_entities').select('slug, addresses').eq('slug', entitySlug).maybeSingle()
      const addrs = new Set((Array.isArray(data?.addresses) ? data.addresses : []).map((a) => String(a?.address || a || '').toLowerCase()).filter(Boolean))
      if (addrs.size) {
        const hits = rows.filter((r) => [r.whale_address, r.from_address, r.to_address].some((a) => addrs.has(String(a || '').toLowerCase())))
        facts.push(`Sonar labels ${addrs.size} addresses as ${entitySlug}; ${hits.length} of the $1M+ transfers in ${range} touched one of them.`)
      }
    } catch { /* optional */ }
  }

  if (topic.slug.includes('solana')) {
    try {
      const { data } = await sb.from('solana_transactions').select('timestamp').order('timestamp', { ascending: false }).limit(1)
      const last = data?.[0]?.timestamp
      if (last) facts.push(`Sonar's Solana whale feed: newest recorded transfer on ${day(last)}${(Date.now() - Date.parse(last)) > 3 * 86400e3 ? ' (the feed is paused; do not describe current Solana activity)' : ''}.`)
    } catch { /* optional */ }
  }
  return facts
}

const SYSTEM_PROMPT = `You write long-form guides for Sonar Tracker (sonartracker.io), a crypto whale-tracking and on-chain research site. Readers are curious learners, not professionals. Plain English, no hype, one consistent spelling.

STRUCTURE (HTML only; start directly with <h1>):
1. <h1> title that contains the target keyword.
2. An opening paragraph that states one dated figure from SONAR DATA in its first two sentences, then says what the reader will learn.
3. <h2>In this guide</h2> with a short <ul> of the section titles (plain list, no anchor links).
4. <h2>Key takeaways</h2> with an HTML table, columns "Point" and "What it means", four rows.
5. Six to eight <h2> body sections with substantive paragraphs. Two or three tables in the whole article (the takeaways table counts), each holding on-chain facts. One or two <blockquote><p>…</p></blockquote> pull-quotes in total, one factual sentence each.
6. <h2>What to watch</h2>: concrete things a reader can check on-chain, never predictions.
7. <h2>FAQ</h2> with three or four <h3> questions and short answers.
8. A closing <p><em>This article is for information only. It is not financial advice, and on-chain data shows transfers, not intentions.</em></p>

LENGTH: 1,400 to 2,200 words, never more than 2,500.

LINKS:
- Six to ten internal links, only from INTERNAL LINKS, written as <a href="https://www.sonartracker.io/PATH">anchor</a>.
- Two or three external references, only on these hosts: ${EXTERNAL_ALLOWLIST.join(', ')}. Use stable top-level or documentation pages you are sure exist, written as <a href="URL" rel="nofollow noopener noreferrer" target="_blank">text</a>.

HARD RULES (an article that breaks one is discarded):
- Use at least three figures from SONAR DATA, each with its date range. Never invent any other statistic, percentage, study, report or quote.
- No accuracy, win-rate, success-rate or confidence percentages for any tool, strategy or signal.
- No prices for any product or service, Sonar's or anyone else's. No user, trader or subscriber counts.
- No buy or sell signals, no "you should buy/sell", no price predictions, no directional advice. Describe whale actions as moved, sent to, received from, inflow, outflow.
- Do not name or compare other analytics products. No "alternative", "vs" or "best tools" content.
- Describe what addresses did; never claim to know anyone's intent, holdings or net worth.
- No em dashes. Never mention how the article was produced.`

function userPrompt(topic, facts) {
  const links = INTERNAL_LINKS.map((l) => `- ${SITE}${l.url} — ${l.text}`).join('\n')
  return `TARGET KEYWORD: "${topic.keyword}"
ANGLE: ${topic.angle}
DATA SOURCE: ${topic.data}

INTERNAL LINKS (use six to ten):
${links}

SONAR DATA (the only figures you may use):
${facts.map((f) => `- ${f}`).join('\n')}

Return only the article HTML, starting with <h1>.`
}

const ALLOWED_INTERNAL = new Set(INTERNAL_LINKS.map((l) => l.url.replace(/\/$/, '') || '/'))

function hostAllowed(host) {
  const h = String(host || '').toLowerCase().replace(/^www\./, '')
  return EXTERNAL_ALLOWLIST.some((d) => h === d || h.endsWith(`.${d}`))
}

async function urlAnswers(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const r = await fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(6000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; SonarBlogLinkCheck/1.0)' } })
      if (r.status < 400) return true
      if (method === 'HEAD' && (r.status === 405 || r.status === 403)) continue
      return false
    } catch { if (method === 'GET') return false }
  }
  return false
}

/** Unwrap links the article may not carry; keep the anchor text. */
async function cleanLinks(html) {
  const anchors = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
  const external = new Set()
  for (const m of anchors) {
    try { const u = new URL(m[1], SITE); if (!/sonartracker\.io$/i.test(u.hostname) && hostAllowed(u.hostname)) external.add(u.href) } catch { /* bad URL */ }
  }
  const ok = {}
  await Promise.all([...external].map(async (u) => { ok[u] = await urlAnswers(u) }))
  let removed = 0
  const out = html.replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (whole, href, text) => {
    let u
    try { u = new URL(href, SITE) } catch { removed++; return text }
    if (/sonartracker\.io$/i.test(u.hostname)) {
      const path = u.pathname.replace(/\/$/, '') || '/'
      if (ALLOWED_INTERNAL.has(path)) return `<a href="${SITE}${path}">${text}</a>`
      removed++
      return text
    }
    if (hostAllowed(u.hostname) && ok[u.href]) return `<a href="${u.href}" rel="nofollow noopener noreferrer" target="_blank">${text}</a>`
    removed++
    return text
  })
  return { html: out, removed }
}

function tidy(raw) {
  let s = String(raw || '').replace(/```html|```/gi, '').trim()
  const h1 = s.search(/<h1[\s>]/i)
  if (h1 > 0) s = s.slice(h1)
  return s.replace(/\s*—\s*/g, ', ')
}

function firstParagraph(html) {
  const m = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
  const t = m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : ''
  return t.length > 155 ? `${t.slice(0, 152).replace(/\s+\S*$/, '')}…` : t
}

/** Give the newest published post without a cover its cover. Non-fatal. */
async function selfHeal(openai, imageModel) {
  const { data } = await sb
    .from('blog_posts')
    .select('slug, title, content, category')
    .eq('published', true)
    .is('cover_image', null)
    .order('created_at', { ascending: false })
    .limit(1)
  const post = data?.[0]
  if (!post) return { slug: null }
  try {
    const cover = await withDeadline(generateCover({ openai, sb, slug: post.slug, prompt: coverPrompt(post.title), model: imageModel }), SELF_HEAL_MS, 'self-heal cover')
    const { error } = await sb.from('blog_posts')
      .update({ cover_image: cover.url, content: withCover(post.content, cover.url, post.title), updated_at: new Date().toISOString() })
      .eq('slug', post.slug)
    if (error) throw new Error(error.message)
    try { revalidatePath(`/blog/${post.slug}`) } catch { /* outside a request */ }
    return { slug: post.slug, ok: true, bytes: cover.bytes, ms: cover.ms }
  } catch (e) {
    return { slug: post.slug, ok: false, error: String(e?.message || e).slice(0, 160) }
  }
}

export async function GET(req) {
  const started = Date.now()
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const dryRun = new URL(req.url).searchParams.get('dry_run') === '1'
  if (process.env.SEO_ARTICLE_ENABLED === 'false' && !dryRun) {
    return NextResponse.json({ ok: true, skipped: 'SEO_ARTICLE_ENABLED=false' })
  }

  try {
    const { data: pub, error: pubErr } = await sb.from('blog_posts').select('slug').eq('published', true).limit(1000)
    if (pubErr) throw new Error(`slug read: ${pubErr.message}`)
    const published = new Set((pub || []).map((p) => p.slug))
    const { topic, remaining } = nextTopic(published)

    const text = textProvider()
    const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
    const imageErrors = []
    const imageModel = openai ? await resolveCoverModel(openai, imageErrors) : null

    if (dryRun) {
      const { data: heal } = await sb.from('blog_posts').select('slug').eq('published', true).is('cover_image', null).order('created_at', { ascending: false }).limit(1)
      return NextResponse.json({
        ok: true,
        dry_run: true,
        topic: topic ? { slug: topic.slug, kind: topic.kind, keyword: topic.keyword } : null,
        remaining,
        pool_size: TOPIC_POOL.length,
        text_model: text ? `${text.provider}:${text.model}` : null,
        text_model_ok: text ? await modelReachable(text.client, text.model) : false,
        image_model: imageModel,
        image_model_ok: !!imageModel,
        openai_key_present: !!process.env.OPENAI_API_KEY,
        image_model_errors: imageErrors,
        self_heal_target: heal?.[0]?.slug || null,
      })
    }

    // 1. Self-heal one missing cover before anything else.
    const heal = openai && imageModel ? await selfHeal(openai, imageModel) : { slug: null, skipped: 'no image model' }

    if (!topic) {
      const body = { ok: false, error: 'topic pool exhausted', remaining: 0, selfHeal: heal, at: new Date().toISOString() }
      await writeLastRun(body)
      return NextResponse.json(body, { status: 500 })
    }
    if (!text) {
      const body = { ok: false, error: 'No AI provider configured', topic: topic.slug, at: new Date().toISOString() }
      await writeLastRun(body)
      return NextResponse.json(body, { status: 500 })
    }

    // 2. Facts, then text and cover in parallel under one deadline.
    const t0 = Date.now()
    const facts = await platformFacts(topic)
    const factsMs = Date.now() - t0
    const t1 = Date.now()
    const textJob = withDeadline(
      text.client.chat.completions.create({
        model: text.model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt(topic, facts) }],
        temperature: 0.6,
        max_tokens: 7000,
      }).then((r) => ({ raw: r.choices?.[0]?.message?.content || '', ms: Date.now() - t1 })),
      DEADLINE_MS, 'article text')
    const coverJob = openai && imageModel
      ? withDeadline(generateCover({ openai, sb, slug: topic.slug, prompt: coverPrompt(`${topic.keyword}: ${topic.angle}`), model: imageModel }), DEADLINE_MS, 'cover image')
      : Promise.reject(new Error('no image model'))
    const [textRes, coverRes] = await Promise.allSettled([textJob, coverJob])

    if (textRes.status !== 'fulfilled' || !textRes.value.raw || textRes.value.raw.length < 500) {
      const body = { ok: false, error: textRes.status === 'rejected' ? String(textRes.reason?.message || textRes.reason) : 'model returned too little text', topic: topic.slug, selfHeal: heal, at: new Date().toISOString() }
      await writeLastRun(body)
      return NextResponse.json(body, { status: 500 })
    }

    // 3. Clean, lint, save.
    const { html: linked, removed: linksRemoved } = await cleanLinks(tidy(textRes.value.raw))
    const lint = lintArticle(linked, { minWords: MIN_WORDS })
    const stages = { facts_ms: factsMs, text_ms: textRes.value.ms, cover_ms: coverRes.status === 'fulfilled' ? coverRes.value.ms : null, total_ms: Date.now() - started }
    if (!lint.ok) {
      const body = { ok: false, rejected: true, reasons: lint.reasons, topic: topic.slug, words: wordCount(linked), text_model: `${text.provider}:${text.model}`, stages, selfHeal: heal, at: new Date().toISOString() }
      await writeLastRun({ ...body, last_rejection: `last article rejected: ${lint.reasons[0]}` })
      return NextResponse.json(body, { status: 500 })
    }

    const titleMatch = linked.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : topic.angle
    const description = firstParagraph(linked.replace(/<h1[\s\S]*?<\/h1>/i, '')) || topic.angle.slice(0, 155)
    const nowIso = new Date().toISOString()
    const { error: upErr } = await sb.from('blog_posts').upsert({
      slug: topic.slug,
      title,
      description,
      content: linked,
      category: 'guide',
      tags: [...new Set(topic.keyword.split(' ').concat(['whale-tracking', 'on-chain']))],
      published: true,
      updated_at: nowIso,
    }, { onConflict: 'slug' })
    if (upErr) throw new Error(`upsert: ${upErr.message}`)

    let cover = null
    if (coverRes.status === 'fulfilled') {
      cover = coverRes.value
      const { error: coverErr } = await sb.from('blog_posts')
        .update({ cover_image: cover.url, content: withCover(linked, cover.url, title), updated_at: new Date().toISOString() })
        .eq('slug', topic.slug)
      if (coverErr) cover = { ...cover, attachError: coverErr.message }
    }

    try { revalidatePath('/blog'); revalidatePath(`/blog/${topic.slug}`) } catch { /* outside a request */ }

    const body = {
      ok: true,
      slug: topic.slug,
      kind: topic.kind,
      title,
      words: wordCount(linked),
      hasImage: !!cover?.url,
      cover: cover ? { url: cover.url, bytes: cover.bytes, model: cover.model } : null,
      coverError: coverRes.status === 'rejected' ? String(coverRes.reason?.message || coverRes.reason).slice(0, 160) : undefined,
      linksRemoved,
      text_model: `${text.provider}:${text.model}`,
      stages: { ...stages, total_ms: Date.now() - started },
      remaining: remaining - 1,
      selfHeal: heal,
      at: new Date().toISOString(),
    }
    await writeLastRun(body)
    return NextResponse.json(body)
  } catch (err) {
    const body = { ok: false, error: String(err?.message || err), at: new Date().toISOString() }
    await writeLastRun(body)
    return NextResponse.json(body, { status: 500 })
  }
}
