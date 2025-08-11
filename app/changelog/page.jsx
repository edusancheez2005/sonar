import React from 'react'

export const metadata = { title: "What's New — SONAR" }

export default function ChangelogPage() {
  return (
    <main className="container" style={{ padding: '2rem' }}>
      <h1>What’s New</h1>
      <ul>
        <li>Initial Next.js App Router migration (non-destructive)</li>
        <li>Supabase server-only integration for whales and subscribe</li>
        <li>SEO: robots, sitemap, OG/Twitter, JSON-LD</li>
      </ul>
    </main>
  )
} 