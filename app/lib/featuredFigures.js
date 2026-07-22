// Hand-curated display order for the famous-wallets rails (figures
// directory + whale research terminal). Anything featured in the DB but not
// listed here falls to the end alphabetically. Keep in sync with the
// is_featured flags in curated_entities (A-list re-curated 2026-07-22).
export const FEATURED_PRIORITY = [
  'satoshi-nakamoto', 'vitalik-buterin', 'elon-musk', 'donald-trump',
  'us-government', 'royal-government-of-bhutan', 'spacex', 'tesla',
  'trump-media', 'gamestop', 'microstrategy', 'blackrock', 'el-salvador',
  'gcr', 'james-fickel', 'mrbeast',
]

export function sortFeatured(rows) {
  const rank = new Map(FEATURED_PRIORITY.map((s, i) => [s, i]))
  return [...rows].sort(
    (a, b) =>
      (rank.get(a.slug) ?? 999) - (rank.get(b.slug) ?? 999) ||
      String(a.display_name || '').localeCompare(String(b.display_name || ''))
  )
}
