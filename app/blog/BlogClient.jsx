'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { motion } from 'framer-motion'



const BlogContainer = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 4rem 2rem;
  min-height: 100vh;
  background: var(--background-dark);
`

const BlogHeader = styled.div`
  text-align: center;
  margin-bottom: 5rem;
  padding: 2rem 0;
`

const BlogTitle = styled.h1`
  font-size: 4rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 1.5rem;
  letter-spacing: -0.02em;
  line-height: 1.1;
  
  @media (max-width: 768px) {
    font-size: 2.8rem;
  }
  
  @media (max-width: 480px) {
    font-size: 2.2rem;
  }
`

const BlogSubtitle = styled.p`
  font-size: 1.3rem;
  font-weight: 400;
  color: var(--text-secondary);
  max-width: 700px;
  margin: 0 auto 2.5rem;
  line-height: 1.6;
  letter-spacing: 0.01em;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    max-width: 90%;
  }
`

const SearchBar = styled.div`
  margin: 0 auto;
  max-width: 600px;
  position: relative;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 1.2rem 2rem;
  background: var(--background-secondary);
  border: 2px solid var(--secondary);
  border-radius: 30px;
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 400;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  
  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1), 
                0 8px 25px rgba(52, 152, 219, 0.15);
    transform: translateY(-1px);
  }
  
  &::placeholder {
    color: var(--text-secondary);
    font-weight: 400;
    opacity: 0.7;
  }
  
  @media (max-width: 768px) {
    padding: 1rem 1.5rem;
    font-size: 1rem;
  }
`

const PostsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 2.5rem;
  margin-top: 4rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
    margin-top: 3rem;
  }
`

const PostCard = styled(motion.article)`
  background: var(--background-secondary);
  border: 1px solid var(--secondary);
  border-radius: 20px;
  padding: 2.5rem;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--primary), #45a3d9);
    transform: scaleX(0);
    transition: transform 0.4s ease;
  }
  
  &:hover {
    border-color: var(--primary);
    box-shadow: 0 12px 40px rgba(52, 152, 219, 0.15),
                0 4px 20px rgba(0, 0, 0, 0.1);
    transform: translateY(-8px);
    
    &::before {
      transform: scaleX(1);
    }
  }
  
  @media (max-width: 768px) {
    padding: 2rem;
    
    &:hover {
      transform: translateY(-4px);
    }
  }
`

const PostTitle = styled.h2`
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1.2rem;
  line-height: 1.4;
  letter-spacing: -0.01em;
  
  @media (max-width: 768px) {
    font-size: 1.4rem;
    margin-bottom: 1rem;
  }
`

const PostSummary = styled.p`
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 2rem;
  font-size: 1rem;
  font-weight: 400;
  opacity: 0.9;
  
  @media (max-width: 768px) {
    font-size: 0.95rem;
    margin-bottom: 1.5rem;
  }
`

const PostMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`

const ReadTime = styled.span`
  background: linear-gradient(135deg, var(--primary), #45a3d9);
  color: white;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
`

const CategoryTag = styled.span`
  background: rgba(52, 152, 219, 0.12);
  color: var(--primary);
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 1rem;
  display: inline-block;
  letter-spacing: 0.02em;
  border: 1px solid rgba(52, 152, 219, 0.2);
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(52, 152, 219, 0.2);
    transform: translateY(-1px);
  }
`

const NewsletterSection = styled.section`
  background: linear-gradient(135deg, var(--background-secondary) 0%, rgba(52, 152, 219, 0.05) 100%);
  border: 1px solid var(--secondary);
  border-radius: 24px;
  padding: 4rem 3rem;
  text-align: center;
  margin: 5rem 0 3rem;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--primary), #45a3d9, var(--primary));
  }
  
  h3 {
    font-size: 2.2rem;
    font-weight: 700;
    color: var(--primary);
    margin-bottom: 1rem;
    letter-spacing: -0.02em;
    
    @media (max-width: 768px) {
      font-size: 1.8rem;
    }
  }
  
  p {
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin-bottom: 2.5rem;
    line-height: 1.6;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
    
    @media (max-width: 768px) {
      font-size: 1rem;
    }
  }
  
  @media (max-width: 768px) {
    padding: 3rem 2rem;
    margin: 4rem 0 2rem;
  }
`

const NewsletterForm = styled.form`
  display: flex;
  gap: 1rem;
  max-width: 480px;
  margin: 0 auto;
  
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 1rem;
  }
`

const EmailInput = styled.input`
  flex: 1;
  padding: 1rem 1.5rem;
  background: var(--background-dark);
  border: 2px solid var(--secondary);
  border-radius: 30px;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 400;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1),
                0 4px 12px rgba(52, 152, 219, 0.15);
    transform: translateY(-1px);
  }
  
  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.7;
  }
`

const SubscribeButton = styled.button`
  padding: 1rem 2.5rem;
  background: linear-gradient(135deg, var(--primary), #45a3d9);
  color: white;
  border: none;
  border-radius: 30px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: 0.02em;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(52, 152, 219, 0.3);
  white-space: nowrap;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(52, 152, 219, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  @media (max-width: 600px) {
    padding: 1rem 2rem;
  }
`

const posts = [
  { 
    slug: 'orca-ai-crypto-trading', 
    title: 'Orca AI: Next-Generation Crypto Trading Intelligence', 
    summary: 'Discover how Orca AI revolutionizes crypto trading with advanced pattern recognition and market analysis.',
    readTime: '7 min read',
    category: 'AI & Technology',
    date: 'Dec 18, 2024'
  },
  { 
    slug: 'what-is-whale-tracking', 
    title: 'What is Whale Tracking? How It Works and Why It Matters', 
    summary: 'Understand how whale tracking reveals large on‑chain moves and how traders use it for edge.',
    readTime: '5 min read',
    category: 'Basics',
    date: 'Dec 15, 2024'
  },
  { 
    slug: 'copy-whale-trades', 
    title: 'How To Copy Whale Trades Safely (Without Chasing Pumps)', 
    summary: 'A practical framework to follow whales while managing risk and slippage.',
    readTime: '8 min read',
    category: 'Strategy',
    date: 'Dec 12, 2024'
  },
  { 
    slug: 'real-time-crypto-transactions', 
    title: 'Real‑Time Crypto Transactions Explained', 
    summary: 'From mempools to settlement, how data flows into live dashboards and alerts.',
    readTime: '6 min read',
    category: 'Technical',
    date: 'Dec 10, 2024'
  },
]

export default function BlogClient() {
  const [searchTerm, setSearchTerm] = useState('')
  const [email, setEmail] = useState('')
  const [subscribeMessage, setSubscribeMessage] = useState('')
  const [isSubscribing, setIsSubscribing] = useState(false)

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSubscribe = async (e) => {
    e.preventDefault()
    setIsSubscribing(true)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const json = await res.json()
      setSubscribeMessage(res.ok ? 'Thanks! You\'re subscribed to whale alerts.' : (json.error || 'Error subscribing'))
      if (res.ok) setEmail('')
    } catch (err) {
      setSubscribeMessage('Error subscribing. Please try again.')
    } finally {
      setIsSubscribing(false)
    }
  }

  return (
    <BlogContainer>
      <BlogHeader>
        <BlogTitle>Crypto Whale Insights</BlogTitle>
        <BlogSubtitle>
          Master whale tracking, copy trading strategies, and on-chain analytics with our comprehensive guides
        </BlogSubtitle>
        
        <SearchBar>
          <SearchInput
            type="text"
            placeholder="Search articles by topic, category, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchBar>
      </BlogHeader>

      <PostsGrid>
        {filteredPosts.map((post, index) => (
          <PostCard
            key={post.slug}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: index * 0.1,
              duration: 0.6,
              ease: [0.4, 0, 0.2, 1]
            }}
            whileHover={{ scale: 1.02 }}
          >
            <Link 
              href={`/blog/${post.slug}`} 
              style={{ 
                textDecoration: 'none', 
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}
            >
              <CategoryTag>{post.category}</CategoryTag>
              <PostTitle>{post.title}</PostTitle>
              <PostSummary>{post.summary}</PostSummary>
              <PostMeta>
                <span style={{ fontWeight: '500' }}>{post.date}</span>
                <ReadTime>{post.readTime}</ReadTime>
              </PostMeta>
            </Link>
          </PostCard>
        ))}
      </PostsGrid>

      {filteredPosts.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ 
            textAlign: 'center', 
            padding: '4rem 2rem', 
            color: 'var(--text-secondary)',
            background: 'var(--background-secondary)',
            borderRadius: '20px',
            border: '1px solid var(--secondary)',
            margin: '2rem 0'
          }}
        >
          <h3 style={{ 
            fontSize: '1.5rem', 
            marginBottom: '1rem', 
            color: 'var(--text-primary)' 
          }}>
            No articles found
          </h3>
          <p style={{ 
            fontSize: '1.1rem', 
            lineHeight: '1.6' 
          }}>
            Try searching for different keywords or browse all articles
          </p>
        </motion.div>
      )}

      <NewsletterSection>
        <h3>Get Whale Alerts & Trading Insights</h3>
        <p>
          Join 10,000+ traders getting real-time whale movements and market analysis delivered to your inbox
        </p>
        
        <NewsletterForm onSubmit={handleSubscribe}>
          <EmailInput
            type="email"
            placeholder="Enter your email for whale alerts"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <SubscribeButton type="submit" disabled={isSubscribing}>
            {isSubscribing ? 'Subscribing...' : 'Get Alerts'}
          </SubscribeButton>
        </NewsletterForm>
        
        {subscribeMessage && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              marginTop: '1.5rem', 
              padding: '1rem',
              borderRadius: '12px',
              background: subscribeMessage.includes('Thanks') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: subscribeMessage.includes('Thanks') ? '#22c55e' : '#ef4444',
              border: `1px solid ${subscribeMessage.includes('Thanks') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              fontWeight: '500'
            }}
          >
            {subscribeMessage}
          </motion.p>
        )}
      </NewsletterSection>
    </BlogContainer>
  )
}
