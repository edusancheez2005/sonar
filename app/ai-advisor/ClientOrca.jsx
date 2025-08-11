'use client'
import React, { useState } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'

const Wrapper = styled.div`
  position: relative; overflow: hidden; border-radius: 12px;
  background: radial-gradient(1200px 600px at 10% -10%, rgba(155,89,182,0.25), transparent 60%),
              radial-gradient(1000px 500px at 110% 20%, rgba(241,196,15,0.15), transparent 60%),
              linear-gradient(180deg, #0d2134 0%, #0a1621 100%);
`;

const Hero = styled.div`
  padding: 3rem 1.5rem; text-align: center;
`;

const Title = styled(motion.h1)`
  font-size: 3rem; margin: 0; letter-spacing: 0.5px;
  background: linear-gradient(90deg, #9b59b6 0%, #f1c40f 50%, #36a6ba 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
`;

const Sub = styled(motion.p)`
  color: var(--text-secondary); margin-top: 0.75rem; font-size: 1.05rem;
`;

const Grid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-top: 2rem;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const Card = styled(motion.div)`
  background: rgba(13,33,52,0.8); border: 1px solid rgba(155,89,182,0.25);
  border-radius: 12px; padding: 1.25rem; text-align: left;
`;

const OrcaBadge = styled(motion.div)`
  display: inline-flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0.85rem;
  border-radius: 999px; font-weight: 600; letter-spacing: 0.4px;
  color: #f1c40f; background: rgba(241,196,15,0.15); border: 1px solid rgba(241,196,15,0.35);
`;

const Waitlist = styled(motion.form)`
  display: flex; gap: 0.5rem; justify-content: center; margin-top: 1.25rem; flex-wrap: wrap;
  input { background: linear-gradient(180deg, rgba(13,33,52,1), rgba(10,22,33,1));
          color: var(--text-primary); border: 1px solid var(--secondary);
          padding: 0.7rem 0.9rem; border-radius: 999px; min-width: 260px; outline: none; }
  input:focus { border-color: #9b59b6; box-shadow: 0 0 0 3px rgba(155,89,182,0.2); }
  button { background: linear-gradient(90deg, #9b59b6, #f1c40f);
           color: #0a1621; border: none; padding: 0.7rem 1.1rem; border-radius: 999px; font-weight: 600; }
  button:hover { filter: brightness(1.05); transform: translateY(-1px); }
`;

const Waves = styled(motion.div)`
  position: absolute; left: -20%; right: -20%; bottom: -30%; height: 60%; opacity: 0.35;
  background: radial-gradient(60% 60% at 50% 50%, rgba(155,89,182,0.18), transparent),
              radial-gradient(45% 45% at 55% 60%, rgba(54,166,186,0.12), transparent);
  filter: blur(40px);
`;

export default function ClientOrca() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function join(e) {
    e.preventDefault()
    setLoading(true); setMessage('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setMessage('You are on the waitlist. We will notify you!')
      setEmail('')
    } catch (err) {
      setMessage(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Wrapper>
      <Waves animate={{ y: [0, -10, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
      <Hero>
        <OrcaBadge initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          <span role="img" aria-label="orca">🐋</span> Orca 2.0 — AI Crypto Advisor
        </OrcaBadge>
        <Title initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
          Navigate Markets with SONAR Precision
        </Title>
        <Sub initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
          Why Orca? They’re apex strategists of the ocean — coordinated, data-driven, and decisive. Orca 2.0 learns from
          whale flows to surface high-confidence, risk-aware ideas — directly in your workflow.
        </Sub>
        <Grid>
          <Card whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 200 }}>
            <h3 style={{ marginBottom: 8 }}>Smart Flow Tracking</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Real-time analysis of large buyers and sellers across chains, with context and confidence scoring.</p>
          </Card>
          <Card whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 200 }}>
            <h3 style={{ marginBottom: 8 }}>Risk-Managed Entries</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Timing and sizing guidance informed by liquidity, volatility, and cohort behavior.</p>
          </Card>
          <Card whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 200 }}>
            <h3 style={{ marginBottom: 8 }}>Follow the Pods</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Cluster whales by strategy and follow the ones that match your profile. No noise, just signal.</p>
          </Card>
          <Card whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 200 }}>
            <h3 style={{ marginBottom: 8 }}>Your Rules, Your Alerts</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Set thresholds and watchlists. Get notified the second a high-conviction move fires.</p>
          </Card>
        </Grid>
        <Waitlist onSubmit={join} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <input type="email" placeholder="Join the Orca 2.0 waitlist — your@email.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? 'Joining…' : 'Join Waitlist'}</button>
        </Waitlist>
        {message && <p style={{ marginTop: 10, color: 'var(--text-secondary)' }}>{message}</p>}
      </Hero>
    </Wrapper>
  )
} 