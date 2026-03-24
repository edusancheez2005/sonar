'use client'
import React, { useState, useEffect, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const pop = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
`

const Btn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: transform 0.15s;

  &:hover {
    transform: scale(1.15);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    width: 18px;
    height: 18px;
    transition: fill 0.2s, stroke 0.2s;
  }

  &[data-followed='true'] svg {
    animation: ${pop} 0.3s ease;
  }
`

async function getAuthHeaders() {
  const sb = supabaseBrowser()
  const { data } = await sb.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export default function FollowButton({ address, onToggle }) {
  const [followed, setFollowed] = useState(false)
  const [loading, setLoading] = useState(false)

  const checkFollowed = useCallback(async () => {
    const headers = await getAuthHeaders()
    if (!headers.Authorization) return
    try {
      const res = await fetch('/api/wallet-tracker/follows', { headers })
      if (!res.ok) return
      const list = await res.json()
      setFollowed(list.some(f => f.address === address))
    } catch {
      // silent
    }
  }, [address])

  useEffect(() => {
    checkFollowed()
  }, [checkFollowed])

  const toggle = async () => {
    const headers = await getAuthHeaders()
    if (!headers.Authorization) return
    setLoading(true)
    try {
      if (followed) {
        await fetch(`/api/wallet-tracker/follows/${encodeURIComponent(address)}`, {
          method: 'DELETE',
          headers,
        })
        setFollowed(false)
        if (onToggle) onToggle()
      } else {
        await fetch('/api/wallet-tracker/follows', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        })
        setFollowed(true)
        if (onToggle) onToggle()
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  return (
    <Btn
      onClick={toggle}
      disabled={loading}
      data-followed={followed}
      title={followed ? 'Unfollow wallet' : 'Follow wallet'}
    >
      {followed ? (
        <svg viewBox="0 0 24 24" fill="#00e5ff" stroke="#00e5ff" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )}
    </Btn>
  )
}
