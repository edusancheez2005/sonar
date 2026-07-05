'use client'
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

async function getAuthHeaders() {
  const sb = supabaseBrowser()
  const { data } = await sb.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Modal = styled.div`
  background: var(--background-card);
  border: 1px solid var(--neon-border);
  border-radius: 12px;
  padding: 1.5rem;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(34, 211, 238, 0.08);
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
`

const Title = styled.h3`
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, #7af8ff 0%, #22d3ee 60%, #36a6ba 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
`

const ComingSoonChip = styled.span`
  font-family: var(--font-mono, monospace);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--neon-border);
  background: rgba(34, 211, 238, 0.08);
  color: var(--neon-bright);
`

const Pitch = styled.p`
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.55;
  margin: 0 0 0.4rem;
`

const Label = styled.label`
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.3rem;
  margin-top: 0.9rem;
`

const Input = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--background-dark);
  border: 1px solid var(--secondary);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;

  &:focus {
    border-color: var(--primary);
  }
`

const BtnRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1.25rem;
  justify-content: flex-end;
`

const Btn = styled.button`
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
`

const PrimaryBtn = styled(Btn)`
  background: linear-gradient(135deg, #7af8ff 0%, #22d3ee 60%, #36a6ba 100%);
  color: #0a1621;
  border: none;
  font-weight: 700;

  &:hover {
    filter: brightness(1.08);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const SecondaryBtn = styled(Btn)`
  background: transparent;
  border: 1px solid var(--secondary);
  color: var(--text-primary);

  &:hover {
    border-color: var(--text-secondary);
  }
`

const SuccessPanel = styled.div`
  text-align: center;
  padding: 1.25rem 0 0.5rem;

  .check {
    font-size: 2rem;
    color: var(--neon-cyan);
    margin-bottom: 0.5rem;
  }

  .headline {
    color: var(--text-primary);
    font-weight: 700;
    font-size: 1.05rem;
    margin-bottom: 0.35rem;
  }

  .sub {
    color: var(--text-secondary);
    font-size: 0.85rem;
  }
`

const ErrorText = styled.p`
  color: #ff6b6b;
  font-size: 0.82rem;
  margin: 0.6rem 0 0;
`

export default function MirrorWalletModal({ address, onClose }) {
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [joined, setJoined] = useState(null) // null | 'new' | 'already'
  const [error, setError] = useState('')

  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth.getSession().then(({ data }) => {
      const sessionEmail = data?.session?.user?.email
      if (sessionEmail) setEmail(sessionEmail)
    })
  }, [])

  const handleJoin = async () => {
    setSaving(true)
    setError('')
    try {
      const auth = await getAuthHeaders()
      const res = await fetch('/api/mirror-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ email, wallet_address: address }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || 'Something went wrong. Please try again.')
        return
      }
      setJoined(json?.already ? 'already' : 'new')
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'mirror_wallet_join', { wallet_address: address })
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={e => e.stopPropagation()}>
        <TitleRow>
          <Title>Mirror Wallet</Title>
          <ComingSoonChip>COMING SOON</ComingSoonChip>
        </TitleRow>

        {joined ? (
          <SuccessPanel>
            <div className="check">✓</div>
            <div className="headline">
              {joined === 'already' ? "You're already on the list" : "You're on the list"}
            </div>
            <div className="sub">We'll email you as soon as Mirror Wallet is ready.</div>
            <BtnRow style={{ justifyContent: 'center' }}>
              <PrimaryBtn onClick={onClose}>Done</PrimaryBtn>
            </BtnRow>
          </SuccessPanel>
        ) : (
          <>
            <Pitch>
              A live, read-only mirror of this wallet — every position, entry and exit
              on your dashboard the moment it happens.
            </Pitch>
            <Pitch>Join the waitlist and be first in when it ships.</Pitch>

            <Label>Email</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />

            {error && <ErrorText>{error}</ErrorText>}

            <BtnRow>
              <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
              <PrimaryBtn onClick={handleJoin} disabled={saving || !email}>
                {saving ? 'Joining...' : 'Join the waitlist'}
              </PrimaryBtn>
            </BtnRow>
          </>
        )}
      </Modal>
    </Overlay>
  )
}
