'use client'
/**
 * Plain-English alert presets: pick one, pick a coin or wallet (prefilled),
 * Save. Three clicks at most, with the confirmation in view.
 *
 *   variant  'full' (a list, used at the top of AlertsTab) or 'row' (compact
 *            buttons, used in the Personal page's setup card and rail)
 *   onSaved  called after a rule was created
 *   token    optional async () => access token (defaults to the session)
 *   wallets  followed wallets [{ address, name, avatar }]; none → the six
 *            famous wallets, followed and alerted in one call
 *   coins    the user's coins; BTC / ETH / SOL are always offered too
 *   emailOn  whether alert email is on (only changes the confirmation)
 */
import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import TokenIcon from '@/components/TokenIcon'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { FAMOUS_WALLETS } from '@/lib/onboarding/famousWallets'
import { visiblePresets, presetBody, fmtOption, fmtUsdShort, FALLBACK_COINS } from '@/lib/orca/alerts/presets'
import { T } from '@/lib/ui/tokens'
import { Avatar } from './v2/ui'

const List = styled.div`
  display: ${(p) => (p.$row ? 'flex' : 'grid')};
  flex-wrap: wrap;
  gap: 8px;
`
const PresetBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: ${(p) => (p.$row ? '0 12px' : '10px 12px')};
  height: ${(p) => (p.$row ? '32px' : 'auto')};
  border-radius: ${T.radius.md};
  border: 1px solid ${(p) => (p.$on ? T.accentBorder : T.hairlineStrong)};
  background: ${(p) => (p.$on ? T.accentSoft : 'transparent')};
  color: ${T.ink};
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  &:hover { border-color: ${T.accent}; }
  &:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; }
`
const Editor = styled.div`
  margin-top: 10px;
  padding: 12px;
  border-radius: ${T.radius.md};
  border: 1px solid ${T.hairlineStrong};
  background: ${T.surface2};
`
const Label = styled.div`
  margin: 0 0 6px;
  font-size: 12px;
  color: ${T.muted};
`
const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
`
const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border-radius: ${T.radius.pill};
  border: 1px solid ${(p) => (p.$on ? T.accent : T.hairlineStrong)};
  background: ${(p) => (p.$on ? T.accentSoft : 'transparent')};
  color: ${(p) => (p.$on ? T.ink : T.body)};
  font-size: 12.5px;
  cursor: pointer;
  &:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; }
  small { color: ${T.muted}; font-size: 11.5px; }
`
const Save = styled.button`
  height: 32px;
  padding: 0 14px;
  border-radius: ${T.radius.md};
  border: none;
  background: ${T.accent};
  color: ${T.bg};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.6; cursor: default; }
`
const Status = styled.p`
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: ${(p) => (p.$error ? T.negText : T.body)};
`

async function sessionToken() {
  try {
    const { data } = await supabaseBrowser().auth.getSession()
    return data?.session?.access_token || null
  } catch {
    return null
  }
}

const ERRORS = {
  rule_limit_reached: 'You have reached the 50-alert limit.',
  invalid_address: 'That wallet address does not look valid.',
  invalid_ticker: 'That coin does not look valid.',
  unauthenticated: 'Sign in to save alerts.',
}

export default function AlertPresets({ variant = 'full', onSaved, token, wallets = [], coins = [], emailOn = false }) {
  const row = variant === 'row'
  const presets = useMemo(() => visiblePresets(), [])
  const coinChoices = useMemo(() => [...new Set([...coins.map((c) => String(c).toUpperCase()), ...FALLBACK_COINS])].slice(0, 8), [coins])
  const [open, setOpen] = useState(null)
  const [sel, setSel] = useState({})
  const [state, setState] = useState({ status: 'idle', message: '' })
  const preset = presets.find((p) => p.kind === open) || null
  const famous = preset?.target === 'wallet' && wallets.length === 0

  const pick = (p) => {
    if (open === p.kind) { setOpen(null); return }
    setOpen(p.kind)
    setState({ status: 'idle', message: '' })
    setSel({
      ticker: coinChoices[0] || null,
      address: wallets[0]?.address || null,
      slug: wallets.length === 0 ? FAMOUS_WALLETS[0]?.slug : null,
      option: p.defaultOption,
    })
  }

  const save = async () => {
    if (!preset) return
    setState({ status: 'saving', message: '' })
    const t = token ? await token() : await sessionToken()
    if (!t) { setState({ status: 'error', message: ERRORS.unauthenticated }); return }
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
    try {
      const res = famous
        ? await fetch('/api/onboarding/follow-famous', { method: 'POST', headers, body: JSON.stringify({ slugs: [sel.slug], source: 'alert_preset' }) })
        : await fetch('/api/personal/alerts', { method: 'POST', headers, body: JSON.stringify(presetBody(preset, sel)) })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setState({ status: 'error', message: ERRORS[body?.error] || 'Could not save this alert. Try again.' })
        return
      }
      const lag = preset.kind === 'wallet_activity' ? ' (wallet moves can take up to an hour to reach us)' : ''
      setState({ status: 'saved', message: `Saved. First check within 5 minutes${lag}. Delivered to your bell${emailOn ? ' and to your email' : ''}.` })
      try {
        if (famous) window.dispatchEvent(new CustomEvent('sonar:follows-changed'))
        window.dispatchEvent(new CustomEvent('orca:alerts-changed'))
      } catch { /* ignore */ }
      onSaved?.({ kind: preset.kind })
    } catch {
      setState({ status: 'error', message: 'Could not save this alert. Try again.' })
    }
  }

  return (
    <div data-testid={`alert-presets-${variant}`}>
      <List $row={row}>
        {presets.map((p) => (
          <PresetBtn key={p.kind} type="button" $row={row} $on={open === p.kind} onClick={() => pick(p)} data-testid={`alert-preset-${p.kind}`} aria-expanded={open === p.kind}>
            <span>{p.title}</span>
          </PresetBtn>
        ))}
      </List>

      {preset && (
        <Editor>
          {preset.target === 'wallet' ? (
            <>
              <Label>{famous ? 'Follow a wallet and get its alerts' : 'Wallet'}</Label>
              <Chips>
                {famous
                  ? FAMOUS_WALLETS.map((w) => (
                    <Chip key={w.slug} type="button" $on={sel.slug === w.slug} onClick={() => setSel((s) => ({ ...s, slug: w.slug }))} data-testid={`alert-preset-chip-${w.slug}`}>
                      <Avatar src={w.avatar} name={w.name} size={18} />{w.name}<small>above {fmtUsdShort(w.minUsd)}</small>
                    </Chip>
                  ))
                  : wallets.map((w) => (
                    <Chip key={w.address} type="button" $on={sel.address === w.address} onClick={() => setSel((s) => ({ ...s, address: w.address }))} data-testid="alert-preset-chip-wallet">
                      <Avatar src={w.avatar} name={w.name} size={18} />{w.name}
                    </Chip>
                  ))}
              </Chips>
            </>
          ) : (
            <>
              <Label>Coin</Label>
              <Chips>
                {coinChoices.map((c) => (
                  <Chip key={c} type="button" $on={sel.ticker === c} onClick={() => setSel((s) => ({ ...s, ticker: c }))} data-testid={`alert-preset-chip-${c}`}>
                    <TokenIcon symbol={c} size={16} />{c}
                  </Chip>
                ))}
              </Chips>
            </>
          )}

          {preset.options.length > 0 && !famous && (
            <>
              <Label>{preset.unit === 'pct' ? 'Move in an hour' : preset.unit === 'count' ? 'Whale wallets' : preset.kind === 'whale_flow' ? '24 h net flow' : 'Move size'}</Label>
              <Chips>
                {preset.options.map((v) => (
                  <Chip key={v} type="button" $on={sel.option === v} onClick={() => setSel((s) => ({ ...s, option: v }))} data-testid={`alert-preset-option-${v}`}>
                    {fmtOption(preset.unit, v)}
                  </Chip>
                ))}
              </Chips>
            </>
          )}

          <Save type="button" onClick={save} disabled={state.status === 'saving' || state.status === 'saved'} data-testid="alert-preset-save">
            {state.status === 'saving' ? 'Saving…' : state.status === 'saved' ? 'Saved' : 'Save alert'}
          </Save>
          <div aria-live="polite">
            {state.message && <Status $error={state.status === 'error'} data-testid="alert-preset-status">{state.message}</Status>}
          </div>
        </Editor>
      )}
    </div>
  )
}
