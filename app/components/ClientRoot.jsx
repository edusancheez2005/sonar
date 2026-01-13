'use client'
import React from 'react'
import { usePathname } from 'next/navigation'
import { StyleSheetManager } from 'styled-components'
import isPropValid from '@emotion/is-prop-valid'
import GlobalStyles from '@/src/styles/GlobalStyles'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import FeedbackWidget from '@/src/components/FeedbackWidget'

export default function ClientRoot({ children }) {
  const pathname = usePathname()
  const hideFeedback = pathname === '/ai-advisor'

  return (
    <StyleSheetManager shouldForwardProp={(propName, target) => {
      if (typeof target === 'string') {
        return isPropValid(propName)
      }
      return true
    }}>
      <GlobalStyles />
      <Navbar />
      <main>{children}</main>
      <Footer />
      {!hideFeedback && <FeedbackWidget />}
    </StyleSheetManager>
  )
} 