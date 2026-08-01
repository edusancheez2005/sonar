'use client'
// One-time dashboard spotlight for the famous-wallets feature. Shows a
// short "this is what you can do" walkthrough with an optional video
// (drop the produced cut at /public/videos/famous-wallets.mp4 — the
// player only renders when the file loads, so shipping the modal before
// the video exists is safe). Dismissal is stored per CONTENT_VERSION so
// a future bigger launch can re-trigger it by bumping the constant.
import React, { useEffect, useState } from 'react'

const STORAGE_KEY = 'sonar_famous_wallets_spotlight_v1'
const VIDEO_SRC = '/videos/famous-wallets.mp4'

const STEPS = [
  {
    title: 'Pick a famous wallet',
    body: 'Vitalik, Binance, MrBeast, governments — 250+ verified figures with their real on-chain wallets.',
  },
  {
    title: 'See what they actually do',
    body: 'Live transfers, portfolio value over time, and whether they are up or down — real numbers, not rumors.',
  },
  {
    title: 'Go deeper with one click',
    body: 'Backtest their trades, see their top counterparties, or ask ORCA to explain a move in plain English.',
  },
]

export default function FamousWalletsSpotlight() {
  const [open, setOpen] = useState(false)
  const [videoOk, setVideoOk] = useState(true)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
    } catch { /* private mode — skip */ }
  }, [])

  const dismiss = () => {
    setOpen(false)
    try { localStorage.setItem(STORAGE_KEY, new Date().toISOString()) } catch { /* ignore */ }
  }

  if (!open) return null

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(4, 14, 22, 0.78)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
          background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
          border: '1px solid rgba(54, 166, 186, 0.35)', borderRadius: '18px',
          padding: '1.5rem', color: 'var(--text-primary, #e8eef4)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1.5px', color: '#36a6ba', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          New on Sonar
        </div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.2, margin: '0 0 0.75rem' }}>
          Track famous wallets like a pro
        </h2>
        <p style={{ color: 'var(--text-secondary, #9aa7b8)', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 1rem' }}>
          Every wallet is public — if you know where to look. Sonar tracks the verified
          wallets of the most famous people and institutions in crypto, live.
        </p>

        {videoOk ? (
          <video
            src={VIDEO_SRC}
            controls
            playsInline
            preload="metadata"
            onError={() => setVideoOk(false)}
            style={{ width: '100%', borderRadius: '12px', marginBottom: '1rem', background: '#08131d' }}
          />
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.25rem' }}>
          {STEPS.map((s, i) => (
            <div key={s.title} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{
                flexShrink: 0, width: '26px', height: '26px', borderRadius: '50%',
                background: 'rgba(54, 166, 186, 0.15)', border: '1px solid rgba(54, 166, 186, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 800, color: '#36a6ba',
              }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.1rem' }}>{s.title}</div>
                <div style={{ color: 'var(--text-secondary, #9aa7b8)', fontSize: '0.84rem', lineHeight: 1.45 }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a
            href="/figures"
            onClick={dismiss}
            style={{
              flex: '1 1 auto', textAlign: 'center', textDecoration: 'none',
              background: '#36a6ba', color: '#04141d', fontWeight: 800, fontSize: '0.95rem',
              padding: '0.7rem 1.2rem', borderRadius: '10px',
            }}
          >
            Explore famous wallets →
          </a>
          <button
            onClick={dismiss}
            style={{
              flex: '0 0 auto', background: 'transparent', border: '1px solid rgba(154, 167, 184, 0.35)',
              color: 'var(--text-secondary, #9aa7b8)', fontWeight: 600, fontSize: '0.9rem',
              padding: '0.7rem 1.1rem', borderRadius: '10px', cursor: 'pointer',
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
