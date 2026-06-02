'use client'
/**
 * WalletsTab \u2014 §4.D / W4 (ORCA_AGENTIC_REDESIGN_PROMPT.md §3.2)
 * =============================================================================
 * Lists the user's tracked wallets (server-backed by /api/personal/wallets,
 * which reads `user_wallets` shipped in W2). Lets the user add a wallet via
 * an inline modal, delete one with a confirm, and click a row to ask ORCA
 * about it (calls onAskOrca(address, chain) provided by the parent).
 *
 * Privacy:
 *  - Never sends the wallet to any third party. Add/delete is the only
 *    network traffic, both bearer-authenticated against our own API.
 *  - Validates chain against the same allow-list as the server.
 */
import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const CHAINS = ['eth', 'btc', 'sol', 'base', 'arb', 'polygon', 'bsc', 'tron', 'xrp']

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const Title = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #e0e6ed;
`

const AddBtn = styled.button`
  background: linear-gradient(180deg, #36a6ba 0%, #2a8b9c 100%);
  color: #0a0f17;
  border: 0;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  cursor: pointer;
  letter-spacing: 0.02em;
  &:hover { filter: brightness(1.08); }
  &:focus-visible { outline: 2px solid #00e5ff; outline-offset: 2px; }
`

const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Row = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 56px auto auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  font-size: 13px;
`

const LabelCol = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
`

const Label = styled.span`
  font-weight: 600;
  color: #e0e6ed;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Addr = styled.code`
  font-size: 11px;
  color: #8896a6;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Chain = styled.span`
  font-size: 10px;
  color: #6b7a8c;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
`

const RowBtn = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #00e5ff;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 4px 10px;
  cursor: pointer;
  &:hover { border-color: rgba(0, 229, 255, 0.4); background: rgba(0, 229, 255, 0.05); }
  &:focus-visible { outline: 2px solid #00e5ff; outline-offset: 2px; }
`

const DeleteBtn = styled(RowBtn)`
  color: #ff7a7a;
  &:hover { border-color: rgba(255, 122, 122, 0.4); background: rgba(255, 122, 122, 0.06); }
`

const Empty = styled.p`
  margin: 0;
  font-size: 13px;
  color: #8896a6;
  line-height: 1.55;
`

const ErrorText = styled.p`
  margin: 0;
  font-size: 12px;
  color: #ff7a7a;
`

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
`

const Modal = styled.div`
  width: min(420px, calc(100vw - 32px));
  background: rgba(13, 20, 33, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: #e0e6ed;
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
`

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b7a8c;
`

const Input = styled.input`
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #e0e6ed;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  &:focus { outline: none; border-color: rgba(0, 229, 255, 0.5); }
`

const Select = styled.select`
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #e0e6ed;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  &:focus { outline: none; border-color: rgba(0, 229, 255, 0.5); }
`

const ModalActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`

const CancelBtn = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #8896a6;
  border-radius: 6px;
  font-size: 12px;
  padding: 6px 12px;
  cursor: pointer;
  &:focus-visible { outline: 2px solid #00e5ff; outline-offset: 2px; }
`

function truncate(addr) {
  if (typeof addr !== 'string') return ''
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 8)}\u2026${addr.slice(-4)}`
}

export default function WalletsTab({ client, fetchImpl, onAskOrca }) {
  const [state, setState] = useState({ status: 'loading', items: [], error: null })
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [token, setToken] = useState(null)

  const sb = client ?? supabaseBrowser()
  const doFetch = fetchImpl ?? fetch

  async function ensureToken() {
    if (token) return token
    const { data } = await sb.auth.getSession()
    const t = data?.session?.access_token ?? null
    if (t) setToken(t)
    return t
  }

  async function load() {
    try {
      const t = await ensureToken()
      if (!t) {
        setState({ status: 'unauth', items: [], error: null })
        return
      }
      const res = await doFetch('/api/personal/wallets', {
        headers: { authorization: `Bearer ${t}` },
      })
      if (!res.ok) {
        setState({ status: 'error', items: [], error: `HTTP ${res.status}` })
        return
      }
      const body = await res.json()
      const items = Array.isArray(body?.items) ? body.items : []
      setState({ status: 'ready', items, error: null })
    } catch {
      setState({ status: 'error', items: [], error: 'network' })
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await load()
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresh when ORCA performs a voice-write wallet track/untrack. The chat
  // clients dispatch 'orca:wallets-changed' on a confirmed write that touched
  // wallets, so the Wallets tab reflects the change without a manual reload.
  useEffect(() => {
    function onWalletsChanged() { load() }
    if (typeof window !== 'undefined') {
      window.addEventListener('orca:wallets-changed', onWalletsChanged)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('orca:wallets-changed', onWalletsChanged)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDelete(id) {
    const t = await ensureToken()
    if (!t) return
    await doFetch(`/api/personal/wallets?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${t}` },
    })
    setPendingDelete(null)
    await load()
  }

  return (
    <Wrap data-testid="wallets-tab" aria-labelledby="wallets-tab-title">
      <Header>
        <Title id="wallets-tab-title">Tracked wallets</Title>
        <AddBtn data-testid="wallets-add" type="button" onClick={() => setModalOpen(true)}>
          Add wallet
        </AddBtn>
      </Header>

      {state.status === 'loading' && (
        <Empty role="status" aria-live="polite">Loading wallets.</Empty>
      )}
      {state.status === 'unauth' && (
        <Empty>Sign in to track wallets.</Empty>
      )}
      {state.status === 'error' && (
        <ErrorText role="alert">Could not load wallets. Retry shortly.</ErrorText>
      )}
      {state.status === 'ready' && state.items.length === 0 && (
        <Empty data-testid="wallets-empty">
          No wallets yet. Add an address and label to let ORCA explain what it is doing.
        </Empty>
      )}
      {state.status === 'ready' && state.items.length > 0 && (
        <List>
          {state.items.map((item) => (
            <Row key={item.id} data-testid={`wallets-row-${item.id}`}>
              <LabelCol>
                <Label>{item.label || 'Untitled wallet'}</Label>
                <Addr>{truncate(item.address)}</Addr>
              </LabelCol>
              <Chain>{String(item.chain || '').toUpperCase()}</Chain>
              <RowBtn
                type="button"
                onClick={() => onAskOrca && onAskOrca(item.address, item.chain, item.label)}
                data-testid={`wallets-ask-${item.id}`}
              >
                Ask ORCA
              </RowBtn>
              {pendingDelete === item.id ? (
                <DeleteBtn
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  data-testid={`wallets-confirm-${item.id}`}
                >
                  Confirm
                </DeleteBtn>
              ) : (
                <DeleteBtn
                  type="button"
                  onClick={() => setPendingDelete(item.id)}
                  data-testid={`wallets-delete-${item.id}`}
                >
                  Remove
                </DeleteBtn>
              )}
            </Row>
          ))}
        </List>
      )}

      {modalOpen && (
        <AddWalletModal
          onCancel={() => setModalOpen(false)}
          onSubmit={async ({ address, chain, label }) => {
            const t = await ensureToken()
            if (!t) return
            await doFetch('/api/personal/wallets', {
              method: 'POST',
              headers: {
                authorization: `Bearer ${t}`,
                'content-type': 'application/json',
              },
              body: JSON.stringify({ address, chain, label }),
            })
            setModalOpen(false)
            await load()
          }}
        />
      )}
    </Wrap>
  )
}

function AddWalletModal({ onCancel, onSubmit }) {
  const [address, setAddress] = useState('')
  const [chain, setChain] = useState('eth')
  const [label, setLabel] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  function validate() {
    const a = address.trim()
    if (a.length < 4) return 'Address looks too short.'
    if (!/^[A-Za-z0-9._:-]+$/.test(a)) return 'Address contains unsupported characters.'
    if (!CHAINS.includes(chain)) return 'Pick a supported chain.'
    return null
  }

  return (
    <Backdrop role="dialog" aria-modal="true" aria-labelledby="add-wallet-title" data-testid="wallets-modal">
      <Modal>
        <ModalTitle id="add-wallet-title">Add a wallet</ModalTitle>
        <Field>
          Address
          <Input
            data-testid="wallets-modal-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x\u2026 or chain-native format"
          />
        </Field>
        <Field>
          Chain
          <Select
            data-testid="wallets-modal-chain"
            value={chain}
            onChange={(e) => setChain(e.target.value)}
          >
            {CHAINS.map((c) => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </Select>
        </Field>
        <Field>
          Label (optional)
          <Input
            data-testid="wallets-modal-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. cold storage"
            maxLength={80}
          />
        </Field>
        {err && <ErrorText role="alert">{err}</ErrorText>}
        <ModalActions>
          <CancelBtn type="button" onClick={onCancel}>Cancel</CancelBtn>
          <AddBtn
            type="button"
            data-testid="wallets-modal-submit"
            disabled={busy}
            onClick={async () => {
              const v = validate()
              if (v) { setErr(v); return }
              setBusy(true)
              try {
                await onSubmit({ address: address.trim(), chain, label: label.trim() || null })
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Saving\u2026' : 'Save'}
          </AddBtn>
        </ModalActions>
      </Modal>
    </Backdrop>
  )
}
