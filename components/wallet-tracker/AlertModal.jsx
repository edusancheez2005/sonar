'use client'
import React, { useState } from 'react'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

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
  border: 1px solid var(--secondary);
  border-radius: 12px;
  padding: 1.5rem;
  width: 90%;
  max-width: 420px;
`

const Title = styled.h3`
  font-size: 1.1rem;
  color: var(--text-primary);
  margin-bottom: 1rem;
`

const Label = styled.label`
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.3rem;
  margin-top: 0.75rem;
`

const Select = styled.select`
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--background-dark);
  border: 1px solid var(--secondary);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
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

const Note = styled.p`
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--text-secondary);
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
  background: var(--primary);
  color: #0a1621;
  border: none;

  &:hover {
    opacity: 0.9;
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

// Wallet alerts are user_alerts rows of kind wallet_activity, the same model
// as the Personal page and ORCA. Telegram delivery for personal alerts does
// not exist yet, so the modal says so and collects nothing.
export default function AlertModal({ address, chain, onClose }) {
  const [alertType, setAlertType] = useState('large_transaction')
  const [minUsd, setMinUsd] = useState('100000')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const { data } = await supabaseBrowser().auth.getSession()
      const token = data?.session?.access_token
      if (!token) {
        setError('Sign in to set an alert.')
        return
      }
      const floor = Number(minUsd)
      const res = await fetch('/api/personal/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kind: 'wallet_activity',
          address,
          ...(chain ? { chain } : {}),
          ...(alertType === 'large_transaction' && floor > 0 ? { threshold_usd: floor } : {}),
          source: 'wallet_page',
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error === 'rule_limit_reached' ? 'You have reached the 50-alert limit.' : 'Could not create this alert. Try again.')
        return
      }
      try { window.dispatchEvent(new CustomEvent('orca:alerts-changed')) } catch { /* ignore */ }
      onClose()
    } catch {
      setError('Could not create this alert. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={e => e.stopPropagation()}>
        <Title>Set Alert</Title>

        <Label>Alert Type</Label>
        <Select value={alertType} onChange={e => setAlertType(e.target.value)}>
          <option value="large_transaction">Large transaction</option>
          <option value="any_activity">Any activity</option>
        </Select>

        {alertType === 'large_transaction' && (
          <>
            <Label>Minimum USD Value</Label>
            <Input
              type="number"
              placeholder="e.g. 100000"
              value={minUsd}
              onChange={e => setMinUsd(e.target.value)}
            />
          </>
        )}

        <Note>
          Alerts arrive in the bell, and by email if you turned it on in alert settings. Telegram delivery
          for personal alerts is coming soon. Wallet moves are checked every 5 minutes against wallet data we
          refresh hourly.
        </Note>
        {error && <Note role="alert" style={{ color: 'var(--error, #ff6b6b)' }}>{error}</Note>}

        <BtnRow>
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          <PrimaryBtn onClick={handleSave} disabled={saving}>
            {saving ? 'Creating...' : 'Create Alert'}
          </PrimaryBtn>
        </BtnRow>
      </Modal>
    </Overlay>
  )
}
