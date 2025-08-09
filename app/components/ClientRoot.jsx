'use client'
import React from 'react'
import GlobalStyles from '@/src/styles/GlobalStyles'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import WhaleBackground from '@/src/components/Background'

export default function ClientRoot({ children }) {
  return (
    <>
      <GlobalStyles />
      <Navbar />
      <WhaleBackground intensity="low" />
      <main>{children}</main>
      <Footer />
    </>
  )
} 