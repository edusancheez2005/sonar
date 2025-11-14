'use client'

import { useState, useEffect } from 'react'
import styled from 'styled-components'

const FloatingButton = styled.button`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 9999;
  background: linear-gradient(135deg, #36a6ba 0%, #9b59b6 100%);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 0.85rem 1.75rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 40px rgba(54, 166, 186, 0.35);
  }

  @media (max-width: 640px) {
    right: 1.25rem;
    bottom: 1.25rem;
    padding: 0.7rem 1.4rem;
  }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1.5rem;
`

const Popup = styled.form`
  width: min(420px, 100%);
  background: rgba(10, 22, 33, 0.95);
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 20px;
  padding: 1.75rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const PopupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;

  h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.4rem;
    font-weight: 700;
  }

  button {
    border: none;
    background: none;
    color: var(--text-secondary);
    font-size: 1.5rem;
    cursor: pointer;
    line-height: 1;

    &:hover {
      color: var(--text-primary);
    }
  }
`

const Input = styled.input`
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(54, 166, 186, 0.3);
  background: rgba(10, 22, 33, 0.7);
  padding: 0.85rem 1rem;
  color: var(--text-primary);
  font-size: 0.95rem;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(54, 166, 186, 0.2);
  }
`

const Textarea = styled.textarea`
  width: 100%;
  min-height: 140px;
  border-radius: 12px;
  border: 1px solid rgba(54, 166, 186, 0.3);
  background: rgba(10, 22, 33, 0.7);
  padding: 0.9rem 1rem;
  color: var(--text-primary);
  font-size: 0.95rem;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(54, 166, 186, 0.2);
  }
`

const SubmitButton = styled.button`
  border: none;
  border-radius: 12px;
  padding: 0.9rem 1rem;
  background: linear-gradient(135deg, #2ecc71 0%, #36a6ba 100%);
  color: white;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }
`

const StatusMessage = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${props => (props.$error ? '#e74c3c' : '#2ecc71')};
`

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(false)
  const [defaultEmail, setDefaultEmail] = useState('')
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem('sonar_feedback_email') || ''
    if (stored) {
      setDefaultEmail(stored)
      setForm((prev) => ({ ...prev, email: stored }))
    }
  }, [])

  const close = () => {
    setOpen(false)
    setStatus(null)
    setError(false)
    setForm({ name: '', email: defaultEmail, message: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.name.trim() || !form.message.trim() || !form.email.trim()) {
      setStatus('Please share your name, email, and feedback.')
      setError(true)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email.trim())) {
      setStatus('Enter a valid email address.')
      setError(true)
      return
    }

    setLoading(true)
    setStatus(null)
    setError(false)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (!res.ok) {
        throw new Error('Failed to submit')
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('sonar_feedback_email', form.email.trim())
      }
      setDefaultEmail(form.email.trim())
      setStatus('Thanks for the feedback! We read every response.')
      setError(false)
      setTimeout(close, 1800)
    } catch (err) {
      console.error('Feedback error:', err)
      setStatus('Could not send feedback. Please try again later.')
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <FloatingButton type="button" onClick={() => setOpen(true)}>
        <span role="img" aria-label="chat bubble">💬</span> Feedback
      </FloatingButton>

      {open && (
        <Overlay>
          <Popup onSubmit={handleSubmit}>
            <PopupHeader>
              <h3>Share Feedback</h3>
              <button type="button" onClick={close} aria-label="Close feedback form">×</button>
            </PopupHeader>

            <Input
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              placeholder="Email *"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Textarea
              placeholder="Share any thoughts about the platform..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
            />

            {status && <StatusMessage $error={error}>{status}</StatusMessage>}

            <SubmitButton type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Feedback'}
            </SubmitButton>
          </Popup>
        </Overlay>
      )}
    </>
  )
}

