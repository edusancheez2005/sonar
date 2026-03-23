'use client'
import React, { useState } from 'react'
import styled from 'styled-components'

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

const Toggle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.3rem;
`

const ToggleSwitch = styled.button`
  width: 40px;
  height: 22px;
  border-radius: 11px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  background: ${({ $on }) => $on ? 'var(--primary)' : 'var(--secondary)'};

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $on }) => $on ? '20px' : '2px'};
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.2s;
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

export default function AlertModal({ address, chain, onClose }) {
  const [alertType, setAlertType] = useState('large_transaction')
  const [minUsd, setMinUsd] = useState('')
  const [notifyTelegram, setNotifyTelegram] = useState(false)
  const [telegramChatId, setTelegramChatId] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          chain: chain || null,
          alert_type: alertType,
          min_usd_value: minUsd ? Number(minUsd) : null,
          notify_telegram: notifyTelegram,
          telegram_chat_id: telegramChatId || null,
        }),
      })
      onClose()
    } catch {
      // ignore
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
          <option value="large_transaction">Large Transaction</option>
          <option value="any_activity">Any Activity</option>
          <option value="token_transfer">Token Transfer</option>
          <option value="new_token">New Token Interaction</option>
        </Select>

        <Label>Minimum USD Value</Label>
        <Input
          type="number"
          placeholder="e.g. 100000"
          value={minUsd}
          onChange={e => setMinUsd(e.target.value)}
        />

        <Label>Telegram Notifications</Label>
        <Toggle>
          <ToggleSwitch $on={notifyTelegram} onClick={() => setNotifyTelegram(!notifyTelegram)} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {notifyTelegram ? 'Enabled' : 'Disabled'}
          </span>
        </Toggle>

        {notifyTelegram && (
          <>
            <Label>Telegram Chat ID</Label>
            <Input
              placeholder="Your Telegram chat ID"
              value={telegramChatId}
              onChange={e => setTelegramChatId(e.target.value)}
            />
          </>
        )}

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
