'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PricingRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/subscribe')
  }, [router])
  
  return null
}

