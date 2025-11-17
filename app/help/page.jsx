'use client'
import { useState } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import Link from 'next/link'

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1621 0%, #0f1922 50%, #0a1621 100%);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(54, 166, 186, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(46, 204, 113, 0.06) 0%, transparent 50%);
    pointer-events: none;
  }
`

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 8rem 2rem 4rem;
  position: relative;
  z-index: 1;
`

const Title = styled(motion.h1)`
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary) 0%, #2ecc71 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`

const Subtitle = styled.p`
  text-align: center;
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin-bottom: 3rem;
`

const SearchBox = styled.div`
  max-width: 600px;
  margin: 0 auto 4rem;
`

const SearchInput = styled.input`
  width: 100%;
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  color: var(--text-primary);
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(54, 166, 186, 0.15);
  }
`

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
`

const CategoryCard = styled(motion.a)`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--primary);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(54, 166, 186, 0.2);
  }

  svg {
    width: 48px;
    height: 48px;
    color: var(--primary);
    margin-bottom: 1rem;
  }

  h3 {
    color: var(--text-primary);
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
  }

  p {
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  .count {
    color: var(--primary);
    font-size: 0.9rem;
    font-weight: 600;
  }
`

const SupportSection = styled.div`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 3rem;
  text-align: center;
  margin-top: 4rem;

  h2 {
    color: var(--text-primary);
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  p {
    color: var(--text-secondary);
    font-size: 1.1rem;
    margin-bottom: 2rem;
    line-height: 1.6;
  }
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`

const Button = styled(motion.a)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;

  ${props => props.$primary && `
    background: linear-gradient(135deg, var(--primary) 0%, #2ecc71 100%);
    color: white;
    box-shadow: 0 4px 16px rgba(54, 166, 186, 0.4);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(54, 166, 186, 0.5);
    }
  `}

  ${props => props.$secondary && `
    background: rgba(54, 166, 186, 0.1);
    border: 1px solid rgba(54, 166, 186, 0.3);
    color: var(--primary);

    &:hover {
      background: rgba(54, 166, 186, 0.2);
      border-color: var(--primary);
    }
  `}

  svg {
    width: 20px;
    height: 20px;
  }
`

const QuickLinksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin: 3rem 0;
`

const QuickLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(13, 33, 52, 0.4);
  border: 1px solid rgba(54, 166, 186, 0.15);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  text-decoration: none;
  color: var(--text-secondary);
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
    transform: translateX(4px);
  }

  svg {
    width: 24px;
    height: 24px;
    color: var(--primary);
  }

  span {
    font-weight: 500;
  }
`

export default function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState('')

  const categories = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      title: 'Getting Started',
      description: 'New to Sonar Tracker? Learn the basics and get up to speed quickly.',
      articles: 12,
      link: '/faq#getting-started'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Features & Tools',
      description: 'Deep dive into our analytics, AI advisor, and whale tracking capabilities.',
      articles: 15,
      link: '/faq#features'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      title: 'Billing & Subscriptions',
      description: 'Manage your Premium subscription, payments, and billing information.',
      articles: 8,
      link: '/faq#subscriptions'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: 'Technical Support',
      description: 'Troubleshoot issues, learn about our technology, and get technical help.',
      articles: 10,
      link: '/faq#troubleshooting'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: 'Privacy & Security',
      description: 'Learn how we protect your data and maintain your privacy.',
      articles: 6,
      link: '/faq#account-privacy'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-6-2a9 9 0 0118 0v2H6v-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19h16M8 11h8M8 15h5" />
        </svg>
      ),
      title: 'Glossary & Terminology',
      description: 'Understand BUY/SELL/TRANSFER/DEFI tags, whale flows, and key metrics.',
      articles: 14,
      link: '/glossary'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Account Management',
      description: 'Manage your profile, preferences, and account settings.',
      articles: 7,
      link: '/profile'
    }
  ]

  return (
    <PageContainer>
      <Content>
        <Title
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Help Center
        </Title>
        <Subtitle>How can we help you today?</Subtitle>

        <SearchBox>
          <SearchInput
            type="text"
            placeholder="Search for help..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && searchTerm) {
                window.location.href = `/faq?search=${encodeURIComponent(searchTerm)}`
              }
            }}
          />
        </SearchBox>

        <CategoryGrid>
          {categories.map((category, index) => (
            <CategoryCard
              key={index}
              href={category.link}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              {category.icon}
              <h3>{category.title}</h3>
              <p>{category.description}</p>
              <span className="count">{category.articles} articles</span>
            </CategoryCard>
          ))}
        </CategoryGrid>

        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', marginBottom: '1.5rem' }}>
          Popular Articles
        </h2>
        <QuickLinksGrid>
          <QuickLink href="/faq#what-is-sonar">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>What is Sonar Tracker?</span>
          </QuickLink>
          <QuickLink href="/faq#how-to-subscribe">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>How to subscribe to Premium</span>
          </QuickLink>
          <QuickLink href="/faq#export-data">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>How to export data as CSV</span>
          </QuickLink>
          <QuickLink href="/faq#orca-ai">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>What is Orca 2.0?</span>
          </QuickLink>
          <QuickLink href="/glossary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m8-2a7 7 0 00-14 0v2h14v-2zM6 12h8" />
            </svg>
            <span>Transaction Type Glossary</span>
          </QuickLink>
        </QuickLinksGrid>

        <SupportSection>
          <h2>Still need help?</h2>
          <p>
            Can't find what you're looking for? Our support team is here to help you with any questions or issues.
          </p>
          <ButtonGroup>
            <Button href="/contact" $primary whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Support
            </Button>
            <Button href="/faq" $secondary whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View FAQ
            </Button>
          </ButtonGroup>
        </SupportSection>
      </Content>
    </PageContainer>
  )
}

