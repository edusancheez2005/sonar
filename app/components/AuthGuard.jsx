'use client'
import React, { useEffect, useState } from 'react'

export default function AuthGuard({ children }) {
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    try {
      const ok = typeof window !== 'undefined' && localStorage.getItem('isAuthenticated') === 'true'
      if (!ok) {
        window.location.href = '/'
      } else {
        setAllowed(true)
      }
    } catch {
      window.location.href = '/'
    }
  }, [])

  if (!allowed) return null
  return <>{children}</>
} 