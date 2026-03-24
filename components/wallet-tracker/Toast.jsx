'use client'
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import styled, { keyframes } from 'styled-components'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`

const shrink = keyframes`
  from { width: 100%; }
  to { width: 0%; }
`

const ToastContainer = styled.div`
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 1000;
  display: flex;
  flex-direction: column-reverse;
  gap: 0.5rem;
  pointer-events: none;
`

const accentColors = {
  success: '#00d4aa',
  error: '#e74c3c',
  info: '#36a6ba',
}

const ToastItem = styled.div`
  pointer-events: auto;
  background: #0d2134;
  border-radius: 8px;
  border-left: 3px solid ${({ $type }) => accentColors[$type] || accentColors.info};
  padding: 0.75rem 1rem;
  min-width: 280px;
  max-width: 380px;
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  animation: ${slideIn} 0.3s ease forwards;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
`

const ProgressBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: ${({ $type }) => accentColors[$type] || accentColors.info};
  animation: ${shrink} 3s linear forwards;
`

const IconWrap = styled.div`
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 2px;
`

const MsgText = styled.span`
  flex: 1;
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.4;
`

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;

  &:hover {
    color: var(--text-primary);
  }
`

function RadarIcon({ type }) {
  const color = accentColors[type] || accentColors.info
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1" opacity="0.4" />
      <circle cx="8" cy="8" r="3" stroke={color} strokeWidth="1" opacity="0.7" />
      <line x1="8" y1="8" x2="8" y2="2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ToastItemComponent({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), 3000)
    return () => clearTimeout(timer)
  }, [toast.id, onClose])

  return (
    <ToastItem $type={toast.type}>
      <IconWrap><RadarIcon type={toast.type} /></IconWrap>
      <MsgText>{toast.message}</MsgText>
      <CloseBtn onClick={() => onClose(toast.id)}>&times;</CloseBtn>
      <ProgressBar $type={toast.type} />
    </ToastItem>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info') => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer>
        {toasts.map(t => (
          <ToastItemComponent key={t.id} toast={t} onClose={removeToast} />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  )
}
