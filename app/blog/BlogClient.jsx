'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const PageContainer = styled.div`
  min-height: 100vh;
  background: var(--background-dark);
`

const NavBar = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 2rem;
  background: var(--background-dark);
  border-bottom: 1px solid var(--secondary);
  position: sticky;
  top: 0;
  z-index: 1000;
`

const Logo = styled.div`
  display: flex;
  align-items: center;
  img { 
    height: 80px; 
    width: auto; 
    object-fit: contain; 
    object-position: center; 
    transition: height 0.3s ease; 
  }
`

const NavLinks = styled.div`
  display: flex;
  gap: 2rem;
  align-items: center;
  
  a { 
    color: var(--text-primary); 
    font-weight: 500; 
    font-size: 1.05rem; 
    text-decoration: none; 
    transition: color 0.3s ease; 
    position: relative; 
  }
  
  a:after { 
    content: ''; 
    position: absolute; 
    left: 0; 
    bottom: -5px; 
    width: 100%; 
    height: 3px; 
    background-color: var(--primary); 
    transform: scaleX(0); 
    transition: transform 0.3s ease; 
  }
  
  a:hover { 
    color: var(--primary); 
  }
  
  a:hover:after { 
    transform: scaleX(1); 
  }
  
  @media (max-width: 768px) { 
    display: none; 
  }
`

const AuthButton = styled.button`
  padding: 0.6rem 1.5rem;
  background: ${props => props.variant === 'login' ? 'transparent' : 'var(--primary)'};
  color: ${props => props.variant === 'login' ? 'var(--primary)' : 'white'};
  border: 2px solid var(--primary);
  border-radius: 25px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  margin-left: 1rem;
  
  &:hover {
    background: ${props => props.variant === 'login' ? 'var(--primary)' : 'var(--primary-hover)'};
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(52, 152, 219, 0.3);
  }
`

const BlogContainer = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 4rem 2rem;
`

const BlogHeader = styled.div`
  text-align: center;
  margin-bottom: 4rem;
`

const BlogTitle = styled.h1`
  font-size: 3.5rem;
  color: var(--primary);
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`

const BlogSubtitle = styled.p`
  font-size: 1.2rem;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
`

const SearchBar = styled.div`
  margin: 2rem auto;
  max-width: 500px;
  position: relative;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 1rem 1.5rem;
  background: var(--background-secondary);
  border: 2px solid var(--secondary);
  border-radius: 25px;
  color: var(--text-primary);
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 20px rgba(52, 152, 219, 0.3);
  }
  
  &::placeholder {
    color: var(--text-secondary);
  }
`

const PostsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
`

const PostCard = styled(motion.article)`
  background: var(--background-secondary);
  border: 1px solid var(--secondary);
  border-radius: 15px;
  padding: 2rem;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    border-color: var(--primary);
    box-shadow: 0 10px 30px rgba(52, 152, 219, 0.2);
    transform: translateY(-5px);
  }
`

const PostTitle = styled.h2`
  font-size: 1.5rem;
  color: var(--text-primary);
  margin-bottom: 1rem;
  line-height: 1.3;
`

const PostSummary = styled.p`
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 1.5rem;
`

const PostMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
`

const ReadTime = styled.span`
  background: var(--primary);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.8rem;
`

const CategoryTag = styled.span`
  background: rgba(52, 152, 219, 0.1);
  color: var(--primary);
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.8rem;
  margin-right: 0.5rem;
`

const NewsletterSection = styled.section`
  background: var(--background-secondary);
  border: 1px solid var(--secondary);
  border-radius: 20px;
  padding: 3rem 2rem;
  text-align: center;
  margin: 4rem 0;
`

const NewsletterForm = styled.form`
  display: flex;
  gap: 1rem;
  max-width: 400px;
  margin: 2rem auto 0;
  
  @media (max-width: 600px) {
    flex-direction: column;
  }
`

const EmailInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  background: var(--background-dark);
  border: 1px solid var(--secondary);
  border-radius: 25px;
  color: var(--text-primary);
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`

const SubscribeButton = styled.button`
  padding: 0.75rem 2rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  
  &:hover {
    background: var(--primary-hover);
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const posts = [
  { 
    slug: 'what-is-whale-tracking', 
    title: 'What is Whale Tracking? How It Works and Why It Matters', 
    summary: 'Learn how whale tracking reveals large on‑chain moves and how traders use it for edge.',
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
  const [user, setUser] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

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

  const handleLogin = () => {
    router.push('/dashboard')
  }

  const handleLogout = async () => {
    try {
      await supabaseBrowser().auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <PageContainer>
      <NavBar>
        <Logo>
          <Link href="/">
            <img src="/logo2.png" alt="Sonar Tracker Logo" />
          </Link>
        </Logo>
        <NavLinks>
          <Link href="/">Home</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/ai-advisor">AI Advisor</Link>
          {user ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <AuthButton onClick={handleLogout} variant="login">
                Logout
              </AuthButton>
            </>
          ) : (
            <AuthButton onClick={handleLogin}>
              Login
            </AuthButton>
          )}
        </NavLinks>
      </NavBar>

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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <CategoryTag>{post.category}</CategoryTag>
              <PostTitle>{post.title}</PostTitle>
              <PostSummary>{post.summary}</PostSummary>
              <PostMeta>
                <span>{post.date}</span>
                <ReadTime>{post.readTime}</ReadTime>
              </PostMeta>
            </Link>
          </PostCard>
        ))}
      </PostsGrid>

      {filteredPosts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <h3>No articles found</h3>
          <p>Try searching for different keywords or browse all articles</p>
        </div>
      )}

      <NewsletterSection>
        <h3 style={{ color: 'var(--primary)', fontSize: '2rem', marginBottom: '1rem' }}>
          Get Whale Alerts & Trading Insights
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Join 10,000+ traders getting real-time whale movements and market analysis
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
          <p style={{ 
            marginTop: '1rem', 
            color: subscribeMessage.includes('Thanks') ? 'var(--success)' : 'var(--error)' 
          }}>
            {subscribeMessage}
          </p>
        )}
      </NewsletterSection>
      </BlogContainer>
    </PageContainer>
  )
}
