'use client'
/**
 * Plain-English alert presets, fully adjustable: pick a preset, then the
 * coin (yours, popular ones, or any symbol you type), the wallet (yours, a
 * famous one, or any address you paste) and the number (a quick choice or
 * your own), and Save. A live sentence shows exactly what will alert you.
 *
 *   variant  'full' (a list, used at the top of AlertsTab) or 'row' (compact
 *            buttons, used in the Personal page's setup card)
 *   onSaved  called after a rule was created
 *   token    optional async () => access token (defaults to the session)
 *   wallets  followed wallets [{ address, name, avatar }]
 *   coins    the user's coins (offered first)
 *   emailOn  whether alert email is on (only changes the confirmation)
 */
import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import TokenIcon from '@/components/TokenIcon'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { FAMOUS_WALLETS } from '@/lib/onboarding/famousWallets'
import { visiblePresets, presetBody, fmtOption, POPULAR_COINS, parseCustomValue, describeRule } from '@/lib/orca/alerts/presets'
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
  padding: 14px;
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
  align-items: center;
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
const Field = styled.input`
  height: 30px;
  min-width: 0;
  padding: 0 10px;
  border-radius: ${T.radius.pill};
  border: 1px solid ${(p) => (p.$on ? T.accent : T.hairlineStrong)};
  background: ${(p) => (p.$on ? T.accentSoft : 'transparent')};
  color: ${T.ink};
  font-size: 12.5px;
  width: ${(p) => p.$w || '140px'};
  &::placeholder { color: ${T.muted}; }
  &:focus { outline: none; border-color: ${T.accent}; }
`
const Preview = styled.p`
  margin: 2px 0 12px;
  font-size: 13px;
  color: ${T.ink};
  b { color: ${T.accent}; font-weight: 600; }
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
  &:disabled { opacity: 0.55; cursor: default; }
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
  invalid_address: 'That does not look like a wallet address.',
  invalid_ticker: 'That does not look like a coin symbol.',
  unknown_symbol: 'We do not have a price for that coin yet, so a price alert would never fire.',
  unauthenticated: 'Sign in to save alerts.',
}

const UNIT_HINT = { usd: 'e.g. 250k or 2m', pct: 'e.g. 1.5', count: 'e.g. 4' }
const SYMBOL_RE = /^[A-Z0-9._-]{1,12}$/
const ADDRESS_RE = /^(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{25,64}|bc1[a-z0-9]{20,90}|T[1-9A-HJ-NP-Za-km-z]{33})$/

export default function AlertPresets({ variant = 'full', onSaved, token, wallets = [], coins = [], emailOn = false }) {
  const row = variant === 'row'
  const presets = useMemo(() => visiblePresets(), [])
  const coinChoices = useMemo(() => [...new Set([...coins.map((c) => String(c).toUpperCase()), ...POPULAR_COINS])].slice(0, 12), [coins])
  const followedNames = useMemo(() => new Set(wallets.map((w) => w.name)), [wallets])
  const famousToOffer = useMemo(() => FAMOUS_WALLETS.filter((w) => !followedNames.has(w.name)), [followedNames])
  const names = useMemo(() => new Map(wallets.map((w) => [String(w.address).toLowerCase(), w.name])), [wallets])

  const [open, setOpen] = useState(null)
  const [sel, setSel] = useState({})
  const [state, setState] = useState({ status: 'idle', message: '' })
  const preset = presets.find((p) => p.kind === open) || null

  const pick = (p) => {
    if (open === p.kind) { setOpen(null); return }
    setOpen(p.kind)
    setState({ status: 'idle', message: '' })
    setSel({
      ticker: coinChoices[0] || 'BTC',
      typedTicker: '',
      wallet: wallets[0] ? { type: 'followed', address: wallets[0].address, name: wallets[0].name } : famousToOffer[0] ? { type: 'famous', slug: famousToOffer[0].slug, name: famousToOffer[0].name } : null,
      typedAddress: '',
      option: p.defaultOption,
      custom: '',
    })
  }

  // ── the draft rule ───────────────────────────────────────────────────────
  const customValue = preset && sel.custom ? parseCustomValue(preset, sel.custom) : null
  const customBad = !!(preset && sel.custom && customValue === null)
  const value = sel.custom ? customValue : sel.option
  const typedTicker = String(sel.typedTicker || '').trim().toUpperCase()
  const ticker = typedTicker || sel.ticker
  const typedAddress = String(sel.typedAddress || '').trim()
  const wallet = typedAddress ? { type: 'address', address: typedAddress, name: null } : sel.wallet
  const tickerBad = !!(typedTicker && !SYMBOL_RE.test(typedTicker))
  const addressBad = !!(typedAddress && !ADDRESS_RE.test(typedAddress))

  let previewRule = null
  if (preset) {
    if (preset.target === 'wallet') {
      previewRule = { kind: 'wallet_activity', address: wallet?.address || null, threshold_usd: value }
    } else {
      previewRule = { kind: preset.kind, ticker, threshold_pct: preset.unit === 'pct' || preset.unit === 'count' ? value : null, threshold_usd: preset.unit === 'usd' ? value : null }
    }
  }
  const previewNames = new Map(names)
  if (wallet?.type === 'famous') previewNames.set('famous', wallet.name)
  const preview = previewRule
    ? wallet?.type === 'famous' && preset?.target === 'wallet'
      ? describeRule({ ...previewRule, address: 'famous' }, previewNames)
      : describeRule(previewRule, previewNames)
    : ''
  const canSave = !!preset && !customBad && !tickerBad && !addressBad && (preset.target === 'coin' ? !!ticker : !!wallet) && state.status !== 'saving'

  const save = async () => {
    if (!canSave) return
    setState({ status: 'saving', message: '' })
    const t = token ? await token() : await sessionToken()
    if (!t) { setState({ status: 'error', message: ERRORS.unauthenticated }); return }
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
    const post = (url, body) => fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    try {
      let res
      let followed = false
      if (preset.target === 'wallet' && wallet.type === 'famous') {
        res = await post('/api/onboarding/follow-famous', { slugs: [wallet.slug], source: 'alert_preset', min_usd: value })
        followed = true
      } else if (preset.target === 'wallet') {
        if (wallet.type === 'address') {
          const f = await post('/api/wallet-tracker/follows', { address: wallet.address })
          if (!f.ok) { setState({ status: 'error', message: ERRORS.invalid_address }); return }
          followed = true
        }
        res = await post('/api/personal/alerts', presetBody(preset, { address: wallet.address, option: value }))
      } else {
        res = await post('/api/personal/alerts', presetBody(preset, { ticker, option: value }))
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setState({ status: 'error', message: ERRORS[body?.error] || 'Could not save this alert. Try again.' })
        return
      }
      const lag = preset.kind === 'wallet_activity' ? ' (wallet moves can take up to an hour to reach us)' : ''
      setState({ status: 'saved', message: `Saved. First check within 5 minutes${lag}. Delivered to your bell${emailOn ? ' and to your email' : ''}.` })
      try {
        if (followed) window.dispatchEvent(new CustomEvent('sonar:follows-changed'))
        window.dispatchEvent(new CustomEvent('orca:alerts-changed'))
      } catch { /* ignore */ }
      onSaved?.({ kind: preset.kind })
    } catch {
      setState({ status: 'error', message: 'Could not save this alert. Try again.' })
    }
  }

  const edit = (patch) => {
    setSel((s) => ({ ...s, ...patch }))
    if (state.status !== 'saving') setState({ status: 'idle', message: '' })
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
              {wallets.length > 0 && (
                <>
                  <Label>Wallets you follow</Label>
                  <Chips>
                    {wallets.map((w) => (
                      <Chip key={w.address} type="button" $on={!typedAddress && sel.wallet?.type === 'followed' && sel.wallet.address === w.address} onClick={() => edit({ wallet: { type: 'followed', address: w.address, name: w.name }, typedAddress: '' })} data-testid="alert-preset-chip-wallet">
                        <Avatar src={w.avatar} name={w.name} size={18} />{w.name}
                      </Chip>
                    ))}
                  </Chips>
                </>
              )}
              {famousToOffer.length > 0 && (
                <>
                  <Label>{wallets.length ? 'Or follow one of these' : 'Follow a wallet and get its alerts'}</Label>
                  <Chips>
                    {famousToOffer.map((w) => (
                      <Chip key={w.slug} type="button" $on={!typedAddress && sel.wallet?.type === 'famous' && sel.wallet.slug === w.slug} onClick={() => edit({ wallet: { type: 'famous', slug: w.slug, name: w.name }, typedAddress: '' })} data-testid={`alert-preset-chip-${w.slug}`}>
                        <Avatar src={w.avatar} name={w.name} size={18} />{w.name}
                      </Chip>
                    ))}
                  </Chips>
                </>
              )}
              <Label>Or any wallet address</Label>
              <Chips>
                <Field
                  $w="min(100%, 420px)"
                  $on={!!typedAddress}
                  value={sel.typedAddress || ''}
                  onChange={(e) => edit({ typedAddress: e.target.value })}
                  placeholder="Paste 0x…, bc1…, or a Solana address"
                  aria-label="Wallet address"
                  data-testid="alert-preset-address"
                />
              </Chips>
            </>
          ) : (
            <>
              <Label>Coin</Label>
              <Chips>
                {preset.anyCoin && (
                  <Chip type="button" $on={!typedTicker && sel.ticker === '_ALL_'} onClick={() => edit({ ticker: '_ALL_', typedTicker: '' })} data-testid="alert-preset-chip-ANY">Any coin</Chip>
                )}
                {coinChoices.map((c) => (
                  <Chip key={c} type="button" $on={!typedTicker && sel.ticker === c} onClick={() => edit({ ticker: c, typedTicker: '' })} data-testid={`alert-preset-chip-${c}`}>
                    <TokenIcon symbol={c} size={16} />{c}
                  </Chip>
                ))}
                <Field
                  $w="120px"
                  $on={!!typedTicker}
                  value={sel.typedTicker || ''}
                  onChange={(e) => edit({ typedTicker: e.target.value.toUpperCase() })}
                  placeholder="Other coin"
                  maxLength={12}
                  aria-label="Other coin symbol"
                  data-testid="alert-preset-coin"
                />
              </Chips>
            </>
          )}

          {preset.unit && (
            <>
              <Label>{preset.unit === 'pct' ? 'Move in one hour' : preset.unit === 'count' ? 'Number of whale wallets' : preset.kind === 'whale_flow' ? 'Net flow over 24 hours' : 'Size of the move'}</Label>
              <Chips>
                {preset.allowAny && (
                  <Chip type="button" $on={!sel.custom && sel.option === null} onClick={() => edit({ option: null, custom: '' })} data-testid="alert-preset-option-any">Any move</Chip>
                )}
                {preset.options.map((v) => (
                  <Chip key={v} type="button" $on={!sel.custom && sel.option === v} onClick={() => edit({ option: v, custom: '' })} data-testid={`alert-preset-option-${v}`}>
                    {fmtOption(preset.unit, v)}
                  </Chip>
                ))}
                <Field
                  $w="130px"
                  $on={!!sel.custom}
                  value={sel.custom || ''}
                  onChange={(e) => edit({ custom: e.target.value })}
                  placeholder={`Custom, ${UNIT_HINT[preset.unit]}`}
                  inputMode="decimal"
                  aria-label="Custom value"
                  aria-invalid={customBad}
                  data-testid="alert-preset-custom"
                />
              </Chips>
              {customBad && (
                <Status $error style={{ margin: '-6px 0 10px' }}>
                  {preset.unit === 'usd'
                    ? `Enter an amount between ${fmtOption('usd', preset.custom.min)} and ${fmtOption('usd', preset.custom.max)}, e.g. 250k.`
                    : preset.unit === 'pct'
                      ? `Enter a percentage between ${preset.custom.min} and ${preset.custom.max}.`
                      : `Enter a number of wallets between ${preset.custom.min} and ${preset.custom.max}.`}
                </Status>
              )}
            </>
          )}

          {(tickerBad || addressBad) && (
            <Status $error style={{ margin: '-6px 0 10px' }}>{tickerBad ? ERRORS.invalid_ticker : ERRORS.invalid_address}</Status>
          )}

          {preview && !customBad && !tickerBad && !addressBad && (
            <Preview data-testid="alert-preset-preview">Your alert: <b>{preview}</b></Preview>
          )}

          <Save type="button" onClick={save} disabled={!canSave || state.status === 'saved'} data-testid="alert-preset-save">
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
