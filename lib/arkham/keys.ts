/**
 * Round-robin Arkham API key picker.
 *
 * Starter plan allows 5 keys per seat; rotating across them spreads load
 * for the per-second rate-limit (20/sec standard, 1/sec heavy). Falls
 * back to a single ARKHAM_API_KEY if numbered slots are absent.
 */
let cursor = 0;

function collectKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const v = process.env[`ARKHAM_API_KEY_${i}`];
    if (v && v.trim()) keys.push(v.trim());
  }
  if (keys.length === 0 && process.env.ARKHAM_API_KEY) {
    keys.push(process.env.ARKHAM_API_KEY.trim());
  }
  return keys;
}

let cached: string[] | null = null;

export function getNextKey(): string {
  if (!cached) cached = collectKeys();
  if (cached.length === 0) {
    throw new Error('ARKHAM_API_KEY not configured (set ARKHAM_API_KEY_1..5 or ARKHAM_API_KEY)');
  }
  const k = cached[cursor % cached.length];
  cursor++;
  return k;
}

/** For tests / health checks; do not log full keys. */
export function getKeyPrefix(): string {
  if (!cached) cached = collectKeys();
  return cached[0]?.slice(0, 8) ?? '';
}
