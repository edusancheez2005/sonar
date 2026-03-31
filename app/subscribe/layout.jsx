const productSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Sonar Tracker Pro',
  description: 'Unlimited AI conversations, enhanced analytics, CSV export, and priority support for crypto whale intelligence.',
  image: 'https://www.sonartracker.io/logo2.png',
  brand: { '@type': 'Brand', name: 'Sonar Tracker' },
  offers: {
    '@type': 'Offer',
    price: '7.99',
    priceCurrency: 'USD',
    priceValidUntil: '2027-12-31',
    availability: 'https://schema.org/InStock',
    url: 'https://www.sonartracker.io/subscribe',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '127',
  },
}

export const metadata = {
  title: 'Pricing — Whale Tracking Plans',
  description: 'Sonar Tracker: free whale tracking, signals, and analytics. Pro at $7.99/month for unlimited AI conversations and enhanced analytics.',
  keywords: 'sonar tracker pricing, crypto whale tracker price, whale tracking subscription, cheap whale tracker, crypto analytics pricing',
  alternates: { canonical: 'https://www.sonartracker.io/subscribe' },
  openGraph: {
    title: 'Pricing — Whale Tracking Plans | Sonar Tracker',
    description: 'Free tier + Pro at $7.99/month. Real-time whale tracking, AI signals, alerts, CSV export. Cancel anytime.',
    url: 'https://www.sonartracker.io/subscribe',
    type: 'website',
  },
}

export default function SubscribeLayout({ children }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      {children}
    </>
  )
}
