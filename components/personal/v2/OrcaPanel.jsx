'use client'
/**
 * ORCA inline on the Personal page: a real text box under the feed. Ask a
 * question, or tell ORCA what to do ("follow Wintermute", "alert me when ETH
 * moves 5%"); writes come back as a Confirm card and the page refreshes when
 * they run (orca:*-changed events). "New chat" starts over.
 */
import React, { Suspense, useState } from 'react'
import AskOrcaClient from '@/app/ai/AskOrcaClient'
import { T } from '@/lib/ui/tokens'
import { Card, SecHead } from './ui'

const SUGGESTIONS = [
  { label: 'What did whales do with my coins today?', prompt: 'What did whales do with the coins on my watchlist in the last 24 hours?' },
  { label: 'Follow Wintermute', prompt: 'Follow Wintermute' },
  { label: 'Alert me when ETH moves 5%', prompt: 'Alert me when ETH moves 5%' },
  { label: 'Send me a test alert', prompt: 'Send me a test alert' },
]

export default function OrcaPanel() {
  const [chat, setChat] = useState(0)
  return (
    <Card data-testid="personal-orca">
      <SecHead
        title="Ask ORCA"
        right={
          <button
            type="button"
            onClick={() => setChat((c) => c + 1)}
            style={{ border: 'none', background: 'none', color: T.accent, fontSize: 12.5, cursor: 'pointer', padding: 0 }}
          >
            New chat
          </button>
        }
      />
      <p style={{ margin: '-4px 0 12px', fontSize: 13, color: T.muted }}>
        Ask about your coins and wallets, or tell ORCA to follow a wallet, add a coin or set an alert.
      </p>
      <Suspense fallback={null}>
        <AskOrcaClient key={chat} embedded inline suggestions={SUGGESTIONS} />
      </Suspense>
    </Card>
  )
}
