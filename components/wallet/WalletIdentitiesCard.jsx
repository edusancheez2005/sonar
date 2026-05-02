'use client'
import React, { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const Card = styled.div`
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(0,229,255,0.18);
  border-radius: 12px;
  padding: 18px;
  color: #e6edf7;
`
const H = styled.h2`
  margin: 0 0 4px;
  color: #00e5ff; font-family: 'JetBrains Mono', monospace;
  font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase;
  &::before { content: '> '; color: #00e676; }
`
const Sub = styled.p` margin: 0 0 14px; color: #94a3b8; font-size: 12px; `
const Row = styled.div`
  display: flex; align-items: center; gap: 10px; padding: 10px 0;
  border-top: 1px solid rgba(255,255,255,0.06);
  &:first-of-type { border-top: 0; }
`
const Addr = styled.code`
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
  color: #cbd5e1; background: rgba(255,255,255,0.04);
  padding: 4px 8px; border-radius: 6px;
`
const Tag = styled.span`
  font-size: 10.5px; padding: 2px 6px; border-radius: 999px;
  background: rgba(0,229,255,0.1); color: #00e5ff;
  font-family: 'JetBrains Mono', monospace;
`
const Btn = styled.button`
  background: transparent; border: 1px solid rgba(255,255,255,0.12);
  color: #cbd5e1; padding: 5px 10px; border-radius: 6px; cursor: pointer;
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  &:hover { color: #fff; border-color: rgba(255,255,255,0.25); }
`
const Danger = styled(Btn)`
  color: #ff7a90;
  &:hover { color: #ff1744; border-color: rgba(255,23,68,0.4); }
`
const Empty = styled.div`
  color: #94a3b8; font-size: 12.5px; padding: 16px 0; text-align: center;
`

function truncate(a) {
  if (!a) return ''
  if (a.length <= 14) return a
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export default function WalletIdentitiesCard() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  const headers = useCallback(async () => {
    const sb = supabaseBrowser()
    const { data } = await sb.auth.getSession()
    const t = data?.session?.access_token
    return t ? { Authorization: `Bearer ${t}` } : null
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const h = await headers()
      if (!h) { setErr('Not signed in'); return }
      const res = await fetch('/api/wallet/identities', { headers: h })
      if (!res.ok) { setErr('Failed to load'); return }
      const j = await res.json()
      setItems(j?.data || [])
    } finally { setLoading(false) }
  }, [headers])

  useEffect(() => { load() }, [load])

  async function setPrimary(id) {
    const h = await headers(); if (!h) return
    await fetch('/api/wallet/identities', {
      method: 'PATCH',
      headers: { ...h, 'content-type': 'application/json' },
      body: JSON.stringify({ id, is_primary: true }),
    })
    load()
  }

  async function rename(id, current) {
    const label = prompt('Wallet label', current || '')
    if (label == null) return
    const h = await headers(); if (!h) return
    await fetch('/api/wallet/identities', {
      method: 'PATCH',
      headers: { ...h, 'content-type': 'application/json' },
      body: JSON.stringify({ id, label }),
    })
    load()
  }

  async function remove(id) {
    if (!confirm('Disconnect this wallet?')) return
    const h = await headers(); if (!h) return
    await fetch(`/api/wallet/identities?id=${id}`, { method: 'DELETE', headers: h })
    load()
  }

  return (
    <Card>
      <H>Connected wallets</H>
      <Sub>Wallets linked to your Sonar account. Read-only — Sonar cannot move your funds.</Sub>
      {loading && <Empty>Loading…</Empty>}
      {err && <Empty>{err}</Empty>}
      {!loading && !err && items.length === 0 && (
        <Empty>No wallets linked yet. Connect one from the dashboard to enable cross-device personalization.</Empty>
      )}
      {items.map((w) => (
        <Row key={w.id}>
          <Addr title={w.address}>{truncate(w.address)}</Addr>
          <span style={{ color: '#94a3b8', fontSize: 11 }}>{w.chain}</span>
          {w.is_primary && <Tag>PRIMARY</Tag>}
          {w.verified_at && <Tag style={{ background: 'rgba(0,230,118,0.1)', color: '#00e676' }}>SIGNED</Tag>}
          <span style={{ color: '#cbd5e1', fontSize: 12, flex: 1 }}>{w.label || ''}</span>
          {!w.is_primary && <Btn onClick={() => setPrimary(w.id)}>Make primary</Btn>}
          <Btn onClick={() => rename(w.id, w.label)}>Rename</Btn>
          <Danger onClick={() => remove(w.id)}>Disconnect</Danger>
        </Row>
      ))}
    </Card>
  )
}
