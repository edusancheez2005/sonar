'use client'
import React, { useState } from 'react'

export default function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(value)
      } else if (typeof document !== 'undefined') {
        const ta = document.createElement('textarea')
        ta.value = value
        ta.setAttribute('readonly', '')
        ta.style.position = 'absolute'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copy ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.3rem 0.6rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: copied ? '#2ecc71' : '#a0b2c6',
        background: copied ? 'rgba(46, 204, 113, 0.12)' : 'rgba(54, 166, 186, 0.1)',
        border: `1px solid ${copied ? 'rgba(46, 204, 113, 0.4)' : 'rgba(54, 166, 186, 0.25)'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {copied ? '✓ Copied' : '⧉ Copy'}
    </button>
  )
}
