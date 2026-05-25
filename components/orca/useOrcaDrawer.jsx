'use client'
/**
 * useOrcaDrawer
 * =============================================================================
 * Global "is the ORCA Drawer open and what is it focused on?" store.
 *
 * Implemented as a React Context (the repo does not include zustand) wrapped
 * in a Provider that lives in `app/layout.jsx`. Exposes a tiny imperative
 * surface so any leaf component (a watchlist row, a token-page button, the
 * keyboard launcher) can pop the drawer with one call.
 *
 * Contract (v4 §4.8):
 *   const { open, close, pin, unpin, state } = useOrcaDrawer()
 *   open(focus?, seed?)            // opens drawer, optional pin + draft seed
 *   close()                        // closes drawer; clears seed; preserves focus
 *   pin() / unpin()                // outside-click & route-change behaviour
 *   state.open                     // boolean
 *   state.focus                    // Focus | null
 *   state.seed                     // string | null  (consumed by atom on mount)
 *   state.pinned                   // boolean
 *   state.sessionId                // string | null (set by drawer when atom creates one)
 *   setSessionId(id)               // drawer/atom can store the current session id
 *
 * No emojis. Pure state — no UI here.
 */
import { createContext, useCallback, useContext, useMemo, useReducer } from 'react'

const OrcaDrawerCtx = createContext(null)

const initialState = {
  open: false,
  focus: null,
  seed: null,
  pinned: false,
  sessionId: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'open':
      return {
        ...state,
        open: true,
        // Only overwrite focus when explicitly passed — otherwise preserve.
        focus: action.focus !== undefined ? action.focus : state.focus,
        seed: typeof action.seed === 'string' ? action.seed : null,
      }
    case 'close':
      return { ...state, open: false, seed: null }
    case 'pin':
      return { ...state, pinned: true }
    case 'unpin':
      return { ...state, pinned: false }
    case 'setFocus':
      return { ...state, focus: action.focus }
    case 'setSessionId':
      return { ...state, sessionId: action.sessionId }
    case 'clearSeed':
      return { ...state, seed: null }
    default:
      return state
  }
}

/**
 * Provider. Mount once in `app/layout.jsx` so the whole tree shares one
 * drawer instance.
 */
export function OrcaDrawerProvider({ children, initial }) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, ...(initial || {}) })

  const open = useCallback((focus, seed) => {
    dispatch({ type: 'open', focus, seed })
  }, [])
  const close = useCallback(() => dispatch({ type: 'close' }), [])
  const pin = useCallback(() => dispatch({ type: 'pin' }), [])
  const unpin = useCallback(() => dispatch({ type: 'unpin' }), [])
  const setFocus = useCallback((focus) => dispatch({ type: 'setFocus', focus }), [])
  const setSessionId = useCallback(
    (sessionId) => dispatch({ type: 'setSessionId', sessionId }),
    []
  )
  const clearSeed = useCallback(() => dispatch({ type: 'clearSeed' }), [])

  const value = useMemo(
    () => ({ state, open, close, pin, unpin, setFocus, setSessionId, clearSeed }),
    [state, open, close, pin, unpin, setFocus, setSessionId, clearSeed]
  )
  return <OrcaDrawerCtx.Provider value={value}>{children}</OrcaDrawerCtx.Provider>
}

/**
 * Hook. Returns a no-op shape if used outside the Provider so that leaf
 * components can render in tests without wrapping every render with the
 * Provider. (The Provider lives in `app/layout.jsx` for real traffic.)
 */
export function useOrcaDrawer() {
  const ctx = useContext(OrcaDrawerCtx)
  if (ctx) return ctx
  // Safe fallback — never throws, just discards calls.
  return {
    state: { ...initialState },
    open: () => {},
    close: () => {},
    pin: () => {},
    unpin: () => {},
    setFocus: () => {},
    setSessionId: () => {},
    clearSeed: () => {},
  }
}

export default useOrcaDrawer
