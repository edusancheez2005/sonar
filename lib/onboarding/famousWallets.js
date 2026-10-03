/**
 * The day-one follow picker (FirstRunWelcome → "Follow a famous wallet").
 * Six names everyone recognises, each a curated_entities slug. Addresses are
 * resolved server-side at follow time (app/api/onboarding/follow-famous) so
 * the list stays in sync with the curated data without a deploy.
 *
 * `avatar` must be same-origin (CSP img-src) — null renders a monogram.
 */
export const FAMOUS_WALLETS = Object.freeze([
  {
    slug: 'vitalik-buterin',
    name: 'Vitalik Buterin',
    blurb: 'Ethereum co-founder. Rare moves, always news.',
    avatar: '/figures/vitalik-buterin.jpg',
  },
  {
    slug: 'binance',
    name: 'Binance',
    blurb: 'The largest exchange. Its hot wallets move billions.',
    avatar: '/figures/binance-cold-wallets.jpg',
  },
  {
    slug: 'wintermute',
    name: 'Wintermute',
    blurb: "Crypto's biggest market maker. Early to every listing.",
    avatar: null,
  },
  {
    slug: 'mrbeast',
    name: 'MrBeast',
    blurb: "YouTube's biggest creator, trading on-chain.",
    avatar: null,
  },
  {
    slug: 'donald-trump',
    name: 'Donald Trump',
    blurb: 'World Liberty Financial and the family wallets.',
    avatar: '/figures/donald-trump.jpg',
  },
  {
    slug: 'justin-sun',
    name: 'Justin Sun',
    blurb: 'Tron founder. Nine-figure transfers are routine.',
    avatar: '/figures/justin-sun.jpg',
  },
])

export const FAMOUS_SLUGS = Object.freeze(FAMOUS_WALLETS.map((w) => w.slug))

export function isFamousSlug(slug) {
  return typeof slug === 'string' && FAMOUS_SLUGS.includes(slug)
}

/** Max addresses followed per entity — enough to catch the action, not 81 Binance wallets. */
export const MAX_ADDRESSES_PER_ENTITY = 3
