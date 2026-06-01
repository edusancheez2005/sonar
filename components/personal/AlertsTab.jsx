'use client'
/**
 * AlertsTab — Proactive Alerts stage.
 * =============================================================================
 * Lets the user manage ORCA alert rules without leaving the dashboard:
 *   - table of active rules (ticker | kind | threshold | on/off | remove)
 *   - add-rule form (ticker, kind, threshold)
 *   - delivery channels (in-app, email) + cadence
 *
 * Talks to /api/personal/alerts and /api/notifications/preferences using the
 * same Supabase access-token pattern as the other tabs. Props mirror
 * WatchlistTab so tests can inject a fake client / fetch.
 */
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const KIND_LABEL = {
  price_move: 'Price move',
  whale_flow: 'Whale flow',
  signal_flip: 'Signal change',
  news_high_impact: 'High-impact news',
}
const KINDS = ['price_move', 'whale_flow', 'signal_flip', 'news_high_impact']

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: 18px;
`
const Title = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #e0e6ed;
`
const Sub = styled.span`
  font-size: 11px;
  color: #6b7a8c;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th, td {
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    white-space: nowrap;
  }
  th {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7a8c;
    font-weight: 600;
  }
`
const Ticker = styled.span`
  color: #00e5ff;
  font-weight: 600;
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
  gap: 4px;
  font-size: 11px;
  color: #6b7a8c;
`
const Input = styled.input`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 4px;
  color: #e0e6ed;
  font-size: 13px;
  padding: 6px 8px;
  width: 110px;
`
const Select = styled.select`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 4px;
  color: #e0e6ed;
  font-size: 13px;
  padding: 6px 8px;
`
const Btn = styled.button`
  background: rgba(0,229,255,0.10);
  border: 1px solid rgba(0,229,255,0.25);
  border-radius: 4px;
  color: #6ee7ff;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 14px;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: default; }
`
const LinkBtn = styled.button`
  background: none;
  border: none;
  color: #ff7a7a;
  font-size: 11px;
  cursor: pointer;
  padding: 0;
`
const Channels = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  font-size: 13px;
  color: #c3ccd6;
`
const Check = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
`
const Note = styled.p`
  margin: 0;
  font-size: 11px;
  color: #6b7a8c;
  line-height: 1.5;
`

export default function AlertsTab({ client, fetchImpl }) {
  const [rules, setRules] = useState([])
  const [status, setStatus] = useState('loading')
  const [prefs, setPrefs] = useState({ notifications_in_app: true, notification_style: 'balanced' })
  const [form, setForm] = useState({ ticker: '', kind: 'price_move', threshold: '5' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

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
      const [aRes, pRes] = await Promise.all([
        doFetch('/api/personal/alerts', { headers }),
        doFetch('/api/notifications/preferences', { headers }),
      ])
      if (aRes.ok) {
        const body = await aRes.json()
        setRules(Array.isArray(body?.rules) ? body.rules : [])
      }
      if (pRes.ok) setPrefs(await pRes.json())
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [fetchImpl, token])

  useEffect(() => {
    load()
  }, [load])

  const addRule = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const doFetch = fetchImpl ?? fetch
    const t = await token()
    const ticker = form.ticker.trim().toUpperCase()
    if (!ticker) {
      setBusy(false)
      setError('Enter a ticker.')
      return
    }
    const payload = { ticker, kind: form.kind }
    if (form.kind === 'price_move') payload.threshold_pct = Number(form.threshold) || 5
    if (form.kind === 'whale_flow') payload.threshold_usd = Number(form.threshold) || 1000000
    try {
      const res = await doFetch('/api/personal/alerts', {
        method: 'POST',
        headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setForm({ ticker: '', kind: form.kind, threshold: form.threshold })
        await load()
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body?.error === 'rule_limit_reached' ? 'You have reached the 50-alert limit.' : 'Could not add alert.')
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

  const thresholdLabel = (r) => {
    if (r.kind === 'price_move') return `${r.threshold_pct}%`
    if (r.kind === 'whale_flow') {
      const v = Number(r.threshold_usd) || 0
      return v >= 1000000 ? `$${(v / 1000000).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(v / 1000)}K`
    }
    return '—'
  }

  const showThreshold = form.kind === 'price_move' || form.kind === 'whale_flow'

  return (
    <Wrap>
      <div>
        <Title>Alerts</Title>{' '}
        <Sub>ORCA pings you when something changes</Sub>
      </div>

      <form onSubmit={addRule}>
        <Row>
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
          <Field>
            Type
            <Select
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
              aria-label="Alert type"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </Select>
          </Field>
          {showThreshold && (
            <Field>
              {form.kind === 'price_move' ? 'Move %' : 'Net USD'}
              <Input
                type="number"
                value={form.threshold}
                onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                aria-label="Threshold"
              />
            </Field>
          )}
          <Btn type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add alert'}</Btn>
        </Row>
        {error && <Note style={{ color: '#ff7a7a', marginTop: 8 }}>{error}</Note>}
      </form>

      {status === 'ready' && rules.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Type</th>
              <th>Threshold</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td><Ticker>{r.ticker}</Ticker></td>
                <td>{KIND_LABEL[r.kind] || r.kind}</td>
                <td>{thresholdLabel(r)}</td>
                <td>
                  <Check>
                    <input type="checkbox" checked={!!r.enabled} onChange={() => toggleRule(r)} aria-label={`Toggle ${r.ticker} ${r.kind}`} />
                    {r.enabled ? 'On' : 'Off'}
                  </Check>
                </td>
                <td><LinkBtn type="button" onClick={() => removeRule(r)}>Remove</LinkBtn></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {status === 'ready' && rules.length === 0 && (
        <Note>No alerts yet. Add one above, or just tell ORCA: “alert me when SOL moves 5%”.</Note>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
          Alerts are informational only and never financial advice. They are delivered to your in-app inbox.
        </Note>
      </div>
    </Wrap>
  )
}
