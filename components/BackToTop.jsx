'use client'
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'

const Button = styled.button`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  color: #0a1621;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  pointer-events: ${({ $visible }) => $visible ? 'auto' : 'none'};
  transition: opacity 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

  &:hover {
    transform: scale(1.1);
  }
`

export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Button $visible={visible} onClick={scrollToTop} aria-label="Back to top">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 3L3 10h4v5h4v-5h4L9 3z" fill="currentColor" />
      </svg>
    </Button>
  )
}
