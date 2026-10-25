'use client'
/**
 * The ONE first-run surface on the Personal page (data-testid
 * personal-onboarding): shown whenever the account has no coins, no follows
 * and no enabled alert rules. Three steps, each completable on the page.
 */
import React, { useState } from 'react'
import styled from 'styled-components'
import TokenIcon from '@/components/TokenIcon'
import { FAMOUS_WALLETS } from '@/lib/onboarding/famousWallets'
import { T } from '@/lib/ui/tokens'
import { Card, Button, Input, Avatar, Muted, fmtUsd } from './ui'

const Step = styled.div`
  padding: 16px 0;
  border-top: 1px solid ${T.hairlineStrong};
  &:first-of-type { border-top: none; padding-top: 4px; }
`
const StepTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: ${T.ink};
`
const StepNum = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: ${T.radius.pill};
  border: 1px solid ${T.hairlineStrong};
  font-family: ${T.font.mono};
  font-size: 11px;
  color: ${T.muted};
`
const Row = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`
const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
`
const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border-radius: ${T.radius.sm};
  border: 1px solid ${T.hairlineStrong};
  background: transparent;
  color: ${T.body};
  font-size: 12.5px;
  cursor: pointer;
  &:hover:not(:disabled) { border-color: ${T.accent}; color: ${T.ink}; }
  &:disabled { opacity: 0.55; cursor: default; }
  b { color: ${T.ink}; font-weight: 600; }
`
const WalletGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  @media (max-width: 1100px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`
const WalletTile = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: ${T.radius.md};
  border: 1px solid ${(p) => (p.$on ? T.accentBorder : T.hairlineStrong)};
  background: ${(p) => (p.$on ? T.accentSoft : 'transparent')};
`
const WalletName = styled.div`
  font-size: 13.5px;
  font-weight: 600;
  color: ${T.ink};
`
const WalletBlurb = styled.div`
  font-size: 12px;
  line-height: 1.4;
  color: ${T.muted};
`
const Presets = styled.div`
  display: grid;
  gap: 8px;
`
const Preset = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: ${T.radius.md};
  border: 1px solid ${T.hairlineStrong};
  background: transparent;
  color: ${T.ink};
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  &:hover:not(:disabled) { border-color: ${T.accent}; }
  &:disabled { cursor: default; }
`

export default function OnboardingCard({ suggestions = [], hasFollows, hasCoins, onAddCoin, onFollow, onPreset, onTour, busy = {} }) {
  const [symbol, setSymbol] = useState('')
  const [error, setError] = useState(null)
  const [followed, setFollowed] = useState({})
  const [presetDone, setPresetDone] = useState({})

  const add = async (sym) => {
    const s = String(sym || '').trim().toUpperCase()
    if (!s) return
    setError(null)
    const res = await onAddCoin(s)
    if (res?.ok) setSymbol('')
    else setError(res?.error || `We do not track ${s} yet.`)
  }

  const follow = async (w) => {
    setFollowed((f) => ({ ...f, [w.slug]: 'pending' }))
    const ok = await onFollow(w.slug)
    setFollowed((f) => ({ ...f, [w.slug]: ok ? 'done' : 'error' }))
  }

  const preset = async (key) => {
    setPresetDone((p) => ({ ...p, [key]: 'pending' }))
    const ok = await onPreset(key)
    setPresetDone((p) => ({ ...p, [key]: ok ? 'done' : 'error' }))
  }

  return (
    <Card data-testid="personal-onboarding" aria-labelledby="personal-onboarding-title">
      <h2 id="personal-onboarding-title" style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: T.ink }}>Set up your feed</h2>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: T.muted }}>
        Add coins and follow wallets. Your feed then shows their large on-chain moves as they happen.
      </p>

      <Step>
        <StepTitle><StepNum>1</StepNum>Add coins</StepTitle>
        <form onSubmit={(e) => { e.preventDefault(); add(symbol) }}>
          <Row>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="Coin symbol, for example LINK"
              aria-label="Coin symbol"
              data-testid="onboarding-coin-input"
            />
            <Button type="submit" $primary disabled={!symbol.trim() || busy.coin}>Add</Button>
          </Row>
        </form>
        {error && <div role="alert" style={{ marginTop: 8, fontSize: 12.5, color: T.negText }}>{error}</div>}
        {suggestions.length > 0 && (
          <Chips>
            {suggestions.slice(0, 5).map((s) => (
              <Chip key={s.symbol} type="button" onClick={() => add(s.symbol)} disabled={busy.coin} data-testid={`onboarding-suggest-${s.symbol}`}>
                <TokenIcon symbol={s.symbol} size={16} />
                <b>{s.symbol}</b>
                <Muted>{s.trades} whale moves today{s.via ? ` (${s.via})` : ''}</Muted>
              </Chip>
            ))}
          </Chips>
        )}
      </Step>

      <Step>
        <StepTitle><StepNum>2</StepNum>Follow a wallet</StepTitle>
        <WalletGrid>
          {FAMOUS_WALLETS.map((w) => {
            const st = followed[w.slug]
            const rules = w.alertAddresses === 1 ? '1 alert' : `${w.alertAddresses} alerts`
            return (
              <WalletTile key={w.slug} $on={st === 'done'}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Avatar src={w.avatar} name={w.name} size={34} />
                  <div style={{ minWidth: 0 }}>
                    <WalletName>{w.name}</WalletName>
                    <WalletBlurb>{w.blurb}</WalletBlurb>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => follow(w)}
                  disabled={st === 'pending' || st === 'done'}
                  data-testid={`onboarding-follow-${w.slug}`}
                  title={`Following creates ${rules} for moves above ${fmtUsd(w.minUsd)}`}
                >
                  {st === 'done' ? 'Following' : st === 'pending' ? 'Following…' : st === 'error' ? 'Try again' : `Follow · alerts above ${fmtUsd(w.minUsd)}`}
                </Button>
              </WalletTile>
            )
          })}
        </WalletGrid>
      </Step>

      <Step>
        <StepTitle><StepNum>3</StepNum>Set a one-tap alert</StepTitle>
        <Presets>
          <Preset type="button" disabled={!hasFollows || presetDone.wallet === 'pending' || presetDone.wallet === 'done'} onClick={() => preset('wallet')} data-testid="onboarding-preset-wallet">
            <span>A wallet I follow moves more than $100K</span>
            <Muted style={{ fontSize: 12 }}>{presetDone.wallet === 'done' ? 'Saved' : hasFollows ? 'Save' : 'Follow a wallet first'}</Muted>
          </Preset>
          <Preset type="button" disabled={!hasCoins || presetDone.price === 'pending' || presetDone.price === 'done'} onClick={() => preset('price')} data-testid="onboarding-preset-price">
            <span>A coin on my watchlist moves 5% in an hour</span>
            <Muted style={{ fontSize: 12 }}>{presetDone.price === 'done' ? 'Saved' : hasCoins ? 'Save' : 'Add a coin first'}</Muted>
          </Preset>
        </Presets>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: T.muted }}>Alerts arrive in the bell at the top of the page. Email is optional and set in alert settings.</p>
      </Step>

      <div style={{ paddingTop: 12, borderTop: `1px solid ${T.hairlineStrong}` }}>
        <Button type="button" onClick={onTour} data-testid="onboarding-tour">Take the 60-second tour</Button>
      </div>
    </Card>
  )
}
