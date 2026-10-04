/**
 * The day-one follow picker (FirstRunWelcome → "Follow a famous wallet").
 * Six names everyone recognises, each a curated_entities slug. Addresses are
 * resolved server-side at follow time (app/api/onboarding/follow-famous) so
 * the list stays in sync with the curated data without a deploy.
 *
 * `avatar` must be same-origin (CSP img-src) — null renders a monogram.
 * The picker uses 96px thumbnails in public/figures/thumbs (the full-size
 * figure photos are up to 8 MB).
 *
 * minUsd / alertAddresses tune the alert each follow creates. Measured
 * 2026-10-04: Binance hot wallets cross $1M about twice a day on the whale tape
 * (vs ~50 moves/day above $25K), Justin Sun about twice a week; exchanges and
 * market makers alert on their single most active address only.
 */
export const FAMOUS_WALLETS = Object.freeze([
  {
    slug: 'vitalik-buterin',
    name: 'Vitalik Buterin',
    minUsd: 25_000,
    alertAddresses: 3,
    blurb: 'Ethereum co-founder. Rare moves, always news.',
    avatar: '/figures/thumbs/vitalik-buterin.jpg',
  },
  {
    slug: 'binance',
    name: 'Binance',
    minUsd: 1_000_000,
    alertAddresses: 1,
    blurb: 'The largest exchange. Its hot wallets move billions.',
    avatar: '/figures/thumbs/binance.jpg',
  },
  {
    slug: 'wintermute',
    name: 'Wintermute',
    minUsd: 1_000_000,
    alertAddresses: 1,
    blurb: "Crypto's biggest market maker. Early to every listing.",
    avatar: null,
  },
  {
    slug: 'mrbeast',
    name: 'MrBeast',
    minUsd: 25_000,
    alertAddresses: 3,
    blurb: "YouTube's biggest creator, trading on-chain.",
    avatar: null,
  },
  {
    slug: 'donald-trump',
    name: 'Donald Trump',
    minUsd: 25_000,
    alertAddresses: 3,
    blurb: 'World Liberty Financial and the family wallets.',
    avatar: '/figures/thumbs/donald-trump.jpg',
  },
  {
    slug: 'justin-sun',
    name: 'Justin Sun',
    minUsd: 1_000_000,
    alertAddresses: 3,
    blurb: 'Tron founder. Nine-figure transfers are routine.',
    avatar: '/figures/thumbs/justin-sun.jpg',
  },
])

export const FAMOUS_SLUGS = Object.freeze(FAMOUS_WALLETS.map((w) => w.slug))

export function famousBySlug(slug) {
  return FAMOUS_WALLETS.find((w) => w.slug === slug) || null
}

export function isFamousSlug(slug) {
  return typeof slug === 'string' && FAMOUS_SLUGS.includes(slug)
}

/** Max addresses followed per entity — enough to catch the action, not 81 Binance wallets. */
export const MAX_ADDRESSES_PER_ENTITY = 3
