'use client'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

/**
 * Personalized token set for the dashboard. Kept distinct from `user_watchlists`.
 * Loads from `/api/portfolio/tokens` (works for both authed users and guest cookie sessions).
 */

const PersonalizedDashboardContext = createContext({
  tokens: [],
  loading: true,
  refresh: async () => {},
  addToken: async () => {},
  removeToken: async () => {},
  mode: 'all',          // 'all' | 'mine'
  setMode: () => {},
  activeFilterToken: null,
  setActiveFilterToken: () => {},
})

export function PersonalizedDashboardProvider({ children }) {
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('all')
  const [activeFilterToken, setActiveFilterToken] = useState(null)

  const authHeader = useCallback(async () => {
    try {
      const sb = supabaseBrowser()
      const { data } = await sb.auth.getSession()
      const t = data?.session?.access_token
      return t ? { Authorization: `Bearer ${t}` } : {}
    } catch { return {} }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await authHeader()
      const res = await fetch('/api/portfolio/tokens', { headers, cache: 'no-store' })
      if (res.ok) {
        const j = await res.json()
        const list = (j?.data || []).map((r) => r.symbol).filter(Boolean)
        setTokens(list)
        if (list.length > 0 && mode === 'all') setMode('mine')
      }
    } finally {
      setLoading(false)
    }
  }, [authHeader, mode])

  useEffect(() => { refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addToken = useCallback(async (symbol) => {
    const headers = { 'content-type': 'application/json', ...(await authHeader()) }
    const res = await fetch('/api/portfolio/tokens', {
      method: 'POST',
      headers,
      body: JSON.stringify({ symbol }),
    })
    if (res.ok) await refresh()
  }, [authHeader, refresh])

  const removeToken = useCallback(async (symbol) => {
    const headers = await authHeader()
    const res = await fetch(`/api/portfolio/tokens?symbol=${encodeURIComponent(symbol)}`, {
      method: 'DELETE',
      headers,
    })
    if (res.ok) await refresh()
  }, [authHeader, refresh])

  const value = useMemo(() => ({
    tokens, loading, refresh, addToken, removeToken,
    mode, setMode, activeFilterToken, setActiveFilterToken,
  }), [tokens, loading, refresh, addToken, removeToken, mode, activeFilterToken])

  return <PersonalizedDashboardContext.Provider value={value}>{children}</PersonalizedDashboardContext.Provider>
}

export function usePersonalizedDashboard() {
  return useContext(PersonalizedDashboardContext)
}
