'use client'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const Wrapper = styled.div`
  max-width: 640px;
  margin-top: 16px;
  display: grid;
  gap: 1rem;
`

const Card = styled.section`
  background: var(--background-card);
  border: 1px solid var(--secondary);
  border-radius: 12px;
  padding: 1.25rem;
  display: grid;
  gap: 1rem;
`

const SectionHeader = styled.div`
  display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem;
  h2 { margin: 0; font-size: 1.15rem; color: var(--text-primary); }
  p { margin: 0; color: var(--text-secondary); font-size: 0.95rem; }
`

const Row = styled.div`
  display: grid; grid-template-columns: 160px 1fr; align-items: center; gap: 0.75rem;
  label { color: var(--text-secondary); font-size: 0.95rem; }
  input { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid var(--secondary); color: var(--text-primary);
    border-radius: 10px; padding: 0.7rem 0.85rem; font-size: 1rem; }
`

const Actions = styled.div`
  display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;
`

const Primary = styled.button`
  padding: 0.7rem 1.1rem; border-radius: 999px; border: 1px solid transparent; background: linear-gradient(90deg, var(--primary), #36a6ba); color: #0a1621; font-weight: 700;
  transition: all 0.25s ease; cursor: pointer;
  &:hover { filter: brightness(1.05); transform: translateY(-1px); box-shadow: 0 8px 18px rgba(54,166,186,0.22); }
  &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
`

const Muted = styled.p`
  margin: 0; color: var(--text-secondary); font-size: 0.95rem;
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

  if (!email) return <Muted>Not signed in.</Muted>

  return (
    <Wrapper>
      <Card>
        <SectionHeader>
          <h2>Account</h2>
          <Muted>Manage your account details.</Muted>
        </SectionHeader>
        <Row>
          <label>Email</label>
          <input type="text" value={email} readOnly />
        </Row>
      </Card>

      <Card>
        <SectionHeader>
          <h2>Subscription</h2>
          <Muted>Manage your billing and subscription.</Muted>
        </SectionHeader>
        {loadingSub ? (
          <Muted>Loading subscription...</Muted>
        ) : subscription?.isActive ? (
          <>
            <Row>
              <label>Status</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: '#2ecc71' 
                }}></span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {subscription.status === 'active' ? 'Active' : 'Trial'}
                </span>
              </div>
            </Row>
            <Row>
              <label>Plan</label>
              <span style={{ color: 'var(--text-primary)' }}>Sonar Pro - £5/month</span>
            </Row>
            {subscription.currentPeriodEnd && (
              <Row>
                <label>Renews on</label>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </Row>
            )}
            <Actions>
              <Primary onClick={openBillingPortal} disabled={portalLoading}>
                {portalLoading ? 'Loading...' : 'Manage Subscription'}
              </Primary>
            </Actions>
            <Muted style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
              You can update your payment method, view invoices, or cancel your subscription.
            </Muted>
          </>
        ) : (
          <>
            <Muted>You don't have an active subscription.</Muted>
            <Actions>
              <Primary onClick={() => window.location.href = '/subscribe'}>
                Upgrade to Pro
              </Primary>
            </Actions>
          </>
        )}
      </Card>

      <Card>
        <SectionHeader>
          <h2>Change Password</h2>
          <Muted>Use 8+ characters.</Muted>
        </SectionHeader>
        <Row>
          <label>New Password</label>
          <input type="password" value={newPw} onChange={(e)=>setNewPw(e.target.value)} placeholder="Enter new password" />
        </Row>
        <Row>
          <label>Retype Password</label>
          <input type="password" value={confirmPw} onChange={(e)=>setConfirmPw(e.target.value)} placeholder="Retype new password" />
        </Row>
        {error && <p style={{ color: 'tomato', margin: 0 }}>{error}</p>}
        {message && <Muted>{message}</Muted>}
        <Actions>
          <Primary onClick={save} disabled={loading}>{loading ? 'Saving…' : 'Save Password'}</Primary>
        </Actions>
      </Card>
    </Wrapper>
  )
} 