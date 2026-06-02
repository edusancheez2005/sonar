'use client'
/**
 * AlertsTab — Proactive Alerts stage.
 * =============================================================================
 * Lets the user manage ORCA alert rules without leaving the dashboard:
 *   - a type picker (price move, whale flow, signal change, news, wallet, social)
 *   - an adaptive add-rule form (ticker OR wallet address + threshold)
 *   - a card list of active rules with per-kind colour coding + toggle
 *   - delivery + cadence controls
 *
 * Talks to /api/personal/alerts and /api/notifications/preferences using the
 * same Supabase access-token pattern as the other tabs. Props mirror
 * WatchlistTab so tests can inject a fake client / fetch.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

/**
 * Per-kind presentation metadata. `target` decides which input the form shows:
 *   'ticker'  — a token symbol (SOL, BTC…)
 *   'address' — an on-chain wallet address
 */
const KIND_META = {
  price_move: {
    label: 'Price move',
    color: '#00e5ff',
    target: 'ticker',
    threshold: 'pct',
    blurb: 'when price swings past your %',
  },
  whale_flow: {
    label: 'Whale flow',
    color: '#2ee6c5',
    target: 'ticker',
    threshold: 'usd',
    blurb: 'when whales move big size',
  },
  signal_flip: {
    label: 'Signal change',
    color: '#ffb547',
    target: 'ticker',
    threshold: 'none',
    blurb: 'when the Sonar signal flips',
  },
  news_high_impact: {
    label: 'Big news',
    color: '#b794f6',
    target: 'ticker',
    threshold: 'none',
    blurb: 'on high-impact headlines',
  },
  wallet_activity: {
    label: 'Wallet activity',
    color: '#5b9dff',
    target: 'address',
    threshold: 'usd_optional',
    blurb: 'when a wallet you watch moves',
  },
  news_any: {
    label: 'Any news',
    color: '#9f7aea',
    target: 'ticker',
    threshold: 'none',
    blurb: 'on any article mention',
  },
  social_post: {
    label: 'Tweets',
    color: '#ff6ec7',
    target: 'ticker',
    threshold: 'none',
    blurb: 'on any social mention',
  },
}
const KINDS = Object.keys(KIND_META)

/** Compact inline glyph per kind — keeps the list visually scannable. */
function KindIcon({ kind, color }) {
  const c = color || '#9fb2c4'
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: c,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  switch (kind) {
    case 'price_move':
      return (
        <svg {...common}>
          <polyline points="3 17 9 11 13 15 21 7" />
          <polyline points="15 7 21 7 21 13" />
        </svg>
      )
    case 'whale_flow':
      return (
        <svg {...common}>
          <path d="M3 12c4 0 4-5 8-5s4 9 8 5" />
          <path d="M3 17c4 0 4-3 8-3s4 5 8 3" />
        </svg>
      )
    case 'signal_flip':
      return (
        <svg {...common}>
          <path d="M4 7h11" />
          <path d="M15 4l3 3-3 3" />
          <path d="M20 17H9" />
          <path d="M9 14l-3 3 3 3" />
        </svg>
      )
    case 'news_high_impact':
      return (
        <svg {...common}>
          <path d="M4 5h13v14H6a2 2 0 0 1-2-2z" />
          <path d="M17 8h3v9a2 2 0 0 1-2 2" />
          <path d="M7 9h7M7 13h7" />
        </svg>
      )
    case 'wallet_activity':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18" />
          <circle cx="16.5" cy="14.5" r="1.2" fill={c} stroke="none" />
        </svg>
      )
    case 'news_any':
      return (
        <svg {...common}>
          <path d="M4 5h16v14H4z" />
          <path d="M8 9h8M8 13h6" />
        </svg>
      )
    case 'social_post':
      return (
        <svg {...common}>
          <path d="M21 5c-1 .5-2 .8-3 1a4 4 0 0 0-7 3v1A9 9 0 0 1 4 6s-4 9 5 13a10 10 0 0 1-6 2c9 5 20 0 20-12a4 4 0 0 0 0-.5c1-1 1.5-2 2-3z" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      )
  }
}

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.78); }
`
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: 20px;
`
const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`
const Title = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #eef3f8;
`
const LiveDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2ee6c5;
  box-shadow: 0 0 8px #2ee6c5;
  animation: ${pulse} 1.8s ease-in-out infinite;
`
const Sub = styled.span`
  font-size: 11px;
  color: #7c8aa0;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`
const Panel = styled.div`
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.015));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`
const TypeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`
const TypePill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: ${(p) => (p.$active ? `${p.$color}1f` : 'rgba(255, 255, 255, 0.03)')};
  border: 1px solid ${(p) => (p.$active ? `${p.$color}66` : 'rgba(255, 255, 255, 0.10)')};
  border-radius: 999px;
  color: ${(p) => (p.$active ? p.$color : '#aab8c6')};
  font-size: 12px;
  font-weight: 600;
  padding: 7px 13px;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover {
    border-color: ${(p) => `${p.$color}66`};
    color: ${(p) => p.$color};
  }
`
const Blurb = styled.p`
  margin: 0;
  font-size: 12px;
  color: #8a98a8;
`
const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
`
const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 11px;
  color: #7c8aa0;
  letter-spacing: 0.04em;
`
const Input = styled.input`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  color: #eef3f8;
  font-size: 13px;
  padding: 9px 11px;
  width: ${(p) => (p.$wide ? '320px' : '120px')};
  max-width: 100%;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  &:focus {
    outline: none;
    border-color: rgba(0, 229, 255, 0.5);
    box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.12);
  }
  &::placeholder {
    color: #5a6a7a;
  }
`
const Select = styled.select`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  color: #eef3f8;
  font-size: 13px;
  padding: 9px 11px;
  option {
    background: #0f1722;
    color: #eef3f8;
  }
`
const Btn = styled.button`
  background: linear-gradient(180deg, rgba(0, 229, 255, 0.18), rgba(0, 229, 255, 0.08));
  border: 1px solid rgba(0, 229, 255, 0.35);
  border-radius: 8px;
  color: #8af0ff;
  font-size: 13px;
  font-weight: 700;
  padding: 9px 18px;
  cursor: pointer;
  transition: filter 0.15s ease;
  &:hover:not(:disabled) {
    filter: brightness(1.15);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`
const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 9px;
`
const Card = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-left: 3px solid ${(p) => p.$color};
  border-radius: 10px;
  padding: 12px 14px;
  animation: ${fadeIn} 0.2s ease both;
  opacity: ${(p) => (p.$on ? 1 : 0.55)};
  transition: opacity 0.15s ease, border-color 0.15s ease;
  &:hover {
    border-color: ${(p) => `${p.$color}55`};
  }
`
const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: ${(p) => `${p.$color}1a`};
  flex: none;
`
const CardMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
`
const CardTarget = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #eef3f8;
  font-family: ${(p) => (p.$mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit')};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
const CardMeta = styled.span`
  font-size: 11px;
  color: #8a98a8;
`
const Chip = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${(p) => p.$color};
  background: ${(p) => `${p.$color}14`};
  border: 1px solid ${(p) => `${p.$color}33`};
  border-radius: 999px;
  padding: 3px 9px;
  white-space: nowrap;
`
const Switch = styled.button`
  position: relative;
  width: 38px;
  height: 21px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  flex: none;
  background: ${(p) => (p.$on ? p.$color : 'rgba(255, 255, 255, 0.14)')};
  transition: background 0.18s ease;
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${(p) => (p.$on ? '19px' : '2px')};
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.18s ease;
  }
`
const Remove = styled.button`
  background: none;
  border: none;
  color: #6b7a8c;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 4px;
  flex: none;
  &:hover {
    color: #ff7a7a;
  }
`
const Empty = styled.div`
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 24px 18px;
  text-align: center;
  color: #8a98a8;
  font-size: 13px;
  line-height: 1.8;
`
const Channels = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: center;
  font-size: 13px;
  color: #c3ccd6;
`
const Check = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
`
const Note = styled.p`
  margin: 0;
  font-size: 11px;
  color: #6b7a8c;
  line-height: 1.5;
`
const MutedRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 8px;
`
const MutedChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #c3ccd6;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
`
const UnmuteBtn = styled.button`
  border: none;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  color: #07101a;
  background: #2ee6c5;
  transition: opacity 0.15s ease;
  &:hover { opacity: 0.85; }
`

function shortAddr(a) {
  const s = String(a || '')
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s
}

function formatMuteUntil(iso) {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function AlertsTab({ client, fetchImpl }) {
  const [rules, setRules] = useState([])
  const [status, setStatus] = useState('loading')
  const [prefs, setPrefs] = useState({ notifications_in_app: true, notification_style: 'balanced' })
  const [form, setForm] = useState({ kind: 'price_move', ticker: '', address: '', chain: '', threshold: '5' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [muted, setMuted] = useState({ tickers: [], until_iso: null })

  const meta = KIND_META[form.kind]

  const token = useCallback(async () => {
    const sb = client ?? supabaseBrowser()
    const { data } = await sb.auth.getSession()
    return data?.session?.access_token || null
  }, [client])

  const load = useCallback(async () => {
    const doFetch = fetchImpl ?? fetch
    const t = await token()
    if (!t) {
      setStatus('unauth')
      return
    }
    const headers = { authorization: `Bearer ${t}` }
    try {
      const [aRes, pRes, mRes] = await Promise.all([
        doFetch('/api/personal/alerts', { headers }),
        doFetch('/api/notifications/preferences', { headers }),
        doFetch('/api/personal/mute', { headers }),
      ])
      if (aRes.ok) {
        const body = await aRes.json()
        setRules(Array.isArray(body?.rules) ? body.rules : [])
      }
      if (pRes.ok) setPrefs(await pRes.json())
      if (mRes.ok) {
        const mBody = await mRes.json()
        setMuted({
          tickers: Array.isArray(mBody?.tickers) ? mBody.tickers : [],
          until_iso: mBody?.until_iso || null,
        })
      }
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [fetchImpl, token])

  useEffect(() => {
    load()
  }, [load])

  // Refresh muted tickers when ORCA mutes/unmutes via a voice-write.
  useEffect(() => {
    function onMuteChanged() { load() }
    if (typeof window !== 'undefined') {
      window.addEventListener('orca:mute-changed', onMuteChanged)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('orca:mute-changed', onMuteChanged)
      }
    }
  }, [load])

  const unmute = useCallback(async (ticker) => {
    const doFetch = fetchImpl ?? fetch
    const t = await token()
    if (!t) return
    try {
      const res = await doFetch(`/api/personal/mute?ticker=${encodeURIComponent(ticker)}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${t}` },
      })
      if (res.ok) {
        setMuted((m) => {
          const next = m.tickers.filter((x) => x !== ticker)
          return { tickers: next, until_iso: next.length ? m.until_iso : null }
        })
      }
    } catch {
      /* best-effort */
    }
  }, [fetchImpl, token])

  const pickKind = (kind) => {
    const m = KIND_META[kind]
    setError(null)
    setForm((f) => ({
      ...f,
      kind,
      threshold: m.threshold === 'pct' ? '5' : m.threshold === 'usd' ? '1000000' : '',
    }))
  }

  const addRule = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const doFetch = fetchImpl ?? fetch
    const t = await token()

    const payload = { kind: form.kind }
    if (meta.target === 'address') {
      const address = form.address.trim()
      if (!address) {
        setBusy(false)
        setError('Enter a wallet address.')
        return
      }
      payload.address = address
      if (form.chain.trim()) payload.chain = form.chain.trim()
      if (meta.threshold === 'usd_optional' && Number(form.threshold) > 0) {
        payload.threshold_usd = Number(form.threshold)
      }
    } else {
      const ticker = form.ticker.trim().toUpperCase()
      if (!ticker) {
        setBusy(false)
        setError('Enter a ticker.')
        return
      }
      payload.ticker = ticker
      if (meta.threshold === 'pct') payload.threshold_pct = Number(form.threshold) || 5
      if (meta.threshold === 'usd') payload.threshold_usd = Number(form.threshold) || 1000000
    }

    try {
      const res = await doFetch('/api/personal/alerts', {
        method: 'POST',
        headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setForm((f) => ({ ...f, ticker: '', address: '', chain: '' }))
        await load()
      } else {
        const body = await res.json().catch(() => ({}))
        const map = {
          rule_limit_reached: 'You have reached the 50-alert limit.',
          invalid_address: 'That wallet address does not look valid.',
          invalid_ticker: 'That ticker does not look valid.',
        }
        setError(map[body?.error] || 'Could not add alert.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setBusy(false)
    }
  }

  const toggleRule = async (rule) => {
    const doFetch = fetchImpl ?? fetch
    const t = await token()
    setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)))
    try {
      await doFetch(`/api/personal/alerts/${rule.id}`, {
        method: 'PATCH',
        headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      })
      await load()
    } catch {}
  }

  const removeRule = async (rule) => {
    const doFetch = fetchImpl ?? fetch
    const t = await token()
    try {
      await doFetch(`/api/personal/alerts/${rule.id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${t}` },
      })
      await load()
    } catch {}
  }

  const updatePref = async (patch) => {
    setPrefs((p) => ({ ...p, ...patch }))
    const doFetch = fetchImpl ?? fetch
    const t = await token()
    try {
      await doFetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch {}
  }

  const thresholdChip = (r) => {
    if (r.kind === 'price_move') return `±${r.threshold_pct}%`
    if (r.kind === 'whale_flow' || (r.kind === 'wallet_activity' && r.threshold_usd)) {
      const v = Number(r.threshold_usd) || 0
      const usd =
        v >= 1000000 ? `$${(v / 1000000).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(v / 1000)}K`
      return r.kind === 'wallet_activity' ? `min ${usd}` : usd
    }
    if (r.kind === 'wallet_activity') return 'any move'
    return 'live'
  }

  const activeCount = useMemo(() => rules.filter((r) => r.enabled).length, [rules])

  return (
    <Wrap>
      <Head>
        <LiveDot />
        <Title>Alerts</Title>
        <Sub>{activeCount} active · ORCA pings you when something changes</Sub>
      </Head>

      <Panel as="form" onSubmit={addRule}>
        <TypeRow>
          {KINDS.map((k) => (
            <TypePill
              key={k}
              type="button"
              $active={form.kind === k}
              $color={KIND_META[k].color}
              onClick={() => pickKind(k)}
            >
              <KindIcon kind={k} color={form.kind === k ? KIND_META[k].color : '#9fb2c4'} />
              {KIND_META[k].label}
            </TypePill>
          ))}
        </TypeRow>

        <Blurb>
          {meta.label} — {meta.blurb}.
        </Blurb>

        <Row>
          {meta.target === 'address' ? (
            <>
              <Field>
                Wallet address
                <Input
                  $wide
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="0x… or Solana address"
                  aria-label="Wallet address"
                />
              </Field>
              <Field>
                Chain (optional)
                <Select
                  value={form.chain}
                  onChange={(e) => setForm((f) => ({ ...f, chain: e.target.value }))}
                  aria-label="Chain"
                >
                  <option value="">Any chain</option>
                  <option value="ethereum">Ethereum</option>
                  <option value="solana">Solana</option>
                  <option value="base">Base</option>
                  <option value="arbitrum">Arbitrum</option>
                  <option value="bsc">BNB Chain</option>
                </Select>
              </Field>
              <Field>
                Min size (optional)
                <Input
                  type="number"
                  value={form.threshold}
                  onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                  placeholder="0"
                  aria-label="Minimum USD"
                />
              </Field>
            </>
          ) : (
            <>
              <Field>
                Ticker
                <Input
                  value={form.ticker}
                  onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value }))}
                  placeholder="SOL"
                  maxLength={12}
                  aria-label="Ticker"
                />
              </Field>
              {(meta.threshold === 'pct' || meta.threshold === 'usd') && (
                <Field>
                  {meta.threshold === 'pct' ? 'Move %' : 'Net USD'}
                  <Input
                    type="number"
                    value={form.threshold}
                    onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                    aria-label="Threshold"
                  />
                </Field>
              )}
            </>
          )}
          <Btn type="submit" disabled={busy}>
            {busy ? 'Adding…' : 'Add alert'}
          </Btn>
        </Row>
        {error && <Note style={{ color: '#ff7a7a' }}>{error}</Note>}
      </Panel>

      {status === 'ready' && rules.length > 0 && (
        <List>
          {rules.map((r) => {
            const m = KIND_META[r.kind] || { label: r.kind, color: '#9fb2c4' }
            const isAddr = r.kind === 'wallet_activity'
            return (
              <Card key={r.id} $color={m.color} $on={!!r.enabled}>
                <Badge $color={m.color}>
                  <KindIcon kind={r.kind} color={m.color} />
                </Badge>
                <CardMain>
                  <CardTarget $mono={isAddr} title={isAddr ? r.address : r.ticker}>
                    {isAddr ? shortAddr(r.address) : r.ticker}
                  </CardTarget>
                  <CardMeta>
                    {m.label}
                    {isAddr && r.chain ? ` · ${r.chain}` : ''}
                  </CardMeta>
                </CardMain>
                <Chip $color={m.color}>{thresholdChip(r)}</Chip>
                <Switch
                  type="button"
                  $on={!!r.enabled}
                  $color={m.color}
                  onClick={() => toggleRule(r)}
                  aria-label={`Toggle ${isAddr ? shortAddr(r.address) : r.ticker} ${r.kind}`}
                  aria-pressed={!!r.enabled}
                />
                <Remove
                  type="button"
                  onClick={() => removeRule(r)}
                  aria-label="Remove alert"
                  title="Remove"
                >
                  ×
                </Remove>
              </Card>
            )
          })}
        </List>
      )}
      {status === 'ready' && rules.length === 0 && (
        <Empty>
          No alerts yet. Pick a type above — or just tell ORCA:
          <br />
          <em>“alert me when SOL moves 5%”</em> · <em>“watch wallet 0xabc… for movement”</em> ·{' '}
          <em>“ping me on any BONK news”</em>
        </Empty>
      )}

      {status === 'ready' && muted.tickers.length > 0 && (
        <Panel>
          <Sub>
            Muted tickers
            {muted.until_iso ? ` · until ${formatMuteUntil(muted.until_iso)}` : ''}
          </Sub>
          <MutedRow>
            {muted.tickers.map((tk) => (
              <MutedChip key={tk}>
                {tk}
                <UnmuteBtn
                  type="button"
                  onClick={() => unmute(tk)}
                  aria-label={`Unmute ${tk} alerts`}
                  title={`Unmute ${tk}`}
                >
                  Unmute
                </UnmuteBtn>
              </MutedChip>
            ))}
          </MutedRow>
          <Note>
            Muted tickers won’t trigger ORCA alerts until the mute expires. You can unmute any time
            here or by telling ORCA “unmute {muted.tickers[0]}”.
          </Note>
        </Panel>
      )}

      <Panel>
        <Sub>Delivery</Sub>
        <Channels>
          <Check>
            <input
              type="checkbox"
              checked={!!prefs.notifications_in_app}
              onChange={(e) => updatePref({ notifications_in_app: e.target.checked })}
            />
            In-app inbox
          </Check>
          <Check>
            Cadence
            <Select
              value={prefs.notification_style || 'balanced'}
              onChange={(e) => updatePref({ notification_style: e.target.value })}
              aria-label="Cadence"
            >
              <option value="quiet">Quiet</option>
              <option value="balanced">Balanced</option>
              <option value="frequent">Frequent</option>
            </Select>
          </Check>
        </Channels>
        <Note>
          Alerts are informational only and never financial advice. They are delivered to your in-app
          inbox.
        </Note>
      </Panel>
    </Wrap>
  )
}
