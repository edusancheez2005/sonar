'use client'
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'

const Wrap = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 6rem 2rem 4rem;
  min-height: 80vh;
  color: var(--text-primary);
  
  h1 { font-size: 2.2rem; font-weight: 800; margin-bottom: 1rem; color: var(--primary); line-height: 1.2; }
  h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem; color: var(--text-primary); }
  h3 { font-size: 1.2rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; color: var(--text-primary); }
  p { line-height: 1.7; margin-bottom: 1rem; color: var(--text-secondary); }
  a { color: var(--primary); text-decoration: none; &:hover { text-decoration: underline; } }
  ul, ol { margin-bottom: 1rem; padding-left: 1.5rem; color: var(--text-secondary); }
  li { margin-bottom: 0.5rem; line-height: 1.6; }
  img { max-width: 100%; border-radius: 12px; margin: 1.5rem 0; }
  blockquote {
    border-left: 3px solid var(--primary); margin: 1.5rem 0; padding: 1rem 1.5rem;
    background: rgba(54,166,186,0.05); border-radius: 0 8px 8px 0;
    p { color: var(--text-secondary); margin: 0; }
  }
  table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
  th { background: rgba(54,166,186,0.1); color: var(--primary); padding: 0.75rem; text-align: left; border-bottom: 2px solid rgba(54,166,186,0.2); font-weight: 600; }
  td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--secondary); color: var(--text-secondary); }
  strong { color: var(--text-primary); }
  em { color: var(--text-secondary); }
`

const Meta = styled.div`
  display: flex; gap: 1rem; align-items: center; margin-bottom: 2rem;
  font-size: 0.85rem; color: var(--text-secondary);
`

const Tag = styled.span`
  padding: 4px 10px; border-radius: 999px; font-size: 0.75rem;
  background: rgba(54,166,186,0.1); color: var(--primary); font-weight: 500;
`

const Loading = styled.div`
  max-width: 800px; margin: 0 auto; padding: 8rem 2rem;
  text-align: center; color: var(--text-secondary);
`

export default function DynamicBlogPost({ slug }) {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/blog?slug=${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setPost(data); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [slug])

  if (loading) return <Loading>Loading article...</Loading>
  if (error || !post) return <Loading>Article not found.</Loading>

  const date = new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <Wrap>
      <Meta>
        <span>{date}</span>
        {(post.tags || []).slice(0, 3).map(t => <Tag key={t}>{t}</Tag>)}
      </Meta>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </Wrap>
  )
}
