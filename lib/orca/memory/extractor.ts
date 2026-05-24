/**
 * ORCA Memory Extractor (§4.G of ORCA_COPILOT_BUILD_PROMPT.md)
 * =============================================================================
 * After every successful ORCA reply we run a lightweight mini-model pass to
 * extract durable user-facts (e.g. "User is researching SOL ecosystem L2s",
 * "User prefers 24h+ horizons, not intraday"). Facts are written to
 * `orca_memory` and surface back as context on the next reply via
 * `runGetOrcaMemory` (see lib/orca/orchestrator/tools/userData.ts).
 *
 * INVARIANTS (must hold):
 * - We never persist anything the user typed verbatim. The mini-model
 *   paraphrases first; we also reject any extracted fact whose text
 *   substring-matches the original user message.
 * - We never extract sensitive data. A regex pre-filter rejects the whole
 *   pair if the user message contains a wallet address, API key, email,
 *   phone number, SSN, or any dollar amount.
 * - Cap at 10 inserts per user-day to prevent runaway memory bloat.
 * - The extractor runs AFTER the reply is streamed and MUST NOT block on
 *   I/O failures. All errors are swallowed and logged.
 * - expires_at defaults to now + 90d. Confidence is clamped to [0,1].
 */
import type { SupabaseLike } from '../orchestrator/types'

export interface ExtractorInput {
  userId: string
  userMessage: string
  orcaResponse: string
  sourceMessageId?: number | null
  supabase: SupabaseLike
  model: { extractCall: (sys: string, usr: string) => Promise<string> }
  now?: () => Date
}

export interface ExtractedFact {
  fact: string
  confidence: number
}

export interface ExtractorResult {
  inserted: number
  skipped_reason?:
    | 'pii_detected'
    | 'daily_cap_reached'
    | 'model_returned_no_facts'
    | 'model_parse_error'
    | 'insert_error'
  facts?: ExtractedFact[]
}

const MAX_FACTS_PER_USER_DAY = 10
const MAX_FACT_LENGTH = 240
const DEFAULT_TTL_MS = 90 * 24 * 60 * 60 * 1000

/**
 * PII / sensitive-data regex pre-filter. We err on the side of REJECTING
 * the pair — false positives only cost us a missed memory insertion;
 * false negatives leak user data into a long-lived store.
 */
const PII_PATTERNS: Array<{ name: string; re: RegExp }> = [
  // Ethereum-style addresses (0x + 40 hex)
  { name: 'eth_address', re: /\b0x[a-fA-F0-9]{40}\b/ },
  // Bitcoin legacy / segwit addresses (rough heuristic)
  { name: 'btc_address', re: /\b(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{25,62})\b/ },
  // Solana / generic base58 32-44 chars (avoid English words by requiring digit)
  { name: 'sol_address', re: /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b(?=.*\d)/ },
  // Email
  { name: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  // Phone (international or US)
  { name: 'phone', re: /(?:\+?\d[\d\s().-]{8,}\d)/ },
  // SSN
  { name: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/ },
  // Dollar amounts ($1, $1.50, $1,000, USD 500, 500 USD)
  { name: 'dollar', re: /(\$\s?\d|(?:\b|^)USD\s?\d|\d[\d,]*\s?USD\b)/i },
  // API keys (sk-, pk-, ghp_, glpat-, AIza, AKIA, xoxb-/xoxp-, eyJ JWT)
  { name: 'api_key', re: /\b(?:sk-[A-Za-z0-9]{16,}|pk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16}|xox[bp]-[A-Za-z0-9-]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/ },
  // Seed phrases (12+ consecutive lowercase words)
  { name: 'seed_phrase', re: /\b(?:[a-z]{3,9}\s+){11,}[a-z]{3,9}\b/ },
]

export function detectSensitive(text: string): { detected: boolean; reason?: string } {
  for (const { name, re } of PII_PATTERNS) {
    if (re.test(text)) return { detected: true, reason: name }
  }
  return { detected: false }
}

export const MEMORY_EXTRACTOR_SYSTEM_PROMPT = `You are a memory-extraction sub-agent for ORCA, a crypto research copilot. Your only job is to identify DURABLE, CONVERSATIONAL facts about the user that would help personalise the NEXT reply.

OUTPUT FORMAT: a single JSON object with one key, "facts", whose value is an array (possibly empty) of at most 5 items. Each item has:
  - "fact": a SHORT paraphrased statement (max 200 chars), written in third person ("User prefers ...", "User is researching ..."). Do NOT quote the user verbatim.
  - "confidence": a number between 0 and 1 representing how durable / reusable this fact is.

INCLUDE:
- Stable preferences ("User prefers long-term horizons", "User focuses on Solana DeFi").
- Long-running research interests ("User is researching L2 rollups").
- Self-disclosed experience level if it contradicts the supplied profile.

EXCLUDE (return zero facts for any of these):
- Anything that looks like a transaction, dollar amount, wallet address, exchange API key, email, phone, or other identifier.
- One-off questions ("what is the price of BTC?") — these are not durable.
- Anything the user explicitly asked you to forget.
- Anything the user did not actually say (no inference about their wallet, identity, or holdings).

If there is nothing worth remembering, return {"facts": []}. Do not invent. Do not pad.`

/**
 * Render the prompt the mini-model sees. Exposed for tests.
 */
export function buildExtractorUserPrompt(userMessage: string, orcaResponse: string): string {
  return `USER MESSAGE:
${userMessage.slice(0, 4000)}

ORCA REPLY (for context only — do not extract facts about ORCA):
${orcaResponse.slice(0, 4000)}

Return the JSON object now.`
}

function parseExtractorOutput(raw: string): ExtractedFact[] | null {
  if (!raw) return null
  let cleaned = raw.trim()
  // Strip fenced code blocks if the model emitted them
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/```\s*$/, '').trim()
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return null
  }
  const arr = (parsed as any)?.facts
  if (!Array.isArray(arr)) return null
  const out: ExtractedFact[] = []
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const fact = typeof item.fact === 'string' ? item.fact.trim() : ''
    if (!fact) continue
    const truncated = fact.length > MAX_FACT_LENGTH ? fact.slice(0, MAX_FACT_LENGTH) : fact
    const confRaw = typeof item.confidence === 'number' ? item.confidence : 0.5
    const confidence = Math.max(0, Math.min(1, confRaw))
    out.push({ fact: truncated, confidence })
  }
  return out
}

function startOfUtcDayIso(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return d.toISOString()
}

/**
 * Run the extractor for a single (user_message, orca_response) pair.
 * Returns the number of inserted facts. NEVER throws.
 */
export async function extractMemoryFacts(input: ExtractorInput): Promise<ExtractorResult> {
  try {
    const now = input.now ? input.now() : new Date()

    // 1. PII / sensitive-data pre-filter on the user message.
    const sens = detectSensitive(input.userMessage)
    if (sens.detected) {
      return { inserted: 0, skipped_reason: 'pii_detected' }
    }

    // 2. Daily cap check.
    let usedToday = 0
    try {
      const q = await input.supabase
        .from('orca_memory')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', input.userId)
        .gte('created_at', startOfUtcDayIso(now))
      usedToday = typeof (q as any)?.count === 'number' ? (q as any).count : 0
    } catch (countErr) {
      console.warn('[orca/memory/extractor] count failed', countErr)
    }
    const remaining = MAX_FACTS_PER_USER_DAY - usedToday
    if (remaining <= 0) {
      return { inserted: 0, skipped_reason: 'daily_cap_reached' }
    }

    // 3. Call the mini-model.
    let raw: string
    try {
      raw = await input.model.extractCall(
        MEMORY_EXTRACTOR_SYSTEM_PROMPT,
        buildExtractorUserPrompt(input.userMessage, input.orcaResponse)
      )
    } catch (modelErr) {
      console.warn('[orca/memory/extractor] model call failed', modelErr)
      return { inserted: 0, skipped_reason: 'model_parse_error' }
    }

    const parsed = parseExtractorOutput(raw)
    if (parsed === null) return { inserted: 0, skipped_reason: 'model_parse_error' }
    if (parsed.length === 0) return { inserted: 0, skipped_reason: 'model_returned_no_facts' }

    // 4. Reject facts that quote the user verbatim or that look like PII.
    const userLower = input.userMessage.toLowerCase()
    const cleanFacts = parsed.filter((f) => {
      if (detectSensitive(f.fact).detected) return false
      // Substring match of 30+ chars from the user message = treat as verbatim.
      if (f.fact.length >= 30 && userLower.includes(f.fact.toLowerCase())) return false
      return true
    })
    if (cleanFacts.length === 0) {
      return { inserted: 0, skipped_reason: 'pii_detected' }
    }

    // 5. Insert (respect remaining daily cap).
    const toInsert = cleanFacts.slice(0, remaining)
    const expiresAt = new Date(now.getTime() + DEFAULT_TTL_MS).toISOString()
    const rows = toInsert.map((f) => ({
      user_id: input.userId,
      fact: f.fact,
      source_message_id: input.sourceMessageId ?? null,
      confidence: f.confidence,
      expires_at: expiresAt,
    }))
    try {
      const ins = await input.supabase.from('orca_memory').insert(rows)
      if ((ins as any)?.error) {
        console.warn('[orca/memory/extractor] insert error', (ins as any).error)
        return { inserted: 0, skipped_reason: 'insert_error' }
      }
    } catch (insertErr) {
      console.warn('[orca/memory/extractor] insert threw', insertErr)
      return { inserted: 0, skipped_reason: 'insert_error' }
    }

    return { inserted: toInsert.length, facts: toInsert }
  } catch (err) {
    // Belt-and-braces: extractor is a background task; never throw out.
    console.warn('[orca/memory/extractor] unexpected error', err)
    return { inserted: 0, skipped_reason: 'insert_error' }
  }
}

export const __internals = {
  parseExtractorOutput,
  startOfUtcDayIso,
  MAX_FACTS_PER_USER_DAY,
  MAX_FACT_LENGTH,
  DEFAULT_TTL_MS,
}
