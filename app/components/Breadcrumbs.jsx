'use client'
import { usePathname } from 'next/navigation'

const segmentNames = {
  'statistics': 'Statistics',
  'dashboard': 'Dashboard',
  'tokens': 'Tokens',
  'token': 'Token',
  'whales': 'Whales',
  'whale': 'Whale',
  'news': 'News',
  'trending': 'Trending',
  'ai-advisor': 'AI Advisor',
  'ai-crypto-signals': 'AI Crypto Signals',
  'whale-tracker': 'Whale Tracker',
  'nansen-alternative': 'Nansen Alternative',
  'blog': 'Blog',
  'subscribe': 'Pricing',
  'pricing': 'Pricing',
  'faq': 'FAQ',
  'glossary': 'Glossary',
  'contact': 'Contact',
  'help': 'Help Center',
  'careers': 'Careers',
  'press': 'Press',
  'privacy': 'Privacy Policy',
  'terms': 'Terms of Service',
  'backtest': 'Backtest',
  'community': 'Community',
  'profile': 'Profile',
  'changelog': 'Changelog',
  'leaderboard': 'Leaderboard',
  'entities': 'Named Entities',
}

function formatSegment(segment) {
  if (segmentNames[segment]) return segmentNames[segment]
  // For dynamic segments like token symbols, addresses, blog slugs
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export default function Breadcrumbs() {
  const pathname = usePathname()

  // No breadcrumb needed for homepage
  if (!pathname || pathname === '/') return null

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  const items = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.sonartracker.io/' }
  ]

  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    items.push({
      '@type': 'ListItem',
      position: index + 2,
      name: formatSegment(decodeURIComponent(segment)),
      item: `https://www.sonartracker.io${currentPath}`,
    })
  })

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
