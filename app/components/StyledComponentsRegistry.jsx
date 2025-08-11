'use client'
import React from 'react'
import { StyleSheetManager } from 'styled-components'
import isPropValid from '@emotion/is-prop-valid'

export default function StyledComponentsRegistry({ children }) {
  return (
    <StyleSheetManager shouldForwardProp={(propName, target) => {
      if (typeof target === 'string') {
        return isPropValid(propName)
      }
      return true
    }}>
      {children}
    </StyleSheetManager>
  )
} 