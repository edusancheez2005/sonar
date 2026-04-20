import React, { Suspense } from 'react'
import BlogClient from './BlogClient'
import { createClient } from '@supabase/supabase-js'

export const metadata = {
  title: 'Blog — Whale Tracking Guides & Crypto Insights',
  description: 'Guides and insights about whale tracking, copy trading, and on‑chain analytics.',
  alternates: { canonical: 'https://www.sonartracker.io/blog' },
}

// Revalidate every 10 minutes so newly generated articles appear without redeploy
export const revalidate = 600

async function getDynamicPosts() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return []
  try {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data, error } = await sb
      .from('blog_posts')
      .select('slug,title,description,category,cover_image,content,created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) {
      console.error('Blog list fetch error:', error.message)
      return []
    }
    return (data || []).map((p) => {
      const wordCount = (p.content || '').split(/\s+/).filter(Boolean).length
      const readMin = Math.max(3, Math.round(wordCount / 220))
      const dateObj = p.created_at ? new Date(p.created_at) : null
      return {
        slug: p.slug,
        title: p.title,
        summary: p.description || '',
        readTime: `${readMin} min read`,
        category: (p.category && p.category !== 'guide')
          ? p.category.charAt(0).toUpperCase() + p.category.slice(1)
          : 'AI Research',
        date: dateObj
          ? dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : '',
        coverImage: p.cover_image || null,
        sortDate: dateObj ? dateObj.getTime() : 0,
        isAi: true,
      }
    })
  } catch (err) {
    console.error('Blog list fetch threw:', err)
    return []
  }
}

function BlogLoading() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'var(--background-dark)',
      color: 'var(--text-primary)'
    }}>
      <div>Loading blog...</div>
    </div>
  )
}

export default async function BlogIndex() {
  const dynamicPosts = await getDynamicPosts()
  return (
    <Suspense fallback={<BlogLoading />}>
      <BlogClient dynamicPosts={dynamicPosts} />
    </Suspense>
  )
} 