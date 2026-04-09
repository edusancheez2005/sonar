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
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
} 