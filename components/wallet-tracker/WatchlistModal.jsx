'use client'
import React, { useState, useEffect } from 'react'
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

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--background-dark);
  border: 1px solid var(--secondary);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  resize: vertical;
  min-height: 60px;

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

export default function WatchlistModal({ address, chain, onClose }) {
  const [watchlists, setWatchlists] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/watchlist')
      .then(r => r.json())
      .then(json => {
        setWatchlists(json.data || [])
        if (json.data?.length > 0) setSelectedId(json.data[0].id)
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      await fetch(`/api/watchlist/${selectedId}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          chain: chain || null,
          custom_label: customLabel || null,
          notes: notes || null,
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
        <Title>Add to Watchlist</Title>

        <Label>Watchlist</Label>
        <Select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          {watchlists.length === 0 && <option value="">No watchlists — create one first</option>}
          {watchlists.map(wl => (
            <option key={wl.id} value={wl.id}>{wl.name}</option>
          ))}
        </Select>

        <Label>Custom Label</Label>
        <Input
          placeholder="e.g. Binance Hot Wallet"
          value={customLabel}
          onChange={e => setCustomLabel(e.target.value)}
        />

        <Label>Notes</Label>
        <Textarea
          placeholder="Optional notes..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <BtnRow>
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          <PrimaryBtn onClick={handleSave} disabled={!selectedId || saving}>
            {saving ? 'Adding...' : 'Add'}
          </PrimaryBtn>
        </BtnRow>
      </Modal>
    </Overlay>
  )
}
