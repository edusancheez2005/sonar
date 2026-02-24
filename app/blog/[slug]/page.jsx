import React from 'react'
import BlogPostClient from './BlogPostClient'

const posts = {
  'what-is-whale-tracking': {
    title: 'What is Whale Tracking? How It Works and Why It Matters',
    description: 'Understand how whale tracking reveals large on-chain moves and how traders use it for edge.',
    date: '2025-08-01',
  },
  'copy-whale-trades': {
    title: 'How To Copy Whale Trades Safely (Without Chasing Pumps)',
    description: 'A practical framework to follow whales while managing risk and slippage.',
    date: '2025-08-05',
  },
  'real-time-crypto-transactions': {
    title: 'Real-Time Crypto Transactions Explained',
    description: 'From mempools to settlement, how data flows into live dashboards and alerts.',
    date: '2025-08-10',
  },
  'orca-ai-crypto-trading': {
    title: 'Orca AI: Next-Generation Crypto Trading Intelligence',
    description: 'Discover how Orca AI revolutionizes crypto trading with advanced pattern recognition and market analysis.',
    date: '2025-09-01',
  },
}

export async function generateMetadata({ params }) {
  const { slug } = params
  const post = posts[slug] || posts['what-is-whale-tracking']

  return {
    title: `${post.title}`,
    description: post.description,
    alternates: { canonical: `https://www.sonartracker.io/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://www.sonartracker.io/blog/${slug}`,
      type: 'article',
      publishedTime: post.date,
      authors: ['Sonar Tracker Team'],
      siteName: 'Sonar Tracker',
    },
  }
}

function BlogPostSchema({ slug }) {
  const post = posts[slug] || posts['what-is-whale-tracking']
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: '2026-02-24',
    author: { '@type': 'Organization', name: 'Sonar Tracker', url: 'https://www.sonartracker.io' },
    publisher: {
      '@type': 'Organization',
      name: 'Sonar Tracker',
      logo: { '@type': 'ImageObject', url: 'https://www.sonartracker.io/logo2.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://www.sonartracker.io/blog/${slug}` },
    image: 'https://www.sonartracker.io/screenshots/stats-dashboard.png',
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export default function BlogPost({ params }) {
  return (
    <>
      <BlogPostSchema slug={params.slug} />
      <BlogPostClient slug={params.slug} />
    </>
  )
}

export async function generateStaticParams() {
  return [
    { slug: 'what-is-whale-tracking' },
    { slug: 'copy-whale-trades' },
    { slug: 'real-time-crypto-transactions' },
    { slug: 'orca-ai-crypto-trading' },
  ]
}