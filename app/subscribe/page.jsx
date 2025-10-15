'use client'
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
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

export default function SubscribePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
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
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || ''
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout session')
      if (data?.url) {
        window.location.href = data.url
        return
      }
      setError('No checkout URL returned')
    } catch (e) {
      setError(e.message || 'Subscription error')
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
            <strong>❌ Error</strong>
            <p>{error}</p>
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
                £0<span>/month</span>
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
                £5<span>/month</span>
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
      </Container>
    </PageContainer>
  )
}
