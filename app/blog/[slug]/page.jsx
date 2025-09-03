import React from 'react'
import BlogPostClient from './BlogPostClient'

export async function generateMetadata({ params }) {
  const { slug } = params
  
  const posts = {
    'what-is-whale-tracking': {
      title: 'What is Whale Tracking? How It Works and Why It Matters',
      description: 'Understand how whale tracking reveals large on‑chain moves and how traders use it for edge.',
    },
    'copy-whale-trades': {
      title: 'How To Copy Whale Trades Safely (Without Chasing Pumps)',
      description: 'A practical framework to follow whales while managing risk and slippage.',
    },
    'real-time-crypto-transactions': {
      title: 'Real‑Time Crypto Transactions Explained',
      description: 'From mempools to settlement, how data flows into live dashboards and alerts.',
    },
    'orca-ai-crypto-trading': {
      title: 'Orca AI: Next-Generation Crypto Trading Intelligence',
      description: 'Discover how Orca AI revolutionizes crypto trading with advanced pattern recognition and market analysis.',
    }
  }

  const post = posts[slug] || posts['what-is-whale-tracking']

  return {
    title: `${post.title} | Sonar Tracker Crypto`,
    description: post.description,
    alternates: { canonical: `https://www.sonartracker.io/blog/${slug}` },
  }
}

export default function BlogPost({ params }) {
  return <BlogPostClient slug={params.slug} />
}

export async function generateStaticParams() {
  return [
    { slug: 'what-is-whale-tracking' },
    { slug: 'copy-whale-trades' },
    { slug: 'real-time-crypto-transactions' },
    { slug: 'orca-ai-crypto-trading' },
  ]
}