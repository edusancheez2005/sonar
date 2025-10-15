'use client'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, rgba(15, 25, 38, 0.95) 0%, rgba(10, 22, 33, 0.98) 100%);
  padding: 4rem 2rem;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 300px;
    background: radial-gradient(circle at 50% 0%, rgba(54, 166, 186, 0.15), transparent 70%);
    pointer-events: none;
  }
`

const Wrapper = styled.div`
  max-width: 920px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`

const PageHeader = styled.div`
  margin-bottom: 3rem;
  text-align: center;
  
  h1 {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0 0 0.75rem;
    background: linear-gradient(135deg, #5dd5ed 0%, #36a6ba 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  p {
    color: var(--text-secondary);
    font-size: 1.1rem;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
`

const SecurityBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(46, 204, 113, 0.1);
  border: 1px solid rgba(46, 204, 113, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-size: 0.9rem;
  color: #2ecc71;
  font-weight: 600;
  
  svg {
    width: 16px;
    height: 16px;
  }
`

const Grid = styled.div`
  display: grid;
  gap: 1.5rem;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const Card = styled.section`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  display: grid;
  gap: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--primary), #5dd5ed);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    border-color: rgba(54, 166, 186, 0.4);
    box-shadow: 0 8px 32px rgba(54, 166, 186, 0.12);
    transform: translateY(-2px);
    
    &::before {
      opacity: 1;
    }
  }
  
  &.full-width {
    @media (min-width: 768px) {
      grid-column: 1 / -1;
    }
  }
`

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(54, 166, 186, 0.15);
  
  .icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(54, 166, 186, 0.2), rgba(93, 213, 237, 0.1));
    border-radius: 12px;
    border: 1px solid rgba(54, 166, 186, 0.3);
  }
  
  .header-content {
    flex: 1;
  }
  
  h2 {
    margin: 0 0 0.25rem;
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  
  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
`

const Row = styled.div`
  display: grid;
  gap: 0.75rem;
  
  label {
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  input {
    width: 100%;
    background: rgba(10, 22, 33, 0.6);
    border: 1px solid rgba(54, 166, 186, 0.2);
    color: var(--text-primary);
    border-radius: 12px;
    padding: 0.85rem 1rem;
    font-size: 1rem;
    transition: all 0.2s ease;
    
    &:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(54, 166, 186, 0.1);
    }
    
    &:read-only {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }
`

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
  flex-wrap: wrap;
`

const Primary = styled.button`
  padding: 0.85rem 1.75rem;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%);
  color: #0a1621;
  font-weight: 700;
  font-size: 1rem;
  transition: all 0.25s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    transition: left 0.5s ease;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(54, 166, 186, 0.35);
    
    &::before {
      left: 100%;
    }
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`

const Muted = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
`

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-size: 0.9rem;
  font-weight: 600;
  background: ${props => props.$active ? 'rgba(46, 204, 113, 0.15)' : 'rgba(243, 156, 18, 0.15)'};
  border: 1px solid ${props => props.$active ? 'rgba(46, 204, 113, 0.3)' : 'rgba(243, 156, 18, 0.3)'};
  color: ${props => props.$active ? '#2ecc71' : '#f39c12'};
  
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.$active ? '#2ecc71' : '#f39c12'};
    animation: pulse 2s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`

const InfoBox = styled.div`
  background: rgba(54, 166, 186, 0.08);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  
  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    margin-top: 0.1rem;
    color: var(--primary);
  }
  
  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.6;
  }
`

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.75rem;
  
  li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--text-secondary);
    font-size: 0.95rem;
    
    &::before {
      content: '✓';
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(46, 204, 113, 0.15);
      color: #2ecc71;
      font-weight: 700;
      flex-shrink: 0;
    }
  }
`

export default function ClientProfile({ email: initialEmail }) {
  const [email, setEmail] = useState(initialEmail || '')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [subscription, setSubscription] = useState(null)
  const [loadingSub, setLoadingSub] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (initialEmail) return
    const sb = supabaseBrowser()
    sb.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setEmail(data.user.email)
    })
  }, [initialEmail])

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const sb = supabaseBrowser()
        const { data: { session } } = await sb.auth.getSession()
        if (!session?.access_token) {
          setLoadingSub(false)
          return
        }
        
        const res = await fetch('/api/subscription/status', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        
        if (res.ok) {
          const data = await res.json()
          setSubscription(data)
        }
      } catch (err) {
        console.error('Failed to fetch subscription:', err)
      } finally {
        setLoadingSub(false)
      }
    }
    fetchSubscription()
  }, [])

  const save = async () => {
    setMessage(''); setError('')
    if (newPw.length < 8) { setError('Password must be at least 8 characters'); return }
    if (newPw !== confirmPw) { setError('Passwords do not match'); return }
    try {
      setLoading(true)
      const sb = supabaseBrowser()
      const { error } = await sb.auth.updateUser({ password: newPw })
      if (error) throw error
      setMessage('Password updated successfully.')
      setNewPw(''); setConfirmPw('')
    } catch (e) {
      setError(e.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const openBillingPortal = async () => {
    try {
      setPortalLoading(true)
      const sb = supabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Not logged in')

      // Get customer ID from subscription
      const { data: subData } = await sb
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single()

      if (!subData?.stripe_customer_id) {
        throw new Error('No subscription found')
      }

      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerId: subData.stripe_customer_id,
          returnUrl: window.location.href
        })
      })

      if (!res.ok) throw new Error('Failed to create portal session')
      
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (e) {
      alert(e.message || 'Failed to open billing portal')
    } finally {
      setPortalLoading(false)
    }
  }

  if (!email) return (
    <PageWrapper>
      <Wrapper>
        <Muted>Not signed in.</Muted>
      </Wrapper>
    </PageWrapper>
  )

  return (
    <PageWrapper>
      <Wrapper>
        <PageHeader>
          <h1>Account Settings</h1>
          <SecurityBadge>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Bank-Grade Encryption
          </SecurityBadge>
        </PageHeader>
        
        <Grid>
          <Card>
            <SectionHeader>
              <div className="icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="header-content">
                <h2>Account Information</h2>
                <p>Your personal account details</p>
              </div>
            </SectionHeader>
            <Row>
              <label>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Address
              </label>
              <input type="text" value={email} readOnly />
            </Row>
            <InfoBox>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Your email is securely stored and encrypted. We will never share it with third parties.</p>
            </InfoBox>
          </Card>

          <Card>
            <SectionHeader>
              <div className="icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="header-content">
                <h2>Subscription</h2>
                <p>Manage your billing and plan</p>
              </div>
            </SectionHeader>
            {loadingSub ? (
              <Muted>Loading subscription details...</Muted>
            ) : subscription?.isActive ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <StatusBadge $active={true}>
                    <span className="dot"></span>
                    {subscription.status === 'active' ? 'Active Subscription' : 'Trial Period'}
                  </StatusBadge>
                </div>
                
                <Row>
                  <label>Current Plan</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.05rem' }}>Sonar Pro</span>
                    <span style={{ 
                      padding: '0.25rem 0.6rem', 
                      background: 'rgba(54, 166, 186, 0.15)', 
                      border: '1px solid rgba(54, 166, 186, 0.3)',
                      borderRadius: '6px', 
                      fontSize: '0.85rem', 
                      color: 'var(--primary)',
                      fontWeight: 600
                    }}>
                      £5/month
                    </span>
                  </div>
                </Row>
                
                {subscription.currentPeriodEnd && (
                  <Row>
                    <label>
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Next Billing Date
                    </label>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </Row>
                )}
                
                <FeatureList>
                  <li>Real-time whale transaction alerts</li>
                  <li>Advanced analytics & filters</li>
                  <li>AI-powered market insights (Orca 2.0)</li>
                  <li>Unlimited access to all features</li>
                </FeatureList>
                
                <Actions>
                  <Primary onClick={openBillingPortal} disabled={portalLoading}>
                    {portalLoading ? 'Opening Portal...' : 'Manage Billing & Subscription'}
                  </Primary>
                </Actions>
                
                <InfoBox>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p>Manage your payment method, view invoices, or cancel anytime. Your billing information is secured by Stripe, the industry standard for payment processing.</p>
                </InfoBox>
              </>
            ) : (
              <>
                <Muted style={{ textAlign: 'center', padding: '2rem 0' }}>
                  You're currently on the <strong>Free Plan</strong>. Upgrade to unlock premium features and professional-grade analytics.
                </Muted>
                
                <FeatureList>
                  <li>Real-time whale tracking</li>
                  <li>Advanced statistics & filters</li>
                  <li>Orca 2.0 AI advisor</li>
                  <li>Priority support</li>
                </FeatureList>
                
                <Actions>
                  <Primary onClick={() => window.location.href = '/subscribe'}>
                    Upgrade to Sonar Pro
                  </Primary>
                </Actions>
              </>
            )}
          </Card>

          <Card className="full-width">
            <SectionHeader>
              <div className="icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="header-content">
                <h2>Security Settings</h2>
                <p>Update your password and security preferences</p>
              </div>
            </SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Row>
                <label>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  New Password
                </label>
                <input 
                  type="password" 
                  value={newPw} 
                  onChange={(e)=>setNewPw(e.target.value)} 
                  placeholder="Minimum 8 characters" 
                />
              </Row>
              <Row>
                <label>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Confirm Password
                </label>
                <input 
                  type="password" 
                  value={confirmPw} 
                  onChange={(e)=>setConfirmPw(e.target.value)} 
                  placeholder="Retype your password" 
                />
              </Row>
            </div>
            
            {error && (
              <div style={{ 
                background: 'rgba(231, 76, 60, 0.1)', 
                border: '1px solid rgba(231, 76, 60, 0.3)', 
                borderRadius: '12px', 
                padding: '0.85rem 1rem', 
                color: '#e74c3c',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
            
            {message && (
              <div style={{ 
                background: 'rgba(46, 204, 113, 0.1)', 
                border: '1px solid rgba(46, 204, 113, 0.3)', 
                borderRadius: '12px', 
                padding: '0.85rem 1rem', 
                color: '#2ecc71',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {message}
              </div>
            )}
            
            <InfoBox>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p>Your password is encrypted using industry-standard AES-256 encryption. We recommend using a strong, unique password with a mix of letters, numbers, and symbols.</p>
            </InfoBox>
            
            <Actions>
              <Primary onClick={save} disabled={loading}>
                {loading ? 'Updating Password...' : 'Update Password'}
              </Primary>
            </Actions>
          </Card>
        </Grid>
      </Wrapper>
    </PageWrapper>
  )
} 