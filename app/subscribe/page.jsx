'use client'
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { useRouter } from 'next/navigation'

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1621 0%, #132a3f 50%, #0a1621 100%);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(54, 166, 186, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(93, 213, 237, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }
`

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 4rem 2rem;
  position: relative;
  z-index: 1;
`

const Header = styled.div`
  text-align: center;
  margin-bottom: 4rem;
`

const Title = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`

const Subtitle = styled(motion.p)`
  font-size: 1.3rem;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`

const PricingContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const PricingCard = styled(motion.div)`
  background: ${props => props.$featured 
    ? 'linear-gradient(135deg, rgba(54, 166, 186, 0.15) 0%, rgba(26, 40, 56, 0.95) 100%)'
    : 'rgba(26, 40, 56, 0.8)'};
  border: ${props => props.$featured ? '2px solid var(--primary)' : '1px solid rgba(54, 166, 186, 0.2)'};
  border-radius: 20px;
  padding: 2.5rem;
  position: relative;
  backdrop-filter: blur(10px);
  box-shadow: ${props => props.$featured 
    ? '0 20px 60px rgba(54, 166, 186, 0.25), 0 0 80px rgba(54, 166, 186, 0.1)'
    : '0 10px 30px rgba(0, 0, 0, 0.3)'};
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: ${props => props.$featured 
      ? '0 25px 70px rgba(54, 166, 186, 0.35), 0 0 100px rgba(54, 166, 186, 0.15)'
      : '0 15px 40px rgba(0, 0, 0, 0.4)'};
  }
`

const Badge = styled.div`
  position: absolute;
  top: -12px;
  right: 20px;
  background: linear-gradient(135deg, #36a6ba 0%, #2d8a9a 100%);
  color: #ffffff;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(54, 166, 186, 0.4);
`

const PlanName = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
`

const PriceContainer = styled.div`
  margin: 1.5rem 0 2rem;
`

const Price = styled.div`
  font-size: 3rem;
  font-weight: 800;
  color: var(--primary);
  line-height: 1;
  
  span {
    font-size: 1.2rem;
    color: var(--text-secondary);
    font-weight: 500;
  }
`

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 2rem 0;
  
  li {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem 0;
    color: var(--text-primary);
    font-size: 1rem;
    line-height: 1.5;
    
    &::before {
      content: '✓';
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      background: rgba(54, 166, 186, 0.2);
      border: 2px solid var(--primary);
      border-radius: 50%;
      color: var(--primary);
      font-weight: bold;
      font-size: 0.85rem;
      margin-top: 2px;
    }
  }
`

const Button = styled(motion.button)`
  width: 100%;
  background: ${props => props.$featured 
    ? 'linear-gradient(135deg, #36a6ba 0%, #2d8a9a 100%)'
    : 'rgba(54, 166, 186, 0.15)'};
  color: ${props => props.$featured ? '#ffffff' : 'var(--primary)'};
  border: ${props => props.$featured ? 'none' : '2px solid var(--primary)'};
  border-radius: 12px;
  padding: 1.1rem 2rem;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: ${props => props.$featured ? '0 8px 24px rgba(54, 166, 186, 0.3)' : 'none'};
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${props => props.$featured 
      ? '0 12px 32px rgba(54, 166, 186, 0.4)'
      : '0 4px 16px rgba(54, 166, 186, 0.2)'};
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const Alert = styled(motion.div)`
  background: ${props => props.$type === 'error' 
    ? 'rgba(231, 76, 60, 0.15)' 
    : 'rgba(255, 193, 7, 0.15)'};
  border: 1px solid ${props => props.$type === 'error' 
    ? 'rgba(231, 76, 60, 0.4)' 
    : 'rgba(255, 193, 7, 0.4)'};
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 2rem;
  text-align: center;
  
  strong {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    font-size: 1.1rem;
  }
  
  p {
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
  }
`

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

const TrustBadges = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(54, 166, 186, 0.2);
  flex-wrap: wrap;
`

const TrustBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
  
  svg {
    width: 20px;
    height: 20px;
    color: var(--primary);
  }
`

const InfoSection = styled.section`
  margin-top: 6rem;
  padding-top: 4rem;
  border-top: 1px solid rgba(54, 166, 186, 0.2);
`

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 3rem;
  background: linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
`

const FeatureCard = styled(motion.div)`
  background: rgba(26, 40, 56, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
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
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--text-primary);
  }
  
  p {
    color: var(--text-secondary);
    line-height: 1.8;
  }
`

const ComparisonTable = styled.div`
  background: rgba(26, 40, 56, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 4rem;
  overflow-x: auto;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th {
    padding: 1.5rem 1rem;
    text-align: left;
    border-bottom: 2px solid rgba(54, 166, 186, 0.3);
    color: var(--primary);
    font-weight: 600;
    font-size: 1.1rem;
  }
  
  td {
    padding: 1.5rem 1rem;
    border-bottom: 1px solid rgba(54, 166, 186, 0.1);
    color: var(--text-secondary);
    
    &:first-child {
      color: var(--text-primary);
      font-weight: 500;
    }
  }
  
  tr:last-child td {
    border-bottom: none;
  }
  
  .check {
    color: #2ecc71;
    font-size: 1.5rem;
  }
  
  .cross {
    color: #e74c3c;
    font-size: 1.5rem;
  }
`

const FAQSection = styled.div`
  margin-top: 4rem;
`

const FAQItem = styled(motion.div)`
  background: rgba(26, 40, 56, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: var(--primary);
  }
`

const FAQQuestion = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  
  h3 {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }
  
  svg {
    width: 24px;
    height: 24px;
    color: var(--primary);
    transition: transform 0.3s ease;
    flex-shrink: 0;
  }
  
  &.open svg {
    transform: rotate(180deg);
  }
`

const FAQAnswer = styled(motion.div)`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(54, 166, 186, 0.2);
  color: var(--text-secondary);
  line-height: 1.8;
  
  p {
    margin: 0;
  }
`

export default function SubscribePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [openFAQ, setOpenFAQ] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const sb = supabaseBrowser()
      const { data: { session } } = await sb.auth.getSession()
      setIsAuthenticated(!!session?.user)
      setCheckingAuth(false)
    }
    checkAuth()
  }, [])

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      setError('Please log in to subscribe')
      setTimeout(() => router.push('/?login=1'), 1500)
      return
    }

    setError('')
    setLoading(true)
    try {
      // Get Stripe Price ID from environment variable
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_1SITcJK8B21zF4WA5o9J1l7T'
      
      console.log('Creating checkout session with priceId:', priceId)
      
      // Get session token
      const sb = supabaseBrowser()
      const { data: { session } } = await sb.auth.getSession()
      
      const headers = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({ priceId }),
      })
      
      console.log('Response status:', res.status)
      
      // Check if response is ok before parsing JSON
      if (!res.ok) {
        const text = await res.text()
        console.error('Server error response:', text)
        let errorMessage = 'Failed to create checkout session'
        try {
          const data = JSON.parse(text)
          console.error('Parsed error data:', data)
          errorMessage = data.error || errorMessage
        } catch (parseErr) {
          console.error('Could not parse error response:', parseErr)
          errorMessage = text || errorMessage
        }
        throw new Error(errorMessage)
      }
      
      const data = await res.json()
      
      if (data?.url) {
        window.location.href = data.url
        return
      }
      
      setError('No checkout URL returned. Please try again or contact support.')
    } catch (e) {
      console.error('Subscribe error:', e)
      console.error('Error details:', {
        message: e.message,
        stack: e.stack
      })
      // Show the full error message to the user
      setError(e.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <PageContainer>
        <Container>
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <LoadingSpinner style={{ width: '40px', height: '40px' }} />
            <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Loading...</p>
          </div>
        </Container>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <Container>
        <Header>
          <Title
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Unlock the Full Power of Sonar
          </Title>
          <Subtitle
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Get real-time whale analytics, advanced insights, and AI-powered market intelligence
          </Subtitle>
        </Header>

        {!isAuthenticated && (
          <Alert
            $type="warning"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <strong>⚠️ Authentication Required</strong>
            <p>Please log in or create an account to subscribe to Sonar Pro</p>
          </Alert>
        )}

        {error && (
          <Alert
            $type="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <strong>❌ Subscription Error</strong>
            <p style={{ marginBottom: '0.5rem' }}>{error}</p>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, margin: 0 }}>
              If this persists, please contact support at eduardo@sonartracker.io
            </p>
          </Alert>
        )}

        <PricingContainer>
          {/* Free Plan */}
          <PricingCard
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <PlanName>Free</PlanName>
            <PriceContainer>
              <Price>
                $0<span>/month</span>
              </Price>
            </PriceContainer>
            <FeatureList>
              <li>Access to News & Market Updates</li>
              <li>Basic Statistics View</li>
              <li>Limited Transaction History</li>
              <li>Community Support</li>
            </FeatureList>
            <Button
              $featured={false}
              onClick={() => router.push('/dashboard')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Current Plan
            </Button>
          </PricingCard>

          {/* Pro Plan */}
          <PricingCard
            $featured={true}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Badge>MOST POPULAR</Badge>
            <PlanName>Pro</PlanName>
            <PriceContainer>
              <Price>
                $7.99<span>/month</span>
              </Price>
            </PriceContainer>
            <FeatureList>
              <li>Real-time whale transaction tracking (24/7)</li>
              <li>Advanced token analytics & heatmaps</li>
              <li>Risk assessment & sentiment analysis</li>
              <li>Complete transaction history</li>
              <li>AI Advisor (Orca 2.0) with premium prompts</li>
              <li>Custom alerts & notifications</li>
              <li>Priority support</li>
              <li>Export data to CSV</li>
            </FeatureList>
            <Button
              $featured={true}
              onClick={handleSubscribe}
              disabled={loading || !isAuthenticated}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <>
                  <LoadingSpinner /> Redirecting...
                </>
              ) : !isAuthenticated ? (
                'Log In to Subscribe'
              ) : (
                'Subscribe Now'
              )}
            </Button>
          </PricingCard>
        </PricingContainer>

        <TrustBadges
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <TrustBadge>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Secure Payment
          </TrustBadge>
          <TrustBadge>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cancel Anytime
          </TrustBadge>
          <TrustBadge>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Instant Access
          </TrustBadge>
        </TrustBadges>

        {/* Features Section */}
        <InfoSection>
          <SectionTitle>Why Go Pro?</SectionTitle>
          <FeatureGrid>
            <FeatureCard
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3>Real-Time Tracking</h3>
              <p>Monitor whale transactions as they happen across Ethereum, Polygon, Avalanche, and more. Never miss a significant market move.</p>
            </FeatureCard>

            <FeatureCard
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3>Advanced Analytics</h3>
              <p>Interactive heatmaps, sentiment analysis, and risk assessments powered by our proprietary whale detection algorithm.</p>
            </FeatureCard>

            <FeatureCard
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3>AI-Powered Insights</h3>
              <p>Orca 2.0 AI advisor provides deep token analysis, market sentiment, and actionable trading insights using live data.</p>
            </FeatureCard>

            <FeatureCard
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3>Custom Alerts</h3>
              <p>Set up personalized notifications for specific tokens, whale addresses, or transaction thresholds that matter to you.</p>
            </FeatureCard>

            <FeatureCard
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <h3>Data Export</h3>
              <p>Download comprehensive transaction data in CSV format for your own analysis, backtesting, or record keeping.</p>
            </FeatureCard>

            <FeatureCard
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3>Priority Support</h3>
              <p>Get fast, dedicated support from our team. We're here to help you make the most of Sonar Tracker.</p>
            </FeatureCard>
          </FeatureGrid>

          {/* Comparison Table */}
          <SectionTitle>Free vs Pro Comparison</SectionTitle>
          <ComparisonTable>
            <Table>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Free</th>
                  <th>Pro</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>News & Market Updates</td>
                  <td><span className="check">✓</span></td>
                  <td><span className="check">✓</span></td>
                </tr>
                <tr>
                  <td>Basic Statistics</td>
                  <td><span className="check">✓</span></td>
                  <td><span className="check">✓</span></td>
                </tr>
                <tr>
                  <td>Real-Time Whale Tracking (24/7)</td>
                  <td><span className="cross">✗</span></td>
                  <td><span className="check">✓</span></td>
                </tr>
                <tr>
                  <td>Advanced Token Analytics & Heatmaps</td>
                  <td><span className="cross">✗</span></td>
                  <td><span className="check">✓</span></td>
                </tr>
                <tr>
                  <td>Risk Assessment & Sentiment Analysis</td>
                  <td><span className="cross">✗</span></td>
                  <td><span className="check">✓</span></td>
                </tr>
                <tr>
                  <td>Complete Transaction History</td>
                  <td>Limited</td>
                  <td><span className="check">✓ Unlimited</span></td>
                </tr>
                <tr>
                  <td>AI Advisor (Orca 2.0)</td>
                  <td>Basic</td>
                  <td><span className="check">✓ Premium Prompts</span></td>
                </tr>
                <tr>
                  <td>Custom Alerts & Notifications</td>
                  <td><span className="cross">✗</span></td>
                  <td><span className="check">✓</span></td>
                </tr>
                <tr>
                  <td>CSV Data Export</td>
                  <td><span className="cross">✗</span></td>
                  <td><span className="check">✓</span></td>
                </tr>
                <tr>
                  <td>Support</td>
                  <td>Community</td>
                  <td><span className="check">✓ Priority</span></td>
                </tr>
              </tbody>
            </Table>
          </ComparisonTable>

          {/* FAQ Section */}
          <SectionTitle>Frequently Asked Questions</SectionTitle>
          <FAQSection>
            <FAQItem onClick={() => setOpenFAQ(openFAQ === 0 ? null : 0)}>
              <FAQQuestion className={openFAQ === 0 ? 'open' : ''}>
                <h3>Can I cancel my subscription at any time?</h3>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </FAQQuestion>
              <AnimatePresence>
                {openFAQ === 0 && (
                  <FAQAnswer
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p>Yes! You can cancel your subscription at any time through your account settings or the Stripe customer portal. There are no cancellation fees, and you'll retain access until the end of your current billing period.</p>
                  </FAQAnswer>
                )}
              </AnimatePresence>
            </FAQItem>

            <FAQItem onClick={() => setOpenFAQ(openFAQ === 1 ? null : 1)}>
              <FAQQuestion className={openFAQ === 1 ? 'open' : ''}>
                <h3>What payment methods do you accept?</h3>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </FAQQuestion>
              <AnimatePresence>
                {openFAQ === 1 && (
                  <FAQAnswer
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p>We use Stripe for secure payment processing and accept all major credit cards (Visa, Mastercard, American Express), debit cards, and various local payment methods depending on your region.</p>
                  </FAQAnswer>
                )}
              </AnimatePresence>
            </FAQItem>

            <FAQItem onClick={() => setOpenFAQ(openFAQ === 2 ? null : 2)}>
              <FAQQuestion className={openFAQ === 2 ? 'open' : ''}>
                <h3>How often is the data updated?</h3>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </FAQQuestion>
              <AnimatePresence>
                {openFAQ === 2 && (
                  <FAQAnswer
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p>Our whale intelligence algorithm runs continuously, processing blockchain data every 15 minutes. Pro subscribers get real-time access to the latest whale transactions and market insights as soon as they're detected and verified.</p>
                  </FAQAnswer>
                )}
              </AnimatePresence>
            </FAQItem>

            <FAQItem onClick={() => setOpenFAQ(openFAQ === 3 ? null : 3)}>
              <FAQQuestion className={openFAQ === 3 ? 'open' : ''}>
                <h3>Which blockchains do you support?</h3>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </FAQQuestion>
              <AnimatePresence>
                {openFAQ === 3 && (
                  <FAQAnswer
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p>Currently, we track whale transactions on Ethereum, Polygon, Avalanche, and Binance Smart Chain. We're constantly expanding our blockchain coverage based on user demand and market significance.</p>
                  </FAQAnswer>
                )}
              </AnimatePresence>
            </FAQItem>

            <FAQItem onClick={() => setOpenFAQ(openFAQ === 4 ? null : 4)}>
              <FAQQuestion className={openFAQ === 4 ? 'open' : ''}>
                <h3>What defines a "whale" transaction?</h3>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </FAQQuestion>
              <AnimatePresence>
                {openFAQ === 4 && (
                  <FAQAnswer
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p>We track transactions with a minimum value of $10,000 USD. Our algorithm analyzes these large movements, filtering out noise and identifying genuine whale activity that can indicate market trends and sentiment shifts.</p>
                  </FAQAnswer>
                )}
              </AnimatePresence>
            </FAQItem>

            <FAQItem onClick={() => setOpenFAQ(openFAQ === 5 ? null : 5)}>
              <FAQQuestion className={openFAQ === 5 ? 'open' : ''}>
                <h3>Is my data secure?</h3>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </FAQQuestion>
              <AnimatePresence>
                {openFAQ === 5 && (
                  <FAQAnswer
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p>Absolutely. We use industry-standard encryption, secure authentication via Supabase, and never store your payment information (handled securely by Stripe). All blockchain data we display is public information from the blockchain itself.</p>
                  </FAQAnswer>
                )}
              </AnimatePresence>
            </FAQItem>

            <FAQItem onClick={() => setOpenFAQ(openFAQ === 6 ? null : 6)}>
              <FAQQuestion className={openFAQ === 6 ? 'open' : ''}>
                <h3>Can I upgrade or downgrade my plan?</h3>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </FAQQuestion>
              <AnimatePresence>
                {openFAQ === 6 && (
                  <FAQAnswer
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p>Yes! You can upgrade to Pro at any time for instant access. If you wish to downgrade, you can cancel your Pro subscription and you'll revert to the Free plan at the end of your billing period.</p>
                  </FAQAnswer>
                )}
              </AnimatePresence>
            </FAQItem>

            <FAQItem onClick={() => setOpenFAQ(openFAQ === 7 ? null : 7)}>
              <FAQQuestion className={openFAQ === 7 ? 'open' : ''}>
                <h3>Do you offer refunds?</h3>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </FAQQuestion>
              <AnimatePresence>
                {openFAQ === 7 && (
                  <FAQAnswer
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p>If you're not satisfied with Sonar Pro, contact us at eduardo@sonartracker.io within 7 days of your subscription start date, and we'll process a full refund. We want you to be completely satisfied with our service.</p>
                  </FAQAnswer>
                )}
              </AnimatePresence>
            </FAQItem>
          </FAQSection>
        </InfoSection>
      </Container>
    </PageContainer>
  )
}
