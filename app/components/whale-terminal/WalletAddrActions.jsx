'use client'
// Copy + deeplink actions for a wallet address in the whale terminal.
// Links to /whale/[address] for on-chain analysis (same as Research hero search).
import React, { useState } from 'react'
import NextLink from 'next/link'
import styled from 'styled-components'
import { C, FONT_MONO } from '@/app/lib/terminalTheme'
import { shortenAddress } from '@/lib/wallet-tracker'

export function walletAnalysisHref(wallet) {
  if (!wallet) return null
  return `/whale/${encodeURIComponent(wallet)}`
}

const CopyBtn = styled.button`
  background: transparent;
  border: 1px solid ${C.borderSubtle};
  border-radius: 3px;
  padding: 0.1rem 0.35rem;
  font-size: 0.62rem;
  color: ${C.textMuted};
  cursor: pointer;
  line-height: 1.2;
  font-family: ${FONT_MONO};
  flex-shrink: 0;
  &:hover { color: ${C.cyan}; border-color: rgba(0, 229, 255, 0.35); }
  &[data-copied='true'] { color: ${C.green}; border-color: rgba(0, 230, 118, 0.4); }
`

const AnalyzeLink = styled(NextLink)`
  font-family: ${FONT_MONO};
  font-size: 0.62rem;
  color: ${C.cyan};
  text-decoration: none;
  letter-spacing: 0.3px;
  white-space: nowrap;
  &:hover { text-decoration: underline; }
`

export function CopyWalletBtn({ address }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* ignore */
    }
  }
  return (
    <CopyBtn
      type="button"
      onClick={onCopy}
      data-copied={copied ? 'true' : 'false'}
      title={copied ? 'Copied!' : 'Copy address'}
      aria-label={copied ? 'Copied' : 'Copy address'}
    >
      {copied ? '✓' : '⎘'}
    </CopyBtn>
  )
}

// Whale column: optional display name, truncated address + copy, analyze deeplink.
export function WhaleWalletCell({ wallet, displayName, compact = false }) {
  if (!wallet) return <span>—</span>
  const href = walletAnalysisHref(wallet)
  const short = shortenAddress(wallet, 5)
  const hasName =
    displayName &&
    displayName !== short &&
    !/^0x[a-fA-F0-9]{40}/.test(String(displayName).trim())

  const stop = (e) => e.stopPropagation()

  if (compact) {
    return (
      <span
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}
        onClick={stop}
      >
        <NextLink
          href={href}
          style={{ fontFamily: FONT_MONO, fontSize: '0.72rem', color: C.cyan, textDecoration: 'none', fontWeight: 600 }}
          title="Analyze wallet"
        >
          {hasName ? displayName : short}
        </NextLink>
        <CopyWalletBtn address={wallet} />
        <AnalyzeLink href={href} title="Analyze wallet">
          Analyze →
        </AnalyzeLink>
      </span>
    )
  }

  return (
    <span
      style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-start' }}
      onClick={stop}
    >
      {hasName ? (
        <NextLink
          href={href}
          style={{ color: C.cyan, fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none' }}
          title="Analyze wallet"
        >
          {displayName}
        </NextLink>
      ) : null}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
        <NextLink
          href={href}
          style={{
            fontFamily: FONT_MONO,
            fontSize: '0.72rem',
            color: hasName ? C.textMuted : C.cyan,
            fontWeight: hasName ? 400 : 600,
            textDecoration: 'none',
          }}
          title="Analyze wallet"
        >
          {short}
        </NextLink>
        <CopyWalletBtn address={wallet} />
      </span>
      <AnalyzeLink href={href}>Analyze wallet →</AnalyzeLink>
    </span>
  )
}
