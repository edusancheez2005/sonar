import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = 'https://www.sonartracker.io'
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/private/',
          '/_next/',
          '/auth/callback',
          '/profile',
          // Block auth-gated query-param URLs that were leaking into the index
          // (Search Console 2026-04-23 reported /?login=1&required=* as
          //  "Crawled - currently not indexed"). These are interstitial
          //  redirects, not real content.
          '/?login=',
          '/*?login=',
          '/*?required=',
          // Block paginated / filtered URLs that duplicate canonical content
          '/*?page=',
          '/*?ref=',
          '/*?utm_',
        ],
      },
      // Twitterbot must be able to fetch UTM-tagged links we post on X to
      // build link-preview cards; the generic '/*?utm_' disallow above would
      // otherwise block it. Canonical tags keep these out of search indexes.
      {
        userAgent: 'Twitterbot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/private/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
} 