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
          '/pricing',
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
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
} 